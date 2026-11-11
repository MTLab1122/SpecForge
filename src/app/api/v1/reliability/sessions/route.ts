import { NextRequest, NextResponse } from "next/server";
import { AuditLogger } from "@/lib/reliability/observability";

// Mock/in-memory session list
let activeSessions = [
  {
    id: "sess_1",
    deviceName: "Chrome on macOS",
    deviceType: "DESKTOP",
    ipAddress: "192.168.1.101",
    lastActiveAt: new Date().toISOString(),
    isCurrentSession: true
  },
  {
    id: "sess_2",
    deviceName: "Safari on iOS",
    deviceType: "MOBILE",
    ipAddress: "172.56.21.90",
    lastActiveAt: new Date(Date.now() - 3600000).toISOString(),
    isCurrentSession: false
  }
];

export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    sessions: activeSessions
  });
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "usr_lead";
    const organizationId = req.headers.get("x-organization-id") || "org_apex_digital";
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const allOthers = searchParams.get("allOthers") === "true";

    if (allOthers) {
      activeSessions = activeSessions.filter((s) => s.isCurrentSession);
      await AuditLogger.record({
        organizationId,
        userId,
        action: "REVOKE_ALL_OTHER_SESSIONS",
        entityName: "UserSession",
        entityId: userId,
        ipAddress: req.ip || "127.0.0.1",
        userAgent: req.headers.get("user-agent")
      });
      return NextResponse.json({ success: true, message: "All other sessions revoked." });
    }

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "Missing sessionId" }, { status: 400 });
    }

    activeSessions = activeSessions.filter((s) => s.id !== sessionId);

    await AuditLogger.record({
      organizationId,
      userId,
      action: "REVOKE_SESSION",
      entityName: "UserSession",
      entityId: sessionId,
      ipAddress: req.ip || "127.0.0.1",
      userAgent: req.headers.get("user-agent")
    });

    return NextResponse.json({ success: true, revokedSessionId: sessionId });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to revoke session" },
      { status: 500 }
    );
  }
}
