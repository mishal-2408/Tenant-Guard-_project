/**
 * OpenAPI 3.0 Specification for TenantGuard Secure Multi-Tenant Workspace API
 * Accurately reflects all implemented endpoints from Stages 1-6.
 */
export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'TenantGuard Multi-Tenant Workspace & Security API',
    version: '1.0.0',
    description: `
**TenantGuard** is a secure multi-tenant SaaS workspace platform providing organization data boundary isolation, Role-Based Access Control (RBAC), TOTP multi-factor authentication, append-only audit telemetry, automated alert aggregation, and a live deterministic isolation verification engine.

### Core Security Guarantees:
- **Server-Derived Tenancy:** Every request extracts the tenant context strictly from verified server-side session credentials. Untrusted client-supplied tenant identifiers in headers, query parameters, or request bodies are actively stripped and logged.
- **Anti-Enumeration Protection:** Requests targeting resources owned by other organizations return generic \`404 Not Found\` status codes, preventing attackers from discovering resource existence.
- **Cryptographic MFA:** Time-based one-time password (TOTP) secrets are encrypted at rest with AES-256-GCM.
- **Platform Super Admin Decoupling:** Super Admins can manage tenants and global billing but are strictly blocked from accessing private tenant projects and tasks.
    `,
    contact: {
      name: 'TenantGuard Security Team',
      email: 'security@tenantguard.local'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server'
    }
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'tenantguard_auth',
        description: 'Signed HTTP-only cryptographic JWT session cookie.'
      },
      csrfToken: {
        type: 'apiKey',
        in: 'header',
        name: 'X-XSRF-TOKEN',
        description: 'Cross-Site Request Forgery (CSRF) protection token provided in the XSRF-TOKEN cookie.'
      }
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'RESOURCE_NOT_FOUND' },
              message: { type: 'string', example: 'The requested resource was not found.' },
              details: { type: 'object' }
            }
          }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '66a01234567890abcdef1234' },
          email: { type: 'string', example: 'alice.admin@cybercorp.demo' },
          firstName: { type: 'string', example: 'Alice' },
          lastName: { type: 'string', example: 'Smith' },
          role: { 
            type: 'string', 
            enum: ['org_admin', 'project_manager', 'member', 'viewer'],
            example: 'org_admin' 
          },
          organizationId: { type: 'string', example: '66a01234567890abcdef1000' },
          status: { type: 'string', enum: ['active', 'suspended', 'deactivated'], example: 'active' },
          mfaEnabled: { type: 'boolean', example: true }
        }
      },
      Organization: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '66a01234567890abcdef1000' },
          name: { type: 'string', example: 'CyberCorp' },
          slug: { type: 'string', example: 'cybercorp' },
          plan: { type: 'string', enum: ['free', 'pro', 'enterprise'], example: 'pro' },
          status: { type: 'string', enum: ['active', 'suspended'], example: 'active' },
          settings: {
            type: 'object',
            properties: {
              enforceMfa: { type: 'boolean', example: false }
            }
          }
        }
      },
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '66a01234567890abcdef2000' },
          organizationId: { type: 'string', example: '66a01234567890abcdef1000' },
          name: { type: 'string', example: 'Perimeter Defense Initiative' },
          key: { type: 'string', example: 'PERIM' },
          description: { type: 'string', example: 'Zero-trust perimeter architecture overhaul.' },
          status: { type: 'string', enum: ['active', 'archived'], example: 'active' },
          ownerId: { type: 'string', example: '66a01234567890abcdef1234' },
          taskCount: { type: 'integer', example: 5 }
        }
      },
      Task: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '66a01234567890abcdef3000' },
          organizationId: { type: 'string', example: '66a01234567890abcdef1000' },
          projectId: { type: 'string', example: '66a01234567890abcdef2000' },
          taskNumber: { type: 'integer', example: 1 },
          taskKey: { type: 'string', example: 'PERIM-1' },
          title: { type: 'string', example: 'Deploy Envoy Gateway' },
          description: { type: 'string', example: 'Configure mTLS egress rules.' },
          status: { type: 'string', enum: ['todo', 'in_progress', 'completed'], example: 'in_progress' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'], example: 'high' },
          assignedTo: { type: 'string', nullable: true, example: '66a01234567890abcdef1234' },
          creatorId: { type: 'string', example: '66a01234567890abcdef1234' }
        }
      },
      AuditLog: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '66a01234567890abcdef4000' },
          organizationId: { type: 'string', example: '66a01234567890abcdef1000' },
          actorId: { type: 'string', example: '66a01234567890abcdef1234' },
          actorEmail: { type: 'string', example: 'alice.admin@cybercorp.demo' },
          actorRole: { type: 'string', example: 'org_admin' },
          action: { type: 'string', example: 'PROJECT_CREATED' },
          category: { type: 'string', example: 'project_management' },
          severity: { type: 'string', enum: ['info', 'warning', 'high', 'critical'], example: 'info' },
          status: { type: 'string', enum: ['success', 'failure', 'denied'], example: 'success' },
          targetResource: { type: 'string', example: 'Project' },
          targetResourceId: { type: 'string', example: '66a01234567890abcdef2000' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      SecurityAlert: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '66a01234567890abcdef5000' },
          organizationId: { type: 'string', example: '66a01234567890abcdef1000' },
          eventType: { type: 'string', example: 'BRUTE_FORCE_LOCKOUT' },
          severity: { type: 'string', enum: ['warning', 'high', 'critical'], example: 'high' },
          title: { type: 'string', example: 'Account Locked Due to Multiple Failed Logins' },
          description: { type: 'string', example: 'Account locked for 15 minutes.' },
          eventCount: { type: 'integer', example: 5 },
          status: { type: 'string', enum: ['open', 'acknowledged', 'resolved'], example: 'open' },
          firstSeenAt: { type: 'string', format: 'date-time' },
          lastSeenAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  },
  paths: {
    // ------------------------------------------------------------------------
    // HEALTH & ROOT
    // ------------------------------------------------------------------------
    '/': {
      get: {
        summary: 'Root API Discovery',
        description: 'Returns API metadata, health link, and Swagger documentation URI.',
        responses: {
          200: {
            description: 'API information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'TenantGuard API' },
                    version: { type: 'string', example: '1.0.0' },
                    documentation: { type: 'string', example: '/api/docs' },
                    health: { type: 'string', example: '/api/health' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/health': {
      get: {
        summary: 'System Health Check',
        description: 'Checks database connectivity and server liveness status.',
        responses: {
          200: {
            description: 'System operational',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'UP' },
                    timestamp: { type: 'string', format: 'date-time' },
                    services: {
                      type: 'object',
                      properties: {
                        database: { type: 'string', example: 'CONNECTED' },
                        uptime: { type: 'number', example: 120.4 }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },

    // ------------------------------------------------------------------------
    // AUTHENTICATION & SESSIONS
    // ------------------------------------------------------------------------
    '/api/auth/register': {
      post: {
        summary: 'Register New Tenant Organization',
        description: 'Creates a new organization, root Organization Admin user, and sets initial session cookies.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['organizationName', 'slug', 'firstName', 'lastName', 'email', 'password'],
                properties: {
                  organizationName: { type: 'string', example: 'CyberCorp' },
                  slug: { type: 'string', example: 'cybercorp' },
                  firstName: { type: 'string', example: 'Alice' },
                  lastName: { type: 'string', example: 'Smith' },
                  email: { type: 'string', format: 'email', example: 'alice@cybercorp.demo' },
                  password: { type: 'string', format: 'password', example: 'SecurePassword123!' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Organization and admin account successfully created.' },
          409: { description: 'Slug or user email already registered.' },
          429: { description: 'Rate limit exceeded.' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        summary: 'User Password Authentication',
        description: 'Authenticates with email and password. If MFA is enabled, returns a restricted pre-auth challenge token without establishing full session cookies.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'alice.admin@cybercorp.demo' },
                  password: { type: 'string', format: 'password', example: 'DemoPassword123!' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Login successful or MFA challenge issued.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    mfaRequired: { type: 'boolean', example: false },
                    mfaToken: { type: 'string', nullable: true },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        organization: { $ref: '#/components/schemas/Organization' }
                      }
                    }
                  }
                }
              }
            }
          },
          401: { description: 'Invalid email or password.' },
          429: { description: 'Account locked due to 5 consecutive failures, or rate limit exceeded.' }
        }
      }
    },
    '/api/auth/logout': {
      post: {
        summary: 'Terminate Session & Invalidate Tokens',
        description: 'Terminates active session, increments tokenVersion in MongoDB, and clears HTTP-only session cookies.',
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        responses: {
          200: { description: 'Successfully logged out and session cleared.' },
          401: { description: 'Authentication required.' }
        }
      }
    },
    '/api/auth/me': {
      get: {
        summary: 'Get Verified Session Identity',
        description: 'Returns authenticated user and tenant organization context derived exclusively from verified session cookies.',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: 'Current session user metadata',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        organization: { $ref: '#/components/schemas/Organization' }
                      }
                    }
                  }
                }
              }
            }
          },
          401: { description: 'Missing or expired session cookie.' }
        }
      }
    },

    // ------------------------------------------------------------------------
    // MULTI-FACTOR AUTHENTICATION (TOTP)
    // ------------------------------------------------------------------------
    '/api/auth/mfa/setup': {
      post: {
        summary: 'Initialize TOTP MFA Enrollment',
        description: 'Generates a 32-byte secret key and QR code data URL. Encrypts secret at rest with AES-256-GCM. MFA remains pending until verified.',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: 'MFA setup provisioning data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        secret: { type: 'string', example: 'JBSWY3DPEHPK3PXP' },
                        qrCodeDataUrl: { type: 'string', example: 'data:image/png;base64,...' },
                        issuer: { type: 'string', example: 'TenantGuard' }
                      }
                    }
                  }
                }
              }
            }
          },
          401: { description: 'Authentication required.' }
        }
      }
    },
    '/api/auth/mfa/verify-setup': {
      post: {
        summary: 'Verify and Activate TOTP MFA',
        description: 'Verifies the initial 6-digit TOTP code and marks the user account as mfaEnabled: true.',
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: {
                  token: { type: 'string', example: '123456', minLength: 6, maxLength: 6 }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'MFA successfully enabled.' },
          400: { description: 'Invalid or expired TOTP code.' }
        }
      }
    },
    '/api/auth/mfa/verify-login': {
      post: {
        summary: 'Complete MFA Login Challenge',
        description: 'Exchanges restricted pre-auth challenge token and valid 6-digit TOTP code for full session cookies.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['mfaToken', 'token'],
                properties: {
                  mfaToken: { type: 'string', description: 'Restricted pre-auth JWT' },
                  token: { type: 'string', example: '123456', minLength: 6, maxLength: 6 }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'MFA challenge verified; session cookies established.' },
          400: { description: 'Invalid TOTP code or expired challenge token.' }
        }
      }
    },
    '/api/auth/mfa/disable': {
      post: {
        summary: 'Disable Two-Factor Authentication',
        description: 'Requires current account password and valid 6-digit TOTP code to deactivate MFA.',
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password', 'token'],
                properties: {
                  password: { type: 'string', format: 'password' },
                  token: { type: 'string', example: '123456' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'MFA successfully disabled.' },
          400: { description: 'Incorrect password or invalid TOTP code.' }
        }
      }
    },

    // ------------------------------------------------------------------------
    // PROJECTS (TENANT-SCOPED & RBAC)
    // ------------------------------------------------------------------------
    '/api/projects': {
      get: {
        summary: 'List Tenant Projects',
        description: 'Returns all projects belonging strictly to the authenticated tenant organization.',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: 'List of tenant projects',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Project' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create Project',
        description: 'Creates a new project strictly bound to the authenticated organization. Restricted to Org Admin and Project Manager roles.',
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'key'],
                properties: {
                  name: { type: 'string', example: 'Cloud Migration' },
                  key: { type: 'string', example: 'CLOUD' },
                  description: { type: 'string', example: 'Migrating legacy servers to Kubernetes.' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Project successfully created.' },
          403: { description: 'Viewer and Member roles are denied project creation.' }
        }
      }
    },
    '/api/projects/{id}': {
      get: {
        summary: 'Get Project by ID',
        description: 'Retrieves a single project by ID. Returns 404 if the project belongs to another tenant (Anti-Enumeration).',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Project details' },
          404: { description: 'Project not found (returns 404 for cross-tenant IDs).' }
        }
      },
      patch: {
        summary: 'Update Project',
        description: 'Updates project attributes. Restricted to Org Admin and Project Manager (Project Owner).',
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  status: { type: 'string', enum: ['active', 'archived'] }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Project updated.' },
          403: { description: 'Insufficient RBAC permissions.' },
          404: { description: 'Project not found.' }
        }
      },
      delete: {
        summary: 'Delete Project',
        description: 'Deletes a project and cascades deletion to child tasks. Restricted exclusively to Organization Admins.',
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Project deleted.' },
          403: { description: 'Forbidden. Only Organization Admins can delete projects.' },
          404: { description: 'Project not found.' }
        }
      }
    },

    // ------------------------------------------------------------------------
    // TASKS (TENANT-SCOPED & RBAC)
    // ------------------------------------------------------------------------
    '/api/tasks': {
      get: {
        summary: 'List Tenant Tasks',
        description: 'Returns filterable tasks within the organization.',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['todo', 'in_progress', 'completed'] } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high'] } }
        ],
        responses: {
          200: { description: 'List of tenant tasks' }
        }
      },
      post: {
        summary: 'Create Task',
        description: 'Creates a task under a verified tenant project. Restricted to Org Admin, PM, and Member (Viewers are denied).',
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['projectId', 'title'],
                properties: {
                  projectId: { type: 'string' },
                  title: { type: 'string', example: 'Setup SSL certificates' },
                  description: { type: 'string' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
                  assignedTo: { type: 'string', nullable: true }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Task created.' },
          403: { description: 'Forbidden. Viewers cannot create tasks.' },
          404: { description: 'Target project does not exist within tenant.' }
        }
      }
    },
    '/api/tasks/{id}': {
      get: {
        summary: 'Get Task by ID',
        description: 'Retrieves task details strictly scoped to tenant context.',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Task details' },
          404: { description: 'Task not found.' }
        }
      },
      patch: {
        summary: 'Update Task',
        description: 'Updates task status, assignment, or priority. Viewers are denied.',
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Task updated.' },
          403: { description: 'Viewers cannot modify tasks.' },
          404: { description: 'Task not found.' }
        }
      },
      delete: {
        summary: 'Delete Task',
        description: 'Deletes a task. Restricted to Org Admin and Project Manager roles.',
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Task deleted.' },
          403: { description: 'Members and Viewers cannot delete tasks.' },
          404: { description: 'Task not found.' }
        }
      }
    },

    // ------------------------------------------------------------------------
    // TEAM & USER MANAGEMENT
    // ------------------------------------------------------------------------
    '/api/team/members': {
      get: {
        summary: 'List Organization Members',
        description: 'Retrieves all users belonging to the active organization.',
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: 'List of organization members.' }
        }
      }
    },
    '/api/team/members/{id}/role': {
      patch: {
        summary: 'Change User Role',
        description: 'Modifies member role. Restricted exclusively to Organization Admins. Prevents self-demoting the last Org Admin.',
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: {
                  role: { type: 'string', enum: ['org_admin', 'project_manager', 'member', 'viewer'] }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Role updated successfully.' },
          403: { description: 'Only Organization Admins can modify roles.' },
          404: { description: 'Member not found in organization.' }
        }
      }
    },
    '/api/team/members/{id}/status': {
      patch: {
        summary: 'Change Member Account Status',
        description: 'Suspends or reactivates a user account. Restricted to Org Admins.',
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['active', 'suspended', 'deactivated'] }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Member status updated.' },
          403: { description: 'Forbidden.' }
        }
      }
    },

    // ------------------------------------------------------------------------
    // INVITATIONS
    // ------------------------------------------------------------------------
    '/api/invitations': {
      get: {
        summary: 'List Organization Invitations',
        description: 'Returns all pending and historic invitations. Restricted to Organization Admins.',
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: 'List of invitations.' },
          403: { description: 'Forbidden. Non-admin roles cannot inspect invitations.' }
        }
      },
      post: {
        summary: 'Create and Issue Invitation',
        description: 'Generates a secure 24-hour invitation token. Only the SHA-256 hash of the token is saved in the database.',
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'role'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  role: { type: 'string', enum: ['org_admin', 'project_manager', 'member', 'viewer'] }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Invitation created.' },
          409: { description: 'User already a member of this organization.' }
        }
      }
    },
    '/api/invitations/{id}': {
      delete: {
        summary: 'Revoke Invitation',
        description: 'Revokes a pending invitation. Restricted to Org Admins.',
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Invitation revoked.' }
        }
      }
    },
    '/api/invitations/validate/{token}': {
      get: {
        summary: 'Validate Public Invitation Token',
        description: 'Validates a raw invitation token against its SHA-256 hash. Returns tenant name, email, and role for registration preview.',
        parameters: [
          { name: 'token', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Token is valid.' },
          400: { description: 'Token expired or revoked.' },
          404: { description: 'Token not found.' }
        }
      }
    },
    '/api/invitations/accept': {
      post: {
        summary: 'Accept Invitation & Complete Registration',
        description: 'Single-use acceptance of an invitation token, creating the user account within the inviting tenant.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'firstName', 'lastName', 'password'],
                properties: {
                  token: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  password: { type: 'string', format: 'password' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Invitation accepted and account registered.' },
          400: { description: 'Invalid or already consumed invitation token.' }
        }
      }
    },

    // ------------------------------------------------------------------------
    // SECURITY CENTER, AUDIT LOGS, ALERTS & LIVE ISOLATION
    // ------------------------------------------------------------------------
    '/api/security/summary': {
      get: {
        summary: 'Get Security Center Summary Telemetry',
        description: 'Retrieves high-level posture metrics (audits count, open alerts, MFA adoption %, boundary status). Restricted to Org Admins.',
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: 'Security summary telemetry data.' },
          403: { description: 'Forbidden. Non-admins cannot access Security Center.' }
        }
      }
    },
    '/api/security/audit-logs': {
      get: {
        summary: 'Query Scoped Audit Logs',
        description: 'Returns filterable, paginated audit records strictly scoped to authenticated tenant organization.',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string', enum: ['auth', 'project_management', 'user_management', 'security_violation'] } },
          { name: 'severity', in: 'query', schema: { type: 'string', enum: ['info', 'warning', 'high', 'critical'] } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['success', 'failure', 'denied'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 15 } }
        ],
        responses: {
          200: { description: 'Paginated audit log entries.' }
        }
      }
    },
    '/api/security/audit-logs/export': {
      get: {
        summary: 'Export Audit Logs to CSV',
        description: 'Streams filtered tenant audit logs as a downloadable CSV file (capped at 1,000 entries). Restricted to Org Admins.',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: 'CSV file download',
            content: {
              'text/csv': {
                schema: { type: 'string', format: 'binary' }
              }
            }
          }
        }
      }
    },
    '/api/security/alerts': {
      get: {
        summary: 'List Security Incident Alerts',
        description: 'Retrieves aggregated security incident alerts with 15-minute window correlation. Restricted to Org Admins.',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'acknowledged', 'resolved'] } },
          { name: 'severity', in: 'query', schema: { type: 'string', enum: ['warning', 'high', 'critical'] } }
        ],
        responses: {
          200: { description: 'List of security alerts.' }
        }
      }
    },
    '/api/security/alerts/{id}/status': {
      patch: {
        summary: 'Update Security Alert Status',
        description: 'Acknowledge or resolve an open security incident alert. Action is audited with actor details.',
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['open', 'acknowledged', 'resolved'] }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Alert status updated.' },
          404: { description: 'Alert not found in tenant context.' }
        }
      }
    },
    '/api/security/mfa-policy': {
      patch: {
        summary: 'Toggle Organization-Wide MFA Policy',
        description: 'Configures mandatory TOTP MFA requirement for all workspace members. Restricted to Org Admins.',
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['enforceMfa'],
                properties: {
                  enforceMfa: { type: 'boolean' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Policy updated.' }
        }
      }
    },
    '/api/security/run-isolation-test': {
      post: {
        summary: 'Execute Live Synthetic Isolation Suite',
        description: 'Executes 10 real backend requests against designated synthetic demo tenants (Synthetic Corp A & Synthetic Shield B). Real customer data is never touched.',
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        responses: {
          200: {
            description: 'Deterministic test results for all 10 security scenarios.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        testRunId: { type: 'string', example: 'iso-1729330000000' },
                        summary: {
                          type: 'object',
                          properties: {
                            total: { type: 'integer', example: 10 },
                            passed: { type: 'integer', example: 10 },
                            failed: { type: 'integer', example: 0 }
                          }
                        },
                        results: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              scenario: { type: 'integer', example: 1 },
                              title: { type: 'string', example: 'Authorized Tenant Resource Access' },
                              action: { type: 'string', example: 'GET /api/projects' },
                              expected: { type: 'string', example: '200 OK' },
                              observed: { type: 'string', example: '200 OK' },
                              status: { type: 'string', enum: ['PASS', 'FAIL'], example: 'PASS' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

export default openapiSpec;
