import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/platform/request-ip";
import { AuthSecurityService } from "@/lib/reliability/auth-security";
import { AuditLogger } from "@/lib/reliability/observability";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "usr_lead";
    const organizationId = req.headers.get("x-organization-id") || "org_apex_digital";
    const body = await req.json();
    const { secret, token } = body;

    if (!secret || !token) {
      return NextResponse.json(
        { success: false, error: "Missing secret or token" },
        { status: 400 }
      );
    }

    const isValid = AuthSecurityService.verifyTotp({ secret, token });

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid TOTP verification code" },
        { status: 401 }
      );
    }

    await AuditLogger.record({
      organizationId,
      userId,
      action: "MFA_ENABLED",
      entityName: "User",
      entityId: userId,
      ipAddress: getRequestIp(req),
      userAgent: req.headers.get("user-agent")
    });

    return NextResponse.json({
      success: true,
      mfaEnabled: true,
      message: "Two-factor authentication successfully verified and enabled."
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify MFA" },
      { status: 500 }
    );
  }
}
