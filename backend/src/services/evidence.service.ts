import { HydratedDocument, Types } from 'mongoose';
import { Case, ICase } from '../models/Case';
import { EvidenceMetadata, IEvidence } from '../models/EvidenceMetadata';
import { AppError } from '../utils/AppError';
import { sha256 } from '../utils/crypto';
import { detectFile, sanitizeFilename } from '../utils/fileSignature';
import { storage } from './storage.service';
import { Role } from '../config/constants';

export const MAX_EVIDENCE_PER_CASE = 20;

export interface UploadEvidenceOptions {
  isRedacted?: boolean;
  classification?: 'UNREVIEWED' | 'RELEVANT' | 'SENSITIVE';
}

export async function attachEvidence(
  caseDoc: HydratedDocument<ICase>,
  files: Express.Multer.File[],
  uploader: { kind: 'REPORTER' | 'USER'; userId?: Types.ObjectId },
  options: UploadEvidenceOptions = {},
) {
  if (!files.length) throw new AppError(400, 'No files received. Send files in the "files" field.');
  if (caseDoc.evidenceMetadata.length + files.length > MAX_EVIDENCE_PER_CASE)
    throw new AppError(400, `A case can hold at most ${MAX_EVIDENCE_PER_CASE} evidence files`);

  const accepted: any[] = [];
  const rejected: { filename: string; reason: string }[] = [];

  for (const f of files) {
    const detected = detectFile(f.buffer);
    if (!detected) {
      rejected.push({
        filename: sanitizeFilename(f.originalname),
        reason: 'Unsupported or unrecognised file type (allowed: JPEG, PNG, WebP, MP4, MOV, WebM, MP3, M4A, WAV, OGG, PDF)',
      });
      continue;
    }

    const digest = sha256(f.buffer);
    const sanitizedName = sanitizeFilename(f.originalname);

    // If marked as redacted or uploaded during client-side privacy redaction workflow:
    // Store plain copy as redacted investigation copy, and encrypted copy as protected original.
    let storageReference: string;
    let originalStorageReference: string | undefined;
    let originalSha256: string | undefined;
    let redactedStorageReference: string | undefined;
    let redactedSha256: string | undefined;
    let redactionStatus: 'NOT_PROCESSED' | 'REDACTED' | 'ORIGINAL_AND_REDACTED' = 'NOT_PROCESSED';
    let hasProtectedOriginal = false;

    if (options.isRedacted || sanitizedName.toLowerCase().includes('redacted')) {
      redactionStatus = 'ORIGINAL_AND_REDACTED';
      hasProtectedOriginal = true;
      // Redacted investigation copy saved for general staff
      redactedStorageReference = await storage.save(f.buffer, detected.ext);
      redactedSha256 = digest;
      // Protected original copy stored with AES-256-GCM encryption
      originalStorageReference = await storage.saveEncrypted(f.buffer, detected.ext);
      originalSha256 = digest;
      storageReference = redactedStorageReference;
    } else {
      // Standard upload: store plain for general inspection
      storageReference = await storage.save(f.buffer, detected.ext);
    }

    const doc = await EvidenceMetadata.create({
      caseId: caseDoc._id,
      caseRef: caseDoc.caseId,
      fileType: detected.fileType,
      filename: sanitizedName,
      mimeType: detected.mime,
      sizeBytes: f.size,
      sha256: digest,
      storageReference,
      uploadedBy: uploader,
      classification: options.classification || 'UNREVIEWED',
      redactionStatus,
      hasProtectedOriginal,
      originalStorageReference,
      originalSha256,
      redactedStorageReference,
      redactedSha256,
      encryptionAlgorithm: hasProtectedOriginal ? 'aes-256-gcm' : undefined,
      accessLogs: [],
    });

    accepted.push(doc);
  }

  if (accepted.length) {
    await Case.updateOne(
      { _id: caseDoc._id },
      { $push: { evidenceMetadata: { $each: accepted.map((a) => a._id) } } },
    );
  }

  return { accepted: accepted.map(serializeEvidence), rejected };
}

/**
 * Attach paired evidence: user uploads both a redacted copy and a protected original.
 */
