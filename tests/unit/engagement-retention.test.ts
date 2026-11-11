import {
  StreaksAndAchievementsEngine,
  BADGE_CATALOG
} from "@/lib/engagement/streaks-and-achievements";
import { SmartNudgesEngine, ProjectStateForNudge } from "@/lib/engagement/smart-nudges-engine";
import { TemplatesAndAssetsEngine } from "@/lib/engagement/templates-and-assets";
import { ReferralsEngine } from "@/lib/engagement/referrals-engine";
import { FeedbackService } from "@/lib/engagement/feedback-service";

describe("Engagement & Retention System Unit Tests", () => {
  describe("1. Weekly Usage Streaks & Achievement Badges", () => {
    it("should correctly compute ISO 8601 week strings", () => {
      const date1 = new Date("2026-02-18T10:00:00Z"); // Wednesday in week 8 of 2026
      const weekStr1 = StreaksAndAchievementsEngine.getIsoWeek(date1);
      expect(weekStr1).toBe("2026-W08");
    });

    it("should increment streak on consecutive active weeks", () => {
      const week1 = new Date("2026-02-11T10:00:00Z"); // Week 7
      const week2 = new Date("2026-02-18T10:00:00Z"); // Week 8

      const res1 = StreaksAndAchievementsEngine.recordActivity({
        currentStreak: 1,
        longestStreak: 1,
        lastActiveWeek: null,
        currentDate: week1
      });
      expect(res1.currentStreak).toBe(1);
      expect(res1.lastActiveWeek).toBe("2026-W07");

      const res2 = StreaksAndAchievementsEngine.recordActivity({
        currentStreak: res1.currentStreak,
        longestStreak: res1.longestStreak,
        lastActiveWeek: res1.lastActiveWeek,
        currentDate: week2
      });
      expect(res2.currentStreak).toBe(2);
      expect(res2.longestStreak).toBe(2);
      expect(res2.lastActiveWeek).toBe("2026-W08");
    });

    it("should reset streak to 1 if a week is skipped", () => {
      const week10 = new Date("2026-03-04T10:00:00Z"); // Week 10
      const week12 = new Date("2026-03-18T10:00:00Z"); // Week 12 (Week 11 skipped!)

      const res = StreaksAndAchievementsEngine.recordActivity({
        currentStreak: 4,
        longestStreak: 6,
        lastActiveWeek: "2026-W10",
        currentDate: week12
      });
      expect(res.currentStreak).toBe(1); // Reset to 1
      expect(res.longestStreak).toBe(6);  // Preserves personal best
    });

    it("should evaluate and unlock achievement badges based on actions", () => {
      const { allBadges, newlyUnlocked } = StreaksAndAchievementsEngine.evaluateBadges({
        proposalsSent: 2,
        approvalsReceived: 1,
        estimatesCreated: 3,
        aiBriefsExtracted: 5,
        handoverTasksSynced: 0,
        reusableAssetsUsed: 1,
        currentStreak: 4,
        existingBadges: ["FIRST_BRIEF"] // Already had FIRST_BRIEF
      });

      const unlockedIds = newlyUnlocked.map((b) => b.id);
      expect(unlockedIds).toContain("FIRST_ESTIMATE");
      expect(unlockedIds).toContain("FIRST_PROPOSAL_SEALED");
      expect(unlockedIds).toContain("CLIENT_APPROVAL_WON");
      expect(unlockedIds).toContain("STREAK_4_WEEKS");
      expect(unlockedIds).toContain("POWER_RECYCLER");
      expect(unlockedIds).not.toContain("FIRST_BRIEF"); // Was already unlocked
      expect(unlockedIds).not.toContain("DELIVERY_HANDOFF"); // 0 synced
    });
  });

  describe("2. Smart Nudges & Anti-Spam Frequency Capping", () => {
    it("should generate prioritized nudges for actionable project states", () => {
      const sampleProjects: ProjectStateForNudge[] = [
        {
          id: "p1",
          title: "Healthcare App",
          hasUnreviewedAiAssumptions: true,
          unreviewedAssumptionsCount: 4,
          hasCompletedEstimate: false,
          hasSentProposal: false,
          isProposalApproved: false,
          hasCreatedInvoice: false,
          isScopeApproved: false
        },
        {
          id: "p2",
          title: "SaaS CRM",
          hasUnreviewedAiAssumptions: false,
          unreviewedAssumptionsCount: 0,
          hasCompletedEstimate: true,
          hasSentProposal: false,
          isProposalApproved: false,
          hasCreatedInvoice: false,
          isScopeApproved: true
        }
      ];

      const nudges = SmartNudgesEngine.evaluateNudges({ projects: sampleProjects });
      expect(nudges.length).toBeLessThanOrEqual(2); // Anti-spam max 2
      expect(nudges[0].nudgeType).toBe("SCOPE_PENDING");
      expect(nudges[0].priority).toBe(1);
      expect(nudges[1].nudgeType).toBe("PROPOSAL_UNSENT");
    });

    it("should respect dismissed and snoozed nudges", () => {
      const sampleProjects: ProjectStateForNudge[] = [
        {
          id: "p1",
          title: "Healthcare App",
          hasUnreviewedAiAssumptions: true,
          unreviewedAssumptionsCount: 4,
          hasCompletedEstimate: false,
          hasSentProposal: false,
          isProposalApproved: false,
          hasCreatedInvoice: false,
          isScopeApproved: false
        }
      ];

      // Test Dismiss
      const dismissedNudges = SmartNudgesEngine.evaluateNudges({
        projects: sampleProjects,
        dismissedNudgeIds: ["nudge_scope_p1"]
      });
      expect(dismissedNudges).toHaveLength(0);

      // Test Snooze
      const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();
      const snoozedNudges = SmartNudgesEngine.evaluateNudges({
        projects: sampleProjects,
        snoozedUntilMap: { nudge_scope_p1: futureDate }
      });
      expect(snoozedNudges).toHaveLength(0);
    });
  });

  describe("3. Templates Library & Asset Duplication", () => {
    it("should filter templates by category", () => {
      const discoveryTemplates = TemplatesAndAssetsEngine.getTemplates("DISCOVERY");
      expect(discoveryTemplates.length).toBeGreaterThan(0);
      expect(discoveryTemplates.every((t) => t.category === "DISCOVERY")).toBe(true);
    });

    it("should clone an existing project while scrubbing historical client approvals", () => {
      const source = {
        id: "proj_orig_1",
        title: "Client Portal",
        description: "Enterprise system",
        organizationId: "org_apex",
        features: [
          { title: "SSO Login", description: "Google & Okta SAML", priority: "MUST" }
        ],
        estimates: [{ totalPrice: 15000, status: "APPROVED" }]
      };

      const clone = TemplatesAndAssetsEngine.duplicateProject(source);
      expect(clone.duplicatedProject.title).toBe("Client Portal (Copy)");
      expect(clone.duplicatedProject.clonedFromProjectId).toBe("proj_orig_1");
      expect(clone.duplicatedProject.stage).toBe("DISCOVERY");
      expect(clone.featuresClonedCount).toBe(1);
      expect(clone.estimatesClonedCount).toBe(1);
    });
  });

  describe("4. Referral System & Reward Arithmetic", () => {
    it("should generate deterministic referral codes and links", () => {
      const code = ReferralsEngine.generateReferralCode("Marcus Vance", "usr-uuid-9876");
      expect(code).toBe("MARCUS-SF-9876");

      const url = ReferralsEngine.getReferralUrl(code);
      expect(url).toBe("https://specforge.ai/join?ref=MARCUS-SF-9876");
    });

    it("should compute referral metrics and credit bonuses", () => {
      const metrics = ReferralsEngine.calculateDashboardMetrics({
        referralCode: "MARCUS-SF-9876",
        records: [
          {
            id: "1",
            referrerUserId: "u1",
            referralCode: "MARCUS-SF-9876",
            status: "CONVERTED",
            rewardGranted: true,
            rewardCredits: 250,
            createdAt: "2026-01-01"
          },
          {
            id: "2",
            referrerUserId: "u1",
            referralCode: "MARCUS-SF-9876",
            status: "REGISTERED",
            rewardGranted: false,
            rewardCredits: 250,
            createdAt: "2026-01-02"
          }
        ]
      });

      expect(metrics.totalInvited).toBe(2);
      expect(metrics.registeredCount).toBe(2);
      expect(metrics.convertedCount).toBe(1);
      expect(metrics.totalAiCreditsEarned).toBe(250);
      expect(metrics.pendingRewardCredits).toBe(250);
      expect(metrics.conversionRatePercent).toBe(100.0);
    });
  });

  describe("5. Feedback Service & NPS Calculation", () => {
    it("should accurately calculate Net Promoter Score (NPS)", () => {
      // 6 Promoters (9, 10, 10, 9, 9, 10) = 60%
      // 2 Passives (7, 8) = 20%
      // 2 Detractors (4, 5) = 20%
      // NPS = 60 - 20 = +40
      const scores = [10, 10, 10, 9, 9, 9, 8, 7, 5, 4];
      const summary = FeedbackService.calculateNps(scores);

      expect(summary.totalResponses).toBe(10);
      expect(summary.promotersCount).toBe(6);
      expect(summary.passivesCount).toBe(2);
      expect(summary.detractorsCount).toBe(2);
      expect(summary.npsScore).toBe(40);
      expect(summary.averageScore).toBe(8.1);
    });

    it("should allow submitting feedback and upvoting feature requests", () => {
      const submitted = FeedbackService.submit({
        type: "FEATURE_REQUEST",
        title: "Slack Notification Webhook",
        content: "Ping when client views proposal"
      });
      expect(submitted.upvotes).toBe(0);

      const upvote = FeedbackService.upvoteFeature(submitted.id);
      expect(upvote.success).toBe(true);
      expect(upvote.newCount).toBe(1);
    });
  });
});
