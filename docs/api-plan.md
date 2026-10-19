# TenantGuard — REST API Design & Endpoint Specifications

## 1. API Architecture & Standards

The TenantGuard API follows standard RESTful principles over HTTPS:
- **Base URL:** `/api/v1`
- **Content Type:** `application/json`
- **Authentication:** Credentials conveyed via signed, `httpOnly` session cookies (`jwt_access_token`).
- **Standardized Response Envelope:**

### Success Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested project does not exist.",
    "details": []
  }
}
```

---

## 2. API Endpoint Groups

### 2.1. Authentication & Session Management (`/api/v1/auth`)

| Method | Path | Auth | Minimum Role | Description |
| :--- | :--- | :---: | :---: | :--- |
| `POST` | `/auth/register` | Public | None | Register a new organization and root Org Admin account. |
| `POST` | `/auth/login` | Public | None | Authenticate with email/password; returns session cookie or MFA challenge. |
| `POST` | `/auth/refresh` | Public | None | Exchange valid refresh cookie for new access token cookie. |
| `POST` | `/auth/logout` | Authenticated | Any | Clear authentication cookies and invalidate active session. |
| `GET` | `/auth/me` | Authenticated | Any | Retrieve current authenticated user profile, organization, and permissions. |

#### Schema Highlights:
- `POST /auth/register`:
  ```json
  {
    "organizationName": "Acme Corp",
    "slug": "acme-corp",
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@acmecorp.com",
    "password": "SecurePassword123!"
  }
  ```

---

### 2.2. Multi-Factor Authentication (`/api/v1/auth/mfa`)

| Method | Path | Auth | Minimum Role | Description |
| :--- | :--- | :---: | :---: | :--- |
| `POST` | `/auth/mfa/setup` | Authenticated | Any | Generate TOTP secret and QR code data URL for enrollment. |
| `POST` | `/auth/mfa/verify-setup` | Authenticated | Any | Verify 6-digit TOTP code to finalize MFA activation. |
| `POST` | `/auth/mfa/verify-login` | Public (MFA Token) | None | Complete 2nd factor verification during login flow. |
| `POST` | `/auth/mfa/disable` | Authenticated | Any | Disable MFA (requires current password and valid TOTP code). |

---

### 2.3. Organization Management (`/api/v1/organizations`)

| Method | Path | Auth | Minimum Role | Description |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/organizations/current` | Authenticated | Any | Retrieve current organization metadata and settings. |
| `PATCH`| `/organizations/current` | Authenticated | `org_admin` | Update organization name, settings, and MFA enforcement policies. |
| `GET` | `/organizations/current/stats`| Authenticated | `org_admin` | Aggregated statistics (total members, active projects, tasks). |

---

### 2.4. Team Management (`/api/team`) & Invitations (`/api/invitations`)

#### Team Management (`/api/team`)
| Method | Path | Auth | Minimum Role | Description |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/team/members` | Authenticated | `viewer` | List members of current tenant organization (paginated, search). |
| `GET` | `/api/team/members/:id` | Authenticated | `viewer` | Retrieve member profile within organization (404 for cross-tenant). |
| `PATCH`| `/api/team/members/:id/role` | Authenticated | `org_admin` | Update member role (`org_admin`, `project_manager`, `member`, `viewer`). Increments `tokenVersion` to invalidate stale sessions. Blocks self-modification & demotion of last active admin. |
| `PATCH`| `/api/team/members/:id/status`| Authenticated | `org_admin` | Update member status (`active`, `suspended`). Increments `tokenVersion` on deactivation. Blocks self-deactivation & deactivation of last active admin. |

#### Invitations Workflow (`/api/invitations`)
| Method | Path | Auth | Minimum Role | Description |
| :--- | :--- | :---: | :---: | :--- |
| `POST` | `/api/invitations` | Authenticated | `org_admin` | Issue a single-use 24h invitation. Generates cryptographically secure token, stores only SHA-256 hash. Returns rawToken for development link. |
| `GET` | `/api/invitations` | Authenticated | `org_admin` | List invitations for current organization (pending, accepted, expired, revoked). Token hash is never exposed. |
| `PATCH`| `/api/invitations/:id/revoke` | Authenticated | `org_admin` | Revoke a pending invitation. |
| `DELETE`| `/api/invitations/:id` | Authenticated | `org_admin` | Revoke a pending invitation. |
| `GET` | `/api/invitations/verify/:token`| Public | None | Verify token validity (returns organization name, invitee email, and role). |
| `POST` | `/api/invitations/accept` | Public | None | Single-use invitation acceptance. Creates user, assigns role on server, marks invitation accepted atomically, sets session cookies. |

---

### 2.5. Projects Management (`/api/projects`)

| Method | Path | Auth | Minimum Role | Description |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/projects` | Authenticated | `viewer` | List projects belonging to the current organization (paginated, search, status filter). |
| `GET` | `/api/projects/:id` | Authenticated | `viewer` | Retrieve project details by ID (TenantGuard strictly enforces organization match; returns 404 for cross-tenant probes). |
| `POST` | `/api/projects` | Authenticated | `project_manager` | Create a new project. Validates key uniqueness per organization and ensures all assigned members belong to the organization. |
| `PATCH`| `/api/projects/:id` | Authenticated | `project_manager` | Update project name, description, status, or member assignments. |
| `PUT`  | `/api/projects/:id` | Authenticated | `project_manager` | Full update of project details. |
| `DELETE`| `/api/projects/:id` | Authenticated | `project_manager` | Delete a project and cascade-delete its tasks (strictly tenant-scoped). |

