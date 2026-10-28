import bcrypt from 'bcryptjs';
import { HydratedDocument } from 'mongoose';
import { env } from '../config/env';
import { IUser, User } from '../models/User';
import { RefreshSession } from '../models/RefreshSession';
import { AppError } from '../utils/AppError';
import { randomToken, sha256 } from '../utils/crypto';
import { signAccessToken } from '../utils/jwt';
import { sendEmail } from './notification.service';
import { sendOtpEmail } from './mail.service';
import { logSecurityEvent } from './securityAudit.service';

// Used to keep response time similar whether or not the account exists (limits user enumeration).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

// In-memory OTP storage for registration email verification: email -> { code: string, expiresAt: number }
const pendingOtps = new Map<string, { code: string; expiresAt: number }>();

export const publicUser = (u: HydratedDocument<IUser>) => ({
  id: String(u._id), name: u.name, email: u.email, role: u.role, isEmailVerified: u.isEmailVerified, agencyId: u.agencyId ? String(u.agencyId) : null,
});

type Ctx = { ip?: string; userAgent?: string };

async function issueSession(user: HydratedDocument<IUser>, ctx: Ctx) {
  const refreshToken = randomToken();
  await RefreshSession.create({
    userId: user._id,
    tokenHash: sha256(refreshToken),
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
    ip: ctx.ip, userAgent: ctx.userAgent?.slice(0, 300),
  });
  return {
    accessToken: signAccessToken(String(user._id), user.role),
    refreshToken,
    user: publicUser(user),
  };
}

/**
 * Sends a 6-digit OTP code to the user's email for registration verification.
 */
export async function sendOtp(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    throw new AppError(409, 'An account with this email already exists. Please log in.');
  }

  // Generate 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  pendingOtps.set(normalizedEmail, { code, expiresAt });

  // Dispatch Email Notification via Nodemailer transporter
  const mailRes = await sendOtpEmail(normalizedEmail, code);

  return {
    success: true,
    message: `OTP sent to ${normalizedEmail}`,
    demoOtp: code,
    previewUrl: mailRes.previewUrl,
  };
}

/**
 * Verifies email OTP and registers a new citizen account.
 */
export async function registerCitizen(
  input: { name: string; email: string; phone?: string; password: string; otp?: string },
  ctx: Ctx
) {
  const normalizedEmail = input.email.trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    throw new AppError(409, 'An account with this email already exists');
  }

  // OTP check
  const record = pendingOtps.get(normalizedEmail);
  if (!input.otp) {
    throw new AppError(400, 'Email verification OTP is required. Please request and enter the OTP sent to your email.');
  }
  if (!record || record.code !== input.otp.trim()) {
    throw new AppError(400, 'Invalid or expired OTP code. Please enter the correct OTP or request a new one.');
  }
  if (Date.now() > record.expiresAt) {
    pendingOtps.delete(normalizedEmail);
    throw new AppError(400, 'OTP code has expired. Please request a new OTP.');
  }

  // Clean up used OTP
  pendingOtps.delete(normalizedEmail);

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  // Role is forced server-side: public registration can only ever create CITIZEN accounts.
  const user = await User.create({
    name: input.name,
    email: normalizedEmail,
    phone: input.phone,
    passwordHash,
    role: 'CITIZEN',
    isEmailVerified: true,
  });

  return issueSession(user, ctx);
}

// In-memory OTP storage for login 2FA / step-up across all roles: challengeId -> { userId: string, email: string, code: string, expiresAt: number }
const loginOtps = new Map<string, { userId: string; email: string; code: string; expiresAt: number }>();

