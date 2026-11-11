import { NextRequest, NextResponse } from "next/server";
import { NotificationService } from "@/lib/notifications/notification-service";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "usr_developer";
    const inAppNotifications = NotificationService.getInAppNotifications(userId);
    const history = NotificationService.getHistory(userId, 50);
    const unreadCount = inAppNotifications.filter((n) => !n.isRead).length;

    return NextResponse.json({
      success: true,
      data: {
        unreadCount,
        notifications: inAppNotifications,
        history
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve notifications" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "usr_developer";
    const body = await req.json();
    const { notificationId, markAllAsRead } = body;

    if (markAllAsRead) {
      NotificationService.markRead(userId);
    } else if (notificationId) {
      NotificationService.markRead(userId, notificationId);
    }

    const updated = NotificationService.getInAppNotifications(userId);

    return NextResponse.json({
      success: true,
      data: {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.isRead).length
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "NOTIFICATION_UPDATE_FAILED", message: error.message } },
      { status: 400 }
    );
  }
}
