export const STATUSES = [
  'REPORTED',
  'AI_SCREENED',
  'VERIFICATION_PENDING',
  'VERIFIED',
  'PRIORITIZED',
  'ASSIGNED',
  'INTERVENTION_REQUIRED',
  'RESCUED_PROTECTED',
  'CLOSED',
  'SUBMITTED',
  'UNDER_VERIFICATION',
  'INTERVENTION',
  'PROTECTION_REHABILITATION',
] as const;

export const STATUS_LABEL: Record<string, string> = {
  REPORTED: 'Reported',
  AI_SCREENED: 'AI Screened',
  VERIFICATION_PENDING: 'Verification Pending',
  VERIFIED: 'Verified',
  PRIORITIZED: 'Prioritized',
  ASSIGNED: 'Assigned',
  INTERVENTION_REQUIRED: 'Intervention Required',
  RESCUED_PROTECTED: 'Rescued & Protected',
  CLOSED: 'Closed',
  // Backward compatibility
  SUBMITTED: 'Submitted',
  UNDER_VERIFICATION: 'Under Verification',
  INTERVENTION: 'Intervention',
  PROTECTION_REHABILITATION: 'Protection & Rehabilitation',
};

export const STATUS_HELP: Record<string, string> = {
  REPORTED: 'Report has been received by the intake engine.',
  AI_SCREENED: 'AI screening and explainable risk assessment completed.',
  VERIFICATION_PENDING: 'Awaiting jurisdictional officer on-ground verification.',
  VERIFIED: 'Child labour violation confirmed by inspecting officer.',
  PRIORITIZED: 'Flagged with agency priority score and dispatch queue.',
  ASSIGNED: 'Assigned to jurisdictional enforcement unit and caseworker.',
  INTERVENTION_REQUIRED: 'Urgent rescue, joint raid or police intervention scheduled.',
  RESCUED_PROTECTED: 'Child successfully rescued from exploitation and admitted to safe custody/CWC care.',
  CLOSED: 'Case successfully resolved or legally concluded.',
  SUBMITTED: 'Report received and awaiting review.',
  UNDER_VERIFICATION: 'Officers checking details of the report.',
  INTERVENTION: 'Officers actively intervening.',
  PROTECTION_REHABILITATION: 'Child receiving legal protection and rehabilitation.',
};

export const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  LOW: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  MEDIUM: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  HIGH: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  CRITICAL: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
};

export const LABOUR_CATEGORIES: [string, string][] = [
  ['DOMESTIC', 'Domestic work'], ['FAMILY_BASED', 'Family-based work'], ['STREET_VENDING', 'Street vending'],
  ['VEGETABLE_FRUIT_SELLING', 'Vegetable / fruit selling'], ['BOOK_NEWSPAPER_SELLING', 'Book / newspaper selling'],
  ['BEGGING', 'Begging'], ['AGRICULTURAL', 'Agricultural work'], ['FACTORY', 'Factory work'],
  ['CONSTRUCTION', 'Construction'], ['HOTEL_RESTAURANT', 'Hotel / restaurant'], ['SHOP_GARAGE', 'Shop / garage'],
  ['HAZARDOUS', 'Hazardous work'], ['TRAFFICKING_EXPLOITATION', 'Trafficking / exploitation'],
  ['FORCED_LABOUR', 'Forced labour'], ['OTHER', 'Other'],
];
export const categoryLabel = (k: string) => LABOUR_CATEGORIES.find(([v]) => v === k)?.[1] ?? k;

export const AGE_RANGES: [string, string][] = [['UNDER_6', 'Under 6'], ['AGE_6_10', '6 to 10'], ['AGE_11_13', '11 to 13'], ['AGE_14_17', '14 to 17'], ['UNKNOWN', 'Not sure']];
export const GENDERS: [string, string][] = [['FEMALE', 'Girl'], ['MALE', 'Boy'], ['OTHER', 'Other'], ['UNKNOWN', 'Not sure']];
export const VULNERABILITIES: [string, string][] = [
  ['NO_GUARDIAN_VISIBLE', 'No parent or guardian visible'], ['LIVING_ON_STREET', 'Appears to live on the street'],
  ['OUT_OF_SCHOOL', 'Not attending school'], ['VISIBLE_INJURY', 'Visible injury or ill-health'],
  ['MALNOURISHED', 'Appears undernourished'], ['DISABILITY', 'Appears to have a disability'], ['MIGRANT_FAMILY', 'Migrant family'],
];
export const DURATIONS: [string, string][] = [
  ['LESS_THAN_1_MONTH', 'Less than a month'], ['ONE_TO_SIX_MONTHS', '1 to 6 months'], ['SIX_TO_TWELVE_MONTHS', '6 to 12 months'],
  ['OVER_ONE_YEAR', 'More than a year'], ['UNKNOWN', 'Not sure'],
];
export const fmtBytes = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

export const EMERGENCY_NUMBERS = { police: '112', childline: '1098' };
