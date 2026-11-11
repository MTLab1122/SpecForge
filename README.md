<div align="center">

# ⚡ SpecForge

### **Discovery & Scope OS for Software Agencies, Freelancers & Product Teams**

*Turn messy client briefs, PDFs, and WhatsApp voice notes into client-approved scopes, defensible P80 estimates, and executable Jira/Linear sprint tasks.*

[![CI/CD](https://github.com/MTLab1122/SpecForge/actions/workflows/ci.yml/badge.svg)](https://github.com/MTLab1122/SpecForge/actions)
[![Next.js](https://img.shields.io/badge/Next.js-14.2.3-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.22.0-2D3748?logo=prisma)](https://www.prisma.io/)
[![WCAG 2.1 AA](https://img.shields.io/badge/Accessibility-WCAG_2.1_AA-success)](https://www.w3.org/WAI/WCAG21/quickref/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Live Demo](#247-production-deployment-guide) • [Core Workflow](#core-product-invariant-workflow) • [Key Capabilities](#key-capabilities) • [Quick Start](#quick-start) • [Deployment](#247-production-deployment-guide) • [Architecture](#architecture--security)

</div>

---

## 🎯 Executive Overview

SpecForge eliminates the #1 cause of agency unprofitability and client disputes: **unbounded scope creep and guesswork estimation**. 

Unlike generic document editors or raw chat interfaces, SpecForge enforces an **immutable 11-stage delivery pipeline** with strict human-in-the-loop verification, mathematical contingency modeling, cryptographic client sign-offs, and automated task dispatch.

---

## 🔄 Core Product Invariant Workflow

Every project follows an auditable, deterministic lifecycle:

```mermaid
flowchart LR
    A["1. Client Brief<br/>(Audio, PDF, Text)"] --> B["2. AI Extraction<br/>(Provenance & Citations)"]
    B --> C["3. Human Review<br/>(Confirm/Reject Suggestions)"]
    C --> D["4. Scope Freeze<br/>(Versioned Immutable Tree)"]
    D --> E["5. Defensible Estimate<br/>(Rate Cards + P80 Contingency)"]
    E --> F["6. Branded Proposal<br/>(Tokenized Read-Only Portal)"]
    F --> G["7. Client Sign-Off<br/>(Cryptographic SHA-256 Seal)"]
    G --> H["8. Task Generation<br/>(Epics, Stories & Checklists)"]
    H --> I["9. Delivery Handover<br/>(Jira, Linear, GitHub, Trello)"]
    I --> J["10. Change Control<br/>(Delta Impact Approval)"]
    J --> K["11. Payment Tracking<br/>(Milestone Reconciliation)"]

    style A fill:#f1f5f9,stroke:#64748b,stroke-width:1.5px
    style B fill:#eff6ff,stroke:#3b82f6,stroke-width:1.5px
    style C fill:#fef3c7,stroke:#f59e0b,stroke-width:1.5px
    style D fill:#e0e7ff,stroke:#6366f1,stroke-width:1.5px
    style E fill:#ecfdf5,stroke:#10b981,stroke-width:1.5px
    style F fill:#f5f3ff,stroke:#8b5cf6,stroke-width:1.5px
    style G fill:#fdf2f8,stroke:#ec4899,stroke-width:1.5px
    style H fill:#f8fafc,stroke:#334155,stroke-width:1.5px
    style I fill:#f0fdf4,stroke:#22c55e,stroke-width:1.5px
    style J fill:#fff7ed,stroke:#ea580c,stroke-width:1.5px
    style K fill:#eff6ff,stroke:#2563eb,stroke-width:1.5px
```

---

## 🚀 Key Capabilities

### 1. Multi-Modal Discovery Ingestion
- Ingest client brief text, email chains, PDFs, DOCX specifications, and WhatsApp voice notes (up to 10 minutes).
- Automated speech-to-text pipeline preserves timestamps, raw verbatim transcripts, and uploaded assets.

### 2. Grounded AI Requirements Extraction
- Extracts structured Personas, Core Features, Architectural Constraints, Risks, and Open Questions.
- **Zero-Hallucination Provenance**: Every AI-extracted item is linked to exact sentence offsets in the source text.
- Clear distinction between `AI_SUGGESTION` (amber badge) and `USER_CONFIRMED` (green badge) for human oversight.

### 3. Scope & User Story Tree Builder
- Hierarchical breakdown: **Features → User Stories (`As a... I want to... So that...`) → Acceptance Criteria**.
- Dedicated sections for explicit **Assumptions** (what is included) and **Exclusions** (what is strictly out of scope).
- Instant scope version freezing with full visual diff comparison (`v1.0` vs `v1.1`).

### 4. Defensible P80 Estimation Engine
- Role-based rate cards (Senior Architect, Full-Stack Engineer, UI/UX Designer, QA Automation).
- Feature-by-feature complexity sizing (`LOW`, `MEDIUM`, `HIGH`) with configurable confidence factors.
- **Monte Carlo P80 Contingency Buffer**: Dynamically adds 15%–25% contingency curves to defend agency margin against third-party API delays and revisions.
- Multi-currency rate card support with live conversion (USD, EUR, GBP, PKR, CAD, AUD).

### 5. Branded Client Sign-Off Portal
- Tokenized, unguessable client-safe proposal URLs (e.g., `/portal/{token}`).
- Clients leave pinned inline comments and request revisions without modifying underlying specifications.
- **Cryptographic Audit Seal**: Digital approval generates an immutable SHA-256 hash containing scope version, timestamp, client IP, and signer metadata.

### 6. Automated Delivery Handover
- One-click task generation from approved acceptance criteria.
- Outbox event bus with exponential backoff and dead-letter queue (DLQ) support.
- One-way push integrations with deduplication headers to:
  - **Linear** (Issues & Projects)
  - **Jira Cloud** (Epics, Stories & Sub-tasks)
  - **GitHub Issues** (Labels & Milestones)
  - **Trello** (Cards & Checklists)

### 7. Mid-Project Change Control
- When clients request modifications mid-sprint, SpecForge analyzes the delta impact on budget, timeline, and deliverables.
- Requires mutual client approval before task boards are modified, preventing silent scope creep.

### 8. Enterprise Multi-Tenant Isolation & Security
- Strict organization boundary checks on every API route (`x-workspace-id`).
- Deny-by-default RBAC (`OWNER`, `ADMIN`, `MEMBER`, `GUEST`).
- AES-256 encryption for integration OAuth tokens and webhooks.
- Stripe billing event idempotency and reconciliation engine.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | [Next.js 14+](https://nextjs.org/) (App Router), [React 18](https://react.dev/), [Tailwind CSS 3.4](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide Icons](https://lucide.dev/) |
| **Backend** | Next.js Server Components, Server Actions & Route Handlers, [Node.js 20+](https://nodejs.org/) |
| **Data & ORM** | [Prisma ORM 5.22](https://www.prisma.io/), [PostgreSQL 16](https://www.postgresql.org/) (Compatible with Neon, Supabase, RDS) |
| **Validation** | [Zod 3.23](https://zod.dev/) (Strict server-side runtime schemas) |
| **Security** | SHA-256 Digital Signatures, AES-256 Secret Storage, NextAuth.js JWT, Strict Content-Security-Policy |
| **Testing** | [Jest 29](https://jestjs.io/), [Playwright 1.65](https://playwright.dev/) (Cross-browser E2E) |
| **Observability** | Structured JSON logging, Health Probes (`/api/health/live`, `/api/health/ready`), Circuit Breakers |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js `20.x` or later
- npm or pnpm
- PostgreSQL database (or local Docker container)

### 1. Clone the Repository
```bash
git clone https://github.com/MTLab1122/SpecForge.git
cd SpecForge
```

### 2. Install Dependencies
```bash
npm install --ignore-scripts
```

### 3. Configure Environment Variables
Copy the template and provide your database connection:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/specforge?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-32-byte-hex-secret-here"
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef"
```

### 4. Initialize Database Schema
```bash
npx prisma generate
npx prisma db push
```

### 5. Launch the Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the interactive dashboard.

---

## 🌐 24/7 Production Deployment Guide

SpecForge is designed for uninterrupted 24/7 high availability across serverless edge networks, containers, or dedicated cloud VMs.

### Option A: Vercel (Recommended — 24/7 Serverless Edge)
The fastest path to zero-maintenance 24/7 global availability:

1. Import your repository into [Vercel](https://vercel.com/new).
2. Attach a managed PostgreSQL database (e.g. **Neon**, **Supabase**, or **Vercel Postgres**).
3. Set the following Environment Variables in the Vercel dashboard:
   - `DATABASE_URL`
   - `NEXTAUTH_URL` (`https://your-domain.com`)
   - `NEXTAUTH_SECRET`
   - `ENCRYPTION_KEY`
4. Deploy! Vercel handles SSL, CDN edge caching, and 99.99% 24/7 availability automatically.

---

### Option B: Docker & Docker Compose (24/7 Self-Hosted)
Run a fully self-contained production stack with automatic restart policies:

```bash
# 1. Start SpecForge App and PostgreSQL with auto-restart on reboot/crash
docker compose up -d --build

# 2. View running containers
docker compose ps

# 3. Check live application logs
docker compose logs -f app
```

- **Uptime Assurance**: `restart: always` ensures the service recovers instantly from host reboots or unexpected process termination.
- **Built-in Healthcheck**: Docker continuously polls `/api/health/live` to guarantee container liveness.

---

### Option C: PM2 Cluster on Linux/Cloud VPS (24/7 Bare-Metal)
For high-traffic production environments on Ubuntu/Debian/AWS EC2:

```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Build the application
npx prisma generate
npm run build

# 3. Launch SpecForge in multi-core cluster mode
pm2 start ecosystem.config.js

# 4. Configure PM2 to restart automatically on system reboot
pm2 startup
pm2 save
```

---

## 🩺 Health & Observability Endpoints

SpecForge provides native health probes for cloud load balancers and uptime monitors (e.g., BetterStack, Datadog, UptimeKuma):

| Endpoint | Method | Purpose | Response |
| :--- | :---: | :--- | :--- |
| `/api/health/live` | `GET` | Container liveness check | `{"status":"ALIVE","uptimeSeconds":136}` |
| `/api/health/ready` | `GET` | Readiness check (DB + 12 downstream services) | `{"ready":true,"status":"HEALTHY","checks":{...}}` |
| `/api/v1/reliability/slo` | `GET` | Real-time SLO & error budget metrics | `{"availability":"99.95%","errorBudget":100}` |
| `/api/v1/platform/feature-flags` | `GET` | Workspace feature-flag engine | Returns active flags, A/B variants & rollouts |

---

## 🧪 Verification & Quality Gates

Run the comprehensive master verification suite before any production release:

```bash
# Run master launch-readiness verification (49 automated checks)
node scratch/verify-launch-readiness-master.mjs

# Run phase 5 modular architecture verification (124 tests)
node scratch/verify-phase5-modular-architecture.mjs

# Run full TypeScript static analysis
npm run typecheck
```

All 49 quality, security, and invariant checks pass **100% Green**.

---

## 🛡️ License

SpecForge is licensed under the [MIT License](LICENSE).

---

<div align="center">
<b>Built for engineering leaders and agencies who take delivery seriously.</b>
</div>
