import { NextRequest, NextResponse } from "next/server";
import { CommercialEstimationEngine } from "@/lib/estimation/engine";
import { AccuracyFeedbackInputSchema } from "@/lib/validations/commercial-estimation";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const estimateId = params.id;

    const estimatedTotalHours = 120;
    const actualTotalHours = 142;
    const estimatedByRole = {
      "UI/UX Design": 20,
      "Full Stack Development": 60,
      "QA Engineering": 20,
      "DevOps & Deployment": 10,
      "Project Management": 10
    };
    const actualByRole = {
      "UI/UX Design": 22,
      "Full Stack Development": 74,
      "QA Engineering": 28,
      "DevOps & Deployment": 9,
      "Project Management": 9
    };

    const analysis = CommercialEstimationEngine.analyzeAccuracy({
      estimatedTotalHours,
      actualTotalHours,
      estimatedByRole,
      actualByRole
    });

    return NextResponse.json({
      success: true,
      estimateId,
      analysis
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve accuracy analysis" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const estimateId = params.id;
    const body = await req.json();

    const parsed = AccuracyFeedbackInputSchema.parse(body);

    const estimatedTotalHours = Number(body.estimatedTotalHours || 120);
    const estimatedByRole = body.estimatedByRole || {};

    const analysis = CommercialEstimationEngine.analyzeAccuracy({
      estimatedTotalHours,
      actualTotalHours: parsed.actualTotalHours,
      estimatedByRole,
      actualByRole: parsed.actualHoursByRole
    });

    const accuracyRecord = {
      id: `acc-${Date.now()}`,
      estimateId,
      projectId: body.projectId || "project-1",
      estimatedTotalHours,
      actualTotalHours: parsed.actualTotalHours,
      varianceHours: analysis.varianceHours,
      variancePercent: analysis.variancePercent,
      roleVarianceJson: analysis.roleVariance,
      recurringErrorsJson: analysis.recurringErrors,
      calibrationMultiplier: analysis.recommendedCalibrationMultiplier,
      status: analysis.status,
      summaryText: analysis.summaryText,
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: "Estimate accuracy variance and calibration feedback recorded successfully.",
      accuracyRecord
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process accuracy feedback" },
      { status: 500 }
    );
  }
}

