import mongoose from 'mongoose';

const platformAdminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Platform admin email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Never returned in default queries
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true
    },
    isSuperAdmin: {
      type: Boolean,
      default: true,
      immutable: true // Cannot be mutated to regular user
    },
    mfaEnabled: {
      type: Boolean,
      default: false
    },
    mfaSecret: {
      type: String,
      select: false
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'suspended'],
        message: '{VALUE} is not a valid admin status'
      },
      default: 'active'
    },
    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  {
    collection: 'platform_admins', // Explicitly separated from tenant users collection
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

// Note: Unique index on email is created via the field schema definition
export const PlatformAdmin = mongoose.model('PlatformAdmin', platformAdminSchema);
export default PlatformAdmin;
