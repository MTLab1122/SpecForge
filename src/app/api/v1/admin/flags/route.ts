import { NextRequest, NextResponse } from "next/server";
import { FeatureFlagsEngine } from "@/lib/admin/feature-flags-engine";

export async function GET(req: NextRequest) {
  try {
    const flags = FeatureFlagsEngine.listFlags();
    return NextResponse.json({
      success: true,
      flags
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list feature flags" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, isEnabled, rolloutPercentage, targetTiers } = body;

    if (!key) {
      return NextResponse.json({ success: false, error: "Missing flag key" }, { status: 400 });
    }

    const updated = FeatureFlagsEngine.updateFlag(key, {
      isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : undefined,
      rolloutPercentage: rolloutPercentage !== undefined ? Number(rolloutPercentage) : undefined,
      targetTiers: targetTiers || undefined
    });

    return NextResponse.json({
      success: true,
      flag: updated
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update feature flag" },
      { status: 500 }
    );
  }
}

