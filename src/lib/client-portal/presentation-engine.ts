import crypto from "node:crypto";
import type {
  ClientApprovalType,
  SectionApprovalStatus,
  ClientProgressUpdateCreateInput
} from "../validations/client-portal";

export interface ProposalDeliverableItem {
  id: string;
  title: string;
  category: string;
  description: string;
  keyFeatures: string[];
  clientBenefit: string;
  sectionKey: string;
  approvalStatus?: SectionApprovalStatus;
}

export interface ProposalMilestoneItem {
  id: string;
  title: string;
  targetWeek: string;
  percentageOfTotal: number;
  amount: number;
  deliverablesSummary: string[];
  sectionKey: string;
  approvalStatus?: SectionApprovalStatus;
}

export interface SanitizedProposalView {
  id: string;
  shareToken: string;
  version: number;
  status: "DRAFT" | "SENT" | "VIEWED" | "REVISED" | "APPROVED" | "REJECTED";
  title: string;
  branding: {
    logoUrl?: string;
    agencyName: string;
    primaryColor: string;
    accentColor: string;
    websiteUrl?: string;
  };
  coverPage: {
    subtitle: string;
    preparedForCompany: string;
    preparedByContact: string;
    issueDate: string;
    validUntilDate: string;
  };
  executiveSummary: string;
  businessObjectives: string[];
  deliverables: ProposalDeliverableItem[];
  milestones: ProposalMilestoneItem[];
  investmentSummary: {
    totalInvestment: number;
    currency: string;
    paymentSchedule: Array<{ milestoneTitle: string; percentage: number; amount: number; paymentTrigger: string }>;
  };
  assumptionsAndTerms: {
    standardAssumptions: string[];
    clientResponsibilities: string[];
    exclusions: string[];
    warrantyAndSupportDays: number;
  };
  approvalMetadata?: {
    approvedAt?: string;
    clientName?: string;
    clientEmail?: string;
    signerTitle?: string;
    signerCompany?: string;
    certificateHash?: string;
    approvalType?: ClientApprovalType;
  };
  nextActionPrompt: {
    actionLabel: string;
    actionType: "CLIENT_REVIEW_REQUIRED" | "WAITING_FOR_REVISION" | "APPROVED_IN_DELIVERY" | "SECTIONAL_REVIEW_INCOMPLETE";
    urgency: "HIGH" | "NORMAL" | "RESOLVED";
  };
}

export interface DigitalSealPayload {
  proposalId: string;
  proposalVersion: number;
  approvedAmount: number;
  currency: string;
  clientName: string;
  clientEmail: string;
  signerTitle?: string;
  signerCompany?: string;
  clientIp: string;
  clientUserAgent: string;
  approvedAt: string;
  deliverablesHashSummary: string;
}

export interface DigitalApprovalCertificateResult {
  certificateId: string;
  certificateHash: string;
  signedPayload: DigitalSealPayload;
  consentStatement: string;
  legalDisclaimer: string;
  verificationUrl: string;
}

