import { NextRequest, NextResponse } from "next/server";
import { ReviewRequirementItemSchema } from "@/lib/validations/trustworthy-ai";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const validatedData = ReviewRequirementItemSchema.parse({
      ...body,
      requirementId: (await params).id
    });

    const userId = "usr_demo_founder_1";
    const timestamp = new Date().toISOString();

    // Map action to state
    let reviewState: "ACCEPTED" | "EDITED" | "REJECTED" | "MARKED_AS_ASSUMPTION" = "ACCEPTED";
    let isAssumption = false;
    let assumptionConfirmed = false;
    let provenance: "USER_CONFIRMED" | "AI_SUGGESTION" = "USER_CONFIRMED";

    switch (validatedData.action) {
      case "ACCEPT":
        reviewState = "ACCEPTED";
        provenance = "USER_CONFIRMED";
        assumptionConfirmed = true;
        break;
      case "EDIT":
        reviewState = "EDITED";
        provenance = "USER_CONFIRMED";
        assumptionConfirmed = true;
        break;
      case "REJECT":
        reviewState = "REJECTED";
        break;
      case "MARK_AS_ASSUMPTION":
        reviewState = "MARKED_AS_ASSUMPTION";
        isAssumption = true;
        assumptionConfirmed = validatedData.confirmAssumption;
        provenance = "AI_SUGGESTION";
        break;
    }

    const updatedRequirement = {
      id: (await params).id,
      reviewState,
      provenance,
      isAssumption,
      assumptionConfirmed,
      title: validatedData.updatedTitle || "User Confirmed Feature",
      description: validatedData.updatedDescription || "User verified description",
      reviewComments: validatedData.reviewComment || null,
      lastEditedById: userId,
      updatedAt: timestamp
    };

    return NextResponse.json({
      success: true,
      data: updatedRequirement
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "REVIEW_MUTATION_FAILED",
          message: error.message
        }
      },
      { status: 400 }
    );
  }
}
