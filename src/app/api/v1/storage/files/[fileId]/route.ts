import { NextRequest, NextResponse } from "next/server";
import { FileLifecycleManager } from "@/lib/storage/file-lifecycle";

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
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

    const { searchParams } = new URL(req.url);
    const downloadRequested = searchParams.get("download") === "true";

    if (downloadRequested) {
      const expiresIn = searchParams.get("expiresInSeconds")
        ? Number(searchParams.get("expiresInSeconds"))
        : undefined;

      const downloadResult = await FileLifecycleManager.generateDownloadUrl({
        fileId: params.fileId,
        requestingOrganizationId: orgId,
        requestingUserId: userId,
        requestingRole: role,
        expiresInSeconds: expiresIn
      });

      return NextResponse.json({
        success: true,
        downloadUrl: downloadResult.downloadUrl,
        expiresAt: downloadResult.expiresAt,
        file: downloadResult.file
      });
    }

    const file = FileLifecycleManager.getFile(params.fileId, orgId);
    if (!file) {
      return NextResponse.json(
        { success: false, error: `File '${params.fileId}' not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      file
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code || "FILE_FETCH_FAILED" },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
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

    const body = await req.json().catch(() => ({}));
    const reason = body?.reason || "User-initiated file deletion";

    const deletedFile = await FileLifecycleManager.deleteFile({
      fileId: params.fileId,
      requestingOrganizationId: orgId,
      requestingUserId: userId,
      requestingRole: role,
      reason
    });

    return NextResponse.json({
      success: true,
      message: `File '${deletedFile.fileName}' deleted successfully.`,
      file: deletedFile
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code || "FILE_DELETION_FAILED" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { fileId: string } }
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

    const result = await FileLifecycleManager.retryUpload({
      fileId: params.fileId,
      requestingOrganizationId: orgId,
      requestingUserId: userId
    });

    return NextResponse.json({
      success: true,
      message: `Upload retry initiated for file '${result.file.fileName}'.`,
      file: result.file,
      presignedUpload: result.presignedUpload
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code || "RETRY_UPLOAD_FAILED" },
      { status: error.status || 500 }
    );
  }
}
