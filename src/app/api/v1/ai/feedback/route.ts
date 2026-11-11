import { NextRequest, NextResponse } from "next/server";
import { SubmitAiFeedbackSchema } from "@/lib/validations/trustworthy-ai";

let mockFeedbacks: any[] = [];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = SubmitAiFeedbackSchema.parse(body);

    const feedbackEntry = {
      id: `fb_${mockFeedbacks.length + 1}`,
      userId: "usr_demo_founder_1",
      ...validatedData,
      createdAt: new Date().toISOString()
    };

    mockFeedbacks.push(feedbackEntry);

    return NextResponse.json({
      success: true,
      data: feedbackEntry
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "FEEDBACK_SUBMISSION_FAILED", message: error.message } },
      { status: 400 }
    );
  }
}
