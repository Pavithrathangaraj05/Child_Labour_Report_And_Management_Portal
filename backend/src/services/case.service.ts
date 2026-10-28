import bcrypt from 'bcryptjs';
import { FilterQuery, HydratedDocument, Types } from 'mongoose';
import {
  CASE_STATUSES, CaseStatus, LABOUR_RELATED, PROTECTION_RELATED,
  ROLE_ALLOWED_TRANSITIONS, VALID_STATUS_TRANSITIONS, REHABILITATION_STATUSES,
} from '../config/constants';
import { env } from '../config/env';
import { Agency } from '../models/Agency';
import { Case, ICase, ITimelineEvent } from '../models/Case';
import { Counter, nextSequence } from '../models/Counter';
import { EvidenceMetadata } from '../models/EvidenceMetadata';
import { IUser } from '../models/User';
import { CreateCaseInput } from '../validators/case.validators';
import { AppError } from '../utils/AppError';
import { formatCaseId, generatePin, generateTrackingId } from '../utils/crypto';
import { serializeEvidence } from './evidence.service';
import { processCaseWithML, getRehabilitationRecommendationFromML } from './ml.service';
import { notifyAuthoritiesForCase } from './notification.service';
import { createSlaRecord, evaluateSlaStatus, processSlaEscalations } from './sla.service';
import { eventBus } from './eventBus.service';
import { appendLedgerEvent } from './ledger.service';
import { logSecurityEvent } from './securityAudit.service';

void Counter;
const DUMMY_PIN_HASH = bcrypt.hashSync('000000', 10);

