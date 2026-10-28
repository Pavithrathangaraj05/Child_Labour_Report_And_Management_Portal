import { z } from 'zod';
import {
  AGE_RANGES, CASE_STATUSES, GENDERS, LABOUR_CATEGORIES, RISK_LEVELS, TRI, VULNERABILITY_INDICATORS, WORK_DURATIONS,
} from '../config/constants';

const text = (max: number) => z.string().trim().max(max);
const optText = (max: number) => text(max).optional().transform((v) => (v ? v : undefined));
const tri = z.enum(TRI).default('UNKNOWN');

export const createCaseSchema = z.object({
  reporter: z.object({
    type: z.enum(['ANONYMOUS', 'IDENTIFIED']),
    name: optText(120),
    phone: z.string().trim().regex(/^\+?[0-9 \-]{7,15}$/, 'Enter a valid phone number').optional().or(z.literal('').transform(() => undefined)),
    email: z.string().trim().email().max(200).optional().or(z.literal('').transform(() => undefined)),
  }).superRefine((r, ctx) => {
    if (r.type === 'IDENTIFIED' && !r.phone && !r.email)
      ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Provide a phone number or email so officers can reach you' });
  }),
  establishmentName: optText(200),
  employerName: optText(150),
  child: z.object({
    approximateAge: z.number().int().min(0).max(17, 'This platform covers children under 18').optional(),
    ageRange: z.enum(AGE_RANGES),
    gender: z.enum(GENDERS).default('UNKNOWN'),
    numberOfChildren: z.number().int().min(1).max(200).default(1),
    identityKnown: z.boolean().default(false),
    vulnerabilityIndicators: z.array(z.enum(VULNERABILITY_INDICATORS)).max(VULNERABILITY_INDICATORS.length).default([]),
    immediateDangerObserved: tri,
  }),
  labourCategories: z.array(z.enum(LABOUR_CATEGORIES)).min(1, 'Select at least one type of work').max(LABOUR_CATEGORIES.length),
  location: z.object({
    state: optText(80),
    district: text(80).min(2, 'District is required'),
    taluk: optText(80),
    villageOrCity: text(120).min(2, 'Village or city is required'),
    landmark: optText(300),
    coordinates: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).optional(),
  }),
  situation: z.object({
    childActivity: text(1000).min(3, 'Describe what the child is doing'),
    workDuration: z.enum(WORK_DURATIONS).default('UNKNOWN'),
    currentlyInDanger: tri, threatened: tri, forcedToWork: tri, accompaniedByAdult: tri,
    suspectedTrafficking: tri, usedForBegging: tri, preventedFromSchool: tri, multipleChildren: tri,
    additionalDescription: optText(3000),
  }),
  emergency: z.boolean(),
});
export type CreateCaseInput = z.infer<typeof createCaseSchema>;

export const trackSchema = z.object({
  trackingId: z.string().trim().toUpperCase().regex(/^CS-[A-Z0-9]{7}$/, 'Tracking ID looks like CS-XXXXXXX'),
  pin: z.string().trim().regex(/^\d{6}$/, 'PIN is 6 digits'),
});

export const listCasesQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  emergency: z.enum(['true', 'false']).optional(),
  riskLevel: z.enum(RISK_LEVELS).optional(),
  district: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
});

export const overrideAiSchema = z.object({
  riskScore: z.number().int().min(0).max(100),
  riskLevel: z.enum(RISK_LEVELS),
  reason: z.string().trim().min(5, 'Provide an explanation for the AI override').max(1000),
});

export const updateStatusSchema = z.object({
  status: z.enum(CASE_STATUSES),
  notes: z.string().trim().max(1000).optional(),
});

export const assignCaseSchema = z.object({
  agencyId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid agency ID'),
  officerId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid officer ID').optional(),
  priority: z.string().trim().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const reviewRepeatSchema = z.object({
  decision: z.enum(['CONFIRMED', 'REJECTED']),
  notes: z.string().trim().max(1000).optional(),
});

export const caseIdParam = z.object({ id: z.string().trim().regex(/^(CL-\d{4}-\d{6}|[a-f\d]{24})$/i, 'Invalid case identifier') });
