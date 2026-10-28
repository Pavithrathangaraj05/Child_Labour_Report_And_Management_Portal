import { Alert, Box, Button, Card, CardContent, Container, LinearProgress, Stack, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import type { Submission } from '../../api/types';
import AppButton from '../../components/AppButton';
import { colors } from '../../theme';
import SubmissionSuccess from './SubmissionSuccess';
import { StepChild, StepEmergency, StepEvidence, StepLabour, StepLocation, StepReporter, StepSituation } from './Steps';
import { Errors, ReportForm, STEP_TITLES, initialForm, toPayload, validateStep } from './types';

const STEPS = [StepReporter, StepChild, StepLabour, StepLocation, StepEvidence, StepSituation, StepEmergency];

export default function ReportWizard() {
  const [params] = useSearchParams();
  const [f, setF] = useState<ReportForm>(initialForm(params.get('anonymous') === '1'));
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState<{ s: Submission; up: { ok: number; failed: string[] } } | null>(null);
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => { top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [step]);

  const submit = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<Submission>('/cases', toPayload(f));
      const up = { ok: 0, failed: [] as string[] };
      if (f.files.length) {
        try {
          const fd = new FormData(); f.files.forEach((file) => fd.append('files', file));
          const r = await api.post(`/cases/${data.caseId}/evidence`, fd, { headers: { 'X-Upload-Token': data.uploadToken }, validateStatus: (s) => s < 500 });
          up.ok = r.data?.accepted?.length ?? 0;
          up.failed = (r.data?.rejected ?? []).map((x: any) => `${x.filename}: ${x.reason}`);
          if (r.status >= 400 && !up.failed.length) up.failed = [r.data?.error?.message ?? 'Upload failed'];
        } catch (e) { up.failed = [errorMessage(e)]; }
      }
      return { s: data, up };
    },
    onSuccess: (r) => setDone(r),
  });

  if (done) return <SubmissionSuccess s={done.s} uploadReport={done.up} />;

  const Current = STEPS[step];
  const last = step === STEPS.length - 1;
  const set = (patch: Partial<ReportForm>) => { setF((p) => ({ ...p, ...patch })); setErrors({}); };
  const next = () => { const e = validateStep(step, f); setErrors(e); if (!Object.keys(e).length) (last ? submit.mutate() : setStep(step + 1)); };

  return (
    <Container maxWidth="sm" sx={{ pt: 5 }}>
      <div ref={top} />
      <Typography variant="h1" component="h1" sx={{ fontSize: '1.9rem', color: colors.ink }}>Report a Case</Typography>
      <Box sx={{ mt: 2, mb: 3 }}>
        <Typography variant="body2" color="text.secondary" aria-live="polite">Step {step + 1} of {STEPS.length}: {STEP_TITLES[step]}</Typography>
        <LinearProgress variant="determinate" value={((step + 1) / STEPS.length) * 100} color="secondary" sx={{ mt: 1, height: 6, borderRadius: 3 }} aria-label="Progress" />
      </Box>
      <Card><CardContent sx={{ p: { xs: 2, sm: 4 } }}>
        <Current f={f} set={set} errors={errors} />
        {Object.keys(errors).length > 0 && <Alert severity="error" sx={{ mt: 3 }}>Please fix the highlighted field{Object.keys(errors).length > 1 ? 's' : ''} to continue.</Alert>}
        {submit.isError && <Alert severity="error" sx={{ mt: 3 }}>{errorMessage(submit.error)}</Alert>}
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
          <Button onClick={() => setStep(step - 1)} disabled={step === 0 || submit.isPending}>Back</Button>
          <AppButton variant="contained" color={last && f.emergency === 'YES' ? 'error' : 'primary'} onClick={next} loading={submit.isPending}>
            {last ? 'Submit report' : 'Continue'}
          </AppButton>
        </Stack>
      </CardContent></Card>
    </Container>
  );
}
