import { NextRequest, NextResponse } from "next/server";
import { FeedbackService } from "@/lib/engagement/feedback-service";

export async function GET(req: NextRequest) {
  try {
    const featureRequests = FeedbackService.listFeatureRequests();

    // Sample NPS rating distribution
    const sampleScores = [10, 10, 9, 9, 8, 8, 7, 6, 10, 9, 10, 8];
    const npsSummary = FeedbackService.calculateNps(sampleScores);

    return NextResponse.json({
      success: true,
      featureRequests,
      npsSummary
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch feedback data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const organizationId = req.headers.get("x-organization-id");
    const body = await req.json();
    const { type, score, category, title, content, severity } = body;

    if (!type || (!content && score === undefined)) {
      return NextResponse.json({ success: false, error: "Missing required feedback fields" }, { status: 400 });
    }

    const item = FeedbackService.submit({
      userId,
      organizationId,
      type,
      score,
      category,
      title,
      content: content || `NPS Rating: ${score}/10`,
      severity
    });

    return NextResponse.json({
      success: true,
      feedback: item
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit feedback" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { featureId } = body;

    if (!featureId) {
      return NextResponse.json({ success: false, error: "Missing featureId" }, { status: 400 });
    }

    const result = FeedbackService.upvoteFeature(featureId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: "Feature request not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      featureId,
      newUpvoteCount: result.newCount
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to upvote feature" },
      { status: 500 }
    );
  }
}
