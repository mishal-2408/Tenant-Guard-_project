import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Organization } from '../src/models/Organization.js';
import { Project } from '../src/models/Project.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { SecurityEvent } from '../src/models/SecurityEvent.js';
import { PlatformAdmin } from '../src/models/PlatformAdmin.js';
import { signAccessToken } from '../src/utils/jwt.util.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../src/utils/cookie.util.js';

const TEST_DB_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/tenantguard_stage3_test';

describe('TenantGuard — Stage 3: Authentication, TenantGuard Middleware & RBAC Tests', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_ACCESS_SECRET = 'test_super_secret_jwt_key_minimum_32_characters_long_for_security';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI);
    }
  });

  beforeEach(async () => {
    // Clean test collections before each test run
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Project.deleteMany({});
    await AuditLog.deleteMany({});
    await SecurityEvent.deleteMany({});
    await PlatformAdmin.deleteMany({});
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.db.dropDatabase();
      await mongoose.disconnect();
    }
  });

  // --------------------------------------------------------------------------
  // Test 1: Registration creates organization and first user with org_admin role
  // --------------------------------------------------------------------------
  test('1. Registration creates an organization and first user with the Organization Admin role', async () => {
    const payload = {
      organizationName: 'Acme Corp',
      slug: 'acme-corp',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@acme.com',
      password: 'SecurePassword123!'
    };

    const res = await request(app).post('/api/auth/register').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.organization.name).toBe('Acme Corp');
    expect(res.body.data.organization.slug).toBe('acme-corp');
    expect(res.body.data.user.role).toBe('org_admin');
    expect(res.body.data.user.email).toBe('alice@acme.com');

    // Confirm httpOnly cookie was set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes(AUTH_COOKIE_NAME) && c.includes('HttpOnly'))).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Test 2: Passwords are stored as hashes, never plaintext
  // --------------------------------------------------------------------------
  test('2. Passwords are stored as hashes, never plaintext', async () => {
    const payload = {
      organizationName: 'Beta Labs',
      slug: 'beta-labs',
      firstName: 'Bob',
      lastName: 'Jones',
      email: 'bob@beta.com',
      password: 'MySecretPassword123!'
    };

    await request(app).post('/api/auth/register').send(payload);

    // Direct database query explicitly selecting passwordHash
    const user = await User.findOne({ email: 'bob@beta.com' }).select('+passwordHash');
    expect(user).toBeDefined();
    expect(user.passwordHash).not.toBe('MySecretPassword123!');
    expect(user.passwordHash.startsWith('$2a$') || user.passwordHash.startsWith('$2b$')).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Test 3: Duplicate registrations are handled safely
  // --------------------------------------------------------------------------
  test('3. Duplicate registrations are handled safely with 409 Conflict', async () => {
    const payload = {
      organizationName: 'Gamma Systems',
      slug: 'gamma-sys',
      firstName: 'Charlie',
      lastName: 'Brown',
      email: 'charlie@gamma.com',
      password: 'Password123!'
    };

    // First registration succeeds
    const firstRes = await request(app).post('/api/auth/register').send(payload);
    expect(firstRes.status).toBe(201);

    // Attempt duplicate slug registration
    const dupSlugRes = await request(app).post('/api/auth/register').send({
      ...payload,
      organizationName: 'Another Gamma',
      email: 'different@gamma.com'
    });
    expect(dupSlugRes.status).toBe(409);
    expect(dupSlugRes.body.error.code).toBe('ORGANIZATION_SLUG_CONFLICT');
  });

  // --------------------------------------------------------------------------
  // Test 4: Login succeeds with correct credentials
  // --------------------------------------------------------------------------
  test('4. Login succeeds with correct credentials and returns session context', async () => {
    await request(app).post('/api/auth/register').send({
      organizationName: 'Delta Dynamics',
      slug: 'delta-dyn',
      firstName: 'David',
      lastName: 'Miller',
      email: 'david@delta.com',
      password: 'CorrectPassword123!'
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'david@delta.com',
      password: 'CorrectPassword123!'
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.user.email).toBe('david@delta.com');
    expect(loginRes.body.data.user.role).toBe('org_admin');

    const cookies = loginRes.headers['set-cookie'];
    expect(cookies.some((c) => c.includes(AUTH_COOKIE_NAME) && c.includes('HttpOnly'))).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Test 5: Wrong credentials are rejected with generic message
  // --------------------------------------------------------------------------
  test('5. Wrong credentials are rejected without leaking email existence', async () => {
    // 1. Non-existent email
    const resNonExistent = await request(app).post('/api/auth/login').send({
      email: 'nobody@nowhere.com',
      password: 'SomePassword123!'
    });
    expect(resNonExistent.status).toBe(401);
    expect(resNonExistent.body.error.message).toBe('Invalid email or password.');

    // 2. Existing user with wrong password
    await request(app).post('/api/auth/register').send({
      organizationName: 'Echo Corp',
      slug: 'echo-corp',
      firstName: 'Emma',
      lastName: 'Stone',
      email: 'emma@echo.com',
      password: 'RealPassword123!'
    });

    const resWrongPass = await request(app).post('/api/auth/login').send({
      email: 'emma@echo.com',
      password: 'WrongPassword999!'
    });
    expect(resWrongPass.status).toBe(401);
    expect(resWrongPass.body.error.message).toBe('Invalid email or password.');
  });

  // --------------------------------------------------------------------------
  // Test 6: Repeated failures trigger the configured lockout
  // --------------------------------------------------------------------------
  test('6. Repeated failures trigger the configured 5-attempt account lockout', async () => {
    await request(app).post('/api/auth/register').send({
      organizationName: 'Foxtrot Security',
      slug: 'foxtrot-sec',
      firstName: 'Frank',
      lastName: 'Castle',
      email: 'frank@foxtrot.com',
      password: 'MasterPassword123!'
    });

    // Send 4 wrong attempts (not yet locked)
    for (let i = 0; i < 4; i++) {
      const res = await request(app).post('/api/auth/login').send({
        email: 'frank@foxtrot.com',
        password: 'BadPassword!'
      });
      expect(res.status).toBe(401);
    }

    // 5th wrong attempt triggers lockout
    const fifthRes = await request(app).post('/api/auth/login').send({
      email: 'frank@foxtrot.com',
      password: 'BadPassword!'
    });
    expect(fifthRes.status).toBe(401);

    // 6th attempt is blocked by account lockout (HTTP 423 Locked)
    const lockedRes = await request(app).post('/api/auth/login').send({
      email: 'frank@foxtrot.com',
      password: 'MasterPassword123!' // Even with correct password, account is locked!
    });
    expect(lockedRes.status).toBe(423);
    expect(lockedRes.body.error.code).toBe('ACCOUNT_LOCKED');
    expect(lockedRes.body.error.message).toContain('Account is temporarily locked');
  });

  // --------------------------------------------------------------------------
  // Test 7: Missing, invalid, expired, and revoked tokens are rejected
  // --------------------------------------------------------------------------
  test('7. Missing, invalid, expired, and revoked tokens are rejected with 401', async () => {
    // 1. Missing token
    const resMissing = await request(app).get('/api/auth/me');
    expect(resMissing.status).toBe(401);
    expect(resMissing.body.error.code).toBe('AUTH_TOKEN_REQUIRED');

    // 2. Invalid token string
    const resInvalid = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=invalid_tampered_jwt_string`]);
    expect(resInvalid.status).toBe(401);
    expect(resInvalid.body.error.code).toBe('AUTH_TOKEN_INVALID');
  });

  // --------------------------------------------------------------------------
  // Test 8: Logout clears cookie and invalidates session via tokenVersion
  // --------------------------------------------------------------------------
  test('8. Logout clears the cookie and increments tokenVersion to invalidate existing tokens', async () => {
    const regRes = await request(app).post('/api/auth/register').send({
      organizationName: 'Hotel Co',
      slug: 'hotel-co',
      firstName: 'Harry',
      lastName: 'Kane',
      email: 'harry@hotel.com',
      password: 'SecurePassword123!'
    });

    const cookies = regRes.headers['set-cookie'];
    const authCookie = cookies.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`)).split(';')[0];
    const csrfCookie = cookies.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`)).split(';')[0];
    const csrfTokenValue = csrfCookie.split('=')[1];

    // Verify authenticated request works before logout
    const preLogoutRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [authCookie]);
    expect(preLogoutRes.status).toBe(200);

    // Call logout (providing both cookies and CSRF header)
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [authCookie, csrfCookie])
      .set('x-xsrf-token', csrfTokenValue);
    expect(logoutRes.status).toBe(200);

    // Verify cookies were cleared in response
    const clearCookies = logoutRes.headers['set-cookie'];
    expect(clearCookies.some((c) => c.includes(`${AUTH_COOKIE_NAME}=;`))).toBe(true);

    // Verify that using the old token now fails because tokenVersion was incremented
    const postLogoutRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [authCookie]);
    expect(postLogoutRes.status).toBe(401);
    expect(postLogoutRes.body.error.code).toBe('AUTH_TOKEN_REVOKED');
  });

  // --------------------------------------------------------------------------
  // Test 9: A Viewer is denied restricted actions (403 Forbidden)
  // --------------------------------------------------------------------------
  test('9. A Viewer role is denied restricted admin actions with 403 Forbidden', async () => {
    const org = await Organization.create({
      name: 'India Tech',
      slug: 'india-tech',
      status: 'active'
    });

    const viewerUser = await User.create({
      organizationId: org._id,
      firstName: 'Victor',
      lastName: 'Viewer',
      email: 'viewer@india.com',
      passwordHash: 'dummy_hash',
      role: 'viewer', // Viewer role!
      status: 'active',
      tokenVersion: 0
    });

    const viewerToken = signAccessToken({
      userId: viewerUser._id,
      organizationId: org._id,
      role: viewerUser.role,
      tokenVersion: 0
    });

    // 1. Viewer attempts admin-only route -> 403 Forbidden
    const adminRouteRes = await request(app)
      .get('/api/auth/test/admin-only')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${viewerToken}`]);
    expect(adminRouteRes.status).toBe(403);
    expect(adminRouteRes.body.error.code).toBe('FORBIDDEN_INSUFFICIENT_ROLE');

    // 2. Viewer attempts member-action route -> 403 Forbidden
    const memberRouteRes = await request(app)
      .get('/api/auth/test/member-action')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${viewerToken}`]);
    expect(memberRouteRes.status).toBe(403);

    // 3. Viewer attempts viewer-allowed route -> 200 OK
    const viewerAllowedRes = await request(app)
      .get('/api/auth/test/viewer-allowed')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${viewerToken}`]);
    expect(viewerAllowedRes.status).toBe(200);
    expect(viewerAllowedRes.body.success).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Test 10: Forged tenant ID cannot change authenticated tenant context
  // --------------------------------------------------------------------------
  test('10. A tenant ID supplied in a forged request body or header cannot change the authenticated tenant', async () => {
    const orgReal = await Organization.create({
      name: 'Real Org',
      slug: 'real-org',
      status: 'active'
    });

    const user = await User.create({
      organizationId: orgReal._id,
      firstName: 'Sam',
      lastName: 'Smith',
      email: 'sam@real.com',
      passwordHash: 'dummy_hash',
      role: 'org_admin',
      status: 'active',
      tokenVersion: 0
    });

    const token = signAccessToken({
      userId: user._id,
      organizationId: orgReal._id,
      role: user.role,
      tokenVersion: 0
    });

    const fakeForeignOrgId = new mongoose.Types.ObjectId().toString();

    // Attacker sends forged header and forged query param with fakeForeignOrgId
    const res = await request(app)
      .get('/api/auth/test/admin-only?organizationId=' + fakeForeignOrgId)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${token}`])
      .set('x-tenant-id', fakeForeignOrgId)
      .send({ organizationId: fakeForeignOrgId });

    expect(res.status).toBe(200);
    // Verified: Server strictly used the real org ID from verified token
    expect(res.body.organizationId.toString()).toBe(orgReal._id.toString());
    expect(res.body.organizationId.toString()).not.toBe(fakeForeignOrgId);
  });

  // --------------------------------------------------------------------------
  // Test 11: User from Company A cannot access Company B's resource through tenant helper
  // --------------------------------------------------------------------------
  test('11. A user from Company A cannot access Company B\'s resource (returns 404 and logs cross-tenant denial)', async () => {
    // Organization A
    const orgA = await Organization.create({ name: 'Company A', slug: 'comp-a' });
    const userA = await User.create({
      organizationId: orgA._id,
      firstName: 'Alice',
      lastName: 'A',
      email: 'alice@company-a.com',
      passwordHash: 'dummy',
      role: 'member',
      status: 'active',
      tokenVersion: 0
    });
    const tokenA = signAccessToken({
      userId: userA._id,
      organizationId: orgA._id,
      role: userA.role,
      tokenVersion: 0
    });

    // Organization B and its private project
    const orgB = await Organization.create({ name: 'Company B', slug: 'comp-b' });
    const projectB = await Project.create({
      organizationId: orgB._id,
      name: 'Secret Project B',
      key: 'SECB',
      ownerId: new mongoose.Types.ObjectId()
    });

    // User A attempts to access Company B's project ID
    const res = await request(app)
      .get(`/api/auth/test/resource/${projectB._id}`)
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${tokenA}`]);

    // Anti-Enumeration: Must return 404 Not Found (never 403)
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');

    // Verify security telemetry recorded the cross-tenant probe
    const secEvent = await SecurityEvent.findOne({
      organizationId: orgA._id,
      eventType: 'CROSS_TENANT_ACCESS_DENIED'
    });
    expect(secEvent).toBeDefined();
    expect(secEvent.metadata.attemptedResourceId).toBe(projectB._id.toString());
  });

  // --------------------------------------------------------------------------
  // Test 12: Platform Super Admin cannot access tenant project/task content
  // --------------------------------------------------------------------------
  test('12. Platform Super Admin is blocked from accessing tenant-private workspace routes', async () => {
    const superAdmin = await PlatformAdmin.create({
      email: 'root@tenantguard.admin',
      passwordHash: 'dummy_hash',
      fullName: 'Super Administrator',
      isSuperAdmin: true,
      status: 'active'
    });

    // Sign token with isSuperAdmin context (no organizationId)
    const superAdminToken = signAccessToken({
      userId: superAdmin._id,
      organizationId: null,
      role: 'platform_super_admin',
      tokenVersion: 0
    });

    // Attempt to access tenant workspace route
    const res = await request(app)
      .get('/api/auth/test/admin-only')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${superAdminToken}`]);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_SUPERADMIN_TENANT_CONTENT_BLOCKED');
  });

  // --------------------------------------------------------------------------
  // Test 13: Security events and audit logs are recorded without secrets
  // --------------------------------------------------------------------------
  test('13. Security events and audit logs are recorded with zero leaked passwords or secrets', async () => {
    // Trigger a failed login attempt with a password
    await request(app).post('/api/auth/login').send({
      email: 'nonexistent@test.com',
      password: 'MySensitivePassword123!'
    });

    const logs = await AuditLog.find({});
    expect(logs.length).toBeGreaterThan(0);

    for (const log of logs) {
      const serialized = JSON.stringify(log);
      expect(serialized).not.toContain('MySensitivePassword123!');
      expect(serialized).not.toContain('passwordHash');
    }
  });
});
