import { NextRequest, NextResponse } from "next/server";
import { PluginRegistry, type PluginManifest } from "@/lib/platform/plugin-registry";
import { AuthorizationService } from "@/lib/permissions/authorization-service";

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.headers.get("x-workspace-id") || req.headers.get("x-org-id");
    const userId = req.headers.get("x-user-id");
    const role = (req.headers.get("x-user-role") || "MEMBER") as any;

    if (!workspaceId || !userId) {
      return NextResponse.json(
        { success: false, error: "Authentication and active workspace context required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") || "workspace"; // 'workspace' | 'catalog'
    const slot = searchParams.get("slot") as any;

    if (scope === "catalog") {
      const catalog = PluginRegistry.listCatalog();
      return NextResponse.json({ success: true, catalog });
    }

    const installed = PluginRegistry.listInstalledPlugins(workspaceId);
    const uiExtensions = PluginRegistry.getActiveUIExtensionPoints(workspaceId, slot);

    return NextResponse.json({
      success: true,
      workspaceId,
      installed,
      uiExtensions
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve plugins." },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const workspaceId = req.headers.get("x-workspace-id") || req.headers.get("x-org-id");
    const userId = req.headers.get("x-user-id");
    const role = (req.headers.get("x-user-role") || "ADMIN") as any;

    if (!workspaceId || !userId) {
      return NextResponse.json(
        { success: false, error: "Authentication and active workspace context required." },
        { status: 401 }
      );
    }

    const auth = AuthorizationService.authorize({
      context: { userId, organizationId: workspaceId, role },
      action: "MANAGE_INTEGRATIONS"
    });

    if (!auth.allowed) {
      return NextResponse.json(
        { success: false, error: auth.reason || "Unauthorized to manage workspace plugins." },
        { status: auth.statusCode }
      );
    }

    const body = await req.json();
    const action = body.action || "install";

    if (action === "register_catalog") {
      // Platform admin registering a plugin into catalog
      const manifest = PluginRegistry.registerPlugin(body.manifest);
      return NextResponse.json({ success: true, manifest }, { status: 201 });
    }

    if (action === "install") {
      const { pluginId, customConfig } = body;
      if (!pluginId) {
        return NextResponse.json(
          { success: false, error: "pluginId is required to install a plugin." },
          { status: 400 }
        );
      }

      const installation = await PluginRegistry.installPlugin({
        workspaceId,
        pluginId,
        userId,
        customConfig
      });

      return NextResponse.json(
        {
          success: true,
          message: `Plugin '${pluginId}' successfully installed and activated.`,
          installation
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { success: false, error: `Unsupported action '${action}'` },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process plugin operation." },
      { status: error.status || 500 }
    );
  }
}

