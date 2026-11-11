import { NextRequest, NextResponse } from "next/server";
import { RecordProjectResumeStateSchema } from "@/lib/validations/onboarding";

// In-memory mock store of recent activity
let mockResumeItem = {
  projectId: "proj_sandbox_fintech_demo",
  projectName: "Fintech Mobile MVP (Sandbox)",
  clientName: "Alpha Bank Digital",
  lastSection: "ESTIMATE_BUILDER",
  lastAction: "Applied P80 Contingency (18%) and Senior Dev Rate Card ($85/hr)",
  resumeUrl: "/projects/proj_sandbox_fintech_demo/estimate",
  completionPercent: 65,
  lastAccessedTimeAgo: "12m ago"
};

let mockRecentProjects = [
  {
    id: "proj_sandbox_fintech_demo",
    name: "Fintech Mobile MVP (Sandbox)",
    clientName: "Alpha Bank Digital",
    stage: "ESTIMATION",
    updatedTimeAgo: "12m ago",
    currency: "USD",
    targetBudget: 18500,
    featuresCount: 8
  },
  {
    id: "proj_ecommerce_demo",
    name: "Headless Shopify Storefront",
    clientName: "Acme Retail Group",
    stage: "SCOPE_DRAFTED",
    updatedTimeAgo: "2h ago",
    currency: "USD",
    targetBudget: 9200,
    featuresCount: 5
  },
  {
    id: "proj_ai_crm",
    name: "AI Real Estate CRM & Dialer",
    clientName: "RealtyPulse Inc.",
    stage: "PROPOSAL_SENT",
    updatedTimeAgo: "1d ago",
    currency: "PKR",
    targetBudget: 850000,
    featuresCount: 11
  }
];

export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      continueWhereLeftOff: mockResumeItem,
      recentProjects: mockRecentProjects
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = RecordProjectResumeStateSchema.parse(body);

    mockResumeItem = {
      projectId: data.projectId,
      projectName: "Fintech Mobile MVP",
      clientName: "Alpha Bank Digital",
      lastSection: data.lastSection,
      lastAction: data.lastAction,
      resumeUrl: data.resumeUrl,
      completionPercent: data.completionPercent,
      lastAccessedTimeAgo: "Just now"
    };

    return NextResponse.json({
      success: true,
      data: mockResumeItem
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_RESUME_STATE", message: error.message }
      },
      { status: 400 }
    );
  }
}
