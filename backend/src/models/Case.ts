import { Schema, model, Types } from 'mongoose';
import {
  AGE_RANGES, CASE_STATUSES, CaseStatus, GENDERS, LABOUR_CATEGORIES, RISK_LEVELS, RiskLevel, TRI,
  VULNERABILITY_INDICATORS, WORK_DURATIONS,
} from '../config/constants';

const tri = { type: String, enum: TRI, default: 'UNKNOWN' };

export interface ITimelineEvent {
  stage: string;
  timestamp: Date;
  details?: string;
  byUserId?: Types.ObjectId;
  byUserName?: string;
}

export interface IOfficerOverride {
  isOverridden: boolean;
  originalScore?: number;
  originalLevel?: RiskLevel;
  overriddenScore?: number;
  overriddenLevel?: RiskLevel;
  reason?: string;
  byUserId?: Types.ObjectId;
  byUserName?: string;
  overriddenAt?: Date;
}

export interface IRiskAssessment {
  riskScore: number;
  riskLevel: RiskLevel;
  factors: string[];
  confidence?: number;
  screenedAt: Date;
  officerOverride?: IOfficerOverride;
}

export interface IEmergencyDetails {
  isEmergency: boolean;
  reasons: string[];
  alertedAgencies: string[];
  alertedAt?: Date;
}

export interface IAgencyRecommendation {
  recommendedAgency: string;
  backupAgency: string;
  priority: string;
  expectedResponseHours: number;
  reasons: string[];
}

export interface IAssignment {
  assignedAgencyId?: Types.ObjectId;
  assignedAgencyName?: string;
  assignedOfficerId?: Types.ObjectId;
  assignedOfficerName?: string;
  assignedAt?: Date;
  priority?: string;
  notes?: string;
}

export interface IDuplicateMatch {
  caseId: string;
  similarityScore: number;
  reasons: string[];
}

export interface ISlaRecord {
  ruleName: string;
  targetHours: number;
  deadline: Date;
  status: 'ON_TIME' | 'WARNING' | 'BREACHED';
  warningThresholdMinutes: number;
  escalationLevel: number;
  escalations: {
    level: number;
    escalatedToRole: string;
    escalatedAt: Date;
    reason: string;
  }[];
  breachedAt?: Date;
  resolvedAt?: Date;
}

