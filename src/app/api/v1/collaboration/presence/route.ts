import { NextRequest, NextResponse } from "next/server";
import { PresenceManager } from "@/lib/collaboration/presence-manager";
import { PresenceHeartbeatSchema, AcquireLockSchema } from "@/lib/validations/collaboration";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if acquiring an explicit item lock
    if (body.action === "ACQUIRE_LOCK") {
      const { projectId, itemId } = AcquireLockSchema.parse(body);
      const lockResult = PresenceManager.acquireLock(projectId, "usr_demo_founder_1", itemId);
      return NextResponse.json({
        success: lockResult.success,
        data: lockResult
      });
    }

    // Default: Regular Heartbeat
    const { projectId, activeSection, lockedItemId } = PresenceHeartbeatSchema.parse(body);

    const currentUser = {
      userId: "usr_demo_founder_1",
      name: "Farhan (Technical Lead)",
      email: "farhan@specforge.app",
      avatarUrl: "/avatars/farhan.png"
    };

    const activeUsers = PresenceManager.updateHeartbeat(
      projectId,
      currentUser,
      activeSection,
      lockedItemId
    );

    return NextResponse.json({
      success: true,
      data: {
        activeUsers,
        totalActiveCount: activeUsers.length
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "PRESENCE_FAILED", message: error.message } },
      { status: 400 }
    );
  }
}