---

### 2.6. Tasks Management (`/api/tasks`)

| Method | Path | Auth | Minimum Role | Description |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/tasks` | Authenticated | `viewer` | List tasks filtered by `projectId`, `status`, `priority`, `assignedTo` (paginated). |
| `GET` | `/api/tasks/:id` | Authenticated | `viewer` | Retrieve task details by ID (enforces tenant match; returns 404 for cross-tenant probes). |
| `POST` | `/api/tasks` | Authenticated | `member` | Create a new task within a project. Validates parent project and assignee belong to current organization. Assigns sequential `taskNumber`. |
| `PATCH`| `/api/tasks/:id` | Authenticated | `member` | Update task details, status, priority, due date, or assignee. Moving to another project verifies target project belongs to tenant. |
| `PUT`  | `/api/tasks/:id` | Authenticated | `member` | Full update of task details. |
| `DELETE`| `/api/tasks/:id` | Authenticated | `project_manager` | Delete a task (restricted to `org_admin` and `project_manager`; members denied with 403). |

---

### 2.7. Security Center & Audit Logs (`/api/v1/security`)

| Method | Path | Auth | Minimum Role | Description |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/security/audit-logs` | Authenticated | `org_admin` | Query tenant audit logs with filtering (severity, date, actor). |
| `GET` | `/security/alerts` | Authenticated | `org_admin` | Fetch open security alerts for the current organization. |
| `PATCH`| `/security/alerts/:id/resolve`| Authenticated | `org_admin` | Mark a security alert as acknowledged or resolved. |
| `POST` | `/security/run-isolation-test`| Authenticated | `org_admin` | Execute a live synthetic cross-tenant probe to demonstrate isolation. |
| `GET` | `/security/summary` | Authenticated | `org_admin` | Real-time security score and isolation metrics. |

#### The Live Isolation-Test Endpoint (`POST /security/run-isolation-test`)
This unique endpoint runs a safe, controlled synthetic security test:
1. The server generates a query attempting to access resources belonging to a simulated or distinct organization ID using the caller's active session.
2. The Tenant-Aware Repository rejects the query and logs the attempt.
3. The API returns the verifiable audit proof:
   ```json
   {
     "success": true,
     "data": {
       "testName": "Cross-Tenant Query Interception Test",
       "timestamp": "2026-10-19T07:45:00.000Z",
       "attemptedTarget": "foreign_organization_id",
       "result": "BLOCKED_BY_TENANT_GUARD",
       "httpStatusSimulated": 404,
       "auditLogId": "65b40c2198e...",
       "verdict": "PASSED: Complete logical boundary isolation confirmed."
     }
   }
   ```

---

### 2.8. Platform Super Admin (`/api/v1/admin`)

*Strictly isolated from tenant workspaces; guarded by `PlatformAdmin` authentication.*

| Method | Path | Auth | Minimum Role | Description |
| :--- | :--- | :---: | :---: | :--- |
| `POST` | `/admin/login` | Public | None | Authenticate platform super administrator. |
| `GET` | `/admin/organizations` | Authenticated | `platform_super_admin` | List all registered organizations and subscription plans. |
| `PATCH`| `/admin/organizations/:id/status`| Authenticated | `platform_super_admin` | Suspend or reactivate an organization account. |
| `GET` | `/admin/metrics` | Authenticated | `platform_super_admin` | Global platform health, tenant counts, and total user metrics. |

---

## 3. Standard HTTP Status Code Conventions

| Status Code | Code Meaning | TenantGuard Scenario |
| :--- | :--- | :--- |
| `200 OK` | Request succeeded | Standard successful read or update. |
| `201 Created` | Resource created | Successful registration, project creation, or task creation. |
| `400 Bad Request` | Validation failure | Zod schema validation error, invalid ID format, malformed JSON. |
| `401 Unauthorized` | Unauthenticated | Missing or expired JWT cookie, invalid login credentials. |
| `403 Forbidden` | Insufficient role | User has valid tenant token but lacks RBAC role permissions. |
| `404 Not Found` | Not found / Anti-tamper | Resource does not exist **OR** resource belongs to another tenant. |
| `409 Conflict` | Unique conflict | Organization slug already taken, duplicate active invitation. |
| `429 Too Many Requests`| Rate limit exceeded | Exceeded route rate limit threshold or locked out. |
| `500 Server Error` | Internal error | Unhandled server exception (sanitized in response). |
