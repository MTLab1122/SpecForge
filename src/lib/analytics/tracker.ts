/**
 * SpecForge Activation & Onboarding Telemetry Tracker
 * Wraps PostHog client/server events and audit logging
 */

export type ActivationEventName =
  | "onboarding_started"
  | "onboarding_completed"
  | "first_project_created"
  | "first_document_uploaded"
  | "first_ai_generation_requested"
  | "first_scope_created"
  | "first_estimate_created"
  | "first_proposal_sent"
  | "first_client_approval_received"
  | "first_task_generated"
  | "activation_completed";

export interface ActivationEventPayload {
  userId: string;
  organizationId: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export class AnalyticsTracker {
  private static instance: AnalyticsTracker;

  public static getInstance(): AnalyticsTracker {
    if (!AnalyticsTracker.instance) {
      AnalyticsTracker.instance = new AnalyticsTracker();
    }
    return AnalyticsTracker.instance;
  }

  /**
   * Tracks an event across PostHog and client logging
   */
  public async track(event: ActivationEventName, payload: ActivationEventPayload): Promise<void> {
    const eventData = {
      event,
      properties: {
        distinct_id: payload.userId,
        organization_id: payload.organizationId,
        timestamp: payload.timestamp || new Date().toISOString(),
        ...payload.metadata
      }
    };

    // Client-side PostHog check
    if (typeof window !== "undefined" && (window as any).posthog) {
      (window as any).posthog.capture(event, eventData.properties);
    }

    // In local dev/console telemetry
    if (process.env.NODE_ENV !== "production") {
      console.log(`[SpecForge Analytics] [${event}]:`, eventData.properties);
    }
  }

  /**
   * Evaluates whether a user meets the strict Definition of Activation:
   * 1. One project created
   * 2. One AI-assisted scope package created
   * 3. One estimate created
   * 4. One proposal sent to a client
   */
  public isActivated(checklist: {
    createFirstProject: boolean;
    generateRequirements: boolean;
    createEstimate: boolean;
    sendProposal: boolean;
  }): boolean {
    return (
      checklist.createFirstProject &&
      checklist.generateRequirements &&
      checklist.createEstimate &&
      checklist.sendProposal
    );
  }
}

export const analytics = AnalyticsTracker.getInstance();
