import { NextRequest, NextResponse } from "next/server";
import { SlackNotificationSchema } from "@/lib/validations/delivery-handover";
import { SlackAdapter } from "@/lib/integrations/adapters/slack-adapter";
import { z } from "zod";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SlackNotificationSchema.parse(body);

    const outcome = await SlackAdapter.sendNotification(parsed);

    if (!outcome.success) {
      return NextResponse.json({ success: false, error: outcome.error }, { status: 400 });
    }

    const preview = SlackAdapter.formatMessage(parsed);

    return NextResponse.json({
      success: true,
      message: "Slack notification formatted and sent successfully.",
      payloadPreview: preview
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to dispatch Slack notification" },
      { status: 500 }
    );
  }
}
