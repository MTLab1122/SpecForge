import { NextRequest, NextResponse } from "next/server";
import { AdminService, ManagedWorkspaceView } from "@/lib/admin/admin-service";

const mockWorkspaces: ManagedWorkspaceView[] = [
  {
    id: "org_1",
    name: "Apex Digital Solutions",
    slug: "apex-digital",
    memberCount: 8,
    projectCount: 14,
    subscriptionTier: "AGENCY",
    subscriptionStatus: "ACTIVE",
    monthlyAiQuota: 1000,
    currentAiUsage: 480,
    createdAt: "2026-01-10T12:00:00Z"
  },
  {
    id: "org_2",
    name: "DesignLab Studio",
    slug: "design-lab",
    memberCount: 3,
    projectCount: 6,
    subscriptionTier: "PROFESSIONAL",
    subscriptionStatus: "ACTIVE",
    monthlyAiQuota: 250,
    currentAiUsage: 110,
    createdAt: "2026-02-14T10:30:00Z"
  },
  {
    id: "org_3",
    name: "CloudConsult",
    slug: "cloud-consult",
    memberCount: 1,
    projectCount: 2,
    subscriptionTier: "TRIAL",
    subscriptionStatus: "TRIALING",
    monthlyAiQuota: 100,
    currentAiUsage: 92,
    createdAt: "2026-03-01T08:00:00Z"
  }
];

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      workspaces: mockWorkspaces
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list workspaces" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminUserId = req.headers.get("x-user-id") || "admin_sys";
    const body = await req.json();
    const { organizationId, newTier, bonusCredits = 0, reason } = body;

    const workspace = mockWorkspaces.find((w) => w.id === organizationId);
    if (!workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const updated = AdminService.updateWorkspacePlan({
      adminUserId,
      organizationId,
      newTier,
      bonusCredits,
      reason: reason || "Admin console manual plan update"
    });

    workspace.subscriptionTier = updated.tier;
    workspace.monthlyAiQuota = updated.newQuota;

    return NextResponse.json({
      success: true,
      workspace
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update workspace plan" },
      { status: 500 }
    );
  }
}

