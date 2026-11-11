import { NextRequest, NextResponse } from "next/server";
import { StreaksAndAchievementsEngine } from "@/lib/engagement/streaks-and-achievements";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "usr_lead";

    // Mock/database state for user
    const currentStreak = 3;
    const longestStreak = 5;
    const lastActiveWeek = StreaksAndAchievementsEngine.getIsoWeek();
    const existingBadges = ["FIRST_BRIEF", "FIRST_ESTIMATE", "CLIENT_APPROVAL_WON"];

    const { allBadges } = StreaksAndAchievementsEngine.evaluateBadges({
      proposalsSent: 6,
      approvalsReceived: 5,
      estimatesCreated: 8,
      aiBriefsExtracted: 10,
      handoverTasksSynced: 14,
      reusableAssetsUsed: 2,
      currentStreak,
      existingBadges
    });

    return NextResponse.json({
      success: true,
      userId,
      streak: {
        currentWeeklyStreak: currentStreak,
        longestWeeklyStreak: longestStreak,
        lastActiveWeek
      },
      badges: allBadges
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch streak data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "usr_lead";
    const body = await req.json();
    const { currentStreak = 1, longestStreak = 1, lastActiveWeek = null } = body;

    const streakResult = StreaksAndAchievementsEngine.recordActivity({
      currentStreak,
      longestStreak,
      lastActiveWeek
    });

    return NextResponse.json({
      success: true,
      userId,
      streak: streakResult
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record activity" },
      { status: 500 }
    );
  }
}
