import { NextFunction, Request, Response } from 'express';
import { HydratedDocument } from 'mongoose';
import { Role } from '../config/constants';
import { IUser, User } from '../models/User';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { verifyAccessToken } from '../utils/jwt';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request { user?: HydratedDocument<IUser>; }
  }
}

async function loadUser(req: Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const payload = verifyAccessToken(header.slice(7));
  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'ACTIVE') throw new AppError(401, 'Account is not active');
  return user;
}

/** Requires a valid access token. Role/status are always re-read from the database, never trusted from the token. */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const user = await loadUser(req);
  if (!user) throw new AppError(401, 'Authentication required');
  req.user = user;
  next();
});

/** Attaches the user when a valid token is present, otherwise continues anonymously. */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  if (req.headers.authorization) req.user = (await loadUser(req)) ?? undefined;
  next();
});

export const authorize = (...roles: Role[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError(401, 'Authentication required'));
  if (!roles.includes(req.user.role)) return next(new AppError(403, 'You do not have permission to perform this action'));
  next();
};
