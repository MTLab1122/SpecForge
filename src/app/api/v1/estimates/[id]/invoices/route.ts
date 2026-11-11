import { NextRequest, NextResponse } from "next/server";
import { InvoiceCreateSchema } from "@/lib/validations/commercial-estimation";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: estimateId } = await params;

    // Sample invoices for demonstration / production database lookup
    const invoices = [
      {
        id: "inv-1",
        estimateId,
        invoiceNumber: "INV-2026-001",
        title: "30% Kickoff & UX Architecture Deposit",
        status: "PAID",
        currency: "USD",
        totalAmount: 4500,
        invoicedAmount: 4500,
        paidAmount: 4500,
        outstandingAmount: 0,
        issueDate: "2026-03-01",
        dueDate: "2026-03-15",
        notes: "Received via wire transfer."
      },
      {
        id: "inv-2",
        estimateId,
        invoiceNumber: "INV-2026-002",
        title: "30% Core Feature Development Milestone",
        status: "ISSUED",
        currency: "USD",
        totalAmount: 4500,
        invoicedAmount: 4500,
        paidAmount: 0,
        outstandingAmount: 4500,
        issueDate: "2026-03-20",
        dueDate: "2026-04-05",
        notes: "Pending client accounts payable processing."
      }
    ];

    const estimateGrandTotal = 15000;
    const totalInvoiced = invoices.reduce((acc, i) => acc + i.invoicedAmount, 0);
    const totalPaid = invoices.reduce((acc, i) => acc + i.paidAmount, 0);
    const outstanding = totalInvoiced - totalPaid;
    const unbilledCapacity = Math.max(0, estimateGrandTotal - totalInvoiced);

    return NextResponse.json({
      success: true,
      estimateId,
      estimateGrandTotal,
      totalInvoiced,
      totalPaid,
      outstandingAmount: outstanding,
      unbilledCapacity,
      invoices
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve invoices" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: estimateId } = await params;
    const body = await req.json();

    const payload = { ...body, estimateId };
    const parsed = InvoiceCreateSchema.parse(payload);

    const newInvoice = {
      id: `inv-${Date.now()}`,
      estimateId,
      projectId: parsed.projectId,
      invoiceNumber: parsed.invoiceNumber,
      title: parsed.title,
      currency: parsed.currency,
      status: "ISSUED",
      totalAmount: parsed.invoicedAmount,
      invoicedAmount: parsed.invoicedAmount,
      paidAmount: 0,
      outstandingAmount: parsed.invoicedAmount,
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: parsed.dueDate || null,
      notes: parsed.notes || null,
      lineItems: parsed.lineItems,
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: "Milestone invoice issued successfully (ledger tracking only; direct payment gateway excluded).",
      invoice: newInvoice
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create invoice" },
      { status: 500 }
    );
  }
}

