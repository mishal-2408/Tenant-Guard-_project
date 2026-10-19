import mongoose from 'mongoose';
import request from 'supertest';
import { generateSync } from 'otplib';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Organization } from '../src/models/Organization.js';
import { Project } from '../src/models/Project.js';
import { Task } from '../src/models/Task.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { SecurityEvent } from '../src/models/SecurityEvent.js';
import { PlatformAdmin } from '../src/models/PlatformAdmin.js';
import { signAccessToken, verifyAccessToken } from '../src/utils/jwt.util.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../src/utils/cookie.util.js';
import { hashPassword } from '../src/utils/password.util.js';
import { decryptSecret } from '../src/utils/crypto.util.js';

const TEST_DB_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/tenantguard_stage6_test';

describe('TenantGuard — Stage 6: Security Center, TOTP MFA, Alerts & Isolation Testing', () => {
  let orgA, orgB;
  let adminA, pmA, memberA, viewerA;
  let adminB;
  let adminACookie, pmACookie, memberACookie, viewerACookie;
  let adminBCookie;
  const csrfToken = 'test-csrf-token-stage6';

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
    await AuditLog.deleteMany({});
    await SecurityEvent.deleteMany({});
    await PlatformAdmin.deleteMany({});

    // 1. Seed Organization A
    orgA = await Organization.create({
      name: 'CyberGuard Alpha',
      slug: 'cyberguard-alpha'
    });

    // 2. Seed Organization B (Separate tenant)
    orgB = await Organization.create({
      name: 'DataShield Beta',
      slug: 'datashield-beta'
    });

    const defaultPasswordHash = await hashPassword('SecurePass123!');

    // 3. Seed Org A Users
    adminA = await User.create({
      organizationId: orgA._id,
      firstName: 'Alice',
      lastName: 'Admin',
      email: 'alice@alpha.corp',
      passwordHash: defaultPasswordHash,
      role: 'org_admin',
      status: 'active'
    });

    pmA = await User.create({
      organizationId: orgA._id,
      firstName: 'Peter',
      lastName: 'Manager',
      email: 'peter@alpha.corp',
      passwordHash: defaultPasswordHash,
      role: 'project_manager',
      status: 'active'
    });

    memberA = await User.create({
      organizationId: orgA._id,
      firstName: 'Mike',
      lastName: 'Member',
      email: 'mike@alpha.corp',
      passwordHash: defaultPasswordHash,
      role: 'member',
      status: 'active'
    });

    viewerA = await User.create({
      organizationId: orgA._id,
      firstName: 'Veronica',
      lastName: 'Viewer',
      email: 'veronica@alpha.corp',
      passwordHash: defaultPasswordHash,
      role: 'viewer',
      status: 'active'
    });

    // 4. Seed Org B Users
    adminB = await User.create({
      organizationId: orgB._id,
      firstName: 'Bob',
      lastName: 'Admin',
      email: 'bob@beta.corp',
      passwordHash: defaultPasswordHash,
      role: 'org_admin',
      status: 'active'
    });

    // 5. Generate signed tokens
    const adminAToken = signAccessToken({ userId: adminA._id, organizationId: orgA._id, role: 'org_admin', tokenVersion: 0 });
    const pmAToken = signAccessToken({ userId: pmA._id, organizationId: orgA._id, role: 'project_manager', tokenVersion: 0 });
    const memberAToken = signAccessToken({ userId: memberA._id, organizationId: orgA._id, role: 'member', tokenVersion: 0 });
    const viewerAToken = signAccessToken({ userId: viewerA._id, organizationId: orgA._id, role: 'viewer', tokenVersion: 0 });
    const adminBToken = signAccessToken({ userId: adminB._id, organizationId: orgB._id, role: 'org_admin', tokenVersion: 0 });

    adminACookie = `${AUTH_COOKIE_NAME}=${adminAToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`;
    pmACookie = `${AUTH_COOKIE_NAME}=${pmAToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`;
    memberACookie = `${AUTH_COOKIE_NAME}=${memberAToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`;
    viewerACookie = `${AUTH_COOKIE_NAME}=${viewerAToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`;
    adminBCookie = `${AUTH_COOKIE_NAME}=${adminBToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`;
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.db.dropDatabase();
      await mongoose.disconnect();
    }
  });

  // ==========================================================================
  // SECTION 1: AUDIT LOG TESTS
  // ==========================================================================

  test('1. Organization Admin can view their own organization audit logs with filtering', async () => {
    // Create audit logs for Org A
    await AuditLog.create([
      {
        organizationId: orgA._id,
        actorId: adminA._id,
        actorEmail: adminA.email,
        actorRole: adminA.role,
        action: 'PROJECT_CREATED',
        category: 'data_mutation',
        severity: 'info',
        status: 'success'
      },
      {
        organizationId: orgA._id,
        actorId: adminA._id,
        actorEmail: adminA.email,
        actorRole: adminA.role,
        action: 'USER_ROLE_CHANGED',
        category: 'access_control',
        severity: 'warning',
        status: 'success'
      }
    ]);

    // Create an audit log for Org B (should never be seen by Org A)
    await AuditLog.create({
      organizationId: orgB._id,
      actorId: adminB._id,
      actorEmail: adminB.email,
      actorRole: adminB.role,
      action: 'ORGANIZATION_SETTINGS_CHANGED',
      category: 'system',
      severity: 'info',
      status: 'success'
    });

    // Query logs as Org A Admin
    const res = await request(app)
      .get('/api/security/audit-logs')
      .set('Cookie', adminACookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    const actions = res.body.data.map((l) => l.action);
    expect(actions).toContain('PROJECT_CREATED');
    expect(actions).toContain('USER_ROLE_CHANGED');
    expect(actions).not.toContain('ORGANIZATION_SETTINGS_CHANGED'); // Tenant isolation verified!

    // Filter by category
    const filterRes = await request(app)
      .get('/api/security/audit-logs?category=access_control')
      .set('Cookie', adminACookie);

    expect(filterRes.status).toBe(200);
    expect(filterRes.body.data.length).toBe(1);
    expect(filterRes.body.data[0].action).toBe('USER_ROLE_CHANGED');
  });

  test('2. Audit logs export to CSV strictly scoped to tenant', async () => {
    await AuditLog.create({
      organizationId: orgA._id,
      actorId: adminA._id,
      actorEmail: adminA.email,
      actorRole: adminA.role,
      action: 'TASK_CREATED',
      category: 'data_mutation',
      severity: 'info',
      status: 'success'
    });

    const res = await request(app)
      .get('/api/security/audit-logs/export')
      .set('Cookie', adminACookie);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Timestamp,Actor Email,Actor Role,Action');
    expect(res.text).toContain('alice@alpha.corp');
    expect(res.text).toContain('TASK_CREATED');
  });

  test('3. Non-admin roles (Viewer, Member, PM) cannot access Security Center audit endpoints', async () => {
    const memberRes = await request(app)
      .get('/api/security/audit-logs')
      .set('Cookie', memberACookie);
    expect(memberRes.status).toBe(403);

    const viewerRes = await request(app)
      .get('/api/security/audit-logs')
      .set('Cookie', viewerACookie);
    expect(viewerRes.status).toBe(403);

    const pmRes = await request(app)
      .get('/api/security/audit-logs')
      .set('Cookie', pmACookie);
    expect(pmRes.status).toBe(403);
  });

  // ==========================================================================
  // SECTION 2: SECURITY ALERTS TESTS
  // ==========================================================================

  test('4. Security alerts listing and alert window aggregation', async () => {
    // Trigger repeated security alert
    await request(app)
      .post('/api/security/alerts')
      .set('Cookie', adminACookie);

    // Simulate alert creation with aggregation
    const alert1 = await SecurityEvent.create({
      organizationId: orgA._id,
      eventType: 'UNAUTHORIZED_CROSS_TENANT_PROBE',
      severity: 'high',
      title: 'Tenant ID Spoofing Attempt Intercepted',
      description: 'Foreign tenant context probe',
      eventCount: 1,
      status: 'open'
    });

    const res = await request(app)
      .get('/api/security/alerts')
      .set('Cookie', adminACookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].eventType).toBe('UNAUTHORIZED_CROSS_TENANT_PROBE');
  });

  test('5. Org Admin can acknowledge and resolve security alerts with audit trail', async () => {
    const alert = await SecurityEvent.create({
      organizationId: orgA._id,
      eventType: 'BRUTE_FORCE_LOCKOUT',
      severity: 'high',
      title: 'Account Locked Due to Multiple Failed Logins',
      description: 'Account locked for 15 minutes.',
      status: 'open'
    });

    // Acknowledge alert
    const ackRes = await request(app)
      .patch(`/api/security/alerts/${alert._id}/status`)
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ status: 'acknowledged' });

    expect(ackRes.status).toBe(200);
    expect(ackRes.body.data.status).toBe('acknowledged');

    // Resolve alert
    const resRes = await request(app)
      .patch(`/api/security/alerts/${alert._id}/status`)
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ status: 'resolved' });

    expect(resRes.status).toBe(200);
    expect(resRes.body.data.status).toBe('resolved');
    expect(resRes.body.data.resolvedAt).toBeDefined();

    // Cross-tenant attempt: Org B Admin cannot acknowledge or resolve Org A alert -> 404
    const crossRes = await request(app)
      .patch(`/api/security/alerts/${alert._id}/status`)
      .set('Cookie', adminBCookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ status: 'open' });

    expect(crossRes.status).toBe(404);
  });

  // ==========================================================================
  // SECTION 3: TOTP MULTI-FACTOR AUTHENTICATION TESTS
  // ==========================================================================

  test('6. MFA enrollment generates QR code, encrypts secret at rest with AES-256-GCM', async () => {
    const res = await request(app)
      .post('/api/auth/mfa/setup')
      .set('Cookie', adminACookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.secret).toBeDefined();
    expect(res.body.data.qrCodeDataUrl).toContain('data:image/png;base64,');
    expect(res.body.data.issuer).toBe('TenantGuard');

    // Verify secret is stored ENCRYPTED in MongoDB, never plaintext
    const userInDb = await User.findById(adminA._id).select('+mfaSecret');
    expect(userInDb.mfaSecret).toBeDefined();
    expect(userInDb.mfaSecret).not.toBe(res.body.data.secret);
    expect(userInDb.mfaSecret).toContain(':'); // iv:authTag:ciphertext format

    // Verify AES-256-GCM decryption restores original secret
    const decrypted = decryptSecret(userInDb.mfaSecret);
    expect(decrypted).toBe(res.body.data.secret);

    // Verify MFA is NOT enabled yet until verified
    expect(userInDb.mfaEnabled).toBe(false);
  });

  test('7. MFA activation requires valid TOTP code; invalid codes are rejected', async () => {
    // Setup MFA
    const setupRes = await request(app)
      .post('/api/auth/mfa/setup')
      .set('Cookie', adminACookie);
    const rawSecret = setupRes.body.data.secret;

    // 1. Submit invalid code -> 400
    const invalidRes = await request(app)
      .post('/api/auth/mfa/verify-setup')
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ token: '000000' });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error.code).toBe('MFA_INVALID_CODE');

    // 2. Submit valid code using authenticator library
    const validCode = generateSync({ secret: rawSecret });
    const validRes = await request(app)
      .post('/api/auth/mfa/verify-setup')
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ token: validCode });

    expect(validRes.status).toBe(200);
    expect(validRes.body.success).toBe(true);

    // User is now marked mfaEnabled: true
    const updatedUser = await User.findById(adminA._id);
    expect(updatedUser.mfaEnabled).toBe(true);
  });

  test('8. Login with MFA-enabled account issues pre-auth challenge and blocks access until verified', async () => {
    // 1. Enable MFA on Alice's account
    const setupRes = await request(app)
      .post('/api/auth/mfa/setup')
      .set('Cookie', adminACookie);
    const rawSecret = setupRes.body.data.secret;
    const validCode = generateSync({ secret: rawSecret });
    await request(app)
      .post('/api/auth/mfa/verify-setup')
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ token: validCode });

    // 2. Alice attempts ordinary password login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alice@alpha.corp',
        password: 'SecurePass123!'
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.mfaRequired).toBe(true);
    expect(loginRes.body.mfaToken).toBeDefined();
    // Does NOT set the auth session cookie
    expect(loginRes.headers['set-cookie'] || []).not.toEqual(
      expect.arrayContaining([expect.stringContaining(`${AUTH_COOKIE_NAME}=`)])
    );

    const mfaPendingToken = loginRes.body.mfaToken;

    // 3. Pre-auth token attempts to access protected endpoint -> 401 AUTH_MFA_REQUIRED
    const preAuthAttempt = await request(app)
      .get('/api/projects')
      .set('Cookie', `${AUTH_COOKIE_NAME}=${mfaPendingToken}`);

    expect(preAuthAttempt.status).toBe(401);
    expect(preAuthAttempt.body.error.code).toBe('AUTH_MFA_REQUIRED');

    // 4. Complete MFA login with invalid TOTP code -> 400
    const failMfaLogin = await request(app)
      .post('/api/auth/mfa/verify-login')
      .send({
        mfaToken: mfaPendingToken,
        token: '999999'
      });
    expect(failMfaLogin.status).toBe(400);
    expect(failMfaLogin.body.error.code).toBe('MFA_INVALID_CODE');

    // 5. Complete MFA login with valid TOTP code -> 200 and session cookies established
    const currentCode = generateSync({ secret: rawSecret });
    const successMfaLogin = await request(app)
      .post('/api/auth/mfa/verify-login')
      .send({
        mfaToken: mfaPendingToken,
        token: currentCode
      });

    expect(successMfaLogin.status).toBe(200);
    expect(successMfaLogin.body.success).toBe(true);
    expect(successMfaLogin.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining(`${AUTH_COOKIE_NAME}=`)])
    );
  });

  test('9. Disabling MFA requires current account password and valid TOTP code', async () => {
    // Setup and enable MFA
    const setupRes = await request(app)
      .post('/api/auth/mfa/setup')
      .set('Cookie', adminACookie);
    const rawSecret = setupRes.body.data.secret;
    const validCode = generateSync({ secret: rawSecret });
    await request(app)
      .post('/api/auth/mfa/verify-setup')
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ token: validCode });

    // Wrong password -> 400
    const wrongPassRes = await request(app)
      .post('/api/auth/mfa/disable')
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ password: 'WrongPassword!', token: validCode });
    expect(wrongPassRes.status).toBe(400);

    // Wrong code -> 400
    const wrongCodeRes = await request(app)
      .post('/api/auth/mfa/disable')
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ password: 'SecurePass123!', token: '000000' });
    expect(wrongCodeRes.status).toBe(400);

    // Valid password & code -> 200
    const disableCode = generateSync({ secret: rawSecret });
    const successRes = await request(app)
      .post('/api/auth/mfa/disable')
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ password: 'SecurePass123!', token: disableCode });
    expect(successRes.status).toBe(200);

    const userInDb = await User.findById(adminA._id);
    expect(userInDb.mfaEnabled).toBe(false);
  });

  test('10. Organization Admin can toggle organization-wide MFA requirement policy', async () => {
    const res = await request(app)
      .patch('/api/security/mfa-policy')
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ enforceMfa: true });

    expect(res.status).toBe(200);
    expect(res.body.data.settings.enforceMfa).toBe(true);

    const updatedOrg = await Organization.findById(orgA._id);
    expect(updatedOrg.settings.enforceMfa).toBe(true);
  });

  // ==========================================================================
  // SECTION 4: LIVE TENANT-ISOLATION TEST DASHBOARD
  // ==========================================================================

  test('11. Live synthetic tenant isolation test executes and verifies all 10 deterministic security scenarios', async () => {
    const res = await request(app)
      .post('/api/security/run-isolation-test')
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.testRunId).toBeDefined();
    expect(res.body.data.summary.total).toBe(10);
    expect(res.body.data.summary.passed).toBe(10);
    expect(res.body.data.summary.failed).toBe(0);

    const results = res.body.data.results;
    expect(results.length).toBe(10);
    for (const r of results) {
      expect(r.status).toBe('PASS');
    }

    // Verify scenarios
    const scenarioTitles = results.map((r) => r.title);
    expect(scenarioTitles).toContain('Authorized Tenant Resource Access');
    expect(scenarioTitles).toContain('Cross-Tenant Read Attempt Blocked');
    expect(scenarioTitles).toContain('Cross-Tenant Update / Delete Interception');
    expect(scenarioTitles).toContain('Cross-Tenant Task Isolation');
    expect(scenarioTitles).toContain('Anti-Tampering Organization ID Shield');
    expect(scenarioTitles).toContain('Viewer Role Mutation Defense');
    expect(scenarioTitles).toContain('Super Admin Tenant Privacy Wall');

    // Verify audit record was logged in real Organization A
    const auditRecord = await AuditLog.findOne({
      organizationId: orgA._id,
      action: 'ISOLATION_TEST_EXECUTED'
    });
    expect(auditRecord).not.toBeNull();
  });
});
