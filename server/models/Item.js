import mongoose from 'mongoose';

const locationPreviewSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },
    searchQuery: { type: String, trim: true, default: '' },
    lat: { type: Number, default: null },
    lon: { type: Number, default: null },
    mapLink: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

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
    },
    lastSeenLocation: {
      type: String,
      trim: true,
      default: ''
    },
    lastSeenNotes: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ''
    },
    foundLocation: {
      type: String,
      trim: true,
      default: ''
    },
    foundLocationOther: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ''
    },
    foundLocationNotes: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ''
    },
    pickupLocation: {
      type: String,
      trim: true,
      default: ''
    },
    pickupLocationOther: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ''
    },
    pickupInstructions: {
      type: String,
      trim: true,
      maxlength: 400,
      default: ''
    },
    contactMethod: {
      type: String,
      enum: ['email', 'phone', 'both'],
      default: 'email'
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    contactPhone: {
      type: String,
      trim: true,
      maxlength: 40,
      default: ''
    },
    foundLocationPreview: {
      type: locationPreviewSchema,
      default: () => ({})
    },
    pickupLocationPreview: {
      type: locationPreviewSchema,
      default: () => ({})
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
