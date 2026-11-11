import type { PricingType, EstimateScenarioType, EstimateCategory } from "../validations/commercial-estimation";

export interface EstimateTemplateItem {
  title: string;
  category: EstimateCategory;
  roleTitle: string;
  hourlyRate: number;
  complexity: "LOW" | "MEDIUM" | "HIGH";
  minHours: number;
  maxHours: number;
  description: string;
}

export interface CommercialEstimateTemplate {
  id: string;
  name: string;
  category: string;
  pricingType: PricingType;
  description: string;
  defaultContingencyPercent: number;
  recommendedScenario: EstimateScenarioType;
  typicalDurationWeeks: number;
  standardAssumptions: string[];
  invoicingSchedule: string[];
  defaultItems: EstimateTemplateItem[];
}

export const COMMERCIAL_ESTIMATE_TEMPLATES: CommercialEstimateTemplate[] = [
  {
    id: "fixed-price-turnkey",
    name: "Fixed-Price Turnkey Project",
    category: "Fixed-Price Project",
    pricingType: "FIXED_PRICE",
    description: "Firm-scope contract with guaranteed delivery milestones, strict change-order governance, and capped client exposure.",
    defaultContingencyPercent: 15.0,
    recommendedScenario: "REALISTIC",
    typicalDurationWeeks: 8,
    standardAssumptions: [
      "Client provides visual brand assets, API keys, and copy within 3 business days of kickoff.",
      "Maximum of 2 revision rounds per milestone deliverable.",
      "Any scope additions will be estimated separately under formal change requests.",
      "Deployment targets AWS / GCP cloud environments specified in architectural discovery."
    ],
    invoicingSchedule: [
      "30% upfront deposit upon contract execution",
      "30% upon completion and client sign-off of core architecture & UI wireframes",
      "30% upon staging environment deployment and feature completion",
      "10% final balance upon production handover and acceptance testing sign-off"
    ],
    defaultItems: [
      {
        title: "UX Research, Information Architecture & UI Design System",
        category: "DESIGN",
        roleTitle: "Lead UI/UX Designer",
        hourlyRate: 95,
        complexity: "MEDIUM",
        minHours: 35,
        maxHours: 45,
        description: "Interactive Figma prototype, component library tokens, responsive mobile & desktop viewports."
      },
      {
        title: "Frontend Application & State Management",
        category: "DEVELOPMENT",
        roleTitle: "Senior Frontend Engineer",
        hourlyRate: 110,
        complexity: "HIGH",
        minHours: 70,
        maxHours: 90,
        description: "Next.js / React responsive web application, optimistic UI, caching, authentication flows."
      },
      {
        title: "Backend API, Database Schema & Business Logic",
        category: "DEVELOPMENT",
        roleTitle: "Senior Backend Engineer",
        hourlyRate: 120,
        complexity: "HIGH",
        minHours: 80,
        maxHours: 100,
        description: "PostgreSQL schema, Prisma ORM, secure REST/GraphQL endpoints, multi-tenant RBAC."
      },
      {
        title: "Automated Test Suite & Manual End-to-End QA",
        category: "QA",
        roleTitle: "QA Automation Lead",
        hourlyRate: 85,
        complexity: "MEDIUM",
        minHours: 30,
        maxHours: 40,
        description: "Jest unit tests, Playwright regression suites, cross-browser validation."
      },
      {
        title: "Cloud Infrastructure, CI/CD Pipeline & DNS Configuration",
        category: "DEPLOYMENT",
        roleTitle: "DevOps Engineer",
        hourlyRate: 125,
        complexity: "MEDIUM",
        minHours: 16,
        maxHours: 24,
        description: "Terraform / Docker cloud setup, GitHub Actions automated deployment pipelines, SSL setup."
      },
      {
        title: "Sprint Management, Stakeholder Syncs & Handover Documentation",
        category: "PROJECT_MANAGEMENT",
        roleTitle: "Technical Project Manager",
        hourlyRate: 90,
        complexity: "LOW",
        minHours: 20,
        maxHours: 28,
        description: "Bi-weekly sprint reviews, risk management, and handover runbooks."
      }
    ]
  },
  {
    id: "time-and-materials-sprint",
    name: "Time & Materials (Agile Sprints)",
    category: "Time-and-material project",
    pricingType: "TIME_AND_MATERIALS",
    description: "Flexible team augmentation or evolving scope billed transparently based on actual logged hours per bi-weekly sprint.",
    defaultContingencyPercent: 10.0,
    recommendedScenario: "REALISTIC",
    typicalDurationWeeks: 12,
    standardAssumptions: [
      "Client product owner actively participates in bi-weekly backlog grooming and sprint planning.",
      "Invoiced bi-weekly based on verified engineer timesheets.",
      "Backlog priorities may shift between sprints without change-order penalty."
    ],
    invoicingSchedule: [
      "Initial 2-week retainer buffer deposit held against final sprint",
      "Bi-weekly invoice issued every other Monday with detailed timesheet exports",
      "Payment terms net-15"
    ],
    defaultItems: [
      {
        title: "Sprint Backlog Engineering & Feature Development",
        category: "DEVELOPMENT",
        roleTitle: "Senior Full Stack Engineer",
        hourlyRate: 115,
        complexity: "HIGH",
        minHours: 120,
        maxHours: 160,
        description: "Sprint velocity execution across designated prioritized user stories."
      },
      {
        title: "Code Reviews, Pull Request Audits & Architecture Guidance",
        category: "DEVELOPMENT",
        roleTitle: "Lead Architect",
        hourlyRate: 140,
        complexity: "HIGH",
        minHours: 20,
        maxHours: 30,
        description: "System design governance, schema reviews, and performance profiling."
      },
      {
        title: "Continuous QA & Acceptance Verification",
        category: "QA",
        roleTitle: "QA Engineer",
        hourlyRate: 80,
        complexity: "MEDIUM",
        minHours: 30,
        maxHours: 45,
        description: "Sprint acceptance testing, bug logging, and user acceptance testing support."
      },
      {
        title: "Sprint Ceremony Facilitation & Burndown Tracking",
        category: "PROJECT_MANAGEMENT",
        roleTitle: "Technical Project Manager",
        hourlyRate: 90,
        complexity: "LOW",
        minHours: 15,
        maxHours: 20,
        description: "Jira/Linear backlog grooming, velocity tracking, and sprint retrospectives."
      }
    ]
  },
  {
    id: "monthly-advisory-retainer",
    name: "Monthly Engineering & Advisory Retainer",
    category: "Retainer",
    pricingType: "RETAINER",
    description: "Guaranteed monthly reservation of high-seniority engineering and architectural capacity with prioritized response SLA.",
    defaultContingencyPercent: 5.0,
    recommendedScenario: "OPTIMISTIC",
    typicalDurationWeeks: 24,
    standardAssumptions: [
      "Reserved hours do not roll over past 30 days unless agreed in writing.",
      "Emergency response SLA guaranteed under 4 hours during business days.",
      "Monthly recurring billing at start of each billing cycle."
    ],
    invoicingSchedule: [
      "Billed in advance on the 1st of each month",
      "Overage hours (if authorized by client) billed on following month invoice at standard rate card"
    ],
    defaultItems: [
      {
        title: "Architectural Advisory & Technical Leadership",
        category: "FEATURE",
        roleTitle: "Principal Architect",
        hourlyRate: 150,
        complexity: "HIGH",
        minHours: 15,
        maxHours: 20,
        description: "Strategic tech stack reviews, scalability guidance, and vendor evaluations."
      },
      {
        title: "Core Feature Iterations & High-Priority Enhancements",
        category: "DEVELOPMENT",
        roleTitle: "Senior Full Stack Engineer",
        hourlyRate: 115,
        complexity: "MEDIUM",
        minHours: 30,
        maxHours: 40,
        description: "Feature development and code modifications requested in monthly priority queues."
      },
      {
        title: "Monthly Security Patching & Dependency Audits",
        category: "DEPLOYMENT",
        roleTitle: "DevOps Engineer",
        hourlyRate: 125,
        complexity: "LOW",
        minHours: 8,
        maxHours: 12,
        description: "NPM audit, Docker vulnerability scans, and database maintenance."
      }
    ]
  },
  {
    id: "fast-track-mvp",
    name: "Fast-Track MVP Launch",
    category: "MVP",
    pricingType: "MVP_FIXED",
    description: "Lean, high-velocity build focusing exclusively on MoSCoW 'Must-Have' requirements to achieve market validation in 4-6 weeks.",
    defaultContingencyPercent: 15.0,
    recommendedScenario: "REALISTIC",
    typicalDurationWeeks: 5,
    standardAssumptions: [
      "Strict scope fence: 'Could' and 'Won't' items deferred to post-MVP phase.",
      "Use established UI component libraries (shadcn/ui, Tailwind) rather than bespoke custom design systems.",
      "Third-party managed services utilized (Supabase/Auth0, Stripe, Resend) to minimize custom infrastructure."
    ],
    invoicingSchedule: [
      "50% kickoff deposit upon contract execution",
      "50% upon deployment to production and domain DNS verification"
    ],
    defaultItems: [
      {
        title: "Core User Flow Wireframes & Essential UI Screens",
        category: "DESIGN",
        roleTitle: "UI/UX Designer",
        hourlyRate: 90,
        complexity: "LOW",
        minHours: 20,
        maxHours: 25,
        description: "Sign-up, core workflow dashboard, checkout/action screens, mobile responsiveness."
      },
      {
        title: "MVP Frontend & Interactive Core Flow",
        category: "DEVELOPMENT",
        roleTitle: "Senior Full Stack Engineer",
        hourlyRate: 110,
        complexity: "MEDIUM",
        minHours: 60,
        maxHours: 80,
        description: "End-to-end user workflow execution, authentication, feedback toasts."
      },
      {
        title: "Managed Cloud Deployment & Production Launch",
        category: "DEPLOYMENT",
        roleTitle: "DevOps Engineer",
        hourlyRate: 120,
        complexity: "LOW",
        minHours: 12,
        maxHours: 16,
        description: "Vercel / AWS deployment, custom domain setup, transactional email setup."
      },
      {
        title: "Smoke Testing & Bug Remediation",
        category: "QA",
        roleTitle: "QA Engineer",
        hourlyRate: 80,
        complexity: "LOW",
        minHours: 15,
        maxHours: 20,
        description: "Critical path smoke testing, device testing, and edge case remediation."
      }
    ]
  },
  {
    id: "production-maintenance-support",
    name: "Production Maintenance & SLA Support",
    category: "Maintenance",
    pricingType: "MAINTENANCE",
    description: "Post-launch reliability engineering, bug fixes, third-party API deprecation monitoring, and guaranteed uptime response.",
    defaultContingencyPercent: 10.0,
    recommendedScenario: "CONSERVATIVE",
    typicalDurationWeeks: 16,
    standardAssumptions: [
      "Service incidents triaged according to standard P1-P4 priority criteria.",
      "Database backups verified weekly; uptime alerts sent to shared Slack/PagerDuty channel.",
      "Excludes major new architectural rewrites."
    ],
    invoicingSchedule: [
      "Quarterly or monthly prepaid maintenance retainer",
      "Detailed incident post-mortem provided for any critical downtime events"
    ],
    defaultItems: [
      {
        title: "Production Incident Triage & Bug Fixes",
        category: "DEVELOPMENT",
        roleTitle: "Senior Full Stack Engineer",
        hourlyRate: 115,
        complexity: "MEDIUM",
        minHours: 20,
        maxHours: 30,
        description: "Addressing production issues, error log investigations, and regression hotfixes."
      },
      {
        title: "Cloud Infrastructure Monitoring & Cost Optimization",
        category: "DEPLOYMENT",
        roleTitle: "DevOps Engineer",
        hourlyRate: 125,
        complexity: "LOW",
        minHours: 10,
        maxHours: 15,
        description: "Monitoring dashboard maintenance, auto-scaling verification, and cloud cost cleanup."
      },
      {
        title: "Quarterly Dependency & Security Upgrades",
        category: "TASK",
        roleTitle: "QA Engineer",
        hourlyRate: 85,
        complexity: "LOW",
        minHours: 10,
        maxHours: 15,
        description: "Upgrading core framework packages, Node runtime patches, and regression verification."
      }
    ]
  },
  {
    id: "architecture-discovery-sprint",
    name: "Technical Architecture & Discovery Sprint",
    category: "Discovery phase",
    pricingType: "DISCOVERY_PHASE",
    description: "Pre-development technical de-risking sprint delivering comprehensive specifications, database schemas, and locked implementation estimates.",
    defaultContingencyPercent: 5.0,
    recommendedScenario: "OPTIMISTIC",
    typicalDurationWeeks: 2,
    standardAssumptions: [
      "Client executive stakeholders available for two 90-minute alignment workshops during Week 1.",
      "Discovery deliverables include Entity Relationship Diagrams, API specs, interactive Figma, and high-confidence proposal.",
      "Discovery fee 100% credited toward full build if client proceeds with agency delivery."
    ],
    invoicingSchedule: [
      "100% advance deposit prior to discovery kickoff"
    ],
    defaultItems: [
      {
        title: "Stakeholder Discovery Workshops & Requirements Extraction",
        category: "PROJECT_MANAGEMENT",
        roleTitle: "Principal Consultant",
        hourlyRate: 150,
        complexity: "MEDIUM",
        minHours: 15,
        maxHours: 20,
        description: "Facilitated discovery sessions, business goal mapping, and edge case extraction."
      },
      {
        title: "Technical Architecture, Data Modeling & API Design",
        category: "DEVELOPMENT",
        roleTitle: "Lead Architect",
        hourlyRate: 140,
        complexity: "HIGH",
        minHours: 25,
        maxHours: 35,
        description: "Entity relationship diagram, technology stack recommendation, third-party integration feasibility."
      },
      {
        title: "Wireframing & Core User Journey Definition",
        category: "DESIGN",
        roleTitle: "Lead UI/UX Designer",
        hourlyRate: 95,
        complexity: "MEDIUM",
        minHours: 20,
        maxHours: 30,
        description: "Interactive low-fidelity wireframes detailing core user paths and mobile screen layouts."
      },
      {
        title: "Commercial Estimation Matrix & Delivery Roadmap",
        category: "PROJECT_MANAGEMENT",
        roleTitle: "Technical Project Manager",
        hourlyRate: 95,
        complexity: "LOW",
        minHours: 10,
        maxHours: 15,
        description: "P80 work-breakdown structure, milestone delivery plan, and risk register."
      }
    ]
  }
];
