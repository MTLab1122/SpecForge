export type OrgRole =
  | "OWNER"
  | "ADMIN"
  | "MANAGER"
  | "EDITOR"
  | "REVIEWER"
  | "VIEWER"
  | "CLIENT";

export type PermissionAction =
  | "CREATE_WORKSPACE"
  | "INVITE_USER"
  | "REMOVE_USER"
  | "CHANGE_ROLE"
  | "TRANSFER_OWNERSHIP"
  | "CREATE_CLIENT"
  | "EDIT_CLIENT"
  | "ARCHIVE_CLIENT"
  | "CREATE_PROJECT"
  | "EDIT_PROJECT"
  | "DELETE_PROJECT"
  | "UPLOAD_DOCUMENT"
  | "GENERATE_AI_OUTPUT"
  | "REVIEW_AI_OUTPUT"
  | "APPROVE_AI_OUTPUT"
  | "CREATE_SCOPE"
  | "EDIT_SCOPE"
  | "APPROVE_SCOPE"
  | "CREATE_ESTIMATE"
  | "APPROVE_ESTIMATE"
  | "CREATE_PROPOSAL"
  | "SEND_PROPOSAL"
  | "APPROVE_PROPOSAL"
  | "CREATE_TASK"
  | "ASSIGN_TASK"
  | "CHANGE_TASK_STATUS"
  | "CREATE_CHANGE_REQUEST"
  | "APPROVE_CHANGE_REQUEST"
  | "VIEW_FINANCIAL_DATA"
  | "CREATE_PAYMENT_MILESTONE"
  | "UPDATE_PAYMENT_STATUS"
  | "EXPORT_DATA"
  | "MANAGE_INTEGRATIONS"
  | "MANAGE_BILLING"
  | "VIEW_AUDIT_LOG";

/**
 * Deny-by-default Complete Permission Matrix for all 7 Roles across 35 Granular Operations
 */
