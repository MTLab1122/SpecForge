import { NextRequest, NextResponse } from "next/server";
import { PrioritizeRequirementSchema } from "@/lib/validations/structured-discovery";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = PrioritizeRequirementSchema.parse(body);

    const updated = {
      id: validated.requirementId,
      moscow: validated.moscow,
      businessValue: validated.businessValue,
      complexityScore: validated.complexityScore,
      dependsOnIds: validated.dependsOnIds,
      blocksIds: validated.blocksIds,
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "PRIORITIZATION_FAILED", message: error.message } },
      { status: 400 }
    );
  }
}

