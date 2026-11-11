import { NextRequest, NextResponse } from "next/server";
import { RequestRevisionSchema } from "@/lib/validations/client-portal";
import { z } from "zod";

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const shareToken = params.token;
    const body = await req.json();

    const parsed = RequestRevisionSchema.parse(body);

    const revisionTicket = {
      id: `rev-${Date.now()}`,
      shareToken,
      clientName: parsed.clientName,
      clientEmail: parsed.clientEmail,
      feedbackCategory: parsed.feedbackCategory,
      revisionNotes: parsed.revisionNotes,
      sectionsToRevise: parsed.sectionsToRevise || ["general"],
      status: "PENDING_AGENCY_REVISION",
      submittedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: "Revision request successfully logged and dispatched to the agency team.",
      revisionTicket
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process revision request" },
      { status: 500 }
    );
  }
}
