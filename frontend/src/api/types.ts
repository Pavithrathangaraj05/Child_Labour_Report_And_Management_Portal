export type Role = 'CITIZEN' | 'POLICE' | 'LABOUR' | 'CWC' | 'NGO' | 'GOVERNMENT' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  agencyId: string | null;
  status?: string;
  isEmailVerified?: boolean;
  lastLoginAt?: string;
}

export interface Evidence {
  id: string;
  fileType: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  classification: string;
  redactionStatus: string;
  hasProtectedOriginal?: boolean;
  sha256?: string;
  accessLogsCount?: number;
}

export interface ISlaRecord {
  ruleName: string;
  targetHours: number;
  deadline: string;
  status: 'ON_TIME' | 'WARNING' | 'BREACHED';
  warningThresholdMinutes: number;
  escalationLevel: number;
  escalations: Array<{
    level: number;
    escalatedToRole: string;
    escalatedAt: string;
    reason: string;
  }>;
  breachedAt?: string;
  resolvedAt?: string;
}

export interface IIntervention {
  _id?: string;
  id?: string;
  type: string;
  title: string;
  date: string;
  responsibleAgency: string;
  responsiblePerson: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dependencies?: string[];
  outcome?: string;
  followUpDate?: string;
  documentRef?: string;
  notes?: string;
  outcomeScore?: number;
}

export interface IRehabilitationPlan {
  planId?: string;
  status: string;
  recommendedShelter?: string;
  recommendedEducation?: string;
  recommendedCounselling?: string;
  recommendedPathway?: string;
  mlRecommendation?: any;
  approvedByUserName?: string;
  approvedAt?: string;
  notes?: string;
  interventions: IIntervention[];
}

export interface ITimelineEvent {
  stage: string;
  timestamp: string;
  details?: string;
  byUserName?: string;
}

export interface IOfficerOverride {
  isOverridden: boolean;
  originalScore?: number;
  originalLevel?: string;
  overriddenScore?: number;
  overriddenLevel?: string;
  reason?: string;
  byUserName?: string;
  overriddenAt?: string;
}

export interface IRiskAssessment {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: string[];
  confidence?: number;
  screenedAt?: string;
  officerOverride?: IOfficerOverride;
}

export interface IAgencyRecommendation {
  recommendedAgency: string;
  backupAgency: string;
  priority: string;
  expectedResponseHours: number;
  reasons: string[];
}

export interface IAssignment {
  assignedAgencyId?: string;
  assignedAgencyName?: string;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  assignedAt?: string;
  priority?: string;
  notes?: string;
}

export interface IDuplicateCheck {
  isPotentialDuplicate: boolean;
  matches: Array<{ caseId: string; similarityScore: number; reasons: string[] }>;
  reviewedByOfficer?: boolean;
  officerDecision?: string;
}

export interface IRepeatOffenceCheck {
  isPotentialRepeat: boolean;
  matches: Array<{ caseId: string; reasons: string[] }>;
  reviewedByOfficer?: boolean;
  officerDecision?: string;
  reviewNotes?: string;
}

export interface CaseRow {
  id: string;
  caseId: string;
  trackingId: string;
  status: string;
  emergencyIndicator: boolean;
  labourCategories: string[];
  view: 'SUMMARY' | 'DETAIL';
  establishmentName?: string;
  employerName?: string;
  location: {
    state?: string;
    district: string;
    taluk?: string;
    villageOrCity?: string;
    landmark?: string;
    coordinates?: { lat: number; lng: number };
  };
  childInformation: {
    approximateAge?: number;
    ageRange: string;
    gender?: string;
    numberOfChildren: number;
    identityKnown?: boolean;
    vulnerabilityIndicators?: string[];
    immediateDangerObserved?: string;
  };
  situationDetails?: Record<string, any>;
  reporterType?: string;
  reporterContact?: { name?: string; phone?: string; email?: string } | null;
  riskAssessment?: IRiskAssessment;
  emergencyDetails?: { isEmergency: boolean; reasons: string[]; alertedAgencies: string[]; alertedAt?: string };
  agencyRecommendation?: IAgencyRecommendation;
  assignment?: IAssignment;
  duplicateCheck?: IDuplicateCheck;
  repeatOffenceCheck?: IRepeatOffenceCheck;
  timeline?: ITimelineEvent[];
  statusHistory?: { status: string; at: string }[];
  evidence?: Evidence[];
  sla?: ISlaRecord;
  rehabilitationPlan?: IRehabilitationPlan;
  primaryAgency?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseList {
  items: CaseRow[];
  total: number;
  page: number;
  limit: number;
  summary: {
    emergencies: number;
    byStatus: Record<string, number>;
  };
}

export interface Agency {
  _id: string;
  name: string;
  type: string;
  district: string;
  contact: { phone?: string; email?: string };
}

export interface Submission {
  caseId: string;
  trackingId: string;
  pin: string;
  status: string;
  submittedAt: string;
  uploadToken: string;
  emergencyIndicator?: boolean;
  riskAssessment?: IRiskAssessment;
}

export interface TrackResult {
  caseId: string;
  trackingId: string;
  status: string;
  stages: string[];
  timeline?: ITimelineEvent[];
  submittedAt: string;
  lastUpdated: string;
}

export interface DashboardStats {
  totalCases: number;
  emergencyCases: number;
  criticalCases: number;
  highCases: number;
  assignedCases: number;
  verifiedCases: number;
  interventionCases: number;
  rescuedCases: number;
  repeatAlerts: number;
  districtHotspots: Array<{ name: string; count: number; emergency: number }>;
  categoryStats: Array<{ category: string; count: number }>;
}

export interface LedgerRecord {
  id: number;
  eventId: string;
  caseId: string;
  previousHash: string;
  currentEvent: string;
  timestamp: string;
  agencyId: string | null;
  agencyName: string | null;
  authorizedUserId: string | null;
  authorizedUserName: string | null;
  authorizedRole: string | null;
  digitalSignature: string;
  publicKey: string;
  metadata: Record<string, any>;
  currentHash: string;
  createdAt: string;
}

export interface AuditVerificationResult {
  caseId: string;
  auditIntegrity: 'VERIFIED' | 'TAMPER DETECTED';
  verified: boolean;
  tamperDetected: boolean;
  totalEvents: number;
  genesisHash: string | null;
  headHash: string | null;
  brokenLinkIndex?: number;
  signatureFailureIndex?: number;
  details: string;
  events: LedgerRecord[];
}

export interface SecurityLogItem {
  id: number;
  logId: string;
  eventType: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  userId?: string;
  userName?: string;
  role?: string;
  agencyId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  status: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  metadata: Record<string, any>;
  timestamp: string;
}

export interface AnalyticsCards {
  totalReports: number;
  pendingVerification: number;
  highRisk: number;
  criticalCases: number;
  casesAssigned: number;
  casesRescued: number;
  underRehab: number;
  slaBreaches: number;
  repeatedOffences: number;
  casesClosed: number;
}

export interface RegionRiskData {
  district: string;
  regionalRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  riskLevel?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  totalCases: number;
  criticalCases: number;
  highCases: number;
  verifiedCases: number;
  repeatOffences: number;
  repeatOffenceCount?: number;
  activeCases?: number;
  rescuedCases?: number;
  dominantCategory?: string;
  riskScore?: number;
  topCategories: Array<{ category: string; count: number }>;
}

