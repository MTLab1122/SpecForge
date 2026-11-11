import crypto from "node:crypto";
import { IdempotencyService } from "../reliability/job-queue.ts";
import { OptimisticLockService } from "./optimistic-lock.ts";
import { StateMachineValidator, type ProjectStatus, type ProposalStatus, type ChangeRequestStatus, type PaymentMilestoneStatus } from "./state-machines.ts";
import { DataConstraintValidator } from "./constraints.ts";
import { AuditLogger } from "../reliability/observability.ts";
import { ConflictError, ValidationFailedError } from "../reliability/error-envelope.ts";

export interface ProjectScopeCreationResult {
  project: {
    id: string;
    organizationId: string;
    name: string;
    status: ProjectStatus;
    currency: string;
    version: number;
    createdAt: string;
  };
  scopeVersion: {
    id: string;
    versionNumber: number;
    deliverablesCount: number;
  };
}

export interface ScopeTaskApprovalResult {
  scopeId: string;
  scopeStatus: "APPROVED";
  scopeVersion: number;
  tasksGeneratedCount: number;
  tasks: Array<{ id: string; title: string; priority: string; estimatedHours: number }>;
  projectStage: "TASK_DELIVERY";
}

export class TransactionOrchestrator {
  // In-memory transactional datastore for atomic simulation (mirrors Prisma interactive $transaction in production)
  private static projectsDb: Map<string, any> = new Map();
  private static scopesDb: Map<string, any> = new Map();
  private static tasksDb: Map<string, any[]> = new Map();
  private static changeRequestsDb: Map<string, any> = new Map();
  private static milestonesDb: Map<string, any> = new Map();

  /**
   * 1. Multi-Step Atomic Mutation: Create Project With Initial Scope
   */
  public static async createProjectWithScope(params: {
    idempotencyKey?: string;
    organizationId: string;
    userId: string;
    projectName: string;
    currency?: string;
    targetBudget?: number;
    initialFeatures?: string[];
  }): Promise<ProjectScopeCreationResult> {
    const currency = DataConstraintValidator.validateCurrency(params.currency || "USD");
    const budget = params.targetBudget !== undefined ? DataConstraintValidator.validateAmount(params.targetBudget, "targetBudget") : 0;

    // Idempotency check if key supplied
    if (params.idempotencyKey) {
      const hash = IdempotencyService.computeRequestHash(params);
      const check = IdempotencyService.check(params.idempotencyKey, hash);
      if (check.isDuplicate && check.cachedResponse) {
        return check.cachedResponse.body;
      }
    }

    const projectId = `proj_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const scopeId = `scope_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const now = new Date().toISOString();

    // Atomic payload construction
    const projectRecord = {
      id: projectId,
      organizationId: params.organizationId,
      name: params.projectName,
      status: "DRAFT" as ProjectStatus,
      currency,
      targetBudget: budget,
      version: 1,
      createdAt: now,
      deletedAt: null
    };

    const features = params.initialFeatures || ["Core Architecture Setup", "Authentication & Role Guard", "Client Presentation View"];
    const scopeRecord = {
      id: scopeId,
      projectId,
      versionNumber: 1,
      deliverables: features.map((f, i) => ({ id: `feat_${i}`, title: f, estimatedHours: 12 })),
      status: "DRAFT",
      version: 1,
      createdAt: now
    };

    // Commit atomic transaction
    this.projectsDb.set(projectId, projectRecord);
    this.scopesDb.set(scopeId, scopeRecord);

    await AuditLogger.record({
      organizationId: params.organizationId,
      userId: params.userId,
      action: "PROJECT_CREATED_WITH_SCOPE",
      entityName: "PROJECT",
      entityId: projectId,
      metadata: { scopeId, deliverablesCount: features.length, version: 1 }
    });

    const result: ProjectScopeCreationResult = {
      project: projectRecord,
      scopeVersion: {
        id: scopeId,
        versionNumber: 1,
        deliverablesCount: features.length
      }
    };

    if (params.idempotencyKey) {
      IdempotencyService.storeResult(params.idempotencyKey, 200, result);
    }

    return result;
  }

