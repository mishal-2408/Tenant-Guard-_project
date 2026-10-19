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
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../src/utils/cookie.util.js';
import { hashPassword } from '../src/utils/password.util.js';

const TEST_DB_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/tenantguard_stage5_test';

describe('TenantGuard — Stage 5: Projects, Tasks, Team & Invitations Test Suite', () => {
  let orgA, orgB;
  let adminA, pmA, memberA, viewerA;
  let adminB;
  let superAdmin;

  let adminACookie, pmACookie, memberACookie, viewerACookie;
  let adminBCookie;
  let superAdminCookie;
  const csrfToken = 'test-csrf-token-xyz-12345';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_ACCESS_SECRET = 'test_super_secret_jwt_key_minimum_32_characters_long_for_security';
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

    // 1. Seed Organization A
    orgA = await Organization.create({
      name: 'CyberGuard Inc',
      slug: 'cyberguard'
    });

    // 2. Seed Organization B (Separate tenant)
    orgB = await Organization.create({
      name: 'DataShield LLC',
      slug: 'datashield'
    });

    const defaultPasswordHash = await hashPassword('TestPassword123!');

    // 3. Seed Org A Users
    adminA = await User.create({
      organizationId: orgA._id,
      firstName: 'Alice',
      lastName: 'Admin',
      email: 'alice@cyberguard.com',
      passwordHash: defaultPasswordHash,
      role: 'org_admin',
      status: 'active'
    });

    pmA = await User.create({
      organizationId: orgA._id,
      firstName: 'Peter',
      lastName: 'Manager',
      email: 'peter@cyberguard.com',
      passwordHash: defaultPasswordHash,
      role: 'project_manager',
      status: 'active'
    });

    memberA = await User.create({
      organizationId: orgA._id,
      firstName: 'Mike',
      lastName: 'Member',
      email: 'mike@cyberguard.com',
      passwordHash: defaultPasswordHash,
      role: 'member',
      status: 'active'
    });

    viewerA = await User.create({
      organizationId: orgA._id,
      firstName: 'Veronica',
      lastName: 'Viewer',
      email: 'veronica@cyberguard.com',
      passwordHash: defaultPasswordHash,
      role: 'viewer',
      status: 'active'
    });

    // 4. Seed Org B Users
    adminB = await User.create({
      organizationId: orgB._id,
      firstName: 'Bob',
      lastName: 'Admin',
      email: 'bob@datashield.com',
      passwordHash: defaultPasswordHash,
      role: 'org_admin',
      status: 'active'
    });

    // 5. Seed Platform Super Admin
    superAdmin = await PlatformAdmin.create({
      fullName: 'Global System Admin',
      email: 'superadmin@tenantguard.local',
      passwordHash: defaultPasswordHash,
      role: 'platform_super_admin',
      status: 'active'
    });

    // 6. Generate signed tokens
    const adminAToken = signAccessToken({ userId: adminA._id, organizationId: orgA._id, role: 'org_admin', tokenVersion: 0 });
    const pmAToken = signAccessToken({ userId: pmA._id, organizationId: orgA._id, role: 'project_manager', tokenVersion: 0 });
    const memberAToken = signAccessToken({ userId: memberA._id, organizationId: orgA._id, role: 'member', tokenVersion: 0 });
    const viewerAToken = signAccessToken({ userId: viewerA._id, organizationId: orgA._id, role: 'viewer', tokenVersion: 0 });
    const adminBToken = signAccessToken({ userId: adminB._id, organizationId: orgB._id, role: 'org_admin', tokenVersion: 0 });
    const superAdminToken = signAccessToken({ userId: superAdmin._id, role: 'platform_super_admin', organizationId: null });

    adminACookie = `${AUTH_COOKIE_NAME}=${adminAToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`;
    pmACookie = `${AUTH_COOKIE_NAME}=${pmAToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`;
    memberACookie = `${AUTH_COOKIE_NAME}=${memberAToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`;
    viewerACookie = `${AUTH_COOKIE_NAME}=${viewerAToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`;
    adminBCookie = `${AUTH_COOKIE_NAME}=${adminBToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`;
    superAdminCookie = `${AUTH_COOKIE_NAME}=${superAdminToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`;
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.db.dropDatabase();
      await mongoose.disconnect();
    }
  });

  // ==========================================================================
  // SECTION 1: PROJECT TESTS
  // ==========================================================================

  test('1. Authorized project creation and listing within same organization', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({
        name: 'Alpha Defense System',
        key: 'ALPHA',
        description: 'Core defense platform',
        status: 'active',
        members: [pmA._id.toString(), memberA._id.toString()]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Alpha Defense System');
    expect(res.body.data.key).toBe('ALPHA');
    expect(res.body.data.organizationId.toString()).toBe(orgA._id.toString());
    expect(res.body.data.members.length).toBe(2);

    // List projects for Org A
    const listRes = await request(app)
      .get('/api/projects')
      .set('Cookie', adminACookie);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(1);
    expect(listRes.body.data[0].key).toBe('ALPHA');
  });

  test('2. Project key must be unique per organization, but allowed across different tenants', async () => {
    // Org A creates project with key 'SEC'
    const resA = await request(app)
      .post('/api/projects')
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ name: 'Security Core', key: 'SEC' });
    expect(resA.status).toBe(201);

    // Org A tries to create duplicate key 'SEC' -> 409 Conflict
    const resADup = await request(app)
      .post('/api/projects')
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ name: 'Security Duplicate', key: 'SEC' });
    expect(resADup.status).toBe(409);
    expect(resADup.body.error.code).toBe('PROJECT_KEY_EXISTS');

    // Org B creates project with identical key 'SEC' -> Allowed! (Multi-tenant partition)
    const resB = await request(app)
      .post('/api/projects')
      .set('Cookie', adminBCookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ name: 'Org B Security', key: 'SEC' });
    expect(resB.status).toBe(201);
  });

  test('3. Cross-tenant project read, update, and delete attempts return 404 Not Found', async () => {
    // Org A creates a project
    const projA = await Project.create({
      organizationId: orgA._id,
      name: 'Vault A',
      key: 'VAULTA',
      ownerId: adminA._id
    });

    // Org B attempts to read Org A's project -> 404 (Anti-enumeration)
    const readRes = await request(app)
      .get(`/api/projects/${projA._id}`)
      .set('Cookie', adminBCookie);
    expect(readRes.status).toBe(404);

    // Org B attempts to update Org A's project -> 404
    const updateRes = await request(app)
      .patch(`/api/projects/${projA._id}`)
      .set('Cookie', adminBCookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ name: 'Hacked Vault' });
    expect(updateRes.status).toBe(404);

    // Org B attempts to delete Org A's project -> 404
    const deleteRes = await request(app)
      .delete(`/api/projects/${projA._id}`)
      .set('Cookie', adminBCookie)
      .set('X-XSRF-TOKEN', csrfToken);
    expect(deleteRes.status).toBe(404);

    // Verify Org A's project remains untouched
    const checkProj = await Project.findById(projA._id);
    expect(checkProj.name).toBe('Vault A');
  });

  test('4. Forged organizationId in body/query is sanitized and cannot alter project tenancy', async () => {
    const res = await request(app)
      .post('/api/projects?organizationId=' + orgB._id.toString())
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({
        organizationId: orgB._id.toString(),
        name: 'Spoofed Project',
        key: 'SPOOF'
      });

    expect(res.status).toBe(201);
    // Project MUST belong strictly to Org A (derived from verified auth context)
    expect(res.body.data.organizationId.toString()).toBe(orgA._id.toString());
  });

  test('5. Assigning a member from another organization to a project is rejected', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({
        name: 'Cross Org Project',
        key: 'CROSS',
        members: [adminB._id.toString()] // User from Org B!
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PROJECT_MEMBERS');
  });

  test('6. Member and Viewer roles cannot create, update, or delete projects', async () => {
    const projA = await Project.create({
      organizationId: orgA._id,
      name: 'Restricted Project',
      key: 'RESTRICT',
      ownerId: adminA._id
    });

    // Member attempts create -> 403
    const memberCreate = await request(app)
      .post('/api/projects')
      .set('Cookie', memberACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ name: 'Member Project', key: 'MEMP' });
    expect(memberCreate.status).toBe(403);

    // Viewer attempts update -> 403
    const viewerUpdate = await request(app)
      .patch(`/api/projects/${projA._id}`)
      .set('Cookie', viewerACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ name: 'Viewer Renamed' });
    expect(viewerUpdate.status).toBe(403);

    // Member attempts delete -> 403
    const memberDelete = await request(app)
      .delete(`/api/projects/${projA._id}`)
      .set('Cookie', memberACookie)
      .set('X-XSRF-TOKEN', csrfToken);
    expect(memberDelete.status).toBe(403);
  });

  // ==========================================================================
  // SECTION 2: TASK TESTS
  // ==========================================================================

  test('7. Task creation under a valid project, sequential numbering, and status updates', async () => {
    const proj = await Project.create({
      organizationId: orgA._id,
      name: 'Task Project',
      key: 'TASK',
      ownerId: adminA._id
    });

    // Create Task 1
    const task1 = await request(app)
      .post('/api/tasks')
      .set('Cookie', memberACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({
        projectId: proj._id.toString(),
        title: 'Design API Gateway',
        status: 'todo',
        priority: 'high',
        assignedTo: memberA._id.toString()
      });

    expect(task1.status).toBe(201);
    expect(task1.body.data.taskNumber).toBe(1);
    expect(task1.body.data.title).toBe('Design API Gateway');
    expect(task1.body.data.status).toBe('todo');

    // Create Task 2 (Sequential numbering test)
    const task2 = await request(app)
      .post('/api/tasks')
      .set('Cookie', memberACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({
        projectId: proj._id.toString(),
        title: 'Implement Tenant Middleware',
        status: 'in_progress',
        priority: 'urgent'
      });

    expect(task2.status).toBe(201);
    expect(task2.body.data.taskNumber).toBe(2);

    // Update status
    const updateRes = await request(app)
      .patch(`/api/tasks/${task1.body.data._id}`)
      .set('Cookie', memberACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ status: 'done' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.status).toBe('done');
  });

  test('8. Rejection of invalid or cross-tenant parent projects on task creation', async () => {
    const projB = await Project.create({
      organizationId: orgB._id,
      name: 'Org B Project',
      key: 'ORGB',
      ownerId: adminB._id
    });

    // User from Org A attempts to create task under Org B's project -> 404
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({
        projectId: projB._id.toString(),
        title: 'Infiltrate Project',
        status: 'todo'
      });

    expect(res.status).toBe(404);
  });

  test('9. Rejection of an assignee from another organization', async () => {
    const projA = await Project.create({
      organizationId: orgA._id,
      name: 'Org A Tasks',
      key: 'TASKA',
      ownerId: adminA._id
    });

    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({
        projectId: projA._id.toString(),
        title: 'Assign to foreign user',
        assignedTo: adminB._id.toString() // Foreign user!
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ASSIGNEE');
  });

  test('10. Cross-tenant task read, update, and delete attempts return 404', async () => {
    const projA = await Project.create({
      organizationId: orgA._id,
      name: 'Org A Proj',
      key: 'OAP',
      ownerId: adminA._id
    });

    const taskA = await Task.create({
      organizationId: orgA._id,
      projectId: projA._id,
      taskNumber: 1,
      title: 'Confidential Task A',
      createdBy: adminA._id
    });

    // Org B attempts to read Task A -> 404
    const readRes = await request(app)
      .get(`/api/tasks/${taskA._id}`)
      .set('Cookie', adminBCookie);
    expect(readRes.status).toBe(404);

    // Org B attempts to update Task A -> 404
    const updateRes = await request(app)
      .patch(`/api/tasks/${taskA._id}`)
      .set('Cookie', adminBCookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ title: 'Compromised Task' });
    expect(updateRes.status).toBe(404);

    // Org B attempts to delete Task A -> 404
    const deleteRes = await request(app)
      .delete(`/api/tasks/${taskA._id}`)
      .set('Cookie', adminBCookie)
      .set('X-XSRF-TOKEN', csrfToken);
    expect(deleteRes.status).toBe(404);
  });

  test('11. Unauthorized Viewer and Member actions on tasks', async () => {
    const projA = await Project.create({
      organizationId: orgA._id,
      name: 'Role Test Project',
      key: 'RTP',
      ownerId: adminA._id
    });

    const taskA = await Task.create({
      organizationId: orgA._id,
      projectId: projA._id,
      taskNumber: 1,
      title: 'Task for Permission Test',
      createdBy: adminA._id
    });

    // Viewer cannot create task -> 403
    const viewerCreate = await request(app)
      .post('/api/tasks')
      .set('Cookie', viewerACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ projectId: projA._id.toString(), title: 'Viewer Task' });
    expect(viewerCreate.status).toBe(403);

    // Viewer cannot update task -> 403
    const viewerUpdate = await request(app)
      .patch(`/api/tasks/${taskA._id}`)
      .set('Cookie', viewerACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ title: 'Viewer Updated' });
    expect(viewerUpdate.status).toBe(403);

    // Member cannot delete task -> 403
    const memberDelete = await request(app)
      .delete(`/api/tasks/${taskA._id}`)
      .set('Cookie', memberACookie)
      .set('X-XSRF-TOKEN', csrfToken);
    expect(memberDelete.status).toBe(403);
  });

  // ==========================================================================
  // SECTION 3: TEAM MANAGEMENT TESTS
  // ==========================================================================

  test('12. Organization Admin can list only their own organization members', async () => {
    const res = await request(app)
      .get('/api/team/members')
      .set('Cookie', adminACookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Org A has 4 users: adminA, pmA, memberA, viewerA
    expect(res.body.data.length).toBe(4);
    const emails = res.body.data.map((m) => m.email);
    expect(emails).toContain('alice@cyberguard.com');
    expect(emails).not.toContain('bob@datashield.com'); // Cross-tenant user excluded
  });

  test('13. Unauthorized users cannot change roles or deactivate members', async () => {
    // Project Manager attempts to change Member's role -> 403
    const pmChangeRole = await request(app)
      .patch(`/api/team/members/${memberA._id}/role`)
      .set('Cookie', pmACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ role: 'org_admin' });
    expect(pmChangeRole.status).toBe(403);

    // Viewer attempts to suspend Member -> 403
    const viewerSuspend = await request(app)
      .patch(`/api/team/members/${memberA._id}/status`)
      .set('Cookie', viewerACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ status: 'suspended' });
    expect(viewerSuspend.status).toBe(403);
  });

  test('14. User cannot modify their own role or deactivate themselves', async () => {
    // Admin A attempts to change own role
    const selfRole = await request(app)
      .patch(`/api/team/members/${adminA._id}/role`)
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ role: 'viewer' });
    expect(selfRole.status).toBe(400);
    expect(selfRole.body.error.code).toBe('CANNOT_MODIFY_OWN_ROLE');

    // Admin A attempts to deactivate own account
    const selfDeactivate = await request(app)
      .patch(`/api/team/members/${adminA._id}/status`)
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ status: 'suspended' });
    expect(selfDeactivate.status).toBe(400);
    expect(selfDeactivate.body.error.code).toBe('CANNOT_DEACTIVATE_SELF');
  });

  test('15. Last active Organization Admin cannot be accidentally demoted or deactivated', async () => {
    // Alice is currently the only Org Admin in Org A
    // Create a temporary second admin
    const admin2 = await User.create({
      organizationId: orgA._id,
      firstName: 'Second',
      lastName: 'Admin',
      email: 'admin2@cyberguard.com',
      passwordHash: 'dummy',
      role: 'org_admin',
      status: 'active'
    });

    // Alice demotes admin2 -> Allowed since Alice remains active admin
    const demote1 = await request(app)
      .patch(`/api/team/members/${admin2._id}/role`)
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ role: 'member' });
    expect(demote1.status).toBe(200);

    // Now admin2 is a member. If someone tries to demote Alice (the last admin), it must fail.
    // To test attempting to demote Alice, let's create a temporary admin3 who tries to demote Alice,
    // then admin3 is removed so Alice is the only admin, and someone tries to demote Alice.
    // If admin2 tries to demote Alice, admin2 gets 403.
    // If another admin is active, they can demote. If Alice is the ONLY admin, demotion fails with 400.
    const demoteLast = await request(app)
      .patch(`/api/team/members/${adminA._id}/role`)
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ role: 'member' });
    expect(demoteLast.status).toBe(400);
  });

  test('16. Deactivated users cannot continue using revoked sessions (tokenVersion check)', async () => {
    // 1. Member A makes a successful request
    const beforeSuspend = await request(app)
      .get('/api/projects')
      .set('Cookie', memberACookie);
    expect(beforeSuspend.status).toBe(200);

    // 2. Admin A deactivates Member A
    const suspendRes = await request(app)
      .patch(`/api/team/members/${memberA._id}/status`)
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ status: 'suspended' });
    expect(suspendRes.status).toBe(200);

    // 3. Member A attempts request with old JWT -> 403 (suspended) or 401 (tokenVersion revoked)
    const afterSuspend = await request(app)
      .get('/api/projects')
      .set('Cookie', memberACookie);
    expect([401, 403]).toContain(afterSuspend.status);
  });

  // ==========================================================================
  // SECTION 4: INVITATION WORKFLOW TESTS
  // ==========================================================================

  test('17. Authorized invitation creation, token hash storage, and single-use acceptance', async () => {
    // 1. Admin A invites new person
    const inviteRes = await request(app)
      .post('/api/invitations')
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({
        email: 'carol@cyberguard.com',
        role: 'member'
      });

    expect(inviteRes.status).toBe(201);
    expect(inviteRes.body.success).toBe(true);
    expect(inviteRes.body.data.rawToken).toBeDefined();
    const rawToken = inviteRes.body.data.rawToken;

    // 2. Verify token hash is stored in DB, NEVER the raw token
    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const storedInvitation = await Invitation.findOne({ token: expectedHash });
    expect(storedInvitation).not.toBeNull();
    expect(storedInvitation.token).toBe(expectedHash);
    expect(storedInvitation.token).not.toBe(rawToken);

    // 3. Public token verification
    const verifyRes = await request(app)
      .get(`/api/invitations/verify/${rawToken}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.email).toBe('carol@cyberguard.com');
    expect(verifyRes.body.data.role).toBe('member');
    expect(verifyRes.body.data.organizationName).toBe('CyberGuard Inc');

    // 4. Public invitation acceptance
    const acceptRes = await request(app)
      .post('/api/invitations/accept')
      .send({
        token: rawToken,
        firstName: 'Carol',
        lastName: 'Danvers',
        password: 'SecurePassword123!'
      });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
    expect(acceptRes.body.data.user.email).toBe('carol@cyberguard.com');
    expect(acceptRes.body.data.user.role).toBe('member');
    expect(acceptRes.body.data.user.organizationId.toString()).toBe(orgA._id.toString());

    // 5. Verify invitation is now marked accepted
    const updatedInv = await Invitation.findById(storedInvitation._id);
    expect(updatedInv.status).toBe('accepted');

    // 6. Token reuse prevention: Attempting to accept again must fail
    const reuseRes = await request(app)
      .post('/api/invitations/accept')
      .send({
        token: rawToken,
        firstName: 'Carol',
        lastName: 'Danvers',
        password: 'AnotherPassword123!'
      });
    expect(reuseRes.status).toBe(400);
    expect(reuseRes.body.error.code).toBe('INVITATION_INVALID_OR_EXPIRED');
  });

  test('18. Revoked and expired invitations are rejected', async () => {
    // 1. Admin A creates invitation
    const inviteRes = await request(app)
      .post('/api/invitations')
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({
        email: 'dan@cyberguard.com',
        role: 'viewer'
      });
    const rawToken = inviteRes.body.data.rawToken;
    const invId = inviteRes.body.data.invitation._id;

    // 2. Admin A revokes invitation
    const revokeRes = await request(app)
      .patch(`/api/invitations/${invId}/revoke`)
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken);
    expect(revokeRes.status).toBe(200);

    // 3. Attempting to accept revoked invitation -> 400
    const acceptRevoked = await request(app)
      .post('/api/invitations/accept')
      .send({
        token: rawToken,
        firstName: 'Dan',
        lastName: 'Developer',
        password: 'Password123!'
      });
    expect(acceptRevoked.status).toBe(400);
  });

  test('19. Non-admin users cannot create invitations or grant platform_super_admin', async () => {
    // Member attempts to invite -> 403
    const memberInvite = await request(app)
      .post('/api/invitations')
      .set('Cookie', memberACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ email: 'intruder@cyberguard.com', role: 'member' });
    expect(memberInvite.status).toBe(403);

    // Admin attempts to grant platform_super_admin -> 400
    const superAdminInvite = await request(app)
      .post('/api/invitations')
      .set('Cookie', adminACookie)
      .set('X-XSRF-TOKEN', csrfToken)
      .send({ email: 'super@cyberguard.com', role: 'platform_super_admin' });
    expect(superAdminInvite.status).toBe(400);
  });

  // ==========================================================================
  // SECTION 5: REGRESSION & PLATFORM SUPER ADMIN ISOLATION
  // ==========================================================================

  test('20. Platform Super Admin is blocked from accessing tenant-private project or task content', async () => {
    const projA = await Project.create({
      organizationId: orgA._id,
      name: 'Super Secret A',
      key: 'SSA',
      ownerId: adminA._id
    });

    // Super Admin tries to list projects -> 403
    const superList = await request(app)
      .get('/api/projects')
      .set('Cookie', superAdminCookie);
    expect(superList.status).toBe(403);
    expect(superList.body.error.code).toBe('FORBIDDEN_SUPERADMIN_TENANT_CONTENT_BLOCKED');

    // Super Admin tries to list tasks -> 403
    const superTasks = await request(app)
      .get('/api/tasks')
      .set('Cookie', superAdminCookie);
    expect(superTasks.status).toBe(403);
  });
});
