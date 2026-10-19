import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null, // Nullable to support platform-level system actions
      index: true
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    actorEmail: {
      type: String,
      required: [true, 'Actor email is required'],
      trim: true
    },
    actorRole: {
      type: String,
      required: [true, 'Actor role is required'],
      trim: true
    },
    action: {
      type: String,
      required: [true, 'Action name is required'],
      trim: true
    },
    category: {
      type: String,
      enum: {
        values: ['auth', 'access_control', 'data_mutation', 'security_violation', 'system'],
        message: '{VALUE} is not a valid audit category'
      },
      default: 'data_mutation'
    },
    severity: {
      type: String,
      enum: {
        values: ['info', 'warning', 'high', 'critical'],
        message: '{VALUE} is not a valid severity level'
      },
      default: 'info'
    },
    targetResource: {
      type: String,
      trim: true,
      default: ''
    },
    targetResourceId: {
      type: String,
      trim: true,
      default: ''
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      trim: true,
      default: ''
    },
    userAgent: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: {
        values: ['success', 'denied', 'failed'],
        message: '{VALUE} is not a valid audit status'
      },
      default: 'success'
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound Indexes for Fast Telemetry Querying
// 1. Chronological query for organization audit trail
auditLogSchema.index({ organizationId: 1, createdAt: -1 });

// 2. High severity security audits within an organization
auditLogSchema.index({ organizationId: 1, severity: 1, createdAt: -1 });

// 3. Category-filtered audit queries within an organization
auditLogSchema.index({ organizationId: 1, category: 1 });

// 4. Activity history of a specific user/actor
auditLogSchema.index({ actorId: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
