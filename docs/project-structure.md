# TenantGuard — Project Structure & Responsibilities

## 1. Monorepo Organization

TenantGuard is organized as an enterprise-grade monorepo containing two decoupled applications:
1. `client`: React single-page application built with Vite and pure CSS.
2. `server`: Node.js Express REST API utilizing Mongoose and MongoDB Atlas.

```text
tenantguard/
├── .github/
│   └── workflows/
│       └── ci.yml                   # Automated linting, test suite, and isolation checks
├── client/                          # Frontend SPA (React + Vite)
│   ├── public/                      # Static assets (favicons, SVG badges, logos)
│   ├── src/
│   │   ├── api/                     # Axios client, interceptors, and typed API services
│   │   ├── assets/                  # Images, brand icons, and visual illustrations
│   │   ├── components/              # Reusable UI primitives and domain components
│   │   │   ├── common/              # Buttons, inputs, modals, toasts, tables, loaders
│   │   │   ├── layout/              # Header, sidebar, shell layout, tenant switcher
│   │   │   └── security/            # MFA QR modal, audit log viewer, isolation test card
│   │   ├── context/                 # React Context providers (AuthContext, TenantContext)
│   │   ├── hooks/                   # Custom hooks (useAuth, useTenant, useApi, useAuditLogs)
│   │   ├── pages/                   # Route-level views (Dashboard, Projects, Tasks, Security)
│   │   │   ├── auth/                # Login, Register, MFA Verify, Password Reset
│   │   │   ├── dashboard/           # Workspace KPI overview and activity feed
│   │   │   ├── projects/            # Project listing, project detail, create project
│   │   │   ├── tasks/               # Kanban board, list view, task creation modal
│   │   │   ├── team/                # Member listing, invitations, role management
│   │   │   ├── security/            # Security Center: Audit log explorer, isolation tester
│   │   │   └── settings/            # Organization settings, profile, MFA management
│   │   ├── routes/                  # React Router configuration with Route Guards
│   │   ├── styles/                  # Custom design system (variables, typography, layouts)
│   │   ├── utils/                   # Client-side formatters, date helpers, sanitizers
│   │   ├── App.jsx                  # Root application router and context providers
│   │   ├── main.jsx                 # Vite application mount point
│   │   └── index.html               # SPA HTML5 entry point
│   ├── .env.example                 # Frontend environment reference
│   ├── package.json                 # Client dependencies and build scripts
│   └── vite.config.js               # Vite configuration and proxy settings
├── server/                          # Backend REST API (Node.js + Express)
│   ├── src/
│   │   ├── config/                  # Environment, database connection, constants
│   │   ├── controllers/             # HTTP request handling and response mapping
│   │   │   ├── auth.controller.js
│   │   │   ├── mfa.controller.js
│   │   │   ├── organization.controller.js
│   │   │   ├── project.controller.js
│   │   │   ├── task.controller.js
│   │   │   ├── user.controller.js
│   │   │   ├── invitation.controller.js
│   │   │   ├── audit.controller.js
│   │   │   ├── security.controller.js
│   │   │   └── platform-admin.controller.js
│   │   ├── middleware/              # Express middlewares (Security, Auth, Validation)
│   │   │   ├── auth.middleware.js   # JWT verification and user session attach
│   │   │   ├── rbac.middleware.js   # Role-based access control guards
│   │   │   ├── tenant.middleware.js # Tenant context extraction and tamper defense
│   │   │   ├── validate.middleware.js # Zod schema validation interceptor
│   │   │   ├── rate-limit.middleware.js # Granular route rate limiting
│   │   │   └── error.middleware.js  # Global exception catcher and sanitizer
│   │   ├── models/                  # Mongoose schemas, hooks, and compound indexes
│   │   │   ├── organization.model.js
│   │   │   ├── user.model.js
│   │   │   ├── project.model.js
│   │   │   ├── task.model.js
│   │   │   ├── invitation.model.js
│   │   │   ├── audit-log.model.js
│   │   │   ├── security-alert.model.js
│   │   │   └── platform-admin.model.js # Stored separately from regular users
│   │   ├── repositories/            # Tenant-aware data access layer (DAL)
│   │   │   ├── base-tenant.repository.js # Base class injecting { organizationId }
│   │   │   ├── organization.repository.js
│   │   │   ├── project.repository.js
│   │   │   ├── task.repository.js
│   │   │   ├── user.repository.js
│   │   │   ├── invitation.repository.js
│   │   │   └── audit-log.repository.js
│   │   ├── routes/                  # Express route definitions
│   │   │   ├── index.js             # Consolidated API router (/api/v1)
│   │   │   ├── auth.routes.js
│   │   │   ├── organization.routes.js
│   │   │   ├── project.routes.js
│   │   │   ├── task.routes.js
│   │   │   ├── user.routes.js
│   │   │   ├── invitation.routes.js
│   │   │   ├── security.routes.js
│   │   │   └── platform-admin.routes.js
│   │   ├── services/                # Pure business logic and domain orchestration
│   │   │   ├── auth.service.js
│   │   │   ├── mfa.service.js
│   │   │   ├── organization.service.js
│   │   │   ├── project.service.js
│   │   │   ├── task.service.js
│   │   │   ├── invitation.service.js
│   │   │   ├── audit.service.js
│   │   │   ├── security-alert.service.js
│   │   │   └── isolation-test.service.js # Dynamic live isolation test executor
│   │   ├── validators/              # Zod validation schemas
│   │   │   ├── auth.validator.js
│   │   │   ├── project.validator.js
│   │   │   ├── task.validator.js
│   │   │   ├── user.validator.js
│   │   │   └── invitation.validator.js
│   │   ├── utils/                   # Crypto helpers, token issuers, logger
│   │   │   ├── jwt.util.js
│   │   │   ├── password.util.js
│   │   │   ├── logger.util.js
│   │   │   └── api-response.util.js
│   │   └── app.js                   # Express application setup and middleware wiring
│   ├── tests/                       # Automated testing suites
│   │   ├── unit/                    # Unit tests for services and validators
│   │   ├── integration/             # Integration tests with MongoDB in-memory
│   │   └── security/                # Dedicated negative cross-tenant isolation tests
│   │       ├── cross-tenant-read.test.js
│   │       ├── cross-tenant-write.test.js
│   │       └── tenant-id-tamper.test.js
│   ├── .env.example                 # Backend environment variable template
│   ├── package.json                 # Backend dependencies and test scripts
│   └── server.js                    # Process entry point and database initialization
├── docs/                            # Architectural planning & system documentation
│   ├── architecture.md
│   ├── project-structure.md
│   ├── database-design.md
│   ├── security-design.md
│   ├── api-plan.md
│   └── development-roadmap.md
├── .gitignore                       # Universal gitignore for Node, React, and secrets
├── package.json                     # Monorepo workspaces and orchestration scripts
└── README.md                        # Project overview and documentation portal
```

