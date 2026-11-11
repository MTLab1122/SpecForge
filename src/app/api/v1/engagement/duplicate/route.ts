import { NextRequest, NextResponse } from "next/server";
import { TemplatesAndAssetsEngine } from "@/lib/engagement/templates-and-assets";

export async function POST(req: NextRequest) {
  try {
    const organizationId = req.headers.get("x-organization-id") || "org_apex_digital";
    const body = await req.json();
    const { projectId, projectTitle, projectDescription, features, estimates } = body;

    const duplicateResult = TemplatesAndAssetsEngine.duplicateProject({
      id: projectId || "proj_original",
      title: projectTitle || "Enterprise Client Portal",
      description: projectDescription || "B2B client portal architecture",
      organizationId,
      features,
      estimates
    });

    return NextResponse.json({
      success: true,
      ...duplicateResult
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to duplicate asset" },
      { status: 500 }
    );
  }
}
