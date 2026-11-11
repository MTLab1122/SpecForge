import { NextRequest, NextResponse } from "next/server";
import { ScopeHealthScorer } from "@/lib/discovery/health-scorer";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") || "proj_sandbox_fintech_demo";

  // Mock project statistics
  const healthData = ScopeHealthScorer.calculate({
    questionnaireAnswersCount: 11, // out of 12
    featuresCount: 8,
    userStoriesCount: 18,
    storiesWithCriteriaCount: 16,
    openConflictsCount: 1, // 1 open platform contradiction
    totalAssumptionsCount: 4,
    confirmedAssumptionsCount: 3, // 1 pending assumption
    hasTimelineAndBudget: true,
    hasMappedDependencies: true
  });

  return NextResponse.json({
    success: true,
    data: {
      projectId,
      ...healthData
    }
  });
}

