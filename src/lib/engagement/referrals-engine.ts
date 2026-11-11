export interface ReferralRecord {
  id: string;
  referrerUserId: string;
  referralCode: string;
  referredEmail?: string;
  status: "PENDING" | "REGISTERED" | "CONVERTED";
  rewardGranted: boolean;
  rewardCredits: number;
  createdAt: string;
}

export interface ReferralDashboardMetrics {
  referralCode: string;
  referralUrl: string;
  totalInvited: number;
  registeredCount: number;
  convertedCount: number;
  totalAiCreditsEarned: number;
  pendingRewardCredits: number;
  conversionRatePercent: number;
  records: ReferralRecord[];
}

export class ReferralsEngine {
  public static readonly REFERRER_REWARD_CREDITS = 250;
  public static readonly INVITEE_REWARD_CREDITS = 100;

  /**
   * Generates a deterministic, shareable referral code from user identifier.
   */
  public static generateReferralCode(userFullName: string, userId: string): string {
    const cleanName = userFullName
      .trim()
      .split(" ")[0]
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 6) || "SPEC";
    const suffix = userId.slice(-4).toUpperCase();
    return `${cleanName}-SF-${suffix}`;
  }

  /**
   * Generates the canonical referral URL.
   */
  public static getReferralUrl(referralCode: string, baseUrl: string = "https://specforge.ai"): string {
    return `${baseUrl}/join?ref=${referralCode}`;
  }

  /**
   * Calculates dashboard analytics and reward earnings for a referrer.
   */
  public static calculateDashboardMetrics(params: {
    referralCode: string;
    records: ReferralRecord[];
    baseUrl?: string;
  }): ReferralDashboardMetrics {
    const { referralCode, records, baseUrl } = params;
    const referralUrl = this.getReferralUrl(referralCode, baseUrl);

    const totalInvited = records.length;
    const registeredCount = records.filter((r) => ["REGISTERED", "CONVERTED"].includes(r.status)).length;
    const convertedCount = records.filter((r) => r.status === "CONVERTED").length;

    const totalAiCreditsEarned = records
      .filter((r) => r.rewardGranted)
      .reduce((acc, r) => acc + (r.rewardCredits || this.REFERRER_REWARD_CREDITS), 0);

    const pendingRewardCredits = records
      .filter((r) => !r.rewardGranted && r.status === "REGISTERED")
      .length * this.REFERRER_REWARD_CREDITS;

    const conversionRatePercent =
      totalInvited > 0 ? Number(((registeredCount / totalInvited) * 100).toFixed(1)) : 0;

    return {
      referralCode,
      referralUrl,
      totalInvited,
      registeredCount,
      convertedCount,
      totalAiCreditsEarned,
      pendingRewardCredits,
      conversionRatePercent,
      records
    };
  }

  /**
   * Processes a successful referral conversion and computes reward grants.
   */
  public static grantReferralReward(referral: ReferralRecord): {
    updatedReferral: ReferralRecord;
    referrerBonusCredits: number;
    inviteeBonusCredits: number;
  } {
    return {
      updatedReferral: {
        ...referral,
        status: "CONVERTED",
        rewardGranted: true
      },
      referrerBonusCredits: this.REFERRER_REWARD_CREDITS,
      inviteeBonusCredits: this.INVITEE_REWARD_CREDITS
    };
  }
}
