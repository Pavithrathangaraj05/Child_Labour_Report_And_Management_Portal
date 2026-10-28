/* Fictional demo data only. No real people, children, districts or agencies. */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env, isProd } from './config/env';
import { initPostgresPool } from './config/postgres';
import { appendLedgerEvent } from './services/ledger.service';
import { Agency } from './models/Agency';
import { Case } from './models/Case';
import { Counter } from './models/Counter';
import { EvidenceMetadata } from './models/EvidenceMetadata';
import { RefreshSession } from './models/RefreshSession';
import { User } from './models/User';

async function seed() {
  if (isProd) throw new Error('Refusing to seed demo data in production');
  if (!env.SEED_PASSWORD) throw new Error('Set SEED_PASSWORD in .env (run `npm run setup:env`)');
  await mongoose.connect(env.MONGODB_URI);
  await initPostgresPool();
  await Promise.all([Agency, Case, User, EvidenceMetadata, RefreshSession, Counter].map((m: any) => m.deleteMany({})));

  const mk = (name: string, type: any, district: string, phone: string) =>
    Agency.create({ name, type, district, state: 'Demo State', contact: { phone, email: `contact@${type.toLowerCase()}.demo.invalid` } });
  const [polA, labA, cwcA, ngoA, govA, polB] = await Promise.all([
    mk('Demo Alpha District Police Unit (SJPU)', 'POLICE', 'Demo District Alpha', '000-0000-001'),
    mk('Demo Alpha Labour Department', 'LABOUR', 'Demo District Alpha', '000-0000-002'),
    mk('Demo Alpha Child Welfare Committee (CWC)', 'CWC', 'Demo District Alpha', '000-0000-003'),
    mk('Hope Bridge Demo NGO Childline', 'NGO', 'Demo District Alpha', '000-0000-004'),
    mk('District Magistrate Government Office', 'GOVERNMENT', 'Demo District Alpha', '000-0000-005'),
    mk('Demo Beta District Police Unit', 'POLICE', 'Demo District Beta', '000-0000-006'),
  ]);

  const passwordHash = await bcrypt.hash(env.SEED_PASSWORD, env.BCRYPT_ROUNDS);
  const users: [string, string, any, any?][] = [
    ['Demo Admin Officer', 'admin@childsafe.demo', 'ADMIN'],
    ['Inspector Rajesh Sharma (SJPU)', 'police@childsafe.demo', 'POLICE', polA],
    ['Inspector Anita Roy (Beta)', 'police.beta@childsafe.demo', 'POLICE', polB],
    ['Labour Officer Sunil Mehta', 'labour@childsafe.demo', 'LABOUR', labA],
    ['CWC Chairperson Dr. Priya Sen', 'cwc@childsafe.demo', 'CWC', cwcA],
    ['NGO Worker Kavita Rao', 'ngo@childsafe.demo', 'NGO', ngoA],
    ['District Magistrate Officer Verma', 'gov@childsafe.demo', 'GOVERNMENT', govA],
    ['Citizen Whistleblower Ananya', 'citizen@childsafe.demo', 'CITIZEN'],
  ];
  const createdUsers: any = {};
  for (const [name, email, role, agency] of users) {
    createdUsers[email] = await User.create({
      name, email, role, agencyId: agency?._id, passwordHash, isEmailVerified: true,
    });
  }

  const demoPin = '123456';
  const trackingPinHash = await bcrypt.hash(demoPin, env.BCRYPT_ROUNDS);
  const citizenUser = createdUsers['citizen@childsafe.demo'];
  const policeUser = createdUsers['police@childsafe.demo'];
  const labourUser = createdUsers['labour@childsafe.demo'];
  const cwcUser = createdUsers['cwc@childsafe.demo'];

  const base = {
    reporterType: 'ANONYMOUS' as const,
    trackingPinHash,
    location: {
      state: 'Demo State', district: 'Demo District Alpha', taluk: 'Demo Taluk 1',
      villageOrCity: 'Market Area A', landmark: 'Near Central Vegetable Wholesale Market',
      coordinates: { lat: 12.9716, lng: 77.5946 },
    },
  };
  const mkSit = (o: any = {}) => ({
    childActivity: 'Selling items at a roadside stall', workDuration: 'ONE_TO_SIX_MONTHS',
    currentlyInDanger: 'NO', threatened: 'NO', forcedToWork: 'UNKNOWN', accompaniedByAdult: 'YES',
    suspectedTrafficking: 'NO', usedForBegging: 'NO', preventedFromSchool: 'YES', multipleChildren: 'NO', ...o,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DEMO SCENARIO 1 — Street Vending (Complete Rehabilitation Flow)
  // "A young child appears to be selling vegetables near a roadside market every evening."
  // ═══════════════════════════════════════════════════════════════════════════
  const case1Id = 'CL-2026-000145';
  await Case.create({
    ...base,
    caseId: case1Id,
    trackingId: 'CS-STREET01',
    reporterUserId: citizenUser?._id,
    establishmentName: 'Roadside Vegetable Stall, Market Area A',
    childInformation: {
      approximateAge: 11, ageRange: 'AGE_11_13', gender: 'MALE', numberOfChildren: 1,
      identityKnown: false, vulnerabilityIndicators: ['OUT_OF_SCHOOL'], immediateDangerObserved: 'NO',
    },
    labourCategories: ['STREET_VENDING'],
    situationDetails: mkSit({
      childActivity: 'A young child appears to be selling vegetables near a roadside market every evening.',
      workDuration: 'ONE_TO_SIX_MONTHS',
      preventedFromSchool: 'YES',
    }),
    emergencyIndicator: false,
    riskAssessment: {
      riskScore: 38,
      riskLevel: 'MEDIUM',
      factors: [
        'Adolescent child under 14 years (Age 11 years)',
        'Commercial labour activity: STREET_VENDING',
        'Child is actively deprived of schooling during evening hours',
        'Market location historical risk index: MODERATE',
      ],
      confidence: 0.91,
      screenedAt: new Date(Date.now() - 72 * 3600000),
      officerOverride: { isOverridden: false },
    },
    agencyRecommendation: {
      recommendedAgency: 'LABOUR',
      backupAgency: 'CWC',
      priority: 'MEDIUM',
      expectedResponseHours: 24,
      reasons: ['Workplace inspection and school re-enrollment required under CLPRA.'],
    },
    status: 'PROTECTION_REHABILITATION',
    primaryAgency: 'LABOUR',
    assignedAgencies: [
      { agencyId: labA._id, assignedAt: new Date(Date.now() - 48 * 3600000), role: 'PRIMARY' },
      { agencyId: cwcA._id, assignedAt: new Date(Date.now() - 24 * 3600000), role: 'SUPPORTING' },
    ],
    rehabilitation: {
      planId: 'REHAB-2026-001',
      status: 'IN_PROGRESS',
      targetCompletionDate: new Date(Date.now() + 90 * 86400000),
      interventions: [
        {
          id: 'INT-01',
          type: 'EDUCATION_ENROLLMENT',
          status: 'COMPLETED',
          assignedAgencyId: labA._id,
          description: 'Enrolled in Government Bridge Primary School with midday meal sponsorship.',
          notes: 'Admission confirmed; books and school uniforms supplied.',
          createdAt: new Date(Date.now() - 36 * 3600000),
          updatedAt: new Date(Date.now() - 12 * 3600000),
        },
        {
          id: 'INT-02',
          type: 'COUNSELLING',
          status: 'IN_PROGRESS',
          assignedAgencyId: ngoA._id,
          description: 'Weekly psycho-social counselling for child and parental livelihood support.',
          notes: 'Two sessions completed with positive engagement.',
          createdAt: new Date(Date.now() - 24 * 3600000),
          updatedAt: new Date(Date.now() - 6 * 3600000),
        },
      ],
    },
    statusHistory: [
      { status: 'REPORTED', at: new Date(Date.now() - 72 * 3600000) },
      { status: 'AI_SCREENED', at: new Date(Date.now() - 71 * 3600000) },
      { status: 'VERIFIED', at: new Date(Date.now() - 60 * 3600000) },
      { status: 'ASSIGNED', at: new Date(Date.now() - 48 * 3600000) },
      { status: 'INTERVENTION_REQUIRED', at: new Date(Date.now() - 36 * 3600000) },
      { status: 'PROTECTION_REHABILITATION', at: new Date(Date.now() - 24 * 3600000) },
    ],
    timeline: [
      { stage: 'Report Submitted', timestamp: new Date(Date.now() - 72 * 3600000), details: 'Citizen report filed: Child selling vegetables' },
      { stage: 'AI Risk Screening', timestamp: new Date(Date.now() - 71 * 3600000), details: 'AI Risk: 38/100 (MEDIUM) — Priority: Labour + CWC' },
      { stage: 'Case Verified', timestamp: new Date(Date.now() - 60 * 3600000), details: 'Labour inspector confirmed child labour at roadside vegetable stall' },
      { stage: 'Agency Assigned', timestamp: new Date(Date.now() - 48 * 3600000), details: 'Assigned to Demo Alpha Labour Dept & CWC' },
      { stage: 'Intervention Executed', timestamp: new Date(Date.now() - 36 * 3600000), details: 'Child removed from evening vending; family financial counseling initiated' },
      { stage: 'Rehabilitation Active', timestamp: new Date(Date.now() - 24 * 3600000), details: 'Bridge school admission completed; Individual Care Plan (ICP) underway' },
    ],
  });

  // Cryptographic Ledger for Scenario 1
  await appendLedgerEvent({
    caseId: case1Id, eventType: 'REPORT_CREATED', agencyId: 'CITIZEN',
    userId: String(citizenUser._id), userName: citizenUser.name, role: 'CITIZEN',
    metadata: { source: 'Citizen Whistleblower', category: 'STREET_VENDING' },
  });
  await appendLedgerEvent({
    caseId: case1Id, eventType: 'AI_SCREENING_COMPLETED', agencyId: 'SYSTEM_AI',
    userId: 'SYSTEM', userName: 'Anti-Child-Labour AI Engine', role: 'SYSTEM',
    metadata: { riskScore: 38, riskLevel: 'MEDIUM', priority: 'MEDIUM' },
  });
  await appendLedgerEvent({
    caseId: case1Id, eventType: 'CASE_VERIFIED', agencyId: String(labA._id), agencyName: labA.name,
    userId: String(labourUser._id), userName: labourUser.name, role: 'LABOUR',
    metadata: { verificationResult: 'CONFIRMED_CHILD_LABOUR', inspectionSite: 'Market Area A' },
  });
  await appendLedgerEvent({
    caseId: case1Id, eventType: 'CASE_ASSIGNED', agencyId: String(labA._id), agencyName: labA.name,
    userId: String(labourUser._id), userName: labourUser.name, role: 'LABOUR',
    metadata: { primaryAgency: 'LABOUR', supportingAgency: 'CWC' },
  });
  await appendLedgerEvent({
    caseId: case1Id, eventType: 'REHABILITATION_INITIATED', agencyId: String(cwcA._id), agencyName: cwcA.name,
    userId: String(cwcUser._id), userName: cwcUser.name, role: 'CWC',
    metadata: { planId: 'REHAB-2026-001', educationEnrolled: true, cwcOrder: 'Form 36 Care Order' },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DEMO SCENARIO 2 — Emergency: Hazardous Machinery
  // "A child appears to be working near hazardous machinery."
  // ═══════════════════════════════════════════════════════════════════════════
  const case2Id = 'CL-2026-000146';
  await Case.create({
    ...base,
    caseId: case2Id,
    trackingId: 'CS-EMERG02',
    establishmentName: 'Alpha Heavy Fabrication & Metal Lathe Workshop',
    employerName: 'Dinesh Goel',
    childInformation: {
      approximateAge: 10, ageRange: 'AGE_6_10', gender: 'MALE', numberOfChildren: 2,
      identityKnown: false, vulnerabilityIndicators: ['VISIBLE_INJURY', 'NO_GUARDIAN_VISIBLE', 'LIVING_ON_STREET'],
      immediateDangerObserved: 'YES',
    },
    labourCategories: ['HAZARDOUS', 'FACTORY'],
    situationDetails: mkSit({
      childActivity: 'A child appears to be working near hazardous machinery operating unguarded punch presses.',
      currentlyInDanger: 'YES', threatened: 'YES', forcedToWork: 'YES',
    }),
    emergencyIndicator: true,
    riskAssessment: {
      riskScore: 96,
      riskLevel: 'CRITICAL',
      factors: [
        'EMERGENCY HAZARD DETECTED: Unguarded industrial machinery in operation',
        'Young child under 11 years (Age 10 years)',
        'Statutorily prohibited hazardous process under Part A Schedule to CLPRA',
        'Immediate physical danger to life and limb directly observed',
        'Multiple minors observed in high-decibel metal stamp workshop',
      ],
      confidence: 0.98,
      screenedAt: new Date(Date.now() - 18 * 3600000),
      officerOverride: { isOverridden: false },
    },
    emergencyDetails: {
      isEmergency: true,
      reasons: ['Hazardous machinery operation by minor', 'Immediate physical danger', 'Visible injury risks'],
      alertedAgencies: ['POLICE', 'CWC', 'LABOUR'],
      alertedAt: new Date(Date.now() - 18 * 3600000),
    },
    agencyRecommendation: {
      recommendedAgency: 'POLICE',
      backupAgency: 'CWC',
      priority: 'CRITICAL',
      expectedResponseHours: 2,
      reasons: ['Immediate life safety hazard requires Police SJPU immediate intervention & search warrant.'],
    },
    status: 'RESCUED_PROTECTED',
    primaryAgency: 'POLICE',
    assignedAgencies: [
      { agencyId: polA._id, assignedAt: new Date(Date.now() - 17 * 3600000), role: 'PRIMARY' },
      { agencyId: cwcA._id, assignedAt: new Date(Date.now() - 17 * 3600000), role: 'SUPPORTING' },
      { agencyId: labA._id, assignedAt: new Date(Date.now() - 17 * 3600000), role: 'SUPPORTING' },
    ],
    statusHistory: [
      { status: 'REPORTED', at: new Date(Date.now() - 18 * 3600000) },
      { status: 'AI_SCREENED', at: new Date(Date.now() - 17.8 * 3600000) },
      { status: 'INTERVENTION_REQUIRED', at: new Date(Date.now() - 17.5 * 3600000) },
      { status: 'RESCUED_PROTECTED', at: new Date(Date.now() - 8 * 3600000) },
    ],
    timeline: [
      { stage: 'Report Submitted', timestamp: new Date(Date.now() - 18 * 3600000), details: 'Citizen emergency alert: Child working near hazardous machinery' },
      { stage: 'AI Critical Hazard Screening', timestamp: new Date(Date.now() - 17.8 * 3600000), details: 'AI Risk Score: 96/100 (CRITICAL) — Emergency Alert Triaged' },
      { stage: 'Multi-Agency Alert Dispatched', timestamp: new Date(Date.now() - 17.5 * 3600000), details: 'Police SJPU, CWC & Labour Department simultaneously alerted within 2 minutes' },
      { stage: 'Immediate Intervention Executed', timestamp: new Date(Date.now() - 12 * 3600000), details: 'Joint raid by SJPU & Labour Inspector; workshop sealed under Sec 14 CLPRA' },
      { stage: 'Child Rescued & Secured', timestamp: new Date(Date.now() - 8 * 3600000), details: 'Children rescued safely and placed in Government Certified Children Home' },
    ],
  });

  // Cryptographic Ledger for Scenario 2
  await appendLedgerEvent({
    caseId: case2Id, eventType: 'REPORT_CREATED', agencyId: 'CITIZEN',
    userId: String(citizenUser._id), userName: citizenUser.name, role: 'CITIZEN',
    metadata: { source: 'Emergency Helpline', category: 'HAZARDOUS' },
  });
  await appendLedgerEvent({
    caseId: case2Id, eventType: 'AI_CRITICAL_ALERT', agencyId: 'SYSTEM_AI',
    userId: 'SYSTEM', userName: 'Anti-Child-Labour AI Engine', role: 'SYSTEM',
    metadata: { riskScore: 96, riskLevel: 'CRITICAL', emergency: true },
  });
  await appendLedgerEvent({
    caseId: case2Id, eventType: 'EMERGENCY_DISPATCH', agencyId: String(polA._id), agencyName: polA.name,
    userId: String(policeUser._id), userName: policeUser.name, role: 'POLICE',
    metadata: { responseTarget: '2 Hours', unitsAlerted: ['SJPU', 'LABOUR_ENFORCEMENT'] },
  });
  await appendLedgerEvent({
    caseId: case2Id, eventType: 'CHILD_RESCUED', agencyId: String(polA._id), agencyName: polA.name,
    userId: String(policeUser._id), userName: policeUser.name, role: 'POLICE',
    metadata: { rescuedCount: 2, establishmentSealed: true, custodyTransferredTo: 'CWC_SHELTER' },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DEMO SCENARIO 3 — Repeat Offence Detection
  // New complaint at Market Area A (Street Vending) — System matches 3 prior cases
  // ═══════════════════════════════════════════════════════════════════════════
  const case3Id = 'CL-2026-000147';
  await Case.create({
    ...base,
    caseId: case3Id,
    trackingId: 'CS-REPEAT03',
    establishmentName: 'Market Area A — Roadside Produce Stalls',
    employerName: 'Ramesh Halwai',
    childInformation: {
      approximateAge: 12, ageRange: 'AGE_11_13', gender: 'MALE', numberOfChildren: 1,
      identityKnown: false, vulnerabilityIndicators: ['OUT_OF_SCHOOL'], immediateDangerObserved: 'NO',
    },
    labourCategories: ['STREET_VENDING'],
    situationDetails: mkSit({
      childActivity: 'Child unloading produce crates and vending in Market Area A.',
    }),
    emergencyIndicator: false,
    riskAssessment: {
      riskScore: 68,
      riskLevel: 'HIGH',
      factors: [
        'Repeat Offence Candidate: Multiple prior complaints recorded at this identical market junction',
        'Adolescent child under 14 years',
        'Street vending in heavy traffic market sector',
        'History of non-compliance by market vendor union',
      ],
      confidence: 0.93,
      screenedAt: new Date(Date.now() - 4 * 3600000),
      officerOverride: { isOverridden: false },
    },
    agencyRecommendation: {
      recommendedAgency: 'LABOUR',
      backupAgency: 'POLICE',
      priority: 'HIGH',
      expectedResponseHours: 12,
      reasons: ['High probability repeat offence at monitored location requires joint inspection.'],
    },
    repeatOffenceCheck: {
      isPotentialRepeat: true,
      candidateScore: 88,
      matches: [
        {
          caseId: 'CL-2026-000145',
          establishmentName: 'Roadside Vegetable Stall, Market Area A',
          addressOrLandmark: 'Near Central Vegetable Wholesale Market',
          similarityScore: 92,
          reasons: ['Identical geographic GPS radius (within 80m)', 'Same labour category: STREET_VENDING', 'Matching employer network'],
        },
        {
          caseId: 'CL-2026-001245',
          establishmentName: 'Roadside Juice & Snack Corner',
          addressOrLandmark: 'Market Area A Bus Stand',
          similarityScore: 84,
          reasons: ['Co-located establishment in Market Area A', 'Recurring adolescent exploitation'],
        },
        {
          caseId: 'CL-2026-001247',
          establishmentName: 'Royal Grand Dhaba',
          addressOrLandmark: 'Market Area A Peripheral Road',
          similarityScore: 78,
          reasons: ['Same police station beat jurisdiction', 'Prior verification confirmed'],
        },
      ],
      officerReview: {
        reviewed: false,
        reviewNotes: 'Pending review by Labour Enforcement Officer. System notes: 3 prior verified cases found in database. Repeat Offence Risk: HIGH. Awaiting human officer confirmation.',
      },
    },
    status: 'VERIFICATION_PENDING',
    statusHistory: [
      { status: 'REPORTED', at: new Date(Date.now() - 4 * 3600000) },
      { status: 'AI_SCREENED', at: new Date(Date.now() - 3.8 * 3600000) },
      { status: 'VERIFICATION_PENDING', at: new Date(Date.now() - 3.5 * 3600000) },
    ],
    timeline: [
      { stage: 'Report Submitted', timestamp: new Date(Date.now() - 4 * 3600000), details: 'New complaint received for Market Area A: Street Vending' },
      { stage: 'AI Risk & Repeat Matching', timestamp: new Date(Date.now() - 3.8 * 3600000), details: 'POTENTIAL REPEAT OFFENCE: 3 prior cases matched (Similarity: 88%). Risk Level: HIGH' },
      { stage: 'Awaiting Officer Confirmation', timestamp: new Date(Date.now() - 3.5 * 3600000), details: 'Officer Review pending: Presumption of innocence preserved per statutory guidelines' },
    ],
  });

  // Cryptographic Ledger for Scenario 3
  await appendLedgerEvent({
    caseId: case3Id, eventType: 'REPORT_CREATED', agencyId: 'CITIZEN',
    userId: String(citizenUser._id), userName: citizenUser.name, role: 'CITIZEN',
    metadata: { source: 'Online Complaint Portal', category: 'STREET_VENDING', location: 'Market Area A' },
  });
  await appendLedgerEvent({
    caseId: case3Id, eventType: 'AI_SCREENING_COMPLETED', agencyId: 'SYSTEM_AI',
    userId: 'SYSTEM', userName: 'Anti-Child-Labour AI Engine', role: 'SYSTEM',
    metadata: { riskScore: 68, riskLevel: 'HIGH', repeatCandidate: true, matchedCount: 3 },
  });
  await appendLedgerEvent({
    caseId: case3Id, eventType: 'REPEAT_OFFENCE_FLAGGED', agencyId: String(labA._id), agencyName: labA.name,
    userId: String(labourUser._id), userName: labourUser.name, role: 'LABOUR',
    metadata: { matchedCases: ['CL-2026-000145', 'CL-2026-001245', 'CL-2026-001247'], reviewStatus: 'PENDING_OFFICER_CONFIRMATION' },
  });

  // Seed counter so new real submissions continue after the demo cases.
  await Counter.create({ _id: 'case-2026', seq: 148 });

  console.log('\nSeeded Module 4 Production Prototype Data:');
  console.log('✓ Cryptographically Chained PostgreSQL Audit Ledger Initialized');
  console.log('✓ Scenario 1 (Street Vending + Rehab): CL-2026-000145 (Tracking: CS-STREET01, PIN: 123456)');
  console.log('✓ Scenario 2 (Emergency + Hazardous):  CL-2026-000146 (Tracking: CS-EMERG02, PIN: 123456)');
  console.log('✓ Scenario 3 (Repeat Offence Alert):    CL-2026-000147 (Tracking: CS-REPEAT03, PIN: 123456)');
  console.log('\nSeed test accounts (password = SEED_PASSWORD):');
  for (const [, email, role] of users) console.log(`  ${role.padEnd(11)} ${email}`);
  await mongoose.disconnect();
}

seed().catch((e) => { console.error(e.message); process.exit(1); });
