import {
  Alert, Box, Button, Card, CardActionArea, CardContent, Checkbox, CircularProgress, FormControlLabel, FormHelperText, IconButton, List, ListItem, ListItemText,
  MenuItem, Radio, RadioGroup, Stack, TextField, Typography,
} from '@mui/material';
import Delete from '@mui/icons-material/Delete';
import MyLocation from '@mui/icons-material/MyLocation';
import CheckCircle from '@mui/icons-material/CheckCircle';
import UploadFile from '@mui/icons-material/UploadFile';
import { useState } from 'react';
import { ChipSelect, TriChoice } from '../../components/FormFields';
import { AGE_RANGES, DURATIONS, GENDERS, LABOUR_CATEGORIES, VULNERABILITIES, fmtBytes } from '../../constants';
import { colors } from '../../theme';
import type { Errors, ReportForm } from './types';

interface P { f: ReportForm; set: (patch: Partial<ReportForm>) => void; errors: Errors }
const err = (e: Errors, k: string) => ({ error: !!e[k], helperText: e[k] });

export function StepReporter({ f, set, errors }: P) {
  return (
    <Stack spacing={2.5}>
      <Typography variant="h3">Who is reporting?</Typography>
      <RadioGroup value={f.reporterType} onChange={(_, v) => set({ reporterType: v as any })} aria-label="Reporter type">
        <FormControlLabel value="ANONYMOUS" control={<Radio />} label={<Box><b>Report anonymously</b><Typography variant="body2" color="text.secondary">We collect no personal details. You get a Tracking ID and a secret PIN to follow the case.</Typography></Box>} sx={{ alignItems: 'flex-start', mb: 1 }} />
        <FormControlLabel value="IDENTIFIED" control={<Radio />} label={<Box><b>Report with contact information</b><Typography variant="body2" color="text.secondary">Officers may contact you for more detail. Your contact details are shown only to authorised officers.</Typography></Box>} sx={{ alignItems: 'flex-start' }} />
      </RadioGroup>
      {f.reporterType === 'IDENTIFIED' && (
        <Stack spacing={2}>
          <TextField label="Your name (optional)" value={f.name} onChange={(e) => set({ name: e.target.value })} inputProps={{ maxLength: 120 }} />
          <TextField label="Phone number" value={f.phone} onChange={(e) => set({ phone: e.target.value })} {...err(errors, 'phone')} inputProps={{ inputMode: 'tel' }} />
          <TextField label="Email" type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} {...err(errors, 'email')} />
        </Stack>
      )}
    </Stack>
  );
}

