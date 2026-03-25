import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120
    },
    type: {
      type: String,
      enum: ['lost', 'found'],
      required: true,
      index: true
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1200
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140
    },
    incidentDate: {
      type: Date,
      required: true
    },
    imagePath: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['active', 'resolved'],
      default: 'active',
      index: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

itemSchema.virtual('formattedIncidentDate').get(function formattedIncidentDate() {
  return this.incidentDate instanceof Date && !Number.isNaN(this.incidentDate.getTime())
    ? this.incidentDate.toISOString().split('T')[0]
    : '';
});

export const Item = mongoose.models.Item || mongoose.model('Item', itemSchema);
