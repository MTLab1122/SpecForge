export interface UserStreakState {
  currentWeeklyStreak: number;
  longestWeeklyStreak: number;
  lastActiveWeek: string; // e.g. "2026-W08"
  activeDaysThisWeek: number;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  iconName: string;
  category: "DISCOVERY" | "ESTIMATION" | "COMMERCIAL" | "DELIVERY" | "ENGAGEMENT";
  earnedAt?: string;
}

export const BADGE_CATALOG: AchievementBadge[] = [
  {
    id: "FIRST_BRIEF",
    title: "Discovery Pioneer",
    description: "Extracted your first unstructured client brief using SpecForge AI.",
    iconName: "Sparkles",
    category: "DISCOVERY"
  },
  {
    id: "FIRST_ESTIMATE",
    title: "Master Estimator",
    description: "Configured role rate cards and built your first commercial estimate scenario.",
    iconName: "Calculator",
    category: "ESTIMATION"
  },
  {
    id: "FIRST_PROPOSAL_SEALED",
    title: "The Closer",
    description: "Generated and dispatched your first client proposal with cryptographic seal.",
    iconName: "FileCheck",
    category: "COMMERCIAL"
  },
  {
    id: "CLIENT_APPROVAL_WON",
    title: "Deal Maker",
    description: "Secured your first formal client sign-off via the digital approval portal.",
    iconName: "Award",
    category: "COMMERCIAL"
  },
  {
    id: "DELIVERY_HANDOFF",
    title: "Sprint Leader",
    description: "Exported approved user stories directly into Jira, Linear, or GitHub Issues.",
    iconName: "Rocket",
    category: "DELIVERY"
  },
  {
    id: "STREAK_4_WEEKS",
    title: "Consistency Champion",
    description: "Maintained active project scoping workflows for 4 consecutive weeks.",
    iconName: "Flame",
    category: "ENGAGEMENT"
  },
  {
    id: "POWER_RECYCLER",
    title: "Efficiency Pro",
    description: "Saved hours by duplicating a previous estimate or applying a discovery template.",
    iconName: "Repeat",
    category: "ENGAGEMENT"
  }
];

export class StreaksAndAchievementsEngine {
  /**
   * Computes ISO 8601 week string e.g. "2026-W08"
   */
  public static getIsoWeek(date: Date = new Date()): string {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
    const year = new Date(firstThursday).getFullYear();
    return `${year}-W${String(weekNumber).padStart(2, "0")}`;
  }

  /**
   * Evaluates weekly activity and calculates continuous streak.
   */
  public static recordActivity(params: {
    currentStreak: number;
    longestStreak: number;
    lastActiveWeek: string | null;
    currentDate?: Date;
  }): {
    currentStreak: number;
    longestStreak: number;
    lastActiveWeek: string;
    isNewMilestone: boolean;
  } {
    const now = params.currentDate || new Date();
    const currentWeek = this.getIsoWeek(now);

    // First time activity
    if (!params.lastActiveWeek) {
      return {
        currentStreak: 1,
        longestStreak: Math.max(1, params.longestStreak),
        lastActiveWeek: currentWeek,
        isNewMilestone: true
      };
    }

    // Already recorded activity in this week
    if (params.lastActiveWeek === currentWeek) {
      return {
        currentStreak: params.currentStreak,
        longestStreak: params.longestStreak,
        lastActiveWeek: currentWeek,
        isNewMilestone: false
      };
    }

    // Check if lastActiveWeek was the immediately preceding week
    const isConsecutive = this.isConsecutiveWeek(params.lastActiveWeek, currentWeek);

    const nextStreak = isConsecutive ? params.currentStreak + 1 : 1;
    const nextLongest = Math.max(nextStreak, params.longestStreak);

    return {
      currentStreak: nextStreak,
      longestStreak: nextLongest,
      lastActiveWeek: currentWeek,
      isNewMilestone: nextStreak > params.currentStreak
    };
  }

  /**
   * Evaluates which achievement badges are unlocked based on user operational milestones.
   */
  public static evaluateBadges(params: {
    proposalsSent: number;
    approvalsReceived: number;
    estimatesCreated: number;
    aiBriefsExtracted: number;
    handoverTasksSynced: number;
    reusableAssetsUsed: number;
    currentStreak: number;
    existingBadges: string[];
  }): {
    allBadges: AchievementBadge[];
    newlyUnlocked: AchievementBadge[];
  } {
    const existingSet = new Set(params.existingBadges);
    const newlyUnlocked: AchievementBadge[] = [];

    const checkAndAward = (badgeId: string, condition: boolean) => {
      if (condition && !existingSet.has(badgeId)) {
        const badgeDef = BADGE_CATALOG.find((b) => b.id === badgeId);
        if (badgeDef) {
          const unlocked = { ...badgeDef, earnedAt: new Date().toISOString() };
          newlyUnlocked.push(unlocked);
          existingSet.add(badgeId);
        }
      }
    };

    checkAndAward("FIRST_BRIEF", params.aiBriefsExtracted >= 1);
    checkAndAward("FIRST_ESTIMATE", params.estimatesCreated >= 1);
    checkAndAward("FIRST_PROPOSAL_SEALED", params.proposalsSent >= 1);
    checkAndAward("CLIENT_APPROVAL_WON", params.approvalsReceived >= 1);
    checkAndAward("DELIVERY_HANDOFF", params.handoverTasksSynced >= 1);
    checkAndAward("STREAK_4_WEEKS", params.currentStreak >= 4);
    checkAndAward("POWER_RECYCLER", params.reusableAssetsUsed >= 1);

    const allBadges = BADGE_CATALOG.map((b) => {
      if (existingSet.has(b.id)) {
        return { ...b, earnedAt: b.earnedAt || new Date().toISOString() };
      }
      return b;
    });

    return { allBadges, newlyUnlocked };
  }

  /**
   * Helper: validates if weekB is immediately after weekA.
   */
  private static isConsecutiveWeek(weekA: string, weekB: string): boolean {
    const [yearA, numA] = weekA.split("-W").map(Number);
    const [yearB, numB] = weekB.split("-W").map(Number);

    if (yearA === yearB) {
      return numB === numA + 1;
    }
    // Year rollover: check if weekA was week 52 or 53 and weekB is week 1 of next year
    if (yearB === yearA + 1) {
      return (numA === 52 || numA === 53) && numB === 1;
    }
    return false;
  }
}
