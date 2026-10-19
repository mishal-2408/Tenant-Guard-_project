# TenantGuard — System Architecture & Request Lifecycle

## 1. Executive Summary

TenantGuard is a multi-tenant Software-as-a-Service (SaaS) workspace management portal and API. The primary architectural objective is **strict, tamper-proof logical tenant isolation** combined with **verifiable security observability**. While multiple customer organizations share the underlying physical compute and database instances (shared database, shared collection multi-tenancy model), every organization's operational data—users, projects, tasks, invitations, and audit telemetry—remains hermetically segregated.

---

## 2. High-Level Architectural Overview

The platform is designed around a decoupled client-server architecture with defense-in-depth security layers:

```mermaid
flowchart TB
    subgraph ClientLayer["Frontend Client (React + Vite)"]
        UI["SPA Views (React Router v6)"]
        Axios["Axios API Client (withCredentials: true)"]
        State["Client State / Auth Context"]
        UI --> Axios
    end

    subgraph EdgeSecurity["Edge & Transport Security"]
        HTTPS["TLS Termination / HTTPS"]
        CORS["CORS Policy (Strict Origin Allow-list)"]
        Helmet["Helmet.js (CSP, HSTS, X-Frame-Options)"]
        RateLimit["Express Rate Limiter (IP & Route Tiered)"]
    end

    subgraph BackendAPI["Backend REST API (Node.js + Express)"]
        Router["Express API Router (/api/v1)"]
        CookieParser["Cookie Parser (Signed Cookies)"]
        
        subgraph AuthPipeline["Central Auth & Policy Pipeline"]
            AuthMiddleware["Authentication Middleware (JWT Verification)"]
            TenantContext["Tenant Context Resolution (from req.user)"]
            RBAC["RBAC Authorization Guard (Role Matrix)"]
            Validation["Zod Request Validation Middleware"]
        end

        subgraph CoreApp["Application & Business Logic Layer"]
            Controllers["Express Route Controllers"]
            Services["Domain Business Services"]
            SecurityService["Security & Threat Event Processing"]
        end

        subgraph DataAccess["Tenant-Aware Data Access Layer (DAL)"]
            BaseTenantRepo["TenantBaseRepository (Auto organizationId Injection)"]
            QuerySanitizer["Query Constraint Enforcement & Anti-Tamper"]
        end
    end

    subgraph DataStorage["Data & Logging Tier (MongoDB Atlas)"]
        Mongoose["Mongoose ODM Models"]
        MongoCluster[("MongoDB Atlas Database")]
        AuditStore[("Audit Logs & Security Telemetry Collection")]
    end

    subgraph CIPipeline["Continuous Integration & Quality Pipeline"]
        GHActions["GitHub Actions (Lint, Test, Security Audit)"]
        SupertestRunner["Supertest Integration & Negative Isolation Tests"]
    end

    Axios --> HTTPS --> CORS --> Helmet --> RateLimit --> CookieParser --> Router
    Router --> AuthMiddleware --> TenantContext --> RBAC --> Validation --> Controllers
    Controllers --> Services
    Services --> SecurityService
    SecurityService -.-> AuditStore
    Services --> BaseTenantRepo
    BaseTenantRepo --> QuerySanitizer --> Mongoose --> MongoCluster
    CIPipeline -.-> BackendAPI
```

---

## 3. Core Architectural Subsystems

### 3.1. Frontend Architecture (React + Vite)
- **Framework & Tooling:** React 18+ bundled with Vite for rapid development and optimized tree-shaken production bundles.
- **Client Routing:** React Router v6 implementing role-aware and authenticated route guards (`<ProtectedRoute>`, `<RoleGuard>`, `<SuperAdminRoute>`).
- **Network Layer:** Axios instance pre-configured with `withCredentials: true` to transparently transmit and receive secure `httpOnly` session cookies. Interceptors handle standard 401/403 responses and trigger session teardown without displaying blank states.
- **Styling Architecture:** Custom Vanilla CSS3 Design System using modern CSS variables, responsive flexbox/grid layouts, glassmorphism cards, and dark-mode accents. No CSS utility bloat or third-party CSS dependencies.
- **Security Posture:** Zero storage of JWT tokens in `localStorage` or `sessionStorage` to mitigate Cross-Site Scripting (XSS) credential theft.

