/**
 * SpecForge Phase 5.1: Transactional Outbox & Event-Driven Bus
 * 
 * Provides:
 * 1. Database-backed transactional outbox storage
 * 2. Versioned domain events (v1+)
 * 3. Idempotent subscriber handlers with deduplication tracking
 * 4. Automatic retry backoff with Dead-Letter Queue (DLQ) routing
 * 5. Safe DLQ replay capability with tenant isolation
 */

import crypto from "node:crypto";
import type { PlatformDomain } from "./domain-boundaries.ts";
import { Logger, AuditLogger } from "../reliability/observability.ts";
import { AppError } from "../reliability/error-envelope.ts";

export type StandardDomainEventName =
  | "workspace.created"
  | "client.created"
  | "project.created"
  | "document.uploaded"
  | "transcription.completed"
  | "ai_generation.completed"
  | "scope.version_created"
  | "scope.approved"
  | "estimate.created"
  | "estimate.approved"
  | "proposal.sent"
  | "proposal.approved"
  | "proposal.rejected"
  | "task.generated"
  | "task.exported"
  | "change_request.created"
  | "change_request.approved"
  | "payment_milestone.updated"
  | "subscription.updated"
  | "integration.connected"
  | "integration.failed";

export type OutboxEventStatus = "PENDING" | "PROCESSING" | "PUBLISHED" | "FAILED" | "DEAD_LETTER";

export interface EventMetadata {
  workspaceId: string;
  userId: string;
  traceId?: string;
  correlationId?: string;
  timestamp: string;
}

export interface OutboxEvent<T = Record<string, any>> {
  id: string;
  aggregateId: string;
  aggregateType: string;
  domain: PlatformDomain;
  eventName: StandardDomainEventName;
  version: number;
  payload: T;
  metadata: EventMetadata;
  status: OutboxEventStatus;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  createdAt: string;
  publishedAt?: string;
  idempotencyKey: string;
}

export interface OutboxConsumerExecution {
  consumerId: string;
  eventId: string;
  executedAt: string;
  status: "SUCCESS" | "FAILED";
  error?: string;
}

export type EventSubscriberHandler<T = any> = (event: OutboxEvent<T>) => Promise<void> | void;

export interface EventSubscriberRegistration {
  subscriberId: string;
  domain: PlatformDomain;
  eventNames: StandardDomainEventName[];
  handler: EventSubscriberHandler;
  maxRetries?: number;
}

export interface PublishOutboxOptions<T = any> {
  domain: PlatformDomain;
  eventName: StandardDomainEventName;
  aggregateId: string;
  aggregateType: string;
  payload: T;
  workspaceId: string;
  userId: string;
  traceId?: string;
  correlationId?: string;
  version?: number;
  maxRetries?: number;
  idempotencyKey?: string;
}

export interface DispatchSummary {
  processed: number;
  succeeded: number;
  failed: number;
  deadLettered: number;
  skippedDuplicate: number;
}

export class PlatformEventBus {
  // In-memory backing stores simulating durable database tables
  private static outbox: Map<string, OutboxEvent> = new Map();
  private static deadLetterQueue: Map<string, OutboxEvent> = new Map();
  private static idempotencyIndex: Map<string, string> = new Map(); // idempotencyKey -> eventId
  private static consumerExecutions: Map<string, OutboxConsumerExecution> = new Map(); // `${consumerId}:${eventId}` -> record
  private static subscribers: Map<string, EventSubscriberRegistration> = new Map();

