import { NextRequest, NextResponse } from "next/server";
import { SafeIntegrationPlatform, type IntegrationProvider, type Task } from "@/lib/integrations/safe-integration-platform";
import { AuthorizationService } from "@/lib/permissions/authorization-service";

export async function GET(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-workspace-id") || req.headers.get("x-org-id");
    const userId = req.headers.get("x-user-id");

    if (!orgId || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required authentication and workspace headers." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider") as IntegrationProvider | undefined;
    const taskId = searchParams.get("taskId") || undefined;

    const history = SafeIntegrationPlatform.listExportHistory(orgId, { provider, taskId });

    return NextResponse.json({
      success: true,
      history,
      totalCount: history.length
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
        { success: false, error: auth.reason || "Insufficient permissions to export tasks." },
        { status: auth.statusCode }
      );
    }

    const body = await req.json();
    const { provider, task, targetProjectOrList, idempotencyKey } = body;

    if (!provider || !task || !task.id) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: provider, task." },
        { status: 400 }
      );
    }

    const result = await SafeIntegrationPlatform.exportTask(
      provider as IntegrationProvider,
      task as Task,
      {
        organizationId: orgId,
        userId,
        targetProjectOrList,
        idempotencyKey
      }
    );

    return NextResponse.json({
      success: true,
      export: result,
      message: result.userFacingMessage
    }, { status: result.status === "ALREADY_EXPORTED" ? 200 : 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code || "EXPORT_FAILED" },
      { status: error.status || 500 }
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
    const { provider, task, targetProjectOrList } = body;

    if (!provider || !task) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: provider, task." },
        { status: 400 }
      );
    }

    const result = await SafeIntegrationPlatform.retryExport({
      provider: provider as IntegrationProvider,
      task: task as Task,
      context: {
        organizationId: orgId,
        userId,
        targetProjectOrList
      }
    });

    return NextResponse.json({
      success: true,
      export: result,
      message: `Retry successful: ${result.userFacingMessage}`
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code || "EXPORT_RETRY_FAILED" },
      { status: error.status || 500 }
    );
  }
}
