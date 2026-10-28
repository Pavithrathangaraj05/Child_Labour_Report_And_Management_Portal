import { CookieOptions, Request, Response } from 'express';
import { env, isProd } from '../config/env';
import { asyncHandler } from '../utils/asyncHandler';
import * as auth from '../services/auth.service';

const COOKIE = 'cs_refresh';
const cookieOpts: CookieOptions = {
  httpOnly: true, secure: isProd, sameSite: 'strict', path: '/api/auth',
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
};
const ctx = (req: Request) => ({ ip: req.ip, userAgent: req.headers['user-agent'] });
const send = (res: Response, s: { accessToken: string; refreshToken: string; user: unknown }) => {
  res.cookie(COOKIE, s.refreshToken, cookieOpts);
  res.json({ accessToken: s.accessToken, user: s.user });
};

export const sendOtp = asyncHandler(async (req, res) => {
  const result = await auth.sendOtp(req.body.email);
  res.json(result);
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const result = await auth.verifyOtp(req.body.email, req.body.otp);
  res.json(result);
});

export const register = asyncHandler(async (req, res) => {
  const session = await auth.registerCitizen(req.body, ctx(req));
  send(res, session);
});

export const login = asyncHandler(async (req, res) => {
  const result = await auth.login(req.body.email, req.body.password, ctx(req), req.body.otp, req.body.challengeId);
  if ('requiresOtp' in result && result.requiresOtp) {
    res.json(result);
  } else {
    send(res, result as any);
  }
});

export const refresh = asyncHandler(async (req, res) => {
  try { send(res, await auth.refresh(req.cookies?.[COOKIE], ctx(req))); }
  catch (e) { res.clearCookie(COOKIE, { ...cookieOpts, maxAge: undefined }); throw e; }
});

export const logout = asyncHandler(async (req, res) => {
  await auth.logout(req.cookies?.[COOKIE]);
  res.clearCookie(COOKIE, { ...cookieOpts, maxAge: undefined });
  res.status(204).end();
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: auth.publicUser(req.user!) });
});
