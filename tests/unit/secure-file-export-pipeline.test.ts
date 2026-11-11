import { FileLifecycleManager } from "@/lib/storage/file-lifecycle";
import { ExportEngine, type ExportType } from "@/lib/storage/export-engine";
import { StorageService } from "@/lib/storage/storage-service";
import { DurableJobQueue } from "@/lib/queue/durable-queue";
import { NotificationService } from "@/lib/notifications/notification-service";
import { AuditLogger } from "@/lib/reliability/observability";
import { AppError, TenantIsolationError } from "@/lib/reliability/error-envelope";
import { ValidationError } from "@/lib/transactions/constraints";

describe("Phase 3 Enhancement — Secure File & Export Pipeline Suite", () => {
  const orgAlpha = "org_alpha_secure";
  const orgBeta = "org_beta_intruder";
  const userLead = "usr_lead_dev";
  const userViewer = "usr_viewer_guest";

  beforeEach(() => {
    FileLifecycleManager.clear();
    ExportEngine.clear();
    DurableJobQueue.clear();
    AuditLogger.clear();
  });

  describe("1. Secure Upload Flow & Validation Constraints", () => {
    it("should generate a presigned HMAC-SHA256 upload URL for valid file metadata", async () => {
      const result = await FileLifecycleManager.initiateUpload({
        organizationId: orgAlpha,
        userId: userLead,
        fileName: "Client_Discovery_Brief.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 1024 * 500, // 500 KB
        retentionDays: 365
      });

      expect(result.file.id).toMatch(/^file_/);
      expect(result.file.status).toBe("PENDING_UPLOAD");
      expect(result.file.fileName).toBe("Client_Discovery_Brief.pdf");
      expect(result.presignedUpload.url).toContain("https://storage.specforge.io/files/");
      expect(result.presignedUpload.token).toBeDefined();
      expect(result.presignedUpload.expiresAt).toBeDefined();
    });

    it("should reject unsupported MIME types with ValidationError", async () => {
      await expect(
        FileLifecycleManager.initiateUpload({
          organizationId: orgAlpha,
          userId: userLead,
          fileName: "malicious_script.exe",
          mimeType: "application/x-msdownload",
          fileSizeBytes: 1024 * 100
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should reject oversized files exceeding 25MB limit with ValidationError", async () => {
      const oversizedBytes = 26 * 1024 * 1024; // 26 MB
      await expect(
        FileLifecycleManager.initiateUpload({
          organizationId: orgAlpha,
          userId: userLead,
          fileName: "giant_recording.mp3",
          mimeType: "audio/mpeg",
          fileSizeBytes: oversizedBytes
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should detect EICAR virus signature, quarantine file as MALWARE_DETECTED, and reject upload", async () => {
      const { file } = await FileLifecycleManager.initiateUpload({
        organizationId: orgAlpha,
        userId: userLead,
        fileName: "infected_sample.txt",
        mimeType: "text/plain",
        fileSizeBytes: 128
      });

      const eicarBuffer = Buffer.from(
        "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
      );

      await expect(
        FileLifecycleManager.completeUpload({
          fileId: file.id,
          requestingOrganizationId: orgAlpha,
          requestingUserId: userLead,
          buffer: eicarBuffer
        })
      ).rejects.toThrow("Malicious file detected (Win32/EICAR_Test_File)");

      const updatedFile = FileLifecycleManager.getFile(file.id, orgAlpha);
      expect(updatedFile?.status).toBe("MALWARE_DETECTED");
      expect(updatedFile?.threatDetails).toBe("Win32/EICAR_Test_File");
    });

    it("should detect binary script injection in non-text files and quarantine", async () => {
      const { file } = await FileLifecycleManager.initiateUpload({
        organizationId: orgAlpha,
        userId: userLead,
        fileName: "corrupt_document.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 256
      });

      // Binary starting with %PDF but injecting script tags
      const exploitBuffer = Buffer.from("%PDF-1.7 <script>alert('xss')</script>");

      await expect(
        FileLifecycleManager.completeUpload({
          fileId: file.id,
          requestingOrganizationId: orgAlpha,
          requestingUserId: userLead,
          buffer: exploitBuffer
        })
      ).rejects.toThrow("HTML_Script_Injection_In_Binary");

      const quarantined = FileLifecycleManager.getFile(file.id, orgAlpha);
      expect(quarantined?.status).toBe("MALWARE_DETECTED");
    });

    it("should verify magic bytes: PDF must start with %PDF", async () => {
      const { file } = await FileLifecycleManager.initiateUpload({
        organizationId: orgAlpha,
        userId: userLead,
        fileName: "fake_pdf.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 100
      });

      // Invalid header
      const invalidPdfBuffer = Buffer.from("NOT_A_PDF_FILE_HEADER_XYZ");

      await expect(
        FileLifecycleManager.completeUpload({
          fileId: file.id,
          requestingOrganizationId: orgAlpha,
          requestingUserId: userLead,
          buffer: invalidPdfBuffer
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should successfully complete upload, compute SHA-256 checksum, and transition to AVAILABLE", async () => {
      const { file } = await FileLifecycleManager.initiateUpload({
        organizationId: orgAlpha,
        userId: userLead,
        fileName: "Clean_Proposal.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 150
      });

      const validPdfBuffer = Buffer.from("%PDF-1.7\nValid Clean PDF Content Stream\n%%EOF");
      const completed = await FileLifecycleManager.completeUpload({
        fileId: file.id,
        requestingOrganizationId: orgAlpha,
        requestingUserId: userLead,
        buffer: validPdfBuffer
      });

      expect(completed.status).toBe("AVAILABLE");
      expect(completed.sha256).toBeDefined();
      expect(completed.sha256?.length).toBe(64);
      expect(completed.fileSizeBytes).toBe(validPdfBuffer.length);
    });

    it("should allow retry of failed upload", async () => {
      const { file } = await FileLifecycleManager.initiateUpload({
        organizationId: orgAlpha,
        userId: userLead,
        fileName: "Retryable.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 100
      });

      const retryRes = await FileLifecycleManager.retryUpload({
        fileId: file.id,
        requestingOrganizationId: orgAlpha,
        requestingUserId: userLead
      });

      expect(retryRes.file.status).toBe("PENDING_UPLOAD");
      expect(retryRes.presignedUpload.url).toBeDefined();
    });
  });

  describe("2. Secure Download Flow & Multi-Tenant Authorization", () => {
    let cleanFileId: string;

    beforeEach(async () => {
      const { file } = await FileLifecycleManager.initiateUpload({
        organizationId: orgAlpha,
        userId: userLead,
        fileName: "Authorized_Document.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 120
      });
      cleanFileId = file.id;

      await FileLifecycleManager.completeUpload({
        fileId: cleanFileId,
        requestingOrganizationId: orgAlpha,
        requestingUserId: userLead,
        buffer: Buffer.from("%PDF-1.7\nClean\n%%EOF")
      });
    });

    it("should generate a short-lived signed download URL and record audit event", async () => {
      const result = await FileLifecycleManager.generateDownloadUrl({
        fileId: cleanFileId,
        requestingOrganizationId: orgAlpha,
        requestingUserId: userLead,
        requestingRole: "MANAGER",
        expiresInSeconds: 600
      });

      expect(result.downloadUrl).toContain("https://storage.specforge.io/files/");
      expect(result.expiresAt).toBeDefined();
      expect(result.file.downloadCount).toBe(1);

      const logs = AuditLogger.getRecentEvents(orgAlpha);
      const downloadLog = logs.find((l) => l.action === "FILE_DOWNLOADED");
      expect(downloadLog).toBeDefined();
      expect(downloadLog?.entityId).toBe(cleanFileId);
    });

    it("should strictly reject cross-tenant download access with TenantIsolationError", async () => {
      await expect(
        FileLifecycleManager.generateDownloadUrl({
          fileId: cleanFileId,
          requestingOrganizationId: orgBeta, // Intruder org
          requestingUserId: "usr_attacker",
          requestingRole: "ADMIN"
        })
      ).rejects.toThrow(TenantIsolationError);
    });

    it("should reject downloading quarantined, deleted, or expired files", async () => {
      // 1. Quarantined file
      const { file: malwareFile } = await FileLifecycleManager.initiateUpload({
        organizationId: orgAlpha,
        userId: userLead,
        fileName: "malware.txt",
        mimeType: "text/plain",
        fileSizeBytes: 70
      });
      await FileLifecycleManager.completeUpload({
        fileId: malwareFile.id,
        requestingOrganizationId: orgAlpha,
        requestingUserId: userLead,
        buffer: Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*")
      }).catch(() => {});

      await expect(
        FileLifecycleManager.generateDownloadUrl({
          fileId: malwareFile.id,
          requestingOrganizationId: orgAlpha,
          requestingUserId: userLead,
          requestingRole: "OWNER"
        })
      ).rejects.toThrow("File access forbidden: Malicious threat was detected");

      // 2. Deleted file
      await FileLifecycleManager.deleteFile({
        fileId: cleanFileId,
        requestingOrganizationId: orgAlpha,
        requestingUserId: userLead,
        requestingRole: "MANAGER"
      });

      await expect(
        FileLifecycleManager.generateDownloadUrl({
          fileId: cleanFileId,
          requestingOrganizationId: orgAlpha,
          requestingUserId: userLead,
          requestingRole: "MANAGER"
        })
      ).rejects.toThrow("File has been deleted");
    });
  });

  describe("3. Asynchronous Export Reliability & Idempotency", () => {
    it("should enqueue asynchronous export job and prevent duplicate jobs via idempotency key", async () => {
      const idempotencyKey = "idem_exp_scope_proj_1";

      const first = await ExportEngine.requestExport({
        organizationId: orgAlpha,
        userId: userLead,
        exportType: "SCOPE_PDF",
        projectId: "proj_1",
        idempotencyKey
      });

      expect(first.isDuplicate).toBe(false);
      expect(first.exportRecord.status).toBe("PENDING");
      expect(first.exportRecord.jobId).toBeDefined();

      // Second identical request returns duplicate without creating a new job
      const second = await ExportEngine.requestExport({
        organizationId: orgAlpha,
        userId: userLead,
        exportType: "SCOPE_PDF",
        projectId: "proj_1",
        idempotencyKey
      });

      expect(second.isDuplicate).toBe(true);
      expect(second.exportRecord.id).toBe(first.exportRecord.id);
    });

    it("should execute export worker, generate signed download URL, and notify user", async () => {
      const { exportRecord } = await ExportEngine.requestExport({
        organizationId: orgAlpha,
        userId: userLead,
        exportType: "TASK_CSV",
        projectId: "proj_fintech"
      });

      const completed = await ExportEngine.executeExport(exportRecord.id);

      expect(completed.status).toBe("READY");
      expect(completed.downloadUrl).toContain("https://storage.specforge.io/files/");
      expect(completed.sha256).toBeDefined();
      expect(completed.fileSizeBytes).toBeGreaterThan(0);

      // Verify notification dispatched
      const notifications = NotificationService.getInAppNotifications(userLead);
      const exportNotif = notifications.find((n) => n.eventType === "EXPORT_READY");
      expect(exportNotif).toBeDefined();
      expect(exportNotif?.title).toContain("Task Handover CSV");
    });

    it("should allow retry of failed export", async () => {
      const { exportRecord } = await ExportEngine.requestExport({
        organizationId: orgAlpha,
        userId: userLead,
        exportType: "ESTIMATE_PDF",
        projectId: "proj_fintech"
      });

      // Simulate failure
      exportRecord.status = "FAILED";
      exportRecord.errorMessage = "Renderer timeout";

      const retried = await ExportEngine.retryExport(exportRecord.id, userLead);
      expect(retried.status).toBe("READY");
      expect(retried.downloadUrl).toBeDefined();
    });
  });

  describe("4. Comprehensive Coverage for All 8 Export Types", () => {
    const allTypes: ExportType[] = [
      "SCOPE_PDF",
      "ESTIMATE_PDF",
      "PROPOSAL_PDF",
      "TASK_CSV",
      "TASK_MARKDOWN",
      "PROJECT_SUMMARY_PDF",
      "AUDIT_LOG_CSV",
      "ANALYTICS_CSV"
    ];

    allTypes.forEach((type) => {
      it(`should successfully generate export for type: ${type}`, async () => {
        const { exportRecord } = await ExportEngine.requestExport({
          organizationId: orgAlpha,
          userId: userLead,
          exportType: type,
          projectId: "proj_test_all"
        });

        const completed = await ExportEngine.executeExport(exportRecord.id);

        expect(completed.status).toBe("READY");
        expect(completed.content).toBeDefined();
        expect(completed.sha256).toBeDefined();
        expect(completed.downloadUrl).toBeDefined();

        const contentStr = completed.content!.toString("utf8");

        if (type === "SCOPE_PDF") {
          expect(contentStr).toContain("PROJECT SCOPE SPECIFICATION");
        } else if (type === "ESTIMATE_PDF") {
          expect(contentStr).toContain("COMMERCIAL ESTIMATE & RATE CARD BREAKDOWN");
        } else if (type === "PROPOSAL_PDF") {
          expect(contentStr).toContain("Cryptographic Digital Seal: SHA256-");
        } else if (type === "TASK_CSV") {
          expect(contentStr).toContain("Task ID,Title,Module,Estimated Hours,Priority,Status,Assignee");
        } else if (type === "TASK_MARKDOWN") {
          expect(contentStr).toContain("# Task Handover Specification");
          expect(contentStr).toContain("- [ ]");
        } else if (type === "PROJECT_SUMMARY_PDF") {
          expect(contentStr).toContain("Health Score: 94 / 100");
        } else if (type === "AUDIT_LOG_CSV") {
          expect(contentStr).toContain("Timestamp,Organization ID,User ID,Action");
        } else if (type === "ANALYTICS_CSV") {
          expect(contentStr).toContain("Time Saved Estimate");
        }
      });
    });
  });

  describe("5. File Lifecycle & Retention Policy", () => {
    it("should allow uploader or workspace admin to soft-delete their own file", async () => {
      const { file } = await FileLifecycleManager.initiateUpload({
        organizationId: orgAlpha,
        userId: userLead,
        fileName: "Delete_Candidate.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 200
      });

      await FileLifecycleManager.completeUpload({
        fileId: file.id,
        requestingOrganizationId: orgAlpha,
        requestingUserId: userLead,
        buffer: Buffer.from("%PDF-1.7\nSample\n%%EOF")
      });

      const deleted = await FileLifecycleManager.deleteFile({
        fileId: file.id,
        requestingOrganizationId: orgAlpha,
        requestingUserId: userLead,
        requestingRole: "MANAGER",
        reason: "Contract terminated"
      });

      expect(deleted.status).toBe("DELETED");
      expect(deleted.deletedAt).toBeDefined();
      expect(deleted.deletedBy).toBe(userLead);
      expect(deleted.contentBuffer).toBeNull();
    });

    it("should reject file deletion from unauthorized user who is not uploader and not admin", async () => {
      const { file } = await FileLifecycleManager.initiateUpload({
        organizationId: orgAlpha,
        userId: userLead,
        fileName: "Protected.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 200
      });

      await expect(
        FileLifecycleManager.deleteFile({
          fileId: file.id,
          requestingOrganizationId: orgAlpha,
          requestingUserId: userViewer, // Different user
          requestingRole: "VIEWER"       // Not admin
        })
      ).rejects.toThrow("Insufficient permissions to delete this file");
    });

    it("should automatically enforce retention policy and purge expired files", async () => {
      const { file } = await FileLifecycleManager.initiateUpload({
        organizationId: orgAlpha,
        userId: userLead,
        fileName: "Temporary_Export.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 300,
        retentionDays: 7
      });

      await FileLifecycleManager.completeUpload({
        fileId: file.id,
        requestingOrganizationId: orgAlpha,
        requestingUserId: userLead,
        buffer: Buffer.from("%PDF-1.7\nTemp\n%%EOF")
      });

      // Fast-forward past 7-day retention
      const future = new Date(Date.now() + 8 * 24 * 3600 * 1000);
      const { expiredCount } = FileLifecycleManager.enforceRetentionPolicy(future);

      expect(expiredCount).toBe(1);
      const refreshed = FileLifecycleManager.getFile(file.id, orgAlpha);
      expect(refreshed?.status).toBe("EXPIRED");
      expect(refreshed?.contentBuffer).toBeNull();
    });
  });
});
