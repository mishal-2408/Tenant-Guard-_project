import mongoose from 'mongoose';

const securityEventSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null, // Nullable for platform-wide threats
      index: true
    },
    eventType: {
      type: String,
      required: [true, 'Security event type is required'],
      enum: {
        values: [
          'ISOLATION_BREACH_ATTEMPT',
          'BRUTE_FORCE_LOCKOUT',
          'MFA_DISABLED',
          'SUSPICIOUS_TOKEN_REUSE',
          'UNAUTHORIZED_CROSS_TENANT_PROBE',
          'CROSS_TENANT_ACCESS_DENIED',
          'RBAC_ACCESS_DENIED'
        ],
        message: '{VALUE} is not a valid security event type'
      }
    },
    severity: {
      type: String,
      enum: {
        values: ['warning', 'high', 'critical'],
        message: '{VALUE} is not a valid severity level'
      },
      default: 'warning'
    },
    title: {
      type: String,
      required: [true, 'Alert title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Alert description is required'],
      trim: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {} // Safe event metadata only (no passwords, raw secrets, or auth tokens)
    },
    status: {
      type: String,
      enum: {
        values: ['open', 'acknowledged', 'resolved'],
        message: '{VALUE} is not a valid alert status'
      },
      default: 'open'
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
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

// Compound Indexes for Fast Incident Management
// 1. Unresolved security events stream for an organization
securityEventSchema.index({ organizationId: 1, status: 1, createdAt: -1 });

// 2. High severity alerts within an organization
securityEventSchema.index({ organizationId: 1, severity: 1 });

export const SecurityEvent = mongoose.model('SecurityEvent', securityEventSchema);
export default SecurityEvent;
