# SpecForge: Architectural Specification & Master Execution Blueprint

**Tagline**: *Turn messy client input into an approved scope, realistic estimate, and executable delivery plan.*

---

## 1. Product Decision Record (PDR)

### PDR-001: Architecture & Runtime Strategy
- **Decision**: Next.js 14 App Router + Route Handlers + TypeScript as a unified full-stack application, backed by Prisma ORM and PostgreSQL.
- **Context**: SpecForge is an MVP requiring fast iteration, tight TypeScript type-sharing between the API contract and frontend, server-side streaming for AI responses, and low operational overhead.
- **Alternatives Considered**: 
  - *NestJS + Next.js decoupled monorepo*: Adds unnecessary CI/CD and deployment complexity during 14-day pilot validation.
  - *FastAPI (Python) + React*: Great for AI pipelines, but duplicates schema validations (Pydantic + TypeScript Zod) and increases hosting cost.
- **Trade-offs**: Next.js App Router serverless execution has 15-60s timeout limits on Vercel Hobby/Pro.
- **Mitigation**: Audio transcription and heavy LLM extraction run asynchronously with background job polling or status webhooks; audio uploads are strictly capped at 10 minutes (<= 25MB).

### PDR-002: Multi-Tenancy & Data Isolation Model
- **Decision**: Logical Organization-level multi-tenancy enforced at the database query layer via mandatory `organizationId` foreign keys and Prisma Client extensions / middleware.
- **Context**: Target users are freelancers and agencies who handle sensitive client briefs, proprietary product ideas, and non-disclosure agreements.
- **Alternatives Considered**: Separate schema per tenant (too high operational overhead on Neon/Supabase migrations); Separate database per tenant (cost-prohibitive for PKR 3,500/mo price point).
- **Enforcement**: Every data access layer call resolves the authenticated user's active `organizationId` from the session JWT. Cross-tenant leakage is automatically prevented by parameter injection on all `findMany`, `update`, and `delete` operations.

### PDR-003: AI Pipeline & Managed Transcription
- **Decision**: Two-stage managed pipeline: (1) OpenAI Whisper / Deepgram Managed API for audio-to-text with diarization fallback; (2) Managed LLM (Gemini 1.5 Flash / GPT-4o-mini) with strict JSON Schema output enforcement and prompt grounding.
- **Context**: Unstructured inputs range from messy 500-word WhatsApp audio transcriptions to 30-page PDF briefs.
- **Alternatives Considered**: Self-hosted Whisper / vLLM on GPU instances (high fixed cost, idle waste); Pure client-side Web Speech API (low accuracy with diverse accents and background noise).
- **Mitigation & Disclaimers**: Strict 10-minute file cap for MVP audio. All extractions tag each item as `AI_SUGGESTION` until explicitly confirmed by the user (`USER_CONFIRMED`). UI displays mandatory disclaimer: *"SpecForge AI extracts and structures scope suggestions based on provided materials. AI outputs are not guaranteed to be exhaustive, technically complete, or legally binding."*

### PDR-004: Thin, Asynchronous One-Way Integrations
- **Decision**: Thin, unidirectional push model to Jira Cloud, Linear, Trello, and GitHub Issues.
- **Context**: Freelancers and agencies need to export approved scopes into development task boards without managing bidirectional sync conflict resolution.
- **Rules**: Tokens stored with AES-256-GCM encryption. Never delete external records, never overwrite existing repository code, and never claim two-way synchronization. Provide retry mechanisms and error logs.

### PDR-005: Cost Control & Credit Metering
- **Decision**: Hard credit quota per plan (e.g., 250 AI credits on Professional, 1,000 on Agency). No unrestricted AI processing loops.
- **Context**: Freelance margins are tight; an unmetered plan would allow adversarial token exhaustion.
- **Enforcement**: Credit deduction is verified prior to dispatching LLM/transcription API calls. When quota is reached, AI processing halts with an upgrade prompt, but manual editing remains fully functional.

---

## 2. Product Requirements Document (PRD)

### 2.1 Executive Summary
SpecForge bridges the chaotic gap between initial client conversations and billable, executable engineering work. Freelancers and small digital agencies lose an average of 15–25 unbilled hours per project during requirements discovery, scope negotiations, and manual task board population. SpecForge ingests unstructured text, PDFs, DOCX, meeting notes, and voice notes (up to 10 minutes), extracting structured requirements, generating versioned scope documents, calculating complexity-bracketed estimates, outputting shareable client proposals, and pushing approved deliverables directly into Linear, Jira, Trello, or GitHub Issues.

