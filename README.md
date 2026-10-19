# TenantGuard: A Secure Multi-Tenant Workspace Portal and API

TenantGuard is an enterprise-grade SaaS workspace platform engineered to demonstrate rock-solid multi-tenant data boundary isolation, Role-Based Access Control (RBAC), TOTP multi-factor authentication, append-only audit telemetry, automated alert aggregation, and a live deterministic isolation verification engine.

Multiple organizations collaborate securely within a unified application infrastructure while their data partitions remain provably isolated.

---

## Key Features & Security Architecture

- **Strict Multi-Tenant Boundary Isolation:** Tenant identity is derived exclusively from verified server-side session credentials (`req.user.organizationId`). Untrusted client-supplied tenant identifiers in headers, query parameters, or request bodies are actively stripped and logged.
- **Anti-Enumeration Defense:** Inaccessible cross-tenant resource lookups consistently return generic `404 Not Found` responses, preventing foreign tenant resource discovery.
- **Role-Based Access Control (RBAC):** Five distinct roles: `Platform Super Admin` (decoupled from tenant content), `Organization Admin`, `Project Manager`, `Member`, and `Viewer`.
- **RFC 6238 TOTP Multi-Factor Authentication:** Cryptographic time-based one-time passwords with **AES-256-GCM** encryption of secrets at rest, QR code enrollment, restricted pre-auth login challenges, and organization-wide enforcement policies.
- **Append-Only Audit Logs:** Tamper-resistant, immutable audit logging with server-side tenant scoping, filtering, and streaming CSV export.
- **Aggregated Security Alerts:** Automated signal correlation grouping duplicate security incidents within a 15-minute window with automatic severity escalation.
- **Live Synthetic Tenant Isolation Dashboard:** Real-time test engine executing 10 deterministic security scenarios against designated synthetic demo organizations with zero customer data exposure.
- **Interactive OpenAPI 3.0 Documentation:** Fully interactive Swagger UI served at `/api/docs`.

---

## Technology Stack

- **Frontend:** React.js (Vite), JavaScript (ESNext), HTML5, Vanilla CSS3 (Custom Design System).
- **Frontend Routing:** React Router v6.
- **API Client:** Axios (configured with credentials and CSRF interceptors).
- **Backend:** Node.js, Express.js (ES Modules).
- **Database:** MongoDB with Mongoose ODM.
- **Authentication:** JWT delivered through secure, `httpOnly`, `SameSite: 'lax'` signed cookies.
- **Password Security:** bcryptjs (adaptive salt rounds).
- **MFA:** RFC 6238 TOTP using `otplib` and QR code generator (`qrcode`). Secret encryption via AES-256-GCM.
- **Hardening & Security:** Helmet (CSP customized for Swagger UI), CORS origin allow-list, express-rate-limit, CSRF token mitigation.
- **API Documentation:** OpenAPI 3.0.3 with Swagger UI (`swagger-ui-express`).
- **Automated Testing:** Jest & Supertest (51 passing automated tests).
- **CI/CD:** GitHub Actions CI workflow with MongoDB 7.0 service container.

---

## Quickstart Guide

### 1. Prerequisites
- **Node.js:** v20.x or higher
- **MongoDB:** MongoDB v6.0+ running locally on port 27017 (or MongoDB Atlas connection string)
- **Git**

### 2. Installation
Clone the repository and install all dependencies:
```powershell
git clone <repository-url>
cd IEEE
npm install
```

### 3. Environment Configuration
Copy `.env.example` to create your local `.env`:
```powershell
cp .env.example .env
```

Ensure the following variables are defined in `.env`:
```ini
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/tenantguard
MONGODB_URI_TEST=mongodb://127.0.0.1:27017/tenantguard_test
CLIENT_URL=http://localhost:5173

# High-entropy cryptographic secrets (minimum 32 characters)
JWT_ACCESS_SECRET=your_super_secret_access_jwt_key_at_least_32_chars!
JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key_at_least_32_chars!
COOKIE_SECRET=your_super_secret_cookie_signing_key_at_least_32_chars!

# MFA Secret Encryption Key (AES-256-GCM)
MFA_ENCRYPTION_KEY=your_secure_32_character_mfa_encryption_key_here!

# Demo Environment Seed Password
DEMO_DEFAULT_PASSWORD=DemoPassword123!
```