export interface IIntervention {
  _id?: Types.ObjectId;
  type: string;
  title: string;
  date: Date;
  responsibleAgency: string;
  responsiblePerson: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dependencies: string[];
  outcome?: string;
  followUpDate?: Date;
  documentRef?: string;
  notes?: string;
  outcomeScore?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRehabilitationPlan {
  planId?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  recommendedShelter?: string;
  recommendedEducation?: string;
  recommendedCounselling?: string;
  recommendedPathway?: string;
  mlRecommendation?: any;
  approvedByUserId?: Types.ObjectId;
  approvedByUserName?: string;
  approvedAt?: Date;
  interventions: IIntervention[];
  notes?: string;
}

export interface IRepeatMatch {
  caseId: string;
  reasons: string[];
}

export interface ICase {
  _id: Types.ObjectId;
  caseId: string;
  trackingId: string;
  trackingPinHash: string;
  pinFailedAttempts: number;
  pinLockUntil?: Date;
  reporterType: 'ANONYMOUS' | 'IDENTIFIED';
  reporterUserId?: Types.ObjectId;
  reporterContact?: { name?: string; phone?: string; email?: string };
  establishmentName?: string;
  employerName?: string;
  childInformation: {
    approximateAge?: number;
    ageRange: string;
    gender: string;
    numberOfChildren: number;
    identityKnown: boolean;
    vulnerabilityIndicators: string[];
    immediateDangerObserved: string;
  };
  labourCategories: string[];
  location: {
    state?: string; district: string; taluk?: string; villageOrCity: string; landmark?: string;
    coordinates?: { lat: number; lng: number };
  };
  situationDetails: {
    childActivity: string; workDuration: string;
    currentlyInDanger: string; threatened: string; forcedToWork: string; accompaniedByAdult: string;
    suspectedTrafficking: string; usedForBegging: string; preventedFromSchool: string; multipleChildren: string;
    additionalDescription?: string;
  };
  emergencyIndicator: boolean;
  riskAssessment: IRiskAssessment;
  emergencyDetails?: IEmergencyDetails;
  agencyRecommendation?: IAgencyRecommendation;
  assignment?: IAssignment;
  duplicateCheck?: {
    isPotentialDuplicate: boolean;
    matches: IDuplicateMatch[];
    reviewedByOfficer?: boolean;
    officerDecision?: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  };
  repeatOffenceCheck?: {
    isPotentialRepeat: boolean;
    matches: IRepeatMatch[];
    reviewedByOfficer?: boolean;
    officerDecision?: 'PENDING' | 'CONFIRMED' | 'REJECTED';
    reviewNotes?: string;
  };
  evidenceMetadata: Types.ObjectId[];
  status: CaseStatus;
  statusHistory: { status: CaseStatus; at: Date; byUserId?: Types.ObjectId }[];
  timeline: ITimelineEvent[];
  assignedAgencyIds: Types.ObjectId[];
  sla?: ISlaRecord;
  rehabilitationPlan?: IRehabilitationPlan;
  createdAt: Date;
  updatedAt: Date;
}

const caseSchema = new Schema<ICase>(
  {
    caseId: { type: String, required: true, unique: true },
    trackingId: { type: String, required: true, unique: true },
    trackingPinHash: { type: String, required: true, select: false },
    pinFailedAttempts: { type: Number, default: 0, select: false },
    pinLockUntil: { type: Date, select: false },
    reporterType: { type: String, enum: ['ANONYMOUS', 'IDENTIFIED'], required: true },
    reporterUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    reporterContact: { name: String, phone: String, email: String },
    establishmentName: { type: String, trim: true, maxlength: 200 },
    employerName: { type: String, trim: true, maxlength: 150 },
    childInformation: {
      approximateAge: { type: Number, min: 0, max: 17 },
      ageRange: { type: String, enum: AGE_RANGES, required: true },
      gender: { type: String, enum: GENDERS, default: 'UNKNOWN' },
      numberOfChildren: { type: Number, min: 1, max: 200, default: 1 },
      identityKnown: { type: Boolean, default: false },
      vulnerabilityIndicators: [{ type: String, enum: VULNERABILITY_INDICATORS }],
      immediateDangerObserved: tri,
    },
    labourCategories: { type: [{ type: String, enum: LABOUR_CATEGORIES }], validate: (v: string[]) => v.length > 0 },
    location: {
      state: String,
      district: { type: String, required: true, index: true },
      taluk: String,
      villageOrCity: { type: String, required: true },
      landmark: String,
      coordinates: { lat: Number, lng: Number },
    },
    situationDetails: {
      childActivity: { type: String, required: true, maxlength: 1000 },
      workDuration: { type: String, enum: WORK_DURATIONS, default: 'UNKNOWN' },
      currentlyInDanger: tri,
      threatened: tri,
      forcedToWork: tri,
      accompaniedByAdult: tri,
      suspectedTrafficking: tri,
      usedForBegging: tri,
      preventedFromSchool: tri,
      multipleChildren: tri,
      additionalDescription: { type: String, maxlength: 3000 },
    },
    emergencyIndicator: { type: Boolean, default: false, index: true },
    riskAssessment: {
      riskScore: { type: Number, min: 0, max: 100, default: 10 },
      riskLevel: { type: String, enum: RISK_LEVELS, default: 'LOW' },
      factors: [String],
      confidence: Number,
      screenedAt: { type: Date, default: Date.now },
      officerOverride: {
        isOverridden: { type: Boolean, default: false },
        originalScore: Number,
        originalLevel: { type: String, enum: RISK_LEVELS },
        overriddenScore: Number,
        overriddenLevel: { type: String, enum: RISK_LEVELS },
        reason: String,
        byUserId: { type: Schema.Types.ObjectId, ref: 'User' },
        byUserName: String,
        overriddenAt: Date,
      },
    },
    emergencyDetails: {
      isEmergency: { type: Boolean, default: false },
      reasons: [String],
      alertedAgencies: [String],
      alertedAt: Date,
    },
    agencyRecommendation: {
      recommendedAgency: String,
      backupAgency: String,
      priority: String,
      expectedResponseHours: Number,
      reasons: [String],
    },
    assignment: {
      assignedAgencyId: { type: Schema.Types.ObjectId, ref: 'Agency' },
      assignedAgencyName: String,
      assignedOfficerId: { type: Schema.Types.ObjectId, ref: 'User' },
      assignedOfficerName: String,
      assignedAt: Date,
      priority: String,
      notes: String,
    },
    duplicateCheck: {
      isPotentialDuplicate: { type: Boolean, default: false },
      matches: [{ caseId: String, similarityScore: Number, reasons: [String], _id: false }],
      reviewedByOfficer: { type: Boolean, default: false },
      officerDecision: { type: String, enum: ['PENDING', 'CONFIRMED', 'REJECTED'], default: 'PENDING' },
    },
    repeatOffenceCheck: {
      isPotentialRepeat: { type: Boolean, default: false },
      matches: [{ caseId: String, reasons: [String], _id: false }],
      reviewedByOfficer: { type: Boolean, default: false },
      officerDecision: { type: String, enum: ['PENDING', 'CONFIRMED', 'REJECTED'], default: 'PENDING' },
      reviewNotes: String,
    },
    evidenceMetadata: [{ type: Schema.Types.ObjectId, ref: 'EvidenceMetadata' }],
    status: { type: String, enum: CASE_STATUSES, default: 'REPORTED', index: true },
    statusHistory: [{ status: { type: String, enum: CASE_STATUSES }, at: Date, byUserId: Schema.Types.ObjectId, _id: false }],
    timeline: [{
      stage: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      details: String,
      byUserId: Schema.Types.ObjectId,
      byUserName: String,
      _id: false,
    }],
    assignedAgencyIds: [{ type: Schema.Types.ObjectId, ref: 'Agency', index: true }],
    sla: {
      ruleName: String,
      targetHours: Number,
      deadline: Date,
      status: { type: String, enum: ['ON_TIME', 'WARNING', 'BREACHED'], default: 'ON_TIME' },
      warningThresholdMinutes: { type: Number, default: 30 },
      escalationLevel: { type: Number, default: 0 },
      escalations: [{
        level: Number,
        escalatedToRole: String,
        escalatedAt: { type: Date, default: Date.now },
        reason: String,
        _id: false,
      }],
      breachedAt: Date,
      resolvedAt: Date,
    },
    rehabilitationPlan: {
      planId: String,
      status: { type: String, enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'], default: 'NOT_STARTED' },
      recommendedShelter: String,
      recommendedEducation: String,
      recommendedCounselling: String,
      recommendedPathway: String,
      mlRecommendation: Schema.Types.Mixed,
      approvedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
      approvedByUserName: String,
      approvedAt: Date,
      notes: String,
      interventions: [{
        type: { type: String, required: true },
        title: { type: String, required: true },
        date: { type: Date, default: Date.now },
        responsibleAgency: { type: String, required: true },
        responsiblePerson: { type: String, required: true },
        status: { type: String, enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], default: 'PLANNED' },
        dependencies: [String],
        outcome: String,
        followUpDate: Date,
        documentRef: String,
        notes: String,
        outcomeScore: { type: Number, min: 0, max: 100 },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      }],
    },
  },
  { timestamps: true },
);

caseSchema.index({ createdAt: -1 });
caseSchema.index({ 'riskAssessment.riskScore': -1 });
caseSchema.index({ 'riskAssessment.riskLevel': 1 });

export const Case = model<ICase>('Case', caseSchema);
