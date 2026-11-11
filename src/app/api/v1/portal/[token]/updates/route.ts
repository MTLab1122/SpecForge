import { NextRequest, NextResponse } from "next/server";
import { ClientProgressUpdateCreateSchema } from "@/lib/validations/client-portal";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const shareToken = params.token;

    const updates = [
      {
        id: "upd-1",
        updateType: "WEEKLY_DIGEST",
        title: "Sprint 1 Weekly Delivery Digest",
        summaryMarkdown: "During Sprint 1, our engineering team finalized the technical discovery specifications and delivered the complete Figma component library tokens. Architecture review completed with zero blocking issues.",
        scheduleHealth: "ON_TRACK",
        milestonesCompleted: [
          { title: "Milestone 1: Architectural Discovery & UX Prototypes", completedDate: "2026-03-01", notes: "100% sign-off achieved." }
        ],
        upcomingDeliverables: [
          { title: "Staging Cloud Provisioning & Next.js Scaffold", targetDate: "2026-03-08" },
          { title: "Authentication Flow & Database Migrations", targetDate: "2026-03-12" }
        ],
        sentAt: "2026-03-02"
      },
      {
        id: "upd-2",
        updateType: "DELIVERABLE_READY",
        title: "Figma High-Fidelity Design Prototype Ready for Review",
        summaryMarkdown: "The interactive design prototype covering all desktop and mobile views has been staged and is ready for your feedback in the Deliverables tab.",
        scheduleHealth: "ON_TRACK",
        sentAt: "2026-03-04"
      }
    ];

    return NextResponse.json({
      success: true,
      updates,
      totalCount: updates.length
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve progress updates" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const shareToken = params.token;
    const body = await req.json();

    const parsed = ClientProgressUpdateCreateSchema.parse(body);

    const newUpdate = {
      id: `upd-${Date.now()}`,
      shareToken,
      updateType: parsed.updateType,
      title: parsed.title,
      summaryMarkdown: parsed.summaryMarkdown,
      scheduleHealth: parsed.scheduleHealth,
      milestonesCompleted: parsed.milestonesCompleted,
      upcomingDeliverables: parsed.upcomingDeliverables,
      blockersNotes: parsed.blockersNotes || null,
      sentAt: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: "Progress update published to client portal.",
      update: newUpdate
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to publish progress update" },
      { status: 500 }
    );
  }
}
