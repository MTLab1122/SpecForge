import crypto from "node:crypto";
import { StorageService, type PresignedUrlResult } from "./storage-service.ts";
import { DataConstraintValidator, ValidationError } from "../transactions/constraints.ts";
import { AppError, TenantIsolationError } from "../reliability/error-envelope.ts";
import { AuthorizationService } from "../permissions/authorization-service.ts";
import { Logger, AuditLogger } from "../reliability/observability.ts";

export type FileLifecycleState =
  | "PENDING_UPLOAD"
  | "UPLOADING"
  | "SCANNING"
  | "AVAILABLE"
  | "FAILED"
  | "MALWARE_DETECTED"
  | "EXPIRED"
  | "DELETED";

export interface FileRecord {
  id: string;
  organizationId: string;
  userId: string;
  fileKey: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  sha256: string | null;
  status: FileLifecycleState;
  threatDetails?: string | null;
  retentionDays: number;
  expiresAt: Date;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  downloadCount: number;
  lastDownloadedAt?: Date | null;
  contentBuffer?: Buffer | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InitiateUploadParams {
  organizationId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  retentionDays?: number;
  expiresInSeconds?: number;
}

export interface CompleteUploadParams {
  fileId: string;
  requestingOrganizationId: string;
  requestingUserId: string;
  buffer: Buffer | Uint8Array;
}

export interface GenerateDownloadUrlParams {
  fileId: string;
  requestingOrganizationId: string;
  requestingUserId: string;
  requestingRole: string;
  expiresInSeconds?: number;
}

export interface DeleteFileParams {
  fileId: string;
  requestingOrganizationId: string;
  requestingUserId: string;
  requestingRole: string;
  reason?: string;
}

export class FileLifecycleManager {
  private static files: Map<string, FileRecord> = new Map();