export class ClientPresentationEngine {
  /**
   * Sanitizes raw project/estimate data into a client-safe proposal view.
   * STRICT ENFORCEMENT: Strips internal contractor rates, internal profit margins, and private team notes.
   */
  public static sanitizeProposal(rawProposal: any): SanitizedProposalView {
    const currency = rawProposal.currency || "USD";
    const totalPrice = Number(rawProposal.totalPrice || 0);

    const branding = {
      agencyName: rawProposal.branding?.agencyName || "SpecForge Digital Agency",
      logoUrl: rawProposal.branding?.logoUrl || undefined,
      primaryColor: rawProposal.branding?.primaryColor || "#4F46E5",
      accentColor: rawProposal.branding?.accentColor || "#06B6D4",
      websiteUrl: rawProposal.branding?.websiteUrl || "https://specforge.io"
    };

    const coverPage = {
      subtitle: rawProposal.coverPage?.subtitle || "Project Scope, Architecture & Commercial Proposal",
      preparedForCompany: rawProposal.coverPage?.preparedForCompany || "Acme Client Corp",
      preparedByContact: rawProposal.coverPage?.preparedByContact || "Engineering Leadership",
      issueDate: rawProposal.createdAt ? new Date(rawProposal.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
      validUntilDate: rawProposal.shareUrlExpires
        ? new Date(rawProposal.shareUrlExpires).toLocaleDateString()
        : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()
    };

    // Sanitize deliverables: no internal rates, no contractor hours, no margin
    const rawDeliverables = Array.isArray(rawProposal.deliverables) ? rawProposal.deliverables : [];
    const deliverables: ProposalDeliverableItem[] = rawDeliverables.map((d: any, idx: number) => ({
      id: d.id || `deliv-${idx}`,
      sectionKey: `deliverables.${idx}`,
      title: d.title || `Deliverable Phase ${idx + 1}`,
      category: d.category || "Core System",
      description: d.description || "Production-grade deliverable adhering to specification.",
      keyFeatures: Array.isArray(d.keyFeatures) ? d.keyFeatures : ["Interactive UI", "Data Integration", "Security Testing"],
      clientBenefit: d.clientBenefit || "Accelerates operational efficiency and user conversion.",
      approvalStatus: rawProposal.sectionApprovals?.[`deliverables.${idx}`]?.status || "PENDING"
    }));

    // Sanitize milestones
    const rawMilestones = Array.isArray(rawProposal.milestones) ? rawProposal.milestones : [];
    const milestones: ProposalMilestoneItem[] = rawMilestones.map((m: any, idx: number) => {
      const pct = m.percentageOfTotal || (rawMilestones.length > 0 ? 100 / rawMilestones.length : 100);
      const amount = Number(((totalPrice * pct) / 100).toFixed(2));
      return {
        id: m.id || `milestone-${idx}`,
        sectionKey: `milestones.${idx}`,
        title: m.title || `Milestone ${idx + 1}`,
        targetWeek: m.targetWeek || `Week ${idx * 2 + 2}`,
        percentageOfTotal: pct,
        amount,
        deliverablesSummary: Array.isArray(m.deliverablesSummary) ? m.deliverablesSummary : ["Phase Completion Sign-Off"],
        approvalStatus: rawProposal.sectionApprovals?.[`milestones.${idx}`]?.status || "PENDING"
      };
    });

    // Milestone Payment Schedule
    const paymentSchedule = milestones.map((m) => ({
      milestoneTitle: m.title,
      percentage: m.percentageOfTotal,
      amount: m.amount,
      paymentTrigger: `Upon client review and sign-off of ${m.title}`
    }));

    // Terms & Assumptions
    const standardAssumptions = [
      "Client provides brand assets, copy, and existing third-party API credentials within 3 business days of kickoff.",
      "Scope includes up to two rounds of consolidated review feedback per milestone.",
      "Deployment environment hosted on production cloud infrastructure specified in architectural roadmap."
    ];

    const clientResponsibilities = [
      "Designated single primary stakeholder for milestone reviews and approvals.",
      "Timely payment of milestone invoices within agreed net-15 terms."
    ];

    const exclusions = [
      "Out-of-scope feature additions or third-party legacy migrations not explicitly itemized in deliverables.",
      "Ongoing ad-hoc support beyond standard 30-day warranty period (covered under separate SLA maintenance)."
    ];

    // Determine Next Action Prompt
    let nextActionPrompt: SanitizedProposalView["nextActionPrompt"] = {
      actionLabel: "Action Required: Review Scope and Complete Client Sign-Off",
      actionType: "CLIENT_REVIEW_REQUIRED",
      urgency: "HIGH"
    };

    if (rawProposal.status === "APPROVED") {
      nextActionPrompt = {
        actionLabel: "Scope Approved: Engineering Kickoff & Delivery Handover in Progress",
        actionType: "APPROVED_IN_DELIVERY",
        urgency: "RESOLVED"
      };
    } else if (rawProposal.status === "REVISED") {
      nextActionPrompt = {
        actionLabel: "Agency Reviewing Feedback: Updated Proposal Revision Underway",
        actionType: "WAITING_FOR_REVISION",
        urgency: "NORMAL"
      };
    }

    return {
      id: rawProposal.id,
      shareToken: rawProposal.shareToken,
      version: rawProposal.version || 1,
      status: rawProposal.status || "SENT",
      title: rawProposal.title || "Project Specification & Commercial Proposal",
      branding,
      coverPage,
      executiveSummary: rawProposal.executiveSummary || "Comprehensive scope and implementation plan engineered to deliver your strategic software objectives.",
      businessObjectives: [
        "Deliver scalable, secure, and modern digital platform.",
        "Ensure transparent milestone velocity and budget certainty.",
        "Provide full source code ownership upon final delivery handover."
      ],
      deliverables,
      milestones,
      investmentSummary: {
        totalInvestment: totalPrice,
        currency,
        paymentSchedule
      },
      assumptionsAndTerms: {
        standardAssumptions,
        clientResponsibilities,
        exclusions,
        warrantyAndSupportDays: 30
      },
      approvalMetadata: rawProposal.approvalCertificate
        ? {
            approvedAt: rawProposal.approvalCertificate.approvedAt,
            clientName: rawProposal.approvalCertificate.clientName,
            clientEmail: rawProposal.approvalCertificate.clientEmail,
            signerTitle: rawProposal.approvalCertificate.signerTitle,
            signerCompany: rawProposal.approvalCertificate.signerCompany,
            certificateHash: rawProposal.approvalCertificate.certificateHash,
            approvalType: rawProposal.approvals?.[0]?.approvalType || "FULL_SCOPE"
          }
        : undefined,
      nextActionPrompt
    };
  }

  /**
   * Generates a deterministic SHA-256 digital seal hash for client approval.
   * Binds document version, deliverables, investment amount, client IP, and timestamp.
   */
  public static generateDigitalSeal(params: {
    proposalId: string;
    proposalVersion: number;
    approvedAmount: number;
    currency: string;
    clientName: string;
    clientEmail: string;
    signerTitle?: string;
    signerCompany?: string;
    clientIp: string;
    clientUserAgent: string;
    deliverables: any[];
  }): DigitalApprovalCertificateResult {
    const approvedAt = new Date().toISOString();

    // Deterministic summary of deliverables
    const deliverablesHashSummary = crypto
      .createHash("sha256")
      .update(JSON.stringify(params.deliverables || []))
      .digest("hex");

    const signedPayload: DigitalSealPayload = {
      proposalId: params.proposalId,
      proposalVersion: params.proposalVersion,
      approvedAmount: params.approvedAmount,
      currency: params.currency,
      clientName: params.clientName,
      clientEmail: params.clientEmail,
      signerTitle: params.signerTitle,
      signerCompany: params.signerCompany,
      clientIp: params.clientIp,
      clientUserAgent: params.clientUserAgent,
      approvedAt,
      deliverablesHashSummary
    };

    const canonicalString = [
      signedPayload.proposalId,
      `v${signedPayload.proposalVersion}`,
      `${signedPayload.currency} ${signedPayload.approvedAmount}`,
      signedPayload.clientName,
      signedPayload.clientEmail,
      signedPayload.signerTitle || "N/A",
      signedPayload.clientIp,
      signedPayload.approvedAt,
      signedPayload.deliverablesHashSummary
    ].join("|");

    const certificateHash = crypto.createHash("sha256").update(canonicalString).digest("hex");
    const certificateId = `SEAL-${certificateHash.substring(0, 12).toUpperCase()}`;

    return {
      certificateId,
      certificateHash,
      signedPayload,
      consentStatement:
        "I confirm I am authorized to approve this project specification and commercial investment on behalf of the client organization.",
      legalDisclaimer:
        "SpecForge records cryptographic proof of digital approval intent and version integrity. Does not constitute statutory legal e-signature advice under ESIGN/eIDAS. Integration with certified providers can be connected separately.",
      verificationUrl: `https://specforge.io/verify/${certificateId}`
    };
  }

  /**
   * Generates weekly client progress updates in clear, non-technical prose.
   */
  public static generateWeeklyUpdateText(input: ClientProgressUpdateCreateInput): string {
    const milestonesText =
      input.milestonesCompleted.length > 0
        ? input.milestonesCompleted.map((m) => `-  **${m.title}** (Completed ${m.completedDate})`).join("\n")
        : "- Ongoing sprint feature implementation in active development.";

    const upcomingText =
      input.upcomingDeliverables.length > 0
        ? input.upcomingDeliverables.map((u) => `-  **${u.title}** (Target: ${u.targetDate})`).join("\n")
        : "- Next phase deliverable assembly and quality assurance.";

    const blockersSection = input.blockersNotes
      ? `\n### Attention Needed\n${input.blockersNotes}\n`
      : "";

    return `## ${input.title}
*Schedule Health: **${input.scheduleHealth.replace("_", " ")}***

### Summary
${input.summaryMarkdown}

### Milestones Completed This Period
${milestonesText}

### Upcoming Deliverables & Key Dates
${upcomingText}
${blockersSection}
---
*Generated by SpecForge Client Portal.*`;
  }
}
