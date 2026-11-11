import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

export const ConfidenceLevelEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const ReviewStateEnum = z.enum([
  "REVIEW_REQUIRED",
  "ACCEPTED",
  "EDITED",
  "REJECTED",
  "MARKED_AS_ASSUMPTION"
]);

export const ConflictTypeEnum = z.enum([
  "CONTRADICTION",
  "DUPLICATE_FEATURE",
  "MISSING_ACCEPTANCE_CRITERIA",
  "UNCLEAR_USER_ROLE",
  "MISSING_CONSTRAINT",
  "CONFLICTING_ASSUMPTION"
]);

export const ExtractionQualityModeEnum = z.enum(["FAST", "BALANCED", "THOROUGH"]);
export const ClarificationStatusEnum = z.enum(["DRAFT", "SENT_TO_CLIENT", "ANSWERED", "INTEGRATED"]);
export const AiFeedbackRatingEnum = z.enum(["HELPFUL", "PARTIALLY_HELPFUL", "NOT_HELPFUL"]);

// ============================================================================
// 1. SOURCE TRACEABILITY & ITEM REVIEW SCHEMAS
// ============================================================================

export const ReviewRequirementItemSchema = z.object({
  requirementId: z.string().uuid(),
  action: z.enum(["ACCEPT", "EDIT", "REJECT", "MARK_AS_ASSUMPTION"]),
  updatedTitle: z.string().min(1).optional(),
  updatedDescription: z.string().min(1).optional(),
  reviewComment: z.string().optional(),
  confirmAssumption: z.boolean().default(false)
});

export const RegenerateItemSchema = z.object({
  requirementId: z.string().uuid(),
  regenerationPrompt: z.string().min(3, "Provide guidance for item regeneration"),
  qualityMode: ExtractionQualityModeEnum.default("BALANCED")
});

export const FilterRequirementsSchema = z.object({
  projectId: z.string().uuid(),
  confidenceLevel: ConfidenceLevelEnum.optional(),
  reviewState: ReviewStateEnum.optional(),
  category: z.string().optional(),
  onlyUnreviewed: z.boolean().default(false),
  onlyAssumptions: z.boolean().default(false)
});

// ============================================================================
// 2. VERSIONING & DIFF SCHEMAS
// ============================================================================

export const CreateScopeVersionSchema = z.object({
  projectId: z.string().uuid(),
  changeSummary: z.string().min(3),
  versionType: z.enum(["AI_GENERATION", "USER_EDIT", "CLARIFICATION_RE_EXTRACTION", "RESTORE_ROLLBACK"]).default("USER_EDIT")
});

export const CompareScopeVersionsSchema = z.object({
  projectId: z.string().uuid(),
  versionA: z.number().int().positive(),
  versionB: z.number().int().positive()
});

export const RestoreScopeVersionSchema = z.object({
  projectId: z.string().uuid(),
  targetVersionNumber: z.number().int().positive(),
  reason: z.string().min(3)
});

// ============================================================================
// 3. CONFLICT DETECTION & RESOLUTION SCHEMAS
// ============================================================================

export const DetectConflictsRequestSchema = z.object({
  projectId: z.string().uuid(),
  checkContradictions: z.boolean().default(true),
  checkDuplicates: z.boolean().default(true),
  checkMissingCriteria: z.boolean().default(true),
  checkUnclearRoles: z.boolean().default(true)
});

export const ResolveConflictSchema = z.object({
  conflictId: z.string().uuid(),
  resolutionStatus: z.enum(["RESOLVED", "IGNORED"]),
  resolutionNotes: z.string().min(2),
  actionTaken: z.enum(["MERGE_ITEMS", "DELETE_DUPLICATE", "SPLIT_REQUIREMENT", "CONFIRM_MANUALLY"])
});

// ============================================================================
// 4. CLARIFICATION REQUESTS SCHEMAS
// ============================================================================

export const CreateClarificationRequestSchema = z.object({
  projectId: z.string().uuid(),
  question: z.string().min(5),
  suggestedContext: z.string().min(5)
});

export const AttachClientResponseSchema = z.object({
  clarificationId: z.string().uuid(),
  clientResponse: z.string().min(2),
  triggerTargetedReExtraction: z.boolean().default(true)
});

// ============================================================================
// 5. AI MODEL ROUTING & CREDIT COST
// ============================================================================

export const ModelRoutingEstimateSchema = z.object({
  documentWordCount: z.number().nonnegative(),
  audioDurationSeconds: z.number().nonnegative().optional(),
  qualityMode: ExtractionQualityModeEnum
});

export const ModelRoutingEstimateResponseSchema = z.object({
  qualityMode: ExtractionQualityModeEnum,
  recommendedModel: z.string(),
  estimatedTokens: z.number(),
  estimatedCreditCost: z.number(),
  estimatedDurationSeconds: z.number(),
  isCached: z.boolean()
});

// ============================================================================
// 6. AI FEEDBACK LOOP SCHEMA
// ============================================================================

export const SubmitAiFeedbackSchema = z.object({
  projectId: z.string().uuid(),
  requirementId: z.string().uuid().optional(),
  rating: AiFeedbackRatingEnum,
  feedbackNotes: z.string().optional(),
  modelName: z.string().default("gemini-1.5-flash"),
  qualityMode: ExtractionQualityModeEnum.default("BALANCED")
});
