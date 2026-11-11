import { NextRequest, NextResponse } from "next/server";
import { ClientSectionalApprovalSchema } from "@/lib/validations/client-portal";
import { z } from "zod";

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const shareToken = params.token;
    const body = await req.json();

    const parsed = ClientSectionalApprovalSchema.parse(body);

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const clientUserAgent = req.headers.get("user-agent") || "Mozilla/5.0 ClientPortal";

    const approvedSections = parsed.sections.filter((s) => s.status === "APPROVED");
    const requestedChangeSections = parsed.sections.filter((s) => s.status === "CHANGES_REQUESTED");

    const sectionalSummary = {
      totalSections: parsed.sections.length,
      approvedCount: approvedSections.length,
      changesRequestedCount: requestedChangeSections.length,
      allApproved: requestedChangeSections.length === 0,
      submittedBy: parsed.clientName,
      submittedEmail: parsed.clientEmail,
      submittedAt: new Date().toISOString(),
      clientIp,
      clientUserAgent,
      sections: parsed.sections
    };

    return NextResponse.json({
      success: true,
      message: sectionalSummary.allApproved
        ? "All sections successfully approved by client."
        : `Sectional review recorded: ${approvedSections.length} approved, ${requestedChangeSections.length} need changes.`,
      sectionalSummary
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit sectional approvals" },
      { status: 500 }
    );
  }
}
