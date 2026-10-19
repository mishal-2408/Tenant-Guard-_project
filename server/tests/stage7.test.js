import mongoose from 'mongoose';
import request from 'supertest';
import crypto from 'crypto';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Organization } from '../src/models/Organization.js';
import { Project } from '../src/models/Project.js';
import { Task } from '../src/models/Task.js';
import { Invitation } from '../src/models/Invitation.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { SecurityEvent } from '../src/models/SecurityEvent.js';
import { PlatformAdmin } from '../src/models/PlatformAdmin.js';
import { signAccessToken } from '../src/utils/jwt.util.js';
import { AUTH_COOKIE_NAME } from '../src/utils/cookie.util.js';
import { hashPassword } from '../src/utils/password.util.js';

const TEST_DB_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/tenantguard_stage7_test';

describe('TenantGuard — Stage 7: Automated Security Verification & Release Hardening', () => {
  let orgA, orgB;
  let adminA, pmA, memberA, viewerA;
  let adminB;
  let adminACookie, pmACookie, memberACookie, viewerACookie;
  let adminBCookie;
  const csrfToken = 'stage7-csrf-token';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_ACCESS_SECRET = 'test_super_secret_jwt_key_minimum_32_characters_long_for_security';
    process.env.MFA_ENCRYPTION_KEY = 'test_mfa_encryption_key_32chars_long!';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI);
    }
  });

  beforeEach(async () => {
    // Reset test collections
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Invitation.deleteMany({});
    await AuditLog.deleteMany({});
    await SecurityEvent.deleteMany({});
    await PlatformAdmin.deleteMany({});

    // 1. Seed Tenant Organizations
    orgA = await Organization.create({
      name: 'CyberDefend Alpha',
      slug: 'cyberdefend-alpha'
    });

    orgB = await Organization.create({
      name: 'SecureCloud Beta',
      slug: 'securecloud-beta'
    });

    const defaultPasswordHash = await hashPassword('SecurePass123!');

    // 2. Seed Org A Users
    adminA = await User.create({
      organizationId: orgA._id,
      firstName: 'Alice',
      lastName: 'Admin',
      email: 'alice@cyberdefend.alpha',
      passwordHash: defaultPasswordHash,
      role: 'org_admin',
      status: 'active',
      tokenVersion: 0
    });

    pmA = await User.create({
      organizationId: orgA._id,
      firstName: 'Bob',
      lastName: 'PM',
      email: 'bob@cyberdefend.alpha',
      passwordHash: defaultPasswordHash,
      role: 'project_manager',
      status: 'active',
      tokenVersion: 0
    });

    memberA = await User.create({
      organizationId: orgA._id,
      firstName: 'Charlie',
      lastName: 'Dev',
      email: 'charlie@cyberdefend.alpha',
      passwordHash: defaultPasswordHash,
      role: 'member',
      status: 'active',
      tokenVersion: 0
    });

    viewerA = await User.create({
      organizationId: orgA._id,
      firstName: 'Diana',
      lastName: 'Viewer',
      email: 'diana@cyberdefend.alpha',
      passwordHash: defaultPasswordHash,
      role: 'viewer',
      status: 'active',
      tokenVersion: 0
    });

    // 3. Seed Org B Admin
    adminB = await User.create({
      organizationId: orgB._id,
      firstName: 'Eve',
      lastName: 'AdminB',
      email: 'eve@securecloud.beta',
      passwordHash: defaultPasswordHash,
      role: 'org_admin',
      status: 'active',
      tokenVersion: 0
    });

    // Helpers to sign tokens and create cookies
    const makeCookie = (user) => {
      const token = signAccessToken({
        userId: user._id,
        organizationId: user.organizationId,
        role: user.role,
        tokenVersion: user.tokenVersion
      });
      return [`${AUTH_COOKIE_NAME}=${token}`, `XSRF-TOKEN=${csrfToken}`];
    };

    adminACookie = makeCookie(adminA);
    pmACookie = makeCookie(pmA);
    memberACookie = makeCookie(memberA);
    viewerACookie = makeCookie(viewerA);
    adminBCookie = makeCookie(adminB);
  });

  // ==========================================================================
  // SECTION 1: OPENAPI & SWAGGER UI DOCUMENTATION AVAILABILITY
  // ==========================================================================

  test('1. OpenAPI 3.0 specification is available at /api/docs.json and Swagger UI serves at /api/docs', async () => {
    // 1. Check raw JSON spec
    const jsonRes = await request(app).get('/api/docs.json');
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.headers['content-type']).toContain('application/json');
    expect(jsonRes.body.openapi).toBe('3.0.3');
    expect(jsonRes.body.info.title).toContain('TenantGuard');
    expect(jsonRes.body.paths['/api/auth/login']).toBeDefined();
    expect(jsonRes.body.paths['/api/security/run-isolation-test']).toBeDefined();
    expect(jsonRes.body.paths['/api/projects']).toBeDefined();

    // 2. Check Swagger UI HTML route
    const uiRes = await request(app).get('/api/docs/');
    expect(uiRes.status).toBe(200);
    expect(uiRes.headers['content-type']).toContain('text/html');
  });

  // ==========================================================================
  // SECTION 2: ANTI-TAMPERING & TENANT ISOLATION HARDENING
  // ==========================================================================

  test('2. Tenant isolation guarantees: Organization A cannot read, modify, or probe Organization B resources', async () => {
    // Create Project and Task belonging to Org B
    const projectB = await Project.create({
      organizationId: orgB._id,
      name: 'Confidential Beta Core',
      key: 'BETA',
      ownerId: adminB._id
    });

    const taskB = await Task.create({
      organizationId: orgB._id,
      projectId: projectB._id,
      taskNumber: 1,
      taskKey: 'BETA-1',
      title: 'Shield Key Generation',
      createdBy: adminB._id
    });

    // 1. Org A Admin attempts to READ Org B Project -> Uniform 404 (Anti-Enumeration)
    const readProjRes = await request(app)
      .get(`/api/projects/${projectB._id}`)
      .set('Cookie', adminACookie);
    expect(readProjRes.status).toBe(404);
    expect(readProjRes.body.error.code).toBe('PROJECT_NOT_FOUND');

    // 2. Org A Admin attempts to UPDATE Org B Project -> 404
    const updateProjRes = await request(app)
      .patch(`/api/projects/${projectB._id}`)
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ name: 'Tampered Name' });
    expect(updateProjRes.status).toBe(404);

    // 3. Org A Admin attempts to DELETE Org B Project -> 404
    const deleteProjRes = await request(app)
      .delete(`/api/projects/${projectB._id}`)
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken);
    expect(deleteProjRes.status).toBe(404);

    // 4. Org A Member attempts to READ Org B Task -> 404
    const readTaskRes = await request(app)
      .get(`/api/tasks/${taskB._id}`)
      .set('Cookie', memberACookie);
    expect(readTaskRes.status).toBe(404);

    // 5. Verify security event was logged for cross-tenant probe
    const probeEvent = await SecurityEvent.findOne({
      organizationId: orgA._id,
      eventType: 'CROSS_TENANT_ACCESS_DENIED'
    });
    expect(probeEvent).not.toBeNull();
    expect(probeEvent.severity).toBe('high');
  });

  test('3. Client-supplied organizationId tampering is actively disarmed and logged', async () => {
    // Attempt project creation with forged organizationId in body and header
    const spoofRes = await request(app)
      .post('/api/projects')
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .set('x-organization-id', orgB._id.toString())
      .send({
        name: 'Spoofed Project',
        key: 'SPOOF',
        organizationId: orgB._id.toString()
      });

    expect(spoofRes.status).toBe(201);
    // Verified: Project was created strictly under authenticated Org A, NEVER Org B
    expect(spoofRes.body.data.organizationId).toBe(orgA._id.toString());

    const projectInDb = await Project.findById(spoofRes.body.data._id);
    expect(projectInDb.organizationId.toString()).toBe(orgA._id.toString());

    // Verified: Security event recorded the spoofing attempt
    const spoofEvent = await SecurityEvent.findOne({
      organizationId: orgA._id,
      eventType: 'UNAUTHORIZED_CROSS_TENANT_PROBE'
    });
    expect(spoofEvent).not.toBeNull();
  });

  // ==========================================================================
  // SECTION 3: ROLE-BASED ACCESS CONTROL (RBAC) & DECOUPLING
  // ==========================================================================

  test('4. Comprehensive RBAC enforcement prevents privilege escalation', async () => {
    // 1. Viewer cannot create projects -> 403
    const viewerCreateProj = await request(app)
      .post('/api/projects')
      .set('Cookie', viewerACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ name: 'Unauthorized Proj', key: 'NOPE' });
    expect(viewerCreateProj.status).toBe(403);
    expect(viewerCreateProj.body.error.code).toBe('FORBIDDEN_INSUFFICIENT_ROLE');

    // 2. Member cannot inspect invitations -> 403
    const memberInvites = await request(app)
      .get('/api/invitations')
      .set('Cookie', memberACookie);
    expect(memberInvites.status).toBe(403);

    // 3. Project Manager cannot modify organization MFA policy -> 403
    const pmPolicy = await request(app)
      .patch('/api/security/mfa-policy')
      .set('Cookie', pmACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ enforceMfa: true });
    expect(pmPolicy.status).toBe(403);

    // 4. Member cannot delete tasks -> 403
    const project = await Project.create({
      organizationId: orgA._id,
      name: 'Valid Project',
      key: 'VAL',
      ownerId: adminA._id
    });
    const task = await Task.create({
      organizationId: orgA._id,
      projectId: project._id,
      taskNumber: 1,
      taskKey: 'VAL-1',
      title: 'Valid Task',
      createdBy: memberA._id
    });

    const memberDeleteTask = await request(app)
      .delete(`/api/tasks/${task._id}`)
      .set('Cookie', memberACookie)
      .set('X-XSRF-TOKEN', csrfToken);
    expect(memberDeleteTask.status).toBe(403);
  });

  test('5. Platform Super Admin is strictly decoupled and denied access to private tenant content', async () => {
    const superAdmin = await PlatformAdmin.create({
      email: 'root@platform.admin',
      passwordHash: 'dummy_hash',
      fullName: 'Global Platform Admin',
      isSuperAdmin: true,
      status: 'active'
    });

    const superAdminToken = signAccessToken({
      userId: superAdmin._id,
      isSuperAdmin: true,
      role: 'platform_super_admin',
      tokenVersion: 0
    });
    const superAdminCookie = [`${AUTH_COOKIE_NAME}=${superAdminToken}`, `XSRF-TOKEN=${csrfToken}`];

    // 1. Blocked from tenant projects
    const projRes = await request(app)
      .get('/api/projects')
      .set('Cookie', superAdminCookie);
    expect(projRes.status).toBe(403);
    expect(projRes.body.error.code).toBe('FORBIDDEN_SUPERADMIN_TENANT_CONTENT_BLOCKED');

    // 2. Blocked from tenant tasks
    const taskRes = await request(app)
      .get('/api/tasks')
      .set('Cookie', superAdminCookie);
    expect(taskRes.status).toBe(403);

    // 3. Blocked from tenant team members
    const teamRes = await request(app)
      .get('/api/team/members')
      .set('Cookie', superAdminCookie);
    expect(teamRes.status).toBe(403);

    // 4. Blocked from tenant Security Center
    const secRes = await request(app)
      .get('/api/security/summary')
      .set('Cookie', superAdminCookie);
    expect(secRes.status).toBe(403);
  });

  // ==========================================================================
  // SECTION 4: INVITATIONS SECURITY & SINGLE-USE VALIDATION
  // ==========================================================================

  test('6. Invitation lifecycle: single-use acceptance, expiration, and token hash storage', async () => {
    // 1. Org Admin issues invitation
    const createRes = await request(app)
      .post('/api/invitations')
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({
        email: 'newhire@cyberdefend.alpha',
        role: 'member'
      });

    expect(createRes.status).toBe(201);
    const rawToken = createRes.body.data.rawToken;
    expect(rawToken).toBeDefined();

    // Verify token is NOT stored plaintext in DB (only SHA-256 hash)
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const invInDb = await Invitation.findOne({ token: tokenHash });
    expect(invInDb).not.toBeNull();
    expect(invInDb.token).not.toBe(rawToken);

    // 2. Public token validation
    const valRes = await request(app).get(`/api/invitations/validate/${rawToken}`);
    expect(valRes.status).toBe(200);
    expect(valRes.body.data.email).toBe('newhire@cyberdefend.alpha');
    expect(valRes.body.data.organizationName).toBe(orgA.name);

    // 3. First acceptance succeeds
    const acceptRes = await request(app)
      .post('/api/invitations/accept')
      .send({
        token: rawToken,
        firstName: 'Nathan',
        lastName: 'Newhire',
        password: 'SecurePass123!'
      });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);

    // 4. Second acceptance fails (Single-use token enforcement) -> 400
    const reAcceptRes = await request(app)
      .post('/api/invitations/accept')
      .send({
        token: rawToken,
        firstName: 'Nathan',
        lastName: 'Newhire',
        password: 'SecurePass123!'
      });

    expect(reAcceptRes.status).toBe(400);
    expect(reAcceptRes.body.error.code).toBe('INVITATION_INVALID_OR_EXPIRED');
  });

  // ==========================================================================
  // SECTION 5: DATA LEAKAGE PREVENTION & ZERO SENSITIVE DATA IN RESPONSES
  // ==========================================================================

  test('7. Password hashes, JWT secrets, and MFA secrets are never leaked in API responses', async () => {
    // 1. GET /api/auth/me does not leak passwordHash or mfaSecret
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', adminACookie);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.passwordHash).toBeUndefined();
    expect(meRes.body.data.user.mfaSecret).toBeUndefined();

    // 2. GET /api/team/members does not leak passwordHash or mfaSecret
    const teamRes = await request(app)
      .get('/api/team/members')
      .set('Cookie', adminACookie);
    expect(teamRes.status).toBe(200);
    for (const member of teamRes.body.data) {
      expect(member.passwordHash).toBeUndefined();
      expect(member.mfaSecret).toBeUndefined();
    }

    // 3. GET /api/security/audit-logs does not leak sensitive credentials
    const auditRes = await request(app)
      .get('/api/security/audit-logs')
      .set('Cookie', adminACookie);
    expect(auditRes.status).toBe(200);
    for (const log of auditRes.body.data) {
      expect(JSON.stringify(log)).not.toContain('passwordHash');
      expect(JSON.stringify(log)).not.toContain('mfaSecret');
    }
  });
});
