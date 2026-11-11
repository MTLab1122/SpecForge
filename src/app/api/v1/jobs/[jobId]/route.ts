import { NextRequest, NextResponse } from "next/server";
import { DurableJobQueue } from "@/lib/queue/durable-queue";
import { AuthorizationService } from "@/lib/permissions/authorization-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
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

    const job = DurableJobQueue.getJob((await params).jobId);
    if (!job) {
      return NextResponse.json(
        { success: false, error: `Job '${(await params).jobId}' not found.` },
        { status: 404 }
      );
    }

    // Verify row-level tenant boundary
    if (job.organizationId !== orgId) {
      return NextResponse.json(
        { success: false, error: "Cross-tenant job access forbidden." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      job
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
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

    const job = DurableJobQueue.getJob((await params).jobId);
    if (!job) {
      return NextResponse.json(
        { success: false, error: `Job '${(await params).jobId}' not found.` },
        { status: 404 }
      );
    }

    if (job.organizationId !== orgId) {
      return NextResponse.json(
        { success: false, error: "Cross-tenant job access forbidden." },
        { status: 403 }
      );
    }

    const retriedJob = await DurableJobQueue.retryJob((await params).jobId, userId);

    return NextResponse.json({
      success: true,
      message: `Job '${(await params).jobId}' re-queued for execution.`,
      job: retriedJob
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code || "JOB_RETRY_FAILED" },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
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

    const job = DurableJobQueue.getJob((await params).jobId);
    if (!job) {
      return NextResponse.json(
        { success: false, error: `Job '${(await params).jobId}' not found.` },
        { status: 404 }
      );
    }

    if (job.organizationId !== orgId) {
      return NextResponse.json(
        { success: false, error: "Cross-tenant job access forbidden." },
        { status: 403 }
      );
    }

    const cancelledJob = await DurableJobQueue.cancelJob((await params).jobId, userId, "Cancelled by user");

    return NextResponse.json({
      success: true,
      message: `Job '${(await params).jobId}' cancelled successfully.`,
      job: cancelledJob
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code || "JOB_CANCEL_FAILED" },
      { status: error.status || 500 }
    );
  }
}
