import { NextRequest, NextResponse } from "next/server";
import { SubmitOnboardingProfileSchema } from "@/lib/validations/onboarding";
import { analytics } from "@/lib/analytics/tracker";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = SubmitOnboardingProfileSchema.parse(body);

    // Mock/Demo Session Resolution
    const userId = "usr_demo_founder_1";
    const organizationId = "org_demo_workspace_1";

    // 1. Personalize Organization based on questionnaire
    const defaultCurrency = validatedData.preferredLanguage === "ur" ? "PKR" : "USD";
    const workspaceName = validatedData.workspaceName || `${validatedData.userType === "AGENCY" ? "Agency" : "Studio"} Workspace`;

    // 2. Pre-generate Sample Sandbox Project if requested
    let sampleProjectId = null;
    if (validatedData.createSampleSandbox) {
      sampleProjectId = "proj_sandbox_fintech_demo";
    }

    // 3. Track Telemetry Event
    analytics.track("onboarding_completed", {
      userId,
      organizationId,
      metadata: {
        userType: validatedData.userType,
        primaryService: validatedData.primaryService,
        typicalProjectType: validatedData.typicalProjectType,
        teamSize: validatedData.teamSize,
        primaryGoal: validatedData.primaryGoal,
        sampleCreated: validatedData.createSampleSandbox
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        userId,
        organizationId,
        workspaceName,
        preferredLanguage: validatedData.preferredLanguage,
        defaultCurrency,
        sampleProjectId,
        checklistStatus: {
          createWorkspace: true,
          addFirstClient: validatedData.createSampleSandbox,
          createFirstProject: validatedData.createSampleSandbox,
          uploadBrief: validatedData.createSampleSandbox,
          generateRequirements: validatedData.createSampleSandbox,
          reviewAiOutput: false,
          createEstimate: validatedData.createSampleSandbox,
          sendProposal: false,
          obtainApproval: false,
          generateTasks: false,
          isActivated: false,
          completedStepsCount: validatedData.createSampleSandbox ? 5 : 1,
          totalStepsCount: 10,
          percentComplete: validatedData.createSampleSandbox ? 50 : 10
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: error.message || "Failed to process onboarding profile",
          details: error.errors || null
        }
      },
      { status: 400 }
    );
  }
}