### 4. Seed Demo Environment
Seed the synthetic demo organizations (`CyberCorp` and `ApexShield`) with sample projects, tasks, and historical alerts:
```powershell
npm run seed:demo
```

### 5. Run the Application
Start both the backend server and frontend development client:
```powershell
# Terminal 1: Backend Server (Port 5000)
npm run dev:server

# Terminal 2: Frontend Client (Port 5173)
npm run dev:client
```
- **Web Application Portal:** Open [http://localhost:5173](http://localhost:5173)
- **Interactive Swagger UI:** Open [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- **Raw OpenAPI JSON Spec:** Open [http://localhost:5000/api/docs.json](http://localhost:5000/api/docs.json)

---

## Seeded Demo Accounts

Default Demo Password: `DemoPassword123!`

### Organization A: CyberCorp (`cybercorp-demo`)
| Role | Email | Capabilities |
| :--- | :--- | :--- |
| **Org Admin** | `alice.admin@cybercorp.demo` | Full admin, Security Center, team invitations, MFA policy |
| **Project Manager** | `bob.pm@cybercorp.demo` | Create and manage projects and tasks |
| **Member** | `charlie.dev@cybercorp.demo` | Create and complete tasks |
| **Viewer** | `diana.viewer@cybercorp.demo` | Read-only visibility into projects and tasks |

### Organization B: ApexShield (`apexshield-demo` — Isolated Tenant)
| Role | Email | Capabilities |
| :--- | :--- | :--- |
| **Org Admin** | `eve.admin@apexshield.demo` | Full admin of separate isolated tenant |
| **Project Manager** | `frank.pm@apexshield.demo` | Project manager in Org B |
| **Member** | `grace.dev@apexshield.demo` | Member in Org B |
| **Viewer** | `heidi.viewer@apexshield.demo` | Viewer in Org B |

### Decoupled Platform Super Admin
- **Email:** `superadmin@tenantguard.demo`
- **Role:** `platform_super_admin` (Strictly blocked from reading or modifying tenant workspace content)

---

## Automated Testing & Verification

Run the complete 51-test security suite with Jest and Supertest:
```powershell
npm test --workspace=server
```

To run individual stage test suites:
```powershell
# Stage 3: Auth, RBAC & TenantGuard Middleware (13 tests)
npm test --workspace=server -- tests/stage3.test.js

# Stage 5: Projects, Tasks, Team & Invitations (20 tests)
npm test --workspace=server -- tests/stage5.test.js

# Stage 6: Security Center, TOTP MFA, Alerts & Isolation Suite (11 tests)
npm test --workspace=server -- tests/stage6.test.js

# Stage 7: Release Hardening & Swagger Verification (7 tests)
npm test --workspace=server -- tests/stage7.test.js
```

### Production Build Verification
To compile the React/Vite frontend for production:
```powershell
npm run build --workspace=client
```

---

## Continuous Integration (GitHub Actions)

A GitHub Actions CI workflow is configured in [`.github/workflows/ci.yml`](./.github/workflows/ci.yml):
1. **Frontend Lint & Build:** Installs dependencies and verifies that `npm run build --workspace=client` compiles with zero errors.
2. **Backend Security Suite:** Launches a temporary MongoDB 7.0 container service and executes all 51 automated security tests.
3. **Demo Seed Verification:** Validates that `node server/src/scripts/seedDemo.js` executes and seeds data cleanly.

---

## Project Documentation Index

Detailed architectural and security specifications are located in the [`docs/`](./docs) directory:
- [**Stage 7 Verification Report**](docs/stage-7-verification-report.md) — Comprehensive verification results, security hardening review, and pre-deployment checklist.
- [**Security Architecture & Design**](docs/security-design.md) — Multi-tenant isolation model, threat analysis, RBAC matrix, and MFA cryptographic specifications.
- [**API Design & Endpoint Plan**](docs/api-plan.md) — RESTful endpoint schemas, status codes, and permissions.
- [**Database Design & Indexing**](docs/database-design.md) — Schemas, compound indexes, and relationship architecture.
- [**System Architecture**](docs/architecture.md) — High-level architecture and request lifecycles.
- [**Development Roadmap**](docs/development-roadmap.md) — Phased project stages and milestone roadmap.
