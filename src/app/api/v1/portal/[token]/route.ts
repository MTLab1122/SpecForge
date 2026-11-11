import { NextRequest, NextResponse } from "next/server";
import { ClientPresentationEngine } from "@/lib/client-portal/presentation-engine";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const shareToken = params.token;

    // Demonstration / database lookup mock data
    const rawProposal = {
      id: "prop-42",
      shareToken,
      version: 1,
      title: "Enterprise Web Platform & Customer Portal",
      status: "SENT",
      executiveSummary: "A secure, multi-tenant web application and mobile-responsive portal engineered to scale customer onboarding, streamline self-service workflows, and automate business operations.",
      totalPrice: 28500,
      currency: "USD",
      createdAt: new Date().toISOString(),
      branding: {
        agencyName: "Apex Digital Solutions",
        primaryColor: "#4F46E5",
        accentColor: "#06B6D4"
      },
      coverPage: {
        subtitle: "Technical Architecture, Scope Specifications & Commercial Investment",
        preparedForCompany: "Horizon Global Logistics",
        preparedByContact: "Marcus Vance, Technical Director"
      },
      deliverables: [
        {
          id: "deliv-1",
          title: "UX Research, Wireframes & Design System",
          category: "Design & Prototyping",
          description: "High-fidelity Figma prototypes, design tokens, responsive viewports, and interactive user journeys.",
          keyFeatures: ["Figma Interactive Prototype", "Design System Tokens", "Mobile-first Wireframes", "Accessibility (WCAG 2.1) Audit"],
          clientBenefit: "Validates customer experience before coding, eliminating expensive mid-development redesigns."
        },
        {
          id: "deliv-2",
          title: "Frontend Web Application & Client Portal",
          category: "Frontend Engineering",
          description: "Next.js / React single-page interface with real-time dashboards, optimistic UI, and internationalization.",
          keyFeatures: ["Secure Magic Link & SSO Login", "Self-Service Customer Dashboard", "Real-time Order Tracking", "Responsive Mobile Viewports"],
          clientBenefit: "Delivers an instantaneous, sub-second user experience that drives customer retention and adoption."
        },
        {
          id: "deliv-3",
          title: "Backend Cloud Infrastructure & APIs",
          category: "Backend & Cloud",
          description: "Robust PostgreSQL database schema, secure REST/GraphQL endpoints, automated backups, and encrypted token storage.",
          keyFeatures: ["Multi-Tenant Data Isolation", "Stripe Billing & Invoicing Integration", "Role-Based Permissions (RBAC)", "Automated CI/CD Deployment Pipeline"],
          clientBenefit: "Guarantees data confidentiality, 99.9% uptime reliability, and seamless automated scaling."
        },
        {
          id: "deliv-4",
          title: "Automated Testing & End-to-End QA Suite",
          category: "Quality Assurance",
          description: "Comprehensive automated Playwright and Jest test suites covering critical customer checkout and authentication flows.",
          keyFeatures: ["Regression Test Suites", "Device Compatibility Validation", "Security Penetration Scans", "Performance Profiling (<200ms API latency)"],
          clientBenefit: "Prevents critical production downtime and ensures flawless launch execution."
        }
      ],
      milestones: [
        {
          id: "m-1",
          title: "Architecture & Interactive Design Sign-off",
          targetWeek: "Week 2",
          percentageOfTotal: 30,
          deliverablesSummary: ["Figma prototypes approved", "Database schema locked", "Cloud staging environment ready"]
        },
        {
          id: "m-2",
          title: "Core Portal Feature Completion & Alpha Demo",
          targetWeek: "Week 5",
          percentageOfTotal: 40,
          deliverablesSummary: ["Customer self-service portal live on staging", "Stripe payment flow operational", "API test suites passing"]
        },
        {
          id: "m-3",
          title: "Production Deployment & Delivery Handover",
          targetWeek: "Week 7",
          percentageOfTotal: 30,
          deliverablesSummary: ["Domain DNS switched to production", "Final security audits signed off", "Full source code & runbook transferred"]
        }
      ]
    };

    // Sanitize proposal (strips internal contractor rates, internal profit margins, and private team notes)
    const sanitized = ClientPresentationEngine.sanitizeProposal(rawProposal);

    return NextResponse.json({
      success: true,
      proposal: sanitized
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load client proposal" },
      { status: 500 }
    );
  }
}
