import { Schema, model, Types } from 'mongoose';

/** Module 1 only defines the collection (extension point). Nothing sends or reads notifications yet. */
export interface INotification {
  _id: Types.ObjectId;
  recipientUserId?: Types.ObjectId;
  recipientAgencyId?: Types.ObjectId;
  caseId?: Types.ObjectId;
  type: string;
  message: string;
  readAt?: Date;
  createdAt: Date;
}
const schema = new Schema<INotification>(
  {
    recipientUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    recipientAgencyId: { type: Schema.Types.ObjectId, ref: 'Agency' },
    caseId: { type: Schema.Types.ObjectId, ref: 'Case' },
    type: { type: String, required: true },
    message: { type: String, required: true, maxlength: 500 },
    readAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
export const Notification = model<INotification>('Notification', schema);
