import { z } from "zod";

export const EstimateCategoryEnum = z.enum([
  "FEATURE",
  "TASK",
  "DESIGN",
  "DEVELOPMENT",
  "QA",
  "DEPLOYMENT",
  "PROJECT_MANAGEMENT",
  "BUFFER"
]);

export const PricingTypeEnum = z.enum([
  "HOURLY_RATE",
  "FIXED_PRICE",
  "TIME_AND_MATERIALS",
  "RETAINER",
  "MVP_FIXED",
  "MAINTENANCE",
  "DISCOVERY_PHASE"
]);

export const EstimateScenarioTypeEnum = z.enum([
  "OPTIMISTIC",
  "REALISTIC",
  "CONSERVATIVE",
  "CUSTOM"
]);

export const EstimateApprovalStatusEnum = z.enum([
  "DRAFT",
  "INTERNAL_REVIEW",
  "MANAGER_APPROVED",
  "CLIENT_APPROVED",
  "REJECTED",
  "REVISED"
]);

export const InvoiceStatusEnum = z.enum([
  "DRAFT",
  "ISSUED",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "VOID"
]);

export const ComplexityLevelEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const RateCardItemSchema = z.object({
  roleTitle: z.string().min(1, "Role title is required"),
  hourlyRate: z.number().min(0, "Hourly rate cannot be negative")
});

export const DiscountRuleSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Discount label is required"),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.number().min(0, "Discount value must be positive"),
  minSpend: z.number().optional()
});

export const RateCardSchema = z.object({
  name: z.string().min(1, "Rate card name is required"),
  currency: z.string().default("USD"),
  isDefault: z.boolean().default(false),
  taxRatePercent: z.number().min(0).max(100).default(0),
  taxIsInclusive: z.boolean().default(false),
  taxRegistrationNumber: z.string().optional(),
  discountRules: z.array(DiscountRuleSchema).optional(),
  minimumProjectValue: z.number().min(0).default(0),
  managerApprovalThreshold: z.number().min(0).default(10000),
  items: z.array(RateCardItemSchema).min(1, "At least one role rate is required")
});

export const EstimateItemInputSchema = z.object({
  id: z.string().optional(),
  featureId: z.string().optional(),
  category: EstimateCategoryEnum.default("DEVELOPMENT"),
  roleTitle: z.string().default("Senior Full Stack Engineer"),
  hourlyRate: z.number().min(0).default(100),
  title: z.string().min(1, "Item title is required"),
  description: z.string().optional(),
  complexity: ComplexityLevelEnum.default("MEDIUM"),
  minHours: z.number().min(0.25, "Minimum hours must be at least 0.25"),
  maxHours: z.number().min(0.25, "Maximum hours must be at least 0.25"),
  manualOverride: z.boolean().default(false),
  overrideReason: z.string().optional(),
  taskStoryId: z.string().optional()
});

export const CreateEstimateSchema = z.object({
  projectId: z.string().uuid("Valid Project ID is required"),
  rateCardId: z.string().uuid().optional(),
  pricingType: PricingTypeEnum.default("FIXED_PRICE"),
  currency: z.string().default("USD"),
  contingencyPercent: z.number().min(0).max(100).default(15),
  scenarioType: EstimateScenarioTypeEnum.default("REALISTIC"),
  customMultiplier: z.number().min(0.5).max(3.0).optional(),
  taxRatePercent: z.number().min(0).max(100).default(0),
  discountAmount: z.number().min(0).default(0),
  minimumProjectValue: z.number().min(0).optional(),
  assumptionsNotes: z.string().optional(),
  items: z.array(EstimateItemInputSchema).min(1, "At least one item is required")
});

export const EstimateApprovalActionSchema = z.object({
  action: z.enum(["SUBMIT_FOR_REVIEW", "MANAGER_APPROVE", "CLIENT_APPROVE", "REJECT", "REVISE"]),
  userId: z.string().min(1, "Acting user ID is required"),
  userRole: z.string().default("EDITOR"),
  rejectionReason: z.string().optional(),
  revisionNotes: z.string().optional()
});

export const InvoiceLineItemSchema = z.object({
  description: z.string().min(1, "Line item description is required"),
  category: EstimateCategoryEnum.default("DEVELOPMENT"),
  hours: z.number().min(0),
  rate: z.number().min(0),
  amount: z.number().min(0)
});

export const InvoiceCreateSchema = z.object({
  projectId: z.string().uuid("Valid Project ID required"),
  estimateId: z.string().uuid().optional(),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  title: z.string().min(1, "Invoice title is required"),
  currency: z.string().default("USD"),
  invoicedAmount: z.number().min(0, "Invoiced amount must be positive"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(InvoiceLineItemSchema).min(1, "At least one line item is required")
});

export const InvoicePaymentRecordSchema = z.object({
  amountPaid: z.number().min(0.01, "Payment amount must be greater than zero"),
  paymentReference: z.string().optional(),
  notes: z.string().optional()
});

export const AccuracyFeedbackInputSchema = z.object({
  actualHoursByRole: z.record(z.string(), z.number().min(0)),
  actualTotalHours: z.number().min(0.1, "Actual hours must be greater than zero"),
  qualitativeNotes: z.string().optional(),
  recurringErrorTags: z.array(z.string()).default([])
});

export type EstimateCategory = z.infer<typeof EstimateCategoryEnum>;
export type PricingType = z.infer<typeof PricingTypeEnum>;
export type EstimateScenarioType = z.infer<typeof EstimateScenarioTypeEnum>;
export type EstimateApprovalStatus = z.infer<typeof EstimateApprovalStatusEnum>;
export type InvoiceStatus = z.infer<typeof InvoiceStatusEnum>;
export type EstimateItemInput = z.infer<typeof EstimateItemInputSchema>;
export type CreateEstimateInput = z.infer<typeof CreateEstimateSchema>;
export type RateCardInput = z.infer<typeof RateCardSchema>;
export type EstimateApprovalActionInput = z.infer<typeof EstimateApprovalActionSchema>;
export type InvoiceCreateInput = z.infer<typeof InvoiceCreateSchema>;
export type InvoicePaymentRecordInput = z.infer<typeof InvoicePaymentRecordSchema>;
export type AccuracyFeedbackInput = z.infer<typeof AccuracyFeedbackInputSchema>;

