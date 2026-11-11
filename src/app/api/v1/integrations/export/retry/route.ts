import { NextRequest, NextResponse } from "next/server";
import { RetryExportRequestSchema, InternalTask } from "@/lib/validations/delivery-handover";
import { DeliveryHandoverOrchestrator } from "@/lib/integrations/orchestrator";
import { z } from "zod";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RetryExportRequestSchema.parse(body);

    const mockTask: InternalTask = {
      id: "task-retry-1",
      title: "Docker Staging Deployment & Cloud DNS",
      description: "Automated container pipeline setup.",
      priority: "HIGH",
      status: "TODO",
      estimatedHours: 16,
      labels: ["devops", "cloud"],
      milestoneTitle: "Milestone 1",
      acceptanceCriteria: ["DNS propagates", "SSL active"]
    };

    const config = {
      apiKey: "mock-valid-key",
      targetProjectOrList: "agency-org/client-repo"
    };

    const retryResult = await DeliveryHandoverOrchestrator.retryTaskSync({
      task: mockTask,
      provider: "GITHUB",
      config,
      confirmedByUser: parsed.confirmedByUser,
      currentRetryCount: 1
    });

    return NextResponse.json({
      success: true,
      message: "Task export retried successfully.",
      result: retryResult
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retry task export" },
      { status: 500 }
    );
  }
}
