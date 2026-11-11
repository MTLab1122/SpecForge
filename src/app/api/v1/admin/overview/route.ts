import { NextRequest, NextResponse } from "next/server";
import { AdminService } from "@/lib/admin/admin-service";

export async function GET(req: NextRequest) {
  try {
    const kpis = AdminService.getSystemOverviewKpis();
    return NextResponse.json({
      success: true,
      kpis
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch admin overview" },
      { status: 500 }
    );
  }
}

