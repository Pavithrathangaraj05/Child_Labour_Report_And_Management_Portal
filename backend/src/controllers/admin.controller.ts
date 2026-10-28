import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { Agency } from '../models/Agency';
import { RefreshSession } from '../models/RefreshSession';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { publicUser } from '../services/auth.service';

const AGENCY_ROLES = ['POLICE', 'LABOUR', 'CWC', 'NGO', 'GOVERNMENT'];

export const listAgencies = asyncHandler(async (_req, res) => {
  res.json({ items: await Agency.find({ status: 'ACTIVE' }).sort({ district: 1, name: 1 }) });
});

export const listUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).limit(200);
  res.json({ items: users.map((u) => ({ ...publicUser(u), status: u.status, lastLoginAt: u.lastLoginAt, createdAt: u.createdAt })) });
});

async function assertAgencyRule(role: string, agencyId?: string | null) {
  if (AGENCY_ROLES.includes(role)) {
    if (!agencyId) throw new AppError(400, `${role} users must belong to an agency`);
    if (!(await Agency.exists({ _id: agencyId }))) throw new AppError(400, 'Agency does not exist');
  }
}

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role, agencyId } = req.body;
  await assertAgencyRule(role, agencyId);
  if (await User.exists({ email })) throw new AppError(409, 'An account with this email already exists');
  const u = await User.create({ name, email, phone, role, agencyId, passwordHash: await bcrypt.hash(password, env.BCRYPT_ROUNDS) });
  res.status(201).json({ user: publicUser(u) });
});

export const updateUser = asyncHandler(async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) throw new AppError(404, 'User not found');
  if (String(u._id) === String(req.user!._id) && (req.body.status === 'SUSPENDED' || (req.body.role && req.body.role !== 'ADMIN')))
    throw new AppError(400, 'You cannot suspend or demote your own account');
  const role = req.body.role ?? u.role;
  const agencyId = req.body.agencyId === undefined ? (u.agencyId ? String(u.agencyId) : null) : req.body.agencyId;
  await assertAgencyRule(role, agencyId);
  if (req.body.status) u.status = req.body.status;
  u.role = role; u.agencyId = (agencyId ?? undefined) as any;
  await u.save();
  if (u.status === 'SUSPENDED' || req.body.role) await RefreshSession.updateMany({ userId: u._id, revokedAt: { $exists: false } }, { revokedAt: new Date() });
  res.json({ user: { ...publicUser(u), status: u.status } });
});
