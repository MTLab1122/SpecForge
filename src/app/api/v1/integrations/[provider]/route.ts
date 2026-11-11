import { NextRequest, NextResponse } from "next/server";
import { SafeIntegrationPlatform, type IntegrationProvider } from "@/lib/integrations/safe-integration-platform";
import { AuthorizationService } from "@/lib/permissions/authorization-service";

export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
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

    const providerUpper = params.provider.toUpperCase() as IntegrationProvider;
    const connectionId = `conn_${providerUpper.toLowerCase()}_${orgId}`;

    const health = await SafeIntegrationPlatform.healthCheck(connectionId, orgId);

    return NextResponse.json({
      success: true,
      provider: providerUpper,
      health
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { provider: string } }
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

    const auth = AuthorizationService.authorize({
      context: { userId, organizationId: orgId, role },
      action: "MANAGE_INTEGRATIONS"
    });

    if (!auth.allowed) {
      return NextResponse.json(
        { success: false, error: auth.reason || "Insufficient permissions to disconnect integrations." },
        { status: auth.statusCode }
      );
    }

    const providerUpper = params.provider.toUpperCase() as IntegrationProvider;
    const connectionId = `conn_${providerUpper.toLowerCase()}_${orgId}`;

    await SafeIntegrationPlatform.disconnect({
      connectionId,
      organizationId: orgId,
      userId
    });

    return NextResponse.json({
      success: true,
      message: `Integration ${providerUpper} has been disconnected and credentials revoked.`
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code || "DISCONNECT_FAILED" },
      { status: error.status || 500 }
    );
  }
}

