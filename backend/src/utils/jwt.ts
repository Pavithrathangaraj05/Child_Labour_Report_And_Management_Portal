import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './AppError';

export interface AccessPayload extends JwtPayload { sub: string; role: string; }

export const signAccessToken = (userId: string, role: string) =>
  jwt.sign({ role }, env.JWT_ACCESS_SECRET, { subject: userId, expiresIn: env.ACCESS_TOKEN_TTL as any, algorithm: 'HS256' });

export function verifyAccessToken(token: string): AccessPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as AccessPayload;
  } catch {
    throw new AppError(401, 'Invalid or expired access token');
  }
}

/** Short-lived, case-scoped token handed to the reporter so evidence can be attached after submission. */
export const signUploadToken = (caseId: string) =>
  jwt.sign({ scope: 'evidence-upload' }, env.UPLOAD_TOKEN_SECRET, { subject: caseId, expiresIn: '30m', algorithm: 'HS256' });

export function verifyUploadToken(token: string): string {
  try {
    const p = jwt.verify(token, env.UPLOAD_TOKEN_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
    if (p.scope !== 'evidence-upload' || !p.sub) throw new Error('scope');
    return p.sub;
  } catch {
    throw new AppError(401, 'Upload token is invalid or has expired');
  }
}