### 3.2. Express REST API Backend
- **Framework:** Node.js runtime with Express.js structured as a layered MVC-Service-Repository architecture.
- **Stateless Application Server:** The API maintains no in-memory session state, enabling horizontal scalability across instances on platforms like Render.
- **Fail-Safe Global Error Handler:** Centralized Express error handler catches unhandled exceptions, logs detailed error traces internally, and delivers sanitized, uniform JSON error messages (`{ status: 'error', code: 'INTERNAL_ERROR', message: '...' }`) to clients, masking database internals and stack traces.

### 3.3. Central Authentication & Authorization Pipeline
- **Authentication:** Short-lived JSON Web Tokens (15-minute expiration) coupled with 7-day refresh tokens delivered exclusively through `httpOnly`, `Secure` (in production), and `SameSite=Strict/Lax` cookies.
- **Password Hashing:** Passwords hashed with `bcryptjs` using 12 salt rounds.
- **Tenant Context Extraction:** The tenant identifier (`organizationId`) is **never** extracted from query parameters, path variables, or request bodies for tenant filtering. It is derived exclusively from the cryptographically verified JWT payload (`req.user.organizationId`).
- **Role-Based Access Control (RBAC):** Middleware checks `req.user.role` against declarative role definitions (`Platform Super Admin`, `Organization Admin`, `Project Manager`, `Member`, `Viewer`).

### 3.4. Tenant-Aware Data Access Layer (DAL)
- Instead of raw Mongoose model invocations scattered across controllers, all data mutations and queries route through a specialized `TenantRepository` base pattern.
- The `TenantRepository` automatically binds `{ organizationId: context.organizationId }` to every `find`, `findOne`, `findById`, `countDocuments`, `updateOne`, and `deleteMany` call.
- Any attempt to query a resource by `id` without matching `organizationId` returns a `null` / `RESOURCE_NOT_FOUND` (HTTP 404) rather than HTTP 403, preventing attackers from confirming the existence of resources belonging to competing organizations (enumeration defense).

### 3.5. MongoDB Atlas Database & Indexing Strategy
- **Logical Multi-Tenancy:** A shared database and shared collection architecture with strict discriminant property (`organizationId`).
- **Compound Indexing:** All organization-bound collections employ compound indexes where `organizationId` is the leading prefix (e.g., `{ organizationId: 1, _id: 1 }`, `{ organizationId: 1, status: 1 }`). This guarantees index-level partition selectivity, preventing cross-tenant index scans and maximizing query performance.
- **Separate SuperAdmin Collection:** Platform Super Admins are stored in an independent collection (`platform_admins`) completely separated from organization `users`. This eliminates privilege-escalation vectors through accidental role assignment within tenant user records.

### 3.6. Audit Logging & Security Event Processing
- **Event-Driven Telemetry:** Centralized `SecurityEventService` records both successful high-impact operations (e.g., member invitations, role modifications, MFA toggles) and security-critical anomalies (e.g., failed login sprees, unauthorized resource access attempts, tenant ID spoofing attempts).
- **Immutable Log Store:** Audit logs include timestamp, actor ID, actor email, client IP, user agent, target entity type, action verb, and outcome.
- **Isolation Threat Alarms:** Cross-tenant access attempts immediately increment risk counters and trigger high-severity alerts in the Security Center.

### 3.7. Automated Testing & Continuous Integration (CI)
- **Test Matrix:** Jest and Supertest for unit, integration, and security regression testing.
- **Negative Cross-Tenant Test Suite:** Dedicated test suite creates two distinct organizations (Tenant A and Tenant B) and systematically verifies that Tenant A's token cannot read, update, or delete any resource of Tenant B.
- **GitHub Actions Workflow:** Automatically runs linting, unit tests, and Supertest cross-tenant isolation suites on every pull request and push to `main`.

---

## 4. End-to-End Request Lifecycle & Data Flow

