import { NextRequest, NextResponse } from "next/server";
import {
  OperationalExportEngine,
  OperationalExportType
} from "@/lib/admin/operational-export-engine";
import { AuditLogger } from "@/lib/reliability/observability";

export async function POST(req: NextRequest) {
  try {
    const adminUserId = req.headers.get("x-user-id") || "admin_sys";
    const body = await req.json();
    const { type = "USERS" } = body;

    const { filename, csv } = OperationalExportEngine.generateExportCsv({
      type: type as OperationalExportType
    });

    await AuditLogger.record({
      organizationId: "org_specforge_system",
      userId: adminUserId,
      action: "ADMIN_OPERATIONAL_DATA_EXPORTED",
      entityName: "SystemExport",
      entityId: filename,
      metadata: { exportType: type }
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate operational export" },
      { status: 500 }
    );
  }
}

