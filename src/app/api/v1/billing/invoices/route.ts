import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/lib/billing/billing-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("organizationId") || req.headers.get("x-org-id");

    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing workspace tenant context (x-org-id required)."
        },
        { status: 400 }
      );
    }

    const invoices = BillingService.listInvoices(orgId);

    return NextResponse.json({
      success: true,
      organizationId: orgId,
      invoices,
      count: invoices.length
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to retrieve invoice history."
      },
      { status: 500 }
    );
  }
}

