import { Schema, model, Types } from 'mongoose';
import { EVIDENCE_CLASSIFICATIONS, EVIDENCE_FILE_TYPES } from '../config/constants';

export interface IEvidenceAccessLog {
  accessedByUserId?: Types.ObjectId;
  role: string;
  accessedAt: Date;
  accessType: 'VIEW_REDACTED' | 'VIEW_ORIGINAL' | 'DOWNLOAD';
  ip?: string;
}

export interface IEvidence {
  _id: Types.ObjectId;
  caseId: Types.ObjectId;
  caseRef: string;
  fileType: (typeof EVIDENCE_FILE_TYPES)[number];
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  storageReference: string; // default / redacted view
  uploadedAt: Date;
  uploadedBy: { kind: 'REPORTER' | 'USER'; userId?: Types.ObjectId };
  classification: (typeof EVIDENCE_CLASSIFICATIONS)[number];
  redactionStatus: 'NOT_PROCESSED' | 'REDACTED' | 'ORIGINAL_AND_REDACTED';
  hasProtectedOriginal: boolean;
  originalStorageReference?: string;
  originalSha256?: string;
  redactedStorageReference?: string;
  redactedSha256?: string;
  encryptionAlgorithm?: string;
  accessLogs: IEvidenceAccessLog[];
}

const evidenceSchema = new Schema<IEvidence>({
  caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
  caseRef: { type: String, required: true },
  fileType: { type: String, enum: EVIDENCE_FILE_TYPES, required: true },
  filename: { type: String, required: true },
  mimeType: { type: String, required: true },
  sizeBytes: { type: Number, required: true },
  sha256: { type: String, required: true },
  storageReference: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: {
    kind: { type: String, enum: ['REPORTER', 'USER'], required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  classification: { type: String, enum: EVIDENCE_CLASSIFICATIONS, default: 'UNREVIEWED' },
  redactionStatus: {
    type: String,
    enum: ['NOT_PROCESSED', 'REDACTED', 'ORIGINAL_AND_REDACTED'],
    default: 'NOT_PROCESSED',
  },
  hasProtectedOriginal: { type: Boolean, default: false },
  originalStorageReference: { type: String },
  originalSha256: { type: String },
  redactedStorageReference: { type: String },
  redactedSha256: { type: String },
  encryptionAlgorithm: { type: String, default: 'aes-256-gcm' },
  accessLogs: [
    {
      accessedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
      role: { type: String, required: true },
      accessedAt: { type: Date, default: Date.now },
      accessType: {
        type: String,
        enum: ['VIEW_REDACTED', 'VIEW_ORIGINAL', 'DOWNLOAD'],
        default: 'VIEW_REDACTED',
      },
      ip: String,
      _id: false,
    },
  ],
});

export const EvidenceMetadata = model<IEvidence>('EvidenceMetadata', evidenceSchema);
