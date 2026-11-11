import { z } from "zod";

/**
 * SPECFORGE PHASE 4.1: EVENT TAXONOMY
 * Comprehensive 34-event growth & workflow measurement schema.
 */

// Common Event Metadata Envelope
export const CommonEventMetadataSchema = z.object({
  workspaceId: z.string().min(1),
  userId: z.string().min(1),
  timestamp: z.string().default(() => new Date().toISOString()),
  sessionId: z.string().optional(),
  traceId: z.string().optional(),
  userAgent: z.string().optional(),
  locale: z.string().optional(),
  currency: z.string().default("USD")
});

export type CommonEventMetadata = z.infer<typeof CommonEventMetadataSchema>;

// The 34 Event Names
export const GrowthEventNameEnum = z.enum([
  "user_signed_up",
  "workspace_created",
  "onboarding_started",
  "onboarding_completed",
  "client_created",
  "project_created",
  "document_uploaded",
  "text_brief_entered",
  "voice_note_uploaded",
  "transcription_completed",
  "ai_generation_requested",
  "ai_generation_completed",
  "ai_output_reviewed",
  "ai_output_accepted",
  "ai_output_rejected",
  "scope_created",
  "scope_version_created",
  "estimate_created",
  "estimate_approved",
  "proposal_created",
  "proposal_sent",
  "proposal_viewed",
  "proposal_approved",
  "proposal_rejected",
  "task_generated",
  "task_exported",
  "integration_connected",
  "change_request_created",
  "change_request_approved",
  "plan_upgraded",
  "plan_downgraded",
  "subscription_cancelled",
  "referral_sent",
  "referral_converted"
]);

export type GrowthEventName = z.infer<typeof GrowthEventNameEnum>;

