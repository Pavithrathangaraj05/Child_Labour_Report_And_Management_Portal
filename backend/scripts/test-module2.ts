import 'dotenv/config';

const API = 'http://localhost:4000/api';
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'Demo#569853ac4a19Aa1';

async function req(url: string, options: any = {}) {
  const res = await fetch(`${API}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runAcceptanceTests() {
  console.log('===============================================================');
  console.log('   CHILD-SAFE MODULE 2 COMPREHENSIVE ACCEPTANCE TESTS (1 - 20)  ');
  console.log('===============================================================\n');

  let passedCount = 0;
  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  };

  // ── Helper: Login
  const loginAs = async (email: string) => {
    const res = await req('/auth/login', {
      method: 'POST',
      body: { email, password: SEED_PASSWORD },
    });
    if (!res.ok) throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
    return { token: res.data.accessToken, user: res.data.user };
  };

  // 1. Submit a normal case
  console.log('\n--- 1, 2, 3: Submit Normal Case & AI Scoring/Explanation ---');
  const normalCaseRes = await req('/cases', {
    method: 'POST',
    body: {
      reporter: { type: 'ANONYMOUS' },
      child: {
        approximateAge: 14,
        ageRange: 'AGE_14_17',
        gender: 'MALE',
        numberOfChildren: 1,
        identityKnown: false,
        vulnerabilityIndicators: ['OUT_OF_SCHOOL'],
        immediateDangerObserved: 'NO',
      },
      labourCategories: ['SHOP_GARAGE'],
      location: {
        district: 'Demo District Alpha',
        villageOrCity: `Fresh Quiet Village ${Date.now()}`,
        landmark: 'Near repair shop',
      },
      situation: {
        childActivity: 'Handing wrenches and cleaning grease in automobile garage',
        workDuration: 'ONE_TO_SIX_MONTHS',
        currentlyInDanger: 'NO',
        threatened: 'NO',
        forcedToWork: 'NO',
        accompaniedByAdult: 'YES',
        suspectedTrafficking: 'NO',
        usedForBegging: 'NO',
        preventedFromSchool: 'YES',
        multipleChildren: 'NO',
      },
      emergency: false,
    },
  });

  assert(normalCaseRes.status === 201, '1. Submitted a normal case successfully');
  const normalCase = normalCaseRes.data;
  assert(typeof normalCase.riskAssessment?.riskScore === 'number', '2. Received AI risk score (' + normalCase.riskAssessment?.riskScore + '/100)');
  assert(normalCase.riskAssessment?.riskLevel === 'LOW' || normalCase.riskAssessment?.riskLevel === 'MEDIUM', '2b. Normal case risk level is LOW/MEDIUM (' + normalCase.riskAssessment?.riskLevel + ')');
  assert(Array.isArray(normalCase.riskAssessment?.factors) && normalCase.riskAssessment.factors.length > 0, '3. AI explanation factors provided: ' + normalCase.riskAssessment?.factors.join('; '));

  // 4, 5, 6: Submit Emergency Case
  console.log('\n--- 4, 5, 6: Submit Emergency Case & Critical Classification ---');
  const emergencyCaseRes = await req('/cases', {
    method: 'POST',
    body: {
      reporter: { type: 'ANONYMOUS' },
      establishmentName: 'Hazardous Chemical Processing Unit',
      child: {
        approximateAge: 8,
        ageRange: 'AGE_6_10',
        gender: 'FEMALE',
        numberOfChildren: 2,
        identityKnown: false,
        vulnerabilityIndicators: ['VISIBLE_INJURY', 'NO_GUARDIAN_VISIBLE'],
        immediateDangerObserved: 'YES',
      },
      labourCategories: ['HAZARDOUS', 'TRAFFICKING_EXPLOITATION'],
      location: {
        district: 'Demo District Alpha',
        villageOrCity: 'Industrial Zone',
        landmark: 'Shed 4B',
      },
      situation: {
        childActivity: 'Children locked in storage room, forced to handle burning caustic chemicals with visible severe burns',
        workDuration: 'SIX_TO_TWELVE_MONTHS',
        currentlyInDanger: 'YES',
        threatened: 'YES',
        forcedToWork: 'YES',
        accompaniedByAdult: 'NO',
        suspectedTrafficking: 'YES',
        usedForBegging: 'NO',
        preventedFromSchool: 'YES',
        multipleChildren: 'YES',
        additionalDescription: 'Severe bleeding and life threat observed',
      },
      emergency: true,
    },
  });

  assert(emergencyCaseRes.status === 201, '4. Submitted emergency case successfully');
  const emCase = emergencyCaseRes.data;
  assert(emCase.riskAssessment?.riskLevel === 'CRITICAL', '5. Emergency case classified as CRITICAL (' + emCase.riskAssessment?.riskScore + '/100)');
  assert(emCase.emergencyIndicator === true, '6. Emergency alert flag active');

  // 7, 8: Login as Police & View Emergency Case
  console.log('\n--- 7, 8: Login as Police & View Emergency Queue ---');
  const police = await loginAs('police@childsafe.demo');
  assert(police.user.role === 'POLICE', '7. Logged in as Police Officer');

  const policeCasesRes = await req('/cases?emergency=true', {
    headers: { Authorization: `Bearer ${police.token}` },
  });
  assert(policeCasesRes.data.items.some((c: any) => c.caseId === emCase.caseId), '8. Police view shows emergency case ' + emCase.caseId);

  // 9, 10: Login as Labour & View Labour Cases
  console.log('\n--- 9, 10: Login as Labour & View Labour Workplace Cases ---');
  const labour = await loginAs('labour@childsafe.demo');
  assert(labour.user.role === 'LABOUR', '9. Logged in as Labour Officer');

  const labourCasesRes = await req('/cases', {
    headers: { Authorization: `Bearer ${labour.token}` },
  });
  assert(labourCasesRes.data.items.length > 0, '10. Labour view lists workplace labour cases (' + labourCasesRes.data.items.length + ' cases in scope)');

  // 11, 12: Login as CWC & View Child Protection Cases
  console.log('\n--- 11, 12: Login as CWC & View Protection Cases ---');
  const cwc = await loginAs('cwc@childsafe.demo');
  assert(cwc.user.role === 'CWC', '11. Logged in as CWC Member');

  const cwcCasesRes = await req('/cases', {
    headers: { Authorization: `Bearer ${cwc.token}` },
  });
  assert(cwcCasesRes.data.items.length > 0, '12. CWC view lists child protection cases in jurisdiction');

  // 13: Assign a Case
  console.log('\n--- 13: Assign a Case ---');
  const agenciesRes = await req('/agencies', {
    headers: { Authorization: `Bearer ${police.token}` },
  });
  const agencyList = agenciesRes.data.items || agenciesRes.data;
  const policeAgency = agencyList.find((a: any) => a.type === 'POLICE');

  const assignRes = await req(`/cases/${emCase.caseId}/assign`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${police.token}` },
    body: {
      agencyId: policeAgency._id,
      priority: 'CRITICAL',
      notes: 'Dispatched emergency squad unit 3 for immediate on-site rescue.',
    },
  });
  assert(assignRes.status === 200, '13. Assigned case to Police Agency');
  assert(assignRes.data.case.assignment?.assignedAgencyName === policeAgency.name, '13b. Assignment record reflects agency: ' + policeAgency.name);

  // 14: Change Case Status (State Machine)
  console.log('\n--- 14: Change Case Status ---');
  const statusRes = await req(`/cases/${emCase.caseId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${police.token}` },
    body: {
      status: 'RESCUED_PROTECTED',
      notes: 'Children successfully rescued from chemical unit. Admitted to district hospital for treatment and CWC care.',
    },
  });
  assert(statusRes.status === 200, '14. Transitioned case status to RESCUED_PROTECTED');
  assert(statusRes.data.case.status === 'RESCUED_PROTECTED', '14b. Case current status is now RESCUED_PROTECTED');

  // 15: See Case Timeline
  console.log('\n--- 15: Case Timeline Inspection ---');
  const caseDetailRes = await req(`/cases/${emCase.caseId}`, {
    headers: { Authorization: `Bearer ${police.token}` },
  });
  const timeline = caseDetailRes.data.case.timeline || [];
  assert(timeline.length >= 3, '15. Case timeline contains comprehensive milestones (' + timeline.length + ' events)');
  console.log('   Timeline entries:');
  timeline.forEach((t: any) => console.log(`    • [${t.stage}] ${t.details || ''}`));

  // 16, 17: Create Similar Cases & Detect Duplicate/Repeat Warning
  console.log('\n--- 16, 17: Similar Cases & Duplicate / Repeat Detection ---');
  const similarCaseRes = await req('/cases', {
    method: 'POST',
    body: {
      reporter: { type: 'ANONYMOUS' },
      establishmentName: 'Hazardous Chemical Processing Unit',
      child: {
        approximateAge: 8,
        ageRange: 'AGE_6_10',
        numberOfChildren: 2,
        immediateDangerObserved: 'YES',
      },
      labourCategories: ['HAZARDOUS'],
      location: {
        district: 'Demo District Alpha',
        villageOrCity: 'Industrial Zone',
        landmark: 'Shed 4B',
      },
      situation: {
        childActivity: 'Children locked in storage room, forced to handle burning caustic chemicals with visible severe burns',
        workDuration: 'SIX_TO_TWELVE_MONTHS',
        currentlyInDanger: 'YES',
        threatened: 'YES',
        forcedToWork: 'YES',
        preventedFromSchool: 'YES',
      },
      emergency: true,
    },
  });

  assert(similarCaseRes.status === 201, '16. Created second similar case');
  const simCase = similarCaseRes.data;
  assert(
    simCase.duplicateCheck?.isPotentialDuplicate === true || simCase.repeatOffenceCheck?.isPotentialRepeat === true,
    '17. Detected potential duplicate / repeat warning for matching establishment/location'
  );

  // 18, 19: Override AI Score & Record Reason
  console.log('\n--- 18, 19: Officer Override AI Score ---');
  const overrideRes = await req(`/cases/${normalCase.caseId}/override-ai`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${labour.token}` },
    body: {
      riskScore: 82,
      riskLevel: 'CRITICAL',
      reason: 'Field inquiry discovered that child is subjected to physical punishment and confined after hours by workshop owner.',
    },
  });
  console.log('override status:', overrideRes.status, 'data:', overrideRes.data);
  assert(overrideRes.status === 200, '18. Successfully overridden AI risk score to 82 (CRITICAL)');
  const overridden = overrideRes.data.case.riskAssessment;
  assert(overridden.riskScore === 82, '18b. Risk score updated to 82');
  assert(overridden.officerOverride?.isOverridden === true, '19. Override flag recorded');
  assert(
    overridden.officerOverride?.reason.includes('confined after hours'),
    '19b. Override reason accurately recorded: "' + overridden.officerOverride?.reason + '"'
  );

  // 20: Verify Unauthorized Roles Cannot Access Restricted Information
  console.log('\n--- 20: RBAC Authorization & Data Confidentiality ---');
  const citizen = await loginAs('citizen@childsafe.demo');
  const forbiddenRes = await req(`/cases/${emCase.caseId}`, {
    headers: { Authorization: `Bearer ${citizen.token}` },
  });
  assert(forbiddenRes.status === 403 || forbiddenRes.status === 404, '20. Unauthorized citizen access properly blocked with HTTP ' + forbiddenRes.status);

  // Bonus Verification: OTP Email Verification Endpoint
  console.log('\n--- Bonus Test: Email Verification through OTP ---');
  const testEmail = `citizen.verify.${Date.now()}@test.demo`;
  const otpRes = await req('/auth/send-otp', {
    method: 'POST',
    body: { email: testEmail },
  });
  assert(otpRes.status === 200, 'Bonus A: Successfully sent registration OTP to email');
  const demoOtp = otpRes.data.demoOtp;

  const regRes = await req('/auth/register', {
    method: 'POST',
    body: {
      name: 'Verified Citizen Tester',
      email: testEmail,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      otp: demoOtp,
    },
  });
  assert(regRes.status === 200, 'Bonus B: Verified OTP and registered citizen account');
  assert(regRes.data.user?.isEmailVerified === true, 'Bonus C: Account marked as email-verified');

  // Bonus Verification: Citizen End-to-End Tracking
  console.log('\n--- Bonus Test: Citizen End-to-End Tracking Dashboard ---');
  const myReportsRes = await req('/cases/my', {
    headers: { Authorization: `Bearer ${citizen.token}` },
  });
  assert(myReportsRes.status === 200 && Array.isArray(myReportsRes.data.reports), 'Bonus D: Citizen retrieved personal reports list for end-to-end tracking');

  console.log('\n===============================================================');
  console.log(`   ALL ${passedCount} ACCEPTANCE CRITERIA VERIFIED & PASSED!    `);
  console.log('===============================================================\n');
}

runAcceptanceTests().catch((e) => {
  console.error('\nTest execution failed:', e);
  process.exit(1);
});
