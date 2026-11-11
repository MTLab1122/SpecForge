import { NextRequest, NextResponse } from "next/server";
import { DataProtectionService } from "@/lib/reliability/data-protection";
import { AuditLogger } from "@/lib/reliability/observability";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "usr_lead";
    const organizationId = req.headers.get("x-organization-id") || "org_apex_digital";
    const body = await req.json();
    const { confirmationText } = body;

    const REQUIRED_PHRASE = "DELETE MY ACCOUNT PERMANENTLY";
    if (confirmationText !== REQUIRED_PHRASE) {
      return NextResponse.json(
        {
          success: false,
          error: `Security Check Failed: You must exact-match confirmation phrase '${REQUIRED_PHRASE}'.`
        },
        { status: 400 }
      );
    }

    // Anonymize user records per GDPR Article 17
    const anonymizedData = DataProtectionService.anonymizeUserForDeletion(userId);

    await AuditLogger.record({
      organizationId,
      userId: null, // Scrubbed
      action: "GDPR_ACCOUNT_DELETED",
      entityName: "User",
      entityId: userId,
      ipAddress: req.ip || "127.0.0.1",
      userAgent: req.headers.get("user-agent"),
      metadata: { anonymizedAt: anonymizedData.deletedAt.toISOString() }
    });

    return NextResponse.json({
      success: true,
      message: "Account and personal identifiable records have been permanently erased.",
      anonymizedData
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process account deletion" },
      { status: 500 }
    );
  }
}
