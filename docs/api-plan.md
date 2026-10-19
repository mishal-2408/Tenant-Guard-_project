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

### 2.4. User & Team Management (`/api/v1/users` & `/api/v1/invitations`)

| Method | Path | Auth | Minimum Role | Description |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/users` | Authenticated | Any | List active members of the current tenant organization. |
| `GET` | `/users/:id` | Authenticated | Any | Retrieve user profile within the organization. |
| `PATCH`| `/users/:id/role` | Authenticated | `org_admin` | Update user role (`org_admin`, `project_manager`, `member`, `viewer`). |
| `DELETE`| `/users/:id` | Authenticated | `org_admin` | Deactivate/remove a user from the organization. |
| `GET` | `/invitations` | Authenticated | `org_admin` | List pending invitations for the organization. |
| `POST` | `/invitations` | Authenticated | `org_admin` | Issue a new organization invitation to an email with assigned role. |
| `DELETE`| `/invitations/:id` | Authenticated | `org_admin` | Revoke a pending invitation. |
| `GET` | `/invitations/verify/:token`| Public | None | Verify invitation token validity before signup. |
| `POST` | `/invitations/accept` | Public | None | Complete signup using an invitation token. |

---

### 2.5. Projects (`/api/v1/projects`)

| Method | Path | Auth | Minimum Role | Description |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/projects` | Authenticated | `viewer` | List projects belonging to the current organization (paginated). |
| `POST` | `/projects` | Authenticated | `project_manager` | Create a new project within the organization. |
| `GET` | `/projects/:id` | Authenticated | `viewer` | Retrieve project details by ID (enforces tenant match). |
| `PATCH`| `/projects/:id` | Authenticated | `project_manager` | Update project metadata or status (enforces tenant match). |
| `DELETE`| `/projects/:id` | Authenticated | `org_admin` | Archive or delete a project (enforces tenant match). |

---

### 2.6. Tasks (`/api/v1/tasks`)

| Method | Path | Auth | Minimum Role | Description |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/tasks` | Authenticated | `viewer` | List tasks filtered by `projectId`, `status`, `assignedTo`. |
| `POST` | `/tasks` | Authenticated | `member` | Create a new task within a project. |
| `GET` | `/tasks/:id` | Authenticated | `viewer` | Retrieve task details by ID (enforces tenant match). |
| `PATCH`| `/tasks/:id` | Authenticated | `member` | Update task status, priority, or assignee. |
| `DELETE`| `/tasks/:id` | Authenticated | `project_manager` | Remove a task. |

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
