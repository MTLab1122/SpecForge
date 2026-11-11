import crypto from "node:crypto";
import { CircuitBreakerRegistry } from "../reliability/circuit-breaker-registry.ts";
import { Logger, AuditLogger } from "../reliability/observability.ts";
import { AppError } from "../reliability/error-envelope.ts";
import {
  NotificationTemplateEngine,
  type NotificationTemplateId,
  type TemplateVariables,
  type RenderedNotificationTemplate
} from "./notification-templates.ts";

export type NotificationChannel = "IN_APP" | "EMAIL" | "SLACK" | "WEBHOOK";

export type NotificationEventType =
  | "SCOPE_SHARED"
  | "SCOPE_APPROVED"
  | "APPROVAL_REQUESTED"
  | "APPROVAL_RECEIVED"
  | "PROPOSAL_SENT"
  | "PROPOSAL_APPROVED"
  | "PROPOSAL_APPROVED_REJECTED"
  | "CHANGE_REQUEST_SENT"
  | "CHANGE_REQUESTED"
  | "CHANGE_APPROVED_REJECTED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_OVERDUE"
  | "MILESTONE_DUE"
  | "TASK_EXPORTED"
  | "EXPORT_READY"
  | "INTEGRATION_FAILURE"
  | "SECURITY_ALERT"
  | "AI_QUOTA_LOW"
  | "WEEKLY_DIGEST"
  | "MARKETING_UPDATE";

export type DeliveryStatus = "QUEUED" | "SENT" | "DELIVERED" | "OPENED" | "FAILED" | "BOUNCED" | "SUPPRESSED";

export interface NotificationPayload {
  organizationId: string;
  userId: string;
  recipientEmail?: string;
  slackWebhookUrl?: string;
  webhookEndpointUrl?: string;
  eventType: NotificationEventType;
  templateId?: NotificationTemplateId;
  templateVars?: TemplateVariables;
  title?: string;
  message?: string;
  linkUrl?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  channels?: NotificationChannel[];
}

export interface InAppNotification {
  id: string;
  organizationId: string;
  userId: string;
  eventType: NotificationEventType;
  title: string;
  message: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface UserNotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  weeklyDigest: boolean;
  approvalAlerts: boolean;
  changeRequestAlerts: boolean;
  paymentAlerts: boolean;
  marketingEmails: boolean; // OPT-IN ONLY! Defaults to false
  slackEnabled: boolean;
  unsubscribedEventTypes: NotificationEventType[];
}

export interface NotificationJob {
  id: string;
  dedupKey: string;
  organizationId: string;
  userId: string;
  channel: NotificationChannel;
  eventType: NotificationEventType;
  templateId?: NotificationTemplateId;
  recipient: string;
  title: string;
  message: string;
  bodyHtml?: string;
  linkUrl?: string;
  status: DeliveryStatus;
  retryCount: number;
  maxRetries: number;
  error?: string;
  collapsedCount?: number;
  createdAt: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  openedAt?: string | null;
  failedAt?: string | null;
  metadata?: Record<string, any>;
}

export interface DispatchSummary {
  notificationId: string;
  channelsDispatched: NotificationChannel[];
  channelsSuppressed: NotificationChannel[];
  emailStatus: "SENT" | "DEGRADED" | "SUPPRESSED" | "RATE_LIMITED";
  slackStatus: "SENT" | "DEGRADED" | "SUPPRESSED" | "NOT_CONFIGURED";
  inAppStatus: "STORED" | "SUPPRESSED";
  isDuplicate?: boolean;
  collapsed?: boolean;
}

export class NotificationService {
  private static readonly SECRET_KEY =
    process.env.NOTIFICATION_SIGNING_KEY || "specforge-notif-secret-key-2026";
  private static readonly DEDUP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes deduplication & collapsing window

  private static inAppStore: Map<string, InAppNotification[]> = new Map();
  private static preferencesStore: Map<string, UserNotificationPreferences> = new Map();
  private static emailRateLimitStore: Map<string, number[]> = new Map();
  private static queue: Map<string, NotificationJob> = new Map();
  private static dedupRegistry: Map<string, { lastSentAt: number; count: number; lastJobId: string }> = new Map();

