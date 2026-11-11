import { z } from "zod";

export const IntegrationProviderEnum = z.enum([
  "JIRA",
  "LINEAR",
  "TRELLO",
  "GITHUB",
  "SLACK",
  "NOTION"
]);

export const IntegrationStatusEnum = z.enum(["CONNECTED", "DISCONNECTED", "ERROR"]);

export const SyncStatusEnum = z.enum(["PENDING", "SUCCESS", "FAILED", "RETRYING"]);

export const WebhookEventTypeEnum = z.enum([
  "project.created",
  "scope.approved",
  "estimate.created",
  "proposal.sent",
  "proposal.approved",
  "change_request.created",
  "change_request.approved",
  "task.created",
  "milestone.completed"
]);

export const InternalTaskPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const InternalTaskStatusEnum = z.enum([
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "BLOCKED"
]);

export const InternalTaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Task title is required"),
  description: z.string().default(""),
  priority: InternalTaskPriorityEnum.default("MEDIUM"),
  status: InternalTaskStatusEnum.default("TODO"),
  estimatedHours: z.number().min(0).default(0),
  dueDate: z.string().optional(),
  labels: z.array(z.string()).default([]),
  assigneeEmail: z.string().email().optional(),
  milestoneTitle: z.string().optional(),
  featureTitle: z.string().optional(),
  acceptanceCriteria: z.array(z.string()).default([])
});

export const ConnectIntegrationSchema = z.object({
  provider: IntegrationProviderEnum,
  apiKey: z.string().min(1, "API key or token is required"),
  targetProject: z.string().optional(), // Jira project key, Linear team ID, GitHub repo, etc.
  externalOrgId: z.string().optional(), // Jira Cloud domain, Trello board ID
  webhookUrl: z.string().url().optional(), // For Slack incoming webhook
  fieldMappings: z.record(z.string(), z.any()).optional()
});

export const ExportTasksRequestSchema = z.object({
  projectId: z.string().uuid("Valid project ID required"),
  provider: IntegrationProviderEnum,
  taskIds: z.array(z.string()).min(1, "Select at least one task to export"),
  confirmedByUser: z.boolean().refine((val) => val === true, {
    message: "Explicit user approval is required before initiating external task exports"
  }),
  targetProjectOrList: z.string().optional()
});

export const RetryExportRequestSchema = z.object({
  syncRecordId: z.string().min(1, "Sync record ID is required"),
  confirmedByUser: z.boolean().refine((val) => val === true, {
    message: "Explicit user approval is required to retry external export"
  })
});

export const WebhookSubscriptionCreateSchema = z.object({
  targetUrl: z.string().url("Valid webhook destination URL is required"),
  eventTypes: z.array(WebhookEventTypeEnum).min(1, "Select at least one event type"),
  description: z.string().optional()
});

export const SlackNotificationSchema = z.object({
  channelWebhookUrl: z.string().url("Valid Slack webhook URL is required"),
  notificationType: z.enum([
    "PROJECT_UPDATE",
    "APPROVAL_REQUEST",
    "CHANGE_REQUEST_ALERT",
    "MILESTONE_REMINDER"
  ]),
  title: z.string().min(1),
  summary: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional()
});

export const NotionExportSchema = z.object({
  projectId: z.string().uuid(),
  exportFormat: z.enum(["DATABASE", "PAGE", "JSON_BLOCKS"]).default("DATABASE"),
  includeScope: z.boolean().default(true),
  includeEstimate: z.boolean().default(true),
  includeTasks: z.boolean().default(true)
});

export type IntegrationProvider = z.infer<typeof IntegrationProviderEnum>;
export type IntegrationStatus = z.infer<typeof IntegrationStatusEnum>;
export type SyncStatus = z.infer<typeof SyncStatusEnum>;
export type WebhookEventType = z.infer<typeof WebhookEventTypeEnum>;
export type InternalTask = z.infer<typeof InternalTaskSchema>;
export type ConnectIntegrationInput = z.infer<typeof ConnectIntegrationSchema>;
export type ExportTasksRequestInput = z.infer<typeof ExportTasksRequestSchema>;
export type RetryExportRequestInput = z.infer<typeof RetryExportRequestSchema>;
export type WebhookSubscriptionCreateInput = z.infer<typeof WebhookSubscriptionCreateSchema>;
export type SlackNotificationInput = z.infer<typeof SlackNotificationSchema>;
export type NotionExportInput = z.infer<typeof NotionExportSchema>;
