import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/platform/request-ip";
import { DataProtectionService } from "@/lib/reliability/data-protection";
import { AuditLogger } from "@/lib/reliability/observability";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "usr_lead";
    const organizationId = req.headers.get("x-organization-id") || "org_apex_digital";

    // Gather records for the data subject
    const exportBundle = DataProtectionService.generateGdprExportBundle({
      userId,
      organizationId,
      userData: {
        id: userId,
        fullName: "Marcus Vance",
        email: "marcus@apexdigital.com",
        role: "OWNER",
        preferredLocale: "en"
      },
      projects: [
        {
          id: "proj-1",
          title: "Healthcare Telemetry Portal",
          stage: "CLIENT_APPROVED",
          createdAt: "2026-10-01T10:00:00Z"
        }
      ],
      estimates: [
        {
          id: "est-1",
          totalPrice: 28500,
          currency: "USD",
          status: "APPROVED"
        }
      ],
      proposals: [
        {
          id: "prop-1",
          title: "Enterprise Web Platform",
          status: "APPROVED"
        }
      ],
      auditLogs: AuditLogger.getRecentEvents(organizationId)
    });

    await AuditLogger.record({
      organizationId,
      userId,
      action: "GDPR_DATA_EXPORTED",
      entityName: "User",
      entityId: userId,
      ipAddress: getRequestIp(req),
      userAgent: req.headers.get("user-agent"),
      metadata: { exportId: exportBundle.exportId, checksum: exportBundle.checksum }
    });

    const jsonString = JSON.stringify(exportBundle, null, 2);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="specforge-gdpr-export-${userId}-${Date.now()}.json"`,
        "X-Checksum-SHA256": exportBundle.checksum
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate GDPR export" },
      { status: 500 }
    );
  }
}
