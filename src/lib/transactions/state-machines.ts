export type ProjectStatus = "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
export type ProposalStatus = "DRAFT" | "SENT" | "VIEWED" | "REVISED" | "APPROVED" | "REJECTED";
export type ChangeRequestStatus = "DRAFT" | "SENT" | "CLARIFICATION_REQUIRED" | "REVISED" | "APPROVED" | "REJECTED";
export type PaymentMilestoneStatus = "PENDING" | "INVOICED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";

export class InvalidStateTransitionError extends Error {
  public readonly entityName: string;
  public readonly currentStatus: string;
  public readonly targetStatus: string;
  public readonly allowedTransitions: string[];

  constructor(entityName: string, currentStatus: string, targetStatus: string, allowedTransitions: string[]) {
    super(
      `Invalid ${entityName} state transition from '${currentStatus}' to '${targetStatus}'. Permitted transitions: [${allowedTransitions.join(", ")}].`
    );
    this.name = "InvalidStateTransitionError";
    this.entityName = entityName;
    this.currentStatus = currentStatus;
    this.targetStatus = targetStatus;
    this.allowedTransitions = allowedTransitions;
  }
}

export class StateMachineValidator {
  private static readonly PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
    DRAFT: ["ACTIVE", "CANCELLED"],
    ACTIVE: ["ON_HOLD", "COMPLETED", "CANCELLED"],
    ON_HOLD: ["ACTIVE", "CANCELLED"],
    COMPLETED: [], // Terminal
    CANCELLED: []  // Terminal
  };

  private static readonly PROPOSAL_TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
    DRAFT: ["SENT"],
    SENT: ["VIEWED", "REVISED", "REJECTED"],
    VIEWED: ["REVISED", "APPROVED", "REJECTED"],
    REVISED: ["SENT"],
    APPROVED: [], // Terminal
    REJECTED: []  // Terminal
  };

  private static readonly CHANGE_REQUEST_TRANSITIONS: Record<ChangeRequestStatus, ChangeRequestStatus[]> = {
    DRAFT: ["SENT"],
    SENT: ["APPROVED", "REJECTED", "CLARIFICATION_REQUIRED"],
    CLARIFICATION_REQUIRED: ["REVISED"],
    REVISED: ["SENT"],
    APPROVED: [], // Terminal
    REJECTED: []  // Terminal
  };

  private static readonly PAYMENT_MILESTONE_TRANSITIONS: Record<PaymentMilestoneStatus, PaymentMilestoneStatus[]> = {
    PENDING: ["INVOICED", "CANCELLED"],
    INVOICED: ["PARTIALLY_PAID", "PAID", "CANCELLED"],
    PARTIALLY_PAID: ["PAID"],
    PAID: [],     // Terminal
    CANCELLED: [] // Terminal
  };

  /**
   * Validates project state transition
   */
  public static validateProjectTransition(current: ProjectStatus, target: ProjectStatus): void {
    if (current === target) return; // Idempotent no-op
    const allowed = this.PROJECT_TRANSITIONS[current] || [];
    if (!allowed.includes(target)) {
      throw new InvalidStateTransitionError("Project", current, target, allowed);
    }
  }

  /**
   * Validates proposal state transition
   */
  public static validateProposalTransition(current: ProposalStatus, target: ProposalStatus): void {
    if (current === target) return;
    const allowed = this.PROPOSAL_TRANSITIONS[current] || [];
    if (!allowed.includes(target)) {
      throw new InvalidStateTransitionError("Proposal", current, target, allowed);
    }
  }

  /**
   * Validates change request state transition
   */
  public static validateChangeRequestTransition(current: ChangeRequestStatus, target: ChangeRequestStatus): void {
    if (current === target) return;
    const allowed = this.CHANGE_REQUEST_TRANSITIONS[current] || [];
    if (!allowed.includes(target)) {
      throw new InvalidStateTransitionError("ChangeRequest", current, target, allowed);
    }
  }

  /**
   * Validates payment milestone state transition
   */
  public static validatePaymentMilestoneTransition(current: PaymentMilestoneStatus, target: PaymentMilestoneStatus): void {
    if (current === target) return;
    const allowed = this.PAYMENT_MILESTONE_TRANSITIONS[current] || [];
    if (!allowed.includes(target)) {
      throw new InvalidStateTransitionError("PaymentMilestone", current, target, allowed);
    }
  }
}
