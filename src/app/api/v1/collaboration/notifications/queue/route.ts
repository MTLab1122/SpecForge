import { NextRequest, NextResponse } from "next/server";
import { NotificationService } from "@/lib/notifications/notification-service";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "usr_developer";
    const history = NotificationService.getHistory(userId, 100);

    return NextResponse.json({
      success: true,
      history,
      count: history.length
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch notification queue" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, jobId, ...notificationInput } = body;

    // Retry action for failed jobs
    if (action === "RETRY") {
      if (!jobId) {
        return NextResponse.json(
          { success: false, error: "jobId is required for RETRY action" },
          { status: 400 }
        );
      }
      const retried = await NotificationService.retryJob(jobId);
      return NextResponse.json({
        success: true,
        message: `Successfully retried notification job ${jobId}`,
        job: retried
      });
    }

    // Enqueue action
    const job = await NotificationService.enqueue({
      organizationId: notificationInput.organizationId || "org_apex_digital",
      userId: notificationInput.userId || "usr_developer",
      channel: notificationInput.channel || "EMAIL",
      eventType: notificationInput.eventType || "SCOPE_SHARED",
      recipient: notificationInput.recipient || "user@specforge.io",
      templateId: notificationInput.templateId,
      title: notificationInput.title || "Notification",
      message: notificationInput.message || "You have a new update",
      linkUrl: notificationInput.linkUrl,
      entityId: notificationInput.entityId,
      metadata: notificationInput.metadata
    });

    return NextResponse.json({
      success: true,
      message: "Notification enqueued and processed",
      job
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process notification queue request" },
      { status: 500 }
    );
  }
}

