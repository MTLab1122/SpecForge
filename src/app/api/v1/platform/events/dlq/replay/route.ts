import { NextRequest, NextResponse } from "next/server";
import { PlatformEventBus } from "@/lib/platform/event-bus";
import { AuthorizationService } from "@/lib/permissions/authorization-service";
import type { PlatformDomain } from "@/lib/platform/domain-boundaries";

export async function POST(req: NextRequest) {
  try {
    const workspaceId = req.headers.get("x-workspace-id") || req.headers.get("x-org-id");
    const userId = req.headers.get("x-user-id");
    const role = (req.headers.get("x-user-role") || "ADMIN") as any;

    if (!workspaceId || !userId) {
      return NextResponse.json(
        { success: false, error: "Authentication and active workspace context required." },
        { status: 401 }
      );
    }

    const auth = AuthorizationService.authorize({
      context: { userId, organizationId: workspaceId, role },
      action: "MANAGE_WORKSPACE"
    });

    if (!auth.allowed) {
      return NextResponse.json(
        { success: false, error: auth.reason || "Unauthorized to replay DLQ events." },
        { status: auth.statusCode }
      );
    }

    const body = await req.json().catch(() => ({}));
    const eventIds = body.eventIds as string[] | undefined;
    const domain = body.domain as PlatformDomain | undefined;

    const result = await PlatformEventBus.replayDeadLetters({
      workspaceId,
      operatorUserId: userId,
      eventIds,
      domain
    });

    return NextResponse.json({
      success: true,
      message: `Successfully replayed ${result.replayed} dead-letter events.`,
      result
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to replay dead letters." },
      { status: error.status || 500 }
    );
  }
}

