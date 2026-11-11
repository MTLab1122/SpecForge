import { NextRequest, NextResponse } from "next/server";
import { SmartNudgesEngine, ProjectStateForNudge } from "@/lib/engagement/smart-nudges-engine";

let dismissedNudges: string[] = [];
let snoozedUntil: Record<string, string> = {};

export async function GET(req: NextRequest) {
  try {
    const projects: ProjectStateForNudge[] = [
      {
        id: "proj_healthcare",
        title: "Healthcare Telemetry Portal",
        hasUnreviewedAiAssumptions: true,
        unreviewedAssumptionsCount: 3,
        hasCompletedEstimate: true,
        hasSentProposal: false,
        isProposalApproved: false,
        hasCreatedInvoice: false,
        isScopeApproved: false
      },
      {
        id: "proj_fintech",
        title: "Fintech Settlement Gateway",
        hasUnreviewedAiAssumptions: false,
        unreviewedAssumptionsCount: 0,
        hasCompletedEstimate: true,
        hasSentProposal: true,
        proposalSentAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(), // 3 days ago
        isProposalApproved: false,
        hasCreatedInvoice: false,
        isScopeApproved: true
      }
    ];

    const nudges = SmartNudgesEngine.evaluateNudges({
      projects,
      dismissedNudgeIds: dismissedNudges,
      snoozedUntilMap: snoozedUntil
    });

    return NextResponse.json({
      success: true,
      nudges
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to evaluate nudges" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { nudgeId, action, snoozeHours = 24 } = body;

    if (!nudgeId) {
      return NextResponse.json({ success: false, error: "Missing nudgeId" }, { status: 400 });
    }

    if (action === "DISMISS") {
      dismissedNudges.push(nudgeId);
      return NextResponse.json({ success: true, dismissedNudgeId: nudgeId });
    }

    if (action === "SNOOZE") {
      const until = new Date(Date.now() + snoozeHours * 3600 * 1000).toISOString();
      snoozedUntil[nudgeId] = until;
      return NextResponse.json({ success: true, snoozedNudgeId: nudgeId, snoozedUntil: until });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update nudge state" },
      { status: 500 }
    );
  }
}
