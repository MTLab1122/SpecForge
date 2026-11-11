import { BillingService, type SubscriptionTier } from "./billing-service.ts";
import { AppError } from "../reliability/error-envelope.ts";
import { AuditLogger, Logger } from "../reliability/observability.ts";

export interface CreditReservation {
  reservationId: string;
  organizationId: string;
  jobId: string;
  amount: number;
  status: "PENDING" | "COMMITTED" | "REFUNDED";
  createdAt: Date;
  updatedAt: Date;
}

export interface JobCostRecord {
  jobId: string;
  organizationId: string;
  jobType: string;
  modelName?: string;
  creditsCharged: number;
  estimatedCostUsd: number;
  inputTokens?: number;
  outputTokens?: number;
  status: "COMMITTED" | "REFUNDED";
  timestamp: string;
}

export interface WorkspaceCostSummary {
  organizationId: string;
  tier: SubscriptionTier;
  monthlyQuota: number;
  creditsUsed: number;
  creditsReserved: number;
  remainingCredits: number;
  utilizationPercent: number;
  renewsAt: string;
  recentCostHistory: JobCostRecord[];
}

export class CreditLedger {
  private static reservations: Map<string, CreditReservation> = new Map();
  private static costLedger: JobCostRecord[] = [];

  /**
   * Checks whether the workspace has sufficient available credits.
   */
  public static checkBalance(
    organizationId: string,
    requiredCredits: number
  ): { hasBalance: boolean; remaining: number; quota: number; reserved: number } {
    const summary = BillingService.getCreditSummary(organizationId);
    const activeReserved = this.getActiveReservedCredits(organizationId);
    const available = Math.max(0, summary.remainingCredits - activeReserved);

    return {
      hasBalance: available >= requiredCredits,
      remaining: available,
      quota: summary.monthlyQuota,
      reserved: activeReserved
    };
  }

  /**
   * Sums active pending reservations for an organization.
   */
  public static getActiveReservedCredits(organizationId: string): number {
    let sum = 0;
    for (const r of this.reservations.values()) {
      if (r.organizationId === organizationId && r.status === "PENDING") {
        sum += r.amount;
      }
    }
    return sum;
  }

