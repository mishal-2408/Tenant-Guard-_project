import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      minlength: [2, 'Organization name must be at least 2 characters'],
      maxlength: [100, 'Organization name cannot exceed 100 characters']
    },
    slug: {
      type: String,
      required: [true, 'Organization slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug must only contain lowercase alphanumeric characters and hyphens']
    },
    plan: {
      type: String,
      enum: {
        values: ['free', 'pro', 'enterprise'],
        message: '{VALUE} is not a valid subscription plan'
      },
      default: 'free'
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'suspended', 'deactivated'],
        message: '{VALUE} is not a valid organization status'
      },
      default: 'active'
    },
    settings: {
      enforceMfa: {
        type: Boolean,
        default: false
      },
      allowedEmailDomains: {
        type: [String],
        default: []
      },
      sessionTimeoutMinutes: {
        type: Number,
        default: 60,
        min: [5, 'Session timeout cannot be less than 5 minutes'],
        max: [1440, 'Session timeout cannot exceed 24 hours']
      }
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

// Indexes
organizationSchema.index({ status: 1 });

export const Organization = mongoose.model('Organization', organizationSchema);
export default Organization;
