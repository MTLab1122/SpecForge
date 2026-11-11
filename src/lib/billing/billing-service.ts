export type SubscriptionTier = "TRIAL" | "PROFESSIONAL" | "AGENCY" | "ENTERPRISE";
export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELLED"
  | "EXPIRED"
  | "PAUSED"
  | "TRIALING"
  | "CANCELED"
  | "UNPAID";

export interface PlanTierConfig {
  id: SubscriptionTier;
  name: string;
  priceUsdMonthly: number;
  monthlyAiCredits: number;
  maxSeats: number;
  features: string[];
  recommended?: boolean;
}

export const PLAN_TIERS: PlanTierConfig[] = [
  {
    id: "TRIAL",
    name: "Free Trial",
    priceUsdMonthly: 0,
    monthlyAiCredits: 100,
    maxSeats: 1,
    features: [
      "14-day discovery sandbox",
      "Up to 3 active projects",
      "Standard rate card arithmetic",
      "Community support"
    ]
  },
  {
    id: "PROFESSIONAL",
    name: "Professional Solo",
    priceUsdMonthly: 12.50, // PKR 3,500
    monthlyAiCredits: 250,
    maxSeats: 1,
    features: [
      "Unlimited active projects",
      "Client approval portal with digital seals",
      "Task handover export to Linear, Trello, GitHub",
      "Priority email support"
    ]
  },
  {
    id: "AGENCY",
    name: "Agency Team",
    priceUsdMonthly: 34.00, // PKR 9,500
    monthlyAiCredits: 1000,
    maxSeats: 5,
    recommended: true,
    features: [
      "Everything in Professional",
      "5 team seats included",
      "Jira Cloud & Slack two-way integrations",
      "White-label branding & custom domain CNAME",
      "4-hour SLA priority support"
    ]
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise Custom",
    priceUsdMonthly: 99.00,
    monthlyAiCredits: 5000,
    maxSeats: 25,
    features: [
      "Everything in Agency",
      "Unlimited seats & custom RBAC",
      "Dedicated Anthropic Claude 3.7 Sonnet throughput",
      "Custom SLA with 1-hour urgent response",
      "SOC2 compliance audit logs export"
    ]
  }
];

export interface OrgBillingRecord {
  organizationId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  monthlyQuota: number;
  creditsUsed: number;
  renewsAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  gracePeriodEndsAt?: string | null;
  cancelAtPeriodEnd?: boolean;
  pausedAt?: string | null;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  trialEndsAt?: string | null;
}

export interface CreditUsageSummary {
  organizationId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  monthlyQuota: number;
  creditsUsed: number;
  remainingCredits: number;
  utilizationPercent: number;
  renewsAt: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  gracePeriodEndsAt?: string | null;
  inGracePeriod?: boolean;
}

export type InvoiceStatus = "PAID" | "OPEN" | "FAILED" | "VOID";

export interface InvoiceRecord {
  id: string;
  organizationId: string;
  amountDueUsd: number;
  amountPaidUsd: number;
  currency: string;
  status: InvoiceStatus;
  pdfUrl?: string;
  hostedInvoiceUrl?: string;
  paidAt?: string | null;
  createdAt: string;
  periodStart?: string;
  periodEnd?: string;
  attemptCount?: number;
  billingReason?: string;
}

export interface PlanAccessResult {
  allowed: boolean;
  reason: string;
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  inGracePeriod: boolean;
  gracePeriodEndsAt?: string | null;
  isDowngraded: boolean;
  dataPreserved: true;
}

export class BillingService {
  private static mockOrgBilling: Map<string, OrgBillingRecord> = new Map([
    [
      "org_apex_digital",
      {
        organizationId: "org_apex_digital",
        tier: "AGENCY",
        status: "ACTIVE",
        monthlyQuota: 1000,
        creditsUsed: 480,
        renewsAt: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(),
        currentPeriodStart: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
        currentPeriodEnd: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        stripeCustomerId: "cus_apex_9988",
        stripeSubscriptionId: "sub_apex_agency_1"
      }
    ]
  ]);

  private static orgInvoices: Map<string, InvoiceRecord[]> = new Map([
    [
      "org_apex_digital",
      [
        {
          id: "in_apex_2026_001",
          organizationId: "org_apex_digital",
          amountDueUsd: 34.00,
          amountPaidUsd: 34.00,
          currency: "usd",
          status: "PAID",
          pdfUrl: "https://specforge-invoices.s3.amazonaws.com/org_apex_digital/in_apex_2026_001.pdf",
          hostedInvoiceUrl: "https://invoice.stripe.com/i/acct_specforge/inv_apex_001",
          paidAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
          billingReason: "subscription_cycle"
        }
      ]
    ]
  ]);

