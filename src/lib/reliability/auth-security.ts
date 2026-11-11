import crypto from "node:crypto";

/**
 * Base32 Alphabet for RFC 3548 / RFC 4226 compliance
 */
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export class AuthSecurityService {
  // --------------------------------------------------------------------------
  // 1. MULTI-FACTOR AUTHENTICATION (TOTP - RFC 6238)
  // --------------------------------------------------------------------------

  /**
   * Generates a cryptographically secure Base32 secret for TOTP.
   */
  public static generateTotpSecret(length: number = 20): string {
    const randomBytes = crypto.randomBytes(length);
    let secret = "";
    for (let i = 0; i < randomBytes.length; i++) {
      secret += BASE32_ALPHABET[randomBytes[i] % 32];
    }
    return secret;
  }

  /**
   * Generates the otpauth:// URI for QR code presentation.
   */
  public static generateOtpAuthUri(params: {
    issuer: string;
    accountName: string;
    secret: string;
  }): string {
    const encodedIssuer = encodeURIComponent(params.issuer);
    const encodedAccount = encodeURIComponent(params.accountName);
    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${params.secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }

  /**
   * Computes the 6-digit TOTP code for a given timestamp and secret.
   */
  public static computeTotp(secret: string, timestampMs: number = Date.now(), stepSeconds: number = 30): string {
    const counter = Math.floor(timestampMs / 1000 / stepSeconds);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));

    // Decode Base32 secret to raw byte buffer
    const secretBuffer = this.decodeBase32(secret);

    // Compute HMAC-SHA1
    const hmac = crypto.createHmac("sha1", secretBuffer);
    hmac.update(counterBuffer);
    const digest = hmac.digest();

    // Dynamic truncation per RFC 4226
    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, "0");
  }

  /**
   * Verifies a user-supplied TOTP code with ±1 step window tolerance for clock drift.
   */
  public static verifyTotp(params: {
    secret: string;
    token: string;
    window?: number; // steps before and after (default 1)
    timestampMs?: number;
  }): boolean {
    const { secret, token, window = 1, timestampMs = Date.now() } = params;
    const cleanToken = token.trim().replace(/\s+/g, "");

    if (!/^\d{6}$/.test(cleanToken)) {
      return false;
    }

    const stepSeconds = 30;
    for (let offset = -window; offset <= window; offset++) {
      const checkTime = timestampMs + offset * stepSeconds * 1000;
      const expected = this.computeTotp(secret, checkTime, stepSeconds);
      if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(cleanToken))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generates a set of 10 single-use emergency backup recovery codes.
   * Returns plaintext codes for display to the user, and hashed codes for database persistence.
   */
  public static generateBackupCodes(count: number = 10): {
    plainCodes: string[];
    hashedCodes: string[];
  } {
    const plainCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString("hex").toUpperCase(); // 8 characters e.g. "A1B2C3D4"
      const formatted = `${code.slice(0, 4)}-${code.slice(4)}`; // "A1B2-C3D4"
      plainCodes.push(formatted);

      const hash = crypto.createHash("sha256").update(formatted).digest("hex");
      hashedCodes.push(hash);
    }

    return { plainCodes, hashedCodes };
  }

  /**
   * Validates a backup recovery code against stored hashes.
   */
  public static verifyBackupCode(code: string, storedHashes: string[]): {
    isValid: boolean;
    remainingHashes: string[];
  } {
    const formatted = code.trim().toUpperCase();
    const targetHash = crypto.createHash("sha256").update(formatted).digest("hex");

    const index = storedHashes.findIndex((h) => h === targetHash);
    if (index === -1) {
      return { isValid: false, remainingHashes: storedHashes };
    }

    // Burn the code after single use
    const remaining = [...storedHashes];
    remaining.splice(index, 1);
    return { isValid: true, remainingHashes: remaining };
  }

  // --------------------------------------------------------------------------
  // 2. SESSION & DEVICE MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Creates a cryptographically random session token (256-bit).
   */
  public static generateSessionToken(): string {
    return `sfg_sess_${crypto.randomBytes(32).toString("base64url")}`;
  }

  /**
   * Generates a deterministic device signature hash based on client signals.
   */
  public static generateDeviceFingerprint(params: {
    userAgent: string;
    ipAddress: string;
    acceptLanguage?: string;
  }): { deviceId: string; deviceName: string; deviceType: string } {
    const raw = `${params.userAgent}|${params.ipAddress}|${params.acceptLanguage || ""}`;
    const deviceId = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);

    const ua = params.userAgent.toLowerCase();
    let deviceType = "DESKTOP";
    if (ua.includes("mobile") || ua.includes("iphone") || ua.includes("android")) {
      deviceType = "MOBILE";
    } else if (ua.includes("ipad") || ua.includes("tablet")) {
      deviceType = "TABLET";
    }

    // Friendly device label
    let browser = "Browser";
    if (ua.includes("chrome") && !ua.includes("edg")) browser = "Chrome";
    else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
    else if (ua.includes("firefox")) browser = "Firefox";
    else if (ua.includes("edg")) browser = "Edge";

    let os = "OS";
    if (ua.includes("macintosh") || ua.includes("mac os")) os = "macOS";
    else if (ua.includes("windows")) os = "Windows";
    else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";
    else if (ua.includes("android")) os = "Android";
    else if (ua.includes("linux")) os = "Linux";

    return {
      deviceId,
      deviceName: `${browser} on ${os}`,
      deviceType
    };
  }

  // --------------------------------------------------------------------------
  // 3. BRUTE-FORCE PROTECTION & ACCOUNT LOCKOUT
  // --------------------------------------------------------------------------

  /**
   * Evaluates failed login attempts and determines if the account should be locked.
   * Lockout rules:
   * - 1 to 4 attempts: Progressive delay (e.g. 500ms * 2^attempts)
   * - 5+ attempts: 15-minute complete lockout
   */
  public static evaluateLoginAttempt(currentFailures: number): {
    isLocked: boolean;
    lockoutUntil: Date | null;
    delayMs: number;
    remainingAttemptsBeforeLockout: number;
  } {
    const MAX_FAILURES = 5;
    const LOCKOUT_MINUTES = 15;

    const nextFailureCount = currentFailures + 1;

    if (nextFailureCount >= MAX_FAILURES) {
      const lockoutUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      return {
        isLocked: true,
        lockoutUntil,
        delayMs: 2000,
        remainingAttemptsBeforeLockout: 0
      };
    }

    // Exponential delay to deter high-frequency brute-force dictionaries
    const delayMs = Math.min(2000, 200 * Math.pow(2, currentFailures));
    return {
      isLocked: false,
      lockoutUntil: null,
      delayMs,
      remainingAttemptsBeforeLockout: MAX_FAILURES - nextFailureCount
    };
  }

  // --------------------------------------------------------------------------
  // 4. SECURE PASSWORD RESET TOKEN
  // --------------------------------------------------------------------------

  /**
   * Generates a single-use, high-entropy password reset token with 1-hour validity.
   * Stores the SHA-256 hash in database; sends plaintext in secure email.
   */
  public static generatePasswordResetToken(): {
    plainToken: string;
    tokenHash: string;
    expiresAt: Date;
  } {
    const plainToken = `sfg_pw_${crypto.randomBytes(32).toString("base64url")}`;
    const tokenHash = crypto.createHash("sha256").update(plainToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    return { plainToken, tokenHash, expiresAt };
  }

  /**
   * Verifies password reset token against stored hash and expiration.
   */
  public static verifyPasswordResetToken(params: {
    plainToken: string;
    storedHash: string;
    expiresAt: Date;
  }): boolean {
    if (new Date() > params.expiresAt) {
      return false;
    }
    const computedHash = crypto.createHash("sha256").update(params.plainToken).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(params.storedHash));
  }

  // --------------------------------------------------------------------------
  // Helper: Base32 Byte Decoder
  // --------------------------------------------------------------------------
  private static decodeBase32(str: string): Buffer {
    const cleaned = str.toUpperCase().replace(/=+$/, "");
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      const index = BASE32_ALPHABET.indexOf(char);
      if (index === -1) continue;

      value = (value << 5) | index;
      bits += 5;

      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(bytes);
  }
}
