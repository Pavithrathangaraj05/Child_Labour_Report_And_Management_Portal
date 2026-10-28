import multer from 'multer';
import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { Case } from '../models/Case';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { verifyAccessToken, verifyUploadToken } from '../utils/jwt';
import { User } from '../models/User';
import { findCaseForUser } from '../services/case.service';

/** In-memory (size-limited); the real file type is verified from magic bytes in the evidence service. */
export const uploadFiles = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 5, fields: 5 },
}).array('files', 5);

/** Paired evidence upload: expects fields 'original' and 'redacted'. */
export const uploadPairedFiles = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 2, fields: 5 },
}).fields([{ name: 'original', maxCount: 1 }, { name: 'redacted', maxCount: 1 }]);

/**
 * Authorises an evidence upload BEFORE any bytes are parsed. Two routes in:
 *  1. Staff / registered user with a Bearer token (case must be within their RBAC scope; citizens only their own reports)
 *  2. Reporter holding the short-lived x-upload-token issued at submission time
 */
export const authorizeEvidenceUpload = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const id = req.params.id;
  const idFilter = /^CL-/i.test(id) ? { caseId: id.toUpperCase() } : { _id: id };
  const uploadToken = req.headers['x-upload-token'];

  if (typeof uploadToken === 'string') {
    const tokenCaseId = verifyUploadToken(uploadToken);
    const c = await Case.findOne(idFilter);
    if (!c || c.caseId !== tokenCaseId) throw new AppError(403, 'Upload token does not match this case');
    (req as any).caseDoc = c; (req as any).uploader = { kind: 'REPORTER' };
    return next();
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new AppError(401, 'Authentication or an upload token is required');
  const payload = verifyAccessToken(header.slice(7));
  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'ACTIVE') throw new AppError(401, 'Account is not active');
  req.user = user;

  if (user.role === 'CITIZEN') {
    const c = await Case.findOne({ ...idFilter, reporterUserId: user._id });
    if (!c) throw new AppError(404, 'Case not found');
    (req as any).caseDoc = c;
  } else if (['POLICE', 'LABOUR', 'CWC', 'NGO', 'GOVERNMENT', 'ADMIN'].includes(user.role)) {
    (req as any).caseDoc = await findCaseForUser(user, id);
  } else {
    throw new AppError(403, 'Your role cannot attach evidence');
  }
  (req as any).uploader = { kind: 'USER', userId: user._id };
  next();
});
