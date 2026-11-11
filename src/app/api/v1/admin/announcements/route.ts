import { NextRequest, NextResponse } from "next/server";
import { AnnouncementsEngine } from "@/lib/admin/announcements-engine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userFacingOnly = searchParams.get("userFacing") === "true";

    if (userFacingOnly) {
      const plan = searchParams.get("plan");
      const role = searchParams.get("role");
      const activeAnnouncements = AnnouncementsEngine.getActiveForUser({ plan, role });
      return NextResponse.json({ success: true, announcements: activeAnnouncements });
    }

    const all = AnnouncementsEngine.listAll();
    return NextResponse.json({
      success: true,
      announcements: all
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list announcements" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, content, type, targetPlan, targetRole, actionUrl, actionLabel, expiresAt } = body;

    const announcement = AnnouncementsEngine.createAnnouncement({
      title,
      content,
      type: type || "BANNER",
      targetPlan,
      targetRole,
      actionUrl,
      actionLabel,
      expiresAt
    });

    return NextResponse.json({
      success: true,
      announcement
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create announcement" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, isActive } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing announcement id" }, { status: 400 });
    }

    const updated = AnnouncementsEngine.toggleActive(id, Boolean(isActive));

    return NextResponse.json({
      success: true,
      announcement: updated
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to toggle announcement" },
      { status: 500 }
    );
  }
}

