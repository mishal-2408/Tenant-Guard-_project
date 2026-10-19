import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization reference is required for tenant users'],
      index: true
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Never returned in default queries
    },
    role: {
      type: String,
      enum: {
        values: ['org_admin', 'project_manager', 'member', 'viewer'],
        message: '{VALUE} is not a valid organization role'
      },
      default: 'member'
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'invited', 'suspended'],
        message: '{VALUE} is not a valid user status'
      },
      default: 'active'
    },
    mfaEnabled: {
      type: Boolean,
      default: false
    },
    mfaSecret: {
      type: String,
      select: false // Never returned in default queries
    },
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date,
      default: null
    },
    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.mfaSecret;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound Indexes for Tenant Isolation and Performance
// 1. Organization-scoped email uniqueness: Enforces that an email is unique within the organization.
userSchema.index({ organizationId: 1, email: 1 }, { unique: true });

// 2. Member filtering by role within an organization
userSchema.index({ organizationId: 1, role: 1 });

// 3. Member filtering by account status within an organization
userSchema.index({ organizationId: 1, status: 1 });

// 4. General email lookup index (non-unique across tenants)
userSchema.index({ email: 1 });

export const User = mongoose.model('User', userSchema);
export default User;