export const PERMISSION_MATRIX: Record<OrgRole, Record<PermissionAction, boolean>> = {
  OWNER: {
    CREATE_WORKSPACE: true,
    INVITE_USER: true,
    REMOVE_USER: true,
    CHANGE_ROLE: true,
    TRANSFER_OWNERSHIP: true, // Exclusive to OWNER
    CREATE_CLIENT: true,
    EDIT_CLIENT: true,
    ARCHIVE_CLIENT: true,
    CREATE_PROJECT: true,
    EDIT_PROJECT: true,
    DELETE_PROJECT: true,
    UPLOAD_DOCUMENT: true,
    GENERATE_AI_OUTPUT: true,
    REVIEW_AI_OUTPUT: true,
    APPROVE_AI_OUTPUT: true,
    CREATE_SCOPE: true,
    EDIT_SCOPE: true,
    APPROVE_SCOPE: true,
    CREATE_ESTIMATE: true,
    APPROVE_ESTIMATE: true,
    CREATE_PROPOSAL: true,
    SEND_PROPOSAL: true,
    APPROVE_PROPOSAL: true,
    CREATE_TASK: true,
    ASSIGN_TASK: true,
    CHANGE_TASK_STATUS: true,
    CREATE_CHANGE_REQUEST: true,
    APPROVE_CHANGE_REQUEST: true,
    VIEW_FINANCIAL_DATA: true,
    CREATE_PAYMENT_MILESTONE: true,
    UPDATE_PAYMENT_STATUS: true,
    EXPORT_DATA: true,
    MANAGE_INTEGRATIONS: true,
    MANAGE_BILLING: true,
    VIEW_AUDIT_LOG: true
  },
  ADMIN: {
    CREATE_WORKSPACE: false,
    INVITE_USER: true,
    REMOVE_USER: true,
    CHANGE_ROLE: true,
    TRANSFER_OWNERSHIP: false, // Cannot transfer owner
    CREATE_CLIENT: true,
    EDIT_CLIENT: true,
    ARCHIVE_CLIENT: true,
    CREATE_PROJECT: true,
    EDIT_PROJECT: true,
    DELETE_PROJECT: true,
    UPLOAD_DOCUMENT: true,
    GENERATE_AI_OUTPUT: true,
    REVIEW_AI_OUTPUT: true,
    APPROVE_AI_OUTPUT: true,
    CREATE_SCOPE: true,
    EDIT_SCOPE: true,
    APPROVE_SCOPE: true,
    CREATE_ESTIMATE: true,
    APPROVE_ESTIMATE: true,
    CREATE_PROPOSAL: true,
    SEND_PROPOSAL: true,
    APPROVE_PROPOSAL: true,
    CREATE_TASK: true,
    ASSIGN_TASK: true,
    CHANGE_TASK_STATUS: true,
    CREATE_CHANGE_REQUEST: true,
    APPROVE_CHANGE_REQUEST: true,
    VIEW_FINANCIAL_DATA: true,
    CREATE_PAYMENT_MILESTONE: true,
    UPDATE_PAYMENT_STATUS: true,
    EXPORT_DATA: true,
    MANAGE_INTEGRATIONS: true,
    MANAGE_BILLING: false, // Owner only
    VIEW_AUDIT_LOG: true
  },
  MANAGER: {
    CREATE_WORKSPACE: false,
    INVITE_USER: true,
    REMOVE_USER: false,
    CHANGE_ROLE: false,
    TRANSFER_OWNERSHIP: false,
    CREATE_CLIENT: true,
    EDIT_CLIENT: true,
    ARCHIVE_CLIENT: false,
    CREATE_PROJECT: true,
    EDIT_PROJECT: true,
    DELETE_PROJECT: false,
    UPLOAD_DOCUMENT: true,
    GENERATE_AI_OUTPUT: true,
    REVIEW_AI_OUTPUT: true,
    APPROVE_AI_OUTPUT: true,
    CREATE_SCOPE: true,
    EDIT_SCOPE: true,
    APPROVE_SCOPE: true,
    CREATE_ESTIMATE: true,
    APPROVE_ESTIMATE: true,
    CREATE_PROPOSAL: true,
    SEND_PROPOSAL: true,
    APPROVE_PROPOSAL: false,
    CREATE_TASK: true,
    ASSIGN_TASK: true,
    CHANGE_TASK_STATUS: true,
    CREATE_CHANGE_REQUEST: true,
    APPROVE_CHANGE_REQUEST: true,
    VIEW_FINANCIAL_DATA: true,
    CREATE_PAYMENT_MILESTONE: true,
    UPDATE_PAYMENT_STATUS: true,
    EXPORT_DATA: true,
    MANAGE_INTEGRATIONS: false,
    MANAGE_BILLING: false,
    VIEW_AUDIT_LOG: false
  },
  EDITOR: {
    CREATE_WORKSPACE: false,
    INVITE_USER: false,
    REMOVE_USER: false,
    CHANGE_ROLE: false,
    TRANSFER_OWNERSHIP: false,
    CREATE_CLIENT: false,
    EDIT_CLIENT: false,
    ARCHIVE_CLIENT: false,
    CREATE_PROJECT: true,
    EDIT_PROJECT: true,
    DELETE_PROJECT: false,
    UPLOAD_DOCUMENT: true,
    GENERATE_AI_OUTPUT: true,
    REVIEW_AI_OUTPUT: true,
    APPROVE_AI_OUTPUT: false,
    CREATE_SCOPE: true,
    EDIT_SCOPE: true,
    APPROVE_SCOPE: false,
    CREATE_ESTIMATE: true,
    APPROVE_ESTIMATE: false,
    CREATE_PROPOSAL: true,
    SEND_PROPOSAL: false,
    APPROVE_PROPOSAL: false,
    CREATE_TASK: true,
    ASSIGN_TASK: true,
    CHANGE_TASK_STATUS: true,
    CREATE_CHANGE_REQUEST: true,
    APPROVE_CHANGE_REQUEST: false,
    VIEW_FINANCIAL_DATA: false, // Strict: hidden from editors
    CREATE_PAYMENT_MILESTONE: false,
    UPDATE_PAYMENT_STATUS: false,
    EXPORT_DATA: true,
    MANAGE_INTEGRATIONS: false,
    MANAGE_BILLING: false,
    VIEW_AUDIT_LOG: false
  },
  REVIEWER: {
    CREATE_WORKSPACE: false,
    INVITE_USER: false,
    REMOVE_USER: false,
    CHANGE_ROLE: false,
    TRANSFER_OWNERSHIP: false,
    CREATE_CLIENT: false,
    EDIT_CLIENT: false,
    ARCHIVE_CLIENT: false,
    CREATE_PROJECT: false,
    EDIT_PROJECT: false,
    DELETE_PROJECT: false,
    UPLOAD_DOCUMENT: true,
    GENERATE_AI_OUTPUT: false,
    REVIEW_AI_OUTPUT: true,
    APPROVE_AI_OUTPUT: true,
    CREATE_SCOPE: false,
    EDIT_SCOPE: true,
    APPROVE_SCOPE: true,
    CREATE_ESTIMATE: false,
    APPROVE_ESTIMATE: false,
    CREATE_PROPOSAL: false,
    SEND_PROPOSAL: false,
    APPROVE_PROPOSAL: false,
    CREATE_TASK: false,
    ASSIGN_TASK: false,
    CHANGE_TASK_STATUS: true,
    CREATE_CHANGE_REQUEST: true,
    APPROVE_CHANGE_REQUEST: false,
    VIEW_FINANCIAL_DATA: false,
    CREATE_PAYMENT_MILESTONE: false,
    UPDATE_PAYMENT_STATUS: false,
    EXPORT_DATA: false,
    MANAGE_INTEGRATIONS: false,
    MANAGE_BILLING: false,
    VIEW_AUDIT_LOG: false
  },
  VIEWER: {
    CREATE_WORKSPACE: false,
    INVITE_USER: false,
    REMOVE_USER: false,
    CHANGE_ROLE: false,
    TRANSFER_OWNERSHIP: false,
    CREATE_CLIENT: false,
    EDIT_CLIENT: false,
    ARCHIVE_CLIENT: false,
    CREATE_PROJECT: false,
    EDIT_PROJECT: false,
    DELETE_PROJECT: false,
    UPLOAD_DOCUMENT: false,
    GENERATE_AI_OUTPUT: false,
    REVIEW_AI_OUTPUT: false,
    APPROVE_AI_OUTPUT: false,
    CREATE_SCOPE: false,
    EDIT_SCOPE: false,
    APPROVE_SCOPE: false,
    CREATE_ESTIMATE: false,
    APPROVE_ESTIMATE: false,
    CREATE_PROPOSAL: false,
    SEND_PROPOSAL: false,
    APPROVE_PROPOSAL: false,
    CREATE_TASK: false,
    ASSIGN_TASK: false,
    CHANGE_TASK_STATUS: false,
    CREATE_CHANGE_REQUEST: false,
    APPROVE_CHANGE_REQUEST: false,
    VIEW_FINANCIAL_DATA: false,
    CREATE_PAYMENT_MILESTONE: false,
    UPDATE_PAYMENT_STATUS: false,
    EXPORT_DATA: false,
    MANAGE_INTEGRATIONS: false,
    MANAGE_BILLING: false,
    VIEW_AUDIT_LOG: false
  },
  CLIENT: {
    CREATE_WORKSPACE: false,
    INVITE_USER: false,
    REMOVE_USER: false,
    CHANGE_ROLE: false,
    TRANSFER_OWNERSHIP: false,
    CREATE_CLIENT: false,
    EDIT_CLIENT: false,
    ARCHIVE_CLIENT: false,
    CREATE_PROJECT: false,
    EDIT_PROJECT: false,
    DELETE_PROJECT: false,
    UPLOAD_DOCUMENT: false,
    GENERATE_AI_OUTPUT: false,
    REVIEW_AI_OUTPUT: false,
    APPROVE_AI_OUTPUT: false,
    CREATE_SCOPE: false,
    EDIT_SCOPE: false,
    APPROVE_SCOPE: false,
    CREATE_ESTIMATE: false,
    APPROVE_ESTIMATE: false,
    CREATE_PROPOSAL: false,
    SEND_PROPOSAL: false,
    APPROVE_PROPOSAL: true, // Client proposal approval
    CREATE_TASK: false,
    ASSIGN_TASK: false,
    CHANGE_TASK_STATUS: false,
    CREATE_CHANGE_REQUEST: false,
    APPROVE_CHANGE_REQUEST: true, // Client change request sign-off
    VIEW_FINANCIAL_DATA: false, // Commercial barrier: cannot see contractor rates or profit margins
    CREATE_PAYMENT_MILESTONE: false,
    UPDATE_PAYMENT_STATUS: false,
    EXPORT_DATA: false,
    MANAGE_INTEGRATIONS: false,
    MANAGE_BILLING: false,
    VIEW_AUDIT_LOG: false // Strictly forbidden
  }
};

/**
 * Deny-By-Default Permission Evaluator
 * Returns true ONLY if explicit permission is granted; otherwise strictly returns false.
 */
export function hasPermission(
  role: OrgRole | string | null | undefined,
  action: PermissionAction | string | null | undefined
): boolean {
  if (!role || !action) return false;
  const rolePermissions = PERMISSION_MATRIX[role as OrgRole];
  if (!rolePermissions) return false;
  return rolePermissions[action as PermissionAction] === true;
}

/**
 * Asserts permission or throws a standardized 403 Forbidden error
 */
export function assertPermission(
  role: OrgRole | string | null | undefined,
  action: PermissionAction | string | null | undefined
): void {
  if (!hasPermission(role, action)) {
    throw new Error(
      `Access Denied: Role "${role || 'UNKNOWN'}" is not permitted to perform action "${action || 'UNKNOWN'}".`
    );
  }
}