// ───────────── MODULE 2 CASE INTAKE ENGINE ─────────────
export async function createCase(input: CreateCaseInput, reporterUserId?: string) {
  const pin = generatePin();
  const trackingPinHash = await bcrypt.hash(pin, env.BCRYPT_ROUNDS);
  const year = new Date().getFullYear();

  // 1. Fetch potential matching cases for duplicate & repeat detection at this place
  const locationOrEst: any[] = [];
  if (input.establishmentName) locationOrEst.push({ establishmentName: new RegExp(input.establishmentName.trim(), 'i') });
  if (input.employerName) locationOrEst.push({ employerName: new RegExp(input.employerName.trim(), 'i') });
  if (input.location.landmark) locationOrEst.push({ 'location.landmark': new RegExp(input.location.landmark.trim(), 'i') });
  locationOrEst.push({ 'location.villageOrCity': new RegExp(`^${input.location.villageOrCity.trim()}$`, 'i') });

  const candidates = await Case.find({
    'location.district': input.location.district,
    $or: locationOrEst,
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  // 2. Call ML Microservice (FastAPI on :5001 with embedded fallback)
  const casePayload = {
    childInformation: input.child,
    labourCategories: input.labourCategories,
    location: input.location,
    situationDetails: input.situation,
    emergencyIndicator: input.emergency,
    establishmentName: input.establishmentName,
    employerName: input.employerName,
    repeatReportsCount: candidates.length,
    historicalVerifiedCases: candidates.filter((c: any) => c.status === 'VERIFIED' || c.status === 'RESCUED_PROTECTED').length,
  };

  const mlResult = await processCaseWithML(casePayload, candidates);
  const { riskAssessment, duplicateCheck, agencyRecommendation } = mlResult;

  // 3. Determine initial State Machine Status
  const isEmergency = riskAssessment.isEmergency || input.emergency;
  let initialStatus: CaseStatus = 'AI_SCREENED';
  if (isEmergency) {
    initialStatus = 'INTERVENTION_REQUIRED';
  } else if (riskAssessment.riskLevel === 'CRITICAL' || riskAssessment.riskLevel === 'HIGH') {
    initialStatus = 'PRIORITIZED';
  } else {
    initialStatus = 'AI_SCREENED';
  }

  // 4. Build Initial Timeline Events
  const now = new Date();
  const timeline: ITimelineEvent[] = [
    {
      stage: 'Report Submitted',
      timestamp: now,
      details: `Report ingested into ChildSafe platform via ${input.reporter.type.toLowerCase()} intake`,
    },
    {
      stage: 'AI Screening Completed',
      timestamp: new Date(now.getTime() + 1000),
      details: `AI Risk Assessment Score: ${riskAssessment.riskScore}/100 [${riskAssessment.riskLevel}]. Signals: ${riskAssessment.factors.slice(0, 3).join(', ')}`,
    },
  ];

  if (isEmergency) {
    timeline.push({
      stage: 'CRITICAL CHILD SAFETY ALERT',
      timestamp: new Date(now.getTime() + 2000),
      details: `Emergency condition detected! First responder alert triggered for ${agencyRecommendation.recommendedAgency}`,
    });
  }

  if (duplicateCheck.isPotentialDuplicate) {
    timeline.push({
      stage: 'Duplicate Alert Flagged',
      timestamp: new Date(now.getTime() + 3000),
      details: `Similarity detected with case ${duplicateCheck.duplicateMatches[0]?.caseId} (${duplicateCheck.duplicateMatches[0]?.similarityScore}% match)`,
    });
  }

  if (duplicateCheck.isPotentialRepeat) {
    timeline.push({
      stage: 'Possible Repeat Offence Flagged',
      timestamp: new Date(now.getTime() + 3500),
      details: `Repeat offence history found at location/establishment (${duplicateCheck.repeatMatches.length} prior cases)`,
    });
  }

  timeline.push({
    stage: 'Agency Recommendation Generated',
    timestamp: new Date(now.getTime() + 4000),
    details: `Recommended Agency: ${agencyRecommendation.recommendedAgency} (Backup: ${agencyRecommendation.backupAgency}). Target Response: ${agencyRecommendation.expectedResponseHours}h`,
  });

  // 5. Atomic ID Generation & DB Save
  for (let attempt = 0; attempt < 5; attempt++) {
    const caseId = formatCaseId(year, await nextSequence(`case-${year}`));
    const trackingId = generateTrackingId();
    try {
      const doc = await Case.create({
        caseId,
        trackingId,
        trackingPinHash,
        reporterType: input.reporter.type,
        reporterUserId: reporterUserId ? new Types.ObjectId(reporterUserId) : undefined,
        reporterContact: input.reporter.type === 'IDENTIFIED'
          ? { name: input.reporter.name, phone: input.reporter.phone, email: input.reporter.email }
          : undefined,
        establishmentName: input.establishmentName,
        employerName: input.employerName,
        childInformation: input.child,
        labourCategories: [...new Set(input.labourCategories)],
        location: input.location,
        situationDetails: input.situation,
        emergencyIndicator: isEmergency,
        riskAssessment: {
          riskScore: riskAssessment.riskScore,
          riskLevel: riskAssessment.riskLevel,
          factors: riskAssessment.factors,
          confidence: riskAssessment.confidence,
          screenedAt: now,
          officerOverride: { isOverridden: false },
        },
        emergencyDetails: {
          isEmergency,
          reasons: riskAssessment.emergencyReasons || [],
          alertedAgencies: isEmergency ? ['POLICE', 'CWC', 'LABOUR'] : [agencyRecommendation.recommendedAgency],
          alertedAt: now,
        },
        agencyRecommendation,
        duplicateCheck: {
          isPotentialDuplicate: duplicateCheck.isPotentialDuplicate,
          matches: duplicateCheck.duplicateMatches.map((m) => ({
            caseId: m.caseId,
            similarityScore: m.similarityScore,
            reasons: m.reasons,
          })),
          reviewedByOfficer: false,
          officerDecision: 'PENDING',
        },
        repeatOffenceCheck: {
          isPotentialRepeat: duplicateCheck.isPotentialRepeat,
          matches: duplicateCheck.repeatMatches.map((m) => ({
            caseId: m.caseId,
            reasons: m.reasons,
          })),
          reviewedByOfficer: false,
          officerDecision: 'PENDING',
        },
        status: initialStatus,
        statusHistory: [
          { status: 'REPORTED', at: now },
          { status: initialStatus, at: now },
        ],
        timeline,
      });

      // 6. Attach SLA record (Module 3)
      const slaRecord = createSlaRecord(riskAssessment.riskLevel, now);
      doc.sla = slaRecord;
      await doc.save();

      // 7. Notify Authorities via Email & In-App Alerts
      notifyAuthoritiesForCase(doc).catch((err) => console.error('Notification error:', err));

      // 8. Emit CASE_CREATED event (Module 3)
      eventBus.emit('CASE_CREATED', {
        caseId: doc.caseId,
        caseDocId: doc._id,
        riskLevel: doc.riskAssessment.riskLevel,
        emergencyIndicator: doc.emergencyIndicator,
        message: `New case ${doc.caseId} submitted – Risk: ${doc.riskAssessment.riskLevel}`,
      });

      // 9. Append REPORT_CREATED to Cryptographic Audit Ledger (Module 4)
      appendLedgerEvent({
        caseId: doc.caseId,
        eventType: 'REPORT_CREATED',
        timestamp: now,
        role: reporterUserId ? 'CITIZEN' : 'ANONYMOUS_REPORTER',
        userId: reporterUserId,
        metadata: {
          emergency: doc.emergencyIndicator,
          district: doc.location.district,
          categories: doc.labourCategories,
          riskScore: doc.riskAssessment.riskScore,
          riskLevel: doc.riskAssessment.riskLevel,
        },
      }).catch((err) => console.error('[LEDGER REPORT_CREATED ERROR]', err.message));

      if (isEmergency) {
        eventBus.emit('EMERGENCY_DETECTED', {
          caseId: doc.caseId,
          caseDocId: doc._id,
          message: `⚠️ EMERGENCY: Case ${doc.caseId} requires immediate intervention.`,
        });
      }

      return { doc, pin };
    } catch (e: any) {
      if (e?.code === 11000 && attempt < 4) continue; // ID collision: regenerate
      throw e;
    }
  }
  throw new AppError(500, 'Could not allocate a case identifier');
}

// ───────────── CITIZEN TRACKING ─────────────
const PIN_MAX_FAILS = 5;
const PIN_LOCK_MIN = 15;

export async function trackCase(trackingId: string, pin: string) {
  const generic = new AppError(404, 'No case matches that Tracking ID and PIN. Check both and try again.');
  const c = await Case.findOne({ trackingId }).select('+trackingPinHash +pinFailedAttempts +pinLockUntil');
  if (!c) {
    await bcrypt.compare(pin, DUMMY_PIN_HASH);
    throw generic;
  }
  if (c.pinLockUntil && c.pinLockUntil > new Date()) {
    throw new AppError(429, 'Too many incorrect PIN attempts. Try again in 15 minutes.');
  }
  if (!(await bcrypt.compare(pin, c.trackingPinHash))) {
    c.pinFailedAttempts = (c.pinFailedAttempts ?? 0) + 1;
    if (c.pinFailedAttempts >= PIN_MAX_FAILS) {
      c.pinLockUntil = new Date(Date.now() + PIN_LOCK_MIN * 60_000);
      c.pinFailedAttempts = 0;
    }
    await c.save();
    throw generic;
  }
  if (c.pinFailedAttempts) {
    c.pinFailedAttempts = 0;
    c.pinLockUntil = undefined;
    await c.save();
  }

  // Safe projection for public complainer tracking
  return {
    caseId: c.caseId,
    trackingId: c.trackingId,
    status: c.status,
    stages: [
      'REPORTED',
      'AI_SCREENED',
      'VERIFICATION_PENDING',
      'VERIFIED',
      'PRIORITIZED',
      'ASSIGNED',
      'INTERVENTION_REQUIRED',
      'RESCUED_PROTECTED',
      'CLOSED',
    ],
    timeline: c.timeline.map((t) => ({ stage: t.stage, timestamp: t.timestamp, details: t.details })),
    submittedAt: c.createdAt,
    lastUpdated: c.updatedAt,
  };
}

/** End-to-end tracking for authenticated citizens */
export async function listCitizenReports(userId: string) {
  const cases = await Case.find({ reporterUserId: new Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .lean();

  return cases.map((c: any) => ({
    id: String(c._id),
    caseId: c.caseId,
    trackingId: c.trackingId,
    status: c.status,
    emergencyIndicator: c.emergencyIndicator,
    labourCategories: c.labourCategories,
    district: c.location?.district,
    villageOrCity: c.location?.villageOrCity,
    timeline: c.timeline || [],
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

// ───────────── RBAC SCOPE & SEARCH ─────────────
export async function scopeFor(user: IUser): Promise<FilterQuery<ICase> | null> {
  if (user.role === 'ADMIN') return {};
  if (!['POLICE', 'LABOUR', 'CWC', 'NGO', 'GOVERNMENT'].includes(user.role) || !user.agencyId) return null;
  const agency = await Agency.findById(user.agencyId);
  if (!agency || agency.status !== 'ACTIVE') return null;
  const assigned = { assignedAgencyIds: agency._id };
  const district = { 'location.district': agency.district };
  switch (user.role) {
    case 'POLICE':
      return { $or: [assigned, { ...district, emergencyIndicator: true }, { ...district, 'riskAssessment.riskLevel': 'CRITICAL' }] };
    case 'LABOUR':
      return { $or: [assigned, { ...district, labourCategories: { $in: LABOUR_RELATED } }] };
    case 'CWC':
      return {
        $or: [
          assigned,
          {
            ...district,
            $or: [
              { emergencyIndicator: true },
              { labourCategories: { $in: PROTECTION_RELATED } },
              { 'childInformation.vulnerabilityIndicators.0': { $exists: true } },
            ],
          },
        ],
      };
    case 'NGO':
      return assigned;
    case 'GOVERNMENT':
      return district;
    default:
      return null;
  }
}

// ───────────── ROLE-BASED SERIALIZATION ─────────────
export async function serializeCase(doc: HydratedDocument<ICase> | any, role: string, withEvidence = false) {
  const c: any = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const summary = {
    id: String(c._id),
    caseId: c.caseId,
    trackingId: c.trackingId,
    status: c.status,
    emergencyIndicator: c.emergencyIndicator,
    labourCategories: c.labourCategories,
    riskAssessment: c.riskAssessment,
    agencyRecommendation: c.agencyRecommendation,
    assignment: c.assignment,
    duplicateCheck: c.duplicateCheck,
    repeatOffenceCheck: c.repeatOffenceCheck,
    establishmentName: c.establishmentName,
    employerName: c.employerName,
    location: {
      state: c.location?.state,
      district: c.location?.district,
      villageOrCity: c.location?.villageOrCity,
    },
    childInformation: {
      ageRange: c.childInformation?.ageRange,
      numberOfChildren: c.childInformation?.numberOfChildren,
      vulnerabilityIndicators: c.childInformation?.vulnerabilityIndicators,
      immediateDangerObserved: c.childInformation?.immediateDangerObserved,
    },
    sla: c.sla,
    rehabilitationPlan: c.rehabilitationPlan,
    timeline: c.timeline,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };

  if (role === 'GOVERNMENT') return { ...summary, view: 'SUMMARY' };

  const evidence = withEvidence
    ? (await EvidenceMetadata.find({ _id: { $in: c.evidenceMetadata } }).sort({ uploadedAt: 1 })).map(serializeEvidence)
    : undefined;

  const sd = c.situationDetails;
  const full = {
    ...summary,
    view: 'DETAIL',
    location: {
      ...summary.location,
      taluk: c.location?.taluk,
      landmark: c.location?.landmark,
      coordinates: c.location?.coordinates,
    },
    childInformation: { ...c.childInformation?.toObject?.() ?? c.childInformation },
    situationDetails: sd?.toObject?.() ?? sd,
    reporterType: c.reporterType,
    statusHistory: c.statusHistory,
    evidence,
  };

  switch (role) {
    case 'POLICE':
    case 'CWC':
    case 'ADMIN':
      return { ...full, reporterContact: c.reporterContact ?? null };
    case 'LABOUR': {
      const { gender, identityKnown, ...ci } = full.childInformation as any;
      void gender; void identityKnown;
      return { ...full, childInformation: ci, location: { ...full.location, coordinates: undefined } };
    }
    case 'NGO': {
      return {
        ...full,
        location: { ...summary.location, taluk: c.location?.taluk },
        situationDetails: {
          childActivity: sd.childActivity,
          workDuration: sd.workDuration,
          preventedFromSchool: sd.preventedFromSchool,
        },
      };
    }
    default:
      throw new AppError(403, 'Not permitted');
  }
}

export async function findCaseForUser(user: IUser, id: string) {
  const scope = await scopeFor(user);
  if (!scope) throw new AppError(403, 'Your role does not have access to case information');
  const idFilter = /^(CL-\d{4}-\d{6}|[a-f\d]{24})$/i.test(id)
    ? (/^CL-/i.test(id) ? { caseId: id.toUpperCase() } : { _id: id })
    : { caseId: id.toUpperCase() };

  const doc = await Case.findOne({ $and: [idFilter, scope] });
  if (!doc) throw new AppError(404, 'Case not found');
  return doc;
}

export async function listCasesForUser(user: IUser, q: any) {
  const scope = await scopeFor(user);
  if (!scope) throw new AppError(403, 'Your role does not have access to case information');
  const filter: FilterQuery<ICase> = { $and: [scope] };

  if (q.status) filter.$and!.push({ status: q.status });
  if (q.emergency) filter.$and!.push({ emergencyIndicator: q.emergency === 'true' });
  if (q.riskLevel) filter.$and!.push({ 'riskAssessment.riskLevel': q.riskLevel });
  if (q.district) filter.$and!.push({ 'location.district': new RegExp(q.district, 'i') });
  if (q.category) filter.$and!.push({ labourCategories: q.category });
  if (q.search) {
    const s = q.search.trim();
    filter.$and!.push({
      $or: [
        { caseId: new RegExp(s, 'i') },
        { trackingId: new RegExp(s, 'i') },
        { establishmentName: new RegExp(s, 'i') },
        { employerName: new RegExp(s, 'i') },
        { 'location.villageOrCity': new RegExp(s, 'i') },
        { 'situationDetails.childActivity': new RegExp(s, 'i') },
      ],
    });
  }

  const [items, total, byStatus, emergencies] = await Promise.all([
    Case.find(filter)
      .sort({ emergencyIndicator: -1, 'riskAssessment.riskScore': -1, createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    Case.countDocuments(filter),
    Case.aggregate([{ $match: { $and: [scope] } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Case.countDocuments({ $and: [scope, { emergencyIndicator: true }] }),
  ]);

  return {
    items: await Promise.all(items.map((c) => serializeCase(c, user.role))),
    total,
    page: q.page,
    limit: q.limit,
    summary: { emergencies, byStatus: Object.fromEntries(byStatus.map((s: any) => [s._id, s.n])) },
  };
}

// ───────────── MODULE 2 OFFICER AI OVERRIDE ─────────────
export async function overrideAiRisk(
  caseId: string,
  user: IUser,
  override: { riskScore: number; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; reason: string }
) {
  const doc = await findCaseForUser(user, caseId);
  const origScore = doc.riskAssessment.riskScore;
  const origLevel = doc.riskAssessment.riskLevel;

  doc.riskAssessment.officerOverride = {
    isOverridden: true,
    originalScore: origScore,
    originalLevel: origLevel,
    overriddenScore: override.riskScore,
    overriddenLevel: override.riskLevel,
    reason: override.reason,
    byUserId: user._id,
    byUserName: user.name,
    overriddenAt: new Date(),
  };

  doc.riskAssessment.riskScore = override.riskScore;
  doc.riskAssessment.riskLevel = override.riskLevel;

  doc.timeline.push({
    stage: 'AI Risk Overridden',
    timestamp: new Date(),
    details: `Officer ${user.name} (${user.role}) changed score from ${origScore} [${origLevel}] to ${override.riskScore} [${override.riskLevel}]. Reason: "${override.reason}"`,
    byUserId: user._id,
    byUserName: user.name,
  });

  await doc.save();
  return serializeCase(doc, user.role, true);
}

// ───────────── MODULE 2 STATE MACHINE TRANSITIONS ─────────────
export async function updateCaseStatus(caseId: string, user: IUser, newStatus: CaseStatus, notes?: string) {
  const doc = await findCaseForUser(user, caseId);
  const currentStatus = doc.status;

  // 1. Validate State Transition
  const allowedNext = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  if (user.role !== 'ADMIN' && !allowedNext.includes(newStatus)) {
    throw new AppError(400, `Cannot transition case from '${currentStatus}' to '${newStatus}'. Valid next states: ${allowedNext.join(', ')}`);
  }

  // 2. Validate Role Permissions
  const roleAllowed = ROLE_ALLOWED_TRANSITIONS[user.role] || [];
  if (user.role !== 'ADMIN' && !roleAllowed.includes(newStatus)) {
    throw new AppError(403, `Role '${user.role}' is not authorized to transition cases to '${newStatus}'`);
  }

  doc.status = newStatus;
  const now = new Date();
  doc.statusHistory.push({ status: newStatus, at: now, byUserId: user._id });
  doc.timeline.push({
    stage: `Status: ${newStatus.replace(/_/g, ' ')}`,
    timestamp: now,
    details: `Updated by Officer ${user.name} (${user.role}). ${notes ? `Note: ${notes}` : ''}`.trim(),
    byUserId: user._id,
    byUserName: user.name,
  });

  await doc.save();

  // Cryptographic Ledger signed state transition (Module 4)
  appendLedgerEvent({
    caseId: doc.caseId,
    eventType: newStatus,
    timestamp: now,
    agencyId: user.agencyId ? String(user.agencyId) : undefined,
    agencyName: undefined,
    userId: String(user._id),
    userName: user.name,
    role: user.role,
    metadata: {
      previousStatus: currentStatus,
      newStatus,
      notes: notes || undefined,
    },
  }).catch((err) => console.error('[LEDGER STATUS_UPDATE ERROR]', err.message));

  await logSecurityEvent({
    eventType: 'CASE_STATUS_CHANGED',
    severity: newStatus === 'RESCUED_PROTECTED' || newStatus === 'INTERVENTION_REQUIRED' ? 'WARNING' : 'INFO',
    userId: String(user._id),
    userName: user.name,
    role: user.role,
    agencyId: user.agencyId ? String(user.agencyId) : undefined,
    resource: 'CASE',
    action: `CHANGE_STATUS_TO_${newStatus}`,
    status: 'SUCCESS',
    metadata: { caseId: doc.caseId, previousStatus: currentStatus, newStatus },
  });

  return serializeCase(doc, user.role, true);
}

// ───────────── MODULE 2 AGENCY ASSIGNMENT ─────────────
export async function assignCase(
  caseId: string,
  user: IUser,
  input: { agencyId: string; officerId?: string; priority?: string; notes?: string }
) {
  const doc = await findCaseForUser(user, caseId);
  const agency = await Agency.findById(input.agencyId);
  if (!agency) throw new AppError(404, 'Agency not found');

  let officerName: string | undefined;
  if (input.officerId) {
    const officer = await Agency.findById(input.officerId);
    officerName = officer?.name;
  }

  const agencyObjectId = new Types.ObjectId(input.agencyId);
  doc.assignment = {
    assignedAgencyId: agencyObjectId,
    assignedAgencyName: agency.name,
    assignedOfficerId: input.officerId ? new Types.ObjectId(input.officerId) : undefined,
    assignedOfficerName: officerName,
    assignedAt: new Date(),
    priority: input.priority || doc.riskAssessment?.riskLevel,
    notes: input.notes,
  };

  if (!doc.assignedAgencyIds.some((id) => id.equals(agencyObjectId))) {
    doc.assignedAgencyIds.push(agencyObjectId);
  }

  // Progress state to ASSIGNED if currently pre-assignment
  if (['REPORTED', 'AI_SCREENED', 'VERIFICATION_PENDING', 'VERIFIED', 'PRIORITIZED'].includes(doc.status)) {
    doc.status = 'ASSIGNED';
    doc.statusHistory.push({ status: 'ASSIGNED', at: new Date(), byUserId: user._id });
  }

  doc.timeline.push({
    stage: 'Case Assigned',
    timestamp: new Date(),
    details: `Assigned to ${agency.name}${officerName ? ` (Officer: ${officerName})` : ''} by ${user.name}. Priority: ${doc.assignment.priority}`,
    byUserId: user._id,
    byUserName: user.name,
  });

  await doc.save();

  appendLedgerEvent({
    caseId: doc.caseId,
    eventType: 'ASSIGNED',
    timestamp: new Date(),
    agencyId: input.agencyId,
    agencyName: agency.name,
    userId: String(user._id),
    userName: user.name,
    role: user.role,
    metadata: {
      assignedAgency: agency.name,
      assignedOfficer: officerName,
      priority: doc.assignment.priority,
    },
  }).catch((err) => console.error('[LEDGER ASSIGNED ERROR]', err.message));

  return serializeCase(doc, user.role, true);
}

// ───────────── MODULE 2 REPEAT OFFENCE REVIEW ─────────────
export async function reviewRepeatOffence(
  caseId: string,
  user: IUser,
  review: { decision: 'CONFIRMED' | 'REJECTED'; notes?: string }
) {
  const doc = await findCaseForUser(user, caseId);
  if (!doc.repeatOffenceCheck) {
    doc.repeatOffenceCheck = { isPotentialRepeat: false, matches: [] };
  }

  doc.repeatOffenceCheck.reviewedByOfficer = true;
  doc.repeatOffenceCheck.officerDecision = review.decision;
  doc.repeatOffenceCheck.reviewNotes = review.notes;

  doc.timeline.push({
    stage: `Repeat Offence ${review.decision === 'CONFIRMED' ? 'Confirmed' : 'Dismissed'}`,
    timestamp: new Date(),
    details: `Officer ${user.name} (${user.role}) reviewed potential repeat offence links: ${review.decision}. ${review.notes ? `Notes: ${review.notes}` : ''}`.trim(),
    byUserId: user._id,
    byUserName: user.name,
  });

  await doc.save();
  return serializeCase(doc, user.role, true);
}

// ───────────── ROLE-SPECIFIC REAL DASHBOARD STATS ─────────────
export async function getDashboardStats(user: IUser) {
  const scope = await scopeFor(user);
  if (!scope) throw new AppError(403, 'Forbidden');

  const baseFilter = { $and: [scope] };

  const [
    totalCases,
    emergencyCases,
    criticalCases,
    highCases,
    assignedCases,
    verifiedCases,
    interventionCases,
    rescuedCases,
    repeatAlerts,
    districtHotspots,
    categoryStats,
  ] = await Promise.all([
    Case.countDocuments(baseFilter),
    Case.countDocuments({ ...baseFilter, emergencyIndicator: true }),
    Case.countDocuments({ ...baseFilter, 'riskAssessment.riskLevel': 'CRITICAL' }),
    Case.countDocuments({ ...baseFilter, 'riskAssessment.riskLevel': 'HIGH' }),
    Case.countDocuments({ ...baseFilter, status: { $in: ['ASSIGNED', 'INTERVENTION_REQUIRED', 'INTERVENTION'] } }),
    Case.countDocuments({ ...baseFilter, status: 'VERIFIED' }),
    Case.countDocuments({ ...baseFilter, status: { $in: ['INTERVENTION_REQUIRED', 'INTERVENTION'] } }),
    Case.countDocuments({ ...baseFilter, status: { $in: ['RESCUED_PROTECTED', 'PROTECTION_REHABILITATION'] } }),
    Case.countDocuments({ ...baseFilter, 'repeatOffenceCheck.isPotentialRepeat': true }),
    Case.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$location.villageOrCity', count: { $sum: 1 }, emergencyCount: { $sum: { $cond: ['$emergencyIndicator', 1, 0] } } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Case.aggregate([
      { $match: baseFilter },
      { $unwind: '$labourCategories' },
      { $group: { _id: '$labourCategories', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  return {
    totalCases,
    emergencyCases,
    criticalCases,
    highCases,
    assignedCases,
    verifiedCases,
    interventionCases,
    rescuedCases,
    repeatAlerts,
    districtHotspots: districtHotspots.map((d: any) => ({ name: d._id || 'Unknown', count: d.count, emergency: d.emergencyCount })),
    categoryStats: categoryStats.map((c: any) => ({ category: c._id, count: c.count })),
  };
}

// ─────────────── MODULE 3: REHABILITATION WORKFLOW ───────────────

export async function initiateRehabilitationPlan(
  caseId: string,
  user: IUser,
  input: { notes?: string }
) {
  const doc = await findCaseForUser(user, caseId);
  if (!['CWC', 'ADMIN', 'NGO'].includes(user.role)) throw new AppError(403, 'Only CWC, NGO, and Admin can initiate rehabilitation plans');

  const rehabStatuses: string[] = [...REHABILITATION_STATUSES];
  const isInRehabPhase = rehabStatuses.includes(doc.status) || doc.status === 'RESCUED_PROTECTED';
  if (!isInRehabPhase) throw new AppError(400, `Case must be RESCUED_PROTECTED or in rehabilitation phase. Current: ${doc.status}`);

  const caseData = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const mlRecommendation = await getRehabilitationRecommendationFromML(caseData);

  doc.rehabilitationPlan = {
    planId: `REHAB-${doc.caseId}-${Date.now()}`,
    status: 'IN_PROGRESS',
    recommendedShelter: mlRecommendation.shelterType,
    recommendedEducation: mlRecommendation.educationIntervention,
    recommendedCounselling: mlRecommendation.counsellingRequirement,
    recommendedPathway: mlRecommendation.reintegrationPathway,
    mlRecommendation,
    notes: input.notes,
    interventions: [],
  };

  const now = new Date();
  doc.timeline.push({ stage: 'Rehabilitation Plan Initiated', timestamp: now, details: `Plan created by ${user.name} (${user.role}).`, byUserId: user._id, byUserName: user.name });

  if (doc.status === 'RESCUED_PROTECTED') {
    doc.status = 'REHABILITATION_PLANNED';
    doc.statusHistory.push({ status: 'REHABILITATION_PLANNED', at: now, byUserId: user._id });
  }

  await doc.save();
  eventBus.emit('REHABILITATION_UPDATE', { caseId: doc.caseId, message: `Rehabilitation plan initiated for case ${doc.caseId}` });
  return serializeCase(doc, user.role, false);
}

export async function addIntervention(
  caseId: string,
  user: IUser,
  input: {
    type: string; title: string; date?: Date; responsibleAgency: string; responsiblePerson: string;
    status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    dependencies?: string[]; outcome?: string; followUpDate?: Date; notes?: string; outcomeScore?: number;
  }
) {
  const doc = await findCaseForUser(user, caseId);
  if (!['CWC', 'ADMIN', 'NGO'].includes(user.role)) throw new AppError(403, 'Only CWC, NGO, and Admin can add interventions');
  if (!doc.rehabilitationPlan) throw new AppError(400, 'No rehabilitation plan found. Initiate one first.');

  const now = new Date();
  const intervention: any = {
    type: input.type, title: input.title, date: input.date || now, responsibleAgency: input.responsibleAgency,
    responsiblePerson: input.responsiblePerson, status: input.status || 'PLANNED', dependencies: input.dependencies || [],
    outcome: input.outcome, followUpDate: input.followUpDate, notes: input.notes, outcomeScore: input.outcomeScore,
    createdAt: now, updatedAt: now,
  };

  doc.rehabilitationPlan.interventions.push(intervention);
  doc.timeline.push({
    stage: `Intervention Added: ${input.type}`, timestamp: now,
    details: `${input.title} by ${input.responsiblePerson} (${input.responsibleAgency}) — Status: ${intervention.status}`,
    byUserId: user._id, byUserName: user.name,
  });

  const typeToStatus: Record<string, CaseStatus> = {
    SHELTER: 'SHELTER', MEDICAL_ASSESSMENT: 'MEDICAL_ASSESSMENT', COUNSELLING: 'COUNSELLING',
    EDUCATION: 'EDUCATION', FAMILY_ASSESSMENT: 'FAMILY_ASSESSMENT', FAMILY_REINTEGRATION: 'FAMILY_REINTEGRATION',
    FOLLOW_UP: 'FOLLOW_UP', MONITORING: 'MONITORING',
  };

  const newStatus = typeToStatus[input.type];
  if (newStatus) {
    doc.status = newStatus;
    doc.statusHistory.push({ status: newStatus, at: now, byUserId: user._id });
  }

  if (input.followUpDate) {
    eventBus.emit('FOLLOW_UP_DUE', { caseId: doc.caseId, followUpDate: input.followUpDate, message: `Follow-up required for case ${doc.caseId}` });
  }

  await doc.save();
  eventBus.emit('REHABILITATION_UPDATE', { caseId: doc.caseId, message: `Intervention '${input.title}' added` });
  return serializeCase(doc, user.role, false);
}

export async function updateIntervention(
  caseId: string, interventionId: string, user: IUser,
  updates: Partial<{ status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'; outcome: string; outcomeScore: number; followUpDate: Date; notes: string; }>
) {
  const doc = await findCaseForUser(user, caseId);
  if (!['CWC', 'ADMIN', 'NGO'].includes(user.role)) throw new AppError(403, 'Only CWC, NGO, and Admin can update interventions');
  if (!doc.rehabilitationPlan) throw new AppError(400, 'No rehabilitation plan found');

  const intervention = doc.rehabilitationPlan.interventions.find((i: any) => String(i._id) === interventionId);
  if (!intervention) throw new AppError(404, 'Intervention not found');

  Object.assign(intervention, { ...updates, updatedAt: new Date() });
  doc.timeline.push({ stage: `Intervention Updated: ${intervention.type}`, timestamp: new Date(), details: `Updated to '${intervention.status}' by ${user.name}`, byUserId: user._id, byUserName: user.name });

  await doc.save();
  return serializeCase(doc, user.role, false);
}

export async function getCaseSlaStatus(caseId: string, user: IUser) {
  const doc = await findCaseForUser(user, caseId);
  if (!doc.sla) return { hasSla: false };

  const evalResult = evaluateSlaStatus(doc.sla);
  return {
    hasSla: true,
    ruleName: doc.sla.ruleName,
    deadline: doc.sla.deadline,
    targetHours: doc.sla.targetHours,
    warningThresholdMinutes: doc.sla.warningThresholdMinutes,
    status: evalResult.status,
    remainingMs: evalResult.remainingMs,
    remainingHours: evalResult.remainingHours,
    escalationLevel: doc.sla.escalationLevel,
    escalations: doc.sla.escalations,
  };
}

export { processSlaEscalations };

