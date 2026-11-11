import { NextRequest, NextResponse } from "next/server";
import { SupportEngine, TicketStatus, TicketPriority } from "@/lib/admin/support-engine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as TicketStatus | null;
    const priority = searchParams.get("priority") as TicketPriority | null;

    const tickets = SupportEngine.listTickets({
      status: status || undefined,
      priority: priority || undefined
    });

    return NextResponse.json({
      success: true,
      tickets
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list support tickets" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "usr_lead";
    const organizationId = req.headers.get("x-organization-id") || "org_apex_digital";
    const body = await req.json();
    const { subject, description, category, priority } = body;

    const ticket = SupportEngine.createTicket({
      organizationId,
      creatorUserId: userId,
      creatorEmail: "founder@apexdigital.com",
      subject,
      description,
      category: category || "GENERAL",
      priority: priority || "MEDIUM"
    });

    return NextResponse.json({
      success: true,
      ticket
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create support ticket" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actorUserId = req.headers.get("x-user-id") || "admin_sys";
    const body = await req.json();
    const { ticketId, status, assignedUserId, assignedName } = body;

    if (!ticketId) {
      return NextResponse.json({ success: false, error: "Missing ticketId" }, { status: 400 });
    }

    let ticket;
    if (status) {
      ticket = SupportEngine.updateStatus(ticketId, status as TicketStatus, actorUserId);
    }
    if (assignedUserId && assignedName) {
      ticket = SupportEngine.assignTicket(ticketId, assignedUserId, assignedName, actorUserId);
    }

    return NextResponse.json({
      success: true,
      ticket
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update support ticket" },
      { status: 500 }
    );
  }
}