  /**
   * Retrieves organization subscription and credit balance.
   */
  public static getCreditSummary(organizationId: string): CreditUsageSummary {
    const org = this.getOrInitializeOrgBilling(organizationId);
    const access = this.evaluatePlanAccess(organizationId);

    const remaining = Math.max(0, org.monthlyQuota - org.creditsUsed);
    const utilizationPercent =
      org.monthlyQuota > 0 ? Number(((org.creditsUsed / org.monthlyQuota) * 100).toFixed(1)) : 0;

    return {
      organizationId,
      tier: org.tier,
      status: org.status,
      monthlyQuota: org.monthlyQuota,
      creditsUsed: org.creditsUsed,
      remainingCredits: remaining,
      utilizationPercent,
      renewsAt: org.renewsAt,
      currentPeriodEnd: org.currentPeriodEnd,
      cancelAtPeriodEnd: org.cancelAtPeriodEnd,
      gracePeriodEndsAt: org.gracePeriodEndsAt,
      inGracePeriod: access.inGracePeriod
    };
  }

  /**
   * Internal helper to retrieve or initialize org record with default Professional or Trial.
   */
  public static getOrInitializeOrgBilling(organizationId: string): OrgBillingRecord {
    let org = this.mockOrgBilling.get(organizationId);
    if (!org) {
      org = {
        organizationId,
        tier: "PROFESSIONAL",
        status: "ACTIVE",
        monthlyQuota: 250,
        creditsUsed: 65,
        renewsAt: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
        currentPeriodStart: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
        currentPeriodEnd: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
        cancelAtPeriodEnd: false
      };
      this.mockOrgBilling.set(organizationId, org);
    }
    return org;
  }

  /**
   * Upgrades, downgrades, or cancels a subscription tier.
   */
  public static changePlan(params: {
    organizationId: string;
    targetTier: SubscriptionTier;
    action: "UPGRADE" | "DOWNGRADE" | "CANCEL";
    cancelAtPeriodEnd?: boolean;
  }): CreditUsageSummary {
    const config = PLAN_TIERS.find((p) => p.id === params.targetTier) || PLAN_TIERS[1];
    const existing = this.getOrInitializeOrgBilling(params.organizationId);

    const isCancel = params.action === "CANCEL";
    const cancelAtPeriodEnd = params.cancelAtPeriodEnd ?? true;

    const updated: OrgBillingRecord = {
      ...existing,
      tier: isCancel && !cancelAtPeriodEnd ? "TRIAL" : isCancel ? existing.tier : params.targetTier,
      status: isCancel ? (cancelAtPeriodEnd ? "CANCELLED" : "CANCELLED") : "ACTIVE",
      cancelAtPeriodEnd: isCancel ? cancelAtPeriodEnd : false,
      gracePeriodEndsAt: null,
      monthlyQuota: isCancel && !cancelAtPeriodEnd ? 100 : config.monthlyAiCredits,
      creditsUsed: isCancel ? existing.creditsUsed : 0,
      renewsAt: isCancel ? existing.currentPeriodEnd : new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
    };

    this.mockOrgBilling.set(params.organizationId, updated);
    return this.getCreditSummary(params.organizationId);
  }

  /**
   * Adds an instant on-demand AI credit top-up pack.
   */
  public static topUpCredits(organizationId: string, creditsToAdd: number): CreditUsageSummary {
    const current = this.getOrInitializeOrgBilling(organizationId);
    current.monthlyQuota += creditsToAdd;
    this.mockOrgBilling.set(organizationId, current);

    return this.getCreditSummary(organizationId);
  }