  /**
   * Reserves credits before executing a job.
   * Throws 402 Payment Required if insufficient balance or hard plan limit exceeded.
   */
  public static reserveCredits(params: {
    organizationId: string;
    jobId: string;
    amount: number;
  }): CreditReservation {
    if (params.amount <= 0) {
      const reservation: CreditReservation = {
        reservationId: `res_zero_${params.jobId}`,
        organizationId: params.organizationId,
        jobId: params.jobId,
        amount: 0,
        status: "COMMITTED",
        createdAt: new Date(),
        updatedAt: new Date()
      };
      return reservation;
    }

    const { hasBalance, remaining, quota } = this.checkBalance(params.organizationId, params.amount);

    if (!hasBalance) {
      throw new AppError({
        message: `Insufficient AI credits for workspace '${params.organizationId}'. Required: ${params.amount}, Available: ${remaining} (Monthly Quota: ${quota}). Please upgrade plan or purchase top-up credits.`,
        status: 402,
        code: "INSUFFICIENT_AI_CREDITS"
      });
    }

    const reservationId = `res_${Date.now()}_${params.jobId}`;
    const reservation: CreditReservation = {
      reservationId,
      organizationId: params.organizationId,
      jobId: params.jobId,
      amount: params.amount,
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.reservations.set(params.jobId, reservation);

    Logger.info(`Reserved ${params.amount} AI credits for job '${params.jobId}'`, {
      organizationId: params.organizationId,
      context: { reservationId, remainingAfterHold: remaining - params.amount }
    });

    return reservation;
  }

  /**
   * Commits the credit reservation upon successful job completion.
   */
  public static async commitReservation(params: {
    organizationId: string;
    jobId: string;
    actualAmount?: number;
    jobType?: string;
    modelName?: string;
    inputTokens?: number;
    outputTokens?: number;
    estimatedCostUsd?: number;
  }): Promise<{ committedAmount: number; newRemaining: number }> {
    const reservation = this.reservations.get(params.jobId);
    const amountToCommit = params.actualAmount !== undefined ? params.actualAmount : reservation ? reservation.amount : 0;

    if (reservation) {
      reservation.status = "COMMITTED";
      reservation.amount = amountToCommit;
      reservation.updatedAt = new Date();
    }

    // Permanently record consumed credits in BillingService
    const current = BillingService.getCreditSummary(params.organizationId);
    BillingService.changePlan({
      organizationId: params.organizationId,
      targetTier: current.tier,
      action: "UPGRADE" // retains tier but updates in-memory map
    });

    // Directly increment creditsUsed
    const internalBilling = (BillingService as any).mockOrgBilling?.get(params.organizationId);
    if (internalBilling) {
      internalBilling.creditsUsed += amountToCommit;
    }

    // Record in Cost History ledger
    const costRecord: JobCostRecord = {
      jobId: params.jobId,
      organizationId: params.organizationId,
      jobType: params.jobType || "AI_EXTRACTION",
      modelName: params.modelName,
      creditsCharged: amountToCommit,
      estimatedCostUsd: params.estimatedCostUsd || (amountToCommit * 0.015),
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      status: "COMMITTED",
      timestamp: new Date().toISOString()
    };
    this.costLedger.unshift(costRecord);

    await AuditLogger.record({
      organizationId: params.organizationId,
      action: "AI_CREDITS_CONSUMED",
      entityName: "JOB",
      entityId: params.jobId,
      metadata: { creditsCharged: amountToCommit, modelName: params.modelName }
    });

    const newSummary = BillingService.getCreditSummary(params.organizationId);
    return {
      committedAmount: amountToCommit,
      newRemaining: newSummary.remainingCredits
    };
  }

  /**
   * Refunds / releases the reserved credits upon job failure.
   */
  public static async refundReservation(params: {
    organizationId: string;
    jobId: string;
    reason: string;
  }): Promise<{ refundedAmount: number }> {
    const reservation = this.reservations.get(params.jobId);
    if (!reservation || reservation.status !== "PENDING") {
      return { refundedAmount: 0 };
    }

    reservation.status = "REFUNDED";
    reservation.updatedAt = new Date();

    const costRecord: JobCostRecord = {
      jobId: params.jobId,
      organizationId: params.organizationId,
      jobType: "AI_EXTRACTION",
      creditsCharged: 0,
      estimatedCostUsd: 0,
      status: "REFUNDED",
      timestamp: new Date().toISOString()
    };
    this.costLedger.unshift(costRecord);

    await AuditLogger.record({
      organizationId: params.organizationId,
      action: "AI_CREDITS_REFUNDED",
      entityName: "JOB",
      entityId: params.jobId,
      metadata: { refundedAmount: reservation.amount, reason: params.reason }
    });

    Logger.info(`Refunded ${reservation.amount} credits for failed job '${params.jobId}': ${params.reason}`, {
      organizationId: params.organizationId
    });

    return { refundedAmount: reservation.amount };
  }

  /**
   * Returns complete cost and credit usage breakdown for the workspace owner.
   */
  public static getWorkspaceCostSummary(organizationId: string): WorkspaceCostSummary {
    const summary = BillingService.getCreditSummary(organizationId);
    const activeReserved = this.getActiveReservedCredits(organizationId);
    const recentHistory = this.costLedger
      .filter((c) => c.organizationId === organizationId)
      .slice(0, 20);

    return {
      organizationId,
      tier: summary.tier,
      monthlyQuota: summary.monthlyQuota,
      creditsUsed: summary.creditsUsed,
      creditsReserved: activeReserved,
      remainingCredits: Math.max(0, summary.remainingCredits - activeReserved),
      utilizationPercent: summary.utilizationPercent,
      renewsAt: summary.renewsAt,
      recentCostHistory: recentHistory
    };
  }

  /**
   * Clears in-memory ledger (for tests).
   */
  public static clear(): void {
    this.reservations.clear();
    this.costLedger = [];
  }
}
