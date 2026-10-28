import { Schema, model, Types } from 'mongoose';
import { ROLES, Role } from '../config/constants';

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  role: Role;
  agencyId?: Types.ObjectId;
  status: 'ACTIVE' | 'SUSPENDED';
  isEmailVerified: boolean;
  otpHash?: string;
  otpExpiresAt?: Date;
  failedLoginAttempts: number;
  lockUntil?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
    phone: { type: String, trim: true, unique: true, sparse: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, default: 'CITIZEN' },
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency' },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
    isEmailVerified: { type: Boolean, default: false },
    otpHash: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    lastLoginAt: Date,
  },
  { timestamps: true },
);

export const User = model<IUser>('User', userSchema);
