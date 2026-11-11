import { NextResponse } from "next/server";
import { COMMERCIAL_ESTIMATE_TEMPLATES } from "@/lib/estimation/templates";

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      templates: COMMERCIAL_ESTIMATE_TEMPLATES,
      total: COMMERCIAL_ESTIMATE_TEMPLATES.length
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve estimate templates" },
      { status: 500 }
    );
  }
}

