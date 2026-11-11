import { NextRequest, NextResponse } from "next/server";
import { BillingService, PLAN_TIERS, SubscriptionTier } from "@/lib/billing/billing-service";
import { AuditLogger } from "@/lib/reliability/observability";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("organizationId") || req.headers.get("x-org-id") || "org_apex_digital";

    const summary = BillingService.getCreditSummary(orgId);
    const access = BillingService.evaluatePlanAccess(orgId);
    const invoices = BillingService.listInvoices(orgId);

    return NextResponse.json({
      success: true,
      summary,
      access,
      invoicesCount: invoices.length,
      tiers: PLAN_TIERS
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve billing summary" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "user_owner";
    const body = await req.json();
    const { organizationId, action, targetTier, creditsToAdd } = body;

    const orgId = organizationId || req.headers.get("x-org-id") || "org_apex_digital";

    if (action === "TOP_UP") {
      const topUpAmount = Number(creditsToAdd) || 250;
      const updated = BillingService.topUpCredits(orgId, topUpAmount);

      await AuditLogger.record({
        organizationId: orgId,
        userId,
        action: "BILLING_CREDIT_TOP_UP",
        entityName: "SUBSCRIPTION",
        entityId: orgId,
        metadata: { topUpAmount, newQuota: updated.monthlyQuota }
      });

      return NextResponse.json({
        success: true,
        message: `Successfully added +${topUpAmount} AI generation credits`,
        summary: updated
      });
    }

    if (action === "UPGRADE" || action === "DOWNGRADE" || action === "CANCEL") {
      if (!targetTier && action !== "CANCEL") {
        return NextResponse.json(
          { success: false, error: "targetTier is required for plan changes" },
          { status: 400 }
        );
      }

      const tier: SubscriptionTier = (targetTier || "TRIAL") as SubscriptionTier;
      const updated = BillingService.changePlan({
        organizationId: orgId,
        targetTier: tier,
        action
      });

      await AuditLogger.record({
        organizationId: orgId,
        userId,
        action: `BILLING_PLAN_${action}`,
        entityName: "SUBSCRIPTION",
        entityId: orgId,
        metadata: { previousTier: tier, newStatus: updated.status }
      });

      return NextResponse.json({
        success: true,
        message: `Successfully executed plan ${action.toLowerCase()} to ${updated.tier}`,
        summary: updated
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Supported: UPGRADE, DOWNGRADE, CANCEL, TOP_UP" },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process billing operation" },
      { status: 500 }
    );
  }
}