export async function attachPairedEvidence(
  caseDoc: HydratedDocument<ICase>,
  originalFile: Express.Multer.File,
  redactedFile: Express.Multer.File,
  uploader: { kind: 'REPORTER' | 'USER'; userId?: Types.ObjectId },
  classification: 'UNREVIEWED' | 'RELEVANT' | 'SENSITIVE' = 'RELEVANT',
) {
  const origDetect = detectFile(originalFile.buffer);
  const redDetect = detectFile(redactedFile.buffer);

  if (!origDetect || !redDetect) {
    throw new AppError(400, 'Unsupported file type in paired evidence upload.');
  }

  const origDigest = sha256(originalFile.buffer);
  const redDigest = sha256(redactedFile.buffer);

  // 1. Encrypt protected original with AES-256-GCM
  const originalStorageRef = await storage.saveEncrypted(originalFile.buffer, origDetect.ext);
  // 2. Save redacted version for authorized investigation view
  const redactedStorageRef = await storage.save(redactedFile.buffer, redDetect.ext);

  const doc = await EvidenceMetadata.create({
    caseId: caseDoc._id,
    caseRef: caseDoc.caseId,
    fileType: origDetect.fileType,
    filename: sanitizeFilename(redactedFile.originalname),
    mimeType: redDetect.mime,
    sizeBytes: redactedFile.size,
    sha256: redDigest,
    storageReference: redactedStorageRef,
    uploadedBy: uploader,
    classification,
    redactionStatus: 'ORIGINAL_AND_REDACTED',
    hasProtectedOriginal: true,
    originalStorageReference: originalStorageRef,
    originalSha256: origDigest,
    redactedStorageReference: redactedStorageRef,
    redactedSha256: redDigest,
    encryptionAlgorithm: 'aes-256-gcm',
    accessLogs: [],
  });

  await Case.updateOne({ _id: caseDoc._id }, { $push: { evidenceMetadata: doc._id } });

  return serializeEvidence(doc);
}

/**
 * Access control and secure download authorization for evidence.
 * Rule: Protected original copy is ONLY accessible to POLICE and ADMIN roles.
 */
export async function getAuthorizedEvidence(
  evidenceId: string,
  user: { _id?: Types.ObjectId; role: Role },
  requestedType: 'redacted' | 'original' = 'redacted',
  ip?: string,
) {
  const doc = await EvidenceMetadata.findById(evidenceId);
  if (!doc) throw new AppError(404, 'Evidence not found');

  if (requestedType === 'original') {
    // RBAC: strictly POLICE and ADMIN
    if (user.role !== 'POLICE' && user.role !== 'ADMIN') {
      throw new AppError(403, 'Forbidden: Protected original evidence is strictly restricted to Police and Admin authorities.');
    }

    if (!doc.originalStorageReference) {
      throw new AppError(404, 'No protected original copy exists for this evidence.');
    }

    // Decrypt on the fly
    const decryptedBuffer = await storage.readEncrypted(doc.originalStorageReference);

    // Audit access log
    doc.accessLogs.push({
      accessedByUserId: user._id,
      role: user.role,
      accessedAt: new Date(),
      accessType: 'VIEW_ORIGINAL',
      ip,
    });
    await doc.save();

    return {
      buffer: decryptedBuffer,
      mimeType: doc.mimeType,
      filename: `ORIGINAL_${doc.filename}`,
      sha256: doc.originalSha256 || doc.sha256,
      classification: doc.classification,
      isOriginal: true,
    };
  } else {
    // Redacted / public investigation copy
    const targetRef = doc.redactedStorageReference || doc.storageReference;
    const buffer = await storage.read(targetRef);

    doc.accessLogs.push({
      accessedByUserId: user._id,
      role: user.role,
      accessedAt: new Date(),
      accessType: 'VIEW_REDACTED',
      ip,
    });
    await doc.save();

    return {
      buffer,
      mimeType: doc.mimeType,
      filename: `REDACTED_${doc.filename}`,
      sha256: doc.redactedSha256 || doc.sha256,
      classification: doc.classification,
      isOriginal: false,
    };
  }
}

export const serializeEvidence = (e: any) => ({
  id: String(e._id),
  fileType: e.fileType,
  filename: e.filename,
  mimeType: e.mimeType,
  sizeBytes: e.sizeBytes,
  uploadedAt: e.uploadedAt,
  classification: e.classification,
  redactionStatus: e.redactionStatus,
  hasProtectedOriginal: e.hasProtectedOriginal || false,
  sha256: e.sha256,
  originalSha256: e.originalSha256,
  redactedSha256: e.redactedSha256,
  accessLogsCount: e.accessLogs?.length || 0,
});
