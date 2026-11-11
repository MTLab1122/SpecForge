import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/platform/request-ip";
import { AuditLogger } from "@/lib/reliability/observability";

let userDevices = [
  {
    deviceId: "dev_macbook_primary",
    deviceName: "Chrome on macOS",
    deviceType: "DESKTOP",
    isTrusted: true,
    lastSeenAt: new Date().toISOString(),
    lastIpAddress: "192.168.1.101"
  },
  {
    deviceId: "dev_iphone_mobile",
    deviceName: "Safari on iOS",
    deviceType: "MOBILE",
    isTrusted: false,
    lastSeenAt: new Date(Date.now() - 86400000).toISOString(),
    lastIpAddress: "172.56.21.90"
  }
];

export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    devices: userDevices
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "usr_lead";
    const organizationId = req.headers.get("x-organization-id") || "org_apex_digital";
    const body = await req.json();
    const { deviceId, isTrusted } = body;

    const device = userDevices.find((d) => d.deviceId === deviceId);
    if (!device) {
      return NextResponse.json({ success: false, error: "Device not found" }, { status: 404 });
    }

    device.isTrusted = Boolean(isTrusted);

    await AuditLogger.record({
      organizationId,
      userId,
      action: isTrusted ? "TRUST_DEVICE" : "UNTRUST_DEVICE",
      entityName: "UserDevice",
      entityId: deviceId,
      ipAddress: getRequestIp(req),
      userAgent: req.headers.get("user-agent")
    });

    return NextResponse.json({
      success: true,
      device
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update device" },
      { status: 500 }
    );
  }
}
