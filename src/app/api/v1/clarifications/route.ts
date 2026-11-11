import { NextRequest, NextResponse } from "next/server";
import { 
  CreateClarificationRequestSchema, 
  AttachClientResponseSchema 
} from "@/lib/validations/trustworthy-ai";

let mockClarifications = [
  {
    id: "clar_1",
    question: "Which third-party payment gateways must be supported at launch (e.g., Stripe, JazzCash, Easypaisa)?",
    suggestedContext: "The brief mentions 'mobile payments' without specifying gateway credentials or checkout currency.",
    clientResponse: "We need Stripe for international cards and JazzCash/Easypaisa for local customers in Pakistan.",
    status: "ANSWERED",
    sentAt: "2026-11-09T08:45:00Z",
    answeredAt: "2026-11-09T09:30:00Z"
  },
  {
    id: "clar_2",
    question: "Do you require biometric authentication (FaceID / Fingerprint) in MVP or username/password only?",
    suggestedContext: "Audio note references 'fast mobile login' which often implies FaceID/TouchID.",
    clientResponse: null,
    status: "SENT_TO_CLIENT",
    sentAt: "2026-11-09T09:00:00Z",
    answeredAt: null
  }
];

export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    data: mockClarifications
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if attaching client response
    if (body.action === "ATTACH_RESPONSE") {
      const { clarificationId, clientResponse, triggerTargetedReExtraction } = 
        AttachClientResponseSchema.parse(body);

      mockClarifications = mockClarifications.map((c) => {
        if (c.id === clarificationId) {
          return {
            ...c,
            clientResponse,
            status: "ANSWERED",
            answeredAt: new Date().toISOString()
          };
        }
        return c;
      });

      return NextResponse.json({
        success: true,
        data: {
          clarification: mockClarifications.find((c) => c.id === clarificationId),
          reExtractionTriggered: triggerTargetedReExtraction,
          reExtractedItemsCount: triggerTargetedReExtraction ? 2 : 0
        }
      });
    }

    // Default: Create new question
    const { projectId, question, suggestedContext } = CreateClarificationRequestSchema.parse(body);
    const newClar = {
      id: `clar_${mockClarifications.length + 1}`,
      question,
      suggestedContext,
      clientResponse: null,
      status: "DRAFT" as const,
      sentAt: null,
      answeredAt: null
    };
    mockClarifications.push(newClar);

    return NextResponse.json({
      success: true,
      data: newClar
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "CLARIFICATION_FAILED", message: error.message } },
      { status: 400 }
    );
  }
}
