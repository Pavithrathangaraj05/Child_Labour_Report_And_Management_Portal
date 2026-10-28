import {
  Alert, Box, Button, Card, CardContent, Container, Divider, Link, Stack, Step, StepLabel, Stepper, TextField, Typography,
} from '@mui/material';
import HelpOutline from '@mui/icons-material/HelpOutline';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import { useMutation } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { TrackResult } from '../api/types';
import AppButton from '../components/AppButton';
import { STATUS_HELP, STATUS_LABEL } from '../constants';
import { colors } from '../theme';
import { useAuth } from '../auth/AuthContext';

export default function TrackPage() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [trackingId, setTrackingId] = useState(params.get('id') ?? '');
  const [pin, setPin] = useState(params.get('pin') ?? '');

  const m = useMutation({
    mutationFn: async () => (await api.post<TrackResult>('/track', { trackingId, pin })).data,
  });

  // Auto-track if both id and pin are present from 1-click link
  useEffect(() => {
    if (params.get('id') && params.get('pin')) {
      m.mutate();
    }
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    m.mutate();
  };

  const r = m.data;
  const active = r ? r.stages.indexOf(r.status) : -1;

  return (
    <Container maxWidth="md" sx={{ pt: 6, pb: 8 }}>
      <Typography variant="h1" sx={{ fontSize: 'clamp(1.9rem,4vw,2.6rem)', color: colors.ink }}>
        End-to-End Complaint Tracking
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        Follow the official investigation and rescue progress of your submitted report in real time.
      </Typography>

      {/* Explanatory Callout Banner for Secure PIN & End-to-End Tracking */}
      <Card sx={{ mb: 3, bgcolor: '#f8fafc', border: `1px solid ${colors.line}` }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <HelpOutline sx={{ color: colors.teal, fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: colors.ink }}>
                Why does this page ask for a Secure PIN & Who gives it?
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              • <b>Who gives it?</b> The ChildSafe system generated a unique 6-digit Secret PIN when the report was submitted.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • <b>Why is it needed?</b> Child protection records are legally protected. The PIN ensures <b>only the original complainer</b> can track the complaint, preventing suspects, traffickers, or snooping individuals from monitoring enforcement actions.
            </Typography>
            {user?.role === 'CITIZEN' ? (
              <Box sx={{ mt: 1, pt: 1, borderTop: `1px dashed ${colors.line}` }}>
                <Typography variant="body2" sx={{ color: colors.teal, fontWeight: 600 }}>
                  💡 Logged in as Citizen? You can track all your complaints with 1-click in your{' '}
                  <Link component={RouterLink} to="/dashboard/citizen" sx={{ fontWeight: 700 }}>
                    Citizen Dashboard
                  </Link>{' '}
                  without entering PINs!
                </Typography>
              </Box>
            ) : (
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  💡 Have a citizen account? <Link component={RouterLink} to="/login">Sign in</Link> to view all your complaints on your personal dashboard.
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent component="form" onSubmit={submit} noValidate sx={{ p: 3 }}>
          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-start' }}>
            <TextField
              label="Tracking ID"
              placeholder="CS-XXXXXXX"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
              required
              fullWidth
              inputProps={{ maxLength: 10, autoCapitalize: 'characters' }}
            />
            <TextField
              label="Secure 6-Digit PIN"
              type="password"
              placeholder="••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              fullWidth
              inputProps={{ inputMode: 'numeric', autoComplete: 'off' }}
            />
            <AppButton type="submit" variant="contained" loading={m.isPending} sx={{ minWidth: 160, height: 56 }}>
              Check Status
            </AppButton>
          </Stack>
          {m.isError && <Alert severity="error" sx={{ mt: 2 }}>{errorMessage(m.error)}</Alert>}
        </CardContent>
      </Card>

      {r && (
        <Card sx={{ mt: 3, borderTop: `4px solid ${colors.teal}` }}>
          <CardContent sx={{ p: { xs: 2, md: 4 } }} aria-live="polite">
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Box>
                <Typography variant="body2" color="text.secondary">Official Case ID</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: colors.ink }}>{r.caseId}</Typography>
              </Box>
              <Box sx={{ px: 2, py: 0.75, bgcolor: '#f0fdf4', borderRadius: 2, border: `1px solid ${colors.teal}` }}>
                <Typography variant="subtitle2" sx={{ color: colors.teal, fontWeight: 700 }}>
                  CURRENT STATUS: {STATUS_LABEL[r.status] || r.status}
                </Typography>
              </Box>
            </Stack>

            <Typography sx={{ mt: 1.5, color: 'text.secondary' }}>
              {STATUS_HELP[r.status] || 'Officers are processing this case.'}
            </Typography>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Investigation & Rescue Workflow Stages</Typography>
            <Stepper activeStep={active >= 0 ? active : 0} orientation="vertical" sx={{ mt: 2 }}>
              {r.stages.map((s, idx) => (
                <Step key={s} completed={idx < active}>
                  <StepLabel>
                    <Typography sx={{ fontWeight: idx === active ? 700 : 500 }}>
                      {STATUS_LABEL[s] || s}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {STATUS_HELP[s]}
                    </Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>

            {r.timeline && r.timeline.length > 0 && (
              <Box sx={{ mt: 4, p: 2, bgcolor: '#f8fafc', borderRadius: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Audit Trail & Milestones
                </Typography>
                <Stack spacing={1}>
                  {r.timeline.map((item, idx) => (
                    <Box key={idx} sx={{ fontSize: 13 }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}:
                      </span>{' '}
                      <strong>{item.stage}</strong> — {item.details}
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            <Box sx={{ mt: 3, color: 'text.secondary', fontSize: 13 }}>
              Submitted on {new Date(r.submittedAt).toLocaleString()}. Last updated {new Date(r.lastUpdated).toLocaleString()}.
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              🔒 <b>Confidentiality Notice:</b> In compliance with child welfare law, operational tactical notes, officer identities, and shelter locations are protected and not displayed in public tracking.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Container>
  );
}
