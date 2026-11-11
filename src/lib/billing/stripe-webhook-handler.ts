import crypto from "node:crypto";
import {
  BillingService,
  type SubscriptionTier,
  type SubscriptionStatus,
  type InvoiceRecord
} from "./billing-service.ts";
import { CircuitBreakerRegistry } from "../reliability/circuit-breaker-registry.ts";
import { Logger, AuditLogger } from "../reliability/observability.ts";
import { AppError } from "../reliability/error-envelope.ts";

export interface StripeEvent<T = any> {
  id: string;
  type: string;
  created: number;
  data: {
    object: T;
  };
}

export interface WebhookProcessResult {
  eventId: string;
  eventType: string;
  processed: boolean;
  isDuplicate: boolean;
  message: string;
}

export interface ReconciliationDiscrepancy {
  field: string;
  localValue: any;
  stripeValue: any;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

export interface ReconciliationResult {
  organizationId: string;
  reconciled: boolean;
  discrepancies: ReconciliationDiscrepancy[];
  actionTaken: "NONE" | "ALERT_DISPATCHED_DATA_PRESERVED" | "SYNCED_SAFELY";
  timestamp: string;
}

export class StripeWebhookHandler {
  private static readonly DEFAULT_WEBHOOK_SECRET =
    process.env.STRIPE_WEBHOOK_SECRET || "whsec_specforge_test_secret_9988";
  private static readonly TIMESTAMP_TOLERANCE_SECONDS = 300; // 5 minutes tolerance for replay protection

  // Stripe public webhook IP CIDRs and prefixes for network verification
  private static readonly STRIPE_WEBHOOK_IP_PREFIXES: string[] = [
    "3.18.12.63",
    "3.130.192.",
    "13.235.14.",
    "18.211.135.",
    "35.154.171.",
    "52.15.183.",
    "54.88.130.",
    "54.187.174.",
    "54.187.205.",
    "54.187.216."
  ];

  private static readonly ALLOWED_LOCAL_IPS: string[] = [
    "127.0.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "localhost",
    "test-client"
  ];

  private static processedEvents: Map<string, { processedAt: string; eventType: string }> = new Map();

  /**
   * Verifies the authenticity and replay safety of an incoming Stripe webhook signature.
   */
  public static verifySignature(params: {
    rawPayload: string;
    signatureHeader: string;
    secret?: string;
    toleranceSeconds?: number;
    currentTimeSeconds?: number;
  }): boolean {
    const secret = params.secret || this.DEFAULT_WEBHOOK_SECRET;
    const tolerance = params.toleranceSeconds || this.TIMESTAMP_TOLERANCE_SECONDS;
    const nowSec = params.currentTimeSeconds || Math.floor(Date.now() / 1000);

    if (!params.signatureHeader) {
      throw new AppError({
        message: "Missing stripe-signature header in webhook request.",
        status: 400,
        code: "STRIPE_SIGNATURE_MISSING"
      });
    }

    // Parse header: t=1614555555,v1=5257a869e7eeeefe259435f2d9...
    const parts = params.signatureHeader.split(",");
    let timestamp = 0;
    const signatures: string[] = [];

    for (const part of parts) {
      const [key, value] = part.split("=");
      if (key === "t") {
        timestamp = parseInt(value, 10);
      } else if (key === "v1") {
        signatures.push(value);
      }
    }

    if (!timestamp || signatures.length === 0) {
      throw new AppError({
        message: "Malformed stripe-signature header format.",
        status: 400,
        code: "STRIPE_SIGNATURE_MALFORMED"
      });
    }

    // Replay attack check
    if (Math.abs(nowSec - timestamp) > tolerance) {
      throw new AppError({
        message: `Stripe webhook timestamp (${timestamp}) is outside tolerance window (${tolerance}s). Replay attack rejected.`,
        status: 400,
        code: "STRIPE_TIMESTAMP_OUT_OF_TOLERANCE"
      });
    }

    // Compute expected signature: HMAC-SHA256(timestamp + "." + rawPayload, secret)
    const signedPayload = `${timestamp}.${params.rawPayload}`;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    // Timing-safe comparison across all provided v1 signatures
    const expectedBuffer = Buffer.from(expected, "hex");
    const isMatched = signatures.some((sig) => {
      const sigBuffer = Buffer.from(sig, "hex");
      return sigBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    });

    if (!isMatched) {
      throw new AppError({
        message: "Stripe webhook cryptographic signature mismatch.",
        status: 400,
        code: "STRIPE_SIGNATURE_VERIFICATION_FAILED"
      });
    }

    return true;
  }

