import { StripeWebhookHandler, type StripeEvent } from "@/lib/billing/stripe-webhook-handler";
import { BillingService } from "@/lib/billing/billing-service";
import { CircuitBreakerRegistry } from "@/lib/reliability/circuit-breaker-registry";
import { AppError } from "@/lib/reliability/error-envelope";
import { AuditLogger } from "@/lib/reliability/observability";

describe("Phase 3.7 — Reliable Billing & Webhook Processing Suite", () => {
  const TEST_SECRET = "whsec_test_secret_abc123";

  beforeEach(() => {
    StripeWebhookHandler.clear();
    BillingService.resetAll();
    CircuitBreakerRegistry.resetAll();
    AuditLogger.clear();
  });

  describe("1. Cryptographic Signature & Replay Attack Defense", () => {
    it("should accept valid Stripe signature within tolerance window", () => {
      const payload = JSON.stringify({ id: "evt_101", type: "ping" });
      const signatureHeader = StripeWebhookHandler.generateTestSignature(payload, TEST_SECRET);

      const isValid = StripeWebhookHandler.verifySignature({
        rawPayload: payload,
        signatureHeader,
        secret: TEST_SECRET
      });

      expect(isValid).toBe(true);
    });

    it("should reject tampered payload with 400 Bad Request", () => {
      const payload = JSON.stringify({ id: "evt_101", amount: 1000 });
      const signatureHeader = StripeWebhookHandler.generateTestSignature(payload, TEST_SECRET);
      const tamperedPayload = JSON.stringify({ id: "evt_101", amount: 999999 });

      expect(() => {
        StripeWebhookHandler.verifySignature({
          rawPayload: tamperedPayload,
          signatureHeader,
          secret: TEST_SECRET
        });
      }).toThrow(AppError);
    });

    it("should reject replay attack when timestamp is older than 5 minutes tolerance", () => {
      const payload = JSON.stringify({ id: "evt_replay", type: "charge.captured" });
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400s ago (> 300s)
      const signatureHeader = StripeWebhookHandler.generateTestSignature(payload, TEST_SECRET, oldTimestamp);

      expect(() => {
        StripeWebhookHandler.verifySignature({
          rawPayload: payload,
          signatureHeader,
          secret: TEST_SECRET
        });
      }).toThrow(AppError);
    });

    it("should validate Stripe provider IP addresses correctly", () => {
      expect(StripeWebhookHandler.verifyProviderIp("54.187.174.10")).toBe(true);
      expect(StripeWebhookHandler.verifyProviderIp("3.18.12.63")).toBe(true);
      expect(StripeWebhookHandler.verifyProviderIp("127.0.0.1", true)).toBe(true);
      expect(StripeWebhookHandler.verifyProviderIp("198.51.100.22", false)).toBe(false);
    });
  });

  describe("2. Webhook Event Deduplication & Idempotency", () => {
    it("should process event on first arrival and return isDuplicate: true on duplicate", async () => {
      const event: StripeEvent = {
        id: "evt_unique_dedup_1",
        type: "invoice.payment_succeeded",
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: "in_101",
            customer: "org_apex_digital",
            amount_paid: 3400,
            currency: "usd"
          }
        }
      };

      const first = await StripeWebhookHandler.processEvent(event);
      expect(first.processed).toBe(true);
      expect(first.isDuplicate).toBe(false);

      const second = await StripeWebhookHandler.processEvent(event);
      expect(second.processed).toBe(true);
      expect(second.isDuplicate).toBe(true);
    });
  });

  describe("3. Webhook Event Handling for All 7 Key Events", () => {
    it("1. checkout.session.completed: should upgrade plan or top up credits", async () => {
      const initialSummary = BillingService.getCreditSummary("org_apex_digital");
      const initialQuota = initialSummary.monthlyQuota;

      const topUpEvent: StripeEvent = {
        id: "evt_checkout_credit_topup",
        type: "checkout.session.completed",
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: "cs_topup_1",
            mode: "payment",
            metadata: {
              type: "CREDIT_TOP_UP",
              organizationId: "org_apex_digital",
              credits: "500"
            }
          }
        }
      };

      await StripeWebhookHandler.processEvent(topUpEvent);
      const updatedSummary = BillingService.getCreditSummary("org_apex_digital");
      expect(updatedSummary.monthlyQuota).toBe(initialQuota + 500);

      const subEvent: StripeEvent = {
        id: "evt_checkout_sub_agency",
        type: "checkout.session.completed",
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: "cs_sub_1",
            mode: "subscription",
            subscription: "sub_apex_agency",
            metadata: {
              organizationId: "org_apex_digital",
              planTier: "AGENCY"
            }
          }
        }
      };

      await StripeWebhookHandler.processEvent(subEvent);
      const agencySummary = BillingService.getCreditSummary("org_apex_digital");
      expect(agencySummary.tier).toBe("AGENCY");
      expect(agencySummary.status).toBe("ACTIVE");
    });

    it("2. customer.subscription.created: should initialize subscription state", async () => {
      const event: StripeEvent = {
        id: "evt_sub_created",
        type: "customer.subscription.created",
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: "sub_new_enterprise",
            customer: "cus_tenant_new",
            status: "active",
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
            metadata: {
              organizationId: "org_tenant_new",
              planTier: "ENTERPRISE"
            }
          }
        }
      };

      await StripeWebhookHandler.processEvent(event);
      const summary = BillingService.getCreditSummary("org_tenant_new");
      expect(summary.tier).toBe("ENTERPRISE");
      expect(summary.status).toBe("ACTIVE");
    });

    it("3. customer.subscription.updated: should update plan and handle past_due", async () => {
      const event: StripeEvent = {
        id: "evt_sub_updated_past_due",
        type: "customer.subscription.updated",
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: "sub_apex_1",
            customer: "org_apex_digital",
            status: "past_due",
            metadata: {
              organizationId: "org_apex_digital",
              planTier: "AGENCY"
            }
          }
        }
      };

      await StripeWebhookHandler.processEvent(event);
      const summary = BillingService.getCreditSummary("org_apex_digital");
      expect(summary.status).toBe("PAST_DUE");
      expect(summary.inGracePeriod).toBe(true);
      expect(summary.gracePeriodEndsAt).toBeDefined();
    });

    it("4. customer.subscription.deleted: should downgrade to TRIAL tier and preserve customer data", async () => {
      const event: StripeEvent = {
        id: "evt_sub_deleted",
        type: "customer.subscription.deleted",
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: "sub_apex_del",
            customer: "org_apex_digital",
            metadata: {
              organizationId: "org_apex_digital",
              planTier: "AGENCY"
            }
          }
        }
      };

      await StripeWebhookHandler.processEvent(event);
      const summary = BillingService.getCreditSummary("org_apex_digital");
      expect(summary.tier).toBe("TRIAL");
      expect(summary.status).toBe("CANCELLED");
    });

    it("5. invoice.paid: should activate subscription and store paid invoice record", async () => {
      const event: StripeEvent = {
        id: "evt_inv_paid",
        type: "invoice.paid",
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: "in_stripe_paid_123",
            customer: "org_apex_digital",
            amount_due: 3400,
            amount_paid: 3400,
            currency: "usd",
            status: "paid",
            invoice_pdf: "https://stripe.com/receipt/inv_123.pdf",
            hosted_invoice_url: "https://stripe.com/pay/inv_123",
            metadata: {
              organizationId: "org_apex_digital"
            }
          }
        }
      };

      await StripeWebhookHandler.processEvent(event);

      const summary = BillingService.getCreditSummary("org_apex_digital");
      expect(summary.status).toBe("ACTIVE");

      const invoices = BillingService.listInvoices("org_apex_digital");
      const found = invoices.find((i) => i.id === "in_stripe_paid_123");
      expect(found).toBeDefined();
      expect(found?.status).toBe("PAID");
      expect(found?.amountPaidUsd).toBe(34.00);
      expect(found?.pdfUrl).toBe("https://stripe.com/receipt/inv_123.pdf");
    });

    it("6. invoice.payment_failed: should mark past_due with 7-day grace period and record failed invoice", async () => {
      const event: StripeEvent = {
        id: "evt_inv_failed",
        type: "invoice.payment_failed",
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: "in_stripe_fail_456",
            customer: "org_apex_digital",
            amount_due: 3400,
            amount_paid: 0,
            currency: "usd",
            attempt_count: 2,
            metadata: {
              organizationId: "org_apex_digital"
            }
          }
        }
      };

      await StripeWebhookHandler.processEvent(event);

      const summary = BillingService.getCreditSummary("org_apex_digital");
      expect(summary.status).toBe("PAST_DUE");
      expect(summary.inGracePeriod).toBe(true);

      const invoices = BillingService.listInvoices("org_apex_digital");
      const found = invoices.find((i) => i.id === "in_stripe_fail_456");
      expect(found).toBeDefined();
      expect(found?.status).toBe("FAILED");
      expect(found?.amountPaidUsd).toBe(0);
    });

    it("7. customer.subscription.trial_will_end: should record audit warning alert", async () => {
      const event: StripeEvent = {
        id: "evt_trial_ending",
        type: "customer.subscription.trial_will_end",
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: "sub_trial_exp",
            customer: "org_apex_digital",
            trial_end: Math.floor(Date.now() / 1000) + 3 * 24 * 3600,
            metadata: {
              organizationId: "org_apex_digital"
            }
          }
        }
      };

      const result = await StripeWebhookHandler.processEvent(event);
      expect(result.processed).toBe(true);

      const logs = AuditLogger.getRecentEvents();
      const trialLog = logs.find((l) => l.action === "TRIAL_WILL_END_WARNING");
      expect(trialLog).toBeDefined();
    });
  });

  describe("4. Subscription Lifecycle Access Control & Data Preservation", () => {
    it("should allow active subscriptions full plan access", () => {
      BillingService.updateSubscriptionState("org_apex_digital", {
        tier: "AGENCY",
        status: "ACTIVE"
      });

      const access = BillingService.evaluatePlanAccess("org_apex_digital");
      expect(access.allowed).toBe(true);
      expect(access.inGracePeriod).toBe(false);
    });

    it("should grant 7-day grace-period access when past due, then restrict access when grace expires without data loss", () => {
      const futureGrace = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();
      BillingService.updateSubscriptionState("org_apex_digital", {
        status: "PAST_DUE",
        gracePeriodEndsAt: futureGrace
      });

      const activeGrace = BillingService.evaluatePlanAccess("org_apex_digital");
      expect(activeGrace.allowed).toBe(true);
      expect(activeGrace.inGracePeriod).toBe(true);
      expect(activeGrace.dataPreserved).toBe(true);

      // Fast forward past grace period
      const pastGrace = new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString();
      BillingService.updateSubscriptionState("org_apex_digital", {
        status: "PAST_DUE",
        gracePeriodEndsAt: pastGrace
      });

      const expiredGrace = BillingService.evaluatePlanAccess("org_apex_digital");
      expect(expiredGrace.allowed).toBe(false);
      expect(expiredGrace.inGracePeriod).toBe(false);
      expect(expiredGrace.dataPreserved).toBe(true);
    });

    it("should allow cancelled subscription access until currentPeriodEnd then downgrade to free tier", () => {
      const periodEnd = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString();
      BillingService.updateSubscriptionState("org_apex_digital", {
        tier: "PROFESSIONAL",
        status: "CANCELLED",
        cancelAtPeriodEnd: true,
        currentPeriodEnd: periodEnd
      });

      const beforePeriodEnd = BillingService.evaluatePlanAccess("org_apex_digital");
      expect(beforePeriodEnd.allowed).toBe(true);

      // Past period end
      const expiredDate = new Date(Date.now() + 15 * 24 * 3600 * 1000);
      const afterPeriodEnd = BillingService.evaluatePlanAccess("org_apex_digital", expiredDate);
      expect(afterPeriodEnd.allowed).toBe(false);
      expect(afterPeriodEnd.tier).toBe("TRIAL");
      expect(afterPeriodEnd.dataPreserved).toBe(true);
    });
  });

  describe("5. Invoice History & Multi-Tenant Isolation", () => {
    it("should record and retrieve invoices per organization", () => {
      BillingService.recordInvoice({
        id: "in_org1_001",
        organizationId: "org_alpha",
        amountDueUsd: 12.50,
        amountPaidUsd: 12.50,
        currency: "USD",
        status: "PAID",
        createdAt: new Date().toISOString()
      });

      BillingService.recordInvoice({
        id: "in_org2_001",
        organizationId: "org_beta",
        amountDueUsd: 99.00,
        amountPaidUsd: 99.00,
        currency: "USD",
        status: "PAID",
        createdAt: new Date().toISOString()
      });

      const alphaInvoices = BillingService.listInvoices("org_alpha");
      expect(alphaInvoices).toHaveLength(1);
      expect(alphaInvoices[0].id).toBe("in_org1_001");

      const betaInvoices = BillingService.listInvoices("org_beta");
      expect(betaInvoices).toHaveLength(1);
      expect(betaInvoices[0].id).toBe("in_org2_001");
    });

    it("should strictly prevent cross-tenant invoice access", () => {
      BillingService.recordInvoice({
        id: "in_secret_alpha",
        organizationId: "org_alpha",
        amountDueUsd: 99.00,
        amountPaidUsd: 99.00,
        currency: "USD",
        status: "PAID",
        createdAt: new Date().toISOString()
      });

      // Tenant Beta attempts to access Tenant Alpha's invoice
      const invoice = BillingService.getInvoice("org_beta", "in_secret_alpha");
      expect(invoice).toBeNull();

      expect(() => {
        BillingService.getInvoiceDownloadUrl("org_beta", "in_secret_alpha");
      }).toThrow(/not found for tenant 'org_beta'/);
    });

    it("should generate signed invoice download URL for legitimate tenant", () => {
      BillingService.recordInvoice({
        id: "in_alpha_dl",
        organizationId: "org_alpha",
        amountDueUsd: 34.00,
        amountPaidUsd: 34.00,
        currency: "USD",
        status: "PAID",
        pdfUrl: "https://specforge-invoices.s3.amazonaws.com/org_alpha/in_alpha_dl.pdf",
        createdAt: new Date().toISOString()
      });

      const dl = BillingService.getInvoiceDownloadUrl("org_alpha", "in_alpha_dl");
      expect(dl.downloadUrl).toBe("https://specforge-invoices.s3.amazonaws.com/org_alpha/in_alpha_dl.pdf");
      expect(dl.expiresAt).toBeDefined();
    });
  });

  describe("6. Daily Automated Reconciliation Job", () => {
    it("should confirm match when local state matches Stripe provider state", async () => {
      BillingService.updateSubscriptionState("org_apex_digital", {
        tier: "AGENCY",
        status: "ACTIVE"
      });

      const result = await StripeWebhookHandler.reconcileWithStripe({
        organizationId: "org_apex_digital",
        stripeSubscription: {
          id: "sub_apex_1",
          status: "active",
          planTier: "AGENCY",
          currentPeriodEnd: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString()
        }
      });

      expect(result.reconciled).toBe(true);
      expect(result.discrepancies).toHaveLength(0);
      expect(result.actionTaken).toBe("NONE");
    });

    it("should detect mismatch, dispatch alert, and preserve customer data", async () => {
      BillingService.updateSubscriptionState("org_apex_digital", {
        tier: "PROFESSIONAL",
        status: "ACTIVE"
      });

      // Stripe shows user upgraded to ENTERPRISE and is past_due
      const result = await StripeWebhookHandler.reconcileWithStripe({
        organizationId: "org_apex_digital",
        stripeSubscription: {
          id: "sub_apex_1",
          status: "past_due",
          planTier: "ENTERPRISE",
          currentPeriodEnd: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString()
        }
      });

      expect(result.reconciled).toBe(false);
      expect(result.discrepancies.length).toBeGreaterThan(0);
      expect(result.actionTaken).toBe("ALERT_DISPATCHED_DATA_PRESERVED");

      const logs = AuditLogger.getRecentEvents();
      const alertLog = logs.find((l) => l.action === "RECONCILIATION_MISMATCH_ALERT");
      expect(alertLog).toBeDefined();
      expect(alertLog?.metadata?.customerDataPreserved).toBe(true);
    });
  });
});
