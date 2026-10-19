# TenantGuard — Multi-Stage Development Roadmap

This roadmap establishes the phased, engineering progression for building TenantGuard from initial architecture to production deployment. Each stage defines strict scope boundaries and measurable acceptance criteria. Progression requires passing all acceptance criteria of the preceding stage.

---

## Stage Overview Matrix

| Stage | Focus Area | Primary Deliverables | Acceptance Criteria |
| :---: | :--- | :--- | :--- |
| **Stage 1** | **Architecture & Foundation** *(Current)* | System blueprints, DB designs, security model, API plans, scaffolding. | Complete design documentation reviewed and approved. |
| **Stage 2** | **Backend Scaffolding & Data Layer** | Express setup, MongoDB Atlas connection, Mongoose schemas, `BaseTenantRepository`. | DB models connected, indexes verified, repository pattern unit-tested. |
| **Stage 3** | **Auth, Session & MFA Engine** | JWT cookie auth, bcrypt hashing, account lockout, `otplib` TOTP MFA. | Registration, login, MFA enrollment, and token refresh verified. |
| **Stage 4** | **RBAC & Core Domain APIs** | Organizations, Users, Projects, Tasks, Invitations endpoints + Zod validators. | Full CRUD functioning with strict RBAC enforcement across all roles. |
| **Stage 5** | **Security Center & Isolation Engine** | Audit logging service, security alerts, live synthetic isolation test engine. | Real-time audit trails recorded and live isolation test returns verifiable proof. |
| **Stage 6** | **Frontend Application & UI** | React (Vite) SPA, custom vanilla CSS design system, dashboards, kanban, Security Center. | Responsive, dark-mode-ready UI fully integrated with backend API. |
| **Stage 7** | **Security Testing & CI Pipeline** | Negative cross-tenant Supertest suite, Postman collection, GitHub Actions CI. | 100% pass on cross-tenant isolation and security regression tests. |
| **Stage 8** | **Hardening, Docs & Deployment** | Helmet, rate limits, OpenAPI/Swagger UI, deployment to Vercel and Render. | Live staging deployment operational with zero cross-tenant leakage. |

---

## Detailed Stage Breakdowns

### Stage 1: Project Foundation and Architecture Planning (Current)
- **Scope:** Architectural design, threat modeling, schema planning, API contract definitions, monorepo foundation.
- **Deliverables:**
  - `docs/architecture.md` (System diagrams and request lifecycle)
  - `docs/project-structure.md` (Monorepo directory organization)
  - `docs/database-design.md` (Data models, schemas, and compound indexing)
  - `docs/security-design.md` (STRIDE threat model and 9 core security controls)
  - `docs/api-plan.md` (REST endpoint catalog and response envelopes)
  - `docs/development-roadmap.md` (Phased roadmap and acceptance criteria)
  - Minimal monorepo scaffolding (`.gitignore`, `.env.example`, `package.json`, `README.md`)
- **Acceptance Criteria:**
  - All 6 architecture documents created with zero placeholder sections.
  - Multi-tenant boundary rules clearly articulated.
  - Zero application dependencies installed prior to review.

---

### Stage 2: Backend Core, Database Models & Base Tenant Repository
- **Scope:** Initialize Express.js application, configure MongoDB Atlas with Mongoose, build schemas with compound indexes, implement `BaseTenantRepository`.
- **Deliverables:**
  - `server/src/config/db.js` (MongoDB connection with connection pooling and retry logic).
  - Mongoose models (`Organization`, `User`, `Project`, `Task`, `Invitation`, `AuditLog`, `SecurityAlert`, `PlatformAdmin`).
  - Index initialization script ensuring compound indexes with `organizationId` prefix.
  - `BaseTenantRepository` implementing scoped queries (`find`, `findOne`, `findById`, `updateById`, `deleteById`).
- **Acceptance Criteria:**
  - Successful connection to MongoDB instance.
  - Automated test verifying `BaseTenantRepository` automatically binds `{ organizationId }` to database queries.
  - PlatformAdmin schema completely decoupled from User schema.

---

### Stage 3: Authentication, Session Management & TOTP MFA
- **Scope:** Secure authentication engine with httpOnly cookies, password hashing, brute-force defense, and 2FA.
- **Deliverables:**
  - User registration with unique organization provisioning.
  - Login endpoint issuing short-lived access JWT (15m) and refresh token (7d) in `httpOnly` cookies.
  - Account lockout handler (freezes account for 15 minutes after 5 consecutive failures).
  - Time-based One-Time Password (TOTP) engine using `otplib` and QR code generator (`qrcode`).
  - `auth.middleware.js` extracting user session and strictly enforcing tenant context.
