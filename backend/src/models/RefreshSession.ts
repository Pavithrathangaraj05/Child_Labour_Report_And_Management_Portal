import { Schema, model, Types } from 'mongoose';

export interface IRefreshSession {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedBy?: string;
  userAgent?: string;
  ip?: string;
  createdAt: Date;
}

const schema = new Schema<IRefreshSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
    replacedBy: String,
    userAgent: { type: String, maxlength: 300 },
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
// MongoDB removes expired sessions automatically.
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshSession = model<IRefreshSession>('RefreshSession', schema);
