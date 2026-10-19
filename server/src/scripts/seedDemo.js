import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { PlatformAdmin } from '../models/PlatformAdmin.js';
import { AuditLog } from '../models/AuditLog.js';
import { SecurityEvent } from '../models/SecurityEvent.js';
import { hashPassword } from '../utils/password.util.js';

dotenv.config();

const runSeed = async () => {
  // Safety Guard: Refuse to run in production environments
  if (process.env.NODE_ENV === 'production') {
    console.error('[ERROR]: Demo seeding is prohibited in production environments.');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tenantguard';
  console.log(`[SEED]: Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  const demoPassword = process.env.DEMO_USER_PASSWORD || 'DemoPassword123!';
  const passwordHash = await hashPassword(demoPassword);

  console.log('\n--- Seeding TenantGuard Demo Environment ---');

  // 1. Seed Synthetic Organization A: CyberCorp
  let orgA = await Organization.findOne({ slug: 'cybercorp-demo' });
  if (!orgA) {
    orgA = await Organization.create({
      name: 'CyberCorp (Demo Org A)',
      slug: 'cybercorp-demo',
      plan: 'enterprise',
      status: 'active',
      settings: { enforceMfa: false }
    });
    console.log(`[+] Created Organization A: ${orgA.name} (${orgA.slug})`);
  } else {
    console.log(`[*] Organization A already exists: ${orgA.name}`);
  }

  // 2. Seed Synthetic Organization B: ApexShield
  let orgB = await Organization.findOne({ slug: 'apexshield-demo' });
  if (!orgB) {
    orgB = await Organization.create({
      name: 'ApexShield (Demo Org B)',
      slug: 'apexshield-demo',
      plan: 'pro',
      status: 'active',
      settings: { enforceMfa: false }
    });
    console.log(`[+] Created Organization B: ${orgB.name} (${orgB.slug})`);
  } else {
    console.log(`[*] Organization B already exists: ${orgB.name}`);
  }

  // Helper to seed user idempotently
  const seedUser = async (orgId, firstName, lastName, email, role) => {
    let user = await User.findOne({ organizationId: orgId, email });
    if (!user) {
      user = await User.create({
        organizationId: orgId,
        firstName,
        lastName,
        email,
        passwordHash,
        role,
        status: 'active',
        mfaEnabled: false
      });
      console.log(`  [+] Created User: ${email} (${role})`);
    } else {
      console.log(`  [*] User already exists: ${email}`);
    }
    return user;
  };

  console.log('\n--- Seeding Organization A Users ---');
  const adminA = await seedUser(orgA._id, 'Alice', 'Admin', 'alice.admin@cybercorp.demo', 'org_admin');
  const pmA = await seedUser(orgA._id, 'Bob', 'Manager', 'bob.pm@cybercorp.demo', 'project_manager');
  const memberA = await seedUser(orgA._id, 'Charlie', 'Developer', 'charlie.dev@cybercorp.demo', 'member');
  const viewerA = await seedUser(orgA._id, 'Diana', 'Auditor', 'diana.viewer@cybercorp.demo', 'viewer');

  console.log('\n--- Seeding Organization B Users ---');
  const adminB = await seedUser(orgB._id, 'Eve', 'Admin', 'eve.admin@apexshield.demo', 'org_admin');
  const pmB = await seedUser(orgB._id, 'Frank', 'Manager', 'frank.pm@apexshield.demo', 'project_manager');
  const memberB = await seedUser(orgB._id, 'Grace', 'Developer', 'grace.dev@apexshield.demo', 'member');
  const viewerB = await seedUser(orgB._id, 'Heidi', 'Auditor', 'heidi.viewer@apexshield.demo', 'viewer');

  console.log('\n--- Seeding Platform Super Admin (Decoupled) ---');
  let superAdmin = await PlatformAdmin.findOne({ email: 'superadmin@tenantguard.demo' });
  if (!superAdmin) {
    superAdmin = await PlatformAdmin.create({
      fullName: 'TenantGuard Platform Administrator',
      email: 'superadmin@tenantguard.demo',
      passwordHash,
      role: 'platform_super_admin',
      status: 'active'
    });
    console.log(`[+] Created Platform Super Admin: ${superAdmin.email}`);
  } else {
    console.log(`[*] Platform Super Admin already exists: ${superAdmin.email}`);
  }

  console.log('\n--- Seeding Demo Projects and Tasks ---');
  // Org A Projects
  let projA = await Project.findOne({ organizationId: orgA._id, key: 'CYBER' });
  if (!projA) {
    projA = await Project.create({
      organizationId: orgA._id,
      name: 'Cloud Perimeter & Zero-Trust Architecture',
      key: 'CYBER',
      description: 'Strategic zero-trust network implementation for multi-cloud workloads.',
      status: 'active',
      ownerId: adminA._id,
      members: [pmA._id, memberA._id]
    });
    console.log(`[+] Created Org A Project: ${projA.name} (${projA.key})`);

    // Org A Tasks
    await Task.create([
      {
        organizationId: orgA._id,
        projectId: projA._id,
        taskNumber: 1,
        title: 'Design Zero-Trust Identity Federation',
        description: 'Implement OIDC claim translation and short-lived session lifetimes.',
        status: 'in_progress',
        priority: 'high',
        assignedTo: memberA._id,
        createdBy: adminA._id
      },
      {
        organizationId: orgA._id,
        projectId: projA._id,
        taskNumber: 2,
        title: 'Verify TenantGuard Isolation Probes',
        description: 'Audit database queries for strict organizationId scoping.',
        status: 'done',
        priority: 'urgent',
        assignedTo: pmA._id,
        createdBy: adminA._id
      },
      {
        organizationId: orgA._id,
        projectId: projA._id,
        taskNumber: 3,
        title: 'Configure Role-Based Access Control Gates',
        description: 'Prevent Viewer roles from submitting mutating workspace requests.',
        status: 'todo',
        priority: 'medium',
        assignedTo: null,
        createdBy: adminA._id
      }
    ]);
    console.log(`  [+] Created 3 tasks under ${projA.key}`);
  }

  // Org B Projects
  let projB = await Project.findOne({ organizationId: orgB._id, key: 'APEX' });
  if (!projB) {
    projB = await Project.create({
      organizationId: orgB._id,
      name: 'Shield Perimeter Egress Filtering',
      key: 'APEX',
      description: 'Distributed sensor infrastructure to filter rogue lateral movement.',
      status: 'active',
      ownerId: adminB._id,
      members: [pmB._id, memberB._id]
    });
    console.log(`[+] Created Org B Project: ${projB.name} (${projB.key})`);

    await Task.create([
      {
        organizationId: orgB._id,
        projectId: projB._id,
        taskNumber: 1,
        title: 'Deploy Distributed WAF Sensor Cluster',
        description: 'Egress filtering and automated anomaly detection.',
        status: 'in_progress',
        priority: 'urgent',
        assignedTo: memberB._id,
        createdBy: adminB._id
      },
      {
        organizationId: orgB._id,
        projectId: projB._id,
        taskNumber: 2,
        title: 'Audit Ingress Security Headers',
        description: 'Verify CSP, HSTS, and X-Content-Type-Options across all endpoints.',
        status: 'todo',
        priority: 'low',
        assignedTo: null,
        createdBy: adminB._id
      }
    ]);
    console.log(`  [+] Created 2 tasks under ${projB.key}`);
  }

  console.log('\n--- Seeding Initial Security Telemetry & Alerts ---');
  // Seed sample security events for Org A so Security Center exhibits telemetry
  const sampleEventsA = await SecurityEvent.countDocuments({ organizationId: orgA._id });
  if (sampleEventsA === 0) {
    await SecurityEvent.create([
      {
        organizationId: orgA._id,
        eventType: 'UNAUTHORIZED_CROSS_TENANT_PROBE',
        severity: 'high',
        title: 'Tenant ID Spoofing Intercepted',
        description: 'Client attempted to override authenticated tenant context with foreign organization ID.',
        eventCount: 2,
        status: 'open',
        metadata: { clientOrgAttempt: '65b40c2198e...' }
      },
      {
        organizationId: orgA._id,
        eventType: 'RBAC_ACCESS_DENIED',
        severity: 'warning',
        title: 'Unauthorized Administrative Action Attempted',
        description: 'Viewer role attempted to alter organization settings.',
        eventCount: 3,
        status: 'open',
        metadata: { attemptedPath: '/api/security/mfa-policy', userRole: 'viewer' }
      }
    ]);
    console.log(`[+] Seeded initial security alerts for ${orgA.name}`);
  }

  console.log('\n======================================================');
  console.log('✓ TenantGuard Demo Environment Successfully Seeded!');
  console.log('======================================================');
  console.log(`Default Demo Password: ${demoPassword}`);
  console.log('\n--- Organization A: CyberCorp ---');
  console.log('  Org Admin:       alice.admin@cybercorp.demo');
  console.log('  Project Manager: bob.pm@cybercorp.demo');
  console.log('  Member:          charlie.dev@cybercorp.demo');
  console.log('  Viewer:          diana.viewer@cybercorp.demo');
  console.log('\n--- Organization B: ApexShield (Isolated Tenant) ---');
  console.log('  Org Admin:       eve.admin@apexshield.demo');
  console.log('  Project Manager: frank.pm@apexshield.demo');
  console.log('  Member:          grace.dev@apexshield.demo');
  console.log('  Viewer:          heidi.viewer@apexshield.demo');
  console.log('\n--- Platform Super Admin (Decoupled Platform Admin) ---');
  console.log('  Super Admin:     superadmin@tenantguard.demo');
  console.log('======================================================\n');

  await mongoose.disconnect();
};

runSeed().catch((err) => {
  console.error('[SEED FAILED]:', err);
  process.exit(1);
});
