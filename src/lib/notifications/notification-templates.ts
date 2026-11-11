export type NotificationTemplateId =
  | "SCOPE_SHARED"
  | "APPROVAL_REQUESTED"
  | "APPROVAL_RECEIVED"
  | "CHANGE_REQUESTED"
  | "CHANGE_APPROVED_REJECTED"
  | "PROPOSAL_SENT"
  | "PROPOSAL_APPROVED_REJECTED"
  | "MILESTONE_DUE"
  | "PAYMENT_OVERDUE"
  | "EXPORT_READY"
  | "INTEGRATION_FAILURE"
  | "WEEKLY_DIGEST"
  | "MARKETING_UPDATE";

export type PreferenceCategory =
  | "APPROVALS"
  | "CHANGE_REQUESTS"
  | "PAYMENTS"
  | "SYSTEM"
  | "WEEKLY_DIGEST"
  | "MARKETING";

export interface RenderedNotificationTemplate {
  templateId: NotificationTemplateId;
  category: PreferenceCategory;
  subject: string;
  title: string;
  bodyText: string;
  bodyHtml: string;
  isEssential: boolean; // Essential notifications (e.g. security or payment overdue) cannot be opted out silently
}

export interface TemplateVariables {
  recipientName?: string;
  projectName?: string;
  entityId?: string;
  clientName?: string;
  amount?: string | number;
  dueDate?: string;
  actionUrl?: string;
  providerName?: string;
  errorMessage?: string;
  changeStatus?: "APPROVED" | "REJECTED";
  proposalStatus?: "APPROVED" | "REJECTED";
  summaryStats?: {
    activeProjects?: number;
    pendingApprovals?: number;
    completedTasks?: number;
  };
  customMessage?: string;
}

