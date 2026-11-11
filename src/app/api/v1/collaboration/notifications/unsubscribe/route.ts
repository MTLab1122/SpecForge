import { NextRequest, NextResponse } from "next/server";
import { NotificationService } from "@/lib/notifications/notification-service";
import { AppError } from "@/lib/reliability/error-envelope";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing unsubscribe token" },
        { status: 400 }
      );
    }

    const result = NotificationService.handleUnsubscribe(token);

    return NextResponse.json({
      success: true,
      message: `You have successfully unsubscribed from ${result.eventType} notifications.`,
      result
    });
  } catch (error: any) {
    const status = error instanceof AppError ? error.status : 400;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process unsubscribe request" },
      { status }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

