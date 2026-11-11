import { NextRequest, NextResponse } from "next/server";
import { FileLifecycleManager } from "@/lib/storage/file-lifecycle";
import { AuthorizationService } from "@/lib/permissions/authorization-service";

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
      action: "EDIT_PROJECT"
    });

    if (!auth.allowed) {
      return NextResponse.json(
        { success: false, error: auth.denialReason },
        { status: auth.statusCode }
      );
    }

    const body = await req.json();
    const { fileName, mimeType, fileSizeBytes, retentionDays, expiresInSeconds } = body;

    if (!fileName || !mimeType || fileSizeBytes === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: fileName, mimeType, fileSizeBytes." },
        { status: 400 }
      );
    }

    const result = await FileLifecycleManager.initiateUpload({
      organizationId: orgId,
      userId,
      fileName,
      mimeType,
      fileSizeBytes: Number(fileSizeBytes),
      retentionDays: retentionDays ? Number(retentionDays) : undefined,
      expiresInSeconds: expiresInSeconds ? Number(expiresInSeconds) : undefined
    });

    return NextResponse.json({
      success: true,
      file: result.file,
      presignedUpload: result.presignedUpload
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code || "UPLOAD_INITIATE_FAILED" },
      { status: error.status || 400 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-workspace-id") || req.headers.get("x-org-id");
    const userId = req.headers.get("x-user-id");

    if (!orgId || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required authentication and workspace headers." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { fileId, base64Content } = body;

    if (!fileId || !base64Content) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: fileId, base64Content." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(base64Content, "base64");
    const completedFile = await FileLifecycleManager.completeUpload({
      fileId,
      requestingOrganizationId: orgId,
      requestingUserId: userId,
      buffer
    });

    return NextResponse.json({
      success: true,
      file: completedFile
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code || "UPLOAD_COMPLETION_FAILED" },
      { status: error.status || 500 }
    );
  }
}
