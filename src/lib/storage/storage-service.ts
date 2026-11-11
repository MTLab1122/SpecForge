import crypto from "node:crypto";
import { CircuitBreakerRegistry } from "../reliability/circuit-breaker-registry.ts";
import { AppError, TenantIsolationError } from "../reliability/error-envelope.ts";
import { Logger } from "../reliability/observability.ts";
import { IdempotencyService } from "../reliability/job-queue.ts";
import { DataConstraintValidator, ValidationError } from "../transactions/constraints.ts";

export interface PresignedUrlOptions {
  organizationId: string;
  userId: string;
  fileKey: string;
  action: "UPLOAD" | "DOWNLOAD";
  mimeType?: string;
  maxSizeBytes?: number;
  expiresInSeconds?: number;
}

export interface PresignedUrlResult {
  url: string;
  fileKey: string;
  token: string;
  expiresAt: string;
  storageProvider: "PRIMARY_CLOUDINARY" | "SECONDARY_BLOB_STORAGE";
  degradedMode: boolean;
}

export interface FileSafetyScanResult {
  isSafe: boolean;
  sha256: string;
  detectedThreat?: string;
  magicByteVerified: boolean;
}

export interface ProjectExportResult {
  exportId: string;
  projectId: string;
  format: "PDF" | "CSV" | "JSON";
  downloadUrl: string;
  expiresAt: string;
  fileSizeBytes: number;
  sha256: string;
  isCached: boolean;
}

export class StorageService {
  private static readonly SECRET_SIGNING_KEY = process.env.STORAGE_SIGNING_KEY || "specforge-storage-secure-hmac-key-2026";
  private static readonly EICAR_TEST_SIGNATURE = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";
  private static readonly EXPORT_CACHE = new Map<string, ProjectExportResult>();

  /**
   * Generates HMAC-SHA256 presigned URL with tenant boundary encoding.
   */
  public static generatePresignedUrl(options: PresignedUrlOptions): PresignedUrlResult {
    if (!options.organizationId) {
      throw new TenantIsolationError("Presigned storage URLs require a valid organizationId context.");
    }

    const ttlSec = options.expiresInSeconds || 900; // 15 minutes default
    const expiresAtMs = Date.now() + ttlSec * 1000;
    const expiresAt = new Date(expiresAtMs).toISOString();

    const payload = JSON.stringify({
      org: options.organizationId,
      usr: options.userId,
      key: options.fileKey,
      act: options.action,
      exp: expiresAtMs,
      mime: options.mimeType,
      maxSize: options.maxSizeBytes
    });

    const signature = crypto
      .createHmac("sha256", this.SECRET_SIGNING_KEY)
      .update(payload)
      .digest("hex");

    const token = Buffer.from(JSON.stringify({ p: payload, s: signature })).toString("base64url");

    // Provider check with circuit breaker
    const breaker = CircuitBreakerRegistry.get("STORAGE_CLOUDINARY");
    const isDegraded = breaker.getState() === "OPEN";
    const provider = isDegraded ? "SECONDARY_BLOB_STORAGE" : "PRIMARY_CLOUDINARY";
    const baseUrl = isDegraded ? "https://storage-backup.specforge.io" : "https://storage.specforge.io";

    const url = `${baseUrl}/files/${encodeURIComponent(options.fileKey)}?token=${token}&action=${options.action}`;

    return {
      url,
      fileKey: options.fileKey,
      token,
      expiresAt,
      storageProvider: provider,
      degradedMode: isDegraded
    };
  }

