import { NextRequest, NextResponse } from "next/server";
import { AuthSecurityService } from "@/lib/reliability/auth-security";
import { AuditLogger } from "@/lib/reliability/observability";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "usr_lead";
    const organizationId = req.headers.get("x-organization-id") || "org_apex_digital";

    // Generate Base32 TOTP secret & otpauth URI
    const secret = AuthSecurityService.generateTotpSecret(20);
    const otpauthUri = AuthSecurityService.generateOtpAuthUri({
      issuer: "SpecForge",
      accountName: "developer@agency.io",
      secret
    });

    // Generate 10 backup codes
    const { plainCodes, hashedCodes } = AuthSecurityService.generateBackupCodes(10);

    await AuditLogger.record({
      organizationId,
      userId,
      action: "MFA_SETUP_INITIATED",
      entityName: "User",
      entityId: userId,
      ipAddress: req.ip || "127.0.0.1",
      userAgent: req.headers.get("user-agent")
    });

    return NextResponse.json({
      success: true,
      secret,
      otpauthUri,
      backupCodes: plainCodes
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to initiate MFA setup" },
      { status: 500 }
    );
  }
}
