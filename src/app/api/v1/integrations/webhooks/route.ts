import { NextRequest, NextResponse } from "next/server";
import { WebhookSubscriptionCreateSchema } from "@/lib/validations/delivery-handover";
import { DeliveryHandoverOrchestrator } from "@/lib/integrations/orchestrator";
import crypto from "node:crypto";
import { z } from "zod";

export async function GET() {
  try {
    const subscriptions = [
      {
        id: "wh_sub_1",
        targetUrl: "https://api.agency.com/webhooks/specforge",
        secret: "whsec_984fbc9a128e4693a8d11c765ef3",
        eventTypes: ["proposal.approved", "scope.approved", "milestone.completed"],
        isActive: true,
        createdAt: "2026-03-01 10:00 UTC"
      }
    ];

    return NextResponse.json({
      success: true,
      subscriptions,
      totalActive: subscriptions.length
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve webhook subscriptions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = WebhookSubscriptionCreateSchema.parse(body);

    const secret = `whsec_${crypto.randomBytes(16).toString("hex")}`;
    const newSub = {
      id: `wh_sub_${Date.now()}`,
      targetUrl: parsed.targetUrl,
      secret,
      eventTypes: parsed.eventTypes,
      isActive: true,
      description: parsed.description || null,
      createdAt: new Date().toISOString()
    };

    // Generate sample signed test event
    const testDelivery = DeliveryHandoverOrchestrator.createSignedWebhookEvent({
      eventType: parsed.eventTypes[0] || "project.created",
      payload: {
        projectId: "proj-sample-42",
        message: "Test webhook verification event from SpecForge Delivery Handover.",
        triggeredBy: "webhook.test_ping"
      },
      secret
    });

    return NextResponse.json({
      success: true,
      message: "Webhook subscription registered successfully.",
      subscription: newSub,
      sampleSignedEvent: testDelivery
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to register webhook subscription" },
      { status: 500 }
    );
  }
}