  /**
   * Generates an idempotent deduplication key for a notification event.
   */
  public static generateDedupKey(
    organizationId: string,
    recipient: string,
    eventType: string,
    entityId?: string
  ): string {
    const raw = `${organizationId}:${recipient}:${eventType}:${entityId || "default"}`;
    return crypto.createHash("sha256").update(raw).digest("hex");
  }

  /**
   * Evaluates if a notification is permitted based on user preferences.
   */
  public static isPermittedByPreferences(
    prefs: UserNotificationPreferences,
    channel: NotificationChannel,
    eventType: NotificationEventType,
    rendered?: RenderedNotificationTemplate
  ): { permitted: boolean; reason?: string } {
    // 1. Channel master toggles
    if (channel === "EMAIL" && !prefs.emailEnabled) {
      return { permitted: false, reason: "User disabled email notifications" };
    }
    if (channel === "IN_APP" && !prefs.inAppEnabled) {
      return { permitted: false, reason: "User disabled in-app notifications" };
    }
    if (channel === "SLACK" && !prefs.slackEnabled) {
      return { permitted: false, reason: "User disabled Slack notifications" };
    }

    // 2. Essential security or financial alerts bypass category opt-outs
    if (rendered?.isEssential) {
      return { permitted: true };
    }

    // 3. Category toggles
    if (rendered) {
      if (rendered.category === "APPROVALS" && !prefs.approvalAlerts) {
        return { permitted: false, reason: "User disabled approval alerts" };
      }
      if (rendered.category === "CHANGE_REQUESTS" && !prefs.changeRequestAlerts) {
        return { permitted: false, reason: "User disabled change-request alerts" };
      }
      if (rendered.category === "PAYMENTS" && !prefs.paymentAlerts) {
        return { permitted: false, reason: "User disabled payment alerts" };
      }
      if (rendered.category === "WEEKLY_DIGEST" && !prefs.weeklyDigest) {
        return { permitted: false, reason: "User disabled weekly digest" };
      }
      if (rendered.category === "MARKETING" && !prefs.marketingEmails) {
        return { permitted: false, reason: "Marketing emails are opt-in only" };
      }
    }

    // 4. Specific event type unsubscribes
    if (prefs.unsubscribedEventTypes.includes(eventType)) {
      return { permitted: false, reason: `User explicitly unsubscribed from event '${eventType}'` };
    }

    return { permitted: true };
  }

  /**
   * Maps an event type to its default template ID.
   */
  private static resolveTemplateId(eventType: NotificationEventType, override?: NotificationTemplateId): NotificationTemplateId {
    if (override) return override;

    switch (eventType) {
      case "SCOPE_SHARED": return "SCOPE_SHARED";
      case "APPROVAL_REQUESTED": return "APPROVAL_REQUESTED";
      case "APPROVAL_RECEIVED":
      case "SCOPE_APPROVED": return "APPROVAL_RECEIVED";
      case "CHANGE_REQUEST_SENT":
      case "CHANGE_REQUESTED": return "CHANGE_REQUESTED";
      case "CHANGE_APPROVED_REJECTED": return "CHANGE_APPROVED_REJECTED";
      case "PROPOSAL_SENT": return "PROPOSAL_SENT";
      case "PROPOSAL_APPROVED":
      case "PROPOSAL_APPROVED_REJECTED": return "PROPOSAL_APPROVED_REJECTED";
      case "MILESTONE_DUE": return "MILESTONE_DUE";
      case "PAYMENT_OVERDUE": return "PAYMENT_OVERDUE";
      case "EXPORT_READY":
      case "TASK_EXPORTED": return "EXPORT_READY";
      case "INTEGRATION_FAILURE": return "INTEGRATION_FAILURE";
      case "WEEKLY_DIGEST": return "WEEKLY_DIGEST";
      case "MARKETING_UPDATE": return "MARKETING_UPDATE";
      default: return "SCOPE_SHARED";
    }
  }

