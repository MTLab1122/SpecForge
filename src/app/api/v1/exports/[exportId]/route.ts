import { NextRequest, NextResponse } from "next/server";
import { ExportEngine } from "@/lib/storage/export-engine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ exportId: string }> }
) {
  try {
    const orgId = req.headers.get("x-workspace-id") || req.headers.get("x-org-id");
    const userId = req.headers.get("x-user-id");

    if (!orgId || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required authentication and workspace headers." },
        { status: 401 }
      );
    }

    const exportRecord = ExportEngine.getExport((await params).exportId, orgId);
    if (!exportRecord) {
      return NextResponse.json(
        { success: false, error: `Export '${(await params).exportId}' not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      export: exportRecord
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code || "EXPORT_FETCH_FAILED" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ exportId: string }> }
) {
  try {
    const orgId = req.headers.get("x-workspace-id") || req.headers.get("x-org-id");
    const userId = req.headers.get("x-user-id");

    if (!orgId || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required authentication and workspace headers." },
        { status: 401 }
      );
    }

    const existing = ExportEngine.getExport((await params).exportId, orgId);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Export '${(await params).exportId}' not found.` },
        { status: 404 }
      );
    }

    const retried = await ExportEngine.retryExport((await params).exportId, userId);

    return NextResponse.json({
      success: true,
      message: `Export '${(await params).exportId}' re-queued for execution.`,
      export: retried
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code || "EXPORT_RETRY_FAILED" },
      { status: error.status || 500 }
    );
  }
}
