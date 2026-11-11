import { NextRequest, NextResponse } from "next/server";
import { GrowthMetricsEngine } from "@/lib/analytics/growth-metrics-engine";
import { AuthorizationService } from "@/lib/permissions/authorization-service";

export async function GET(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-workspace-id") || req.headers.get("x-org-id");
    const userId = req.headers.get("x-user-id");
    const role = (req.headers.get("x-user-role") || "MANAGER") as any;

    if (!orgId || !userId) {
      return NextResponse.json(
        { success: false, error: "Authentication and active workspace context required." },
        { status: 401 }
      );
    }

    const auth = AuthorizationService.authorize({
      context: { userId, organizationId: orgId, role },
      action: "VIEW_FINANCIAL_DATA"
    });

    if (!auth.allowed) {
      return NextResponse.json(
        { success: false, error: auth.reason || "Unauthorized to view growth intelligence." },
        { status: auth.statusCode }
      );
    }

    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") as "7D" | "30D" | "90D") || "30D";

    const snapshot = GrowthMetricsEngine.computeGrowthMetricsSnapshot({ period });
    const weeklyReview = GrowthMetricsEngine.generateWeeklyGrowthReview(45);

    return NextResponse.json({
      success: true,
      snapshot,
      weeklyReview
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to compute growth metrics." },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgId = req.headers.get("x-workspace-id") || req.headers.get("x-org-id");
    const userId = req.headers.get("x-user-id");
    const role = (req.headers.get("x-user-role") || "ADMIN") as any;

    if (!orgId || !userId) {
      return NextResponse.json(
        { success: false, error: "Authentication and active workspace context required." },
        { status: 401 }
      );
    }

    const auth = AuthorizationService.authorize({
      context: { userId, organizationId: orgId, role },
      action: "MANAGE_BILLING"
    });

    if (!auth.allowed) {
      return NextResponse.json(
        { success: false, error: auth.reason || "Unauthorized to manage growth experiments." },
        { status: auth.statusCode }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (action === "REGISTER_EXPERIMENT") {
      const exp = GrowthMetricsEngine.registerExperiment(body.experiment);
      return NextResponse.json({ success: true, experiment: exp }, { status: 201 });
    }

    if (action === "EVALUATE_EXPERIMENT") {
      const evaluated = GrowthMetricsEngine.evaluateExperiment(body.experimentId, body.results);
      return NextResponse.json({ success: true, experiment: evaluated });
    }

    return NextResponse.json(
      { success: false, error: `Invalid action '${action}'. Expected 'REGISTER_EXPERIMENT' or 'EVALUATE_EXPERIMENT'.` },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process experiment operation." },
      { status: error.status || 400 }
    );
  }
}

