import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/platform/request-ip";
import { ReliableJobQueue } from "@/lib/reliability/job-queue";
import { AuditLogger } from "@/lib/reliability/observability";

export async function GET(req: NextRequest) {
  try {
    const organizationId = req.headers.get("x-organization-id") || "org_apex_digital";
    const deadLetters = ReliableJobQueue.listDeadLetters(organizationId);

    return NextResponse.json({
      success: true,
      organizationId,
      deadLetters: deadLetters.map((j) => ({
        id: j.id,
        jobType: j.jobType,
        attempts: j.attempts,
        maxAttempts: j.maxAttempts,
        errorMessage: j.errorMessage || "Unknown execution error",
        createdAt: j.createdAt.toISOString()
      }))
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch dead-letter queue" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "usr_lead";
    const organizationId = req.headers.get("x-organization-id") || "org_apex_digital";
    const body = await req.json();
    const { jobId, action } = body;

    if (action === "REPLAY") {
      const replayedJob = await ReliableJobQueue.replayDeadLetter(jobId);

      await AuditLogger.record({
        organizationId,
        userId,
        action: "REPLAY_DEAD_LETTER_JOB",
        entityName: "BackgroundJob",
        entityId: jobId,
        ipAddress: getRequestIp(req),
        userAgent: req.headers.get("user-agent")
      });

      return NextResponse.json({
        success: true,
        replayedJob
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute job action" },
      { status: 500 }
    );
  }
}
