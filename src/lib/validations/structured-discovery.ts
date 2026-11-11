import { z } from "zod";

export const MoscowPriorityEnum = z.enum(["MUST", "SHOULD", "COULD", "WONT"]);

// ============================================================================
// 1. GUIDED DISCOVERY QUESTIONNAIRE (12 CATEGORIES)
// ============================================================================

export const SubmitDiscoveryQuestionnaireSchema = z.object({
  projectId: z.string().uuid(),
  businessGoal: z.string().min(10, "Business goal must be at least 10 characters"),
  targetUsers: z.string().min(5, "Specify target users or personas"),
  coreProblem: z.string().min(10, "Describe the core customer pain point"),
  mustHaveFeatures: z.array(z.string().min(2)).min(1, "Include at least 1 must-have feature"),
  niceToHaveFeatures: z.array(z.string().min(2)).default([]),
  technicalConstraints: z.string().default("None specified"),
  designConstraints: z.string().default("Modern clean UI"),
  integrationRequirements: z.string().default("None specified"),
  complianceRequirements: z.string().default("Standard GDPR / Terms"),
  launchDeadline: z.string().datetime().optional(),
  budgetRange: z.string().min(2, "Budget range required"),
  successMetrics: z.string().min(5, "Define success criteria")
});

export type SubmitDiscoveryQuestionnaireInput = z.infer<typeof SubmitDiscoveryQuestionnaireSchema>;

// ============================================================================
// 2. REQUIREMENT PRIORITIZATION & DEPENDENCIES
// ============================================================================

export const PrioritizeRequirementSchema = z.object({
  requirementId: z.string().uuid(),
  moscow: MoscowPriorityEnum,
  businessValue: z.number().int().min(1).max(5),
  complexityScore: z.number().int().min(1).max(5),
  dependsOnIds: z.array(z.string()).default([]),
  blocksIds: z.array(z.string()).default([])
});

// ============================================================================
// 3. USER PERSONA & USER FLOW MAPPING
// ============================================================================

export const CreateUserPersonaSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(2),
  roleTitle: z.string().min(2),
  description: z.string().min(5),
  goals: z.array(z.string().min(2)).default([]),
  painPoints: z.array(z.string().min(2)).default([])
});

export const CreateUserFlowSchema = z.object({
  projectId: z.string().uuid(),
  personaId: z.string().uuid().optional(),
  title: z.string().min(3),
  description: z.string().min(5),
  steps: z.array(
    z.object({
      stepNumber: z.number().int().positive(),
      action: z.string().min(2),
      screen: z.string().min(2)
    })
  ).min(1),
  keyScreens: z.array(z.string().min(2)).min(1),
  edgeCases: z.array(z.string().min(2)).default([]),
  linkedRequirementIds: z.array(z.string()).default([])
});

// ============================================================================
// 4. SCOPE COMPARISON & EXPORT
// ============================================================================

export const CompareScopeVersionsRequestSchema = z.object({
  projectId: z.string().uuid(),
  versionA: z.number().int().positive(),
  versionB: z.number().int().positive(),
  hourlyRate: z.number().positive().optional(),
  currency: z.string().default("USD")
});

export const ExportDiscoveryPackageSchema = z.object({
  projectId: z.string().uuid(),
  format: z.enum(["MARKDOWN", "PDF", "CSV", "JSON"]),
  includeUserFlows: z.boolean().default(true),
  includeEstimates: z.boolean().default(true),
  includeQuestionnaire: z.boolean().default(true)
});

