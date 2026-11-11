import { z } from "zod";

export const DateRangePeriodEnum = z.enum(["7D", "30D", "90D", "12M", "ALL", "CUSTOM"]);

export const ReportTypeEnum = z.enum([
  "WEEKLY_EXECUTIVE",
  "MONTHLY_FINANCIAL",
  "PROJECT_HEALTH",
  "CLIENT_DIGEST",
  "FUNNEL_COHORTS"
]);

export const ReportFormatEnum = z.enum(["CSV", "PDF", "JSON"]);

export const ScheduledFrequencyEnum = z.enum(["WEEKLY", "MONTHLY"]);

export const DateRangeFilterSchema = z.object({
  period: DateRangePeriodEnum.default("30D"),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

export const UserAnalyticsResponseSchema = z.object({
  userId: z.string(),
  period: DateRangePeriodEnum,
  projectsCreated: z.number().min(0),
  proposalsSent: z.number().min(0),
  approvalsReceived: z.number().min(0),
  estimatesCreated: z.number().min(0),
  aiCreditsUsed: z.number().min(0),
  timeSavedHours: z.number().min(0),
  conversionRatePercent: z.number().min(0).max(100),
  calculatedAt: z.string()
});

export const ProjectAnalyticsResponseSchema = z.object({
  projectId: z.string(),
  projectTitle: z.string(),
  scopeCompletenessScore: z.number().min(0).max(100),
  estimateAccuracyVariancePercent: z.number(),
  approvalTurnaroundHours: z.number().min(0),
  changeRequestCount: z.number().min(0),
  changeRequestCostImpact: z.number().min(0),
  deliveryProgressPercent: z.number().min(0).max(100),
  currency: z.string().default("USD"),
  invoicedAmount: z.number().min(0),
  paidAmount: z.number().min(0),
  outstandingAmount: z.number().min(0),
  calculatedAt: z.string()
});

export const AgencyAnalyticsResponseSchema = z.object({
  organizationId: z.string(),
  period: DateRangePeriodEnum,
  activeClients: z.number().min(0),
  activeProjects: z.number().min(0),
  revenuePipeline: z.number().min(0),
  outstandingReceivables: z.number().min(0),
  teamUtilizationPercent: z.number().min(0).max(100),
  averageProjectProfitMargin: z.number(),
  blendedHourlyRealization: z.number().min(0),
  calculatedAt: z.string()
});

export const FunnelStageSchema = z.object({
  stageKey: z.string(),
  stageName: z.string(),
  userCount: z.number().min(0),
  conversionPercent: z.number().min(0).max(100),
  dropoffPercent: z.number().min(0).max(100),
  medianDurationHours: z.number().min(0).optional()
});

export const CohortRowSchema = z.object({
  cohortPeriod: z.string(),
  newUsersCount: z.number().min(0),
  retentionByWeek: z.array(z.number().min(0).max(100))
});

export const ScheduledReportCreateSchema = z.object({
  reportType: ReportTypeEnum.default("WEEKLY_EXECUTIVE"),
  recipients: z.array(z.string().email("Valid email required")).min(1, "At least one recipient email is required"),
  format: ReportFormatEnum.default("PDF"),
  frequency: ScheduledFrequencyEnum.default("WEEKLY"),
  dayOfWeek: z.number().min(1).max(7).default(1),
  dayOfMonth: z.number().min(1).max(31).optional()
});

export const ExportReportRequestSchema = z.object({
  reportType: ReportTypeEnum.default("WEEKLY_EXECUTIVE"),
  format: ReportFormatEnum.default("CSV"),
  projectId: z.string().uuid().optional(),
  dateRange: DateRangePeriodEnum.default("30D")
});

export type DateRangePeriod = z.infer<typeof DateRangePeriodEnum>;
export type ReportType = z.infer<typeof ReportTypeEnum>;
export type ReportFormat = z.infer<typeof ReportFormatEnum>;
export type ScheduledFrequency = z.infer<typeof ScheduledFrequencyEnum>;
export type UserAnalyticsResponse = z.infer<typeof UserAnalyticsResponseSchema>;
export type ProjectAnalyticsResponse = z.infer<typeof ProjectAnalyticsResponseSchema>;
export type AgencyAnalyticsResponse = z.infer<typeof AgencyAnalyticsResponseSchema>;
export type FunnelStage = z.infer<typeof FunnelStageSchema>;
export type CohortRow = z.infer<typeof CohortRowSchema>;
export type ScheduledReportCreateInput = z.infer<typeof ScheduledReportCreateSchema>;
export type ExportReportRequestInput = z.infer<typeof ExportReportRequestSchema>;