### 2.2 Target Personas
1. **Freelance Full-Stack Developer ("Farhan")**: Spends weekends manually writing proposals and converting client WhatsApp audio messages into task lists. Needs rapid scope bounds so clients don't demand free features.
2. **Agency Founder ("Sarah")**: Runs a 6-person boutique software agency. Needs standardized estimation ranges across junior and senior engineers, audit logs of what the client approved, and one-click task export to Jira/Linear.
3. **Fractional PM / Technical Consultant ("Danial")**: Leads discovery workshops for non-technical founders. Needs side-by-side traceability linking final scope items back to raw client meeting notes.

### 2.3 Prohibited Claims & Strict Non-Goals
- **No Guaranteed AI Accuracy**: SpecForge never promises 100% extraction accuracy or error-free specifications.
- **No Guaranteed Estimation Accuracy**: Estimates are calculated ranges based on user inputs and heuristics, not contractual guarantees of completion time.
- **No Automated Legal Advice**: Proposals and scope sign-offs are commercial alignment records, not attorney-drafted legal contracts.
- **No Bidirectional Issue Synchronization**: SpecForge pushes tasks outward; it does not sync real-time board mutations back into the scope.
- **No Unrestricted AI Processing**: Token usage is strictly metered per organization.

### 2.4 Functional Requirements (Modules 1–15)
- **Module 1 (Auth & Tenant)**: Email/password, email verification, session tokens, workspace creation, invitations, roles (OWNER, MANAGER, MEMBER, CLIENT), multi-tenant isolation, immutable audit log.
- **Module 2 (Clients & Projects)**: Client CRM (Name, company, email, WhatsApp, status), project stages (`DISCOVERY` -> `REQUIREMENTS_EXTRACTED` -> `SCOPE_DRAFTED` -> `ESTIMATION` -> `PROPOSAL_SENT` -> `CLIENT_APPROVED` -> `TASK_DELIVERY`).
- **Module 3 (Discovery Input)**: Ingestion of pasted text, text-based PDF, DOCX, meeting notes, and voice notes (<= 10 mins). Managed transcription API with retry on failure and audio metadata storage.
- **Module 4 (AI Requirement Extraction)**: Structured extraction of Goals, Personas, Features, Constraints, Assumptions, Dependencies, Risks, and Open Questions. Provenance tagging (`AI_SUGGESTION` vs `USER_CONFIRMED`), citation offset linking, manual reordering and CRUD.
- **Module 5 (Scope Builder)**: Hierarchy: Features -> User Stories (`As a... I want to... So that...`) -> Acceptance Criteria. Assumptions, exclusions, and dependencies. Version freezing, version diffing, and export (PDF, Markdown, CSV).
- **Module 6 (Estimation Engine)**: Feature-based estimate matrix with Complexity (`LOW`, `MEDIUM`, `HIGH`), confidence rating, hourly rate or fixed price, min/max hour bounds, manual overrides, and total pricing calculation.
- **Module 7 (Proposal Generator)**: Comprehensive document compiler (Executive summary, objectives, deliverables, milestones, payment schedule, assumptions, exclusions). Tokenized public review link with status tracking (`DRAFT`, `SENT`, `VIEWED`, `REVISED`, `APPROVED`, `REJECTED`).
- **Module 8 (Client Approval)**: Read-only, client-safe review portal. Pin comments, request revisions, one-click sign-off. Enforces read-only protection against direct client edits of project scope.
- **Module 9 (Task Generation)**: Automated breakdown of approved scope items into executable tasks with milestones, priorities, effort estimates, and assignees.
- **Module 10 (Thin Integrations)**: One-way OAuth export to Jira Cloud, Linear, Trello, and GitHub Issues. Encrypted credential storage, idempotency, and detailed sync error logs.
- **Module 11 (Templates)**: 7 industry starter templates: Web Application, Mobile App, E-Commerce, SaaS Product, MVP, Website Redesign, Maintenance & Support.
- **Module 12 (Change Control)**: Change Request builder with scope delta, cost impact, and timeline extension calculations. Client sign-off required before tasks are injected into development boards.
- **Module 13 (Notifications)**: Email updates via Resend, pre-formatted WhatsApp deep links (`wa.me`), and shareable status links. (No paid WhatsApp Business API in MVP).
- **Module 14 (Analytics & Auditing)**: Telemetry tracking project pipeline velocity, AI credit consumption, proposal approval rates, and estimation accuracy feedback.
- **Module 15 (Security & Cost Control)**: AES-256 secret encryption, tenant RLS boundaries, credit hard-caps, file sanitization, and data-retention scheduling.

---

## 3. Localization Architecture (Urdu Readiness)
- English is the primary default interface.
- Architecture incorporates an i18n key-value abstraction layer (`/public/locales/en/common.json`, `/public/locales/ur/common.json`).
- Root layout dynamically toggles `dir="ltr"` or `dir="rtl"` based on the active user locale.
- Tailwind CSS utility classes utilize logical properties (`ms-`, `me-`, `text-start`, `text-end`) ensuring seamless bidirectional rendering without stylesheet duplication.

