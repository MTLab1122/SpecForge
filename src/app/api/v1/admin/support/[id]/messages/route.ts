import { NextRequest, NextResponse } from "next/server";
import { SupportEngine } from "@/lib/admin/support-engine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authorUserId = req.headers.get("x-user-id") || "admin_sys";
    const { id: ticketId } = await params;
    const body = await req.json();
    const { message, isInternalNote = false } = body;

    if (!message) {
      return NextResponse.json({ success: false, error: "Missing message text" }, { status: 400 });
    }

    const newMessage = SupportEngine.addMessage({
      ticketId,
      authorUserId,
      authorName: isInternalNote ? "Staff Support Specialist" : "SpecForge Operations Lead",
      isInternalNote: Boolean(isInternalNote),
      message
    });

    return NextResponse.json({
      success: true,
      message: newMessage
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to append ticket message" },
      { status: 500 }
    );
  }
}

