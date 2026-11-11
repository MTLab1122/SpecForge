import { NextRequest, NextResponse } from "next/server";
import { DurableJobQueue } from "@/lib/queue/durable-queue";
import { CreditLedger } from "@/lib/billing/credit-ledger";
import { AuthorizationService } from "@/lib/permissions/authorization-service";
import type { JobType, JobState } from "@/lib/queue/job-types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = req.headers.get("x-workspace-id") || req.headers.get("x-org-id") || searchParams.get("organizationId");
    const userId = req.headers.get("x-user-id");
    const role = (req.headers.get("x-user-role") || "MANAGER") as any;

    if (!orgId || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required authentication and workspace headers." },
        { status: 401 }
      );
    }

    const auth = AuthorizationService.authorize({
      context: { userId, organizationId: orgId, role },
      action: "VIEW_AUDIT_LOG"
    });

    if (!auth.allowed) {
      return NextResponse.json(
        { success: false, error: auth.reason },
        { status: auth.statusCode }
      );
    }

    const statusFilter = searchParams.get("status") as JobState | undefined;
    const typeFilter = searchParams.get("jobType") as JobType | undefined;

    const jobs = DurableJobQueue.listJobs(orgId, {
      status: statusFilter,
      jobType: typeFilter
    });

    const costSummary = CreditLedger.getWorkspaceCostSummary(orgId);

    return NextResponse.json({
      success: true,
      jobs,
      costSummary,
      totalCount: jobs.length
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list background jobs." },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-workspace-id") || req.headers.get("x-org-id");
    const userId = req.headers.get("x-user-id");
    const role = (req.headers.get("x-user-role") || "MANAGER") as any;

    if (!orgId || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required authentication and workspace headers." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { jobType, payload, idempotencyKey, priority, estimatedCredits } = body;

    if (!jobType) {
      return NextResponse.json(
        { success: false, error: "Required field 'jobType' is missing." },
        { status: 400 }
      );
    }

    const { job, isDuplicate } = await DurableJobQueue.enqueue({
      organizationId: orgId,
      userId,
      jobType,
      payload,
      idempotencyKey,
      priority,
      estimatedCredits
    });

    return NextResponse.json(
      {
        success: true,
        job,
        isDuplicate,
        message: isDuplicate ? "Returned existing job (idempotent)." : "Job enqueued successfully."
      },
      { status: isDuplicate ? 200 : 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code || "JOB_ENQUEUE_FAILED" },
      { status: error.status || 500 }
    );
  }
}