  /**
   * Validates if the client request IP belongs to Stripe's published webhook IP ranges.
   */
  public static verifyProviderIp(clientIp?: string, allowPrivateIps = true): boolean {
    if (!clientIp) return false;
    const cleanIp = clientIp.trim().toLowerCase();

    if (allowPrivateIps && this.ALLOWED_LOCAL_IPS.some((ip) => cleanIp === ip || cleanIp.includes(ip))) {
      return true;
    }

    const matchesStripe = this.STRIPE_WEBHOOK_IP_PREFIXES.some((prefix) => cleanIp.startsWith(prefix));
    return matchesStripe;
  }

  /**
   * Processes a verified Stripe webhook event with deduplication, lifecycle state mutations, and audit logging.
   */
  public static async processEvent(event: StripeEvent): Promise<WebhookProcessResult> {
    // 1. Idempotency Deduplication Check
    if (this.processedEvents.has(event.id)) {
      Logger.info(`Duplicate Stripe webhook event detected (${event.id}). Skipping execution.`, {
        context: { eventId: event.id, eventType: event.type }
      });

      return {
        eventId: event.id,
        eventType: event.type,
        processed: true,
        isDuplicate: true,
        message: "Event already processed previously (idempotent no-op)."
      };
    }

    // 2. Circuit Breaker protection for Stripe webhook processing
    const breaker = CircuitBreakerRegistry.get("PAYMENT_STRIPE");

    const result = await breaker.execute(async () => {
      switch (event.type) {
        // --- 1. Checkout Session Completed ---
        case "checkout.session.completed": {
          const session = event.data.object;
          const organizationId =
            session.metadata?.organizationId || session.client_reference_id || session.customer;

          if (session.mode === "payment" && session.metadata?.type === "CREDIT_TOP_UP") {
            const creditsToAdd = parseInt(session.metadata.credits || "500", 10);
            BillingService.topUpCredits(organizationId, creditsToAdd);

            await AuditLogger.record({
              organizationId,
              action: "AI_CREDITS_TOPPED_UP_VIA_CHECKOUT",
              entityName: "ORGANIZATION",
              entityId: organizationId,
              metadata: { creditsAdded: creditsToAdd, sessionId: session.id }
            });
          } else if (session.mode === "subscription" || session.subscription) {
            const targetTier = (session.metadata?.planTier || "PROFESSIONAL").toUpperCase() as SubscriptionTier;
            BillingService.changePlan({
              organizationId,
              targetTier,
              action: "UPGRADE"
            });

            await AuditLogger.record({
              organizationId,
              action: "SUBSCRIPTION_ACTIVATED_VIA_CHECKOUT",
              entityName: "SUBSCRIPTION",
              entityId: session.subscription || session.id,
              metadata: { tier: targetTier, sessionId: session.id }
            });
          }
          break;
        }

        // --- 2. Subscription Created ---
        case "customer.subscription.created": {
          const sub = event.data.object;
          const organizationId = sub.metadata?.organizationId || sub.customer;
          const targetTier = (sub.metadata?.planTier || "PROFESSIONAL").toUpperCase() as SubscriptionTier;

          BillingService.updateSubscriptionState(organizationId, {
            tier: targetTier,
            status: sub.status === "trialing" ? "TRIAL" : "ACTIVE",
            stripeCustomerId: sub.customer,
            stripeSubscriptionId: sub.id,
            currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: !!sub.cancel_at_period_end,
            gracePeriodEndsAt: null
          });

          await AuditLogger.record({
            organizationId,
            action: "SUBSCRIPTION_CREATED_VIA_WEBHOOK",
            entityName: "SUBSCRIPTION",
            entityId: sub.id,
            metadata: { tier: targetTier, status: sub.status }
          });
          break;
        }

        // --- 3. Subscription Updated ---
        case "customer.subscription.updated": {
          const sub = event.data.object;
          const organizationId = sub.metadata?.organizationId || sub.customer;
          const targetTier = (sub.metadata?.planTier || "PROFESSIONAL").toUpperCase() as SubscriptionTier;

          const isPastDue = sub.status === "past_due";
          const isActive = sub.status === "active";
          const isCanceled = sub.status === "canceled";

          const normalizedStatus: SubscriptionStatus = isPastDue
            ? "PAST_DUE"
            : isCanceled
            ? "CANCELLED"
            : isActive
            ? "ACTIVE"
            : "ACTIVE";

          const gracePeriodEndsAt = isPastDue
            ? new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
            : null;

          BillingService.updateSubscriptionState(organizationId, {
            tier: targetTier,
            status: normalizedStatus,
            stripeSubscriptionId: sub.id,
            currentPeriodStart: sub.current_period_start
              ? new Date(sub.current_period_start * 1000).toISOString()
              : undefined,
            currentPeriodEnd: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : undefined,
            cancelAtPeriodEnd: !!sub.cancel_at_period_end,
            gracePeriodEndsAt
          });

          await AuditLogger.record({
            organizationId,
            action: "SUBSCRIPTION_UPDATED_VIA_WEBHOOK",
            entityName: "SUBSCRIPTION",
            entityId: sub.id,
            metadata: { tier: targetTier, status: sub.status, cancelAtPeriodEnd: sub.cancel_at_period_end }
          });
          break;
        }

        // --- 4. Subscription Deleted (Cancelled at Period End / Expired) ---
        case "customer.subscription.deleted": {
          const sub = event.data.object;
          const organizationId = sub.metadata?.organizationId || sub.customer;

          // Downgrade to TRIAL tier, retain ALL customer data intact
          BillingService.updateSubscriptionState(organizationId, {
            tier: "TRIAL",
            status: "CANCELLED",
            cancelAtPeriodEnd: false,
            gracePeriodEndsAt: null,
            monthlyQuota: 100
          });

          await AuditLogger.record({
            organizationId,
            action: "SUBSCRIPTION_CANCELED_VIA_WEBHOOK",
            entityName: "SUBSCRIPTION",
            entityId: sub.id,
            metadata: { previousTier: sub.metadata?.planTier, customerDataPreserved: true }
          });
          break;
        }

        // --- 5. Invoice Paid ---
        case "invoice.paid":
        case "invoice.payment_succeeded": {
          const invoice = event.data.object;
          const organizationId =
            invoice.subscription_details?.metadata?.organizationId ||
            invoice.metadata?.organizationId ||
            invoice.customer;

          // Reactivate subscription to ACTIVE and clear grace period
          BillingService.updateSubscriptionState(organizationId, {
            status: "ACTIVE",
            gracePeriodEndsAt: null
          });

          // Store paid invoice history
          const invoiceRecord: InvoiceRecord = {
            id: invoice.id,
            organizationId,
            amountDueUsd: (invoice.amount_due || invoice.total || 0) / 100,
            amountPaidUsd: (invoice.amount_paid || invoice.total || 0) / 100,
            currency: (invoice.currency || "usd").toUpperCase(),
            status: "PAID",
            pdfUrl:
              invoice.invoice_pdf ||
              `https://specforge-invoices.s3.amazonaws.com/${organizationId}/${invoice.id}.pdf`,
            hostedInvoiceUrl: invoice.hosted_invoice_url,
            paidAt: new Date(
              invoice.status_transitions?.paid_at ? invoice.status_transitions.paid_at * 1000 : Date.now()
            ).toISOString(),
            createdAt: new Date((invoice.created || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
            billingReason: invoice.billing_reason || "subscription_cycle"
          };

          BillingService.recordInvoice(invoiceRecord);

          await AuditLogger.record({
            organizationId,
            action: "INVOICE_PAYMENT_SUCCEEDED",
            entityName: "INVOICE",
            entityId: invoice.id,
            metadata: { amountPaid: invoiceRecord.amountPaidUsd, currency: invoiceRecord.currency }
          });
          break;
        }

        // --- 6. Invoice Payment Failed ---
        case "invoice.payment_failed": {
          const invoice = event.data.object;
          const organizationId =
            invoice.subscription_details?.metadata?.organizationId ||
            invoice.metadata?.organizationId ||
            invoice.customer;

          const gracePeriodEndsAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

          // Move organization to PAST_DUE with 7-day grace period
          BillingService.updateSubscriptionState(organizationId, {
            status: "PAST_DUE",
            gracePeriodEndsAt
          });

          // Store failed invoice record
          const failedRecord: InvoiceRecord = {
            id: invoice.id,
            organizationId,
            amountDueUsd: (invoice.amount_due || invoice.total || 0) / 100,
            amountPaidUsd: 0,
            currency: (invoice.currency || "usd").toUpperCase(),
            status: "FAILED",
            pdfUrl: invoice.invoice_pdf,
            hostedInvoiceUrl: invoice.hosted_invoice_url,
            paidAt: null,
            createdAt: new Date((invoice.created || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
            attemptCount: invoice.attempt_count || 1,
            billingReason: invoice.billing_reason || "subscription_cycle"
          };

          BillingService.recordInvoice(failedRecord);

          Logger.warn(
            `Invoice payment failed for org '${organizationId}'. 7-day grace period active until ${gracePeriodEndsAt}.`,
            {
              organizationId,
              context: { invoiceId: invoice.id, attemptCount: invoice.attempt_count }
            }
          );

          await AuditLogger.record({
            organizationId,
            action: "INVOICE_PAYMENT_FAILED_WARNING",
            entityName: "INVOICE",
            entityId: invoice.id,
            metadata: {
              attemptCount: invoice.attempt_count,
              gracePeriodEndsAt,
              customerDataPreserved: true
            }
          });
          break;
        }

        // --- 7. Customer Subscription Trial Will End ---
        case "customer.subscription.trial_will_end": {
          const sub = event.data.object;
          const organizationId = sub.metadata?.organizationId || sub.customer;
          const trialEndIso = sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString()
            : new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();

          Logger.warn(`Trial period ending soon for workspace '${organizationId}'.`, {
            organizationId,
            context: { trialEnd: trialEndIso }
          });

          await AuditLogger.record({
            organizationId,
            action: "TRIAL_WILL_END_WARNING",
            entityName: "SUBSCRIPTION",
            entityId: sub.id,
            metadata: { trialEnd: trialEndIso }
          });
          break;
        }

        default:
          Logger.info(`Unhandled Stripe event type '${event.type}' acknowledged.`, {
            context: { eventId: event.id }
          });
      }

      // Record in deduplication map
      this.processedEvents.set(event.id, {
        processedAt: new Date().toISOString(),
        eventType: event.type
      });

      return {
        eventId: event.id,
        eventType: event.type,
        processed: true,
        isDuplicate: false,
        message: `Successfully processed '${event.type}'.`
      };
    });

    return result;
  }

  /**
   * Daily Automated Reconciliation Job:
   * Cross-checks local subscription state against Stripe provider state.
   * If any discrepancy exists, an alert is triggered, and customer data is NEVER deleted.
   */
  public static async reconcileWithStripe(params: {
    organizationId: string;
    stripeSubscription: {
      id: string;
      status: string;
      planTier: SubscriptionTier;
      currentPeriodEnd: string;
    };
  }): Promise<ReconciliationResult> {
    const local = BillingService.getOrInitializeOrgBilling(params.organizationId);
    const discrepancies: ReconciliationDiscrepancy[] = [];

    // 1. Tier check
    if (local.tier !== params.stripeSubscription.planTier) {
      discrepancies.push({
        field: "tier",
        localValue: local.tier,
        stripeValue: params.stripeSubscription.planTier,
        severity: "HIGH"
      });
    }

    // 2. Status check
    const normalizedStripeStatus =
      params.stripeSubscription.status.toLowerCase() === "active"
        ? "ACTIVE"
        : params.stripeSubscription.status.toLowerCase() === "past_due"
        ? "PAST_DUE"
        : params.stripeSubscription.status.toLowerCase() === "canceled"
        ? "CANCELLED"
        : (params.stripeSubscription.status.toUpperCase() as SubscriptionStatus);

    if (local.status !== normalizedStripeStatus) {
      discrepancies.push({
        field: "status",
        localValue: local.status,
        stripeValue: normalizedStripeStatus,
        severity: "HIGH"
      });
    }

    const timestamp = new Date().toISOString();

    if (discrepancies.length > 0) {
      Logger.error(
        `Reconciliation mismatch detected for organization '${params.organizationId}'. Preserving customer data and alerting admin.`,
        undefined,
        {
          organizationId: params.organizationId,
          context: { discrepancies }
        }
      );

      await AuditLogger.record({
        organizationId: params.organizationId,
        action: "RECONCILIATION_MISMATCH_ALERT",
        entityName: "SUBSCRIPTION",
        entityId: params.stripeSubscription.id,
        metadata: {
          discrepancies,
          customerDataPreserved: true,
          reconcileAction: "ALERT_DISPATCHED_DATA_PRESERVED"
        }
      });

      return {
        organizationId: params.organizationId,
        reconciled: false,
        discrepancies,
        actionTaken: "ALERT_DISPATCHED_DATA_PRESERVED",
        timestamp
      };
    }

    await AuditLogger.record({
      organizationId: params.organizationId,
      action: "RECONCILIATION_MATCHED",
      entityName: "SUBSCRIPTION",
      entityId: params.stripeSubscription.id,
      metadata: { status: local.status, tier: local.tier }
    });

    return {
      organizationId: params.organizationId,
      reconciled: true,
      discrepancies: [],
      actionTaken: "NONE",
      timestamp
    };
  }

  /**
   * Helper to generate a valid test signature for tests.
   */
  public static generateTestSignature(payload: string, secret?: string, timestamp?: number): string {
    const sec = secret || this.DEFAULT_WEBHOOK_SECRET;
    const ts = timestamp || Math.floor(Date.now() / 1000);
    const hmac = crypto
      .createHmac("sha256", sec)
      .update(`${ts}.${payload}`)
      .digest("hex");
    return `t=${ts},v1=${hmac}`;
  }

  /**
   * Clears deduplication history (for testing).
   */
  public static clear(): void {
    this.processedEvents.clear();
  }
}