  /**
   * Publishes an event atomically via the Transactional Outbox pattern.
   * If an idempotencyKey is reused, returns the existing event without duplicating.
   */
  public static publish<T = Record<string, any>>(options: PublishOutboxOptions<T>): OutboxEvent<T> {
    const rawKey =
      options.idempotencyKey ||
      `${options.workspaceId}:${options.domain}:${options.eventName}:${options.aggregateId}:${JSON.stringify(options.payload)}`;
    const idempotencyKey = crypto.createHash("sha256").update(rawKey).digest("hex");

    // Idempotent Deduplication Check
    const existingId = this.idempotencyIndex.get(idempotencyKey);
    if (existingId) {
      const existing = this.outbox.get(existingId);
      if (existing) {
        Logger.info(`Transactional outbox idempotent hit for event '${existing.eventName}' (${existing.id})`, {
          organizationId: options.workspaceId,
          userId: options.userId,
          context: { idempotencyKey, status: existing.status }
        });
        return existing as OutboxEvent<T>;
      }
    }

    const eventId = `evt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const now = new Date().toISOString();

    const event: OutboxEvent<T> = {
      id: eventId,
      aggregateId: options.aggregateId,
      aggregateType: options.aggregateType,
      domain: options.domain,
      eventName: options.eventName,
      version: options.version || 1,
      payload: options.payload,
      metadata: {
        workspaceId: options.workspaceId,
        userId: options.userId,
        traceId: options.traceId || `tr_${crypto.randomBytes(6).toString("hex")}`,
        correlationId: options.correlationId || `corr_${crypto.randomBytes(6).toString("hex")}`,
        timestamp: now
      },
      status: "PENDING",
      retryCount: 0,
      maxRetries: options.maxRetries ?? 3,
      createdAt: now,
      idempotencyKey
    };

    this.outbox.set(eventId, event);
    this.idempotencyIndex.set(idempotencyKey, eventId);

    Logger.info(`Outbox event recorded: [${event.domain}] ${event.eventName} (#${event.id})`, {
      organizationId: options.workspaceId,
      userId: options.userId,
      context: { aggregateId: options.aggregateId, version: event.version }
    });

