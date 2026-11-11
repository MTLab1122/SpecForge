import { NextRequest, NextResponse } from "next/server";
import { ScheduledReportCreateSchema } from "@/lib/validations/analytics";

// In-memory or database-backed scheduled configurations per tenant
const inMemoryScheduledReports: Record<string, Array<{
  id: string;
  reportType: string;
  recipients: string[];
  format: string;
  frequency: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  isActive: boolean;
  lastSentAt: string | null;
  createdAt: string;
}>> = {
  org_apex_digital: [
    {
      id: "sch_1",
      reportType: "WEEKLY_EXECUTIVE",
      recipients: ["founder@apexdigital.com", "director@apexdigital.com"],
      format: "PDF",
      frequency: "WEEKLY",
      dayOfWeek: 1,
      isActive: true,
      lastSentAt: "2026-11-02T08:00:00Z",
      createdAt: "2026-10-01T12:00:00Z"
    }
  ]
};

export async function GET(req: NextRequest) {
  try {
    const organizationId = req.headers.get("x-organization-id") || "org_apex_digital";
    const reports = inMemoryScheduledReports[organizationId] || [];

    return NextResponse.json({
      success: true,
      organizationId,
      scheduledReports: reports
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch scheduled reports" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const organizationId = req.headers.get("x-organization-id") || "org_apex_digital";
    const body = await req.json();
    const validated = ScheduledReportCreateSchema.parse(body);

    const newSchedule = {
      id: `sch_${Date.now()}`,
      reportType: validated.reportType,
      recipients: validated.recipients,
      format: validated.format,
      frequency: validated.frequency,
      dayOfWeek: validated.dayOfWeek,
      dayOfMonth: validated.dayOfMonth,
      isActive: true,
      lastSentAt: null,
      createdAt: new Date().toISOString()
    };

    if (!inMemoryScheduledReports[organizationId]) {
      inMemoryScheduledReports[organizationId] = [];
    }
    inMemoryScheduledReports[organizationId].push(newSchedule);

    return NextResponse.json({
      success: true,
      scheduledReport: newSchedule
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create scheduled report" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const organizationId = req.headers.get("x-organization-id") || "org_apex_digital";
    const body = await req.json();
    const { id, isActive } = body;

    const list = inMemoryScheduledReports[organizationId] || [];
    const item = list.find((s) => s.id === id);

    if (!item) {
      return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
    }

    item.isActive = Boolean(isActive);

    return NextResponse.json({
      success: true,
      scheduledReport: item
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update schedule" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const organizationId = req.headers.get("x-organization-id") || "org_apex_digital";
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Schedule ID required" }, { status: 400 });
    }

    if (inMemoryScheduledReports[organizationId]) {
      inMemoryScheduledReports[organizationId] = inMemoryScheduledReports[organizationId].filter(
        (s) => s.id !== id
      );
    }

    return NextResponse.json({
      success: true,
      deletedId: id
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete schedule" },
      { status: 500 }
    );
  }
}
