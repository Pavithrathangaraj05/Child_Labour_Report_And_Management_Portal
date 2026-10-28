export interface ReportForm {
  reporterType: 'ANONYMOUS' | 'IDENTIFIED'; name: string; phone: string; email: string;
  approximateAge: string; ageRange: string; gender: string; numberOfChildren: string; identityKnown: boolean;
  vulnerabilityIndicators: string[]; immediateDangerObserved: string;
  labourCategories: string[];
  establishmentName: string; employerName: string;
  state: string; district: string; taluk: string; villageOrCity: string; landmark: string; lat: string; lng: string;
  files: File[]; additionalDescription: string;
  childActivity: string; workDuration: string; currentlyInDanger: string; threatened: string; forcedToWork: string;
  accompaniedByAdult: string; suspectedTrafficking: string; usedForBegging: string; preventedFromSchool: string; multipleChildren: string;
  emergency: '' | 'YES' | 'NO';
}

export const initialForm = (anonymous: boolean): ReportForm => ({
  reporterType: anonymous ? 'ANONYMOUS' : 'ANONYMOUS', name: '', phone: '', email: '',
  approximateAge: '', ageRange: '', gender: 'UNKNOWN', numberOfChildren: '1', identityKnown: false,
  vulnerabilityIndicators: [], immediateDangerObserved: 'UNKNOWN', labourCategories: [],
  establishmentName: '', employerName: '',
  state: '', district: '', taluk: '', villageOrCity: '', landmark: '', lat: '', lng: '',
  files: [], additionalDescription: '',
  childActivity: '', workDuration: 'UNKNOWN', currentlyInDanger: 'UNKNOWN', threatened: 'UNKNOWN', forcedToWork: 'UNKNOWN',
  accompaniedByAdult: 'UNKNOWN', suspectedTrafficking: 'UNKNOWN', usedForBegging: 'UNKNOWN', preventedFromSchool: 'UNKNOWN', multipleChildren: 'UNKNOWN',
  emergency: '',
});

export type Errors = Partial<Record<string, string>>;

export const STEP_TITLES = ['Reporter', 'Child', 'Type of work', 'Location', 'Evidence', 'Situation', 'Emergency'];

const phoneOk = (s: string) => /^\+?[0-9 \-]{7,15}$/.test(s);
export function validateStep(step: number, f: ReportForm): Errors {
  const e: Errors = {};
  if (step === 0 && f.reporterType === 'IDENTIFIED') {
    if (!f.phone && !f.email) e.phone = 'Give a phone number or an email so officers can reach you';
    if (f.phone && !phoneOk(f.phone)) e.phone = 'Enter a valid phone number';
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email address';
  }
  if (step === 1) {
    if (!f.ageRange) e.ageRange = 'Choose an age range, or "Not sure"';
    if (f.approximateAge && (+f.approximateAge < 0 || +f.approximateAge > 17 || !Number.isInteger(+f.approximateAge))) e.approximateAge = 'Enter an age from 0 to 17. This platform is for children under 18.';
    if (!(+f.numberOfChildren >= 1 && +f.numberOfChildren <= 200)) e.numberOfChildren = 'Enter a number from 1 to 200';
  }
  if (step === 2 && !f.labourCategories.length) e.labourCategories = 'Select at least one type of work';
  if (step === 3) {
    if (f.district.trim().length < 2) e.district = 'District is required';
    if (f.villageOrCity.trim().length < 2) e.villageOrCity = 'Village or city is required';
  }
  if (step === 5 && f.childActivity.trim().length < 3) e.childActivity = 'Describe what the child is doing';
  if (step === 6 && !f.emergency) e.emergency = 'Choose one option to continue';
  return e;
}

export function toPayload(f: ReportForm) {
  const n = (s: string) => (s && s.trim() ? s.trim() : undefined);
  const lat = parseFloat(f.lat), lng = parseFloat(f.lng);
  return {
    reporter: { type: f.reporterType, ...(f.reporterType === 'IDENTIFIED' ? { name: n(f.name), phone: n(f.phone), email: n(f.email) } : {}) },
    establishmentName: n(f.establishmentName),
    employerName: n(f.employerName),
    child: {
      approximateAge: f.approximateAge ? +f.approximateAge : undefined, ageRange: f.ageRange, gender: f.gender,
      numberOfChildren: +f.numberOfChildren, identityKnown: f.identityKnown,
      vulnerabilityIndicators: f.vulnerabilityIndicators, immediateDangerObserved: f.immediateDangerObserved,
    },
    labourCategories: f.labourCategories,
    location: {
      state: n(f.state), district: f.district.trim(), taluk: n(f.taluk), villageOrCity: f.villageOrCity.trim(), landmark: n(f.landmark),
      coordinates: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined,
    },
    situation: {
      childActivity: f.childActivity.trim(), workDuration: f.workDuration, currentlyInDanger: f.currentlyInDanger, threatened: f.threatened,
      forcedToWork: f.forcedToWork, accompaniedByAdult: f.accompaniedByAdult, suspectedTrafficking: f.suspectedTrafficking,
      usedForBegging: f.usedForBegging, preventedFromSchool: f.preventedFromSchool, multipleChildren: f.multipleChildren,
      additionalDescription: n(f.additionalDescription),
    },
    emergency: f.emergency === 'YES',
  };
}