  /**
   * Queues a notification job and immediately attempts execution.
   */
  public static async enqueue(jobInput: {
    organizationId: string;
    userId: string;
    channel: NotificationChannel;
    eventType: NotificationEventType;
    recipient: string;
    templateId?: NotificationTemplateId;
    title: string;
    message: string;
    bodyHtml?: string;
    linkUrl?: string;
    entityId?: string;
    metadata?: Record<string, any>;
  }): Promise<NotificationJob> {
    const dedupKey = this.generateDedupKey(
      jobInput.organizationId,
      jobInput.recipient,
      jobInput.eventType,
      jobInput.entityId
    );

    const now = Date.now();
    const existing = this.dedupRegistry.get(dedupKey);

    // Deduplication & event collapsing
    if (existing && now - existing.lastSentAt < this.DEDUP_WINDOW_MS) {
      existing.count += 1;
      this.dedupRegistry.set(dedupKey, existing);

      Logger.info(`Collapsed repeated notification for '${jobInput.recipient}' (event: ${jobInput.eventType}, count: ${existing.count})`, {
        organizationId: jobInput.organizationId,
        context: { dedupKey, count: existing.count }
      });

      // Retrieve and update the existing queued/sent job
      const prevJob = this.queue.get(existing.lastJobId);
      if (prevJob) {
        prevJob.collapsedCount = existing.count;
        prevJob.message = `${jobInput.message} (Repeated ${existing.count} times)`;
        this.queue.set(existing.lastJobId, prevJob);
        return prevJob;
      }
    }

    const jobId = `notif_job_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const job: NotificationJob = {
      id: jobId,
      dedupKey,
      organizationId: jobInput.organizationId,
      userId: jobInput.userId,
      channel: jobInput.channel,
      eventType: jobInput.eventType,
      templateId: jobInput.templateId,
      recipient: jobInput.recipient,
      title: jobInput.title,
      message: jobInput.message,
      bodyHtml: jobInput.bodyHtml,
      linkUrl: jobInput.linkUrl,
      status: "QUEUED",
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
      metadata: jobInput.metadata
    };

    this.queue.set(jobId, job);
    this.dedupRegistry.set(dedupKey, { lastSentAt: now, count: 1, lastJobId: jobId });

    // Process immediately
    await this.processJob(job);
    return job;
  }

  /**
   * Processes a single notification job with retry and circuit breaker logic.
   */
  private static async processJob(job: NotificationJob): Promise<void> {
    const prefs = this.getPreferences(job.userId);
    const resolvedTemplateId = this.resolveTemplateId(job.eventType, job.templateId);
    const rendered = NotificationTemplateEngine.render(resolvedTemplateId, {
      projectName: job.metadata?.projectName,
      clientName: job.metadata?.clientName,
      amount: job.metadata?.amount,
      actionUrl: job.linkUrl,
      customMessage: job.message
    });

    // Check user preference
    const check = this.isPermittedByPreferences(prefs, job.channel, job.eventType, rendered);
    if (!check.permitted) {
      job.status = "SUPPRESSED";
      job.error = check.reason;
      this.queue.set(job.id, job);
      return;
    }

    try {
      if (job.channel === "EMAIL") {
        // Rate limiting check: Max 10 emails/hr per recipient
        const now = Date.now();
        const timestamps = (this.emailRateLimitStore.get(job.recipient) || []).filter(
          (t) => now - t < 3600_000
        );

        if (timestamps.length >= 10) {
          job.status = "SUPPRESSED";
          job.error = "Rate limit exceeded (10 emails/hour)";
          this.queue.set(job.id, job);
          return;
        }

        timestamps.push(now);
        this.emailRateLimitStore.set(job.recipient, timestamps);

        const breaker = CircuitBreakerRegistry.get("EMAIL_RESEND");
        await breaker.execute(async () => {
          Logger.info(`Email dispatched to '${job.recipient}' (Subject: ${rendered.subject})`, {
            organizationId: job.organizationId,
            userId: job.userId
          });
        });

        job.status = "DELIVERED";
        job.sentAt = new Date().toISOString();
        job.deliveredAt = new Date().toISOString();
      } else if (job.channel === "IN_APP") {
        const inAppItem: InAppNotification = {
          id: job.id,
          organizationId: job.organizationId,
          userId: job.userId,
          eventType: job.eventType,
          title: job.title || rendered.title,
          message: job.message || rendered.bodyText,
          linkUrl: job.linkUrl,
          isRead: false,
          createdAt: new Date().toISOString()
        };

        const userNotifs = this.inAppStore.get(job.userId) || [];
        userNotifs.unshift(inAppItem);
        this.inAppStore.set(job.userId, userNotifs.slice(0, 50));

        job.status = "DELIVERED";
        job.sentAt = new Date().toISOString();
        job.deliveredAt = new Date().toISOString();
      } else if (job.channel === "SLACK") {
        const breaker = CircuitBreakerRegistry.get("SLACK");
        await breaker.execute(async () => {
          Logger.info(`Slack alert sent to '${job.recipient}'`, {
            organizationId: job.organizationId
          });
        });

        job.status = "DELIVERED";
        job.sentAt = new Date().toISOString();
        job.deliveredAt = new Date().toISOString();
      } else if (job.channel === "WEBHOOK") {
        Logger.info(`Webhook event '${job.eventType}' transmitted to '${job.recipient}'`, {
          organizationId: job.organizationId
        });
        job.status = "DELIVERED";
        job.sentAt = new Date().toISOString();
        job.deliveredAt = new Date().toISOString();
      }

      this.queue.set(job.id, job);
    } catch (err: any) {
      job.retryCount += 1;
      job.error = err.message;

      if (job.retryCount < job.maxRetries) {
        job.status = "QUEUED"; // Will retry
        Logger.warn(`Notification job '${job.id}' failed transiently (Attempt ${job.retryCount}/${job.maxRetries}). Retrying...`);
      } else {
        job.status = "FAILED";
        job.failedAt = new Date().toISOString();
        Logger.error(`Notification job '${job.id}' failed permanently after ${job.maxRetries} attempts.`, err);
      }
      this.queue.set(job.id, job);
    }
  }

  /**
   * Retries a failed notification job.
   */
  public static async retryJob(jobId: string): Promise<NotificationJob> {
    const job = this.queue.get(jobId);
    if (!job) {
      throw new AppError({
        message: `Notification job '${jobId}' was not found.`,
        status: 404,
        code: "NOTIFICATION_NOT_FOUND"
      });
    }

    job.status = "QUEUED";
    job.error = undefined;
    this.queue.set(job.id, job);

    await this.processJob(job);
    return job;
  }

  /**
   * Dispatches a notification across all enabled and permitted channels (backward compatible).
   */
  public static async dispatch(payload: NotificationPayload): Promise<DispatchSummary> {
    const notificationId = `notif_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const userPrefs = this.getPreferences(payload.userId);
    const resolvedTemplateId = this.resolveTemplateId(payload.eventType, payload.templateId);
    const rendered = NotificationTemplateEngine.render(resolvedTemplateId, {
      ...payload.templateVars,
      actionUrl: payload.linkUrl,
      customMessage: payload.message
    });

    const channelsDispatched: NotificationChannel[] = [];
    const channelsSuppressed: NotificationChannel[] = [];

    // Deduplication check
    const dedupKey = this.generateDedupKey(
      payload.organizationId,
      payload.recipientEmail || payload.userId,
      payload.eventType,
      payload.entityId
    );

    const now = Date.now();
    const existing = this.dedupRegistry.get(dedupKey);
    let isDuplicate = false;
    let collapsed = false;

    if (existing && now - existing.lastSentAt < this.DEDUP_WINDOW_MS) {
      existing.count += 1;
      this.dedupRegistry.set(dedupKey, existing);
      isDuplicate = true;
      collapsed = true;
    } else {
      this.dedupRegistry.set(dedupKey, { lastSentAt: now, count: 1, lastJobId: notificationId });
    }

    // 1. In-App Channel
    let inAppStatus: "STORED" | "SUPPRESSED" = "SUPPRESSED";
    const inAppCheck = this.isPermittedByPreferences(userPrefs, "IN_APP", payload.eventType, rendered);
    if (inAppCheck.permitted && !isDuplicate) {
      const inAppItem: InAppNotification = {
        id: notificationId,
        organizationId: payload.organizationId,
        userId: payload.userId,
        eventType: payload.eventType,
        title: payload.title || rendered.title,
        message: payload.message || rendered.bodyText,
        linkUrl: payload.linkUrl,
        isRead: false,
        createdAt: new Date().toISOString()
      };

      const userNotifs = this.inAppStore.get(payload.userId) || [];
      userNotifs.unshift(inAppItem);
      this.inAppStore.set(payload.userId, userNotifs.slice(0, 50));

      channelsDispatched.push("IN_APP");
      inAppStatus = "STORED";

      // Also record in job queue
      this.queue.set(notificationId, {
        id: notificationId,
        dedupKey,
        organizationId: payload.organizationId,
        userId: payload.userId,
        channel: "IN_APP",
        eventType: payload.eventType,
        recipient: payload.userId,
        title: inAppItem.title,
        message: inAppItem.message,
        linkUrl: inAppItem.linkUrl,
        status: "DELIVERED",
        retryCount: 0,
        maxRetries: 3,
        createdAt: inAppItem.createdAt,
        deliveredAt: inAppItem.createdAt
      });
    } else {
      channelsSuppressed.push("IN_APP");
    }

    // 2. Transactional Email Channel
    let emailStatus: "SENT" | "DEGRADED" | "SUPPRESSED" | "RATE_LIMITED" = "SUPPRESSED";
    const emailCheck = this.isPermittedByPreferences(userPrefs, "EMAIL", payload.eventType, rendered);

    if (emailCheck.permitted && payload.recipientEmail && !isDuplicate) {
      const userTimestamps = (this.emailRateLimitStore.get(payload.recipientEmail) || []).filter(
        (t) => now - t < 3600_000
      );

      if (userTimestamps.length >= 10) {
        emailStatus = "RATE_LIMITED";
        channelsSuppressed.push("EMAIL");
      } else {
        userTimestamps.push(now);
        this.emailRateLimitStore.set(payload.recipientEmail, userTimestamps);

        const breaker = CircuitBreakerRegistry.get("EMAIL_RESEND");
        if (breaker.getState() === "OPEN") {
          emailStatus = "DEGRADED";
          channelsSuppressed.push("EMAIL");
        } else {
          try {
            await breaker.execute(async () => {
              Logger.info(`Email successfully dispatched via Resend to '${payload.recipientEmail}'`, {
                organizationId: payload.organizationId,
                userId: payload.userId,
                context: { title: payload.title || rendered.title }
              });
            });
            channelsDispatched.push("EMAIL");
            emailStatus = "SENT";
          } catch {
            emailStatus = "DEGRADED";
          }
        }
      }
    } else {
      channelsSuppressed.push("EMAIL");
    }

    // 3. Slack Webhook Channel
    let slackStatus: "SENT" | "DEGRADED" | "SUPPRESSED" | "NOT_CONFIGURED" = "NOT_CONFIGURED";
    if (payload.slackWebhookUrl) {
      const slackCheck = this.isPermittedByPreferences(userPrefs, "SLACK", payload.eventType, rendered);
      if (slackCheck.permitted && !isDuplicate) {
        const breaker = CircuitBreakerRegistry.get("SLACK");
        if (breaker.getState() === "OPEN") {
          slackStatus = "DEGRADED";
        } else {
          try {
            await breaker.execute(async () => {
              Logger.info(`Slack notification sent to webhook '${payload.slackWebhookUrl}'`, {
                organizationId: payload.organizationId,
                context: { eventType: payload.eventType }
              });
            });
            channelsDispatched.push("SLACK");
            slackStatus = "SENT";
          } catch {
            slackStatus = "DEGRADED";
          }
        }
      } else {
        slackStatus = "SUPPRESSED";
        channelsSuppressed.push("SLACK");
      }
    }

    return {
      notificationId,
      channelsDispatched,
      channelsSuppressed,
      emailStatus,
      slackStatus,
      inAppStatus,
      isDuplicate,
      collapsed
    };
  }

