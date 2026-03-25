import mongoose from 'mongoose';

const logSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    userRole: {
      type: String,
      default: 'guest',
      trim: true
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true
    },
    outcome: {
      type: String,
      enum: ['success', 'failure', 'blocked'],
      default: 'success',
      index: true
    },
    method: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10
    },
    route: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255
    },
    statusCode: {
      type: Number,
      default: 200
    },
    ipAddress: {
      type: String,
      default: ''
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

export const Log = mongoose.models.Log || mongoose.model('Log', logSchema);
