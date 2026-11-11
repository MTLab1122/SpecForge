import { NextRequest, NextResponse } from "next/server";
import { ClientPresentationEngine } from "@/lib/client-portal/presentation-engine";
import { ClientFullApprovalSchema } from "@/lib/validations/client-portal";
import { z } from "zod";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const shareToken = (await params).token;
    const body = await req.json();

    const parsed = ClientFullApprovalSchema.parse(body);

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const clientUserAgent = req.headers.get("user-agent") || "Mozilla/5.0 ClientPortal";

    // Mock proposal lookup
    const proposalId = `prop-${shareToken.substring(0, 8)}`;
    const proposalVersion = 1;
    const approvedAmount = 28500;
    const currency = "USD";
    const sampleDeliverables = [{ id: "deliv-1", title: "UX Design" }, { id: "deliv-2", title: "Web Platform" }];

    // Generate cryptographic digital seal
    const certificate = ClientPresentationEngine.generateDigitalSeal({
      proposalId,
      proposalVersion,
      approvedAmount,
      currency,
      clientName: parsed.clientName,
      clientEmail: parsed.clientEmail,
      signerTitle: parsed.signerTitle,
      signerCompany: parsed.signerCompany,
      clientIp,
      clientUserAgent,
      deliverables: sampleDeliverables
    });

    const approvalRecord = {
      id: `appr-${Date.now()}`,
      proposalId,
      clientName: parsed.clientName,
      clientEmail: parsed.clientEmail,
      signerTitle: parsed.signerTitle || null,
      signerCompany: parsed.signerCompany || null,
      action: "APPROVE",
      approvalType: "FULL_SCOPE",
      comments: parsed.comments || null,
      ipAddress: clientIp,
      userAgent: clientUserAgent,
      approvedAt: certificate.signedPayload.approvedAt
    };

    return NextResponse.json({
      success: true,
      message: "Proposal scope approved and digital seal recorded successfully.",
      certificate,
      approvalRecord,
      legalNotice: certificate.legalDisclaimer
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process approval" },
      { status: 500 }
    );
  }
}