---

## 2. Directory Responsibilities

### 2.1. Frontend (`client/src/`)

| Directory | Responsibility |
| :--- | :--- |
| `api/` | Configured Axios instance with cookie credentials and domain API service functions (`authApi.js`, `projectsApi.js`, `securityApi.js`). |
| `components/common/` | Unstyled/Atomic reusable UI elements: buttons, form inputs, modal dialogs, status badges, table pagination, and toast notifications. |
| `components/layout/` | Structural shells: Navigation sidebar, top header bar with user avatar and tenant switcher, breadcrumbs, and responsive wrapper. |
| `components/security/` | Dedicated security components: MFA setup modal with dynamic QR code canvas, real-time audit log stream table, and interactive cross-tenant isolation test card. |
| `context/` | React Context providers managing global application state: `AuthContext` (current user, authenticated status, logout method) and `TenantContext` (active organization metadata). |
| `hooks/` | Custom encapsulated hooks providing easy access to state and lifecycle events (`useAuth`, `useTenant`, `useIsolationTest`). |
| `pages/` | Page-level components corresponding to top-level routes, handling layout composition, data fetching, and error boundaries. |
| `routes/` | Centralized router definition using React Router v6. Houses route guards `<ProtectedRoute>` and `<RoleRoute>`. |
| `styles/` | Custom Vanilla CSS design system: CSS variable tokens (colors, spacing, elevations, typography), global reset, animations, and responsive utilities. |
| `utils/` | Formatting utilities (dates, relative time, audit event labels, payload sanitizers). |

### 2.2. Backend (`server/src/`)

| Directory | Responsibility |
| :--- | :--- |
| `config/` | Centralized configuration loading from environment variables (`dotenv`), database connection logic, and system constants. |
| `controllers/` | Transport layer handlers: Parses HTTP requests, extracts parameters, delegates to the appropriate domain service, and formats HTTP responses. |
| `middleware/` | Express pipeline interceptors: JWT validation, tenant context resolution, RBAC authorization, Zod schema validation, IP rate limiting, and global error handling. |
| `models/` | Mongoose schemas and model definitions. Houses schema validation rules, compound index definitions, and field projections. |
| `repositories/` | Tenant-aware data access layer. Extends `BaseTenantRepository` to ensure all queries are permanently scoped with `{ organizationId }`. |
| `routes/` | Declarative route definitions mapping HTTP verbs and paths to middleware chains and controller methods. |
| `services/` | Pure business domain logic: Encapsulates business rules, handles entity life-cycles, triggers audit events, and interfaces with repositories. |
| `validators/` | Declarative input validation schemas using Zod. Validates request body, query params, and URL route parameters before reaching controllers. |
| `utils/` | Cryptographic utilities (JWT sign/verify, bcrypt hashing, TOTP verification), structured logging, and standardized response envelope helpers. |
| `tests/` | Automated test suites: Unit tests for pure logic, integration tests for API endpoints, and a dedicated security test suite verifying multi-tenant isolation. |

---

## 3. Modularity and Architectural Principles

1. **Separation of Concerns:** 
   - Controllers handle HTTP semantics (status codes, headers).
   - Services handle business rules (permissions, orchestration, audit logging).
   - Repositories handle database querying and tenant scoping.
   - Models define data structures and persistence constraints.
2. **Deterministic Multi-Tenancy:**
   - Features never query the database directly via raw Mongoose models inside controllers or services. All data interactions must leverage the tenant-aware repository pattern.
3. **Defense-in-Depth Middleware Chaining:**
   - Every protected route is protected by a sequential, fail-closed middleware chain:
     `authenticate -> resolveTenant -> requireRole(...) -> validate(schema) -> controllerHandler`.
4. **Environment Isolation:**
   - Development, test, and production environments use separate configuration profiles. Testing runs against an in-memory MongoDB instance or dedicated test database to prevent polluting production data.
