import { NextRequest, NextResponse } from "next/server";
import {
  TemplatesAndAssetsEngine,
  TemplateCategory
} from "@/lib/engagement/templates-and-assets";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") as TemplateCategory | null;

    const templates = TemplatesAndAssetsEngine.getTemplates(category || undefined);

    return NextResponse.json({
      success: true,
      templates
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const organizationId = req.headers.get("x-organization-id") || "org_apex_digital";
    const body = await req.json();
    const { projectTitle, projectDescription, category = "DISCOVERY", features = [] } = body;

    const template = TemplatesAndAssetsEngine.saveProjectAsTemplate({
      projectTitle,
      projectDescription,
      organizationId,
      category,
      features
    });

    return NextResponse.json({
      success: true,
      template
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create template" },
      { status: 500 }
    );
  }
}