The following sequence diagram traces an HTTP request (e.g., `GET /api/v1/projects/:id` or `POST /api/v1/tasks`) from the browser to the database and back:

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser (React)
    participant Edge as Edge / Express Middleware (Helmet, CORS, RateLimit)
    participant Auth as Auth Middleware (Cookie & JWT Verify)
    participant TenantCtx as Tenant Context Resolver
    participant RBACGuard as RBAC Authorization Guard
    participant Validator as Zod Request Validator
    participant Controller as Resource Controller
    participant Service as Business Domain Service
    participant Audit as Security Audit Service
    participant DAL as Tenant-Aware Repository
    participant DB as MongoDB Atlas

    User->>Edge: HTTPS Request + Cookie (jwt_access_token)
    Note over Edge: Checks CORS Origin, Enforces Helmet Security Headers,<br/>Validates IP Rate Limiting Quota
    Edge->>Auth: Forward sanitized request
    
    Auth->>Auth: Parse httpOnly Cookie & Verify JWT Signature
    alt JWT Invalid or Expired
        Auth-->>User: 401 Unauthorized { code: "AUTH_EXPIRED" }
    end
    
    Auth->>TenantCtx: Attach req.user = { userId, organizationId, role }
    TenantCtx->>TenantCtx: Extract organizationId from verified token (IGNORE any client orgId)
    
    TenantCtx->>RBACGuard: Evaluate Permission for Route Action
    alt User Role Insufficient
        RBACGuard->>Audit: Log Access Denied Event (Actor, Resource, Reason)
        RBACGuard-->>User: 403 Forbidden { code: "FORBIDDEN_ACTION" }
    end

    RBACGuard->>Validator: Validate Request Body/Params against Zod Schema
    alt Validation Fails
        Validator-->>User: 400 Bad Request { errors: [...] }
    end

    Validator->>Controller: Invoke Action Handler (req.validatedBody, req.user)
    Controller->>Service: Call Business Logic Method(serviceContext, params)
    
    Service->>DAL: Find or Mutate with Tenant Boundary (e.g. findById(id))
    Note over DAL: DAL forces query: { _id: id, organizationId: context.organizationId }
    
    DAL->>DB: Execute Indexed MongoDB Query
    DB-->>DAL: Return Document or null
    
    alt Resource Not Found or Cross-Tenant Mismatch
        DAL-->>Service: Return null
        Service->>Audit: Record Suspicious Cross-Tenant Access Probe
        Service-->>Controller: Throw NotFoundException
        Controller-->>User: 404 Not Found { code: "RESOURCE_NOT_FOUND" }
    else Resource Valid & Belongs to Tenant
        DAL-->>Service: Return Entity Data
        opt State Mutating Action
            Service->>Audit: Asynchronously Log Audit Event (AUDIT_SUCCESS)
        end
        Service-->>Controller: Return Result Payload
        Controller-->>User: 200 OK / 201 Created { data: result }
    end
```

---

## 5. Architectural Invariants

Every component in TenantGuard must strictly adhere to the following non-negotiable architectural invariants:

1. **Infallible Tenant Identity:** The active tenant identifier is derived strictly from the cryptographically verified JWT inside the `httpOnly` cookie. No HTTP header (e.g., `X-Tenant-ID`), query string parameter, or body attribute can override or declare the tenant context for an operational user.
2. **Implicit Query Scoping:** Developers writing application services must never write manual `{ organizationId: req.user.organizationId }` clauses on raw queries. All queries must flow through the Tenant-Aware Repository layer where scoping is applied deterministically.
3. **Anti-Enumeration Responses:** If User of Tenant A requests `/api/v1/projects/TENANT_B_PROJECT_ID`, the server returns `404 Not Found`. It must **never** return `403 Forbidden` for existing foreign entities, as doing so confirms that the ID exists in the database.
4. **Privilege Segregation:** Platform Super Admins possess access only to platform metrics, organization provisioning, and subscription/status controls. Super Admins possess **zero** database access pathways to read or modify tenant-private project or task content.
5. **No Blind Trust in Client:** All data mutations (create, update, delete) are strictly validated by Zod schemas prior to reaching any controller or service logic.
