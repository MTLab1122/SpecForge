import { z } from "zod";

export const ClientApprovalTypeEnum = z.enum(["FULL_SCOPE", "SECTIONAL"]);

export const SectionApprovalStatusEnum = z.enum(["PENDING", "APPROVED", "CHANGES_REQUESTED"]);

export const DelegationStatusEnum = z.enum(["ACTIVE", "ACCEPTED", "EXPIRED", "REVOKED"]);

export const ClientUpdateTypeEnum = z.enum([
  "WEEKLY_DIGEST",
  "MILESTONE_COMPLETED",
  "DELIVERABLE_READY",
  "CHANGE_REQUEST"
]);

export const RevisionCategoryEnum = z.enum([
  "SCOPE_ADJUSTMENT",
  "TIMELINE_CONCERN",
  "BUDGET_REDUCTION",
  "TECHNICAL_CLARIFICATION",
  "GENERAL"
]);

export const ClientFullApprovalSchema = z.object({
  clientName: z.string().min(2, "Signatory full name is required"),
  clientEmail: z.string().email("Valid client email address is required"),
  signerTitle: z.string().optional(),
  signerCompany: z.string().optional(),
  consentConfirmed: z.boolean().refine((val) => val === true, {
    message: "You must confirm authorization to approve this scope specification"
  }),
  comments: z.string().optional()
});

export const SectionApprovalItemSchema = z.object({
  sectionKey: z.string().min(1, "Section key is required"),
  status: z.enum(["APPROVED", "CHANGES_REQUESTED"]),
  notes: z.string().optional()
});

export const ClientSectionalApprovalSchema = z.object({
  clientName: z.string().min(2, "Signatory full name is required"),
  clientEmail: z.string().email("Valid client email address is required"),
  signerTitle: z.string().optional(),
  signerCompany: z.string().optional(),
  sections: z.array(SectionApprovalItemSchema).min(1, "At least one section must be reviewed"),
  consentConfirmed: z.boolean().refine((val) => val === true, {
    message: "You must confirm authorization to submit section approvals"
  })
});

export const RequestRevisionSchema = z.object({
  clientName: z.string().min(2, "Client name is required"),
  clientEmail: z.string().email("Valid client email is required"),
  feedbackCategory: RevisionCategoryEnum.default("GENERAL"),
  revisionNotes: z.string().min(5, "Please provide actionable revision notes (minimum 5 characters)"),
  sectionsToRevise: z.array(z.string()).optional()
});

export const DelegateApprovalSchema = z.object({
  delegatedByName: z.string().min(2, "Your name is required"),
  delegatedByEmail: z.string().email("Your email is required"),
  recipientName: z.string().min(2, "Stakeholder recipient name is required"),
  recipientEmail: z.string().email("Stakeholder recipient email is required"),
  recipientRole: z.string().min(2, "Stakeholder role or title is required (e.g. Legal, Finance, CTO)"),
  notes: z.string().optional()
});

export const CommentAttachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
  sizeBytes: z.number().optional(),
  mimeType: z.string().optional()
});

export const ClientCommentCreateSchema = z.object({
  authorName: z.string().min(2, "Author name is required"),
  authorEmail: z.string().email("Author email is required"),
  sectionKey: z.string().min(1, "Target section is required"),
  targetItemTitle: z.string().optional(),
  content: z.string().min(1, "Comment content cannot be empty"),
  parentId: z.string().optional(),
  attachments: z.array(CommentAttachmentSchema).optional()
});

export const CompletedMilestoneSchema = z.object({
  title: z.string().min(1),
  completedDate: z.string(),
  notes: z.string().optional()
});

export const UpcomingDeliverableSchema = z.object({
  title: z.string().min(1),
  targetDate: z.string(),
  owner: z.string().optional()
});

export const ClientProgressUpdateCreateSchema = z.object({
  updateType: ClientUpdateTypeEnum.default("WEEKLY_DIGEST"),
  title: z.string().min(3, "Update title is required"),
  summaryMarkdown: z.string().min(10, "Summary markdown must be at least 10 characters"),
  milestonesCompleted: z.array(CompletedMilestoneSchema).default([]),
  upcomingDeliverables: z.array(UpcomingDeliverableSchema).default([]),
  blockersNotes: z.string().optional(),
  scheduleHealth: z.enum(["ON_TRACK", "NEEDS_ATTENTION", "AT_RISK"]).default("ON_TRACK")
});

export type ClientApprovalType = z.infer<typeof ClientApprovalTypeEnum>;
export type SectionApprovalStatus = z.infer<typeof SectionApprovalStatusEnum>;
export type DelegationStatus = z.infer<typeof DelegationStatusEnum>;
export type ClientUpdateType = z.infer<typeof ClientUpdateTypeEnum>;
export type RevisionCategory = z.infer<typeof RevisionCategoryEnum>;
export type ClientFullApprovalInput = z.infer<typeof ClientFullApprovalSchema>;
export type ClientSectionalApprovalInput = z.infer<typeof ClientSectionalApprovalSchema>;
export type RequestRevisionInput = z.infer<typeof RequestRevisionSchema>;
export type DelegateApprovalInput = z.infer<typeof DelegateApprovalSchema>;
export type ClientCommentCreateInput = z.infer<typeof ClientCommentCreateSchema>;
export type ClientProgressUpdateCreateInput = z.infer<typeof ClientProgressUpdateCreateSchema>;
