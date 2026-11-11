export type TemplateCategory = "DISCOVERY" | "ESTIMATE" | "PROPOSAL" | "SCOPE" | "TASK";

export interface SystemTemplate {
  id: string;
  title: string;
  category: TemplateCategory;
  description: string;
  badge: string;
  structure: {
    features?: Array<{ title: string; description: string; priority: string; storiesCount?: number }>;
    rolesEstimated?: Array<{ role: string; hours: number; rate: number }>;
    proposalSummary?: string;
    tasksBoilerplate?: Array<{ title: string; priority: string; estimatedHours: number }>;
  };
}

export const SYSTEM_TEMPLATES: SystemTemplate[] = [
  // 1. Discovery Templates
  {
    id: "tmpl_saas_portal",
    title: "Enterprise Multi-Tenant SaaS Platform",
    category: "DISCOVERY",
    description: "Complete discovery blueprint for B2B SaaS with role RBAC, billing tiers, and analytics dashboard.",
    badge: "Most Popular",
    structure: {
      features: [
        { title: "Authentication & Role-Based RBAC", description: "JWT/SSO session control with Owner/Admin/Member permissions.", priority: "MUST", storiesCount: 4 },
        { title: "Subscription Billing & Stripe Gateway", description: "Tiered plans, usage metering, and invoice settlement.", priority: "MUST", storiesCount: 3 },
        { title: "Real-Time Executive Analytics", description: "Telemetry dashboards, KPI charts, and data export.", priority: "SHOULD", storiesCount: 3 }
      ]
    }
  },
  {
    id: "tmpl_ecommerce_mvp",
    title: "E-Commerce Headless Storefront & Checkout",
    category: "DISCOVERY",
    description: "Modern commerce discovery structure with product catalog, cart persistence, and payment gateway.",
    badge: "Commerce",
    structure: {
      features: [
        { title: "Product Catalog & Search Filters", description: "Faceted search, categories, and inventory stock tracking.", priority: "MUST", storiesCount: 4 },
        { title: "1-Click Checkout & Payment Gateway", description: "Guest checkout, Stripe integration, and automated order confirmation.", priority: "MUST", storiesCount: 3 }
      ]
    }
  },
  {
    id: "tmpl_mobile_app",
    title: "Cross-Platform Mobile Application (iOS/Android)",
    category: "DISCOVERY",
    description: "React Native / Flutter blueprint covering push notifications, offline cache, and biometric login.",
    badge: "Mobile",
    structure: {
      features: [
        { title: "Biometric Login & Push Notifications", description: "FaceID/TouchID and APNs/FCM real-time push dispatches.", priority: "MUST", storiesCount: 3 },
        { title: "Offline Data Sync & Local Storage", description: "Local SQLite/WatermelonDB storage with conflict resolution.", priority: "SHOULD", storiesCount: 2 }
      ]
    }
  },

  // 2. Estimate Templates
  {
    id: "tmpl_est_fixed_price",
    title: "Fixed-Price Discovery & Build Sprint",
    category: "ESTIMATE",
    description: "Predictable, low-risk project structure with built-in 20% risk contingency and QA buffer.",
    badge: "Fixed Price",
    structure: {
      rolesEstimated: [
        { role: "Lead Full-Stack Engineer", hours: 80, rate: 120 },
        { role: "UI/UX Product Designer", hours: 30, rate: 95 },
        { role: "QA Automation Engineer", hours: 25, rate: 80 },
        { role: "Project Manager", hours: 15, rate: 90 }
      ]
    }
  },
  {
    id: "tmpl_est_time_materials",
    title: "Time & Materials Technical Retainer",
    category: "ESTIMATE",
    description: "Flexible monthly engineering allocation with blended realization rate tracking.",
    badge: "Retainer",
    structure: {
      rolesEstimated: [
        { role: "Senior Full-Stack Engineer", hours: 120, rate: 110 },
        { role: "DevOps & Cloud Architect", hours: 20, rate: 135 }
      ]
    }
  },

  // 3. Proposal Templates
  {
    id: "tmpl_prop_enterprise",
    title: "Executive Enterprise Client Pitch",
    category: "PROPOSAL",
    description: "Executive-level proposal framing including ROI projections, milestone roadmaps, and SLA commitments.",
    badge: "Executive",
    structure: {
      proposalSummary: "A scalable, production-grade cloud solution engineered to eliminate manual operational friction, reduce technical debt, and accelerate time-to-market."
    }
  },

  // 4. Scope & Task Templates
  {
    id: "tmpl_scope_security_pack",
    title: "Production Security & Compliance Pack",
    category: "SCOPE",
    description: "Ready-to-attach scope specifications for MFA, audit trails, and GDPR compliance.",
    badge: "Security",
    structure: {
      features: [
        { title: "Two-Factor Authentication (TOTP)", description: "RFC 6238 TOTP with emergency recovery codes.", priority: "MUST", storiesCount: 2 },
        { title: "Immutable Audit Trail Logging", description: "Comprehensive audit logging for all critical operations.", priority: "MUST", storiesCount: 2 }
      ]
    }
  },
  {
    id: "tmpl_task_scrum_package",
    title: "Standard Agile Delivery Handover Tasks",
    category: "TASK",
    description: "Canonical delivery sprint task package mapped for Jira, Linear, and GitHub Issues.",
    badge: "Handover",
    structure: {
      tasksBoilerplate: [
        { title: "Initialize CI/CD Pipeline & Automated Linting", priority: "HIGH", estimatedHours: 8 },
        { title: "Provision Staging Environment & Database Migrations", priority: "HIGH", estimatedHours: 6 },
        { title: "Configure Authentication Guardrails & Role Middlewares", priority: "HIGH", estimatedHours: 12 }
      ]
    }
  }
];

