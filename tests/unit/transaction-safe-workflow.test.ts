import { TransactionOrchestrator } from "@/lib/transactions/workflow-orchestrator";
import { StateMachineValidator, InvalidStateTransitionError } from "@/lib/transactions/state-machines";
import { DataConstraintValidator, ValidationError } from "@/lib/transactions/constraints";
import { OptimisticLockService } from "@/lib/transactions/optimistic-lock";
import { ConflictError } from "@/lib/reliability/error-envelope";
import { AuditLogger } from "@/lib/reliability/observability";

describe("Transaction-Safe Core Workflow & Data Integrity Suite", () => {
  beforeEach(() => {
    TransactionOrchestrator.clear();
    AuditLogger.clear();
  });

  describe("1. Multi-Step Atomic Mutations & Rollback Safety", () => {
    it("should atomically create project and initial scope deliverables", async () => {
      const result = await TransactionOrchestrator.createProjectWithScope({
        organizationId: "org_alpha",
        userId: "usr_lead",
        projectName: "Enterprise FinTech Re-Architecture",
        currency: "USD",
        targetBudget: 45000,
        initialFeatures: ["OAuth2 / OIDC SSO", "Double-Entry Ledger", "Real-Time Fraud Engine"]
      });

      expect(result.project.id).toBeDefined();
      expect(result.project.organizationId).toBe("org_alpha");
      expect(result.project.name).toBe("Enterprise FinTech Re-Architecture");
      expect(result.project.currency).toBe("USD");
      expect(result.project.status).toBe("DRAFT");
      expect(result.project.version).toBe(1);
      expect(result.scopeVersion.versionNumber).toBe(1);
      expect(result.scopeVersion.deliverablesCount).toBe(3);

      const logs = AuditLogger.getRecentEvents("org_alpha");
      expect(logs.some(l => l.action === "PROJECT_CREATED_WITH_SCOPE")).toBe(true);
    });

    it("should atomically approve scope and generate canonical tasks", async () => {
      const init = await TransactionOrchestrator.createProjectWithScope({
        organizationId: "org_alpha",
        userId: "usr_lead",
        projectName: "Mobile App MVP",
        currency: "EUR",
        targetBudget: 25000,
        initialFeatures: ["Biometric Login", "Push Notifications"]
      });

      const approval = await TransactionOrchestrator.approveScopeAndGenerateTasks({
        organizationId: "org_alpha",
        userId: "usr_client",
        projectId: init.project.id,
        scopeId: init.scopeVersion.id,
        expectedScopeVersion: 1
      });

      expect(approval.scopeStatus).toBe("APPROVED");
      expect(approval.scopeVersion).toBe(2);
      expect(approval.tasksGeneratedCount).toBe(2);
      expect(approval.tasks.length).toBe(2);
      expect(approval.projectStage).toBe("TASK_DELIVERY");
    });

    it("should rollback scope approval atomically if downstream task generation fails", async () => {
      const init = await TransactionOrchestrator.createProjectWithScope({
        organizationId: "org_alpha",
        userId: "usr_lead",
        projectName: "Fault-Tolerant Scope Test"
      });

      // Trigger simulated failure in task generation
      await expect(
        TransactionOrchestrator.approveScopeAndGenerateTasks({
          organizationId: "org_alpha",
          userId: "usr_client",
          projectId: init.project.id,
          scopeId: init.scopeVersion.id,
          expectedScopeVersion: 1,
          simulateTaskGenerationFailure: true
        })
      ).rejects.toThrow("Simulated downstream Task Generation failure");

      // Verify that retry with valid state succeeds because version and status rolled back!
      const retryResult = await TransactionOrchestrator.approveScopeAndGenerateTasks({
        organizationId: "org_alpha",
        userId: "usr_client",
        projectId: init.project.id,
        scopeId: init.scopeVersion.id,
        expectedScopeVersion: 1, // original version still valid due to rollback
        simulateTaskGenerationFailure: false
      });

      expect(retryResult.scopeStatus).toBe("APPROVED");
      expect(retryResult.scopeVersion).toBe(2);
      expect(retryResult.tasksGeneratedCount).toBeGreaterThan(0);
    });
  });

  describe("2. Idempotency Key Protection", () => {
    it("should return identical cached result for repeated requests with same idempotency key", async () => {
      const idempotencyKey = "idem_create_proj_9988";
      const payload = {
        idempotencyKey,
        organizationId: "org_beta",
        userId: "usr_admin",
        projectName: "Idempotent Project Launch",
        currency: "GBP",
        targetBudget: 30000
      };

      const firstCall = await TransactionOrchestrator.createProjectWithScope(payload);
      const secondCall = await TransactionOrchestrator.createProjectWithScope(payload);

      expect(secondCall.project.id).toBe(firstCall.project.id);
      expect(secondCall.scopeVersion.id).toBe(firstCall.scopeVersion.id);
      expect(secondCall.project.name).toBe("Idempotent Project Launch");
    });

    it("should reject idempotency key replay if request payload has been altered", async () => {
      const idempotencyKey = "idem_create_proj_conflict";

      await TransactionOrchestrator.createProjectWithScope({
        idempotencyKey,
        organizationId: "org_beta",
        userId: "usr_admin",
        projectName: "Original Safe Project"
      });

      await expect(
        TransactionOrchestrator.createProjectWithScope({
          idempotencyKey,
          organizationId: "org_beta",
          userId: "usr_admin",
          projectName: "Tampered Conflicting Project Name"
        })
      ).rejects.toThrow("Idempotency Conflict");
    });
  });

  describe("3. Optimistic Locking & Concurrency Control", () => {
    it("should successfully increment version on concurrent-safe update", () => {
      const entity = { id: "scope_123", version: 3, title: "Scope V3" };
      const { nextVersion } = OptimisticLockService.verifyAndIncrement("ScopeVersion", entity, 3);
      expect(nextVersion).toBe(4);
    });

    it("should throw 409 ConflictError when version has drifted", () => {
      const entity = { id: "scope_123", version: 4, title: "Scope V4 Modified By Peer" };

      expect(() => {
        OptimisticLockService.verifyAndIncrement("ScopeVersion", entity, 3); // Stale version 3
      }).toThrow(ConflictError);
    });

    it("should execute mutation with lock assertion helper", () => {
      const proposal = { id: "prop_456", version: 1, title: "Draft Proposal", discountPct: 0 };
      const updated = OptimisticLockService.executeWithLock({
        entityName: "Proposal",
        currentEntity: proposal,
        expectedVersion: 1,
        mutation: (nextVer) => ({
          ...proposal,
          discountPct: 10,
          version: nextVer
        })
      });

      expect(updated.version).toBe(2);
      expect(updated.discountPct).toBe(10);
    });
  });

  describe("4. State Machine Transitions", () => {
    describe("Project State Machine", () => {
      it("should permit valid transitions: DRAFT -> ACTIVE -> COMPLETED", () => {
        expect(() => StateMachineValidator.validateProjectTransition("DRAFT", "ACTIVE")).not.toThrow();
        expect(() => StateMachineValidator.validateProjectTransition("ACTIVE", "COMPLETED")).not.toThrow();
      });

      it("should permit valid transitions: ACTIVE -> ON_HOLD -> ACTIVE", () => {
        expect(() => StateMachineValidator.validateProjectTransition("ACTIVE", "ON_HOLD")).not.toThrow();
        expect(() => StateMachineValidator.validateProjectTransition("ON_HOLD", "ACTIVE")).not.toThrow();
      });

      it("should reject invalid transitions: COMPLETED -> ACTIVE (terminal state)", () => {
        expect(() => StateMachineValidator.validateProjectTransition("COMPLETED", "ACTIVE")).toThrow(
          InvalidStateTransitionError
        );
      });

      it("should reject direct DRAFT -> COMPLETED skipping execution", () => {
        expect(() => StateMachineValidator.validateProjectTransition("DRAFT", "COMPLETED")).toThrow(
          InvalidStateTransitionError
        );
      });
    });

    describe("Proposal State Machine", () => {
      it("should permit valid lifecycle: DRAFT -> SENT -> VIEWED -> APPROVED", () => {
        expect(() => StateMachineValidator.validateProposalTransition("DRAFT", "SENT")).not.toThrow();
        expect(() => StateMachineValidator.validateProposalTransition("SENT", "VIEWED")).not.toThrow();
        expect(() => StateMachineValidator.validateProposalTransition("VIEWED", "APPROVED")).not.toThrow();
      });

      it("should reject invalid jump: DRAFT -> APPROVED without client transmission", () => {
        expect(() => StateMachineValidator.validateProposalTransition("DRAFT", "APPROVED")).toThrow(
          InvalidStateTransitionError
        );
      });
    });

    describe("Change Request State Machine", () => {
      it("should permit clarification loop: SENT -> CLARIFICATION_REQUIRED -> REVISED -> SENT -> APPROVED", () => {
        expect(() => StateMachineValidator.validateChangeRequestTransition("SENT", "CLARIFICATION_REQUIRED")).not.toThrow();
        expect(() => StateMachineValidator.validateChangeRequestTransition("CLARIFICATION_REQUIRED", "REVISED")).not.toThrow();
        expect(() => StateMachineValidator.validateChangeRequestTransition("REVISED", "SENT")).not.toThrow();
        expect(() => StateMachineValidator.validateChangeRequestTransition("SENT", "APPROVED")).not.toThrow();
      });

      it("should reject modifying an already APPROVED change request", () => {
        expect(() => StateMachineValidator.validateChangeRequestTransition("APPROVED", "REVISED")).toThrow(
          InvalidStateTransitionError
        );
      });
    });

    describe("Payment Milestone State Machine", () => {
      it("should permit valid progression: PENDING -> INVOICED -> PARTIALLY_PAID -> PAID", () => {
        expect(() => StateMachineValidator.validatePaymentMilestoneTransition("PENDING", "INVOICED")).not.toThrow();
        expect(() => StateMachineValidator.validatePaymentMilestoneTransition("INVOICED", "PARTIALLY_PAID")).not.toThrow();
        expect(() => StateMachineValidator.validatePaymentMilestoneTransition("PARTIALLY_PAID", "PAID")).not.toThrow();
      });

      it("should reject re-invoicing a PAID milestone", () => {
        expect(() => StateMachineValidator.validatePaymentMilestoneTransition("PAID", "INVOICED")).toThrow(
          InvalidStateTransitionError
        );
      });
    });
  });

  describe("5. Data Constraint Validation", () => {
    describe("Currency Validation", () => {
      it("should accept valid ISO 4217 currencies and normalize to uppercase", () => {
        expect(DataConstraintValidator.validateCurrency("usd")).toBe("USD");
        expect(DataConstraintValidator.validateCurrency("EUR")).toBe("EUR");
        expect(DataConstraintValidator.validateCurrency("gbp")).toBe("GBP");
        expect(DataConstraintValidator.validateCurrency("PKR")).toBe("PKR");
      });

      it("should reject unsupported or bogus currency codes", () => {
        expect(() => DataConstraintValidator.validateCurrency("XYZ")).toThrow(ValidationError);
        expect(() => DataConstraintValidator.validateCurrency("")).toThrow(ValidationError);
      });
    });

    describe("Monetary Amount Validation", () => {
      it("should accept non-negative numbers and format to 2 decimal places", () => {
        expect(DataConstraintValidator.validateAmount(1500.5)).toBe(1500.5);
        expect(DataConstraintValidator.validateAmount(0)).toBe(0);
        expect(DataConstraintValidator.validateAmount("250.758")).toBe(250.76);
      });

      it("should reject negative amounts and NaN", () => {
        expect(() => DataConstraintValidator.validateAmount(-50)).toThrow(ValidationError);
        expect(() => DataConstraintValidator.validateAmount("not_a_number")).toThrow(ValidationError);
      });
    });

    describe("Future Date Validation", () => {
      it("should accept valid future date timestamps", () => {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const validated = DataConstraintValidator.validateFutureDate(tomorrow);
        expect(validated.getTime()).toBeGreaterThan(Date.now() - 60000);
      });

      it("should reject dates significantly in the past for new milestones", () => {
        const lastYear = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
        expect(() => DataConstraintValidator.validateFutureDate(lastYear)).toThrow(ValidationError);
      });
    });

    describe("Email & File Validation", () => {
      it("should validate and sanitize correct email addresses", () => {
        expect(DataConstraintValidator.validateEmail("Lead.Dev@SpecForge.com")).toBe("lead.dev@specforge.com");
      });

      it("should reject malformed email strings", () => {
        expect(() => DataConstraintValidator.validateEmail("not-an-email")).toThrow(ValidationError);
        expect(() => DataConstraintValidator.validateEmail("@nodomain.com")).toThrow(ValidationError);
      });

      it("should accept allowed file types within 25MB limit", () => {
        expect(() =>
          DataConstraintValidator.validateFile({
            mimeType: "application/pdf",
            sizeBytes: 15 * 1024 * 1024
          })
        ).not.toThrow();
      });

      it("should reject disallowed mime types and files exceeding 25MB", () => {
        expect(() =>
          DataConstraintValidator.validateFile({
            mimeType: "application/x-msdownload", // .exe
            sizeBytes: 1024
          })
        ).toThrow(ValidationError);

        expect(() =>
          DataConstraintValidator.validateFile({
            mimeType: "application/pdf",
            sizeBytes: 30 * 1024 * 1024 // 30MB
          })
        ).toThrow(ValidationError);
      });
    });
  });
});
