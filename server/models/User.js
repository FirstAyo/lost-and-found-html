import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true,
      minlength: 8
    },
    role: {
      type: String,
      enum: ['member', 'admin'],
      default: 'member'
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

userSchema.virtual('fullName').get(function fullNameGetter() {
  return `${this.firstName} ${this.lastName}`.trim();
});

/**
 * Hashes the password only when it changes.
 * This keeps authentication logic centralized in the model layer.
 */
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSessionUser = function toSessionUser() {
  return {
    id: this._id.toString(),
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: this.fullName,
    email: this.email,
    role: this.role
  };
};

export const User = mongoose.models.User || mongoose.model('User', userSchema);