  /**
   * Evaluates subscription lifecycle access policy:
   * - ACTIVE: full access.
   * - TRIAL: full trial access until trialEndsAt.
   * - PAST_DUE: 7-day grace period access with warning; blocks access after grace period expires.
   * - CANCELLED: full access until currentPeriodEnd if cancelAtPeriodEnd is true; then downgrades to free tier.
   * - EXPIRED / PAUSED: downgraded to free tier; customer data is strictly preserved.
   */
  public static evaluatePlanAccess(organizationId: string, asOfDate?: Date): PlanAccessResult {
    const org = this.getOrInitializeOrgBilling(organizationId);
    const now = asOfDate || new Date();
    const nowMs = now.getTime();

    // 1. ACTIVE state
    if (org.status === "ACTIVE") {
      return {
        allowed: true,
        reason: "Subscription active and in good standing.",
        status: "ACTIVE",
        tier: org.tier,
        inGracePeriod: false,
        isDowngraded: false,
        dataPreserved: true
      };
    }

    // 2. TRIAL / TRIALING state
    if (org.status === "TRIAL" || org.status === "TRIALING") {
      if (org.trialEndsAt && new Date(org.trialEndsAt).getTime() < nowMs) {
        // Auto-downgrade expired trial
        org.status = "EXPIRED";
        org.tier = "TRIAL";
        this.mockOrgBilling.set(organizationId, org);
        return {
          allowed: false,
          reason: "Trial period expired. Downgraded to free tier sandbox. No customer data deleted.",
          status: "EXPIRED",
          tier: "TRIAL",
          inGracePeriod: false,
          isDowngraded: true,
          dataPreserved: true
        };
      }
      return {
        allowed: true,
        reason: "Active trial sandbox access.",
        status: org.status,
        tier: org.tier,
        inGracePeriod: false,
        isDowngraded: false,
        dataPreserved: true
      };
    }

    // 3. PAST_DUE state with 7-day grace period
    if (org.status === "PAST_DUE") {
      const graceEndMs = org.gracePeriodEndsAt ? new Date(org.gracePeriodEndsAt).getTime() : 0;
      if (graceEndMs > nowMs) {
        return {
          allowed: true,
          reason: "Subscription is past due. Active in 7-day grace period.",
          status: "PAST_DUE",
          tier: org.tier,
          inGracePeriod: true,
          gracePeriodEndsAt: org.gracePeriodEndsAt,
          isDowngraded: false,
          dataPreserved: true
        };
      } else {
        return {
          allowed: false,
          reason: "7-day grace period expired. Payment required to restore premium features. Customer data preserved.",
          status: "PAST_DUE",
          tier: org.tier,
          inGracePeriod: false,
          gracePeriodEndsAt: org.gracePeriodEndsAt,
          isDowngraded: true,
          dataPreserved: true
        };
      }
    }

    // 4. CANCELLED / CANCELED state
    if (org.status === "CANCELLED" || org.status === "CANCELED") {
      const periodEndMs = new Date(org.currentPeriodEnd).getTime();
      if (org.cancelAtPeriodEnd && periodEndMs > nowMs) {
        return {
          allowed: true,
          reason: "Subscription cancelled; active until period end.",
          status: "CANCELLED",
          tier: org.tier,
          inGracePeriod: false,
          isDowngraded: false,
          dataPreserved: true
        };
      } else {
        return {
          allowed: false,
          reason: "Subscription cancelled. Downgraded to free tier. Customer data preserved.",
          status: "CANCELLED",
          tier: "TRIAL",
          inGracePeriod: false,
          isDowngraded: true,
          dataPreserved: true
        };
      }
    }

    // 5. EXPIRED state
    if (org.status === "EXPIRED") {
      return {
        allowed: false,
        reason: "Subscription expired. Restricted to free sandbox tier. Customer data preserved.",
        status: "EXPIRED",
        tier: "TRIAL",
        inGracePeriod: false,
        isDowngraded: true,
        dataPreserved: true
      };
    }

    // 6. PAUSED state
    if (org.status === "PAUSED") {
      return {
        allowed: false,
        reason: "Subscription paused by workspace admin. Customer data preserved.",
        status: "PAUSED",
        tier: org.tier,
        inGracePeriod: false,
        isDowngraded: true,
        dataPreserved: true
      };
    }

    // Default fallback
    return {
      allowed: false,
      reason: `Subscription status is ${org.status}.`,
      status: org.status,
      tier: org.tier,
      inGracePeriod: false,
      isDowngraded: true,
      dataPreserved: true
    };
  }

  /**
   * Records an invoice into organization history.
   */
  public static recordInvoice(invoice: InvoiceRecord): InvoiceRecord {
    const list = this.orgInvoices.get(invoice.organizationId) || [];
    const existingIndex = list.findIndex((i) => i.id === invoice.id);
    if (existingIndex >= 0) {
      list[existingIndex] = invoice;
    } else {
      list.unshift(invoice);
    }
    this.orgInvoices.set(invoice.organizationId, list);
    return invoice;
  }

  /**
   * Retrieves all invoices for an organization (Strict Multi-Tenant Isolation).
   */
  public static listInvoices(organizationId: string): InvoiceRecord[] {
    return this.orgInvoices.get(organizationId) || [];
  }

  /**
   * Retrieves a single invoice, strictly verifying tenant ownership.
   */
  public static getInvoice(organizationId: string, invoiceId: string): InvoiceRecord | null {
    const list = this.orgInvoices.get(organizationId) || [];
    const inv = list.find((i) => i.id === invoiceId);
    return inv || null;
  }

  /**
   * Generates a signed download URL for an invoice PDF.
   */
  public static getInvoiceDownloadUrl(organizationId: string, invoiceId: string): { downloadUrl: string; expiresAt: string } {
    const inv = this.getInvoice(organizationId, invoiceId);
    if (!inv) {
      throw new Error(`Invoice '${invoiceId}' not found for tenant '${organizationId}'`);
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const downloadUrl = inv.pdfUrl || `https://specforge-invoices.s3.amazonaws.com/${organizationId}/${invoiceId}.pdf?sig=valid_signed_url&expires=${encodeURIComponent(expiresAt)}`;

    return {
      downloadUrl,
      expiresAt
    };
  }

  /**
   * Sets subscription status directly (used by webhooks and admin operations).
   */
  public static updateSubscriptionState(
    organizationId: string,
    update: Partial<OrgBillingRecord>
  ): OrgBillingRecord {
    const current = this.getOrInitializeOrgBilling(organizationId);
    const updated: OrgBillingRecord = {
      ...current,
      ...update
    };
    this.mockOrgBilling.set(organizationId, updated);
    return updated;
  }

  /**
   * Resets mock billing state and invoices (for testing).
   */
  public static resetAll(): void {
    this.mockOrgBilling.clear();
    this.orgInvoices.clear();
  }
}