    return event;
  }

  /**
   * Registers a decoupled domain subscriber with idempotent execution guarantees.
   */
  public static subscribe(registration: EventSubscriberRegistration): void {
    if (this.subscribers.has(registration.subscriberId)) {
      Logger.warn(`Overwriting subscriber '${registration.subscriberId}' in PlatformEventBus`);
    }
    this.subscribers.set(registration.subscriberId, registration);
  }

  /**
   * Unregisters a subscriber by ID.
   */
  public static unsubscribe(subscriberId: string): boolean {
    return this.subscribers.delete(subscriberId);
  }

  /**
   * Dispatches all pending outbox events to registered subscribers with idempotency checks.
   * Handles retry counters and routes persistently failed events to the Dead-Letter Queue.
   */
  public static async dispatchPending(limit: number = 50): Promise<DispatchSummary> {
    const summary: DispatchSummary = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      deadLettered: 0,
      skippedDuplicate: 0
    };

    const pendingEvents = Array.from(this.outbox.values())
      .filter((evt) => evt.status === "PENDING" || evt.status === "FAILED")
      .slice(0, limit);

    for (const event of pendingEvents) {
      summary.processed++;
      event.status = "PROCESSING";

      // Find matching subscribers
      const matchedSubscribers = Array.from(this.subscribers.values()).filter((sub) =>
        sub.eventNames.includes(event.eventName)
      );

      let allSubscribersSucceeded = true;
      let lastErrorMessage: string | undefined = undefined;

      for (const subscriber of matchedSubscribers) {
        const executionKey = `${subscriber.subscriberId}:${event.id}`;
        const previousExecution = this.consumerExecutions.get(executionKey);

        if (previousExecution && previousExecution.status === "SUCCESS") {
          // Idempotent skip: this consumer already successfully processed this exact event
          summary.skippedDuplicate++;
          continue;
        }

        try {
          await Promise.resolve(subscriber.handler(event));
          this.consumerExecutions.set(executionKey, {
            consumerId: subscriber.subscriberId,
            eventId: event.id,
            executedAt: new Date().toISOString(),
            status: "SUCCESS"
          });
        } catch (err: any) {
          allSubscribersSucceeded = false;
          lastErrorMessage = err?.message || "Consumer execution failed";
          this.consumerExecutions.set(executionKey, {
            consumerId: subscriber.subscriberId,
            eventId: event.id,
            executedAt: new Date().toISOString(),
            status: "FAILED",
            error: lastErrorMessage
          });

          Logger.error(
            `Subscriber '${subscriber.subscriberId}' failed for event '${event.id}': ${lastErrorMessage}`,
            {
              organizationId: event.metadata.workspaceId,
              userId: event.metadata.userId,
              context: { eventName: event.eventName, retryCount: event.retryCount }
            }
          );
        }
      }

      if (allSubscribersSucceeded) {
        event.status = "PUBLISHED";
        event.publishedAt = new Date().toISOString();
        event.lastError = undefined;
        summary.succeeded++;
      } else {
        event.retryCount++;
        event.lastError = lastErrorMessage;

        if (event.retryCount >= event.maxRetries) {
          event.status = "DEAD_LETTER";
          this.deadLetterQueue.set(event.id, { ...event });
          summary.deadLettered++;

          await AuditLogger.record({
            organizationId: event.metadata.workspaceId,
            userId: event.metadata.userId,
            action: "OUTBOX_EVENT_DEAD_LETTERED",
            resourceId: event.id,
            details: {
              eventName: event.eventName,
              domain: event.domain,
              retryCount: event.retryCount,
              error: lastErrorMessage
            }
          });
        } else {
          event.status = "FAILED";
          summary.failed++;
        }
      }
    }

    return summary;
  }

  /**
   * Replays events from the Dead-Letter Queue (DLQ).
   * Validates workspace isolation before replaying.
   */
  public static async replayDeadLetters(options: {
    workspaceId: string;
    operatorUserId: string;
    eventIds?: string[];
    domain?: PlatformDomain;
  }): Promise<{ replayed: number; failed: number; eventIds: string[] }> {
    const results = {
      replayed: 0,
      failed: 0,
      eventIds: [] as string[]
    };

    const targetEvents: OutboxEvent[] = [];

    for (const [id, evt] of this.deadLetterQueue.entries()) {
      // Strict multi-tenant verification
      if (evt.metadata.workspaceId !== options.workspaceId) {
        continue;
      }
      if (options.domain && evt.domain !== options.domain) {
        continue;
      }
      if (options.eventIds && !options.eventIds.includes(id)) {
        continue;
      }
      targetEvents.push(evt);
    }

    for (const event of targetEvents) {
      // Reset retry count and status for replay
      event.status = "PENDING";
      event.retryCount = 0;
      event.lastError = undefined;
      this.outbox.set(event.id, event);
      this.deadLetterQueue.delete(event.id);

      // Clear previous failed consumer executions to allow clean retry
      for (const subscriber of this.subscribers.values()) {
        const key = `${subscriber.subscriberId}:${event.id}`;
        const record = this.consumerExecutions.get(key);
        if (record && record.status === "FAILED") {
          this.consumerExecutions.delete(key);
        }
      }

      results.replayed++;
      results.eventIds.push(event.id);
    }

    await AuditLogger.record({
      organizationId: options.workspaceId,
      userId: options.operatorUserId,
      action: "DEAD_LETTER_QUEUE_REPLAYED",
      resourceId: `dlq_batch_${Date.now()}`,
      details: {
        replayedCount: results.replayed,
        eventIds: results.eventIds
      }
    });

    // Immediately trigger dispatch of replayed events
    if (results.replayed > 0) {
      await this.dispatchPending(results.replayed);
    }

    return results;
  }

  /**
   * Lists outbox events with pagination and tenant filtering.
   */
  public static listEvents(options: {
    workspaceId: string;
    status?: OutboxEventStatus;
    domain?: PlatformDomain;
    limit?: number;
    offset?: number;
  }): { events: OutboxEvent[]; total: number } {
    const filtered = Array.from(this.outbox.values()).filter((e) => {
      if (e.metadata.workspaceId !== options.workspaceId) return false;
      if (options.status && e.status !== options.status) return false;
      if (options.domain && e.domain !== options.domain) return false;
      return true;
    });

    const total = filtered.length;
    const offset = options.offset || 0;
    const limit = options.limit || 50;

    return {
      events: filtered.slice(offset, offset + limit),
      total
    };
  }

  /**
   * Lists DLQ events for a given workspace.
   */
  public static listDeadLetters(workspaceId: string): OutboxEvent[] {
    return Array.from(this.deadLetterQueue.values()).filter(
      (e) => e.metadata.workspaceId === workspaceId
    );
  }

  /**
   * Cleans up event store for testing purposes.
   */
  public static clear(): void {
    this.outbox.clear();
    this.deadLetterQueue.clear();
    this.idempotencyIndex.clear();
    this.consumerExecutions.clear();
    this.subscribers.clear();
  }
}