- **Acceptance Criteria:**
  - JWTs cannot be accessed via browser JavaScript (`httpOnly` flag verified).
  - Account lockout activates predictably after 5 wrong attempts.
  - TOTP enrollment requires valid 6-digit code verification before activating.
  - Passwords hashed with bcrypt cost factor 12.

---

### Stage 4: RBAC & Core Domain APIs
- **Scope:** CRUD APIs for Projects, Tasks, Team Members, and Invitations guarded by Zod validation and RBAC.
- **Deliverables:**
  - Declarative RBAC middleware (`requireRole(['org_admin', 'project_manager'])`).
  - Zod validators for all request payloads.
  - Projects controller & service with unique project keys per organization.
  - Tasks controller & service with Kanban status updates and user assignments.
  - Team invitations system generating secure, single-use, expiring signup tokens.
- **Acceptance Criteria:**
  - Viewer role cannot create, edit, or delete projects or tasks (returns 403).
  - Member role can create and update tasks but cannot delete projects (returns 403).
  - Zod validation rejects payloads with unexpected fields (`.strict()`).
  - All created resources automatically receive `organizationId` from session context.

---

### Stage 5: Security Center, Audit Logs & Live Isolation Test Engine
- **Scope:** Security telemetry processing, audit log exploration API, and live synthetic cross-tenant tester.
- **Deliverables:**
  - Centralized audit logging service recording all mutations and denied attempts.
  - Security alert triggers for brute-force attacks and cross-tenant probing.
  - Live Isolation Test engine (`POST /api/v1/security/run-isolation-test`) executing safe cross-tenant queries and returning cryptographic/audit proof of rejection.
- **Acceptance Criteria:**
  - Every project/task mutation produces an immutable audit log entry.
  - Cross-tenant access attempt increments risk score and creates a security alert.
  - Isolation test endpoint executes in < 200ms and returns structured diagnostic proof.

---

### Stage 6: Frontend Web Application (React + Vite)
- **Scope:** Responsive Single-Page Application (SPA) with custom vanilla CSS design system, real-time UI states, and Security Center.
- **Deliverables:**
  - Modern, high-end SaaS UI with custom CSS variables (dark mode accents, glassmorphic cards, responsive flex/grid).
  - Auth flows: Registration, Login, MFA verification modal with QR canvas.
  - Workspace views: Organization Dashboard, Project Manager, Kanban Task Board, Team Management.
  - Security Center page: Real-time audit log explorer with filters, security alert badges, and interactive "Run Isolation Test" diagnostic widget.
- **Acceptance Criteria:**
  - Zero external CSS frameworks (clean, performant Vanilla CSS3).
  - Axios interceptor transparently handles 401s and redirects to login.
  - Responsive across desktop, tablet, and mobile viewports.
  - Zero console errors or layout shifts.

---

### Stage 7: Automated Testing, Cross-Tenant Security Suites & CI
- **Scope:** Comprehensive test coverage with unit, integration, and specialized negative isolation tests.
- **Deliverables:**
  - Jest & Supertest API integration tests.
  - Negative Cross-Tenant Test Suite:
    - Tenant A attempts to read Tenant B's project (expects 404).
    - Tenant A attempts to update Tenant B's task (expects 404).
    - Tenant A attempts to delete Tenant B's member (expects 404).
    - Tenant A attempts to inject foreign `organizationId` in payload (expects no effect).
  - Postman collection with pre-configured environment variables and test scripts.
  - GitHub Actions CI workflow executing linter, unit tests, and security tests on every push.
- **Acceptance Criteria:**
  - 100% passing tests across all cross-tenant negative isolation scenarios.
  - GitHub Actions CI pipeline passes with green checkmark.

---

### Stage 8: Production Hardening, Documentation & Staging Deployment
- **Scope:** Production configuration, OpenAPI documentation, and staging deployment.
- **Deliverables:**
  - Helmet.js configuration with strict Content Security Policy (CSP).
  - IP-based rate limiting on sensitive auth and public endpoints.
  - OpenAPI 3.0 specification served via interactive Swagger UI at `/api/docs`.
  - Deployment configuration for Vercel (Frontend) and Render (Backend).
  - Production runbook and architecture verification guide.
- **Acceptance Criteria:**
  - Swagger UI displays all endpoints with try-it-out capabilities.
  - Security headers score an A rating on securityheader check.
  - Production deployments run cleanly with HTTPS and secure cookie handling.
