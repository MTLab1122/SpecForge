import { z } from "zod";

// ============================================================================
// ENUMS & COMMON
// ============================================================================

export const OrgRoleEnum = z.enum([
  "OWNER",
  "ADMIN",
  "MANAGER",
  "EDITOR",
  "REVIEWER",
  "VIEWER",
  "CLIENT"
]);

export const CommentEntityTypeEnum = z.enum([
  "SCOPE_ITEM",
  "ESTIMATE",
  "PROPOSAL",
  "TASK",
  "GENERAL"
]);

export const ActivityActorTypeEnum = z.enum(["TEAM_MEMBER", "CLIENT", "SYSTEM_AI"]);

// ============================================================================
// 1. THREADED COMMENTS & MENTIONS
// ============================================================================

export const CreateCommentSchema = z.object({
  projectId: z.string().uuid(),
  entityType: CommentEntityTypeEnum.default("GENERAL"),
  entityId: z.string().optional(),
  parentId: z.string().uuid().optional(), // For threaded replies
  content: z.string().min(1, "Comment content cannot be empty"),
  mentions: z.array(z.string()).default([]), // User IDs mentioned
  attachments: z
    .array(
      z.object({
        fileName: z.string(),
        fileUrl: z.string().url(),
        fileSizeBytes: z.number().int().positive(),
        mimeType: z.string()
      })
    )
    .default([])
});

export const ResolveCommentSchema = z.object({
  commentId: z.string().uuid(),
  isResolved: z.boolean().default(true)
});

// ============================================================================
// 2. REAL-TIME PRESENCE & EDIT LOCKS
// ============================================================================

export const PresenceHeartbeatSchema = z.object({
  projectId: z.string().uuid(),
  activeSection: z.enum(["SCOPE_BUILDER", "ESTIMATE_BUILDER", "TASKS", "PROPOSAL_PREVIEW", "OVERVIEW"]),
  lockedItemId: z.string().optional(), // ID of story or estimate item actively being edited
  clientVersion: z.number().int().default(1)
});

export const AcquireLockSchema = z.object({
  projectId: z.string().uuid(),
  itemId: z.string().min(1),
  itemType: z.enum(["USER_STORY", "FEATURE", "ESTIMATE_ITEM", "ACCEPTANCE_CRITERIA"])
});

export const ReleaseLockSchema = z.object({
  projectId: z.string().uuid(),
  itemId: z.string().min(1)
});

// ============================================================================
// 3. ACTIVITY FEED FILTERING
// ============================================================================

export const FilterActivityFeedSchema = z.object({
  projectId: z.string().uuid().optional(),
  actorType: ActivityActorTypeEnum.optional(),
  activityType: z.string().optional(),
  actorId: z.string().uuid().optional(),
  searchQuery: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().int().default(1),
  pageSize: z.number().int().default(20)
});

// ============================================================================
// 4. NOTIFICATION PREFERENCES
// ============================================================================

export const UpdateNotificationPreferencesSchema = z.object({
  inAppMentions: z.boolean().optional(),
  inAppProposalApproved: z.boolean().optional(),
  inAppScopeChanged: z.boolean().optional(),
  inAppTaskAssigned: z.boolean().optional(),
  emailMentions: z.boolean().optional(),
  emailProposalApproved: z.boolean().optional(),
  emailScopeChanged: z.boolean().optional(),
  emailTaskAssigned: z.boolean().optional(),
  emailWeeklyDigest: z.boolean().optional()
});

export const MarkNotificationReadSchema = z.object({
  notificationId: z.string().uuid().optional(),
  markAllAsRead: z.boolean().default(false)
});

