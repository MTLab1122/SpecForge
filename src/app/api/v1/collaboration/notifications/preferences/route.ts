import { NextRequest, NextResponse } from "next/server";
import { NotificationService } from "@/lib/notifications/notification-service";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "usr_developer";
    const preferences = NotificationService.getPreferences(userId);

    return NextResponse.json({
      success: true,
      data: preferences
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve preferences" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "usr_developer";
    const body = await req.json();

    const updated = NotificationService.updatePreferences(userId, body);

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "PREFERENCES_UPDATE_FAILED", message: error.message } },
      { status: 400 }
    );
  }
}
