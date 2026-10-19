import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization reference is required for tasks'],
      index: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project reference is required for tasks'],
      index: true
    },
    taskNumber: {
      type: Number,
      required: [true, 'Task sequence number is required']
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [10000, 'Description cannot exceed 10000 characters'],
      default: ''
    },
    status: {
      type: String,
      enum: {
        values: ['todo', 'in_progress', 'in_review', 'done'],
        message: '{VALUE} is not a valid task status'
      },
      default: 'todo'
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high', 'urgent'],
        message: '{VALUE} is not a valid task priority'
      },
      default: 'medium'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task creator reference is required']
    },
    dueDate: {
      type: Date,
      default: null
    },
    tags: {
      type: [String],
      default: []
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

// Compound Indexes for Multi-Tenant Isolation and Kanban Queries
// 1. Unique task number per project per organization
taskSchema.index({ organizationId: 1, projectId: 1, taskNumber: 1 }, { unique: true });

// 2. Kanban board query: filter tasks by project and status column within an organization
taskSchema.index({ organizationId: 1, projectId: 1, status: 1 });

// 3. User task view: "My Tasks" query filtered by assignee and status within an organization
taskSchema.index({ organizationId: 1, assignedTo: 1, status: 1 });

// 4. Priority task query within an organization
taskSchema.index({ organizationId: 1, priority: 1 });

// 5. General task recency ordering within an organization
taskSchema.index({ organizationId: 1, createdAt: -1 });

export const Task = mongoose.model('Task', taskSchema);
export default Task;
