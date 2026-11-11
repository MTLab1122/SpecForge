import { NextRequest, NextResponse } from "next/server";
import { UpdateChecklistStepSchema } from "@/lib/validations/onboarding";
import { analytics } from "@/lib/analytics/tracker";

// In-memory / Mock state for fast evaluation
let mockChecklist = {
  createWorkspace: true,
  addFirstClient: false,
  createFirstProject: false,
  uploadBrief: false,
  generateRequirements: false,
  reviewAiOutput: false,
  createEstimate: false,
  sendProposal: false,
  obtainApproval: false,
  generateTasks: false,
  isActivated: false,
  activatedAt: null as string | null
};

export async function GET(req: NextRequest) {
  const stepsKeys = Object.keys(mockChecklist).filter((k) => k !== "isActivated" && k !== "activatedAt");
  const completedCount = stepsKeys.filter((k) => (mockChecklist as any)[k] === true).length;
  const percentComplete = Math.round((completedCount / stepsKeys.length) * 100);

  // Compute next recommended step
  const nextStepMap: Record<string, { title: string; description: string; actionUrl: string; estimatedMinutes: number }> = {
    addFirstClient: { title: "Add your first client", description: "Create a client contact to assign to projects", actionUrl: "/clients", estimatedMinutes: 1 },
    createFirstProject: { title: "Create your first project", description: "Set project budget, deadline, and target platform", actionUrl: "/projects/new", estimatedMinutes: 2 },
    uploadBrief: { title: "Upload client brief or voice note", description: "Drop a PDF or WhatsApp voice note up to 10 mins", actionUrl: "/projects", estimatedMinutes: 1 },
    generateRequirements: { title: "Run AI requirement extraction", description: "Extract features, constraints, and assumptions with citations", actionUrl: "/projects", estimatedMinutes: 2 },
    createEstimate: { title: "Build feature estimate", description: "Set complexity and apply P80 risk contingency", actionUrl: "/projects", estimatedMinutes: 2 },
    sendProposal: { title: "Send proposal to client", description: "Generate tokenized read-only link with digital approval seal", actionUrl: "/projects", estimatedMinutes: 1 }
  };

  const nextStepKey = stepsKeys.find((k) => (mockChecklist as any)[k] === false) || "generateTasks";
  const nextStep = nextStepMap[nextStepKey] || {
    title: "Generate and export tasks",
    description: "Export approved scope into Jira, Linear, Trello, or GitHub",
    actionUrl: "/projects",
    estimatedMinutes: 1
  };

  return NextResponse.json({
    success: true,
    data: {
      ...mockChecklist,
      completedStepsCount: completedCount,
      totalStepsCount: stepsKeys.length,
      percentComplete,
      nextRecommendedStep: {
        key: nextStepKey,
        ...nextStep
      }
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stepKey, isCompleted } = UpdateChecklistStepSchema.parse(body);

    (mockChecklist as any)[stepKey] = isCompleted;

    const userId = "usr_demo_founder_1";
    const organizationId = "org_demo_workspace_1";

    // Track specific step completion
    const eventMapping: Record<string, any> = {
      createFirstProject: "first_project_created",
      uploadBrief: "first_document_uploaded",
      generateRequirements: "first_ai_generation_requested",
      reviewAiOutput: "first_scope_created",
      createEstimate: "first_estimate_created",
      sendProposal: "first_proposal_sent",
      obtainApproval: "first_client_approval_received",
      generateTasks: "first_task_generated"
    };

    if (eventMapping[stepKey]) {
      analytics.track(eventMapping[stepKey], { userId, organizationId });
    }

    // Check Definition of Activation:
    // User is activated when they complete:
    // 1. One project
    // 2. One AI-assisted scope package
    // 3. One estimate
    // 4. One proposal sent to a client
    const isNowActivated = analytics.isActivated({
      createFirstProject: mockChecklist.createFirstProject,
      generateRequirements: mockChecklist.generateRequirements,
      createEstimate: mockChecklist.createEstimate,
      sendProposal: mockChecklist.sendProposal
    });

    if (isNowActivated && !mockChecklist.isActivated) {
      mockChecklist.isActivated = true;
      mockChecklist.activatedAt = new Date().toISOString();
      analytics.track("activation_completed", {
        userId,
        organizationId,
        metadata: { activatedAt: mockChecklist.activatedAt }
      });
    }

    return NextResponse.json({
      success: true,
      data: mockChecklist
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_CHECKLIST_UPDATE",
          message: error.message
        }
      },
      { status: 400 }
    );
  }
}
