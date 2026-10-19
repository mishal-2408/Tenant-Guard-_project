# TenantGuard: A Secure Multi-Tenant Workspace Portal and API

TenantGuard is an enterprise-grade SaaS workspace platform engineered to demonstrate rock-solid multi-tenant data isolation, role-based access control (RBAC), and verifiable security telemetry. Multiple organizations collaborate securely within a unified application infrastructure while their data partitions remain provably isolated.

---

## Stage 1: Planning and Architecture Foundation

This repository is currently at **Stage 1 (Architecture & Planning)**. All foundational architecture designs, database models, security controls, API blueprints, and implementation roadmaps have been thoroughly planned and documented.

### Documentation Index

Detailed architectural blueprints are available in the [`docs/`](./docs) directory:

1. [**System Architecture & Request Lifecycle**](docs/architecture.md) — Comprehensive technical architecture, component breakdown, request lifecycle, and Mermaid flow diagrams.
2. [**Project Structure & Folder Responsibilities**](docs/project-structure.md) — Monorepo design, module segregation, and directory organization for `client` and `server`.
3. [**Database Design & Data Models**](docs/database-design.md) — Schemas, relationships, indexing strategies (compound `organizationId` indexing), and validation for all entities.
4. [**Security Architecture & Threat Model**](docs/security-design.md) — Multi-tenant isolation enforcement, defense-in-depth, RBAC matrix, token strategy, rate limiting, and trade-offs.
5. [**API Design & Endpoint Specifications**](docs/api-plan.md) — RESTful endpoints, access requirements, payload schemas, and response patterns.
6. [**Development Roadmap & Implementation Stages**](docs/development-roadmap.md) — Step-by-step phased execution plan with rigorous acceptance criteria.

---

## Technology Stack

- **Frontend:** React.js (Vite), JavaScript (ESNext), HTML5, Vanilla CSS3 (Custom Design System).
- **Frontend Routing:** React Router v6+.
- **API Client:** Axios (interceptors for credentialed cookie requests and automatic session handling).
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB Atlas with Mongoose ODM.
- **Authentication:** JWT delivered through secure, `httpOnly`, `SameSite` cookies.
- **Password Security:** bcryptjs (adaptive work factor salt rounds).
- **Authorization:** Role-Based Access Control (RBAC) + Centralized Tenant Isolation Middleware.
- **Validation:** Zod schemas for all inbound requests and payloads.
- **Hardening & Security:** Helmet, CORS strict allow-listing, express-rate-limit, CSRF mitigation.
- **MFA:** Time-based One-Time Password (TOTP) using `otplib` and QR code generator (`qrcode`).
- **Testing:** Jest, Supertest, Postman collections.
- **API Documentation:** OpenAPI 3.0 with Swagger UI.
- **Version Control & CI:** Git, GitHub Actions.
- **Target Deployment:** Vercel (Frontend), Render (Backend).
