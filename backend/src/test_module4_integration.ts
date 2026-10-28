import mongoose from 'mongoose';
import { env } from './config/env';
import { initPostgresPool } from './config/postgres';
import { appendLedgerEvent, getCaseLedger, verifyCaseLedger, simulateTamperLedger } from './services/ledger.service';
import { evaluateAbacAccess, AbacEvaluationContext } from './services/abac.service';
import { requestStepUpMfa, verifyStepUpMfa, isChallengeValidForAction } from './services/stepUpAuth.service';
import { logSecurityEvent, querySecurityLogs } from './services/securityAudit.service';
import { Case } from './models/Case';
import { User } from './models/User';
import * as auth from './services/auth.service';

async function runModule4IntegrationTest() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('CHILD-SAFE MODULE 4 — FULL INTEGRATION & CRYPTOGRAPHIC TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  await mongoose.connect(env.MONGODB_URI);
  await initPostgresPool();

  const caseId = 'CL-2026-000145';

  // 1. Append cryptographic events to ledger
  console.log('STEP 1: Appending Cryptographic Ledger Blocks (SHA-256 Chained + RSA Signed)...');
  await appendLedgerEvent({
    caseId, eventType: 'REPORT_CREATED', agencyId: 'CITIZEN',
    userId: 'USER-001', userName: 'Ananya Citizen', role: 'CITIZEN',
    metadata: { source: 'Citizen Whistleblower', category: 'STREET_VENDING' },
  });
  await appendLedgerEvent({
    caseId, eventType: 'CASE_VERIFIED', agencyId: 'AGENCY-LABOUR', agencyName: 'Labour Department',
    userId: 'OFFICER-001', userName: 'Inspector Sunil Mehta', role: 'LABOUR',
    metadata: { verificationResult: 'CONFIRMED_CHILD_LABOUR', inspectionSite: 'Market Area A' },
  });
  await appendLedgerEvent({
    caseId, eventType: 'CASE_ASSIGNED', agencyId: 'AGENCY-LABOUR', agencyName: 'Labour Department',
    userId: 'OFFICER-001', userName: 'Inspector Sunil Mehta', role: 'LABOUR',
    metadata: { primaryAgency: 'LABOUR', supportingAgency: 'CWC' },
  });

  // 2. Verify Cryptographic Ledger
  console.log('\nTEST 1: Cryptographic Hash Chain Verification (SHA-256 + RSA)');
  const auditResult = await verifyCaseLedger(caseId);
  console.log(`  → Total Events in Chain: ${auditResult.totalEvents}`);
  console.log(`  → Genesis Hash: ${auditResult.genesisHash?.slice(0, 24)}...`);
  console.log(`  → Head Hash:    ${auditResult.headHash?.slice(0, 24)}...`);
  console.log(`  → Audit Integrity: ${auditResult.verified ? 'VERIFIED ✓' : 'FAILED ✗'}`);
  if (!auditResult.verified || auditResult.totalEvents !== 3) throw new Error('Ledger verification failed unexpectedly!');

  // 2. Tamper Evident Verification Test
  console.log('\nTEST 2: Tamper Detection Simulation');
  await simulateTamperLedger(caseId, 0);
  const tamperResult = await verifyCaseLedger(caseId);
  console.log(`  → Tamper Detected: ${tamperResult.tamperDetected ? 'YES (TAMPER DETECTED ✓)' : 'NO ✗'}`);
  console.log(`  → Details: ${tamperResult.details}`);
  if (!tamperResult.tamperDetected) throw new Error('Tamper detection failed to flag manipulated block!');

  // 3. Step-Up MFA Challenge Verification
  console.log('\nTEST 3: Step-Up Authentication (MFA / High-Security Action)');
  const adminUser = await User.findOne({ role: 'ADMIN' });
  if (!adminUser) throw new Error('Admin user missing');
  const challenge = await requestStepUpMfa(adminUser, 'EXPORT_SENSITIVE_DATA', { ip: '127.0.0.1' });
  console.log(`  → MFA Challenge Generated: ${challenge.challengeId}`);
  console.log(`  → One-Time Code: ${challenge.demoCode}`);
  const mfaVerified = await verifyStepUpMfa(challenge.challengeId, challenge.demoCode, adminUser, { ip: '127.0.0.1' });
  console.log(`  → Code Verification Result: ${mfaVerified ? 'VALIDATED ✓' : 'INVALID ✗'}`);
  const authValid = isChallengeValidForAction(challenge.challengeId, String(adminUser._id), 'EXPORT_SENSITIVE_DATA');
  console.log(`  → Step-Up Privilege Active: ${authValid ? 'ACTIVE ✓' : 'EXPIRED ✗'}`);
  if (!authValid) throw new Error('Step-Up privilege validation failed');

  // 4. Attribute-Based Access Control (ABAC) Policies
  console.log('\nTEST 4: ABAC Multi-Dimensional Policy Evaluation');
  const policeUser = await User.findOne({ role: 'POLICE' });
  const ngoUser = await User.findOne({ role: 'NGO' });
  const cwcUser = await User.findOne({ role: 'CWC' });

  const c = await Case.findOne({ caseId });
  if (!c) throw new Error('Case not found');

  // Police tries to view counselling notes
  const policeAbac = evaluateAbacAccess({
    user: policeUser!,
    caseDoc: c,
    resource: 'COUNSELLING_NOTES',
    purpose: 'CASE_INVESTIGATION',
  });
  console.log(`  → Police accessing Counselling Notes: ${policeAbac.allowed ? 'ALLOWED ✗' : 'DENIED (POLICY ENFORCED ✓)'}`);
  if (policeAbac.allowed) throw new Error('Police should not access Counselling Notes');

  // NGO tries to view police investigation notes
  const ngoAbac = evaluateAbacAccess({
    user: ngoUser!,
    caseDoc: c,
    resource: 'INVESTIGATION_NOTES',
    purpose: 'REHABILITATION_COORDINATION',
  });
  console.log(`  → NGO accessing Police Investigation Notes: ${ngoAbac.allowed ? 'ALLOWED ✗' : 'DENIED (POLICY ENFORCED ✓)'}`);
  if (ngoAbac.allowed) throw new Error('NGO should not access Police Investigation Notes');

  // CWC accessing child protection & rehabilitation profile
  const cwcAbac = evaluateAbacAccess({
    user: cwcUser!,
    caseDoc: c,
    resource: 'REHABILITATION_PLAN',
    purpose: 'CHILD_PROTECTION',
  });
  console.log(`  → CWC accessing Rehabilitation Profile: ${cwcAbac.allowed ? 'GRANTED (AUTHORIZED BY STATUTE ✓)' : 'DENIED ✗'}`);
  if (!cwcAbac.allowed) throw new Error('CWC should be permitted access to Rehabilitation Plan');

  // 5. Security Center Logging & Filtering
  console.log('\nTEST 5: Security Center Event Ingestion & Analytics');
  await logSecurityEvent({
    eventType: 'SUSPICIOUS_ACCESS',
    severity: 'WARNING',
    userId: String(policeUser!._id),
    userName: policeUser!.name,
    role: policeUser!.role,
    resource: 'PROTECTED_EVIDENCE',
    action: 'EXPORT',
    status: 'BLOCKED',
    ip: '127.0.0.1',
  });
  const secQuery = await querySecurityLogs({});
  const secStats = secQuery.stats;
  console.log(`  → Total Logged Security Events: ${secQuery.total}`);
  console.log(`  → Failed Logins (24h):   ${secStats.failedLogins24h}`);
  console.log(`  → Critical Events (24h): ${secStats.criticalEvents24h}`);
  console.log(`  → Suspicious Flags:      ${secStats.suspiciousCount24h}`);

  // 6. Real-Time OTP Verification on Login for All Roles
  console.log('\nTEST 6: Real-Time OTP Verification on Login');
  const dummyCtx = { ip: '127.0.0.1', userAgent: 'Integration-Test-Agent/1.0' };
  const password = env.SEED_PASSWORD || 'Demo#569853ac4a19Aa1';
  // Step A: Initial login attempt dispatches OTP
  const loginStep1: any = await auth.login('police@childsafe.demo', password, dummyCtx);
  console.log(`  → Step 1 Credentials Verified: requiresOtp = ${loginStep1.requiresOtp}`);
  console.log(`  → Real-Time OTP Dispatched: ${loginStep1.demoOtp}`);
  if (!loginStep1.requiresOtp || !loginStep1.challengeId || !loginStep1.demoOtp) {
    throw new Error('Real-time OTP challenge was not issued');
  }

  // Step B: Submit with real-time OTP to complete authentication
  const loginStep2: any = await auth.login(
    'police@childsafe.demo',
    password,
    dummyCtx,
    loginStep1.demoOtp,
    loginStep1.challengeId
  );
  console.log(`  → Step 2 OTP Validated: Session Issued for ${loginStep2.user.name} (${loginStep2.user.role}) ✓`);
  if (!loginStep2.accessToken) throw new Error('Access token not returned after OTP validation');

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('ALL MODULE 4 INTEGRATION CRITERIA VERIFIED AND PASSING 100%!');
  console.log('═══════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

runModule4IntegrationTest().catch((err) => {
  console.error('\n❌ INTEGRATION TEST FAILED:', err);
  process.exit(1);
});