export async function login(
  email: string,
  password: string,
  ctx: Ctx,
  otp?: string,
  challengeId?: string
) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) { await bcrypt.compare(password, DUMMY_HASH); throw new AppError(401, 'Incorrect email or password'); }
  if (user.status !== 'ACTIVE') throw new AppError(403, 'This account is suspended. Contact your administrator.');
  if (user.lockUntil && user.lockUntil > new Date()) {
    throw new AppError(423, `Account temporarily locked after repeated failed sign-ins. Try again after ${user.lockUntil.toLocaleTimeString()}.`);
  }
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= env.MAX_FAILED_LOGINS) {
      user.lockUntil = new Date(Date.now() + env.LOCKOUT_MINUTES * 60_000);
      user.failedLoginAttempts = 0;
    }
    await logSecurityEvent({
      eventType: 'LOGIN_FAILURE',
      severity: 'WARNING',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { email, reason: 'Bad credentials' },
      status: 'FAILURE',
    });
    throw new AppError(401, 'Incorrect email or password');
  }

  // Real-Time OTP Verification step for all roles
  if (!otp || !challengeId) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const chId = randomToken(16);
    const targetEmail = user.email || email;
    loginOtps.set(chId, { userId: String(user._id), email: targetEmail, code, expiresAt: Date.now() + 10 * 60 * 1000 });
    await sendOtpEmail(targetEmail, code);
    await logSecurityEvent({
      eventType: 'LOGIN_OTP_DISPATCHED',
      severity: 'INFO',
      userId: String(user._id),
      userName: user.name,
      role: user.role,
      agencyId: user.agencyId ? String(user.agencyId) : undefined,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      status: 'SUCCESS',
    });
    return {
      requiresOtp: true,
      challengeId: chId,
      email: targetEmail,
      demoOtp: code,
      message: `Real-time OTP verification code sent to registered official address for ${user.role} role.`,
    };
  }

  // Verify OTP
  const ch = loginOtps.get(challengeId);
  if (!ch || ch.code !== otp.trim() || ch.userId !== String(user._id)) {
    await logSecurityEvent({
      eventType: 'LOGIN_FAILURE',
      severity: 'WARNING',
      userId: String(user._id),
      userName: user.name,
      role: user.role,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { reason: 'Invalid or expired login OTP' },
      status: 'FAILURE',
    });
    throw new AppError(401, 'Invalid or expired OTP code. Please enter the valid OTP.');
  }
  if (Date.now() > ch.expiresAt) {
    loginOtps.delete(challengeId);
    throw new AppError(401, 'OTP code has expired. Please sign in again.');
  }
  loginOtps.delete(challengeId);

  user.failedLoginAttempts = 0; user.lockUntil = undefined; user.lastLoginAt = new Date();
  await user.save();

  await logSecurityEvent({
    eventType: 'LOGIN_SUCCESS',
    severity: 'INFO',
    userId: String(user._id),
    userName: user.name,
    role: user.role,
    agencyId: user.agencyId ? String(user.agencyId) : undefined,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    status: 'SUCCESS',
  });

  return issueSession(user, ctx);
}

/** Rotating refresh tokens: each token works once. Re-use of a revoked token revokes the whole session family. */
export async function refresh(token: string | undefined, ctx: Ctx) {
  if (!token) throw new AppError(401, 'No session');
  const session = await RefreshSession.findOne({ tokenHash: sha256(token) });
  if (!session) throw new AppError(401, 'Session not found');
  if (session.revokedAt) {
    await RefreshSession.updateMany({ userId: session.userId, revokedAt: { $exists: false } }, { revokedAt: new Date() });
    throw new AppError(401, 'Session was reused and has been revoked. Please sign in again.');
  }
  if (session.expiresAt < new Date()) throw new AppError(401, 'Session expired');
  const user = await User.findById(session.userId);
  if (!user || user.status !== 'ACTIVE') throw new AppError(401, 'Account is not active');
  session.revokedAt = new Date();
  const next = await issueSession(user, ctx);
  session.replacedBy = sha256(next.refreshToken);
  await session.save();
  return next;
}

export async function logout(token: string | undefined) {
  if (!token) return;
  await RefreshSession.updateOne({ tokenHash: sha256(token), revokedAt: { $exists: false } }, { revokedAt: new Date() });
}