  /**
   * 1. INITIATE UPLOAD: Validates constraints, registers metadata in PENDING_UPLOAD,
   * and generates an HMAC-SHA256 presigned upload URL.
   */
  public static async initiateUpload(params: InitiateUploadParams): Promise<{
    file: FileRecord;
    presignedUpload: PresignedUrlResult;
  }> {
    if (!params.organizationId || !params.userId) {
      throw new TenantIsolationError("Initiate upload requires authenticated organizationId and userId context.");
    }

    // A. Validate file metadata constraints (MIME type and max 25MB size)
    DataConstraintValidator.validateFile({
      mimeType: params.mimeType,
      sizeBytes: params.fileSizeBytes,
      name: params.fileName
    });

    const fileId = `file_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const sanitizedName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileKey = `${params.organizationId}/uploads/${fileId}_${sanitizedName}`;

    const retentionDays = params.retentionDays || 365; // Default 1 year for client documents
    const expiresAt = new Date(Date.now() + retentionDays * 24 * 3600 * 1000);
    const now = new Date();

    const fileRecord: FileRecord = {
      id: fileId,
      organizationId: params.organizationId,
      userId: params.userId,
      fileKey,
      fileName: params.fileName,
      fileSizeBytes: params.fileSizeBytes,
      mimeType: params.mimeType,
      sha256: null,
      status: "PENDING_UPLOAD",
      threatDetails: null,
      retentionDays,
      expiresAt,
      downloadCount: 0,
      contentBuffer: null,
      createdAt: now,
      updatedAt: now
    };

    this.files.set(fileId, fileRecord);

    // Generate presigned upload URL (valid for 15 minutes by default)
    const presignedUpload = StorageService.generatePresignedUrl({
      organizationId: params.organizationId,
      userId: params.userId,
      fileKey,
      action: "UPLOAD",
      mimeType: params.mimeType,
      maxSizeBytes: params.fileSizeBytes,
      expiresInSeconds: params.expiresInSeconds || 900
    });

    await AuditLogger.record({
      organizationId: params.organizationId,
      userId: params.userId,
      action: "FILE_UPLOAD_INITIATED",
      entityName: "FILE",
      entityId: fileId,
      metadata: {
        fileName: params.fileName,
        mimeType: params.mimeType,
        sizeBytes: params.fileSizeBytes,
        retentionDays
      }
    });

    return { file: fileRecord, presignedUpload };
  }

  /**
   * 2. COMPLETE UPLOAD: Verifies tenant boundary, executes malware scanning & magic-byte
   * checks, computes SHA-256 checksum, and transitions state to AVAILABLE.
   */
  public static async completeUpload(params: CompleteUploadParams): Promise<FileRecord> {
    const file = this.files.get(params.fileId);
    if (!file) {
      throw new AppError({
        message: `File '${params.fileId}' not found.`,
        status: 404,
        code: "FILE_NOT_FOUND"
      });
    }

    // Row-level tenant boundary check
    if (file.organizationId !== params.requestingOrganizationId) {
      throw new TenantIsolationError(
        `Cross-tenant upload completion denied. File belongs to '${file.organizationId}', not '${params.requestingOrganizationId}'.`
      );
    }

    if (file.status !== "PENDING_UPLOAD" && file.status !== "UPLOADING") {
      throw new AppError({
        message: `Cannot complete upload for file in status '${file.status}'.`,
        status: 400,
        code: "INVALID_FILE_STATE_FOR_COMPLETION"
      });
    }

    file.status = "SCANNING";
    file.updatedAt = new Date();

    const rawBuffer = Buffer.isBuffer(params.buffer) ? params.buffer : Buffer.from(params.buffer);

    // Run Malware & Magic Byte Safety Scan
    const scanResult = StorageService.scanFileSafety({
      name: file.fileName,
      mimeType: file.mimeType,
      sizeBytes: rawBuffer.length,
      buffer: rawBuffer
    });

    if (!scanResult.isSafe) {
      file.status = "MALWARE_DETECTED";
      file.threatDetails = scanResult.detectedThreat || "Threat_Detected";
      file.sha256 = scanResult.sha256;
      file.updatedAt = new Date();

      await AuditLogger.record({
        organizationId: file.organizationId,
        userId: params.requestingUserId,
        action: "FILE_MALWARE_DETECTED",
        entityName: "FILE",
        entityId: file.id,
        metadata: {
          threat: file.threatDetails,
          sha256: file.sha256
        }
      });

      throw new AppError({
        message: `Security Scan Failed: Malicious file detected (${file.threatDetails}). File has been quarantined.`,
        status: 422,
        code: "FILE_MALWARE_DETECTED"
      });
    }

    // File passed safety checks -> AVAILABLE
    file.status = "AVAILABLE";
    file.sha256 = scanResult.sha256;
    file.fileSizeBytes = rawBuffer.length;
    file.contentBuffer = rawBuffer;
    file.updatedAt = new Date();

    await AuditLogger.record({
      organizationId: file.organizationId,
      userId: params.requestingUserId,
      action: "FILE_UPLOAD_COMPLETED",
      entityName: "FILE",
      entityId: file.id,
      metadata: {
        fileName: file.fileName,
        sizeBytes: file.fileSizeBytes,
        sha256: file.sha256
      }
    });

    Logger.info(`File '${file.id}' (${file.fileName}) uploaded and verified clean. SHA256: ${file.sha256}`, {
      organizationId: file.organizationId,
      userId: params.requestingUserId
    });

    return file;
  }

  /**
   * 3. RETRY FAILED UPLOAD: Re-issues presigned upload URL for a failed or timed out upload.
   */
  public static async retryUpload(params: {
    fileId: string;
    requestingOrganizationId: string;
    requestingUserId: string;
  }): Promise<{ file: FileRecord; presignedUpload: PresignedUrlResult }> {
    const file = this.files.get(params.fileId);
    if (!file) {
      throw new AppError({
        message: `File '${params.fileId}' not found.`,
        status: 404,
        code: "FILE_NOT_FOUND"
      });
    }

    if (file.organizationId !== params.requestingOrganizationId) {
      throw new TenantIsolationError("Cross-tenant file upload retry forbidden.");
    }

    if (file.status !== "FAILED" && file.status !== "PENDING_UPLOAD") {
      throw new AppError({
        message: `Only FAILED or PENDING_UPLOAD files can be retried (current: '${file.status}').`,
        status: 400,
        code: "INVALID_FILE_STATE_FOR_RETRY"
      });
    }

    file.status = "PENDING_UPLOAD";
    file.threatDetails = null;
    file.updatedAt = new Date();

    const presignedUpload = StorageService.generatePresignedUrl({
      organizationId: file.organizationId,
      userId: params.requestingUserId,
      fileKey: file.fileKey,
      action: "UPLOAD",
      mimeType: file.mimeType,
      maxSizeBytes: file.fileSizeBytes,
      expiresInSeconds: 900
    });

    await AuditLogger.record({
      organizationId: file.organizationId,
      userId: params.requestingUserId,
      action: "FILE_UPLOAD_RETRY_INITIATED",
      entityName: "FILE",
      entityId: file.id
    });

    return { file, presignedUpload };
  }

  /**
   * 4. GENERATE SHORT-LIVED DOWNLOAD URL: Validates authorization, tenant boundary,
   * file state, generates signed URL with expiry, and logs download audit trail.
   */
  public static async generateDownloadUrl(params: GenerateDownloadUrlParams): Promise<{
    downloadUrl: string;
    expiresAt: string;
    file: FileRecord;
  }> {
    const file = this.files.get(params.fileId);
    if (!file) {
      throw new AppError({
        message: `File '${params.fileId}' not found.`,
        status: 404,
        code: "FILE_NOT_FOUND"
      });
    }

    // Row-level Tenant Isolation
    if (file.organizationId !== params.requestingOrganizationId) {
      throw new TenantIsolationError(
        `Cross-Tenant Access Denied: File '${params.fileId}' belongs to workspace '${file.organizationId}', caller is '${params.requestingOrganizationId}'.`
      );
    }

    // File state validation
    if (file.status === "MALWARE_DETECTED") {
      throw new AppError({
        message: "File access forbidden: Malicious threat was detected in this file.",
        status: 403,
        code: "FILE_QUARANTINED"
      });
    }

    if (file.status === "DELETED") {
      throw new AppError({
        message: "File has been deleted and cannot be downloaded.",
        status: 410,
        code: "FILE_DELETED"
      });
    }

    if (file.status === "EXPIRED") {
      throw new AppError({
        message: "File retention policy has expired.",
        status: 410,
        code: "FILE_EXPIRED"
      });
    }

    if (file.status !== "AVAILABLE") {
      throw new AppError({
        message: `File is not ready for download (current status: '${file.status}').`,
        status: 400,
        code: "FILE_NOT_AVAILABLE"
      });
    }

    // Role-based Authorization check
    const authResult = AuthorizationService.authorize({
      context: {
        userId: params.requestingUserId,
        organizationId: params.requestingOrganizationId,
        role: params.requestingRole as any
      },
      action: "EXPORT_DATA"
    });

    if (!authResult.allowed) {
      throw new AppError({
        message: `Unauthorized to download file: ${authResult.reason || "Access denied"}`,
        status: authResult.statusCode,
        code: authResult.errorCode
      });
    }

    const ttlSec = params.expiresInSeconds || 900; // 15 mins
    const presigned = StorageService.generatePresignedUrl({
      organizationId: file.organizationId,
      userId: params.requestingUserId,
      fileKey: file.fileKey,
      action: "DOWNLOAD",
      expiresInSeconds: ttlSec
    });

    file.downloadCount += 1;
    file.lastDownloadedAt = new Date();
    file.updatedAt = new Date();

    await AuditLogger.record({
      organizationId: file.organizationId,
      userId: params.requestingUserId,
      action: "FILE_DOWNLOADED",
      entityName: "FILE",
      entityId: file.id,
      metadata: {
        fileName: file.fileName,
        downloadCount: file.downloadCount,
        expiresAt: presigned.expiresAt
      }
    });

    return {
      downloadUrl: presigned.url,
      expiresAt: presigned.expiresAt,
      file
    };
  }

  /**
   * 5. USER-INITIATED DELETION: Allows uploader or workspace admin to soft-delete file,
   * invalidating future downloads and logging audit event.
   */
  public static async deleteFile(params: DeleteFileParams): Promise<FileRecord> {
    const file = this.files.get(params.fileId);
    if (!file) {
      throw new AppError({
        message: `File '${params.fileId}' not found.`,
        status: 404,
        code: "FILE_NOT_FOUND"
      });
    }

    if (file.organizationId !== params.requestingOrganizationId) {
      throw new TenantIsolationError("Cross-tenant file deletion forbidden.");
    }

    // Only file uploader or ADMIN / OWNER can delete
    const isOwner = file.userId === params.requestingUserId;
    const isAdmin = params.requestingRole === "OWNER" || params.requestingRole === "ADMIN";

    if (!isOwner && !isAdmin) {
      throw new AppError({
        message: "Insufficient permissions to delete this file. Only the uploader or workspace admins may delete files.",
        status: 403,
        code: "INSUFFICIENT_PERMISSIONS_FOR_DELETION"
      });
    }

    if (file.status === "DELETED") {
      return file;
    }

    const now = new Date();
    file.status = "DELETED";
    file.deletedAt = now;
    file.deletedBy = params.requestingUserId;
    file.contentBuffer = null; // purge raw data from memory
    file.updatedAt = now;

    await AuditLogger.record({
      organizationId: file.organizationId,
      userId: params.requestingUserId,
      action: "FILE_DELETED",
      entityName: "FILE",
      entityId: file.id,
      metadata: {
        fileName: file.fileName,
        reason: params.reason || "User initiated deletion",
        deletedBy: params.requestingUserId
      }
    });

    Logger.info(`File '${file.id}' (${file.fileName}) deleted by '${params.requestingUserId}'`, {
      organizationId: file.organizationId
    });

    return file;
  }

  /**
   * 6. RETENTION POLICY ENFORCEMENT: Enforces retention policy, purging expired files
   * while preserving immutable audit logs.
   */
  public static enforceRetentionPolicy(now: Date = new Date()): { expiredCount: number } {
    let expiredCount = 0;

    for (const file of this.files.values()) {
      if (file.status === "AVAILABLE" && file.expiresAt <= now) {
        file.status = "EXPIRED";
        file.contentBuffer = null;
        file.updatedAt = now;
        expiredCount++;

        AuditLogger.record({
          organizationId: file.organizationId,
          action: "FILE_RETENTION_EXPIRED",
          entityName: "FILE",
          entityId: file.id,
          metadata: {
            fileName: file.fileName,
            retentionDays: file.retentionDays,
            expiredAt: now.toISOString()
          }
        });
      }
    }

    return { expiredCount };
  }

  /**
   * 7. GET FILE METADATA: Retrieves file record with strict tenant isolation.
   */
  public static getFile(fileId: string, organizationId: string): FileRecord | null {
    const file = this.files.get(fileId);
    if (!file) return null;

    if (file.organizationId !== organizationId) {
      throw new TenantIsolationError("Cross-tenant file access forbidden.");
    }

    return file;
  }

  /**
   * 8. LIST FILES: Returns all files for an organization with optional filtering.
   */
  public static listFiles(
    organizationId: string,
    filter?: { status?: FileLifecycleState; mimeType?: string }
  ): FileRecord[] {
    return Array.from(this.files.values())
      .filter((f) => {
        if (f.organizationId !== organizationId) return false;
        if (filter?.status && f.status !== filter.status) return false;
        if (filter?.mimeType && f.mimeType !== filter.mimeType) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Clears in-memory storage (for tests).
   */
  public static clear(): void {
    this.files.clear();
  }
}