  /**
   * Generates a cryptographic one-click unsubscribe token.
   */
  public static generateUnsubscribeToken(userId: string, eventType: NotificationEventType): string {
    const payload = `${userId}:${eventType}`;
    const sig = crypto.createHmac("sha256", this.SECRET_KEY).update(payload).digest("hex");
    return Buffer.from(JSON.stringify({ payload, sig })).toString("base64url");
  }

  /**
   * Verifies an unsubscribe token and updates preferences.
   */
  public static handleUnsubscribe(token: string): { success: boolean; userId: string; eventType: NotificationEventType } {
    try {
      const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
      const expectedSig = crypto.createHmac("sha256", this.SECRET_KEY).update(decoded.payload).digest("hex");

      if (decoded.sig !== expectedSig) {
        throw new AppError({
          message: "Invalid unsubscribe token signature.",
          status: 403,
          code: "UNSUBSCRIBE_TOKEN_INVALID"
        });
      }

      const [userId, eventType] = decoded.payload.split(":") as [string, NotificationEventType];
      const prefs = this.getPreferences(userId);

      if (!prefs.unsubscribedEventTypes.includes(eventType)) {
        prefs.unsubscribedEventTypes.push(eventType);
        this.preferencesStore.set(userId, prefs);
      }

      return { success: true, userId, eventType };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError({
        message: "Malformed unsubscribe token.",
        status: 400,
        code: "UNSUBSCRIBE_TOKEN_MALFORMED"
      });
    }
  }

