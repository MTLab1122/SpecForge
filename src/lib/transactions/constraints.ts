export class ValidationError extends Error {
  public readonly field: string;
  public readonly invalidValue: any;

  constructor(field: string, invalidValue: any, message: string) {
    super(`Validation constraint violated for field '${field}': ${message} (received: ${JSON.stringify(invalidValue)})`);
    this.name = "ValidationError";
    this.field = field;
    this.invalidValue = invalidValue;
  }
}

export class DataConstraintValidator {
  private static readonly VALID_ISO_CURRENCIES = new Set([
    "USD", "EUR", "GBP", "CAD", "AUD", "PKR", "AED", "SAR", "JPY", "INR", "SGD", "CHF", "NZD", "CNY", "SEK"
  ]);

  private static readonly VALID_ROLES = new Set([
    "OWNER", "ADMIN", "MANAGER", "EDITOR", "REVIEWER", "VIEWER", "CLIENT"
  ]);

  private static readonly ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
    "application/msword", // doc
    "text/plain",
    "audio/mpeg",
    "audio/wav",
    "audio/mp4",
    "audio/x-m4a"
  ]);

  private static readonly MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

  /**
   * Validates ISO 4217 Currency Code
   */
  public static validateCurrency(currency: string): string {
    const normalized = (currency || "").trim().toUpperCase();
    if (!this.VALID_ISO_CURRENCIES.has(normalized)) {
      throw new ValidationError("currency", currency, `Must be a valid ISO 4217 code (e.g. USD, EUR, GBP, PKR).`);
    }
    return normalized;
  }

  /**
   * Validates monetary amount is non-negative
   */
  public static validateAmount(amount: number | string, fieldName: string = "amount"): number {
    const num = Number(amount);
    if (isNaN(num) || num < 0) {
      throw new ValidationError(fieldName, amount, "Amount must be a non-negative number.");
    }
    return Number(num.toFixed(2));
  }

  /**
   * Validates that a future due date is not in the past
   */
  public static validateFutureDate(date: string | Date, fieldName: string = "dueDate", gracePeriodMinutes: number = 5): Date {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      throw new ValidationError(fieldName, date, "Must be a valid ISO date timestamp.");
    }
    const cutoff = Date.now() - gracePeriodMinutes * 60 * 1000;
    if (d.getTime() < cutoff) {
      throw new ValidationError(fieldName, date, "Due date cannot be set in the past for new milestones.");
    }
    return d;
  }

  /**
   * Validates email format using RFC 5322 regex
   */
  public static validateEmail(email: string): string {
    const normalized = (email || "").trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!emailRegex.test(normalized)) {
      throw new ValidationError("email", email, "Must be a valid email address.");
    }
    return normalized;
  }

  /**
   * Validates file mime type and byte size
   */
  public static validateFile(file: { mimeType: string; sizeBytes: number; name?: string }): void {
    if (!this.ALLOWED_MIME_TYPES.has(file.mimeType)) {
      throw new ValidationError(
        "mimeType",
        file.mimeType,
        `File format not permitted. Supported: PDF, DOCX, TXT, MP3, WAV, M4A.`
      );
    }
    if (file.sizeBytes > this.MAX_FILE_SIZE_BYTES) {
      throw new ValidationError(
        "sizeBytes",
        file.sizeBytes,
        `File size exceeds 25MB limit (received: ${(file.sizeBytes / 1024 / 1024).toFixed(1)}MB).`
      );
    }
  }

  /**
   * Validates user organization role
   */
  public static validateRole(role: string): string {
    if (!this.VALID_ROLES.has(role)) {
      throw new ValidationError("role", role, `Must be one of: [${Array.from(this.VALID_ROLES).join(", ")}].`);
    }
    return role;
  }
}
