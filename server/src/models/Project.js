import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization reference is required for projects'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [2, 'Project name must be at least 2 characters'],
      maxlength: [100, 'Project name cannot exceed 100 characters']
    },
    key: {
      type: String,
      required: [true, 'Project key identifier is required'],
      uppercase: true,
      trim: true,
      minlength: [2, 'Project key must be at least 2 characters'],
      maxlength: [10, 'Project key cannot exceed 10 characters'],
      match: [/^[A-Z0-9]+$/, 'Project key must only contain uppercase alphanumeric characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: ''
    },
    status: {
      type: String,
      enum: {
        values: ['planning', 'active', 'on_hold', 'completed', 'archived'],
        message: '{VALUE} is not a valid project status'
      },
      default: 'planning'
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project owner reference is required']
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    startDate: {
      type: Date,
      default: null
    },
    targetDate: {
      type: Date,
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

// Compound Indexes for Multi-Tenant Isolation and Fast Querying
// 1. Key uniqueness per organization: Org A and Org B can both have project key 'PROJ' without conflict
projectSchema.index({ organizationId: 1, key: 1 }, { unique: true });

// 2. Querying project listings sorted by creation date with status filtering
projectSchema.index({ organizationId: 1, status: 1, createdAt: -1 });

// 3. Fast lookup of projects owned by a particular user within an organization
projectSchema.index({ organizationId: 1, ownerId: 1 });

// 4. Fast lookup of projects a member participates in within an organization
projectSchema.index({ organizationId: 1, members: 1 });

export const Project = mongoose.model('Project', projectSchema);
export default Project;