// Individual Payload Schemas
export const EventPayloadSchemas: Record<GrowthEventName, z.ZodObject<any>> = {
  user_signed_up: z.object({
    role: z.enum(["FREELANCER", "AGENCY", "PRODUCT_MANAGER", "CONSULTANT"]).optional(),
    signupMethod: z.enum(["EMAIL", "GOOGLE", "GITHUB", "INVITATION"]).default("EMAIL"),
    referralCode: z.string().optional()
  }),

  workspace_created: z.object({
    workspaceName: z.string(),
    planTier: z.enum(["TRIAL", "PROFESSIONAL", "AGENCY", "SCALE", "ENTERPRISE"]).default("TRIAL"),
    currency: z.string().default("USD")
  }),

  onboarding_started: z.object({
    roleSelected: z.string().optional(),
    entryPath: z.string().default("DEFAULT_FLOW")
  }),

  onboarding_completed: z.object({
    timeToCompleteSeconds: z.number().min(0),
    sampleProjectSelected: z.string().optional(),
    checklistCompletedCount: z.number().min(0)
  }),

  client_created: z.object({
    clientId: z.string(),
    clientName: z.string(),
    currency: z.string().default("USD")
  }),

  project_created: z.object({
    projectId: z.string(),
    clientId: z.string().optional(),
    projectName: z.string(),
    targetBudget: z.number().min(0).optional()
  }),

  document_uploaded: z.object({
    documentId: z.string(),
    fileSizeBytes: z.number().min(1),
    mimeType: z.string(),
    isAudio: z.boolean().default(false)
  }),

  text_brief_entered: z.object({
    projectId: z.string(),
    charCount: z.number().min(1),
    hasBulletPoints: z.boolean().default(false)
  }),

  voice_note_uploaded: z.object({
    documentId: z.string(),
    durationSeconds: z.number().min(1),
    audioFormat: z.string()
  }),

  transcription_completed: z.object({
    documentId: z.string(),
    durationSeconds: z.number().min(1),
    latencyMs: z.number().min(1),
    wordCount: z.number().min(0)
  }),

  ai_generation_requested: z.object({
    projectId: z.string(),
    qualityMode: z.enum(["FAST", "BALANCED", "THOROUGH"]),
    estimatedCredits: z.number().min(1),
    modelName: z.string()
  }),

  ai_generation_completed: z.object({
    projectId: z.string(),
    qualityMode: z.enum(["FAST", "BALANCED", "THOROUGH"]),
    creditsCharged: z.number().min(0),
    latencyMs: z.number().min(1),
    modulesExtractedCount: z.number().min(0),
    deliverablesCount: z.number().min(0),
    isCached: z.boolean().default(false)
  }),

  ai_output_reviewed: z.object({
    projectId: z.string(),
    reviewDurationSeconds: z.number().min(0),
    editsCount: z.number().min(0)
  }),

  ai_output_accepted: z.object({
    projectId: z.string(),
    acceptedDeliverablesCount: z.number().min(0)
  }),

  ai_output_rejected: z.object({
    projectId: z.string(),
    rejectionReason: z.string().optional()
  }),

  scope_created: z.object({
    scopeId: z.string(),
    projectId: z.string(),
    deliverablesCount: z.number().min(0),
    versionNumber: z.number().default(1)
  }),

  scope_version_created: z.object({
    scopeId: z.string(),
    projectId: z.string(),
    versionNumber: z.number().min(2),
    deliverablesCount: z.number().min(0),
    diffSummary: z.string().optional()
  }),

  estimate_created: z.object({
    estimateId: z.string(),
    projectId: z.string(),
    totalHours: z.number().min(1),
    totalCost: z.number().min(0),
    currency: z.string().default("USD"),
    contingencyPercent: z.number().min(0).max(100).default(15)
  }),

  estimate_approved: z.object({
    estimateId: z.string(),
    approvedByUserId: z.string(),
    finalTotalAmount: z.number().min(0)
  }),

  proposal_created: z.object({
    proposalId: z.string(),
    projectId: z.string(),
    sectionsCount: z.number().min(1)
  }),

  proposal_sent: z.object({
    proposalId: z.string(),
    recipientEmail: z.string().email(),
    proposalShareToken: z.string()
  }),

  proposal_viewed: z.object({
    proposalId: z.string(),
    viewerRole: z.enum(["CLIENT", "TEAM_MEMBER", "ANONYMOUS"]),
    presentationMode: z.boolean().default(false)
  }),

  proposal_approved: z.object({
    proposalId: z.string(),
    approvedByClientName: z.string(),
    approvalTimestamp: z.string()
  }),

  proposal_rejected: z.object({
    proposalId: z.string(),
    feedback: z.string().optional()
  }),

  task_generated: z.object({
    projectId: z.string(),
    tasksCount: z.number().min(1),
    generatedFromScopeId: z.string()
  }),

  task_exported: z.object({
    projectId: z.string(),
    provider: z.enum(["JIRA", "LINEAR", "TRELLO", "GITHUB", "NOTION", "SLACK"]),
    exportedCount: z.number().min(1),
    externalResourceId: z.string().optional()
  }),

  integration_connected: z.object({
    provider: z.enum(["JIRA", "LINEAR", "TRELLO", "GITHUB", "NOTION", "SLACK"]),
    scopesGranted: z.array(z.string())
  }),

  change_request_created: z.object({
    changeRequestId: z.string(),
    projectId: z.string(),
    deltaHours: z.number(),
    deltaCost: z.number()
  }),

  change_request_approved: z.object({
    changeRequestId: z.string(),
    projectId: z.string(),
    approvedByUserId: z.string()
  }),

  plan_upgraded: z.object({
    fromTier: z.string(),
    toTier: z.string(),
    mrrDeltaUsd: z.number()
  }),

  plan_downgraded: z.object({
    fromTier: z.string(),
    toTier: z.string(),
    reason: z.string().optional()
  }),

  subscription_cancelled: z.object({
    currentTier: z.string(),
    cancellationReason: z.string().optional(),
    feedback: z.string().optional()
  }),

  referral_sent: z.object({
    referralCode: z.string(),
    recipientEmail: z.string().email().optional(),
    channel: z.enum(["IN_APP", "LINK_SHARE", "EMAIL"]).default("LINK_SHARE")
  }),

  referral_converted: z.object({
    referralCode: z.string(),
    newWorkspaceId: z.string(),
    rewardCreditsAwarded: z.number().min(0)
  })
};

export class EventTaxonomyValidator {
  /**
   * Validates and constructs a strongly typed event payload.
   */
  public static validate<T extends GrowthEventName>(
    eventName: T,
    metadata: CommonEventMetadata,
    payload: any
  ): { isValid: boolean; event: { name: T; metadata: CommonEventMetadata; properties: any }; errors?: string[] } {
    const metaParsed = CommonEventMetadataSchema.safeParse(metadata);
    if (!metaParsed.success) {
      const msg = metaParsed.error?.message || "Invalid event metadata.";
      return {
        isValid: false,
        event: { name: eventName, metadata, properties: payload },
        errors: [msg]
      };
    }

    const schema = EventPayloadSchemas[eventName];
    if (!schema) {
      return {
        isValid: false,
        event: { name: eventName, metadata: metaParsed.data, properties: payload },
        errors: [`Unrecognized event name '${eventName}' in taxonomy.`]
      };
    }

    const payloadParsed = schema.safeParse(payload);
    if (!payloadParsed.success) {
      const msg = payloadParsed.error?.message || "Invalid event payload.";
      return {
        isValid: false,
        event: { name: eventName, metadata: metaParsed.data, properties: payload },
        errors: [msg]
      };
    }

    return {
      isValid: true,
      event: {
        name: eventName,
        metadata: metaParsed.data,
        properties: payloadParsed.data
      }
    };
  }
}
