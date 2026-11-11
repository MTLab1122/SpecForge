export interface NudgeCandidate {
  id: string;
  nudgeType: "SCOPE_PENDING" | "PROPOSAL_UNSENT" | "APPROVAL_FOLLOW_UP" | "INVOICE_PENDING" | "AI_REVIEW_WAITING";
  title: string;
  message: string;
  actionUrl: string;
  actionLabel: string;
  priority: number; // 1 = highest
  projectId?: string;
  projectTitle?: string;
}

export interface ProjectStateForNudge {
  id: string;
  title: string;
  hasUnreviewedAiAssumptions: boolean;
  unreviewedAssumptionsCount: number;
  hasCompletedEstimate: boolean;
  hasSentProposal: boolean;
  proposalSentAt?: string | null;
  proposalViewedAt?: string | null;
  isProposalApproved: boolean;
  hasCreatedInvoice: boolean;
  aiExtractionFinishedAt?: string | null;
  isScopeApproved: boolean;
}

export class SmartNudgesEngine {
  /**
   * Evaluates active projects and produces prioritized, non-spam smart nudges.
   */
  public static evaluateNudges(params: {
    projects: ProjectStateForNudge[];
    dismissedNudgeIds?: string[];
    snoozedUntilMap?: Record<string, string>; // nudgeId -> ISO string
    currentTime?: Date;
  }): NudgeCandidate[] {
    const now = params.currentTime || new Date();
    const dismissed = new Set(params.dismissedNudgeIds || []);
    const snoozed = params.snoozedUntilMap || {};

    const candidates: NudgeCandidate[] = [];

    for (const proj of params.projects) {
      // 1. Unreviewed Assumptions / AI Review Waiting
      if (proj.hasUnreviewedAiAssumptions && proj.unreviewedAssumptionsCount > 0) {
        const id = `nudge_scope_${proj.id}`;
        candidates.push({
          id,
          nudgeType: "SCOPE_PENDING",
          title: `Confirm ${proj.unreviewedAssumptionsCount} Assumptions in ${proj.title}`,
          message: "Unreviewed AI assumptions must be accepted before scope and estimates can be locked.",
          actionUrl: `/projects/${proj.id}/scope`,
          actionLabel: "Review Assumptions",
          priority: 1,
          projectId: proj.id,
          projectTitle: proj.title
        });
      }

      // 2. Estimate Completed but Proposal Unsent
      if (proj.hasCompletedEstimate && !proj.hasSentProposal) {
        const id = `nudge_prop_${proj.id}`;
        candidates.push({
          id,
          nudgeType: "PROPOSAL_UNSENT",
          title: `Proposal Ready to Send: ${proj.title}`,
          message: "Your commercial estimate is finalized. Generate your client-ready proposal to secure the project.",
          actionUrl: `/projects/${proj.id}/proposal`,
          actionLabel: "Send Proposal",
          priority: 2,
          projectId: proj.id,
          projectTitle: proj.title
        });
      }

      // 3. Proposal Viewed by Client > 48h with No Decision
      if (proj.hasSentProposal && !proj.isProposalApproved && proj.proposalSentAt) {
        const sentTime = new Date(proj.proposalSentAt).getTime();
        const diffHours = (now.getTime() - sentTime) / (1000 * 60 * 60);

        if (diffHours >= 48) {
          const id = `nudge_followup_${proj.id}`;
          candidates.push({
            id,
            nudgeType: "APPROVAL_FOLLOW_UP",
            title: `Follow Up on Proposal: ${proj.title}`,
            message: `Proposal was sent ${Math.round(diffHours / 24)} days ago. A quick polite check-in boosts closing rates by 35%.`,
            actionUrl: `/projects/${proj.id}/portal`,
            actionLabel: "Check Status & Comments",
            priority: 3,
            projectId: proj.id,
            projectTitle: proj.title
          });
        }
      }

      // 4. Scope Approved but Milestone Invoice Uncreated
      if (proj.isProposalApproved && !proj.hasCreatedInvoice) {
        const id = `nudge_inv_${proj.id}`;
        candidates.push({
          id,
          nudgeType: "INVOICE_PENDING",
          title: `Track Initial Deposit: ${proj.title}`,
          message: "Client sign-off secured! Log your upfront milestone invoice before starting development tasks.",
          actionUrl: `/projects/${proj.id}/estimates`,
          actionLabel: "Record Deposit Invoice",
          priority: 2,
          projectId: proj.id,
          projectTitle: proj.title
        });
      }
    }

    // Filter out dismissed and actively snoozed nudges
    const activeCandidates = candidates.filter((nudge) => {
      if (dismissed.has(nudge.id)) return false;
      const snoozeUntil = snoozed[nudge.id];
      if (snoozeUntil && new Date(snoozeUntil) > now) {
        return false;
      }
      return true;
    });

    // Sort by priority (1 is highest) and return maximum top 2 nudges to avoid spam
    return activeCandidates.sort((a, b) => a.priority - b.priority).slice(0, 2);
  }
}
