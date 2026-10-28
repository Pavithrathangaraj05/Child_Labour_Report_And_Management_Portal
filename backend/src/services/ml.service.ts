export interface MLProcessResult {
  riskAssessment: {
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    factors: string[];
    isEmergency: boolean;
    emergencyReasons: string[];
    confidence: number;
  };
  duplicateCheck: {
    isPotentialDuplicate: boolean;
    duplicateMatches: Array<{
      caseId: string;
      status?: string;
      similarityScore: number;
      reasons: string[];
      distanceMeters?: number;
    }>;
    isPotentialRepeat: boolean;
    repeatMatches: Array<{
      caseId: string;
      status?: string;
      reasons: string[];
    }>;
  };
  agencyRecommendation: {
    recommendedAgency: string;
    backupAgency: string;
    priority: string;
    expectedResponseHours: number;
    reasons: string[];
  };
}

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001';

/**
 * Communicates with the Python FastAPI ML Service to perform:
 * 1. AI Risk Scoring & Explanation
 * 2. Emergency Detection
 * 3. Duplicate and Repeat Offence Detection
 * 4. Adaptive Agency Assignment Routing
 */
export async function processCaseWithML(caseData: any, candidateCases: any[]): Promise<MLProcessResult> {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/process-case`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        case: caseData,
        candidates: candidateCases,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as MLProcessResult;
      return data;
    }
    console.warn(`[ML Service] Returned HTTP ${res.status}. Falling back to embedded ML engine.`);
  } catch (err: any) {
    console.warn(`[ML Service] Could not connect to Python microservice (${err.message}). Using embedded fallback.`);
  }

  // Graceful Embedded Fallback
  return fallbackProcess(caseData, candidateCases);
}

function fallbackProcess(caseData: any, candidateCases: any[]): MLProcessResult {
  let score = 0;
  const factors: string[] = [];
  const emergencyReasons: string[] = [];

  const child = caseData.childInformation || {};
  const sit = caseData.situationDetails || {};
  const cats: string[] = caseData.labourCategories || [];

  // Age
  const age = child.approximateAge;
  if (age !== undefined && age <= 6) {
    score += 26;
    factors.push(`Very young child involved (Age ${age} years)`);
  } else if (age !== undefined && age <= 10) {
    score += 18;
    factors.push(`Young child under 11 years (Age ${age} years)`);
  } else if (child.ageRange === 'UNDER_6') {
    score += 26;
    factors.push('Very young child involved (Under 6)');
  } else if (child.ageRange === 'AGE_6_10') {
    score += 18;
    factors.push('Young child involved (Age 6-10)');
  }

  // Hazards
  if (cats.includes('TRAFFICKING_EXPLOITATION')) {
    score += 35;
    factors.push('Severe child trafficking / exploitation detected');
    emergencyReasons.push('Suspected child trafficking syndicate');
  } else if (cats.includes('FORCED_LABOUR')) {
    score += 32;
    factors.push('Forced / bonded labour condition reported');
    emergencyReasons.push('Unlawful child confinement or bonded labour');
  } else if (cats.includes('HAZARDOUS')) {
    score += 28;
    factors.push('Hazardous occupation prohibited under Child Labour Act');
  } else if (cats.includes('FACTORY') || cats.includes('CONSTRUCTION')) {
    score += 22;
    factors.push(`Industrial / construction workplace (${cats.join(', ')})`);
  } else if (cats.includes('BEGGING')) {
    score += 20;
    factors.push('Child begging exploitation');
  }

  // Immediate danger
  if (child.immediateDangerObserved === 'YES' || sit.currentlyInDanger === 'YES') {
    score += 30;
    factors.push('Immediate physical danger directly observed');
    emergencyReasons.push('Child is in immediate physical danger');
  }

  if (caseData.emergencyIndicator) {
    score += 20;
    factors.push('Report flagged as Emergency by complainer');
    emergencyReasons.push('Complainer reported emergency distress');
  }

  const isEmergency = Boolean(caseData.emergencyIndicator || emergencyReasons.length > 0 || score >= 75);
  if (isEmergency && score < 75) {
    score = 78;
    factors.unshift('EMERGENCY OVERRIDE: Critical child safety conditions triggered');
  }

  score = Math.min(Math.max(score, 0), 100);
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (score >= 75) riskLevel = 'CRITICAL';
  else if (score >= 50) riskLevel = 'HIGH';
  else if (score >= 25) riskLevel = 'MEDIUM';

  const recAgency = (isEmergency || cats.includes('TRAFFICKING_EXPLOITATION') || cats.includes('FORCED_LABOUR')) ? 'POLICE'
    : cats.includes('BEGGING') ? 'CWC' : 'LABOUR';

  return {
    riskAssessment: {
      riskScore: score,
      riskLevel,
      factors,
      isEmergency,
      emergencyReasons,
      confidence: 0.9,
    },
    duplicateCheck: {
      isPotentialDuplicate: false,
      duplicateMatches: [],
      isPotentialRepeat: false,
      repeatMatches: [],
    },
    agencyRecommendation: {
      recommendedAgency: recAgency,
      backupAgency: recAgency === 'POLICE' ? 'CWC' : 'POLICE',
      priority: riskLevel,
      expectedResponseHours: isEmergency ? 2 : 24,
      reasons: [`Assigned based on risk level ${riskLevel} and labour category ${cats.join(', ')}`],
    },
  };
}

export async function getRehabilitationRecommendationFromML(caseData: any) {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/recommend-rehabilitation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case: caseData }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.warn(`[ML Service] Could not fetch rehabilitation recommendation: ${err.message}`);
  }

  // Decision support fallback
  return {
    shelterType: 'CHILD_CARE_INSTITUTION',
    educationIntervention: 'AGE_APPROPRIATE_MAINSTREAM_SCHOOL_ENROLLMENT',
    counsellingRequirement: 'SUPPORTIVE_CHILD_AND_FAMILY_COUNSELLING',
    familyAssessment: 'HOME_STUDY_REPORT_AND_ECONOMIC_SPONSORSHIP',
    followUpFrequency: 'MONTHLY',
    reintegrationPathway: 'SUPERVISED_FAMILY_REUNIFICATION',
    decisionSupportOnly: true,
    rationale: ['Fallback baseline rehabilitation package under Juvenile Justice Act rules'],
  };
}
