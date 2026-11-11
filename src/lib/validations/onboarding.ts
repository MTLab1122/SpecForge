import { z } from "zod";

// ============================================================================
// ESSENTIAL ONBOARDING QUESTIONS ENUMS & SCHEMAS
// ============================================================================

export const UserTypeEnum = z.enum([
  "FREELANCER",
  "AGENCY",
  "PRODUCT_MANAGER",
  "CONSULTANT"
]);

export const PrimaryServiceTypeEnum = z.enum([
  "WEB_DEVELOPMENT",
  "MOBILE_APPS",
  "SAAS_DEVELOPMENT",
  "ECOMMERCE_DEVELOPMENT",
  "UI_UX_PRODUCT_DESIGN",
  "TECHNICAL_CONSULTING",
  "FULL_STACK_SERVICES"
]);

export const TypicalProjectTypeEnum = z.enum([
  "MVP_BUILD",
  "WEBSITE_REDESIGN",
  "CUSTOM_SAAS",
  "MOBILE_APPLICATION",
  "ECOMMERCE_PLATFORM",
  "MAINTENANCE_RETAINER",
  "DISCOVERY_AUDIT"
]);

export const PreferredLanguageEnum = z.enum(["en", "ur"]);

export const TeamSizeEnum = z.enum([
  "1",
  "2_5",
  "6_15",
  "16_PLUS"
]);

export const PrimaryGoalEnum = z.enum([
  "FASTER_PROPOSALS",
  "BETTER_ESTIMATES",
  "SCOPE_CONTROL",
  "CLIENT_APPROVAL"
]);

// Onboarding Questionnaire Submission Schema
export const SubmitOnboardingProfileSchema = z.object({
  userType: UserTypeEnum,
  primaryService: PrimaryServiceTypeEnum,
  typicalProjectType: TypicalProjectTypeEnum,
  preferredLanguage: PreferredLanguageEnum.default("en"),
  teamSize: TeamSizeEnum,
  primaryGoal: PrimaryGoalEnum,
  createSampleSandbox: z.boolean().default(true),
  workspaceName: z.string().min(2, "Workspace name must be at least 2 characters").optional()
});

export type SubmitOnboardingProfileInput = z.infer<typeof SubmitOnboardingProfileSchema>;

// ============================================================================
// ACTIVATION PROGRESS CHECKLIST SCHEMAS
// ============================================================================

export const ChecklistStepKeyEnum = z.enum([
  "createWorkspace",
  "addFirstClient",
  "createFirstProject",
  "uploadBrief",
  "generateRequirements",
  "reviewAiOutput",
  "createEstimate",
  "sendProposal",
  "obtainApproval",
  "generateTasks"
]);

export const UpdateChecklistStepSchema = z.object({
  stepKey: ChecklistStepKeyEnum,
  isCompleted: z.boolean().default(true),
  metadata: z.record(z.any()).optional()
});

// Checklist State Response Interface
export interface ActivationChecklistStatus {
  id: string;
  userId: string;
  createWorkspace: boolean;
  addFirstClient: boolean;
  createFirstProject: boolean;
  uploadBrief: boolean;
  generateRequirements: boolean;
  reviewAiOutput: boolean;
  createEstimate: boolean;
  sendProposal: boolean;
  obtainApproval: boolean;
  generateTasks: boolean;
  isActivated: boolean;
  activatedAt: string | null;
  completedStepsCount: number;
  totalStepsCount: number;
  percentComplete: number;
  nextRecommendedStep: {
    key: string;
    title: string;
    description: string;
    actionUrl: string;
    estimatedMinutes: number;
  };
}

// ============================================================================
// RESUME STATE & RECENT ACTIVITY SCHEMAS
// ============================================================================

export const RecordProjectResumeStateSchema = z.object({
  projectId: z.string().uuid(),
  lastSection: z.enum([
    "BRIEF_UPLOAD",
    "AI_EXTRACTION",
    "SCOPE_BUILDER",
    "ESTIMATE_BUILDER",
    "PROPOSAL_PREVIEW",
    "CLIENT_PORTAL",
    "TASK_BOARD",
    "CHANGE_REQUESTS"
  ]),
  lastAction: z.string().min(2),
  resumeUrl: z.string().min(1),
  completionPercent: z.number().min(0).max(100)
});

export type RecordProjectResumeStateInput = z.infer<typeof RecordProjectResumeStateSchema>;

// ============================================================================
// COMMAND PALETTE ACTIONS
// ============================================================================

export const CommandPaletteActionSchema = z.object({
  query: z.string().optional(),
  category: z.enum(["PROJECTS", "CLIENTS", "ACTIONS", "HELP", "TEMPLATES"]).optional()
});
