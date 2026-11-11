import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/lib/billing/billing-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;
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

    const invoice = BillingService.getInvoice(orgId, invoiceId);

    if (!invoice) {
      return NextResponse.json(
        {
          success: false,
          error: `Invoice '${invoiceId}' was not found or access is forbidden for workspace '${orgId}'.`
        },
        { status: 404 }
      );
    }

    const downloadDetails = BillingService.getInvoiceDownloadUrl(orgId, invoiceId);

    return NextResponse.json({
      success: true,
      invoice,
      downloadUrl: downloadDetails.downloadUrl,
      expiresAt: downloadDetails.expiresAt
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process invoice download request."
      },
      { status: 500 }
    );
  }
}