  /**
   * Verifies presigned token signature, expiration, and tenant ownership.
   */
  public static verifyPresignedToken(params: {
    token: string;
    requestingOrganizationId: string;
    expectedAction: "UPLOAD" | "DOWNLOAD";
  }): { fileKey: string; userId: string; organizationId: string } {
    try {
      const decoded = JSON.parse(Buffer.from(params.token, "base64url").toString("utf8"));
      const { p: payloadStr, s: expectedSignature } = decoded;

      // 1. Verify HMAC Signature
      const actualSignature = crypto
        .createHmac("sha256", this.SECRET_SIGNING_KEY)
        .update(payloadStr)
        .digest("hex");

      if (!crypto.timingSafeEqual(Buffer.from(expectedSignature, "hex"), Buffer.from(actualSignature, "hex"))) {
        throw new AppError({
          message: "Presigned URL signature verification failed (tampered token).",
          status: 403,
          code: "STORAGE_SIGNATURE_INVALID"
        });
      }

      const payload = JSON.parse(payloadStr);

      // 2. Verify Expiration
      if (Date.now() > payload.exp) {
        throw new AppError({
          message: "Presigned storage URL has expired.",
          status: 401,
          code: "STORAGE_URL_EXPIRED"
        });
      }

      // 3. Verify Tenant Isolation
      if (payload.org !== params.requestingOrganizationId) {
        throw new TenantIsolationError(
          `Tenant Boundary Violation: Storage token org '${payload.org}' does not match caller org '${params.requestingOrganizationId}'.`
        );
      }

      // 4. Verify Action match
      if (payload.act !== params.expectedAction) {
        throw new AppError({
          message: `Storage URL action mismatch. Expected '${params.expectedAction}', received '${payload.act}'.`,
          status: 403,
          code: "STORAGE_ACTION_MISMATCH"
        });
      }

      return {
        fileKey: payload.key,
        userId: payload.usr,
        organizationId: payload.org
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError({
        message: `Invalid presigned storage token format: ${err.message}`,
        status: 400,
        code: "INVALID_STORAGE_TOKEN"
      });
    }
  }

  /**
   * Scans uploaded buffer for magic byte fidelity and malware signatures.
   */
  public static scanFileSafety(file: {
    name: string;
    mimeType: string;
    sizeBytes: number;
    buffer: Buffer | Uint8Array;
  }): FileSafetyScanResult {
    // 1. Constraint check
    DataConstraintValidator.validateFile({
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      name: file.name
    });

    const rawBuffer = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer);
    const sha256 = crypto.createHash("sha256").update(rawBuffer).digest("hex");

    // 2. Malware Signature Scan (EICAR check & script injection detection)
    const contentString = rawBuffer.slice(0, 1024).toString("utf8");
    if (contentString.includes(this.EICAR_TEST_SIGNATURE)) {
      return {
        isSafe: false,
        sha256,
        detectedThreat: "Win32/EICAR_Test_File",
        magicByteVerified: false
      };
    }

    if (file.mimeType !== "text/plain" && /<script[\s>]/i.test(contentString)) {
      return {
        isSafe: false,
        sha256,
        detectedThreat: "HTML_Script_Injection_In_Binary",
        magicByteVerified: false
      };
    }

    // 3. Magic Bytes Verification
    let magicVerified = false;
    if (file.mimeType === "application/pdf") {
      // PDF starts with %PDF- (0x25, 0x50, 0x44, 0x46)
      magicVerified = rawBuffer.length >= 4 && rawBuffer.toString("utf8", 0, 4) === "%PDF";
    } else if (file.mimeType === "audio/mpeg") {
      // MP3 starts with ID3 header or 0xFF 0xFB frame sync
      magicVerified =
        (rawBuffer.length >= 3 && rawBuffer.toString("utf8", 0, 3) === "ID3") ||
        (rawBuffer.length >= 2 && rawBuffer[0] === 0xff && (rawBuffer[1] & 0xe0) === 0xe0);
    } else if (file.mimeType === "audio/wav") {
      // WAV starts with RIFF ... WAVE
      magicVerified = rawBuffer.length >= 12 && rawBuffer.toString("utf8", 0, 4) === "RIFF";
    } else {
      // Allowed docs / text pass through
      magicVerified = true;
    }

    if (!magicVerified) {
      throw new ValidationError(
        "fileBuffer",
        file.mimeType,
        `File magic byte header does not match claimed MIME type '${file.mimeType}'. Potential spoofed file.`
      );
    }

    return {
      isSafe: true,
      sha256,
      magicByteVerified: true
    };
  }

  /**
   * Generates a project export (PDF, CSV, JSON) with idempotency caching and signed download URL.
   */
  public static async generateProjectExport(params: {
    organizationId: string;
    userId: string;
    projectId: string;
    format: "PDF" | "CSV" | "JSON";
    idempotencyKey?: string;
    projectData?: any;
  }): Promise<ProjectExportResult> {
    if (params.idempotencyKey) {
      const hash = IdempotencyService.computeRequestHash(params);
      const check = IdempotencyService.check(params.idempotencyKey, hash);
      if (check.isDuplicate && check.cachedResponse) {
        return check.cachedResponse.body;
      }
    }

    const exportKey = `${params.organizationId}/exports/${params.projectId}_export_${Date.now()}.${params.format.toLowerCase()}`;
    const presigned = this.generatePresignedUrl({
      organizationId: params.organizationId,
      userId: params.userId,
      fileKey: exportKey,
      action: "DOWNLOAD",
      expiresInSeconds: 86400 // 24 hours
    });

    const mockContent = JSON.stringify(params.projectData || { projectId: params.projectId, generatedAt: new Date().toISOString() });
    const fileSizeBytes = Buffer.byteLength(mockContent);
    const sha256 = crypto.createHash("sha256").update(mockContent).digest("hex");

    const result: ProjectExportResult = {
      exportId: `exp_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      projectId: params.projectId,
      format: params.format,
      downloadUrl: presigned.url,
      expiresAt: presigned.expiresAt,
      fileSizeBytes,
      sha256,
      isCached: false
    };

    if (params.idempotencyKey) {
      IdempotencyService.storeResult(params.idempotencyKey, 200, result);
    }

    Logger.info(`Generated project export (${params.format}) for project '${params.projectId}'`, {
      organizationId: params.organizationId,
      userId: params.userId,
      context: { format: params.format, bytes: fileSizeBytes }
    });

    return result;
  }
}
