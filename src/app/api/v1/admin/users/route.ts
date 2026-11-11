import { NextRequest, NextResponse } from "next/server";
import { AdminService, ManagedUserView } from "@/lib/admin/admin-service";

const mockUsers: ManagedUserView[] = [
  {
    id: "usr_1",
    email: "marcus@apexdigital.com",
    fullName: "Marcus Vance",
    role: "OWNER",
    organizationId: "org_1",
    organizationName: "Apex Digital Solutions",
    subscriptionTier: "AGENCY",
    aiCreditQuota: 1000,
    aiCreditsUsed: 480,
    isSuspended: false,
    createdAt: "2026-01-10T12:00:00Z"
  },
  {
    id: "usr_2",
    email: "elena@designlab.io",
    fullName: "Elena Rostova",
    role: "MANAGER",
    organizationId: "org_2",
    organizationName: "DesignLab Studio",
    subscriptionTier: "PROFESSIONAL",
    aiCreditQuota: 250,
    aiCreditsUsed: 110,
    isSuspended: false,
    createdAt: "2026-02-14T10:30:00Z"
  },
  {
    id: "usr_3",
    email: "tariq@cloudconsult.tech",
    fullName: "Tariq Mahmood",
    role: "OWNER",
    organizationId: "org_3",
    organizationName: "CloudConsult",
    subscriptionTier: "TRIAL",
    aiCreditQuota: 100,
    aiCreditsUsed: 92,
    isSuspended: true,
    createdAt: "2026-03-01T08:00:00Z"
  }
];

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      users: mockUsers
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list users" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminUserId = req.headers.get("x-user-id") || "admin_sys";
    const body = await req.json();
    const { action, targetUserId, isSuspended, organizationId, reason } = body;

    if (action === "TOGGLE_SUSPEND") {
      const user = mockUsers.find((u) => u.id === targetUserId);
      if (!user) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
      }

      AdminService.setUserSuspended({
        adminUserId,
        targetUserId,
        organizationId: user.organizationId,
        isSuspended: Boolean(isSuspended),
        reason: reason || "Administrative action"
      });

      user.isSuspended = Boolean(isSuspended);

      return NextResponse.json({
        success: true,
        user
      });
    }

    if (action === "IMPERSONATE") {
      const session = AdminService.generateDebugSessionToken({
        adminUserId,
        targetUserId,
        organizationId: organizationId || "org_1",
        reason: reason || "Support investigation"
      });

      return NextResponse.json({
        success: true,
        ...session
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update user" },
      { status: 500 }
    );
  }
}

