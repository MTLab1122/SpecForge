export type FeedbackType = "NPS" | "BUG" | "FEATURE_REQUEST" | "EXIT_SURVEY" | "GENERAL_FEEDBACK";

export interface FeedbackSubmissionItem {
  id: string;
  userId?: string | null;
  organizationId?: string | null;
  type: FeedbackType;
  score?: number | null; // 0-10 for NPS
  category?: string | null;
  title?: string | null;
  content: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
  upvotes: number;
  status: "SUBMITTED" | "IN_REVIEW" | "PLANNED" | "RESOLVED";
  createdAt: string;
}

export interface NpsSummaryResult {
  totalResponses: number;
  promotersCount: number;  // scores 9-10
  passivesCount: number;   // scores 7-8
  detractorsCount: number; // scores 0-6
  npsScore: number;        // (% Promoters - % Detractors) ranges from -100 to +100
  averageScore: number;
}

export class FeedbackService {
  private static feedbackStore: FeedbackSubmissionItem[] = [
    {
      id: "fb_1",
      userId: "usr_agency_lead",
      type: "FEATURE_REQUEST",
      title: "Direct Figma Code Connect Token Sync",
      content: "Allow two-way sync between SpecForge design estimates and Figma design system components.",
      category: "INTEGRATION",
      upvotes: 42,
      status: "PLANNED",
      createdAt: "2026-10-15T12:00:00Z"
    },
    {
      id: "fb_2",
      userId: "usr_freelancer_2",
      type: "FEATURE_REQUEST",
      title: "Multi-Currency Hourly Rate Cards",
      content: "Support mixed currency rates (e.g. paying contractor in EUR while invoicing client in USD).",
      category: "ESTIMATION",
      upvotes: 28,
      status: "IN_REVIEW",
      createdAt: "2026-10-20T14:30:00Z"
    }
  ];

  /**
   * Submits new customer feedback, bug report, or NPS response.
   */
  public static submit(params: {
    userId?: string | null;
    organizationId?: string | null;
    type: FeedbackType;
    score?: number | null;
    category?: string | null;
    title?: string | null;
    content: string;
    severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
  }): FeedbackSubmissionItem {
    const item: FeedbackSubmissionItem = {
      id: `fb_${Date.now()}`,
      userId: params.userId || null,
      organizationId: params.organizationId || null,
      type: params.type,
      score: params.score !== undefined ? params.score : null,
      category: params.category || null,
      title: params.title || null,
      content: params.content,
      severity: params.severity || null,
      upvotes: 0,
      status: "SUBMITTED",
      createdAt: new Date().toISOString()
    };

    this.feedbackStore.unshift(item);
    return item;
  }

  /**
   * Upvotes a public feature request.
   */
  public static upvoteFeature(id: string): { success: boolean; newCount: number } {
    const item = this.feedbackStore.find((f) => f.id === id);
    if (!item) {
      return { success: false, newCount: 0 };
    }
    item.upvotes += 1;
    return { success: true, newCount: item.upvotes };
  }

  /**
   * Computes standard Net Promoter Score (NPS) arithmetic.
   * NPS = (% Promoters [9-10] - % Detractors [0-6])
   */
  public static calculateNps(scores: number[]): NpsSummaryResult {
    if (scores.length === 0) {
      return {
        totalResponses: 0,
        promotersCount: 0,
        passivesCount: 0,
        detractorsCount: 0,
        npsScore: 0,
        averageScore: 0
      };
    }

    let promoters = 0;
    let passives = 0;
    let detractors = 0;
    let sum = 0;

    for (const score of scores) {
      const s = Math.max(0, Math.min(10, score));
      sum += s;
      if (s >= 9) {
        promoters += 1;
      } else if (s >= 7) {
        passives += 1;
      } else {
        detractors += 1;
      }
    }

    const total = scores.length;
    const promoterPct = (promoters / total) * 100;
    const detractorPct = (detractors / total) * 100;
    const npsScore = Math.round(promoterPct - detractorPct);
    const averageScore = Number((sum / total).toFixed(1));

    return {
      totalResponses: total,
      promotersCount: promoters,
      passivesCount: passives,
      detractorsCount: detractors,
      npsScore,
      averageScore
    };
  }

  /**
   * Lists feature requests sorted by community upvotes.
   */
  public static listFeatureRequests(): FeedbackSubmissionItem[] {
    return this.feedbackStore
      .filter((f) => f.type === "FEATURE_REQUEST")
      .sort((a, b) => b.upvotes - a.upvotes);
  }

  /**
   * Exit survey reasons for churn analysis.
   */
  public static getExitSurveyReasons() {
    return [
      { id: "TOO_EXPENSIVE", label: "Subscription pricing is too high for my current workload" },
      { id: "MISSING_INTEGRATION", label: "Missing an essential PM integration (e.g. Asana, Monday)" },
      { id: "PROJECT_CONCLUDED", label: "My client discovery project finished; don't need active seat" },
      { id: "USING_MANUAL_DOCS", label: "Prefer using Notion/Google Docs directly" },
      { id: "CLIENT_PREFERS_HOURLY", label: "Clients only accept raw timesheets without formal estimates" }
    ];
  }
}