export class NotificationTemplateEngine {
  /**
   * Renders a standardized, responsive notification template.
   */
  public static render(
    templateId: NotificationTemplateId,
    vars: TemplateVariables = {}
  ): RenderedNotificationTemplate {
    const actionLink = vars.actionUrl || "https://app.specforge.io";
    const name = vars.recipientName || "Team Member";
    const project = vars.projectName || "SpecForge Project";

    switch (templateId) {
      case "SCOPE_SHARED":
        return {
          templateId,
          category: "SYSTEM",
          isEssential: false,
          subject: `Scope Shared: ${project}`,
          title: `Project Scope Shared`,
          bodyText: `Hello ${name}, the scope specification for project '${project}' has been shared with you for review. View scope: ${actionLink}`,
          bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0f172a; margin-top: 0;">Scope Shared: ${project}</h2>
            <p style="color: #475569;">Hello ${name},</p>
            <p style="color: #475569;">The scope specification for <strong>${project}</strong> has been published and shared with you for discovery review.</p>
            <div style="margin: 24px 0;">
              <a href="${actionLink}" style="background-color: #4f46e5; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600;">Review Scope Specification</a>
            </div>
            <p style="color: #94a3b8; font-size: 12px;">SpecForge Discovery & Requirements Engine</p>
          </div>`
        };

      case "APPROVAL_REQUESTED":
        return {
          templateId,
          category: "APPROVALS",
          isEssential: false,
          subject: `Action Required: Approval Requested for ${project}`,
          title: `Client Approval Requested`,
          bodyText: `Hello ${name}, client approval has been requested for '${project}'. Please review and approve deliverables at: ${actionLink}`,
          bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #4f46e5; margin-top: 0;">Approval Requested: ${project}</h2>
            <p style="color: #475569;">Hello ${name},</p>
            <p style="color: #475569;">The deliverables for project <strong>${project}</strong> have been submitted for digital seal sign-off.</p>
            <div style="margin: 24px 0;">
              <a href="${actionLink}" style="background-color: #4f46e5; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600;">Review & Approve Deliverables</a>
            </div>
            <p style="color: #94a3b8; font-size: 12px;">SpecForge Client Portal</p>
          </div>`
        };

      case "APPROVAL_RECEIVED":
        return {
          templateId,
          category: "APPROVALS",
          isEssential: false,
          subject: `Approved! Client Signed Off on ${project}`,
          title: `Deliverables Approved`,
          bodyText: `Great news ${name}! Client '${vars.clientName || "Client"}' has approved the deliverables for '${project}'. Kick off delivery: ${actionLink}`,
          bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; padding: 24px; border: 1px solid #10b981; border-radius: 12px; background-color: #f0fdf4;">
            <h2 style="color: #065f46; margin-top: 0;">🎉 Scope Deliverables Approved!</h2>
            <p style="color: #1e293b;">Hello ${name},</p>
            <p style="color: #1e293b;">Client <strong>${vars.clientName || "Client"}</strong> has officially signed and approved deliverables for <strong>${project}</strong>.</p>
            <div style="margin: 24px 0;">
              <a href="${actionLink}" style="background-color: #059669; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600;">Export Tasks & Kick Off Delivery</a>
            </div>
            <p style="color: #64748b; font-size: 12px;">SpecForge Digital Seals</p>
          </div>`
        };

      case "CHANGE_REQUESTED":
        return {
          templateId,
          category: "CHANGE_REQUESTS",
          isEssential: false,
          subject: `Change Request Submitted: ${project}`,
          title: `New Change Request`,
          bodyText: `Hello ${name}, a change request has been submitted for '${project}'. Details: ${vars.customMessage || "Scope alteration requested."}. Review: ${actionLink}`,
          bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #d97706; margin-top: 0;">Change Request Submitted: ${project}</h2>
            <p style="color: #475569;">Hello ${name},</p>
            <p style="color: #475569;">A new change request has been logged for <strong>${project}</strong>.</p>
            <p style="background-color: #fef3c7; padding: 12px; border-radius: 8px; color: #92400e; font-size: 13px;">${vars.customMessage || "Scope variation requiring cost & schedule review."}</p>
            <div style="margin: 24px 0;">
              <a href="${actionLink}" style="background-color: #d97706; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600;">Inspect Change Impact</a>
            </div>
          </div>`
        };

      case "CHANGE_APPROVED_REJECTED": {
        const isApproved = vars.changeStatus !== "REJECTED";
        return {
          templateId,
          category: "CHANGE_REQUESTS",
          isEssential: false,
          subject: `Change Request ${isApproved ? "Approved" : "Rejected"}: ${project}`,
          title: `Change Request ${isApproved ? "Approved" : "Rejected"}`,
          bodyText: `Hello ${name}, the change request for '${project}' has been ${isApproved ? "approved and merged into scope" : "rejected"}. View details: ${actionLink}`,
          bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: ${isApproved ? "#059669" : "#dc2626"}; margin-top: 0;">Change Request ${isApproved ? "Approved" : "Rejected"}</h2>
            <p style="color: #475569;">Hello ${name},</p>
            <p style="color: #475569;">The change request for <strong>${project}</strong> has been updated to: <strong>${isApproved ? "APPROVED" : "REJECTED"}</strong>.</p>
            <div style="margin: 24px 0;">
              <a href="${actionLink}" style="background-color: #4f46e5; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Updated Scope</a>
            </div>
          </div>`
        };
      }

      case "PROPOSAL_SENT":
        return {
          templateId,
          category: "APPROVALS",
          isEssential: false,
          subject: `Proposal Dispatched: ${project}`,
          title: `Proposal Sent to Client`,
          bodyText: `Hello ${name}, the commercial proposal for '${project}' has been successfully transmitted to ${vars.clientName || "the client"}. Track status: ${actionLink}`,
          bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #4f46e5; margin-top: 0;">Proposal Dispatched: ${project}</h2>
            <p style="color: #475569;">Hello ${name}, the estimate and proposal for <strong>${project}</strong> have been sent to <strong>${vars.clientName || "the client"}</strong>.</p>
            <div style="margin: 24px 0;">
              <a href="${actionLink}" style="background-color: #4f46e5; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600;">Track Proposal Portal</a>
            </div>
          </div>`
        };

      case "PROPOSAL_APPROVED_REJECTED": {
        const isApproved = vars.proposalStatus !== "REJECTED";
        return {
          templateId,
          category: "APPROVALS",
          isEssential: false,
          subject: `Proposal ${isApproved ? "Approved" : "Declined"}: ${project}`,
          title: `Proposal ${isApproved ? "Approved" : "Declined"}`,
          bodyText: `Hello ${name}, the commercial proposal for '${project}' was ${isApproved ? "digitally accepted" : "declined"}. View proposal: ${actionLink}`,
          bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: ${isApproved ? "#059669" : "#dc2626"}; margin-top: 0;">Proposal ${isApproved ? "Approved" : "Declined"}</h2>
            <p style="color: #475569;">Hello ${name}, client <strong>${vars.clientName || "Client"}</strong> has marked the proposal for <strong>${project}</strong> as <strong>${isApproved ? "APPROVED" : "DECLINED"}</strong>.</p>
            <div style="margin: 24px 0;">
              <a href="${actionLink}" style="background-color: #4f46e5; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600;">Open Proposal</a>
            </div>
          </div>`
        };
      }

      case "MILESTONE_DUE":
        return {
          templateId,
          category: "PAYMENTS",
          isEssential: false,
          subject: `Reminder: Milestone Due Soon on ${project}`,
          title: `Milestone Due Reminder`,
          bodyText: `Hello ${name}, milestone payment on '${project}' is due on ${vars.dueDate || "upcoming date"}. Amount: ${vars.amount || "$0.00"}. Review: ${actionLink}`,
          bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0284c7; margin-top: 0;">Milestone Due Reminder: ${project}</h2>
            <p style="color: #475569;">Hello ${name},</p>
            <p style="color: #475569;">A delivery milestone on <strong>${project}</strong> is scheduled for completion on <strong>${vars.dueDate || "the scheduled date"}</strong>.</p>
            <p style="font-size: 16px; font-weight: bold; color: #0f172a;">Milestone Amount: ${vars.amount || "$0.00"}</p>
            <div style="margin: 24px 0;">
              <a href="${actionLink}" style="background-color: #0284c7; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Milestone Details</a>
            </div>
          </div>`
        };

      case "PAYMENT_OVERDUE":
        return {
          templateId,
          category: "PAYMENTS",
          isEssential: true, // Essential billing notice
          subject: `URGENT: Invoice Overdue for ${project}`,
          title: `Invoice Payment Overdue`,
          bodyText: `Attention ${name}: An invoice of ${vars.amount || "$0.00"} for '${project}' is overdue. Please settle payment immediately: ${actionLink}`,
          bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; padding: 24px; border: 1px solid #ef4444; border-radius: 12px; background-color: #fef2f2;">
            <h2 style="color: #991b1b; margin-top: 0;">⚠️ Invoice Payment Overdue</h2>
            <p style="color: #1e293b;">Hello ${name},</p>
            <p style="color: #1e293b;">An outstanding invoice payment for project <strong>${project}</strong> has exceeded its payment window.</p>
            <p style="font-size: 18px; font-weight: bold; color: #b91c1c;">Outstanding Amount: ${vars.amount || "$0.00"}</p>
            <div style="margin: 24px 0;">
              <a href="${actionLink}" style="background-color: #dc2626; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600;">Settle Invoice Now</a>
            </div>
            <p style="color: #7f1d1d; font-size: 12px;">7-day grace period applies before premium services are restricted.</p>
          </div>`
        };

      case "EXPORT_READY":
        return {
          templateId,
          category: "SYSTEM",
          isEssential: false,
          subject: `Download Ready: Export for ${project}`,
          title: `Task Export Completed`,
          bodyText: `Hello ${name}, your export for '${project}' has been generated and is ready for download: ${actionLink}`,
          bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #059669; margin-top: 0;">Export Ready for Download</h2>
            <p style="color: #475569;">Hello ${name}, your tasks and deliverables export for <strong>${project}</strong> has been generated.</p>
            <div style="margin: 24px 0;">
              <a href="${actionLink}" style="background-color: #059669; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600;">Download Export File</a>
            </div>
          </div>`
        };

      case "INTEGRATION_FAILURE":
        return {
          templateId,
          category: "SYSTEM",
          isEssential: true, // Operational alert
          subject: `Alert: Integration Sync Failure with ${vars.providerName || "External Provider"}`,
          title: `Integration Sync Error`,
          bodyText: `Hello ${name}, two-way task sync failed for provider '${vars.providerName || "Integration"}'. Error: ${vars.errorMessage || "Network timeout"}. Reconnect: ${actionLink}`,
          bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; padding: 24px; border: 1px solid #f97316; border-radius: 12px; background-color: #fff7ed;">
            <h2 style="color: #c2410c; margin-top: 0;">⚠️ Integration Sync Failure</h2>
            <p style="color: #1e293b;">Hello ${name}, an error occurred while synchronizing tasks with <strong>${vars.providerName || "External Service"}</strong>.</p>
            <p style="background-color: #fed7aa; padding: 10px; border-radius: 6px; color: #7c2d12; font-family: monospace; font-size: 12px;">${vars.errorMessage || "OAuth token refresh required or rate limit reached."}</p>
            <div style="margin: 24px 0;">
              <a href="${actionLink}" style="background-color: #ea580c; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600;">Manage Integration Settings</a>
            </div>
          </div>`
        };

      case "WEEKLY_DIGEST":
        return {
          templateId,
          category: "WEEKLY_DIGEST",
          isEssential: false,
          subject: `SpecForge Weekly Digest: ${project}`,
          title: `Weekly Activity Summary`,
          bodyText: `Hello ${name}, here is your weekly summary: ${vars.summaryStats?.activeProjects || 0} active projects, ${vars.summaryStats?.pendingApprovals || 0} pending approvals. View dashboard: ${actionLink}`,
          bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0f172a; margin-top: 0;">Weekly Discovery & Delivery Digest</h2>
            <p style="color: #475569;">Hello ${name}, here is an overview of workspace progress for the past week:</p>
            <ul style="color: #334155;">
              <li><strong>Active Projects:</strong> ${vars.summaryStats?.activeProjects ?? 3}</li>
              <li><strong>Pending Client Approvals:</strong> ${vars.summaryStats?.pendingApprovals ?? 1}</li>
              <li><strong>Tasks Completed:</strong> ${vars.summaryStats?.completedTasks ?? 14}</li>
            </ul>
            <div style="margin: 24px 0;">
              <a href="${actionLink}" style="background-color: #4f46e5; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600;">Open Workspace Dashboard</a>
            </div>
          </div>`
        };

      case "MARKETING_UPDATE":
      default:
        return {
          templateId: "MARKETING_UPDATE",
          category: "MARKETING",
          isEssential: false,
          subject: `What's New in SpecForge`,
          title: `Product Update`,
          bodyText: `Hello ${name}, check out our latest agency discovery and AI estimation features. Learn more: ${actionLink}`,
          bodyHtml: `<div style="font-family: sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #4f46e5; margin-top: 0;">What's New in SpecForge</h2>
            <p style="color: #475569;">Hello ${name},</p>
            <p style="color: #475569;">${vars.customMessage || "Discover modern AI-assisted requirements and client sign-off tools."}</p>
            <div style="margin: 24px 0;">
              <a href="${actionLink}" style="background-color: #4f46e5; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600;">Explore New Capabilities</a>
            </div>
          </div>`
        };
    }
  }
}