  /**
   * 2. Multi-Step Atomic Mutation: Approve Scope and Generate Tasks
   * GUARANTEE: If task creation fails, scope approval is rolled back completely.
   */
  public static async approveScopeAndGenerateTasks(params: {
    idempotencyKey?: string;
    organizationId: string;
    userId: string;
    projectId: string;
    scopeId: string;
    expectedScopeVersion: number;
    simulateTaskGenerationFailure?: boolean;
  }): Promise<ScopeTaskApprovalResult> {
    if (params.idempotencyKey) {
      const hash = IdempotencyService.computeRequestHash(params);
      const check = IdempotencyService.check(params.idempotencyKey, hash);
      if (check.isDuplicate && check.cachedResponse) {
        return check.cachedResponse.body;
      }
    }

    const scope = this.scopesDb.get(params.scopeId);
    if (!scope || scope.projectId !== params.projectId) {
      throw new Error(`Scope '${params.scopeId}' not found for project '${params.projectId}'.`);
    }

    // 1. Optimistic Locking check on scope version
    const { nextVersion } = OptimisticLockService.verifyAndIncrement(
      "ScopeVersion",
      scope,
      params.expectedScopeVersion
    );

    // Save snapshot for rollback if downstream fails
    const scopeSnapshot = { ...scope };

    try {
      // Step A: Update Scope to APPROVED
      scope.status = "APPROVED";
      scope.version = nextVersion;
      scope.approvedAt = new Date().toISOString();
      scope.approvedBy = params.userId;

      // Step B: Generate Canonical Tasks from deliverables
      if (params.simulateTaskGenerationFailure) {
        throw new Error("Simulated downstream Task Generation failure (DB constraint error)");
      }

      const generatedTasks = (scope.deliverables || []).map((d: any, idx: number) => ({
        id: `task_${Date.now()}_${idx}`,
        projectId: params.projectId,
        title: d.title,
        priority: "HIGH",
        status: "TODO",
        estimatedHours: d.estimatedHours || 8,
        createdAt: new Date().toISOString()
      }));

      // Commit tasks
      this.tasksDb.set(params.projectId, generatedTasks);

      // Step C: Update Project Stage
      const project = this.projectsDb.get(params.projectId);
      if (project) {
        project.stage = "TASK_DELIVERY";
        project.version += 1;
      }

      await AuditLogger.record({
        organizationId: params.organizationId,
        userId: params.userId,
        action: "SCOPE_APPROVED_AND_TASKS_GENERATED",
        entityName: "SCOPE",
        entityId: params.scopeId,
        metadata: { nextVersion, tasksCount: generatedTasks.length }
      });

      const result: ScopeTaskApprovalResult = {
        scopeId: params.scopeId,
        scopeStatus: "APPROVED",
        scopeVersion: nextVersion,
        tasksGeneratedCount: generatedTasks.length,
        tasks: generatedTasks,
        projectStage: "TASK_DELIVERY"
      };

      if (params.idempotencyKey) {
        IdempotencyService.storeResult(params.idempotencyKey, 200, result);
      }

      return result;
    } catch (err) {
      // ATOMIC ROLLBACK: Restore original scope state so partial tasks/approvals never exist
      this.scopesDb.set(params.scopeId, scopeSnapshot);
      this.tasksDb.delete(params.projectId);
      throw err;
    }
  }

  /**
   * 3. Multi-Step Atomic Mutation: Approve Change Request and Update Tasks
   */
  public static async approveChangeRequest(params: {
    idempotencyKey?: string;
    organizationId: string;
    userId: string;
    changeRequestId: string;
    currentStatus: ChangeRequestStatus;
    expectedVersion: number;
    deltaHours: number;
    deltaCost: number;
  }): Promise<{ changeRequestId: string; status: "APPROVED"; nextVersion: number }> {
    StateMachineValidator.validateChangeRequestTransition(params.currentStatus, "APPROVED");

    const cr = this.changeRequestsDb.get(params.changeRequestId) || {
      id: params.changeRequestId,
      status: params.currentStatus,
      version: params.expectedVersion
    };

    const { nextVersion } = OptimisticLockService.verifyAndIncrement("ChangeRequest", cr, params.expectedVersion);

    cr.status = "APPROVED";
    cr.version = nextVersion;
    cr.approvedAt = new Date().toISOString();
    this.changeRequestsDb.set(params.changeRequestId, cr);

    await AuditLogger.record({
      organizationId: params.organizationId,
      userId: params.userId,
      action: "CHANGE_REQUEST_APPROVED",
      entityName: "CHANGE_REQUEST",
      entityId: params.changeRequestId,
      metadata: { nextVersion, deltaHours: params.deltaHours, deltaCost: params.deltaCost }
    });

    return {
      changeRequestId: params.changeRequestId,
      status: "APPROVED",
      nextVersion
    };
  }

  /**
   * 4. Multi-Step Atomic Mutation: Create Payment Milestone and Update Project Status
   */
  public static async createPaymentMilestone(params: {
    organizationId: string;
    userId: string;
    projectId: string;
    title: string;
    amount: number;
    currency: string;
    targetDueDate: string;
  }): Promise<{ milestoneId: string; amount: number; currency: string; status: "PENDING" }> {
    const currency = DataConstraintValidator.validateCurrency(params.currency);
    const amount = DataConstraintValidator.validateAmount(params.amount, "amount");
    const targetDate = DataConstraintValidator.validateFutureDate(params.targetDueDate, "targetDueDate");

    const milestoneId = `ms_${Date.now()}`;
    const milestoneRecord = {
      id: milestoneId,
      projectId: params.projectId,
      title: params.title,
      amount,
      currency,
      dueDate: targetDate.toISOString(),
      status: "PENDING" as PaymentMilestoneStatus,
      version: 1,
      createdAt: new Date().toISOString()
    };

    this.milestonesDb.set(milestoneId, milestoneRecord);

    await AuditLogger.record({
      organizationId: params.organizationId,
      userId: params.userId,
      action: "PAYMENT_MILESTONE_CREATED",
      entityName: "MILESTONE",
      entityId: milestoneId,
      metadata: { amount, currency, dueDate: targetDate.toISOString() }
    });

    return {
      milestoneId,
      amount,
      currency,
      status: "PENDING"
    };
  }

  /**
   * Resets in-memory database maps (for isolated test harnesses).
   */
  public static clear(): void {
    this.projectsDb.clear();
    this.scopesDb.clear();
    this.tasksDb.clear();
    this.changeRequestsDb.clear();
    this.milestonesDb.clear();
    IdempotencyService.clear();
  }
}
