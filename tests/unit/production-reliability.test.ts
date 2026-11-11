import { AuthSecurityService } from "@/lib/reliability/auth-security";
import { PolicyService } from "@/lib/reliability/policy-service";
import { DataProtectionService } from "@/lib/reliability/data-protection";
import { ReliableJobQueue, IdempotencyService } from "@/lib/reliability/job-queue";
import { CircuitBreaker } from "@/lib/reliability/circuit-breaker";
import { DisasterRecoveryOrchestrator } from "@/lib/reliability/disaster-recovery";
import { CacheService, PaginationHelper } from "@/lib/reliability/cache-service";

describe("Production-Grade Reliability & Security Unit Tests", () => {
  beforeEach(() => {
    ReliableJobQueue.resetQueue();
    IdempotencyService.clear();
    CacheService.clear();
    DisasterRecoveryOrchestrator.clear();
  });

  describe("1. Authentication Security (MFA, Brute Force & Password Reset)", () => {
    it("should generate a valid Base32 secret and verify TOTP code within window", () => {
      const secret = AuthSecurityService.generateTotpSecret(20);
      expect(secret).toMatch(/^[A-Z2-7]{20}$/);

      const code = AuthSecurityService.computeTotp(secret);
      expect(code).toMatch(/^\d{6}$/);

      const isValid = AuthSecurityService.verifyTotp({ secret, token: code });
      expect(isValid).toBe(true);

      const isInvalid = AuthSecurityService.verifyTotp({ secret, token: "999999" });
      expect(isInvalid).toBe(false);
    });

    it("should generate and burn single-use emergency backup recovery codes", () => {
      const { plainCodes, hashedCodes } = AuthSecurityService.generateBackupCodes(5);
      expect(plainCodes).toHaveLength(5);
      expect(hashedCodes).toHaveLength(5);

      const codeToUse = plainCodes[0];
      const result1 = AuthSecurityService.verifyBackupCode(codeToUse, hashedCodes);
      expect(result1.isValid).toBe(true);
      expect(result1.remainingHashes).toHaveLength(4);

      // Re-using the same burned code must fail
      const result2 = AuthSecurityService.verifyBackupCode(codeToUse, result1.remainingHashes);
      expect(result2.isValid).toBe(false);
    });

    it("should trigger account lockout after 5 consecutive failed login attempts", () => {
      // 1st to 4th failures
      for (let i = 0; i < 4; i++) {
        const attempt = AuthSecurityService.evaluateLoginAttempt(i);
        expect(attempt.isLocked).toBe(false);
        expect(attempt.lockoutUntil).toBeNull();
        expect(attempt.remainingAttemptsBeforeLockout).toBe(4 - i);
      }

      // 5th failure trips lockout
      const fifthAttempt = AuthSecurityService.evaluateLoginAttempt(4);
      expect(fifthAttempt.isLocked).toBe(true);
      expect(fifthAttempt.lockoutUntil).not.toBeNull();
      expect(fifthAttempt.remainingAttemptsBeforeLockout).toBe(0);
    });

    it("should verify cryptographically secure password reset token expiration", () => {
      const { plainToken, tokenHash, expiresAt } = AuthSecurityService.generatePasswordResetToken();
      expect(plainToken).toContain("sfg_pw_");

      const isValid = AuthSecurityService.verifyPasswordResetToken({
        plainToken,
        storedHash: tokenHash,
        expiresAt
      });
      expect(isValid).toBe(true);

      const isExpired = AuthSecurityService.verifyPasswordResetToken({
        plainToken,
        storedHash: tokenHash,
        expiresAt: new Date(Date.now() - 1000)
      });
      expect(isExpired).toBe(false);
    });
  });

  describe("2. Authorization & Strict Row-Level Tenant Isolation", () => {
    const tenantAContext = {
      userId: "usr_alice",
      organizationId: "org_alpha",
      role: "OWNER" as const
    };

    it("should strictly reject cross-tenant resource access and flag a security violation", () => {
      const authResult = PolicyService.authorize({
        context: tenantAContext,
        action: "EDIT_PROJECT",
        resourceOrganizationId: "org_beta" // Different tenant!
      });

      expect(authResult.allowed).toBe(false);
      expect(authResult.securityViolation).toBe(true);
      expect(authResult.reason).toContain("Cross-tenant access forbidden");
    });

    it("should enforce RBAC matrix within the same tenant", () => {
      const viewerContext = {
        userId: "usr_bob",
        organizationId: "org_alpha",
        role: "VIEWER" as const
      };

      // Viewer cannot edit projects
      const viewerResult = PolicyService.authorize({
        context: viewerContext,
        action: "EDIT_PROJECT",
        resourceOrganizationId: "org_alpha"
      });
      expect(viewerResult.allowed).toBe(false);

      // Owner can edit projects
      const ownerResult = PolicyService.authorize({
        context: tenantAContext,
        action: "EDIT_PROJECT",
        resourceOrganizationId: "org_alpha"
      });
      expect(ownerResult.allowed).toBe(true);
    });

    it("should enforce organizationId scoping in all database queries", () => {
      const scoped = PolicyService.scopeQuery("org_alpha", { status: "ACTIVE" });
      expect(scoped.organizationId).toBe("org_alpha");
      expect(scoped.status).toBe("ACTIVE");

      expect(() => PolicyService.scopeQuery("", { id: "1" })).toThrow();
    });
  });

  describe("3. Data Protection (AES-256-GCM & Sensitive Data Redaction)", () => {
    it("should encrypt and decrypt fields with authenticated integrity tag", () => {
      const secret = "test_symmetric_encryption_key_32_bytes!!";
      const plaintext = "sk_live_very_sensitive_api_secret_key_99";

      const encrypted = DataProtectionService.encryptField(plaintext, secret);
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();

      const decrypted = DataProtectionService.decryptField(encrypted, secret);
      expect(decrypted).toBe(plaintext);
    });

    it("should throw an authentication error when ciphertext or tag is tampered", () => {
      const secret = "test_symmetric_encryption_key_32_bytes!!";
      const encrypted = DataProtectionService.encryptField("secret_text", secret);

      // Corrupt tag
      const tampered = { ...encrypted, tag: Buffer.alloc(16).toString("base64") };
      expect(() => DataProtectionService.decryptField(tampered, secret)).toThrow();
    });

    it("should recursively redact sensitive fields from objects and logs", () => {
      const unredacted = {
        username: "marcus",
        password: "SuperSecretPassword123!",
        nested: {
          apiKey: "sk_live_12345",
          email: "marcus@specforge.com"
        }
      };

      const redacted = DataProtectionService.redactSensitiveData(unredacted);
      expect(redacted.password).toBe("[REDACTED]");
      expect(redacted.nested.apiKey).toBe("[REDACTED]");
      expect(redacted.nested.email).toBe("marcus@specforge.com");
      expect(redacted.username).toBe("marcus");
    });
  });

  describe("4. Reliable Background-Job Queue & Dead-Letter Queue (DLQ)", () => {
    it("should enqueue and dequeue jobs respecting priority order", async () => {
      await ReliableJobQueue.enqueue({
        organizationId: "org_alpha",
        jobType: "LOW_PRIO",
        payload: { task: 1 },
        priority: 1
      });

      await ReliableJobQueue.enqueue({
        organizationId: "org_alpha",
        jobType: "HIGH_PRIO",
        payload: { task: 2 },
        priority: 10
      });

      const firstDeq = await ReliableJobQueue.dequeue("worker-1");
      expect(firstDeq?.jobType).toBe("HIGH_PRIO");

      const secondDeq = await ReliableJobQueue.dequeue("worker-2");
      expect(secondDeq?.jobType).toBe("LOW_PRIO");
    });

    it("should route failed jobs to the Dead-Letter Queue after exceeding maxAttempts", async () => {
      const job = await ReliableJobQueue.enqueue({
        organizationId: "org_alpha",
        jobType: "WEBHOOK_DISPATCH",
        payload: { url: "https://down.upstream.com" },
        maxAttempts: 2
      });

      const deq1 = await ReliableJobQueue.dequeue("worker-1");
      expect(deq1?.attempts).toBe(1);

      const fail1 = await ReliableJobQueue.markFailed({
        jobId: job.id,
        error: new Error("Connection timed out"),
        baseDelayMs: 0
      });
      expect(fail1.isDeadLetter).toBe(false);
      job.nextRunAt = new Date(Date.now() - 1000);

      const deq2 = await ReliableJobQueue.dequeue("worker-1");
      expect(deq2?.attempts).toBe(2);

      const fail2 = await ReliableJobQueue.markFailed({
        jobId: job.id,
        error: new Error("Upstream 503 Service Unavailable"),
        baseDelayMs: 0
      });
      expect(fail2.isDeadLetter).toBe(true);

      const dlq = ReliableJobQueue.listDeadLetters("org_alpha");
      expect(dlq).toHaveLength(1);
      expect(dlq[0].status).toBe("DEAD_LETTER");

      // Test manual replay
      const replayed = await ReliableJobQueue.replayDeadLetter(job.id);
      expect(replayed.status).toBe("PENDING");
      expect(replayed.attempts).toBe(0);
    });
  });

  describe("5. Circuit Breaker for External Integrations", () => {
    it("should trip to OPEN after consecutive failures and fast-fail or execute fallback", async () => {
      const breaker = new CircuitBreaker("JiraAPI", {
        failureThreshold: 3,
        cooldownPeriodMs: 5000
      });

      expect(breaker.getState()).toBe("CLOSED");

      const failingCall = () => Promise.reject(new Error("504 Gateway Timeout"));

      // 3 consecutive failures
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(failingCall)).rejects.toThrow();
      }

      // Breaker is now OPEN
      expect(breaker.getState()).toBe("OPEN");

      // Next call fast-fails immediately or triggers fallback
      const fallbackResult = await breaker.execute(
        failingCall,
        () => "OFFLINE_FALLBACK_RECORD"
      );
      expect(fallbackResult).toBe("OFFLINE_FALLBACK_RECORD");
    });
  });

  describe("6. Idempotent Operations", () => {
    it("should prevent duplicate execution and return cached response", () => {
      const key = "idem_tx_12345";
      const hash = IdempotencyService.computeRequestHash({ amount: 500, client: "Acme" });

      const check1 = IdempotencyService.check(key, hash);
      expect(check1.isDuplicate).toBe(false);

      // In flight check
      const check2 = IdempotencyService.check(key, hash);
      expect(check2.isDuplicate).toBe(true);
      expect(check2.isProcessing).toBe(true);

      // Complete execution
      IdempotencyService.storeResult(key, 201, { success: true, transactionId: "tx_99" });

      // Repeat request
      const check3 = IdempotencyService.check(key, hash);
      expect(check3.isDuplicate).toBe(true);
      expect(check3.isProcessing).toBe(false);
      expect(check3.cachedResponse?.statusCode).toBe(201);
      expect(check3.cachedResponse?.body.transactionId).toBe("tx_99");
    });
  });

  describe("7. Disaster Recovery & Snapshot Integrity", () => {
    it("should create snapshot with SHA-256 checksum and pass integrity test", async () => {
      const dataset = {
        users: [{ id: "usr-1", name: "Alice" }],
        projects: [{ id: "proj-1", title: "Portal" }]
      };

      const snapshot = await DisasterRecoveryOrchestrator.createSnapshot({
        organizationId: "org_alpha",
        dataset
      });

      expect(snapshot.checksumSha256).toBeDefined();

      const verification = await DisasterRecoveryOrchestrator.verifyBackupIntegrity(snapshot.snapshotId);
      expect(verification.isValid).toBe(true);
      expect(verification.recordCounts.users).toBe(1);
      expect(verification.recordCounts.projects).toBe(1);
    });
  });
});