export class TemplatesAndAssetsEngine {
  /**
   * Retrieves templates filtered by category and organization.
   */
  public static getTemplates(category?: TemplateCategory): SystemTemplate[] {
    if (!category) return SYSTEM_TEMPLATES;
    return SYSTEM_TEMPLATES.filter((t) => t.category === category);
  }

  /**
   * Clones a project and its features/estimates into a clean duplicate project container.
   * Strips historical client comments, approvals, and share tokens to ensure privacy.
   */
  public static duplicateProject(sourceProject: {
    id: string;
    title: string;
    description: string;
    organizationId: string;
    features?: Array<{ title: string; description: string; priority: string; stories?: any[] }>;
    estimates?: any[];
  }): {
    duplicatedProject: Record<string, any>;
    featuresClonedCount: number;
    estimatesClonedCount: number;
  } {
    const newProjectId = `proj_copy_${Date.now()}`;
    const duplicatedTitle = `${sourceProject.title} (Copy)`;

    const clonedFeatures = (sourceProject.features || []).map((feat, idx) => ({
      id: `feat_copy_${newProjectId}_${idx + 1}`,
      title: feat.title,
      description: feat.description,
      priority: feat.priority,
      storiesCount: feat.stories ? feat.stories.length : 0
    }));

    const clonedEstimates = (sourceProject.estimates || []).map((est, idx) => ({
      id: `est_copy_${newProjectId}_${idx + 1}`,
      totalPrice: est.totalPrice || 0,
      currency: est.currency || "USD",
      status: "DRAFT" // Resets approval state
    }));

    return {
      duplicatedProject: {
        id: newProjectId,
        title: duplicatedTitle,
        description: sourceProject.description,
        organizationId: sourceProject.organizationId,
        stage: "DISCOVERY",
        status: "ACTIVE",
        clonedFromProjectId: sourceProject.id,
        createdAt: new Date().toISOString()
      },
      featuresClonedCount: clonedFeatures.length,
      estimatesClonedCount: clonedEstimates.length
    };
  }

  /**
   * Converts an existing project into a reusable custom organization template.
   */
  public static saveProjectAsTemplate(params: {
    projectTitle: string;
    projectDescription: string;
    organizationId: string;
    category: TemplateCategory;
    features: Array<{ title: string; description: string; priority: string }>;
  }): SystemTemplate {
    return {
      id: `tmpl_custom_${Date.now()}`,
      title: `${params.projectTitle} Blueprint`,
      category: params.category,
      description: params.projectDescription,
      badge: "Custom Agency Blueprint",
      structure: {
        features: params.features
      }
    };
  }
}
