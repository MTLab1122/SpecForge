import { NextRequest, NextResponse } from "next/server";
import { NotionExportSchema, InternalTask } from "@/lib/validations/delivery-handover";
import { NotionExportAdapter } from "@/lib/integrations/adapters/notion-adapter";
import { z } from "zod";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = NotionExportSchema.parse(body);

    const mockTasks: InternalTask[] = [
      {
        id: "task-1",
        title: "UX Research, Wireframes & Component Design System",
        description: "Figma tokens and wireframes.",
        priority: "HIGH",
        status: "DONE",
        estimatedHours: 24,
        labels: ["design", "ux"],
        milestoneTitle: "Milestone 1",
        acceptanceCriteria: ["Mobile viewports responsive"]
      },
      {
        id: "task-2",
        title: "Frontend Application & State Management",
        description: "Next.js 14 client interface.",
        priority: "HIGH",
        status: "IN_PROGRESS",
        estimatedHours: 60,
        labels: ["frontend", "react"],
        milestoneTitle: "Milestone 2",
        acceptanceCriteria: ["Optimistic UI updates"]
      }
    ];

    const result = NotionExportAdapter.exportToNotion({
      projectTitle: "Enterprise Client Portal Build",
      scopeSummary: "Full-stack development of client portal with Stripe billing and RBAC.",
      estimateTotal: 18500,
      currency: "USD",
      tasks: mockTasks,
      format: parsed.exportFormat
    });

    return NextResponse.json({
      success: true,
      message: "Notion export generated successfully.",
      export: result
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate Notion export" },
      { status: 500 }
    );
  }
}
