import crypto from "node:crypto";

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string;         // base64 (12 bytes / 96-bit)
  tag: string;        // base64 (16 bytes / 128-bit)
  version: number;    // key version for rotation
}

export class DataProtectionService {
  private static readonly ALGORITHM = "aes-256-gcm";
  private static readonly IV_LENGTH = 12; // 96-bit recommended for GCM
  private static readonly TAG_LENGTH = 16; // 128-bit auth tag

  /**
   * Derives a deterministic 32-byte key from the master secret or environment variable.
   */
  private static getMasterKey(customSecret?: string): Buffer {
    const rawSecret =
      customSecret ||
      process.env.DATA_ENCRYPTION_KEY ||
      "specforge_default_master_encryption_key_2026_dev_only";
    return crypto.createHash("sha256").update(rawSecret).digest();
  }

  // --------------------------------------------------------------------------
  // 1. AES-256-GCM SYMMETRIC FIELD-LEVEL ENCRYPTION
  // --------------------------------------------------------------------------

  /**
   * Encrypts plaintext using AES-256-GCM with authenticated tag.
   */
  public static encryptField(plaintext: string, secretKey?: string): EncryptedPayload {
    const key = this.getMasterKey(secretKey);
    const iv = crypto.randomBytes(this.IV_LENGTH);

    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    let ciphertext = cipher.update(plaintext, "utf8", "base64");
    ciphertext += cipher.final("base64");
    const tag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      version: 1
    };
  }

  /**
   * Decrypts an authenticated AES-256-GCM ciphertext payload.
   * Throws an error if the authentication tag fails (tamper detection).
   */
  public static decryptField(payload: EncryptedPayload, secretKey?: string): string {
    const key = this.getMasterKey(secretKey);
    const iv = Buffer.from(payload.iv, "base64");
    const tag = Buffer.from(payload.tag, "base64");

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(payload.ciphertext, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  // --------------------------------------------------------------------------
  // 2. SECRET & LOG SENSITIVE DATA REDACTION
  // --------------------------------------------------------------------------

  private static readonly SENSITIVE_KEYS = new Set([
    "password",
    "passwordhash",
    "secret",
    "apikey",
    "token",
    "accesstoken",
    "refreshtoken",
    "sessiontoken",
    "mfasecret",
    "cardnumber",
    "cvv",
    "cvc",
    "authorization",
    "privatekey",
    "clientsecret",
    "stripekey",
    "webhooksecret",
    "bankaccount",
    "routingnumber",
    "iban",
    "accountnumber",
    "ssn",
    "taxid"
  ]);

  private static readonly DOCUMENT_KEYS = new Set([
    "document",
    "documentbody",
    "filecontent",
    "briefcontent",
    "rawbrief",
    "clientbrief",
    "bodytext",
    "fulldocument",
    "pdfcontent"
  ]);

  private static readonly AUDIO_KEYS = new Set([
    "audio",
    "audiofile",
    "audiobuffer",
    "audiobase64",
    "recording",
    "voicebrief",
    "transcriptionaudio"
  ]);

  // Matches 13 to 19 digit credit card numbers with optional hyphens/spaces
  private static readonly CARD_REGEX = /\b(?:\d{4}[ -]?){3}\d{1,4}\b|\b\d{13,19}\b/g;

  /**
   * Recursively traverses and redacts secrets, tokens, passwords, full documents,
   * audio binaries, and sensitive financial data from logs/objects.
   */
  public static redactSensitiveData(data: any): any {
    if (!data) {
      return data;
    }

    if (typeof data === "string") {
      let sanitized = data;
      // Redact inline audio data URLs
      if (sanitized.startsWith("data:audio/")) {
        return `[AUDIO_BINARY_REDACTED: ${sanitized.length} bytes]`;
      }
      // Redact full documents
      if (sanitized.startsWith("%PDF-") || (sanitized.length > 500 && (sanitized.includes("# Requirements") || sanitized.includes("Project Brief:")))) {
        return `[DOCUMENT_BODY_REDACTED: ${sanitized.length} chars]`;
      }
      // Redact financial card patterns
      if (this.CARD_REGEX.test(sanitized)) {
        sanitized = sanitized.replace(this.CARD_REGEX, "[FINANCIAL_DATA_REDACTED]");
      }
      return sanitized;
    }

    if (typeof data !== "object") {
      return data;
    }

    if (Buffer.isBuffer(data)) {
      return `[BINARY_BUFFER_REDACTED: ${data.length} bytes]`;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.redactSensitiveData(item));
    }

    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      const lowerKey = key.toLowerCase().replace(/[-_]/g, "");

      if (this.SENSITIVE_KEYS.has(lowerKey)) {
        cleaned[key] = "[REDACTED]";
      } else if (this.DOCUMENT_KEYS.has(lowerKey)) {
        const len = typeof val === "string" ? val.length : (val ? JSON.stringify(val).length : 0);
        cleaned[key] = `[DOCUMENT_BODY_REDACTED: ${len} chars]`;
      } else if (this.AUDIO_KEYS.has(lowerKey)) {
        const bytes = typeof val === "string" ? val.length : (Buffer.isBuffer(val) ? val.length : 0);
        cleaned[key] = `[AUDIO_BINARY_REDACTED: ${bytes} bytes]`;
      } else if (typeof val === "object" && val !== null) {
        cleaned[key] = this.redactSensitiveData(val);
      } else if (typeof val === "string") {
        cleaned[key] = this.redactSensitiveData(val);
      } else {
        cleaned[key] = val;
      }
    }
    return cleaned;
  }

  // --------------------------------------------------------------------------
  // 3. SECURITY RESPONSE HEADERS BUILDER (ENCRYPTION IN TRANSIT)
  // --------------------------------------------------------------------------

  /**
   * Generates production-grade HTTP security headers for Next.js responses.
   */
  public static getSecurityHeaders(): Record<string, string> {
    return {
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
    };
  }

  // --------------------------------------------------------------------------
  // 4. DATA RETENTION & PURGE POLICIES
  // --------------------------------------------------------------------------

  /**
   * Evaluates records against organization retention thresholds.
   */
  public static evaluateDataRetention(params: {
    retentionDays: number;
    recordCreatedAt: Date;
    isSoftDeleted?: boolean;
    deletedAt?: Date | null;
  }): { shouldArchive: boolean; shouldPurgePermanently: boolean } {
    const now = Date.now();
    const ageDays = (now - new Date(params.recordCreatedAt).getTime()) / (1000 * 60 * 60 * 24);

    // Soft-deleted records are permanently purged after 30 days
    if (params.isSoftDeleted && params.deletedAt) {
      const deletedAgeDays = (now - new Date(params.deletedAt).getTime()) / (1000 * 60 * 60 * 24);
      return {
        shouldArchive: false,
        shouldPurgePermanently: deletedAgeDays >= 30
      };
    }

    return {
      shouldArchive: ageDays > params.retentionDays,
      shouldPurgePermanently: false
    };
  }

  // --------------------------------------------------------------------------
  // 5. GDPR DATA EXPORT & ACCOUNT DELETION (RIGHT TO BE FORGOTTEN)
  // --------------------------------------------------------------------------

  /**
   * Bundles organization or user records into a structured GDPR-compliant export.
   */
  public static generateGdprExportBundle(params: {
    userId: string;
    organizationId: string;
    userData: Record<string, any>;
    projects: any[];
    estimates: any[];
    proposals: any[];
    auditLogs: any[];
  }): {
    exportId: string;
    exportedAt: string;
    checksum: string;
    bundle: Record<string, any>;
  } {
    const exportId = `gdpr_${params.userId}_${Date.now()}`;
    const exportedAt = new Date().toISOString();

    const bundle = {
      meta: {
        specForgeVersion: "2.0.0",
        exportId,
        exportedAt,
        dataSubjectUserId: params.userId,
        organizationId: params.organizationId
      },
      profile: this.redactSensitiveData(params.userData),
      projects: params.projects,
      estimates: params.estimates,
      proposals: params.proposals,
      auditHistory: params.auditLogs
    };

    const bundleJson = JSON.stringify(bundle);
    const checksum = crypto.createHash("sha256").update(bundleJson).digest("hex");

    return {
      exportId,
      exportedAt,
      checksum,
      bundle
    };
  }

  /**
   * Sanitizes personal identifiers from a user profile for GDPR erasure.
   */
  public static anonymizeUserForDeletion(userId: string): {
    email: string;
    fullName: string;
    passwordHash: string;
    avatarUrl: null;
    isDeleted: true;
    deletedAt: Date;
  } {
    const anonId = crypto.createHash("sha256").update(userId).digest("hex").slice(0, 12);
    return {
      email: `deleted_user_${anonId}@anonymized.specforge.internal`,
      fullName: "Anonymized Former User",
      passwordHash: "DELETED_ACCOUNT_CREDENTIALS_PURGED",
      avatarUrl: null,
      isDeleted: true,
      deletedAt: new Date()
    };
  }
}
