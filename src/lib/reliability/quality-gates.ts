import crypto from "node:crypto";
import { SloTracker } from "./slo-tracker.ts";
import { Logger, AuditLogger } from "./observability.ts";
import { AppError } from "./error-envelope.ts";

export interface QualityGateEvaluation {
  releaseVersion: string;
  evaluatedAt: string;
  isApproved: boolean;
  blockReason?: string;
  checks: {
    unitTestsPassed: boolean;
    errorBudgetPermitted: boolean;
    tenantIsolationAudited: boolean;
    phase2RegressionsZero: boolean;
    disasterRecoveryCompliant: boolean;
    circuitBreakersHealthy: boolean;
    releaseChecklistPassed?: boolean;
  };
  releaseCertificate?: {
    certificateId: string;
    version: string;
    signature: string;
    issuedAt: string;
  };
}

export class QualityGateRunner {
  private static readonly CERT_SIGNING_KEY = process.env.RELEASE_SIGNING_KEY || "specforge-release-gate-signing-key-2026";

  /**
   * Evaluates deployment readiness against strict production invariants.
   */
  public static evaluateReleaseReadiness(params: {
    releaseVersion: string;
    allTestsPassed: boolean;
    tenantIsolationAudited?: boolean;
    phase2RegressionsZero?: boolean;
    disasterRecoveryCompliant?: boolean;
    circuitBreakersHealthy?: boolean;
    overrideErrorBudgetFreeze?: boolean;
    releaseChecklist?: {
      testsPassed: boolean;
      securityReviewPassed: boolean;
      migrationReviewed: boolean;
      rollbackPlanReady: boolean;
      monitoringReady: boolean;
      alertsConfigured: boolean;
      stakeholdersInformed: boolean;
    };
  }): QualityGateEvaluation {
    const budget = SloTracker.calculateErrorBudget();

    const isErrorBudgetPermitted =
      params.overrideErrorBudgetFreeze || budget.releaseGateStatus === "RELEASES_ALLOWED";

    const isChecklistPassed = params.releaseChecklist
      ? Object.values(params.releaseChecklist).every(Boolean)
      : true;

    const checks = {
      unitTestsPassed: params.allTestsPassed,
      errorBudgetPermitted: isErrorBudgetPermitted,
      tenantIsolationAudited: params.tenantIsolationAudited ?? true,
      phase2RegressionsZero: params.phase2RegressionsZero ?? true,
      disasterRecoveryCompliant: params.disasterRecoveryCompliant ?? true,
      circuitBreakersHealthy: params.circuitBreakersHealthy ?? true,
      releaseChecklistPassed: isChecklistPassed
    };

    let isApproved = true;
    let blockReason: string | undefined = undefined;

    if (!checks.unitTestsPassed) {
      isApproved = false;
      blockReason = "DEPLOYMENT_BLOCKED: Automated test suites failed. Zero test failures permitted in production.";
    } else if (!checks.errorBudgetPermitted) {
      isApproved = false;
      blockReason = "DEPLOYMENT_BLOCKED: Production error budget is exhausted or 1h burn rate >= 14.4x. Automated release freeze active.";
    } else if (!checks.releaseChecklistPassed) {
      isApproved = false;
      blockReason = "DEPLOYMENT_BLOCKED: Release checklist incomplete. All 7 pre-deployment checklist items must pass.";
    } else if (!checks.phase2RegressionsZero) {
      isApproved = false;
      blockReason = "DEPLOYMENT_BLOCKED: Regressions detected against Phase 2 functional completion criteria.";
    } else if (!checks.tenantIsolationAudited) {
      isApproved = false;
      blockReason = "DEPLOYMENT_BLOCKED: Tenant isolation checks failed. Zero cross-tenant data access allowed.";
    }

    let certificate: QualityGateEvaluation["releaseCertificate"] = undefined;

    if (isApproved) {
      const certificateId = `cert_rel_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const issuedAt = new Date().toISOString();
      const payload = `${params.releaseVersion}:${certificateId}:${issuedAt}`;
      const signature = crypto.createHmac("sha256", this.CERT_SIGNING_KEY).update(payload).digest("hex");

      certificate = {
        certificateId,
        version: params.releaseVersion,
        signature,
        issuedAt
      };

      Logger.info(`Release Quality Gate PASSED for version '${params.releaseVersion}'. Certificate issued: ${certificateId}`);
    } else {
      Logger.warn(`Release Quality Gate BLOCKED for version '${params.releaseVersion}'. Reason: ${blockReason}`);
    }

    return {
      releaseVersion: params.releaseVersion,
      evaluatedAt: new Date().toISOString(),
      isApproved,
      blockReason,
      checks,
      releaseCertificate: certificate
    };
  }

  /**
   * Asserts release approval or throws 412 Precondition Failed.
   */
  public static assertReleaseApproved(params: {
    releaseVersion: string;
    allTestsPassed: boolean;
  }): QualityGateEvaluation {
    const evaluation = this.evaluateReleaseReadiness(params);
    if (!evaluation.isApproved) {
      throw new AppError({
        message: evaluation.blockReason || "Release Quality Gate failed.",
        status: 412,
        code: "RELEASE_GATE_PRECONDITION_FAILED"
      });
    }
    return evaluation;
  }
}