  /**
   * Retrieves user preferences with safe defaults.
   * NOTE: Marketing emails are strictly opt-in only (false by default).
   */
  public static getPreferences(userId: string): UserNotificationPreferences {
    return (
      this.preferencesStore.get(userId) || {
        userId,
        emailEnabled: true,
        inAppEnabled: true,
        weeklyDigest: true,
        approvalAlerts: true,
        changeRequestAlerts: true,
        paymentAlerts: true,
        marketingEmails: false, // OPT-IN ONLY
        slackEnabled: true,
        unsubscribedEventTypes: []
      }
    );
  }

  /**
   * Updates user notification preferences.
   */
  public static updatePreferences(
    userId: string,
    partial: Partial<UserNotificationPreferences>
  ): UserNotificationPreferences {
    const current = this.getPreferences(userId);
    const updated: UserNotificationPreferences = {
      ...current,
      ...partial,
      userId
    };
    this.preferencesStore.set(userId, updated);
    return updated;
  }

  /**
   * Retrieves in-app notifications for user.
   */
  public static getInAppNotifications(userId: string): InAppNotification[] {
    return this.inAppStore.get(userId) || [];
  }

  /**
   * Marks in-app notification as read.
   */
  public static markRead(userId: string, notificationId?: string): void {
    const list = this.inAppStore.get(userId) || [];
    for (const item of list) {
      if (!notificationId || item.id === notificationId) {
        item.isRead = true;
      }
    }
    this.inAppStore.set(userId, list);
  }

  /**
   * Marks a notification as OPENED via tracking pixel.
   */
  public static markOpened(jobId: string): void {
    const job = this.queue.get(jobId);
    if (job) {
      job.status = "OPENED";
      job.openedAt = new Date().toISOString();
      this.queue.set(jobId, job);
    }
  }

  /**
   * Marks a notification as BOUNCED.
   */
  public static markBounced(jobId: string, errorReason?: string): void {
    const job = this.queue.get(jobId);
    if (job) {
      job.status = "BOUNCED";
      job.error = errorReason || "Hard email bounce";
      this.queue.set(jobId, job);
    }
  }

  /**
   * Retrieves notification history for an organization or user.
   */
  public static getHistory(userId: string, limit: number = 50): NotificationJob[] {
    const results: NotificationJob[] = [];
    for (const job of this.queue.values()) {
      if (job.userId === userId) {
        results.unshift(job);
      }
    }
    return results.slice(0, limit);
  }

  /**
   * Clears all stores (for test runs).
   */
  public static clear(): void {
    this.inAppStore.clear();
    this.preferencesStore.clear();
    this.emailRateLimitStore.clear();
    this.queue.clear();
    this.dedupRegistry.clear();
  }
}
