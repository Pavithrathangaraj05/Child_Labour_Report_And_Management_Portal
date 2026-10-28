import { asyncHandler } from '../utils/asyncHandler';
import { signUploadToken } from '../utils/jwt';
import * as cases from '../services/case.service';
import { attachEvidence, attachPairedEvidence, getAuthorizedEvidence } from '../services/evidence.service';
import { queueManager } from '../services/queue.service';

export const create = asyncHandler(async (req, res) => {
  const { doc, pin } = await cases.createCase(req.body, req.user ? String(req.user._id) : undefined);
  res.status(201).json({
    caseId: doc.caseId,
    trackingId: doc.trackingId,
    pin,
    status: doc.status,
    emergencyIndicator: doc.emergencyIndicator,
    riskAssessment: doc.riskAssessment,
    agencyRecommendation: doc.agencyRecommendation,
    duplicateCheck: doc.duplicateCheck,
    repeatOffenceCheck: doc.repeatOffenceCheck,
    sla: doc.sla,
    submittedAt: doc.createdAt,
    uploadToken: signUploadToken(doc.caseId),
  });
});

export const list = asyncHandler(async (req, res) => {
  res.json(await cases.listCasesForUser(req.user!, req.query as any));
});

export const getOne = asyncHandler(async (req, res) => {
  const doc = await cases.findCaseForUser(req.user!, req.params.id);
  res.json({ case: await cases.serializeCase(doc, req.user!.role, true) });
});

export const uploadEvidence = asyncHandler(async (req, res) => {
  const opts = { isRedacted: req.body.isRedacted === 'true' || req.body.isRedacted === true, classification: req.body.classification };
  const result = await attachEvidence((req as any).caseDoc, (req.files as Express.Multer.File[]) ?? [], (req as any).uploader, opts);
  res.status(result.accepted.length ? 201 : 422).json(result);
});

export const uploadPairedEvidence = asyncHandler(async (req, res) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const originalFile = files['original']?.[0];
  const redactedFile = files['redacted']?.[0];

  if (!originalFile || !redactedFile) {
    return res.status(400).json({ error: 'Both "original" and "redacted" files are required for paired upload.' });
  }

  const result = await attachPairedEvidence(
    (req as any).caseDoc,
    originalFile,
    redactedFile,
    (req as any).uploader,
    req.body.classification || 'RELEVANT',
  );
  res.status(201).json({ accepted: [result], rejected: [] });
});

export const downloadEvidence = asyncHandler(async (req, res) => {
  const type = (req.query.type as 'redacted' | 'original') || 'redacted';
  const ip = req.ip || req.socket?.remoteAddress;
  const evidenceData = await getAuthorizedEvidence(req.params.evidenceId, req.user!, type, ip);

  res.setHeader('Content-Type', evidenceData.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${evidenceData.filename}"`);
  res.setHeader('X-Evidence-SHA256', evidenceData.sha256 || '');
  res.setHeader('X-Evidence-Classification', evidenceData.classification);
  res.setHeader('X-Evidence-Is-Original', String(evidenceData.isOriginal));
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(evidenceData.buffer);
});

export const track = asyncHandler(async (req, res) => {
  res.json(await cases.trackCase(req.body.trackingId, req.body.pin));
});

export const getMyReports = asyncHandler(async (req, res) => {
  const reports = await cases.listCitizenReports(String(req.user!._id));
  res.json({ reports });
});

export const overrideAi = asyncHandler(async (req, res) => {
  const updated = await cases.overrideAiRisk(req.params.id, req.user!, req.body);
  res.json({ case: updated });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const updated = await cases.updateCaseStatus(req.params.id, req.user!, req.body.status, req.body.notes);
  res.json({ case: updated });
});

export const assign = asyncHandler(async (req, res) => {
  const updated = await cases.assignCase(req.params.id, req.user!, req.body);
  res.json({ case: updated });
});

export const reviewRepeat = asyncHandler(async (req, res) => {
  const updated = await cases.reviewRepeatOffence(req.params.id, req.user!, req.body);
  res.json({ case: updated });
});

export const getStats = asyncHandler(async (req, res) => {
  const stats = await cases.getDashboardStats(req.user!);
  res.json({ stats });
});

// ─── Module 3: Rehabilitation & SLA ───

export const initiateRehab = asyncHandler(async (req, res) => {
  const result = await cases.initiateRehabilitationPlan(req.params.id, req.user!, req.body);
  res.json({ case: result });
});

export const addIntervention = asyncHandler(async (req, res) => {
  const result = await cases.addIntervention(req.params.id, req.user!, req.body);
  res.json({ case: result });
});

export const updateInterventionHandler = asyncHandler(async (req, res) => {
  const result = await cases.updateIntervention(req.params.id, req.params.interventionId, req.user!, req.body);
  res.json({ case: result });
});

export const getSla = asyncHandler(async (req, res) => {
  const sla = await cases.getCaseSlaStatus(req.params.id, req.user!);
  res.json({ sla });
});

export const runSlaCheck = asyncHandler(async (req, res) => {
  if (req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin only' });
  }
  const result = await cases.processSlaEscalations();
  res.json({ result });
});

export const getQueueStats = asyncHandler(async (req, res) => {
  if (req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin only' });
  }
  res.json({ stats: queueManager.getStats() });
});
