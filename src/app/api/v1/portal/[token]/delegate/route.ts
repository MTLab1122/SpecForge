import { NextRequest, NextResponse } from "next/server";
import { DelegateApprovalSchema } from "@/lib/validations/client-portal";
import crypto from "node:crypto";
import { z } from "zod";

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const parentShareToken = params.token;
    const body = await req.json();

    const parsed = DelegateApprovalSchema.parse(body);

    const accessToken = `del_${crypto.randomBytes(16).toString("hex")}`;
    const delegationRecord = {
      id: `deleg-${Date.now()}`,
      parentShareToken,
      delegatedByName: parsed.delegatedByName,
      delegatedByEmail: parsed.delegatedByEmail,
      recipientName: parsed.recipientName,
      recipientEmail: parsed.recipientEmail,
      recipientRole: parsed.recipientRole,
      notes: parsed.notes || null,
      accessToken,
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      delegatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: `Review authority delegated to ${parsed.recipientName} (${parsed.recipientEmail}).`,
      delegationRecord,
      portalAccessUrl: `https://specforge.io/portal/${accessToken}`
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delegate approval" },
      { status: 500 }
    );
  }
}
