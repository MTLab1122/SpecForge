import { StorageService } from "@/lib/storage/storage-service";
import { CircuitBreakerRegistry } from "@/lib/reliability/circuit-breaker-registry";
import { TenantIsolationError, AppError } from "@/lib/reliability/error-envelope";
import { ValidationError } from "@/lib/transactions/constraints";
import { IdempotencyService } from "@/lib/reliability/job-queue";

describe("Phase 3.5 — File, Media & Export Reliability Suite", () => {
  beforeEach(() => {
    CircuitBreakerRegistry.resetAll();
    IdempotencyService.clear();
  });

  describe("1. Presigned URLs & Cryptographic Integrity", () => {
    it("should generate a presigned download URL with HMAC-SHA256 token", () => {
      const presigned = StorageService.generatePresignedUrl({
        organizationId: "org_alpha",
        userId: "usr_lead",
        fileKey: "briefs/client_rfp.pdf",
        action: "DOWNLOAD",
        expiresInSeconds: 600
      });

      expect(presigned.url).toContain("https://storage.specforge.io/files/briefs%2Fclient_rfp.pdf");
      expect(presigned.token).toBeDefined();
      expect(presigned.storageProvider).toBe("PRIMARY_CLOUDINARY");
      expect(presigned.degradedMode).toBe(false);
    });

    it("should successfully verify a valid presigned token within TTL", () => {
      const presigned = StorageService.generatePresignedUrl({
        organizationId: "org_alpha",
        userId: "usr_lead",
        fileKey: "briefs/statement_of_work.pdf",
        action: "DOWNLOAD"
      });

      const verified = StorageService.verifyPresignedToken({
        token: presigned.token,
        requestingOrganizationId: "org_alpha",
        expectedAction: "DOWNLOAD"
      });

      expect(verified.fileKey).toBe("briefs/statement_of_work.pdf");
      expect(verified.organizationId).toBe("org_alpha");
      expect(verified.userId).toBe("usr_lead");
    });

    it("should reject a tampered presigned token with 403 Forbidden", () => {
      const presigned = StorageService.generatePresignedUrl({
        organizationId: "org_alpha",
        userId: "usr_lead",
        fileKey: "briefs/original.pdf",
        action: "DOWNLOAD"
      });

      // Tamper token by modifying base64 payload
      const decoded = JSON.parse(Buffer.from(presigned.token, "base64url").toString("utf8"));
      decoded.p = decoded.p.replace("original.pdf", "tampered_target.pdf");
      const tamperedToken = Buffer.from(JSON.stringify(decoded)).toString("base64url");

      expect(() => {
        StorageService.verifyPresignedToken({
          token: tamperedToken,
          requestingOrganizationId: "org_alpha",
          expectedAction: "DOWNLOAD"
        });
      }).toThrow(AppError);
    });

    it("should strictly reject cross-tenant token access with TenantIsolationError", () => {
      const presigned = StorageService.generatePresignedUrl({
        organizationId: "org_tenant_A",
        userId: "usr_lead",
        fileKey: "financials/agency_q3_report.pdf",
        action: "DOWNLOAD"
      });

      // Tenant B attempts to use Tenant A's token
      expect(() => {
        StorageService.verifyPresignedToken({
          token: presigned.token,
          requestingOrganizationId: "org_tenant_B", // Cross-tenant!
          expectedAction: "DOWNLOAD"
        });
      }).toThrow(TenantIsolationError);
    });

    it("should reject action mismatch (using UPLOAD token for DOWNLOAD)", () => {
      const presigned = StorageService.generatePresignedUrl({
        organizationId: "org_alpha",
        userId: "usr_lead",
        fileKey: "uploads/new_doc.pdf",
        action: "UPLOAD"
      });

      expect(() => {
        StorageService.verifyPresignedToken({
          token: presigned.token,
          requestingOrganizationId: "org_alpha",
          expectedAction: "DOWNLOAD" // Mismatch
        });
      }).toThrow(AppError);
    });
  });

  describe("2. Malware & Magic Byte Verification Gate", () => {
    it("should accept valid PDF file matching %PDF magic byte header", () => {
      const pdfBuffer = Buffer.concat([
        Buffer.from("%PDF-1.7\n"),
        Buffer.from("Valid PDF body stream content")
      ]);

      const scan = StorageService.scanFileSafety({
        name: "architecture_spec.pdf",
        mimeType: "application/pdf",
        sizeBytes: pdfBuffer.length,
        buffer: pdfBuffer
      });

      expect(scan.isSafe).toBe(true);
      expect(scan.magicByteVerified).toBe(true);
      expect(scan.sha256).toBeDefined();
    });

    it("should accept valid MP3 audio file matching ID3 magic byte header", () => {
      const mp3Buffer = Buffer.concat([
        Buffer.from("ID3\x04\x00\x00"),
        Buffer.from("Audio byte stream")
      ]);

      const scan = StorageService.scanFileSafety({
        name: "client_meeting.mp3",
        mimeType: "audio/mpeg",
        sizeBytes: mp3Buffer.length,
        buffer: mp3Buffer
      });

      expect(scan.isSafe).toBe(true);
      expect(scan.magicByteVerified).toBe(true);
    });

    it("should detect and quarantine EICAR test signature", () => {
      const eicarBuffer = Buffer.from(
        "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
      );

      const scan = StorageService.scanFileSafety({
        name: "eicar_test.pdf",
        mimeType: "application/pdf",
        sizeBytes: eicarBuffer.length,
        buffer: eicarBuffer
      });

      expect(scan.isSafe).toBe(false);
      expect(scan.detectedThreat).toBe("Win32/EICAR_Test_File");
    });

    it("should detect script injection in binary upload", () => {
      const scriptBuffer = Buffer.from("<script>alert('xss payload')</script>");

      const scan = StorageService.scanFileSafety({
        name: "malicious.pdf",
        mimeType: "application/pdf",
        sizeBytes: scriptBuffer.length,
        buffer: scriptBuffer
      });

      expect(scan.isSafe).toBe(false);
      expect(scan.detectedThreat).toBe("HTML_Script_Injection_In_Binary");
    });

    it("should reject spoofed extension with invalid magic byte header", () => {
      const fakePdfBuffer = Buffer.from("This is plain text with no PDF header at all");

      expect(() => {
        StorageService.scanFileSafety({
          name: "spoofed.pdf",
          mimeType: "application/pdf",
          sizeBytes: fakePdfBuffer.length,
          buffer: fakePdfBuffer
        });
      }).toThrow(ValidationError);
    });
  });

  describe("3. Storage Degradation & Circuit Breaker Fallback", () => {
    it("should fallback to secondary blob storage when primary Cloudinary circuit is OPEN", () => {
      const breaker = CircuitBreakerRegistry.get("STORAGE_CLOUDINARY");

      // Trip circuit breaker open
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure(); // Threshold 4
      expect(breaker.getState()).toBe("OPEN");

      const presigned = StorageService.generatePresignedUrl({
        organizationId: "org_alpha",
        userId: "usr_lead",
        fileKey: "exports/report.csv",
        action: "DOWNLOAD"
      });

      expect(presigned.storageProvider).toBe("SECONDARY_BLOB_STORAGE");
      expect(presigned.degradedMode).toBe(true);
      expect(presigned.url).toContain("https://storage-backup.specforge.io");
    });
  });

  describe("4. Idempotent Export Engine", () => {
    it("should generate project export and serve identical cached link for duplicate idempotency key", async () => {
      const key = "idem_exp_project_7788";
      const payload = {
        organizationId: "org_alpha",
        userId: "usr_lead",
        projectId: "proj_ecommerce_99",
        format: "PDF" as const,
        idempotencyKey: key,
        projectData: { name: "E-Commerce Re-Platforming", deliverables: 12 }
      };

      const first = await StorageService.generateProjectExport(payload);
      expect(first.format).toBe("PDF");
      expect(first.downloadUrl).toContain("specforge.io");
      expect(first.isCached).toBe(false);

      const second = await StorageService.generateProjectExport(payload);
      expect(second.exportId).toBe(first.exportId);
      expect(second.downloadUrl).toBe(first.downloadUrl);
      expect(second.sha256).toBe(first.sha256);
    });
  });
});
