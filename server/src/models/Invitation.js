import mongoose from 'mongoose';

const invitationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization reference is required for invitations'],
      index: true
    },
    email: {
      type: String,
      required: [true, 'Invitee email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    role: {
      type: String,
      enum: {
        values: ['org_admin', 'project_manager', 'member', 'viewer'],
        message: '{VALUE} is not a valid organization role'
      },
      default: 'member'
    },
    token: {
      type: String,
      required: [true, 'Invitation token hash is required'],
      unique: true
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Inviter reference is required']
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'accepted', 'expired', 'revoked'],
        message: '{VALUE} is not a valid invitation status'
      },
      default: 'pending'
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required']
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.token; // Do not expose raw token hash in API outputs
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound Indexes
// 1. Prevents duplicate active invitations to the same email within an organization
invitationSchema.index({ organizationId: 1, email: 1, status: 1 });

// 2. TTL index: automatically remove expired records after expiration
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Invitation = mongoose.model('Invitation', invitationSchema);
export default Invitation;
