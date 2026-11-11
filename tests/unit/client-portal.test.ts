import { ClientPresentationEngine } from "@/lib/client-portal/presentation-engine";
import {
  ClientFullApprovalSchema,
  ClientSectionalApprovalSchema,
  RequestRevisionSchema,
  DelegateApprovalSchema
} from "@/lib/validations/client-portal";

describe("Client-Facing Approval Experience Unit Tests", () => {
  const mockRawProposal = {
    id: "prop-101",
    shareToken: "token-abc-123",
    version: 2,
    title: "SaaS Enterprise Billing & Workflow Engine",
    status: "SENT",
    executiveSummary: "A multi-tenant cloud application automating client invoicing, scope approvals, and task management.",
    totalPrice: 20000,
    currency: "USD",
    // Internal sensitive data that MUST be stripped:
    hourlyRate: 125,
    estimatedProfitMargin: 38.5,
    internalCost: 12400,
    contractorNotes: "Junior dev needs supervision on Docker provisioning.",
    branding: {
      agencyName: "Acme Web Studio",
      primaryColor: "#4F46E5"
    },
    coverPage: {
      subtitle: "Full Architecture & Delivery Scope",
      preparedForCompany: "Global Ventures Inc",
      preparedByContact: "Elena Rostova"
    },
    deliverables: [
      {
        id: "d-1",
        title: "Figma UI/UX & Design Tokens",
        category: "DESIGN",
        description: "Interactive prototype and mobile-first design system.",
        keyFeatures: ["Mobile-first layout", "WCAG accessibility tokens"],
        clientBenefit: "Accelerates user onboarding and conversion.",
        hourlyRate: 95, // Internal
        internalMargin: 40 // Internal
      },
      {
        id: "d-2",
        title: "Frontend & Backend Development",
        category: "DEVELOPMENT",
        description: "Next.js dashboard with PostgreSQL and Prisma.",
        keyFeatures: ["Secure authentication", "Real-time updates"],
        clientBenefit: "Instantaneous sub-second page loads."
      }
    ],
    milestones: [
      {
        id: "m-1",
        title: "UX Architecture & Prototype Sign-Off",
        targetWeek: "Week 2",
        percentageOfTotal: 30,
        deliverablesSummary: ["Figma prototypes approved"]
      },
      {
        id: "m-2",
        title: "Core Workflow Development Demo",
        targetWeek: "Week 5",
        percentageOfTotal: 40,
        deliverablesSummary: ["Staging environment live"]
      },
      {
        id: "m-3",
        title: "Final Production Handover",
        targetWeek: "Week 8",
        percentageOfTotal: 30,
        deliverablesSummary: ["Production domain live", "Source code transferred"]
      }
    ]
  };

  describe("1. Data Sanitization & Tenant Isolation", () => {
    it("should strip internal contractor rates, profit margins, and private notes", () => {
      const sanitized = ClientPresentationEngine.sanitizeProposal(mockRawProposal);

      // Verify root-level stripped fields
      expect((sanitized as any).hourlyRate).toBeUndefined();
      expect((sanitized as any).estimatedProfitMargin).toBeUndefined();
      expect((sanitized as any).internalCost).toBeUndefined();
      expect((sanitized as any).contractorNotes).toBeUndefined();

      // Verify deliverable-level stripped fields
      sanitized.deliverables.forEach((d) => {
        expect((d as any).hourlyRate).toBeUndefined();
        expect((d as any).internalMargin).toBeUndefined();
      });

      // Verify client-safe fields exist
      expect(sanitized.title).toBe("SaaS Enterprise Billing & Workflow Engine");
      expect(sanitized.investmentSummary.totalInvestment).toBe(20000);
      expect(sanitized.investmentSummary.currency).toBe("USD");
      expect(sanitized.branding.agencyName).toBe("Acme Web Studio");
    });

    it("should calculate milestone payment amounts accurately based on total price", () => {
      const sanitized = ClientPresentationEngine.sanitizeProposal(mockRawProposal);

      expect(sanitized.milestones.length).toBe(3);
      // 30% of $20,000 = $6,000
      expect(sanitized.milestones[0].amount).toBe(6000);
      // 40% of $20,000 = $8,000
      expect(sanitized.milestones[1].amount).toBe(8000);
      // 30% of $20,000 = $6,000
      expect(sanitized.milestones[2].amount).toBe(6000);
    });

    it("should compute correct next-action prompts based on proposal status", () => {
      const sentProposal = ClientPresentationEngine.sanitizeProposal({ ...mockRawProposal, status: "SENT" });
      expect(sentProposal.nextActionPrompt.actionType).toBe("CLIENT_REVIEW_REQUIRED");

      const approvedProposal = ClientPresentationEngine.sanitizeProposal({ ...mockRawProposal, status: "APPROVED" });
      expect(approvedProposal.nextActionPrompt.actionType).toBe("APPROVED_IN_DELIVERY");

      const revisedProposal = ClientPresentationEngine.sanitizeProposal({ ...mockRawProposal, status: "REVISED" });
      expect(revisedProposal.nextActionPrompt.actionType).toBe("WAITING_FOR_REVISION");
    });
  });

  describe("2. Cryptographic Digital Seal & E-Signature Intent Workflow", () => {
    it("should generate a deterministic SHA-256 digital seal hash binding IP, timestamp, and version", () => {
      const cert = ClientPresentationEngine.generateDigitalSeal({
        proposalId: "prop-101",
        proposalVersion: 2,
        approvedAmount: 20000,
        currency: "USD",
        clientName: "Jane Doe",
        clientEmail: "jane@globalventures.com",
        signerTitle: "Chief Technology Officer",
        signerCompany: "Global Ventures Inc",
        clientIp: "192.168.1.50",
        clientUserAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        deliverables: mockRawProposal.deliverables
      });

      expect(cert.certificateId).toMatch(/^SEAL-[A-F0-9]{12}$/);
      expect(cert.certificateHash).toHaveLength(64); // SHA-256 length
      expect(cert.signedPayload.clientName).toBe("Jane Doe");
      expect(cert.signedPayload.clientIp).toBe("192.168.1.50");
      expect(cert.signedPayload.approvedAmount).toBe(20000);
      expect(cert.verificationUrl).toContain(cert.certificateId);
    });

    it("should include explicit statutory legal disclaimer in digital seal certificate", () => {
      const cert = ClientPresentationEngine.generateDigitalSeal({
        proposalId: "prop-101",
        proposalVersion: 2,
        approvedAmount: 20000,
        currency: "USD",
        clientName: "Jane Doe",
        clientEmail: "jane@globalventures.com",
        clientIp: "127.0.0.1",
        clientUserAgent: "TestUA",
        deliverables: []
      });

      expect(cert.legalDisclaimer).toContain("Does not constitute statutory legal e-signature advice");
      expect(cert.consentStatement).toContain("authorized to approve this project specification");
    });
  });

  describe("3. Client-Facing Weekly Update Generator", () => {
    it("should format clear, non-technical weekly digest markdown with schedule health", () => {
      const updateMarkdown = ClientPresentationEngine.generateWeeklyUpdateText({
        updateType: "WEEKLY_DIGEST",
        title: "Sprint 2 Progress Digest",
        summaryMarkdown: "All frontend dashboard screens have been integrated with live test data.",
        scheduleHealth: "ON_TRACK",
        milestonesCompleted: [
          { title: "Milestone 1: Figma Sign-off", completedDate: "March 1st" }
        ],
        upcomingDeliverables: [
          { title: "Staging Demo Walkthrough", targetDate: "March 15th" }
        ],
        blockersNotes: "Awaiting final Stripe sandbox API credentials from client finance team."
      });

      expect(updateMarkdown).toContain("## Sprint 2 Progress Digest");
      expect(updateMarkdown).toContain("Schedule Health: **ON TRACK**");
      expect(updateMarkdown).toContain("Milestone 1: Figma Sign-off");
      expect(updateMarkdown).toContain("Staging Demo Walkthrough");
      expect(updateMarkdown).toContain("Awaiting final Stripe sandbox API credentials");
    });
  });

  describe("4. Zod Validation Schemas", () => {
    it("should reject full approval if authorization consent checkbox is false", () => {
      const invalidData = {
        clientName: "Jane Doe",
        clientEmail: "jane@client.com",
        consentConfirmed: false
      };

      const result = ClientFullApprovalSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("confirm authorization");
      }
    });

    it("should validate sectional approval submissions with approved and revision items", () => {
      const validData = {
        clientName: "Jane Doe",
        clientEmail: "jane@client.com",
        signerTitle: "VP Product",
        consentConfirmed: true,
        sections: [
          { sectionKey: "deliverables.0", status: "APPROVED" as const },
          { sectionKey: "deliverables.1", status: "CHANGES_REQUESTED" as const, notes: "Needs auth0 support" }
        ]
      };

      const result = ClientSectionalApprovalSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should enforce minimum character length on revision feedback notes", () => {
      const invalidRevision = {
        clientName: "Jane Doe",
        clientEmail: "jane@client.com",
        feedbackCategory: "GENERAL" as const,
        revisionNotes: "bad" // Under 5 characters
      };

      const result = RequestRevisionSchema.safeParse(invalidRevision);
      expect(result.success).toBe(false);
    });

    it("should validate stakeholder delegation data correctly", () => {
      const validDelegation = {
        delegatedByName: "Jane Doe",
        delegatedByEmail: "jane@client.com",
        recipientName: "Robert Smith",
        recipientEmail: "robert@client.com",
        recipientRole: "General Counsel",
        notes: "Please review contract terms."
      };

      const result = DelegateApprovalSchema.safeParse(validDelegation);
      expect(result.success).toBe(true);
    });
  });
});
