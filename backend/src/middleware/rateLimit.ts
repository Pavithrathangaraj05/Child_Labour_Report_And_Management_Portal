import rateLimit from 'express-rate-limit';

const base = { standardHeaders: true, legacyHeaders: false } as const;
const msg = (m: string) => ({ message: m });

export const globalLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 600, message: msg('Too many requests. Please slow down.') });
export const authLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 30, message: msg('Too many authentication attempts. Try again later.') });
export const trackLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 15, message: msg('Too many tracking attempts. Try again in a few minutes.') });
export const reportLimiter = rateLimit({ ...base, windowMs: 60 * 60_000, limit: 30, message: msg('Report limit reached for this network. Try again later.') });
export const uploadLimiter = rateLimit({ ...base, windowMs: 60 * 60_000, limit: 60, message: msg('Upload limit reached. Try again later.') });
