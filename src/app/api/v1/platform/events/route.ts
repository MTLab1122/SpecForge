import { NextRequest, NextResponse } from "next/server";
import { PlatformEventBus, type StandardDomainEventName } from "@/lib/platform/event-bus";
import { AuthorizationService } from "@/lib/permissions/authorization-service";
import type { PlatformDomain } from "@/lib/platform/domain-boundaries";

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.headers.get("x-workspace-id") || req.headers.get("x-org-id");
    const userId = req.headers.get("x-user-id");
    const role = (req.headers.get("x-user-role") || "MANAGER") as any;

    if (!workspaceId || !userId) {
      return NextResponse.json(
        { success: false, error: "Authentication and active workspace context required." },
        { status: 401 }
      );
    }

    const auth = AuthorizationService.authorize({
      context: { userId, organizationId: workspaceId, role },
      action: "VIEW_AUDIT_LOGS"
    });

    if (!auth.allowed) {
      return NextResponse.json(
        { success: false, error: auth.reason || "Unauthorized to view platform events." },
        { status: auth.statusCode }
      );
    }

    const { searchParams } = new URL(req.url);
    const domain = searchParams.get("domain") as PlatformDomain | undefined;
    const status = searchParams.get("status") as any;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const { events, total } = PlatformEventBus.listEvents({
      workspaceId,
      domain,
      status,
      limit,
      offset
    });

    const deadLetters = PlatformEventBus.listDeadLetters(workspaceId);

    return NextResponse.json({
      success: true,
      events,
      total,
      deadLetterCount: deadLetters.length,
      deadLetters
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve outbox events." },
      { status: error.status || 500 }
    );
  }
}

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

    const body = await req.json();

    // If action is "dispatch", trigger outbox worker dispatch
    if (body.action === "dispatch") {
      const summary = await PlatformEventBus.dispatchPending(body.limit || 50);
      return NextResponse.json({
        success: true,
        summary
      });
    }

    // Otherwise, publish a new outbox event
    const { domain, eventName, aggregateId, aggregateType, payload, idempotencyKey } = body;

    if (!domain || !eventName || !aggregateId || !aggregateType) {
      return NextResponse.json(
        { success: false, error: "Missing required event fields (domain, eventName, aggregateId, aggregateType)." },
        { status: 400 }
      );
    }

    const event = PlatformEventBus.publish({
      domain: domain as PlatformDomain,
      eventName: eventName as StandardDomainEventName,
      aggregateId,
      aggregateType,
      payload: payload || {},
      workspaceId,
      userId,
      idempotencyKey
    });

    // Optionally auto-dispatch
    let dispatchSummary = null;
    if (body.autoDispatch) {
      dispatchSummary = await PlatformEventBus.dispatchPending(10);
    }

    return NextResponse.json(
      {
        success: true,
        event,
        dispatchSummary
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to publish outbox event." },
      { status: error.status || 500 }
    );
  }
}

