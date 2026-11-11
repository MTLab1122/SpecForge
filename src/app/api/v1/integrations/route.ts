import { NextRequest, NextResponse } from "next/server";
import { SafeIntegrationPlatform, type IntegrationProvider } from "@/lib/integrations/safe-integration-platform";
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
      action: "VIEW_PROJECT"
    });

    if (!auth.allowed) {
      return NextResponse.json(
        { success: false, error: auth.reason || "Unauthorized" },
        { status: auth.statusCode }
      );
    }

    const connections = SafeIntegrationPlatform.listConnections(orgId);

    // Fetch health status for each connection
    const connectionsWithHealth = await Promise.all(
      connections.map(async (c) => {
        const health = await SafeIntegrationPlatform.healthCheck(c.id, orgId);
        return {
          id: c.id,
          provider: c.provider,
          accountName: c.accountName,
          workspaceName: c.workspaceName,
          scopes: c.scopes,
          status: c.status,
          connectedAt: c.connectedAt,
          health
        };
      })
    );

    return NextResponse.json({
      success: true,
      connections: connectionsWithHealth,
      totalCount: connections.length
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
      action: "MANAGE_INTEGRATIONS"
    });

    if (!auth.allowed) {
      return NextResponse.json(
        { success: false, error: auth.reason || "Insufficient permissions to manage integrations." },
        { status: auth.statusCode }
      );
    }

    const body = await req.json();
    const { provider, token, scopes, targetProjectOrList, workspaceName, accountName, expiresInSeconds } = body;

    if (!provider || !token) {
      return NextResponse.json(
        { success: false, error: "Required fields 'provider' and 'token' are missing." },
        { status: 400 }
      );
    }

    const result = await SafeIntegrationPlatform.connect({
      organizationId: orgId,
      userId,
      provider: provider as IntegrationProvider,
      token,
      scopes,
      targetProjectOrList,
      workspaceName,
      accountName,
      expiresInSeconds
    });

    return NextResponse.json({
      success: true,
      connection: result,
      message: `Integration ${provider} connected successfully.`
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code || "INTEGRATION_CONNECT_FAILED" },
      { status: error.status || 500 }
    );
  }
}
