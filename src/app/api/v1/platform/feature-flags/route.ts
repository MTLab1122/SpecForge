import { NextRequest, NextResponse } from "next/server";
import { FeatureFlagsEngine } from "@/lib/admin/feature-flags-engine";
import { AuthorizationService } from "@/lib/permissions/authorization-service";

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.headers.get("x-workspace-id") || req.headers.get("x-org-id");
    const userId = req.headers.get("x-user-id");
    const role = (req.headers.get("x-user-role") || "MANAGER") as any;
    const tier = req.headers.get("x-subscription-tier") || "AGENCY";
    const region = req.headers.get("x-region") || "us-east-1";

    const { searchParams } = new URL(req.url);
    const flagKey = searchParams.get("key");
    const includeAudit = searchParams.get("includeAudit") === "true";

    if (flagKey) {
      const evaluation = FeatureFlagsEngine.evaluate(flagKey, {
        userId: userId || undefined,
        organizationId: workspaceId || undefined,
        subscriptionTier: tier,
        region
      });
      return NextResponse.json({ success: true, evaluation });
    }

    const flags = FeatureFlagsEngine.listFlags();
    const evaluatedFlags = flags.map((f) => {
      const evaluation = FeatureFlagsEngine.evaluate(f.key, {
        userId: userId || undefined,
        organizationId: workspaceId || undefined,
        subscriptionTier: tier,
        region
      });
      return {
        flag: f,
        evaluated: evaluation
      };
    });

    const auditTrail = includeAudit ? FeatureFlagsEngine.getAuditTrail() : undefined;

    return NextResponse.json({
      success: true,
      workspaceId,
      region,
      tier,
      flags: evaluatedFlags,
      auditTrail
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list or evaluate feature flags." },
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
      action: "MANAGE_BILLING"
    });

    if (!auth.allowed) {
      return NextResponse.json(
        { success: false, error: auth.reason || "Unauthorized to update feature flags." },
        { status: auth.statusCode }
      );
    }

    const body = await req.json();
    const action = body.action; // 'kill_switch' | 'rollout' | 'override_workspace' | 'update'
    const key = body.key;
    const reason = body.reason || "Administrative update via API";

    if (!key) {
      return NextResponse.json({ success: false, error: "Feature flag key is required." }, { status: 400 });
    }

    if (action === "kill_switch") {
      const flag = FeatureFlagsEngine.killSwitch(key, reason, userId);
      return NextResponse.json({
        success: true,
        message: `Emergency kill-switch executed for '${key}'.`,
        flag
      });
    }

    if (action === "rollout") {
      const percentage = Number(body.percentage);
      if (isNaN(percentage)) {
        return NextResponse.json({ success: false, error: "Valid percentage required." }, { status: 400 });
      }
      const flag = FeatureFlagsEngine.setRolloutPercentage(key, percentage, userId, reason);
      return NextResponse.json({
        success: true,
        message: `Rollout percentage updated to ${percentage}% for '${key}'.`,
        flag
      });
    }

    if (action === "override_workspace") {
      const targetWorkspaceId = body.targetWorkspaceId || workspaceId;
      const enabled = Boolean(body.enabled);
      const flag = FeatureFlagsEngine.setWorkspaceOverride(key, targetWorkspaceId, enabled, userId, reason);
      return NextResponse.json({
        success: true,
        message: `Workspace override updated for '${key}'.`,
        flag
      });
    }

    return NextResponse.json(
      { success: false, error: `Unsupported flag action '${action}'.` },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update feature flag." },
      { status: error.status || 500 }
    );
  }
}

