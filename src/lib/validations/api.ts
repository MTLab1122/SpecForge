import { z } from "zod";

// ============================================================================
// ENUMS & COMMON TYPES
// ============================================================================

export const OrgRoleEnum = z.enum(["OWNER", "MANAGER", "ESTIMATOR", "MEMBER", "CLIENT"]);
export const SubscriptionTierEnum = z.enum(["TRIAL", "PROFESSIONAL", "AGENCY", "ENTERPRISE"]);
export const SubscriptionStatusEnum = z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "UNPAID"]);

export const ProjectStatusEnum = z.enum(["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]);
export const ProjectStageEnum = z.enum([
  "DISCOVERY",
  "REQUIREMENTS_EXTRACTED",
  "SCOPE_DRAFTED",
  "ESTIMATION",
  "PROPOSAL_SENT",
  "CLIENT_APPROVED",
  "TASK_DELIVERY",
  "COMPLETED"
]);

export const DocumentTypeEnum = z.enum([
  "PASTED_TEXT",
  "PDF",
  "DOCX",
  "MEETING_NOTES",
  "AUDIO_VOICE_NOTE"
]);

export const ItemProvenanceEnum = z.enum(["AI_SUGGESTION", "USER_CONFIRMED"]);
export const PriorityLevelEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const ComplexityLevelEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const ConfidenceLevelEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const PricingTypeEnum = z.enum(["HOURLY_RATE", "FIXED_PRICE"]);
export const ProposalStatusEnum = z.enum(["DRAFT", "SENT", "VIEWED", "REVISED", "APPROVED", "REJECTED"]);
export const TaskStatusEnum = z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"]);
export const IntegrationProviderEnum = z.enum(["JIRA", "LINEAR", "TRELLO", "GITHUB"]);

// Standard Response Wrapper
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.any().optional()
      })
      .optional(),
    meta: z
      .object({
        timestamp: z.string(),
        requestId: z.string(),
        page: z.number().optional(),
        pageSize: z.number().optional(),
        total: z.number().optional()
      })
      .optional()
  });

// ============================================================================
// PHASE 2.1: ONBOARDING & PRODUCT EXPERIENCE
// ============================================================================

export const CompleteOnboardingStepSchema = z.object({
  stepNumber: z.number().min(1).max(5),
  agencySpecialty: z.enum(["MOBILE", "WEB", "SAAS", "ECOMMERCE", "CONSULTING"]).optional(),
  teamSize: z.string().optional(),
  preferredCurrency: z.string().default("USD"),
  importSampleSandbox: z.boolean().default(true)
});

// ============================================================================
// PHASE 2.2: AI QUALITY, CITATION & TRUST
// ============================================================================

export const RequirementCitationUpdateSchema = z.object({
  requirementId: z.string().uuid(),
  sourceCitation: z.string(),
  citationStartOffset: z.number().nonnegative(),
  citationEndOffset: z.number().nonnegative(),
  confidenceScore: z.number().min(0).max(1),
  userConfirmed: z.boolean().default(true)
});

// ============================================================================
// PHASE 2.3: COLLABORATION & PRESENCE
// ============================================================================

export const ProjectMemberRoleUpdateSchema = z.object({
  projectId: z.string().uuid(),
  targetUserId: z.string().uuid(),
  projectRole: z.enum(["LEAD", "ESTIMATOR", "CONTRIBUTOR"])
});

export const HeartbeatPresenceSchema = z.object({
  projectId: z.string().uuid(),
  currentSection: z.string(), // e.g. 'scope', 'estimate'
  activeItemId: z.string().optional()
});

// ============================================================================
// PHASE 2.4: DISCOVERY SYNTHESIS & MERGE
// ============================================================================

export const SynthesizeMultiDocumentSchema = z.object({
  projectId: z.string().uuid(),
  sourceDocumentIds: z.array(z.string().uuid()).min(1),
  detectContradictions: z.boolean().default(true),
  resolveAssumptions: z.boolean().default(true)
});

// ============================================================================
// PHASE 2.5: ESTIMATION RATE CARDS & CONTINGENCY
// ============================================================================

export const CreateRateCardSchema = z.object({
  name: z.string().min(2),
  currency: z.string().default("USD"),
  isDefault: z.boolean().default(false),
  items: z.array(
    z.object({
      roleTitle: z.string().min(2),
      hourlyRate: z.number().positive()
    })
  ).min(1)
});

export const UpdateEstimateContingencySchema = z.object({
  estimateId: z.string().uuid(),
  contingencyPercent: z.number().min(0).max(50), // 0% to 50% risk buffer
  p80CalculatedHours: z.number().positive().optional(),
  estimatedProfitMargin: z.number().min(0).max(100).optional()
});

// ============================================================================
// PHASE 2.6: WHITE-LABEL CLIENT PORTAL & COMMENTS
// ============================================================================

export const UpdateOrganizationBrandingSchema = z.object({
  brandColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Valid hex color required"),
  logoUrl: z.string().url().optional(),
  customDomain: z.string().regex(/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}$/, "Valid domain required").optional()
});

export const AddClientCommentSchema = z.object({
  proposalToken: z.string().uuid(),
  sectionKey: z.string().min(1),
  authorName: z.string().min(2),
  authorEmail: z.string().email(),
  content: z.string().min(2)
});

export const ResolveClientCommentSchema = z.object({
  commentId: z.string().uuid(),
  isResolved: z.boolean()
});

export const GenerateApprovalCertificateSchema = z.object({
  proposalToken: z.string().uuid(),
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  digitalSignatureConsent: z.boolean().refine(val => val === true, "Must give consent")
});

// ============================================================================
// PHASE 2.7: INTEGRATION FIELD MAPPINGS
// ============================================================================

export const UpdateIntegrationMappingsSchema = z.object({
  provider: IntegrationProviderEnum,
  fieldMappings: z.object({
    epicIssueType: z.string().optional(),
    storyIssueType: z.string().optional(),
    taskIssueType: z.string().optional(),
    defaultPriority: z.string().optional(),
    syncMilestonesAsEpics: z.boolean().default(true),
    customLabels: z.array(z.string()).default(["specforge-export"])
  })
});

// ============================================================================
// PHASE 2.9: BILLING, PLANS & TOP-UP
// ============================================================================

export const PurchaseCreditTopUpSchema = z.object({
  creditsAmount: z.number().int().positive(),
  paymentMethod: z.enum(["stripe", "jazzcash", "easypaisa"]),
  returnUrl: z.string().url()
});

export const UpgradeSubscriptionSchema = z.object({
  tier: z.enum(["PROFESSIONAL", "AGENCY"]),
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]),
  paymentMethodId: z.string().optional()
});

// ============================================================================
// PHASE 2.11: TEMPLATE SHARING
// ============================================================================

export const ShareTemplateSchema = z.object({
  title: z.string().min(3),
  category: z.enum(["Web Application", "Mobile Application", "E-commerce", "SaaS", "MVP", "Redesign", "Maintenance"]),
  description: z.string().min(10),
  isPublic: z.boolean().default(false),
  sourceProjectId: z.string().uuid()
});