export function StepChild({ f, set, errors }: P) {
  return (
    <Stack spacing={2.5}>
      <Typography variant="h3">About the child</Typography>
      {/* <Alert severity="info">Do not enter the child's name or any identity document number. Describe what you can see.</Alert> */}
      <TextField select label="Estimated age range" value={f.ageRange} onChange={(e) => set({ ageRange: e.target.value })} required {...err(errors, 'ageRange')}>
        {AGE_RANGES.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
      </TextField>
      <TextField label="Approximate age in years (optional)" type="number" value={f.approximateAge} onChange={(e) => set({ approximateAge: e.target.value })} inputProps={{ min: 0, max: 17 }} {...err(errors, 'approximateAge')} />
      <TextField select label="Gender" value={f.gender} onChange={(e) => set({ gender: e.target.value })}>
        {GENDERS.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
      </TextField>
      <TextField label="Number of children" type="number" value={f.numberOfChildren} onChange={(e) => set({ numberOfChildren: e.target.value })} inputProps={{ min: 1, max: 200 }} {...err(errors, 'numberOfChildren')} />
      <FormControlLabel control={<Checkbox checked={f.identityKnown} onChange={(e) => set({ identityKnown: e.target.checked })} />} label="I know who the child is (we will not ask for their name here)" />
      <ChipSelect label="Does the child show any of these? (optional)" options={VULNERABILITIES} value={f.vulnerabilityIndicators} onChange={(v) => set({ vulnerabilityIndicators: v })} />
      <TriChoice label="Does the child appear to be in immediate danger?" value={f.immediateDangerObserved} onChange={(v) => set({ immediateDangerObserved: v })} />
    </Stack>
  );
}

export function StepLabour({ f, set, errors }: P) {
  return (
    <Stack spacing={2}>
      <Typography variant="h3">What kind of work?</Typography>
      <ChipSelect label="Select all that apply" options={LABOUR_CATEGORIES} value={f.labourCategories} onChange={(v) => set({ labourCategories: v })} />
      {errors.labourCategories && <FormHelperText error>{errors.labourCategories}</FormHelperText>}
    </Stack>
  );
}

export function StepLocation({ f, set, errors }: P) {
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<string>('');

  const locateAndAutofill = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setGpsStatus('Detecting GPS location & reverse geocoding address…');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const latStr = lat.toFixed(5);
        const lngStr = lng.toFixed(5);

        try {
          // Attempt reverse geocoding via OpenStreetMap Nominatim
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { Accept: 'application/json' } }
          );
          if (resp.ok) {
            const data = await resp.json();
            const addr = data.address || {};

            const detectedDistrict = addr.state_district || addr.county || addr.district || f.district || 'Current District';
            const detectedCity = addr.city || addr.town || addr.village || addr.suburb || addr.hamlet || f.villageOrCity || 'Current Location';
            const detectedState = addr.state || f.state || '';
            const detectedTaluk = addr.suburb || addr.town || addr.county || f.taluk || '';
            const detectedLandmark = addr.road || addr.neighbourhood || addr.amenity || data.display_name?.split(',').slice(0, 2).join(',') || f.landmark || '';

            set({
              lat: latStr,
              lng: lngStr,
              district: detectedDistrict,
              villageOrCity: detectedCity,
              state: detectedState,
              taluk: detectedTaluk,
              landmark: detectedLandmark,
            });
            setGpsStatus(`GPS detected: ${detectedCity}, ${detectedDistrict}. Blank fields autofilled.`);
          } else {
            // Geocode service response fallback
            set({ lat: latStr, lng: lngStr });
            setGpsStatus(`GPS Coordinates (${latStr}, ${lngStr}) added. Please confirm district and city.`);
          }
        } catch {
          // Offline or network error fallback
          set({ lat: latStr, lng: lngStr });
          setGpsStatus(`GPS Coordinates (${latStr}, ${lngStr}) added.`);
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        setGpsStatus(`Unable to retrieve location (${err.message}). You can fill the details manually below.`);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  return (
    <Stack spacing={2.5}>
      <Typography variant="h3">Where is the child?</Typography>
      <Alert severity="info">Privacy: The exact location is shared only with authorised enforcement officers.</Alert>

      <Box sx={{ p: 2, border: `1px dashed ${colors.teal}`, borderRadius: 1.5, bgcolor: '#f0fdf4' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" spacing={2}>
          <Button
            variant="contained"
            color="primary"
            startIcon={gpsLoading ? <CircularProgress size={18} color="inherit" /> : <MyLocation />}
            onClick={locateAndAutofill}
            disabled={gpsLoading}
            sx={{ minHeight: 44 }}
          >
            {gpsLoading ? 'Detecting Location…' : 'Use Current GPS Location (Autofill)'}
          </Button>
          <Typography variant="body2" color="text.secondary">
            Instantly fills District, City/Village, and Coordinates using device GPS.
          </Typography>
        </Stack>
        {gpsStatus && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
            <CheckCircle color="success" fontSize="small" />
            <Typography variant="body2" sx={{ fontWeight: 600, color: colors.teal }}>{gpsStatus}</Typography>
          </Stack>
        )}
        {f.lat && f.lng && (
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
            GPS Coordinates: {f.lat}, {f.lng}{' '}
            <Button size="small" color="error" onClick={() => set({ lat: '', lng: '' })}>Clear GPS</Button>
          </Typography>
        )}
      </Box>

      <TextField label="State" value={f.state} onChange={(e) => set({ state: e.target.value })} />
      <TextField label="District" value={f.district} onChange={(e) => set({ district: e.target.value })} required {...err(errors, 'district')} />
      <TextField label="Taluk" value={f.taluk} onChange={(e) => set({ taluk: e.target.value })} />
      <TextField label="Village or city" value={f.villageOrCity} onChange={(e) => set({ villageOrCity: e.target.value })} required {...err(errors, 'villageOrCity')} />
      <TextField label="Address or landmark" value={f.landmark} onChange={(e) => set({ landmark: e.target.value })} multiline minRows={2} inputProps={{ maxLength: 300 }} />

      <Box sx={{ pt: 1 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Establishment & Workplace Details (Helps detect repeat violations)</Typography>
        <Stack spacing={2}>
          <TextField
            label="Establishment / Business Name (optional)"
            placeholder="e.g. Royal Grand Dhaba, Sri Lakshmi Brick Kiln, Alpha Garment Factory"
            value={f.establishmentName}
            onChange={(e) => set({ establishmentName: e.target.value })}
            helperText="If the child is working in a shop, restaurant, factory or workshop"
          />
          <TextField
            label="Employer / Owner Name (optional)"
            placeholder="e.g. Ramesh Kumar, Shop Manager"
            value={f.employerName}
            onChange={(e) => set({ employerName: e.target.value })}
          />
        </Stack>
      </Box>
    </Stack>
  );
}

const MAX_FILES = 5, MAX_MB = 25;
export function StepEvidence({ f, set }: P) {
  const [msg, setMsg] = useState('');
  const add = (list: FileList | null) => {
    if (!list) return;
    const next = [...f.files]; const problems: string[] = [];
    for (const file of Array.from(list)) {
      if (file.size > MAX_MB * 1048576) problems.push(`${file.name} is larger than ${MAX_MB} MB`);
      else if (next.length >= MAX_FILES) problems.push(`Only ${MAX_FILES} files can be added at once`);
      else next.push(file);
    }
    set({ files: next }); setMsg(problems.join('. '));
  };
  return (
    <Stack spacing={2.5}>
      <Typography variant="h3">Evidence (optional)</Typography>
      <Alert severity="warning">
        Never put yourself at risk to collect evidence. Photos and videos are stored securely and visible only to authorised enforcement officers.
      </Alert>
      <Button component="label" variant="outlined" startIcon={<UploadFile />} sx={{ alignSelf: 'flex-start' }}>
        Add photo, video, audio or PDF
        <input hidden type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/mp4,audio/wav,audio/ogg,application/pdf" onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      </Button>
      <FormHelperText>Up to {MAX_FILES} files, {MAX_MB} MB each. Accepted: JPEG, PNG, WebP, MP4, MOV, WebM, MP3, M4A, WAV, OGG, PDF.</FormHelperText>
      {msg && <Alert severity="error">{msg}</Alert>}
      {f.files.length > 0 && (
        <List dense sx={{ border: `1px solid ${colors.line}`, borderRadius: 1 }}>
          {f.files.map((file, i) => (
            <ListItem key={i} secondaryAction={<IconButton aria-label={`Remove ${file.name}`} onClick={() => set({ files: f.files.filter((_, j) => j !== i) })}><Delete /></IconButton>}>
              <ListItemText primary={file.name} secondary={fmtBytes(file.size)} />
            </ListItem>
          ))}
        </List>
      )}
      <TextField label="Written description (optional)" helperText="Anything else officers should know. Do not include the child's name." value={f.additionalDescription} onChange={(e) => set({ additionalDescription: e.target.value })} multiline minRows={4} inputProps={{ maxLength: 3000 }} />
    </Stack>
  );
}

export function StepSituation({ f, set, errors }: P) {
  const tri = (k: keyof ReportForm, label: string) => <TriChoice key={k} label={label} value={f[k] as string} onChange={(v) => set({ [k]: v } as any)} />;
  return (
    <Stack spacing={2.5}>
      <Typography variant="h3">The situation</Typography>
      <TextField label="What is the child doing?" value={f.childActivity} onChange={(e) => set({ childActivity: e.target.value })} required multiline minRows={2} inputProps={{ maxLength: 1000 }} {...err(errors, 'childActivity')} />
      <TextField select label="How long has the child apparently been working?" value={f.workDuration} onChange={(e) => set({ workDuration: e.target.value })}>
        {DURATIONS.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
      </TextField>
      {tri('currentlyInDanger', 'Is the child currently in danger?')}
      {tri('threatened', 'Is the child being threatened?')}
      {tri('forcedToWork', 'Is the child being forced to work?')}
      {tri('accompaniedByAdult', 'Is the child accompanied by an adult?')}
      {tri('suspectedTrafficking', 'Is there suspected trafficking?')}
      {tri('usedForBegging', 'Is the child being used for begging?')}
      {tri('preventedFromSchool', 'Is the child prevented from attending school?')}
      {tri('multipleChildren', 'Are multiple children involved?')}
    </Stack>
  );
}

export function StepEmergency({ f, set, errors }: P) {
  const opt = (value: 'YES' | 'NO', title: string, sub: string, red: boolean) => {
    const on = f.emergency === value;
    const c = red ? colors.emergency : colors.blue;
    return (
      <Card sx={{ borderWidth: 2, borderColor: on ? c : colors.line, bgcolor: on ? (red ? '#FDECEC' : colors.wash) : '#fff' }}>
        <CardActionArea onClick={() => set({ emergency: value })} role="radio" aria-checked={on}>
          <CardContent><Typography variant="h5" sx={{ color: red ? colors.emergency : colors.ink }}>{title}</Typography><Typography color="text.secondary">{sub}</Typography></CardContent>
        </CardActionArea>
      </Card>
    );
  };
  return (
    <Stack spacing={2.5}>
      <Typography variant="h3">Is the child in immediate danger?</Typography>
      <Stack spacing={2} role="radiogroup" aria-label="Immediate danger">
        {opt('YES', 'YES — EMERGENCY', 'The child is at immediate risk of harm.', true)}
        {opt('NO', 'NO — REPORT FOR VERIFICATION', 'The situation is serious but not immediately dangerous.', false)}
      </Stack>
      {errors.emergency && <FormHelperText error>{errors.emergency}</FormHelperText>}
      {f.emergency === 'YES' && (
        <Alert severity="error">
          <b>Call 112 (police) or 1098 (Childline) now.</b> Your report will trigger an immediate First Responder Alert in the enforcement queue.
        </Alert>
      )}
    </Stack>
  );
}
void RadioGroup;
