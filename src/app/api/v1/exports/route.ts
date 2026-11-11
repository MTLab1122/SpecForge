import { NextRequest, NextResponse } from "next/server";
import { ExportEngine, type ExportType, type ExportStatus } from "@/lib/storage/export-engine";
import { AuthorizationService } from "@/lib/permissions/authorization-service";

export async function GET(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-workspace-id") || req.headers.get("x-org-id");
    const userId = req.headers.get("x-user-id");
    const role = (req.headers.get("x-user-role") || "MANAGER") as any;

    if (!orgId || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required authentication and workspace headers." },
        { status: 401 }
      );
    }

    const auth = AuthorizationService.authorize({
      context: { userId, organizationId: orgId, role },
      action: "EXPORT_DATA"
    });

    if (!auth.allowed) {
      return NextResponse.json(
        { success: false, error: auth.denialReason },
        { status: auth.statusCode }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as ExportStatus | undefined;
    const exportType = searchParams.get("exportType") as ExportType | undefined;

    const exports = ExportEngine.listExports(orgId, { status, exportType });

    return NextResponse.json({
      success: true,
      exports,
      totalCount: exports.length
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-workspace-id") || req.headers.get("x-org-id");
    const userId = req.headers.get("x-user-id");
    const role = (req.headers.get("x-user-role") || "MANAGER") as any;

    if (!orgId || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required authentication and workspace headers." },
        { status: 401 }
      );
    }

    const auth = AuthorizationService.authorize({
      context: { userId, organizationId: orgId, role },
      action: "EXPORT_DATA"
    });

    if (!auth.allowed) {
      return NextResponse.json(
        { success: false, error: auth.denialReason },
        { status: auth.statusCode }
      );
    }

    const body = await req.json();
    const { exportType, projectId, customData, idempotencyKey, expiresInSeconds, processImmediately } = body;

    if (!exportType) {
      return NextResponse.json(
        { success: false, error: "Missing required field: exportType." },
        { status: 400 }
      );
    }

    const { exportRecord, isDuplicate } = await ExportEngine.requestExport({
      organizationId: orgId,
      userId,
      exportType,
      projectId,
      customData,
      idempotencyKey,
      expiresInSeconds
    });

    // If requested with processImmediately (e.g., synchronous testing or fast export), process now
    if (processImmediately && !isDuplicate) {
      const completed = await ExportEngine.executeExport(exportRecord.id);
      return NextResponse.json({
        success: true,
        export: completed,
        isDuplicate: false,
        message: "Export processed successfully."
      }, { status: 201 });
    }

    return NextResponse.json({
      success: true,
      export: exportRecord,
      isDuplicate,
      message: isDuplicate
        ? "Returned existing export job (idempotent)."
        : "Export job queued for asynchronous generation."
    }, { status: isDuplicate ? 200 : 202 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code || "EXPORT_REQUEST_FAILED" },
      { status: error.status || 500 }
    );
  }
}
