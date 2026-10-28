import { Schema, model, Types } from 'mongoose';
import { AGENCY_TYPES } from '../config/constants';

export interface IAgency {
  _id: Types.ObjectId;
  name: string;
  type: (typeof AGENCY_TYPES)[number];
  state?: string;
  district: string;
  contact: { phone?: string; email?: string; address?: string };
  status: 'ACTIVE' | 'INACTIVE';
}

const agencySchema = new Schema<IAgency>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: AGENCY_TYPES, required: true },
    state: String,
    district: { type: String, required: true, index: true },
    contact: { phone: String, email: String, address: String },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true },
);

export const Agency = model<IAgency>('Agency', agencySchema);
