import { NextRequest, NextResponse } from "next/server";
import { AnalyticsEngine } from "@/lib/analytics/analytics-engine";
import { ExportReportRequestSchema } from "@/lib/validations/analytics";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = ExportReportRequestSchema.parse(body);

    const organizationId = req.headers.get("x-organization-id") || "org_apex_digital";

    if (validated.format === "CSV") {
      let headers: string[] = [];
      let rows: Array<Array<string | number>> = [];
      let filename = `specforge-${validated.reportType.toLowerCase()}-${Date.now()}.csv`;

      if (validated.reportType === "WEEKLY_EXECUTIVE") {
        headers = ["Period", "Projects Created", "Proposals Sent", "Approvals Received", "Time Saved (Hours)", "Conversion Rate (%)"];
        rows = [
          ["Last 30 Days", 12, 8, 6, 144.0, "75.0%"],
          ["Last 90 Days", 34, 24, 19, 432.0, "79.2%"],
          ["Past Year", 92, 71, 54, 1278.0, "76.1%"]
        ];
      } else if (validated.reportType === "MONTHLY_FINANCIAL") {
        headers = ["Organization ID", "Active Clients", "Active Projects", "Pipeline ($)", "Receivables ($)", "Utilization (%)", "Margin (%)"];
        rows = [
          [organizationId, 7, 9, 64500, 24500, "80%", "38.5%"]
        ];
      } else if (validated.reportType === "PROJECT_HEALTH") {
        headers = ["Project Title", "Scope Completeness (%)", "Estimate Variance (%)", "Turnaround (Hours)", "Delivery Progress (%)", "Invoiced ($)", "Paid ($)", "Outstanding ($)"];
        rows = [
          ["SaaS Client Portal", "94%", "+4.3%", 34, "84%", 28500, 20000, 8500],
          ["E-Commerce Checkout Revamp", "90%", "-2.1%", 48, "100%", 18000, 18000, 0]
        ];
      } else if (validated.reportType === "FUNNEL_COHORTS") {
        const stages = AnalyticsEngine.calculateFunnelAnalysis();
        headers = ["Stage Key", "Stage Name", "User Count", "Conversion (%)", "Drop-off (%)", "Median Hours"];
        rows = stages.map((s) => [s.stageKey, s.stageName, s.userCount, `${s.conversionPercent}%`, `${s.dropoffPercent}%`, s.medianDurationHours ?? 0]);
      } else {
        headers = ["Metric", "Value"];
        rows = [["Export Timestamp", new Date().toISOString()]];
      }

      const csvContent = AnalyticsEngine.serializeToCsv(headers, rows);

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`
        }
      });
    }

    // Default JSON / Markdown response
    return NextResponse.json({
      success: true,
      reportType: validated.reportType,
      format: validated.format,
      generatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate export" },
      { status: 400 }
    );
  }
}
