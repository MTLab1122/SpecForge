import { NextRequest, NextResponse } from "next/server";
import { SubmitDiscoveryQuestionnaireSchema } from "@/lib/validations/structured-discovery";

let mockQuestionnaireStore = new Map<string, any>();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") || "proj_sandbox_fintech_demo";

  const data = mockQuestionnaireStore.get(projectId) || {
    projectId,
    businessGoal: "Launch a modern mobile-first digital banking MVP.",
    targetUsers: "Smartphone-first retail consumers and mobile freelancers.",
    coreProblem: "Traditional branch banking is slow and lacks automated budgeting tools.",
    mustHaveFeatures: ["Phone OTP Login", "Biometric Authentication", "Virtual Debit Card", "Instant P2P Transfers"],
    niceToHaveFeatures: ["Cryptocurrency Staking", "Shared Family Vaults"],
    technicalConstraints: "Cross-platform Flutter frontend with Next.js/Node API and PostgreSQL.",
    designConstraints: "Modern neo-bank aesthetic with dark mode and tactile haptics.",
    integrationRequirements: "Payment processing via Stripe and local mobile rails (JazzCash/Easypaisa).",
    complianceRequirements: "State Bank of Pakistan regulatory sandbox compliance.",
    launchDeadline: "2027-02-15T00:00:00Z",
    budgetRange: "$15,000 - $35,000",
    successMetrics: "10,000 downloads and 40% 30-day retention in pilot phase.",
    completenessScore: 92
  };

  return NextResponse.json({
    success: true,
    data
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = SubmitDiscoveryQuestionnaireSchema.parse(body);

    // Calculate completeness score (based on non-empty fields)
    let filledFields = 0;
    const totalFields = 12;
    if (validated.businessGoal) filledFields++;
    if (validated.targetUsers) filledFields++;
    if (validated.coreProblem) filledFields++;
    if (validated.mustHaveFeatures.length > 0) filledFields++;
    if (validated.niceToHaveFeatures.length > 0) filledFields++;
    if (validated.technicalConstraints) filledFields++;
    if (validated.designConstraints) filledFields++;
    if (validated.integrationRequirements) filledFields++;
    if (validated.complianceRequirements) filledFields++;
    if (validated.launchDeadline) filledFields++;
    if (validated.budgetRange) filledFields++;
    if (validated.successMetrics) filledFields++;

    const completenessScore = Math.round((filledFields / totalFields) * 100);

    const saved = {
      ...validated,
      completenessScore,
      updatedAt: new Date().toISOString()
    };

    mockQuestionnaireStore.set(validated.projectId, saved);

    return NextResponse.json({
      success: true,
      data: saved
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "QUESTIONNAIRE_SAVE_FAILED", message: error.message } },
      { status: 400 }
    );
  }
}

