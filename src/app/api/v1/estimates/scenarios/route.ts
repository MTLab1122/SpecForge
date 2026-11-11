import { NextRequest, NextResponse } from "next/server";
import { CommercialEstimationEngine } from "@/lib/estimation/engine";
import { EstimateItemInputSchema } from "@/lib/validations/commercial-estimation";
import { z } from "zod";

const ScenarioRequestSchema = z.object({
  items: z.array(EstimateItemInputSchema).min(1, "Items array cannot be empty"),
  taxRatePercent: z.number().min(0).max(100).default(0),
  discountAmount: z.number().min(0).default(0),
  minimumProjectValue: z.number().min(0).default(0),
  managerApprovalThreshold: z.number().min(0).default(10000)
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ScenarioRequestSchema.parse(body);

    const comparison = CommercialEstimationEngine.compareScenarios(
      parsed.items,
      parsed.taxRatePercent,
      parsed.discountAmount
    );

    return NextResponse.json({
      success: true,
      comparison,
      parameters: {
        taxRatePercent: parsed.taxRatePercent,
        discountAmount: parsed.discountAmount,
        minimumProjectValue: parsed.minimumProjectValue,
        managerApprovalThreshold: parsed.managerApprovalThreshold
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to calculate scenario comparison" },
      { status: 500 }
    );
  }
}

