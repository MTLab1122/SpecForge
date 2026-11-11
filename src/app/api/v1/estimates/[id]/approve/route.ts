import { NextRequest, NextResponse } from "next/server";
import { CommercialEstimationEngine } from "@/lib/estimation/engine";
import { EstimateApprovalActionSchema } from "@/lib/validations/commercial-estimation";
import { z } from "zod";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: estimateId } = await params;
    const body = await req.json();

    const parsed = EstimateApprovalActionSchema.parse(body);

    // In production, current status and grand total are retrieved from DB
    const currentStatus = body.currentStatus || "DRAFT";
    const grandTotalCost = Number(body.grandTotalCost || 12500);
    const managerThreshold = Number(body.managerApprovalThreshold || 10000);

    const validation = CommercialEstimationEngine.canApproveEstimate({
      currentStatus,
      requestedAction: parsed.action,
      userRole: parsed.userRole,
      grandTotalCost,
      managerApprovalThreshold: managerThreshold
    });

    if (!validation.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: validation.reason || "Action rejected by workflow governance rules"
        },
        { status: 403 }
      );
    }

    let nextStatus = currentStatus;
    switch (parsed.action) {
      case "SUBMIT_FOR_REVIEW":
        nextStatus = "INTERNAL_REVIEW";
        break;
      case "MANAGER_APPROVE":
        nextStatus = "MANAGER_APPROVED";
        break;
      case "CLIENT_APPROVE":
        nextStatus = "CLIENT_APPROVED";
        break;
      case "REJECT":
        nextStatus = "REJECTED";
        break;
      case "REVISE":
        nextStatus = "REVISED";
        break;
    }

    const auditEntry = {
      id: `audit-${Date.now()}`,
      estimateId,
      action: parsed.action,
      previousStatus: currentStatus,
      newStatus: nextStatus,
      actingUserId: parsed.userId,
      userRole: parsed.userRole,
      notes: parsed.revisionNotes || parsed.rejectionReason || null,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      estimateId,
      previousStatus: currentStatus,
      newStatus: nextStatus,
      auditEntry,
      message: `Estimate transition to ${nextStatus} succeeded.`
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process approval action" },
      { status: 500 }
    );
  }
}

