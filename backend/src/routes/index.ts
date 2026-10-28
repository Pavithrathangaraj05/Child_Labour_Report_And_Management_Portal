import { Router } from 'express';
import { z } from 'zod';
import * as authC from '../controllers/auth.controller';
import * as caseC from '../controllers/case.controller';
import * as adminC from '../controllers/admin.controller';
import { authenticate, authorize, optionalAuth } from '../middleware/auth';
import { authLimiter, reportLimiter, trackLimiter, uploadLimiter } from '../middleware/rateLimit';
import { authorizeEvidenceUpload, uploadFiles, uploadPairedFiles } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { createUserSchema, loginSchema, registerSchema, sendOtpSchema, updateUserSchema } from '../validators/auth.validators';
import {
  assignCaseSchema,
  caseIdParam,
  createCaseSchema,
  listCasesQuery,
  overrideAiSchema,
  reviewRepeatSchema,
  trackSchema,
  updateStatusSchema,
} from '../validators/case.validators';

const r = Router();
const objectId = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') });

r.get('/health', (_req, res) => res.json({ status: 'ok', module: 4 }));

// ── auth & OTP verification
r.post('/auth/send-otp', authLimiter, validate(sendOtpSchema), authC.sendOtp);
r.post('/auth/register', authLimiter, validate(registerSchema), authC.register);
r.post('/auth/login', authLimiter, validate(loginSchema), authC.login);
r.post('/auth/refresh', authLimiter, authC.refresh);
r.post('/auth/logout', authC.logout);
r.get('/auth/me', authenticate, authC.me);

// ── cases
r.post('/cases', reportLimiter, optionalAuth, validate(createCaseSchema), caseC.create); // public (anonymous allowed)
r.get('/cases/my', authenticate, caseC.getMyReports); // citizen end-to-end tracking
r.get('/cases/stats', authenticate, authorize('POLICE', 'LABOUR', 'CWC', 'GOVERNMENT', 'ADMIN'), caseC.getStats);
r.get('/cases', authenticate, authorize('POLICE', 'LABOUR', 'CWC', 'NGO', 'GOVERNMENT'), validate(listCasesQuery, 'query'), caseC.list);
r.get('/cases/:id', authenticate, authorize('POLICE', 'LABOUR', 'CWC', 'NGO', 'GOVERNMENT', 'ADMIN'), validate(caseIdParam, 'params'), caseC.getOne);

// Evidence: standard upload
r.post('/cases/:id/evidence', uploadLimiter, validate(caseIdParam, 'params'), authorizeEvidenceUpload, uploadFiles, caseC.uploadEvidence);

// Evidence: paired (redacted + encrypted original) — Module 3
r.post('/cases/:id/evidence/paired', uploadLimiter, validate(caseIdParam, 'params'), authorizeEvidenceUpload, uploadPairedFiles, caseC.uploadPairedEvidence);

// Evidence: secure download with access logging — Module 3
r.get('/cases/:id/evidence/:evidenceId/download', authenticate, authorize('POLICE', 'LABOUR', 'CWC', 'NGO', 'GOVERNMENT', 'ADMIN'), caseC.downloadEvidence);

// ── Module 2 workflow operations
r.post('/cases/:id/override-ai', authenticate, authorize('POLICE', 'LABOUR', 'CWC', 'GOVERNMENT', 'ADMIN'), validate(caseIdParam, 'params'), validate(overrideAiSchema), caseC.overrideAi);
r.patch('/cases/:id/status', authenticate, authorize('POLICE', 'LABOUR', 'CWC', 'NGO', 'GOVERNMENT', 'ADMIN'), validate(caseIdParam, 'params'), validate(updateStatusSchema), caseC.updateStatus);
r.post('/cases/:id/assign', authenticate, authorize('POLICE', 'LABOUR', 'CWC', 'GOVERNMENT', 'ADMIN'), validate(caseIdParam, 'params'), validate(assignCaseSchema), caseC.assign);
r.post('/cases/:id/repeat-review', authenticate, authorize('POLICE', 'LABOUR', 'CWC', 'GOVERNMENT', 'ADMIN'), validate(caseIdParam, 'params'), validate(reviewRepeatSchema), caseC.reviewRepeat);

