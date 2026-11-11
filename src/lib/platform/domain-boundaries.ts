/**
 * SpecForge Phase 5.1: Modular Domain Boundaries
 * Defines strict boundaries, owners, data models, API surfaces,
 * permission rules, and event schemas for the 13 core platform domains.
 */

export type PlatformDomain =
  | "identity_access"
  | "workspace_tenant"
  | "client_project"
  | "discovery_requirements"
  | "estimation"
  | "proposal_approval"
  | "task_delivery"
  | "change_control"
  | "billing_usage"
  | "integrations"
  | "analytics"
  | "notifications"
  | "admin_support";

export interface DomainBoundaryDefinition {
  domain: PlatformDomain;
  title: string;
  description: string;
  ownerTeam: string;
  primaryEntities: string[];
  apiBaseRoutes: string[];
  requiredPermissions: string[];
  emittedEvents: string[];
  consumedEvents: string[];
  slaTargetMs: number;
  availabilityTarget: number; // e.g. 99.95%
}

export const PLATFORM_DOMAINS: Record<PlatformDomain, DomainBoundaryDefinition> = {
  identity_access: {
    domain: "identity_access",
    title: "Identity & Access Domain",
    description: "User authentication, sessions, multi-factor auth, API tokens, and RBAC policy evaluation.",
    ownerTeam: "Core Security & Platform",
    primaryEntities: ["User", "Session", "ApiKey", "Role", "PermissionAssignment"],
    apiBaseRoutes: ["/api/v1/auth", "/api/v1/users", "/api/v1/tokens"],
    requiredPermissions: ["auth:login", "users:manage", "tokens:issue"],
    emittedEvents: ["user.created", "user.authenticated", "token.revoked"],
    consumedEvents: ["workspace.member_removed"],
    slaTargetMs: 100,
    availabilityTarget: 99.99
  },
  workspace_tenant: {
    domain: "workspace_tenant",
    title: "Workspace & Tenant Isolation Domain",
    description: "Multi-tenant workspace lifecycle, organization memberships, data isolation boundaries, and quotas.",
    ownerTeam: "Core Platform",
    primaryEntities: ["Workspace", "Organization", "WorkspaceMember", "TenantQuota"],
    apiBaseRoutes: ["/api/v1/workspaces", "/api/v1/organizations"],
    requiredPermissions: ["workspace:read", "workspace:manage", "workspace:invite"],
    emittedEvents: ["workspace.created", "workspace.updated", "workspace.member_added", "workspace.member_removed"],
    consumedEvents: ["subscription.updated", "billing.quota_exceeded"],
    slaTargetMs: 150,
    availabilityTarget: 99.95
  },
  client_project: {
    domain: "client_project",
    title: "Client & Project Management Domain",
    description: "Client CRM metadata, project lifecycles, project stages, and workspace-level portfolio views.",
    ownerTeam: "Product Experience",
    primaryEntities: ["Client", "Project", "ProjectStage", "ProjectMember"],
    apiBaseRoutes: ["/api/v1/clients", "/api/v1/projects"],
    requiredPermissions: ["clients:read", "clients:manage", "projects:read", "projects:manage"],
    emittedEvents: ["client.created", "project.created", "project.status_changed"],
    consumedEvents: ["proposal.approved", "task.exported"],
    slaTargetMs: 200,
    availabilityTarget: 99.9
  },
  discovery_requirements: {
    domain: "discovery_requirements",
    title: "Discovery & Requirements Intelligence Domain",
    description: "Input brief ingestion, audio transcription, document upload, AI feature extraction, and scope versioning.",
    ownerTeam: "AI Intelligence",
    primaryEntities: ["Document", "AudioRecording", "ExtractionJob", "ScopeDocument", "ScopeVersion"],
    apiBaseRoutes: ["/api/v1/discovery", "/api/v1/scopes", "/api/v1/ai"],
    requiredPermissions: ["discovery:upload", "ai:extract", "scopes:read", "scopes:edit", "scopes:approve"],
    emittedEvents: ["document.uploaded", "transcription.completed", "ai_generation.completed", "scope.version_created", "scope.approved"],
    consumedEvents: ["project.created", "subscription.updated"],
    slaTargetMs: 1500,
    availabilityTarget: 99.5
  },
  estimation: {
    domain: "estimation",
    title: "Estimation & Commercial Intelligence Domain",
    description: "Role rate cards, deliverable duration modeling, margin calculation, contingency buffers, and currency conversion.",
    ownerTeam: "Commercial Engineering",
    primaryEntities: ["RateCard", "Estimate", "DeliverableEstimate", "ContingencyRule"],
    apiBaseRoutes: ["/api/v1/estimates", "/api/v1/rate-cards"],
    requiredPermissions: ["estimates:read", "estimates:manage", "estimates:approve"],
    emittedEvents: ["estimate.created", "estimate.approved", "estimate.version_locked"],
    consumedEvents: ["scope.approved", "scope.version_created"],
    slaTargetMs: 250,
    availabilityTarget: 99.9
  },
  proposal_approval: {
    domain: "proposal_approval",
    title: "Proposal & Approval Engine Domain",
    description: "Interactive client proposals, e-signature capture, approval state machines, tokenized client portal links.",
    ownerTeam: "Growth & Client Experience",
    primaryEntities: ["Proposal", "ApprovalRecord", "SignatureAudit", "ProposalRevision"],
    apiBaseRoutes: ["/api/v1/proposals", "/api/v1/approvals", "/api/v1/portal/proposals"],
    requiredPermissions: ["proposals:read", "proposals:manage", "proposals:send", "client_portal:access"],
    emittedEvents: ["proposal.sent", "proposal.approved", "proposal.rejected", "proposal.viewed"],
    consumedEvents: ["estimate.approved", "scope.approved"],
    slaTargetMs: 300,
    availabilityTarget: 99.95
  },
  task_delivery: {
    domain: "task_delivery",
    title: "Task Generation & Delivery Handover Domain",
    description: "WBS breakdown, task generation, milestone tracking, and external PM sync (Jira, Linear, GitHub, Asana).",
    ownerTeam: "Workflow Integration",
    primaryEntities: ["TaskBreakdown", "Milestone", "TaskItem", "SyncRecord"],
    apiBaseRoutes: ["/api/v1/tasks", "/api/v1/milestones", "/api/v1/delivery"],
    requiredPermissions: ["tasks:read", "tasks:manage", "tasks:export"],
    emittedEvents: ["task.generated", "task.exported", "milestone.completed"],
    consumedEvents: ["proposal.approved", "change_request.approved"],
    slaTargetMs: 350,
    availabilityTarget: 99.9
  },
  change_control: {
    domain: "change_control",
    title: "Change Control & Scope Variance Domain",
    description: "Post-approval scope amendments, budget impact delta, timeline delta, and change-order client sign-off.",
    ownerTeam: "Product Experience",
    primaryEntities: ["ChangeRequest", "ScopeDelta", "CostImpact", "ApprovalLog"],
    apiBaseRoutes: ["/api/v1/change-requests", "/api/v1/scope-deltas"],
    requiredPermissions: ["change_requests:read", "change_requests:create", "change_requests:approve"],
    emittedEvents: ["change_request.created", "change_request.approved", "change_request.rejected"],
    consumedEvents: ["proposal.approved", "scope.approved"],
    slaTargetMs: 250,
    availabilityTarget: 99.9
  },
  billing_usage: {
    domain: "billing_usage",
    title: "Billing, Subscription & Usage Domain",
    description: "Credit ledger, subscription tiers, Stripe webhook processing, payment milestones, and revenue reconciliation.",
    ownerTeam: "Finance & Platform Ops",
    primaryEntities: ["Subscription", "CreditLedger", "PaymentMilestone", "InvoiceRecord"],
    apiBaseRoutes: ["/api/v1/billing", "/api/v1/credits", "/api/v1/webhooks/stripe"],
    requiredPermissions: ["billing:read", "billing:manage", "credits:consume"],
    emittedEvents: ["subscription.updated", "payment_milestone.updated", "billing.quota_exceeded"],
    consumedEvents: ["proposal.approved", "ai_generation.completed"],
    slaTargetMs: 200,
    availabilityTarget: 99.99
  },
  integrations: {
    domain: "integrations",
    title: "Safe Integrations & Ecosystem Domain",
    description: "OAuth credential management, rate-limited external adapters (Jira, Linear, GitHub, Slack), and webhook dispatcher.",
    ownerTeam: "Integrations & Ecosystem",
    primaryEntities: ["IntegrationConnection", "WebhookEndpoint", "ExportLog", "AdapterCircuit"],
    apiBaseRoutes: ["/api/v1/integrations", "/api/v1/webhooks"],
    requiredPermissions: ["integrations:manage", "integrations:sync"],
    emittedEvents: ["integration.connected", "integration.failed", "integration.disconnected"],
    consumedEvents: ["task.generated", "proposal.sent", "change_request.approved"],
    slaTargetMs: 500,
    availabilityTarget: 99.8
  },
  analytics: {
    domain: "analytics",
    title: "Growth, Telemetry & Product Analytics Domain",
    description: "34-event taxonomy ingestion, Weekly Activated Workspaces (WAW) calculation, A/B experiment evaluation.",
    ownerTeam: "Data & Growth",
    primaryEntities: ["AnalyticsEvent", "GrowthCohort", "Experiment", "FunnelMetric"],
    apiBaseRoutes: ["/api/v1/analytics", "/api/v1/experiments"],
    requiredPermissions: ["analytics:view", "experiments:manage"],
    emittedEvents: ["experiment.variant_assigned", "growth.milestone_reached"],
    consumedEvents: ["*"], // Consumes all domain events
    slaTargetMs: 400,
    availabilityTarget: 99.9
  },
  notifications: {
    domain: "notifications",
    title: "Reliable Notification & Preference Domain",
    description: "Multi-channel notification queue (email, in-app, webhook), deduplication keys, and user preference gating.",
    ownerTeam: "Core Platform",
    primaryEntities: ["Notification", "NotificationPreference", "DeliveryAttempt", "DigestBatch"],
    apiBaseRoutes: ["/api/v1/notifications", "/api/v1/preferences/notifications"],
    requiredPermissions: ["notifications:read", "notifications:manage"],
    emittedEvents: ["notification.sent", "notification.failed", "notification.bounced"],
    consumedEvents: ["scope.approved", "proposal.sent", "proposal.approved", "change_request.created", "payment_milestone.updated"],
    slaTargetMs: 200,
    availabilityTarget: 99.95
  },
  admin_support: {
    domain: "admin_support",
    title: "Admin Governance, Support & Feature Flags Domain",
    description: "System administration, tenant feature-flag overrides, audit trails, kill switches, and customer support impersonation.",
    ownerTeam: "Security & Operations",
    primaryEntities: ["FeatureFlag", "AuditTrailRecord", "SupportSession", "SystemStatus"],
    apiBaseRoutes: ["/api/v1/admin", "/api/v1/admin/feature-flags", "/api/v1/admin/support"],
    requiredPermissions: ["admin:access", "admin:flags_manage", "admin:audit_read"],
    emittedEvents: ["feature_flag.updated", "feature_flag.kill_switched", "support.session_started"],
    consumedEvents: ["*"],
    slaTargetMs: 250,
    availabilityTarget: 99.99
  }
};

