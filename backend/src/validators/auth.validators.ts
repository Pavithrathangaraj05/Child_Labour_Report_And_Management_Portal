import { z } from 'zod';

const password = z.string().min(10, 'Use at least 10 characters').max(128)
  .regex(/[a-z]/, 'Include a lowercase letter').regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/\d/, 'Include a digit');

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().regex(/^\+?[0-9 \-]{7,15}$/, 'Enter a valid phone number').optional(),
  password,
  confirmPassword: z.string().optional(),
  otp: z.string().optional(),
}).refine(
  (data) => !data.confirmPassword || data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
);

export const sendOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  otp: z.string().trim().regex(/^\d{6}$/, 'Enter 6-digit OTP code'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(128),
  otp: z.string().optional(),
  challengeId: z.string().optional(),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().regex(/^\+?[0-9 \-]{7,15}$/, 'Enter a valid phone number').optional(),
  password,
  role: z.enum(['CITIZEN', 'POLICE', 'LABOUR', 'CWC', 'NGO', 'GOVERNMENT', 'ADMIN']),
  agencyId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
});

export const updateUserSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  role: z.enum(['CITIZEN', 'POLICE', 'LABOUR', 'CWC', 'NGO', 'GOVERNMENT', 'ADMIN']).optional(),
  agencyId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
}).refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update');