// ── Module 3: Rehabilitation workflow
r.post('/cases/:id/rehabilitation', authenticate, authorize('CWC', 'NGO', 'ADMIN'), validate(caseIdParam, 'params'), caseC.initiateRehab);
r.post('/cases/:id/interventions', authenticate, authorize('CWC', 'NGO', 'ADMIN'), validate(caseIdParam, 'params'), caseC.addIntervention);
r.patch('/cases/:id/interventions/:interventionId', authenticate, authorize('CWC', 'NGO', 'ADMIN'), validate(caseIdParam, 'params'), caseC.updateInterventionHandler);

// ── Module 3: SLA
r.get('/cases/:id/sla', authenticate, authorize('POLICE', 'LABOUR', 'CWC', 'NGO', 'GOVERNMENT', 'ADMIN'), validate(caseIdParam, 'params'), caseC.getSla);
r.post('/admin/sla/run-check', authenticate, caseC.runSlaCheck);
r.get('/admin/queue/stats', authenticate, caseC.getQueueStats);

// ── public tracking
r.post('/track', trackLimiter, validate(trackSchema), caseC.track);

// ── agencies & admin
r.get('/agencies', authenticate, authorize('POLICE', 'LABOUR', 'CWC', 'NGO', 'GOVERNMENT', 'ADMIN'), adminC.listAgencies);
r.get('/users', authenticate, authorize('ADMIN'), adminC.listUsers);
r.post('/users', authenticate, authorize('ADMIN'), validate(createUserSchema), adminC.createUser);
r.patch('/users/:id', authenticate, authorize('ADMIN'), validate(objectId, 'params'), validate(updateUserSchema), adminC.updateUser);

// ── Module 4: Cryptographic Ledger & Audit Verification
import * as mod4 from '../controllers/module4.controller';

r.get('/cases/:id/ledger', authenticate, authorize('POLICE', 'LABOUR', 'CWC', 'NGO', 'GOVERNMENT', 'ADMIN'), validate(caseIdParam, 'params'), mod4.getLedger);
r.get('/cases/:id/audit', authenticate, authorize('POLICE', 'LABOUR', 'CWC', 'NGO', 'GOVERNMENT', 'ADMIN'), validate(caseIdParam, 'params'), mod4.verifyLedger);
r.post('/cases/:id/audit/tamper-demo', authenticate, authorize('ADMIN'), validate(caseIdParam, 'params'), mod4.simulateTamper);

// ── Module 4: Security Center
r.get('/security/logs', authenticate, authorize('ADMIN', 'GOVERNMENT', 'POLICE'), mod4.getSecurityLogs);

// ── Module 4: Step-Up Authentication (MFA)
r.post('/auth/step-up/challenge', authenticate, mod4.requestMfaChallenge);
r.post('/auth/step-up/verify', authenticate, mod4.verifyMfaChallenge);

// ── Module 4: Analytics Dashboard & Risk Map
r.get('/analytics/dashboard', authenticate, authorize('POLICE', 'LABOUR', 'CWC', 'NGO', 'GOVERNMENT', 'ADMIN'), mod4.getAnalytics);
r.get('/risk-map/data', authenticate, authorize('POLICE', 'LABOUR', 'CWC', 'NGO', 'GOVERNMENT', 'ADMIN'), mod4.getRiskMapData);

// ── Module 4: Reports Generator
r.post('/reports/generate', authenticate, authorize('POLICE', 'LABOUR', 'CWC', 'GOVERNMENT', 'ADMIN'), mod4.generateReportData);

// ── Module 4: Public Transparency (Unauthenticated or Open)
r.get('/transparency/stats', mod4.getPublicTransparency);

export default r;
