import { NextRequest, NextResponse } from "next/server";
import { StripeWebhookHandler } from "@/lib/billing/stripe-webhook-handler";
import { AppError } from "@/lib/reliability/error-envelope";
import { Logger } from "@/lib/reliability/observability";

export async function POST(req: NextRequest) {
  try {
    // 1. Raw body preservation for cryptographic signature verification
    const rawPayload = await req.text();
    const signatureHeader = req.headers.get("stripe-signature") || "";

    // 2. Client IP validation
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    // In production or test environments, check provider IP range
    const isIpAllowed = StripeWebhookHandler.verifyProviderIp(clientIp, true);
    if (!isIpAllowed) {
      Logger.warn(`Rejected Stripe webhook from untrusted IP: ${clientIp}`);
      return NextResponse.json(
        { success: false, error: "Forbidden: Untrusted webhook origin IP" },
        { status: 403 }
      );
    }

    // 3. Verify Stripe cryptographic HMAC-SHA256 signature and replay tolerance
    StripeWebhookHandler.verifySignature({
      rawPayload,
      signatureHeader
    });

    // 4. Parse payload and process event idempotently
    const event = JSON.parse(rawPayload);
    const result = await StripeWebhookHandler.processEvent(event);

    return NextResponse.json({
      success: true,
      received: true,
      result
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          code: error.code,
          error: error.message
        },
        { status: error.status || 400 }
      );
    }

    Logger.error("Unhandled Stripe webhook processing error", error, {
      context: { error: error.message, stack: error.stack }
    });

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process Stripe webhook"
      },
      { status: 500 }
    );
  }
}

