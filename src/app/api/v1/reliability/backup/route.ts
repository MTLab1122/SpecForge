import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/platform/request-ip";
import { DisasterRecoveryOrchestrator } from "@/lib/reliability/disaster-recovery";
import { AuditLogger } from "@/lib/reliability/observability";

export async function GET(req: NextRequest) {
  try {
    const organizationId = req.headers.get("x-organization-id");
    const snapshots = DisasterRecoveryOrchestrator.listSnapshots(organizationId);
    const objectives = DisasterRecoveryOrchestrator.getDisasterRecoveryObjectives();

    return NextResponse.json({
      success: true,
      snapshots,
      objectives
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list backups" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "usr_lead";
    const organizationId = req.headers.get("x-organization-id") || "org_apex_digital";
    const body = await req.json();
    const { action, snapshotId } = body;

    if (action === "VERIFY") {
      if (!snapshotId) {
        return NextResponse.json({ success: false, error: "Missing snapshotId" }, { status: 400 });
      }

      const verification = await DisasterRecoveryOrchestrator.verifyBackupIntegrity(snapshotId);

      await AuditLogger.record({
        organizationId,
        userId,
        action: "BACKUP_RESTORE_VERIFIED",
        entityName: "DatabaseBackupSnapshot",
        entityId: snapshotId,
        ipAddress: getRequestIp(req),
        userAgent: req.headers.get("user-agent"),
        metadata: { isValid: verification.isValid, latencyMs: verification.latencyMs }
      });

      return NextResponse.json({
        success: true,
        verification
      });
    }

    // Default: Trigger snapshot creation
    const dataset = {
      organizations: [{ id: organizationId, name: "Apex Digital Solutions" }],
      projects: [{ id: "proj-1", title: "Enterprise Portal" }],
      estimates: [{ id: "est-1", totalPrice: 28500 }]
    };

    const snapshot = await DisasterRecoveryOrchestrator.createSnapshot({
      organizationId,
      backupType: "TENANT_EXPORT",
      dataset
    });

    await AuditLogger.record({
      organizationId,
      userId,
      action: "BACKUP_SNAPSHOT_CREATED",
      entityName: "DatabaseBackupSnapshot",
      entityId: snapshot.snapshotId,
      ipAddress: getRequestIp(req),
      userAgent: req.headers.get("user-agent"),
      metadata: { checksum: snapshot.checksumSha256, sizeBytes: snapshot.sizeBytes }
    });

    return NextResponse.json({
      success: true,
      snapshot
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute backup action" },
      { status: 500 }
    );
  }
}
