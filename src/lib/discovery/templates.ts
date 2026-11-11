export interface DiscoveryTemplate {
  id: string;
  category: string;
  title: string;
  description: string;
  icon: string;
  questionnaireDefaults: {
    businessGoal: string;
    targetUsers: string;
    coreProblem: string;
    mustHaveFeatures: string[];
    niceToHaveFeatures: string[];
    technicalConstraints: string;
    designConstraints: string;
    integrationRequirements: string;
    complianceRequirements: string;
    budgetRange: string;
    successMetrics: string;
  };
  samplePersonas: {
    name: string;
    roleTitle: string;
    goals: string[];
    painPoints: string[];
  }[];
  sampleUserFlow: {
    title: string;
    description: string;
    steps: { stepNumber: number; action: string; screen: string }[];
    keyScreens: string[];
    edgeCases: string[];
  };
}

export const DISCOVERY_TEMPLATES: DiscoveryTemplate[] = [
  {
    id: "tpl_web_app",
    category: "Web Application",
    title: "Modern Web Application",
    icon: "🌐",
    description: "Responsive web portal built with Next.js, TypeScript, and serverless APIs.",
    questionnaireDefaults: {
      businessGoal: "Launch a responsive web application to capture inbound client leads and automate user workflows.",
      targetUsers: "Desk workers, remote knowledge workers, and web shoppers across desktop and tablet.",
      coreProblem: "Manual spreadsheet-based tracking causes lost client inquiries and high operational cost.",
      mustHaveFeatures: ["User Registration & Email Auth", "Interactive Dashboard", "Client Form Submissions", "Role-Based Permissions"],
      niceToHaveFeatures: ["Dark Mode", "Export to PDF/CSV", "Real-Time Activity Feed"],
      technicalConstraints: "Must be built on Next.js 14 App Router with PostgreSQL database and sub-second page loads.",
      designConstraints: "Clean, modern, accessible design conforming to WCAG 2.1 AA standards.",
      integrationRequirements: "Resend for transactional email, Sentry for error tracking.",
      complianceRequirements: "GDPR privacy policy compliance, data deletion support.",
      budgetRange: "$5,000 - $12,000",
      successMetrics: "1,000 monthly active users and < 800ms median page load speed."
    },
    samplePersonas: [
      {
        name: "Operations Manager",
        roleTitle: "Internal Lead",
        goals: ["Review inbound submissions", "Assign team members"],
        painPoints: ["Scattered emails", "No audit log"]
      }
    ],
    sampleUserFlow: {
      title: "User Inbound Submission Journey",
      description: "User navigates to portal, authenticates, and submits structured inquiry.",
      steps: [
        { stepNumber: 1, action: "Visit landing page", screen: "LandingPage" },
        { stepNumber: 2, action: "Authenticate via magic link", screen: "AuthModal" },
        { stepNumber: 3, action: "Submit inquiry form", screen: "SubmissionForm" },
        { stepNumber: 4, action: "Receive confirmation receipt", screen: "SuccessConfirmation" }
      ],
      keyScreens: ["LandingPage", "AuthModal", "SubmissionForm", "SuccessConfirmation"],
      edgeCases: ["Network timeout on form submit", "Duplicate email submission"]
    }
  },
  {
    id: "tpl_mobile_app",
    category: "Mobile Application",
    title: "Cross-Platform Mobile App",
    icon: "📱",
    description: "iOS and Android mobile app built with Flutter or React Native.",
    questionnaireDefaults: {
      businessGoal: "Provide mobile-first users with push notifications, offline caching, and instant access.",
      targetUsers: "On-the-go consumers and field workers with smartphones.",
      coreProblem: "Websites are slow on mobile devices and lack native push notifications.",
      mustHaveFeatures: ["Phone OTP Login", "Biometric Authentication (FaceID)", "Offline Data Sync", "Push Notifications"],
      niceToHaveFeatures: ["In-App Camera Document Scanner", "Apple Pay / Google Pay"],
      technicalConstraints: "Must support iOS 15+ and Android 10+ with 60 FPS UI rendering.",
      designConstraints: "Native touch gestures, minimum 48px tap targets, haptic feedback.",
      integrationRequirements: "Firebase Cloud Messaging (FCM) and Apple APNs.",
      complianceRequirements: "Apple App Store & Google Play developer review guidelines.",
      budgetRange: "$8,000 - $18,000",
      successMetrics: "App Store rating > 4.5 and Day-7 retention rate > 35%."
    },
    samplePersonas: [
      {
        name: "Mobile Commuter",
        roleTitle: "Consumer End-User",
        goals: ["Access services with one thumb", "Instant offline access"],
        painPoints: ["Weak cellular connectivity", "Complex passwords"]
      }
    ],
    sampleUserFlow: {
      title: "Biometric Login & Fast Task Action",
      description: "User opens app, authenticates with FaceID, and completes core action.",
      steps: [
        { stepNumber: 1, action: "Tap app icon", screen: "SplashScreen" },
        { stepNumber: 2, action: "FaceID prompt", screen: "BiometricAuth" },
        { stepNumber: 3, action: "View feed", screen: "HomeFeed" },
        { stepNumber: 4, action: "Execute 1-tap action", screen: "ActionModal" }
      ],
      keyScreens: ["SplashScreen", "BiometricAuth", "HomeFeed", "ActionModal"],
      edgeCases: ["FaceID failure falls back to PIN", "No internet connection activates offline cache"]
    }
  },
  {
    id: "tpl_ecommerce",
    category: "E-commerce",
    title: "E-Commerce & Digital Storefront",
    icon: "🛍️",
    description: "High-converting online store with product catalog, cart, and checkout.",
    questionnaireDefaults: {
      businessGoal: "Scale direct-to-consumer (DTC) sales with sub-second checkout and inventory tracking.",
      targetUsers: "Online shoppers purchasing retail goods via mobile and desktop.",
      coreProblem: "High cart abandonment due to complex checkout and slow page loads.",
      mustHaveFeatures: ["Product Catalog with Search & Facets", "Shopping Cart & Bag", "Stripe Checkout & Regional Rails", "Order Tracking"],
      niceToHaveFeatures: ["Customer Product Reviews", "Discount Coupons & Promo Codes", "Abandoned Cart Email Follow-up"],
      technicalConstraints: "Server-side rendering for SEO and PCI-DSS Level 1 compliant payments.",
      designConstraints: "High-converting product image carousels and 1-click buy buttons.",
      integrationRequirements: "Stripe, local mobile wallets (JazzCash/Easypaisa), shipping webhook API.",
      complianceRequirements: "PCI-DSS compliance, refund policy disclosure.",
      budgetRange: "$6,000 - $15,000",
      successMetrics: "Checkout conversion rate > 3.2% and median cart abandonment < 60%."
    },
    samplePersonas: [
      {
        name: "Repeat Buyer",
        roleTitle: "Consumer",
        goals: ["Find products quickly", "Secure payment in local currency"],
        painPoints: ["Hidden shipping fees", "Slow loading checkout"]
      }
    ],
    sampleUserFlow: {
      title: "Product Search to Order Receipt",
      description: "Shopper searches for item, adds to cart, and completes checkout.",
      steps: [
        { stepNumber: 1, action: "Search catalog", screen: "CatalogSearch" },
        { stepNumber: 2, action: "Select variant and add to cart", screen: "ProductDetail" },
        { stepNumber: 3, action: "Enter shipping and payment", screen: "Checkout" },
        { stepNumber: 4, action: "View order receipt", screen: "OrderConfirmation" }
      ],
      keyScreens: ["CatalogSearch", "ProductDetail", "Checkout", "OrderConfirmation"],
      edgeCases: ["Item out of stock during checkout", "Credit card declined"]
    }
  },
  {
    id: "tpl_saas",
    category: "SaaS",
    title: "B2B Multi-Tenant SaaS Platform",
    icon: "☁️",
    description: "Subscription SaaS with organization tenancy, seat billing, and RBAC.",
    questionnaireDefaults: {
      businessGoal: "Build a scalable recurring-revenue SaaS product with automated self-serve billing.",
      targetUsers: "Small business owners, team managers, and enterprise department heads.",
      coreProblem: "Manual desktop software lacks real-time collaboration and cloud backups.",
      mustHaveFeatures: ["Tenant Isolation via orgId", "Team Member Invitations & RBAC", "Stripe Subscription Metering", "Audit Logging"],
      niceToHaveFeatures: ["Custom Subdomains / White-Labeling", "SSO (SAML / Google Workspace)"],
      technicalConstraints: "Logical row-level tenant security and automated subscription webhooks.",
      designConstraints: "Clean density-adjusted data tables, keyboard shortcuts, dark mode.",
      integrationRequirements: "Stripe Billing, PostHog telemetry, Sentry error monitoring.",
      complianceRequirements: "SOC 2 Type I readiness, GDPR data export / purge.",
      budgetRange: "$10,000 - $25,000",
      successMetrics: "$5k MRR within 6 months and monthly net revenue churn < 2%."
    },
    samplePersonas: [
      {
        name: "Agency Owner",
        roleTitle: "Workspace Admin",
        goals: ["Invite 5 team members", "Automate weekly client reporting"],
        painPoints: ["Permissions confusion", "Unpredictable seat pricing"]
      }
    ],
    sampleUserFlow: {
      title: "Workspace Creation & Team Onboarding",
      description: "Founder registers, creates workspace, and invites senior engineers.",
      steps: [
        { stepNumber: 1, action: "Register account", screen: "Register" },
        { stepNumber: 2, action: "Create workspace", screen: "Onboarding" },
        { stepNumber: 3, action: "Send team invite", screen: "TeamSettings" },
        { stepNumber: 4, action: "Teammate accepts invite", screen: "InviteAccept" }
      ],
      keyScreens: ["Register", "Onboarding", "TeamSettings", "InviteAccept"],
      edgeCases: ["Invite expired after 7 days", "User already belongs to another organization"]
    }
  },
  {
    id: "tpl_mvp",
    category: "MVP",
    title: "Rapid 0-to-1 Startup MVP",
    icon: "🚀",
    description: "Lean, validated prototype focused on core value proposition in 4-6 weeks.",
    questionnaireDefaults: {
      businessGoal: "Validate core market hypothesis with real paying pilot users before full investment.",
      targetUsers: "Early adopters with acute, unsolved pain points.",
      coreProblem: "Current alternatives require 4 different tools and cost $200/month.",
      mustHaveFeatures: ["1 Core Value Workflow", "Authentication", "Simple Payment / Pilot Gating", "Feedback Capture Widget"],
      niceToHaveFeatures: ["Automated Onboarding Tour", "Referral Sharing Link"],
      technicalConstraints: "Ship in <= 4 weeks; prioritize speed over premature optimization.",
      designConstraints: "Professional minimalist UI using Tailwind and pre-built components.",
      integrationRequirements: "Resend, Stripe / Pilot Checkout.",
      complianceRequirements: "Standard privacy policy and terms of service.",
      budgetRange: "$3,500 - $7,500",
      successMetrics: "10 active pilot users completing the core workflow weekly."
    },
    samplePersonas: [
      {
        name: "Early Adopter Founder",
        roleTitle: "Beta Tester",
        goals: ["Test workflow immediately", "Provide product feedback"],
        painPoints: ["Complicated software setup", "Bloated enterprise features"]
      }
    ],
    sampleUserFlow: {
      title: "First Core Workflow Completion",
      description: "User signs up, performs core action in < 5 mins, and provides feedback.",
      steps: [
        { stepNumber: 1, action: "Sign up via Google", screen: "Auth" },
        { stepNumber: 2, action: "Complete core action", screen: "MainWorkspace" },
        { stepNumber: 3, action: "Download result", screen: "ExportModal" },
        { stepNumber: 4, action: "Submit feedback rating", screen: "FeedbackWidget" }
      ],
      keyScreens: ["Auth", "MainWorkspace", "ExportModal", "FeedbackWidget"],
      edgeCases: ["User drops off before action", "Browser localStorage cleared"]
    }
  },
  {
    id: "tpl_redesign",
    category: "Website Redesign",
    title: "Brand & Platform Redesign",
    icon: "🎨",
    description: "Modernizing an existing web presence for speed, conversion, and mobile UX.",
    questionnaireDefaults: {
      businessGoal: "Modernize legacy brand image and increase inbound lead conversion by 50%.",
      targetUsers: "Prospective enterprise buyers and prospective employees.",
      coreProblem: "Old website is unoptimized for mobile, slow, and does not reflect current enterprise positioning.",
      mustHaveFeatures: ["Responsive Multi-Page Structure", "Case Studies & Social Proof Gallery", "Interactive Contact / Lead Form", "CMS for Blog & News"],
      niceToHaveFeatures: ["Interactive ROI Calculator", "Animated Illustrations / Micro-interactions"],
      technicalConstraints: "Static Site Generation (SSG) for 100/100 Google Lighthouse performance.",
      designConstraints: "Strict alignment with new brand guidelines, custom typography, and color palette.",
      integrationRequirements: "HubSpot / CRM webhook, Google Analytics 4, Meta Pixel.",
      complianceRequirements: "Cookie consent banner and accessibility conformance.",
      budgetRange: "$4,500 - $10,000",
      successMetrics: "Lighthouse mobile score > 95 and conversion rate increase > 40%."
    },
    samplePersonas: [
      {
        name: "Enterprise Buyer",
        roleTitle: "Prospective Client",
        goals: ["Evaluate company credibility", "Request enterprise consultation"],
        painPoints: ["Outdated case studies", "Cluttered navigation"]
      }
    ],
    sampleUserFlow: {
      title: "Case Study Review to Lead Form",
      description: "Visitor reviews social proof, examines case study, and books a call.",
      steps: [
        { stepNumber: 1, action: "Browse home page", screen: "HomePage" },
        { stepNumber: 2, action: "Read case study", screen: "CaseStudyDetail" },
        { stepNumber: 3, action: "Open consultation form", screen: "ContactModal" },
        { stepNumber: 4, action: "Schedule meeting", screen: "CalendlyEmbed" }
      ],
      keyScreens: ["HomePage", "CaseStudyDetail", "ContactModal", "CalendlyEmbed"],
      edgeCases: ["CRM webhook failure logs to database fallback", "Calendly scheduling timezone mismatch"]
    }
  },
  {
    id: "tpl_internal_tool",
    category: "Internal Tool",
    title: "Internal Operations & Admin Portal",
    icon: "⚙️",
    description: "Custom admin dashboard for team operations, order fulfillment, or customer support.",
    questionnaireDefaults: {
      businessGoal: "Eliminate manual database updates and provide support staff with safe operational tools.",
      targetUsers: "Customer support agents, warehouse dispatchers, and finance staff.",
      coreProblem: "Engineers waste 10 hours weekly running direct SQL updates for customer support.",
      mustHaveFeatures: ["Searchable Customer & Order Tables", "Bulk Action Capabilities", "Audit Log of All Admin Mutations", "Staff Permissions"],
      niceToHaveFeatures: ["CSV Import/Export", "Webhook Trigger Buttons"],
      technicalConstraints: "Strict IP allowlisting or VPN gating, encrypted connection to production replica.",
      designConstraints: "High-density data tables, fast pagination, confirmation modals on destructive actions.",
      integrationRequirements: "Internal database read/write replica, Slack webhook notifications.",
      complianceRequirements: "Staff action traceability, PII masking for non-manager staff.",
      budgetRange: "$5,000 - $14,000",
      successMetrics: "Support resolution time reduced from 2 hours to 5 minutes."
    },
    samplePersonas: [
      {
        name: "Support Specialist",
        roleTitle: "Internal Staff",
        goals: ["Look up customer order", "Trigger refund or re-shipment"],
        painPoints: ["Waiting for engineers to run scripts", "Accidental data corruption"]
      }
    ],
    sampleUserFlow: {
      title: "Customer Order Inspection & Refund",
      description: "Agent searches customer email, reviews order history, and triggers refund with note.",
      steps: [
        { stepNumber: 1, action: "Search customer by email", screen: "SearchDashboard" },
        { stepNumber: 2, action: "Open order detail", screen: "OrderDetail" },
        { stepNumber: 3, action: "Click issue refund", screen: "RefundConfirmModal" },
        { stepNumber: 4, action: "System logs audit entry", screen: "AuditLogView" }
      ],
      keyScreens: ["SearchDashboard", "OrderDetail", "RefundConfirmModal", "AuditLogView"],
      edgeCases: ["Order already refunded", "Gateway API timeout"]
    }
  },
  {
    id: "tpl_maintenance",
    category: "Maintenance and Support",
    title: "Maintenance, Support & Retainer Scope",
    icon: "🛠️",
    description: "Ongoing SLA agreement for software bug fixes, security patches, and minor enhancements.",
    questionnaireDefaults: {
      businessGoal: "Provide reliable ongoing engineering capacity, uptime monitoring, and fast incident response.",
      targetUsers: "Product owners and agency clients needing guaranteed monthly engineering hours.",
      coreProblem: "Applications degrade without security updates and break when third-party APIs update.",
      mustHaveFeatures: ["Monthly Security Dependency Audits", "Uptime & Error Monitoring (Sentry)", "Guaranteed SLA Response (24h)", "Monthly Staging Deployments"],
      niceToHaveFeatures: ["Quarterly Architecture Reviews", "Performance Tuning Audits"],
      technicalConstraints: "Maintain existing repository architecture without introducing breaking framework changes.",
      designConstraints: "Preserve established design system and component patterns.",
      integrationRequirements: "GitHub Dependabot, Sentry alerts, Slack incident channel.",
      complianceRequirements: "Maintain current compliance certifications and SSL renewals.",
      budgetRange: "$1,500 - $4,500 / month",
      successMetrics: "99.9% uptime and zero unpatched critical CVE vulnerabilities."
    },
    samplePersonas: [
      {
        name: "Client Product Lead",
        roleTitle: "Retainer Sponsor",
        goals: ["Peace of mind", "Predictable monthly bug turnaround"],
        painPoints: ["Unexpected outages", "Freelancers disappearing after launch"]
      }
    ],
    sampleUserFlow: {
      title: "Monthly Security Patch & Deploy Routine",
      description: "Engineer audits dependencies, runs test suite, and deploys verified patch.",
      steps: [
        { stepNumber: 1, action: "Receive Sentry vulnerability alert", screen: "SecurityDashboard" },
        { stepNumber: 2, action: "Update package in staging branch", screen: "GitHubPR" },
        { stepNumber: 3, action: "Run automated E2E test suite", screen: "CIReport" },
        { stepNumber: 4, action: "Deploy to production with zero downtime", screen: "ReleaseLog" }
      ],
      keyScreens: ["SecurityDashboard", "GitHubPR", "CIReport", "ReleaseLog"],
      edgeCases: ["Dependency upgrade breaks existing API", "Rollback to previous release container"]
    }
  },
  {
    id: "tpl_custom_software",
    category: "Custom Software",
    title: "Custom Enterprise Architecture",
    icon: "🏢",
    description: "Bespoke engineering architecture for complex business logic, hardware, or legacy integration.",
    questionnaireDefaults: {
      businessGoal: "Build custom digital infrastructure tailored to proprietary business models and legacy systems.",
      targetUsers: "Enterprise operations staff, partner vendors, and executive leadership.",
      coreProblem: "Off-the-shelf SaaS cannot accommodate proprietary business workflows and legacy databases.",
      mustHaveFeatures: ["Custom Business Logic Engine", "Legacy Database Synchronization", "Granular Enterprise RBAC", "Automated Compliance Reports"],
      niceToHaveFeatures: ["Machine Learning Forecasting", "Custom BI Dashboard"],
      technicalConstraints: "Must integrate with legacy SOAP/XML APIs and host on private cloud VPC.",
      designConstraints: "Enterprise efficiency, dual-monitor desktop optimization, export to Excel.",
      integrationRequirements: "Internal ERP, Active Directory / LDAP, legacy SQL Server.",
      complianceRequirements: "SOC 2 Type II, ISO 27001, complete data residency isolation.",
      budgetRange: "$25,000 - $75,000+",
      successMetrics: "Complete legacy automation saving 1,000+ staff hours per month."
    },
    samplePersonas: [
      {
        name: "Chief Technology Officer",
        roleTitle: "Executive Sponsor",
        goals: ["Modernize enterprise systems without downtime", "Strict security compliance"],
        painPoints: ["Fragile legacy codebases", "Vendor lock-in"]
      }
    ],
    sampleUserFlow: {
      title: "Legacy Data Sync & Automated Processing",
      description: "System ingests legacy batches, runs validation rules, and alerts managers on discrepancies.",
      steps: [
        { stepNumber: 1, action: "Legacy batch webhook received", screen: "SyncMonitor" },
        { stepNumber: 2, action: "Execute transformation pipeline", screen: "PipelineView" },
        { stepNumber: 3, action: "Manager reviews exceptions", screen: "ExceptionReview" },
        { stepNumber: 4, action: "Commit reconciled records", screen: "AuditConfirmation" }
      ],
      keyScreens: ["SyncMonitor", "PipelineView", "ExceptionReview", "AuditConfirmation"],
      edgeCases: ["Network dropped mid-batch", "Schema mismatch in legacy payload"]
    }
  }
];

