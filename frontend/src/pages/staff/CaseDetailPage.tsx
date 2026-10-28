import {
  Alert, Box, Button, Card, CardContent, Chip, Container, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Grid, IconButton, LinearProgress, List, ListItem, ListItemText, MenuItem,
  Paper, Stack, TextField, Typography, Tooltip,
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import WarningAmber from '@mui/icons-material/WarningAmber';
import ReportProblem from '@mui/icons-material/ReportProblem';
import UploadFile from '@mui/icons-material/UploadFile';
import Tune from '@mui/icons-material/Tune';
import AssignmentInd from '@mui/icons-material/AssignmentInd';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';
import HistoryEdu from '@mui/icons-material/HistoryEdu';
import Timer from '@mui/icons-material/Timer';
import Lock from '@mui/icons-material/Lock';
import LockOpen from '@mui/icons-material/LockOpen';
import Security from '@mui/icons-material/Security';
import Download from '@mui/icons-material/Download';
import VolunteerActivism from '@mui/icons-material/VolunteerActivism';
import AddCircle from '@mui/icons-material/AddCircle';
import School from '@mui/icons-material/School';
import NightShelter from '@mui/icons-material/NightShelter';
import Psychology from '@mui/icons-material/Psychology';
import Diversity1 from '@mui/icons-material/Diversity1';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import type { Agency, AuditVerificationResult, CaseRow, LedgerRecord, Role } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import RiskBadge from '../../components/RiskBadge';
import FaceRedactorDialog from '../../components/FaceRedactorDialog';
import { AGE_RANGES, RISK_COLORS, STATUS_HELP, STATUS_LABEL, VULNERABILITIES, categoryLabel, fmtBytes } from '../../constants';
import { colors } from '../../theme';

const lab = (list: [string, string][], v?: string) => list.find(([k]) => k === v)?.[1] ?? v ?? 'Not recorded';
const tri = (v?: string) => (v === 'YES' ? 'Yes' : v === 'NO' ? 'No' : v ? 'Not sure' : undefined);

// ─── Module 4: Cryptographic Audit Ledger Section ───
function AuditLedgerSection({ caseId, userRole }: { caseId: string; userRole: Role }) {
  const [expanded, setExpanded] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState<{ challengeId: string; demoCode: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaVerified, setMfaVerified] = useState(false);

  const auditQuery = useQuery<AuditVerificationResult>({
    queryKey: ['case-audit', caseId],
    queryFn: async () => (await api.get(`/cases/${caseId}/audit`)).data,
    enabled: expanded,
    staleTime: 30000,
  });

  const ledgerQuery = useQuery<{ records: LedgerRecord[] }>({
    queryKey: ['case-ledger', caseId],
    queryFn: async () => (await api.get(`/cases/${caseId}/ledger`)).data,
    enabled: expanded && mfaVerified,
    staleTime: 60000,
  });

  const handleRequestMfa = async () => {
    try {
      const res = await api.post('/auth/step-up/challenge', { action: 'ACCESS_CHILD_PROFILE' });
      setMfaChallenge({ challengeId: res.data.challengeId, demoCode: res.data.demoCode });
    } catch (err: any) {
      console.error('MFA challenge error:', err);
    }
  };

  const handleVerifyMfa = async () => {
    try {
      await api.post('/auth/step-up/verify', { challengeId: mfaChallenge!.challengeId, code: mfaCode });
      setMfaVerified(true);
      setMfaChallenge(null);
    } catch (err: any) {
      alert('Incorrect Step-Up code. Please try again.');
    }
  };

  const isVerified = auditQuery.data?.auditIntegrity === 'VERIFIED';

  return (
    <Card sx={{ borderTop: `4px solid ${isVerified && auditQuery.data ? '#10b981' : auditQuery.data?.tamperDetected ? '#dc2626' : '#6366f1'}` }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <Security sx={{ color: '#6366f1' }} />
            <Typography variant="h4" sx={{ fontWeight: 800 }}>Cryptographic Audit Ledger</Typography>
          </Stack>
          <Button
            size="small"
            variant={expanded ? 'outlined' : 'contained'}
            onClick={() => setExpanded(!expanded)}
            startIcon={expanded ? <LockOpen /> : <Lock />}
          >
            {expanded ? 'Collapse' : 'View Audit'}
          </Button>
        </Stack>

        {!expanded && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Permissioned cryptographically chained event ledger stored in PostgreSQL. Each state transition is SHA-256 hashed and asymmetrically signed. Click "View Audit" to verify chain integrity.
          </Typography>
        )}

        {expanded && (
          <Stack spacing={2} sx={{ mt: 2 }}>
            {auditQuery.isLoading && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 16, height: 16, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } }} />
                <Typography variant="body2" color="text.secondary">Verifying cryptographic hash chain…</Typography>
              </Stack>
            )}

            {auditQuery.data && (
              <Box sx={{
                p: 2.5, borderRadius: 2,
                bgcolor: isVerified ? '#f0fdf4' : '#fef2f2',
                border: `2px solid ${isVerified ? '#10b981' : '#dc2626'}`,
              }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                  {isVerified
                    ? <CheckCircle sx={{ color: '#10b981', fontSize: 28 }} />
                    : <Cancel sx={{ color: '#dc2626', fontSize: 28 }} />
                  }
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: 1 }}>
                      AUDIT INTEGRITY
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900, color: isVerified ? '#059669' : '#dc2626' }}>
                      {auditQuery.data.auditIntegrity}
                    </Typography>
                  </Box>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{auditQuery.data.details}</Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  <Typography variant="caption"><strong>Blocks:</strong> {auditQuery.data.totalEvents}</Typography>
                  {auditQuery.data.genesisHash && (
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      <strong>Genesis:</strong> {auditQuery.data.genesisHash.slice(0, 16)}…
                    </Typography>
                  )}
                  {auditQuery.data.headHash && (
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      <strong>Head:</strong> {auditQuery.data.headHash.slice(0, 16)}…
                    </Typography>
                  )}
                </Stack>

                {!mfaVerified && userRole !== 'NGO' && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: '#eff6ff', borderRadius: 1, border: '1px solid #bfdbfe' }}>
                    <Typography variant="caption" fontWeight={700} color="#1e40af">
                      STEP-UP AUTHENTICATION REQUIRED to view individual chain blocks
                    </Typography>
                    {!mfaChallenge ? (
                      <Button size="small" sx={{ display: 'block', mt: 0.5 }} onClick={handleRequestMfa}>
                        Request OTP Challenge
                      </Button>
                    ) : (
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                        <TextField
                          size="small"
                          label="Enter OTP"
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value)}
                          sx={{ width: 160 }}
                          helperText={`Demo code: ${mfaChallenge.demoCode}`}
                        />
                        <Button size="small" variant="contained" onClick={handleVerifyMfa}>Verify</Button>
                      </Stack>
                    )}
                  </Box>
                )}
              </Box>
            )}

            {mfaVerified && ledgerQuery.data && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                  Hash Chain Events ({ledgerQuery.data.records.length})
                </Typography>
                <Stack spacing={1.5}>
                  {ledgerQuery.data.records.map((evt, idx) => (
                    <Paper key={evt.id} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip label={`#${idx + 1}`} size="small" />
                          <Typography variant="subtitle2" fontWeight={700}>{evt.currentEvent}</Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(evt.timestamp).toLocaleString()}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#64748b', display: 'block' }}>
                        Prev: {evt.previousHash.slice(0, 20)}… → Hash: {evt.currentHash.slice(0, 20)}…
                      </Typography>
                      {evt.authorizedUserName && (
                        <Typography variant="caption" color="text.secondary">
                          By: {evt.authorizedUserName} ({evt.authorizedRole})
                          {evt.agencyName && ` · ${evt.agencyName}`}
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}

            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={() => auditQuery.refetch()} disabled={auditQuery.isFetching}>
                Re-verify Chain
              </Button>
              {userRole === 'ADMIN' && (
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  onClick={async () => {
                    if (confirm('Demo only: This will tamper a ledger block to demonstrate integrity detection. Proceed?')) {
                      await api.post(`/cases/${caseId}/audit/tamper-demo`, { eventIndex: 0 });
                      auditQuery.refetch();
                    }
                  }}
                >
                  Tamper Demo (Admin)
                </Button>
              )}
            </Stack>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const userRole = (user?.role || 'POLICE') as Role;

  // Modals state
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideForm, setOverrideForm] = useState({ riskScore: 50, riskLevel: 'MEDIUM', reason: '' });
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ agencyId: '', officerId: '', notes: '', priority: 'HIGH' });
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: '', notes: '' });
  const [repeatReviewOpen, setRepeatReviewOpen] = useState(false);
  const [repeatDecision, setRepeatDecision] = useState<'CONFIRMED' | 'REJECTED'>('CONFIRMED');
  const [repeatNotes, setRepeatNotes] = useState('');

  // Module 3 Modals
  const [faceRedactorOpen, setFaceRedactorOpen] = useState(false);
  const [selectedRedactFile, setSelectedRedactFile] = useState<File | null>(null);
  const [interventionOpen, setInterventionOpen] = useState(false);
  const [interventionForm, setInterventionForm] = useState({
    type: 'SHELTER',
    title: '',
    responsibleAgency: 'CWC',
    responsiblePerson: user?.name || '',
    status: 'IN_PROGRESS',
    outcome: '',
    outcomeScore: 80,
    followUpDate: '',
    notes: '',
  });

  const [timeLeft, setTimeLeft] = useState<{ str: string; status: 'ON_TIME' | 'WARNING' | 'BREACHED' }>({
    str: 'Calculating...',
    status: 'ON_TIME',
  });

  // 1. Fetch Case
  const caseQuery = useQuery({
    queryKey: ['case-detail', id],
    queryFn: async () => (await api.get<{ case: CaseRow }>(`/cases/${id}`)).data.case,
    enabled: !!id,
  });

  // 2. Fetch Agencies for Assignment
  const agenciesQuery = useQuery({
    queryKey: ['agencies-list'],
    queryFn: async () => {
      const res = (await api.get<{ items: Agency[] } | Agency[]>('/agencies')).data;
      return Array.isArray(res) ? res : res.items || [];
    },
    enabled: assignOpen,
  });

  const c = caseQuery.data;
  const ci = c?.childInformation;
  const sd = c?.situationDetails;
  const risk = c?.riskAssessment;
  const sla = c?.sla;
  const rehabPlan = c?.rehabilitationPlan;

  // SLA Live Countdown
  useEffect(() => {
    if (!sla?.deadline) return;
    const updateTimer = () => {
      const diff = new Date(sla.deadline).getTime() - Date.now();
      if (diff <= 0) {
        const over = Math.abs(diff);
        const hours = Math.floor(over / 3600000).toString().padStart(2, '0');
        const mins = Math.floor((over % 3600000) / 60000).toString().padStart(2, '0');
        const secs = Math.floor((over % 60000) / 1000).toString().padStart(2, '0');
        setTimeLeft({ str: `BREACHED (${hours}:${mins}:${secs} overdue)`, status: 'BREACHED' });
      } else {
        const hours = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const mins = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const secs = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        const isWarn = diff < (sla.warningThresholdMinutes || 30) * 60 * 1000;
        setTimeLeft({ str: `${hours}:${mins}:${secs} remaining`, status: isWarn ? 'WARNING' : 'ON_TIME' });
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [sla?.deadline]);

  // Mutations
  const overrideMutation = useMutation({
    mutationFn: async () =>
      (await api.post(`/cases/${id}/override-ai`, {
        riskScore: Number(overrideForm.riskScore),
        riskLevel: overrideForm.riskLevel,
        reason: overrideForm.reason,
      })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-detail', id] });
      setOverrideOpen(false);
    },
  });

  const assignMutation = useMutation({
    mutationFn: async () =>
      (await api.post(`/cases/${id}/assign`, {
        agencyId: assignForm.agencyId,
        officerId: assignForm.officerId || undefined,
        priority: assignForm.priority,
        notes: assignForm.notes,
      })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-detail', id] });
      setAssignOpen(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: async () =>
      (await api.patch(`/cases/${id}/status`, {
        status: statusForm.status,
        notes: statusForm.notes,
      })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-detail', id] });
      setStatusOpen(false);
    },
  });

  const repeatReviewMutation = useMutation({
    mutationFn: async () =>
      (await api.post(`/cases/${id}/repeat-review`, {
        decision: repeatDecision,
        notes: repeatNotes,
      })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-detail', id] });
      setRepeatReviewOpen(false);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('files', f));
      return (await api.post(`/cases/${id}/evidence`, fd)).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case-detail', id] }),
  });

  const initiateRehabMutation = useMutation({
    mutationFn: async () => (await api.post(`/cases/${id}/rehabilitation`, {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case-detail', id] }),
  });

  const addInterventionMutation = useMutation({
    mutationFn: async () =>
      (await api.post(`/cases/${id}/interventions`, {
        ...interventionForm,
        outcomeScore: Number(interventionForm.outcomeScore),
        followUpDate: interventionForm.followUpDate ? new Date(interventionForm.followUpDate) : undefined,
      })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-detail', id] });
      setInterventionOpen(false);
    },
  });

  const handleDownloadEvidence = async (evidenceId: string, type: 'redacted' | 'original', filename: string) => {
    try {
      const res = await api.get(`/cases/${id}/evidence/${evidenceId}/download?type=${type}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type.toUpperCase()}_${filename}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.response?.data?.message || 'Access Denied: Protected original evidence is strictly restricted to Police and Administrators.');
    }
  };

  const handlePairedUpload = async (orig: File, red: File) => {
    const fd = new FormData();
    fd.append('original', orig);
    fd.append('redacted', red);
    await api.post(`/cases/${id}/evidence/paired`, fd);
    qc.invalidateQueries({ queryKey: ['case-detail', id] });
  };

  if (caseQuery.isLoading) return <LinearProgress />;
  if (caseQuery.isError) return <Alert severity="error">{errorMessage(caseQuery.error)}</Alert>;
  if (!c) return <Alert severity="warning">Case not found.</Alert>;

  return (
    <Container maxWidth="xl" sx={{ pt: 3, pb: 8 }}>
      {/* 1. CASE HEADER */}
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => nav(-1)} sx={{ mb: 1.5 }}>
          Back to Dashboard
        </Button>
        <Paper elevation={0} sx={{ p: 3, bgcolor: '#f8fafc', border: `1px solid ${colors.line}`, borderRadius: 2 }}>
          <Grid container spacing={2} justifyContent="space-between" alignItems="center">
            <Grid item xs={12} md={8}>
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                <Typography variant="h2" sx={{ fontSize: '1.9rem', fontWeight: 800, color: colors.ink }}>
                  CASE #{c.caseId}
                </Typography>
                <StatusBadge status={c.status} />
                <RiskBadge emergency={c.emergencyIndicator} />
                {risk && (
                  <Chip
                    label={`AI RISK: ${risk.riskScore}/100 [${risk.riskLevel}]`}
                    sx={{
                      fontWeight: 800,
                      bgcolor: RISK_COLORS[risk.riskLevel]?.bg || '#f1f5f9',
                      color: RISK_COLORS[risk.riskLevel]?.text || '#1e293b',
                      border: `1px solid ${RISK_COLORS[risk.riskLevel]?.border || '#cbd5e1'}`,
                    }}
                  />
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Tracking ID: <b>{c.trackingId}</b> • Jurisdiction: <b>{c.location.district}</b> • Reported on:{' '}
                <b>{new Date(c.createdAt).toLocaleString()}</b>
              </Typography>
            </Grid>

            {/* Quick Officer Actions */}
            <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Stack direction="row" spacing={1} justifyContent={{ md: 'flex-end' }} flexWrap="wrap" useFlexGap>
                {userRole !== 'NGO' && (
                  <>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Tune />}
                      onClick={() => {
                        setOverrideForm({
                          riskScore: risk?.riskScore ?? 50,
                          riskLevel: risk?.riskLevel ?? 'MEDIUM',
                          reason: '',
                        });
                        setOverrideOpen(true);
                      }}
                    >
                      Override AI Risk
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AssignmentInd />}
                      onClick={() => setAssignOpen(true)}
                    >
                      Assign Case
                    </Button>
                  </>
                )}
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    setStatusForm({ status: '', notes: '' });
                    setStatusOpen(true);
                  }}
                >
                  Change Status
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* SLA TIMER BANNER (Module 3) */}
      {sla && (
        <Paper
          elevation={1}
          sx={{
            mb: 3,
            p: 2,
            borderLeft: `6px solid ${
              timeLeft.status === 'BREACHED' ? '#dc2626' : timeLeft.status === 'WARNING' ? '#f59e0b' : '#10b981'
            }`,
            bgcolor:
              timeLeft.status === 'BREACHED' ? '#fef2f2' : timeLeft.status === 'WARNING' ? '#fffbeb' : '#f0fdf4',
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={1}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Timer sx={{ color: timeLeft.status === 'BREACHED' ? '#dc2626' : timeLeft.status === 'WARNING' ? '#d97706' : '#059669', fontSize: 28 }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={800} color={timeLeft.status === 'BREACHED' ? '#b91c1c' : timeLeft.status === 'WARNING' ? '#b45309' : '#047857'}>
                  SLA Operational Countdown: {timeLeft.str}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Rule: {sla.ruleName} • Target Window: {sla.targetHours}h • Deadline: {new Date(sla.deadline).toLocaleString()}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={timeLeft.status.replace(/_/g, ' ')}
                color={timeLeft.status === 'BREACHED' ? 'error' : timeLeft.status === 'WARNING' ? 'warning' : 'success'}
                size="small"
                sx={{ fontWeight: 800 }}
              />
              {sla.escalationLevel > 0 && (
                <Chip
                  label={`ESCALATED: Level ${sla.escalationLevel} (${sla.escalations?.[sla.escalations.length - 1]?.escalatedToRole || 'Supervisor'})`}
                  color="error"
                  variant="outlined"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              )}
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Emergency Alert Banner */}
      {c.emergencyIndicator && (
        <Alert severity="error" icon={<ReportProblem fontSize="large" />} sx={{ mb: 3, fontWeight: 700 }}>
          🚨 CRITICAL CHILD SAFETY ALERT: Immediate life safety or extreme hazard detected. Inter-agency priority response active.
        </Alert>
      )}

      {/* Duplicate / Repeat Offence Warning Banner */}
      {c.duplicateCheck?.isPotentialDuplicate && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          ⚠️ <b>POTENTIAL DUPLICATE CASE DETECTED:</b> Intakes match active report <b>{c.duplicateCheck.matches[0]?.caseId}</b> with {c.duplicateCheck.matches[0]?.similarityScore}% confidence.
          Reasons: {c.duplicateCheck.matches[0]?.reasons.join(', ')}.
        </Alert>
      )}

      {c.repeatOffenceCheck?.isPotentialRepeat && (
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={() => setRepeatReviewOpen(true)}>
              Review Match ({c.repeatOffenceCheck?.officerDecision || 'PENDING'})
            </Button>
          }
          sx={{ mb: 3 }}
        >
          🔍 <b>POSSIBLE REPEAT OFFENCE:</b> {c.repeatOffenceCheck.matches.length} previous case(s) found matching this workplace / establishment / employer.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* LEFT COLUMN: Risk Assessment, Situation, Child Info, Evidence */}
        <Grid item xs={12} md={7}>
          <Stack spacing={3}>
            {/* 3. AI RISK ASSESSMENT & EXPLANATION */}
            <Card sx={{ borderTop: `4px solid ${risk?.riskLevel === 'CRITICAL' ? '#dc2626' : colors.teal}` }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>AI Risk Assessment & Explainability</Typography>
                  {userRole !== 'NGO' && (
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<Tune />}
                      onClick={() => {
                        setOverrideForm({
                          riskScore: risk?.riskScore ?? 50,
                          riskLevel: risk?.riskLevel ?? 'MEDIUM',
                          reason: '',
                        });
                        setOverrideOpen(true);
                      }}
                    >
                      Officer Override
                    </Button>
                  )}
                </Stack>

                <Grid container spacing={2} sx={{ mb: 2.5 }}>
                  <Grid item xs={6} sm={4}>
                    <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1.5, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">RISK SCORE</Typography>
                      <Typography variant="h3" sx={{ fontWeight: 800, color: colors.ink }}>
                        {risk?.riskScore ?? 0}<span style={{ fontSize: 16, color: '#64748b' }}>/100</span>
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1.5, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">RISK LEVEL</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, color: risk?.riskLevel === 'CRITICAL' ? '#dc2626' : colors.teal, mt: 0.5 }}>
                        {risk?.riskLevel ?? 'LOW'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1.5, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">MODEL CONFIDENCE</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, color: '#0284c7', mt: 0.5 }}>
                        {risk?.confidence ? `${Math.round(risk.confidence * 100)}%` : '92%'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Explainable Factors (Why this score was generated):
                </Typography>
                <List dense sx={{ bgcolor: '#f8fafc', borderRadius: 1, p: 1 }}>
                  {risk?.factors && risk.factors.length > 0 ? (
                    risk.factors.map((factor, i) => (
                      <ListItem key={i}>
                        <ListItemText
                          primary={factor}
                          primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
                        />
                      </ListItem>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>No risk factors identified.</Typography>
                  )}
                </List>

                {risk?.officerOverride?.isOverridden && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ color: '#c2410c', fontWeight: 700 }}>
                      ⚠️ Officer AI Override Recorded:
                    </Typography>
                    <Typography variant="body2">
                      Original: {risk.officerOverride.originalScore} [{risk.officerOverride.originalLevel}] → Overridden to: {risk.officerOverride.overriddenScore} [{risk.officerOverride.overriddenLevel}]
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      <b>Reason:</b> "{risk.officerOverride.reason}"
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      By {risk.officerOverride.byUserName} on {new Date(risk.officerOverride.overriddenAt || '').toLocaleString()}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* CHILD INFORMATION */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>Child Profile</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}><Typography variant="body2" color="text.secondary">Age Range</Typography><Typography sx={{ fontWeight: 600 }}>{lab(AGE_RANGES, ci?.ageRange)}</Typography></Grid>
                  {ci?.approximateAge !== undefined && <Grid item xs={6}><Typography variant="body2" color="text.secondary">Approximate Age</Typography><Typography sx={{ fontWeight: 600 }}>{ci.approximateAge} years</Typography></Grid>}
                  <Grid item xs={6}><Typography variant="body2" color="text.secondary">Number of Children</Typography><Typography sx={{ fontWeight: 600 }}>{ci?.numberOfChildren}</Typography></Grid>
                  {ci?.gender && <Grid item xs={6}><Typography variant="body2" color="text.secondary">Gender</Typography><Typography sx={{ fontWeight: 600 }}>{ci.gender}</Typography></Grid>}
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Vulnerability Indicators</Typography>
                    <Typography sx={{ fontWeight: 600 }}>
                      {ci?.vulnerabilityIndicators?.length ? ci.vulnerabilityIndicators.map((v) => lab(VULNERABILITIES, v)).join(', ') : 'None reported'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* SITUATION & WORKPLACE */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>Workplace & Situation</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Commercial Establishment</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{c.establishmentName || 'Not recorded'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Employer / Owner</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{c.employerName || 'Not recorded'}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Activity Observed</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{sd?.childActivity}</Typography>
                  </Grid>
                  <Grid item xs={6}><Typography variant="body2" color="text.secondary">Currently In Danger</Typography><Typography>{tri(sd?.currentlyInDanger)}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="body2" color="text.secondary">Threatened</Typography><Typography>{tri(sd?.threatened)}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="body2" color="text.secondary">Forced to Work</Typography><Typography>{tri(sd?.forcedToWork)}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="body2" color="text.secondary">Suspected Trafficking</Typography><Typography>{tri(sd?.suspectedTrafficking)}</Typography></Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Location Details</Typography>
                    <Typography sx={{ fontWeight: 600 }}>
                      {c.location.villageOrCity}, {c.location.district} {c.location.taluk ? `(Taluk: ${c.location.taluk})` : ''}
                    </Typography>
                    {c.location.landmark && <Typography variant="body2">Landmark: {c.location.landmark}</Typography>}
                    {c.location.coordinates && <Typography variant="caption" color="text.secondary">GPS: {c.location.coordinates.lat}, {c.location.coordinates.lng}</Typography>}
                  </Grid>
                  {sd?.additionalDescription && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Reporter Description</Typography>
                      <Typography sx={{ whiteSpace: 'pre-wrap', bgcolor: '#f8fafc', p: 1.5, borderRadius: 1 }}>{sd.additionalDescription}</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* 4. EVIDENCE SECTION & PRIVACY PRESERVATION (Module 3) */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      Evidence Chain & Redaction ({c.evidence?.length ?? 0})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      AES-256-GCM Encrypted Storage • Client-side Juvenile Identity Redaction
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      color="secondary"
                      size="small"
                      startIcon={<Security />}
                      component="label"
                    >
                      Redact Face & Upload
                      <input
                        hidden
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setSelectedRedactFile(e.target.files[0]);
                            setFaceRedactorOpen(true);
                          }
                        }}
                      />
                    </Button>

                    <Button
                      component="label"
                      variant="outlined"
                      size="small"
                      startIcon={<UploadFile />}
                      disabled={uploadMutation.isPending}
                    >
                      {uploadMutation.isPending ? 'Uploading…' : 'Standard Upload'}
                      <input hidden type="file" multiple onChange={(e) => { if (e.target.files?.length) uploadMutation.mutate(e.target.files); }} />
                    </Button>
                  </Stack>
                </Stack>

                {c.evidence?.length ? (
                  <List dense disablePadding>
                    {c.evidence.map((e) => {
                      const isPoliceOrAdmin = userRole === 'POLICE' || userRole === 'ADMIN';
                      return (
                        <ListItem
                          key={e.id}
                          disableGutters
                          sx={{ py: 1.5, borderBottom: `1px solid ${colors.line}` }}
                          secondaryAction={
                            <Stack direction="row" spacing={1}>
                              {/* Redacted Download (Open to all staff) */}
                              <Tooltip title="Download Redacted Copy (Child Identity Obfuscated)">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<LockOpen />}
                                  onClick={() => handleDownloadEvidence(e.id, 'redacted', e.filename)}
                                >
                                  Redacted
                                </Button>
                              </Tooltip>

                              {/* Protected Original (Restricted to Police & Admin) */}
                              {e.hasProtectedOriginal && (
                                <Tooltip
                                  title={
                                    isPoliceOrAdmin
                                      ? 'Download Protected Original (AES-256 Decrypted)'
                                      : 'Restricted: Protected original evidence strictly accessible to Police and Admin authorities.'
                                  }
                                >
                                  <span>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="error"
                                      startIcon={<Lock />}
                                      disabled={!isPoliceOrAdmin}
                                      onClick={() => handleDownloadEvidence(e.id, 'original', e.filename)}
                                    >
                                      Protected Original
                                    </Button>
                                  </span>
                                </Tooltip>
                              )}
                            </Stack>
                          }
                        >
                          <ListItemText
                            primary={
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="subtitle2" fontWeight={700}>
                                  {e.filename}
                                </Typography>
                                {e.hasProtectedOriginal && (
                                  <Chip label="REDACTED + ENCRYPTED ORIGINAL" size="small" color="success" />
                                )}
                              </Stack>
                            }
                            secondary={
                              <Box sx={{ mt: 0.5 }}>
                                <Typography variant="caption" display="block" color="text.secondary">
                                  {e.fileType.toLowerCase()} • {fmtBytes(e.sizeBytes)} • {new Date(e.uploadedAt).toLocaleString()} • {e.classification.toLowerCase()}
                                </Typography>
                                {e.sha256 && (
                                  <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', color: '#64748b' }}>
                                    SHA-256: {e.sha256.slice(0, 24)}...
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">No evidence uploaded yet.</Typography>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* RIGHT COLUMN: Case Timeline, Agencies & Assignment, Repeat Offences, Audit */}
        <Grid item xs={12} md={5}>
          <Stack spacing={3}>
            {/* MODULE 3: REHABILITATION WORKFLOW & GRAPH */}
            <Card sx={{ borderTop: '4px solid #06b6d4' }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <VolunteerActivism sx={{ color: '#06b6d4' }} />
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>Rehabilitation & Care Plan</Typography>
                  </Stack>

                  {['CWC', 'NGO', 'ADMIN'].includes(userRole) && (
                    rehabPlan ? (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<AddCircle />}
                        onClick={() => setInterventionOpen(true)}
                      >
                        Add Milestone
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        color="secondary"
                        disabled={initiateRehabMutation.isPending}
                        onClick={() => initiateRehabMutation.mutate()}
                      >
                        Initiate Plan
                      </Button>
                    )
                  )}
                </Stack>

                {rehabPlan ? (
                  <Box>
                    <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 1.5, border: '1px solid #bbf7d0', mb: 2 }}>
                      <Typography variant="caption" fontWeight={700} color="#166534">
                        ML REHABILITATION RECOMMENDATION
                      </Typography>
                      <Grid container spacing={1} sx={{ mt: 0.5 }}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Shelter Pathway</Typography>
                          <Typography variant="body2" fontWeight={700}>{rehabPlan.recommendedShelter?.replace(/_/g, ' ')}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Education Plan</Typography>
                          <Typography variant="body2" fontWeight={700}>{rehabPlan.recommendedEducation?.replace(/_/g, ' ')}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Counselling Care</Typography>
                          <Typography variant="body2" fontWeight={700}>{rehabPlan.recommendedCounselling?.replace(/_/g, ' ')}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Reintegration</Typography>
                          <Typography variant="body2" fontWeight={700}>{rehabPlan.recommendedPathway?.replace(/_/g, ' ')}</Typography>
                        </Grid>
                      </Grid>
                    </Box>

                    {/* Rehabilitation Milestones Graph */}
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                      Intervention Milestones Graph ({rehabPlan.interventions?.length || 0})
                    </Typography>

                    {rehabPlan.interventions && rehabPlan.interventions.length > 0 ? (
                      <Stack spacing={2} sx={{ pl: 1, borderLeft: '2px solid #06b6d4', ml: 1 }}>
                        {rehabPlan.interventions.map((iv, idx) => (
                          <Box key={idx} sx={{ position: 'relative', pl: 2 }}>
                            <Box
                              sx={{
                                position: 'absolute',
                                left: -11,
                                top: 4,
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                bgcolor: iv.status === 'COMPLETED' ? '#10b981' : '#06b6d4',
                              }}
                            />
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="subtitle2" fontWeight={700}>
                                {iv.type.replace(/_/g, ' ')}: {iv.title}
                              </Typography>
                              <Chip
                                label={iv.status}
                                size="small"
                                color={iv.status === 'COMPLETED' ? 'success' : 'info'}
                              />
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              Responsible: {iv.responsiblePerson} ({iv.responsibleAgency}) • Date: {new Date(iv.date).toLocaleDateString()}
                            </Typography>
                            {iv.outcome && (
                              <Typography variant="body2" sx={{ mt: 0.5, bgcolor: '#f8fafc', p: 1, borderRadius: 1 }}>
                                Outcome: {iv.outcome}
                              </Typography>
                            )}
                            {iv.outcomeScore !== undefined && (
                              <Typography variant="caption" display="block" color="primary.main" fontWeight={600} sx={{ mt: 0.5 }}>
                                Welfare Outcome Score: {iv.outcomeScore}/100
                              </Typography>
                            )}
                            {iv.followUpDate && (
                              <Typography variant="caption" display="block" color="warning.main" fontWeight={600}>
                                Follow-up Scheduled: {new Date(iv.followUpDate).toLocaleDateString()}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Plan created. Click "Add Milestone" to record shelter admission, medical assessment, schooling, or counselling.
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      Child is in custody/rescue. Statutory rehabilitation plan can be initiated under JJ Act guidelines.
                    </Typography>
                    {['CWC', 'NGO', 'ADMIN'].includes(userRole) && (
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => initiateRehabMutation.mutate()}
                        disabled={initiateRehabMutation.isPending}
                      >
                        Initiate JJ Act Rehabilitation Plan
                      </Button>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* 2. CASE TIMELINE */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <HistoryEdu sx={{ color: colors.teal }} />
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>Case Audit Timeline</Typography>
                </Stack>
                <Stack spacing={2} sx={{ pl: 1, borderLeft: `2px solid ${colors.line}`, ml: 1 }}>
                  {c.timeline && c.timeline.length > 0 ? (
                    c.timeline.map((item, idx) => (
                      <Box key={idx} sx={{ position: 'relative', pl: 2 }}>
                        <Box
                          sx={{
                            position: 'absolute',
                            left: -11,
                            top: 4,
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: item.stage.includes('CRITICAL') || item.stage.includes('ALERT') ? '#dc2626' : colors.teal,
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(item.timestamp).toLocaleDateString()}
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {item.stage}
                        </Typography>
                        {item.details && (
                          <Typography variant="body2" color="text.secondary">
                            {item.details}
                          </Typography>
                        )}
                        {item.byUserName && (
                          <Typography variant="caption" sx={{ color: colors.teal, fontWeight: 600 }}>
                            By {item.byUserName}
                          </Typography>
                        )}
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">No timeline events recorded.</Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* 5. AGENCIES & ASSIGNMENT SECTION */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>Agency Assignment</Typography>
                  {userRole !== 'NGO' && <Button size="small" variant="text" onClick={() => setAssignOpen(true)}>Change</Button>}
                </Stack>

                {c.agencyRecommendation && (
                  <Box sx={{ p: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 1.5, mb: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#166534' }}>
                      AI AGENCY RECOMMENDATION
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: colors.ink }}>
                      Recommended: {c.agencyRecommendation.recommendedAgency} (Backup: {c.agencyRecommendation.backupAgency})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Priority: {c.agencyRecommendation.priority} • Expected Response Time: {c.agencyRecommendation.expectedResponseHours} hours
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {c.agencyRecommendation.reasons?.join(' ')}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">CURRENT ASSIGNMENT</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {c.assignment?.assignedAgencyName || 'Awaiting assignment'}
                  </Typography>
                  {c.assignment?.assignedOfficerName && (
                    <Typography variant="body2">Officer: {c.assignment.assignedOfficerName}</Typography>
                  )}
                  {c.assignment?.notes && (
                    <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                      Notes: "{c.assignment.notes}"
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* 6. PREVIOUS CASES / REPEAT OFFENCE SECTION */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>Previous Cases / Repeat Check</Typography>
                  {c.repeatOffenceCheck?.isPotentialRepeat && userRole !== 'NGO' && (
                    <Button size="small" onClick={() => setRepeatReviewOpen(true)}>Review</Button>
                  )}
                </Stack>

                {c.repeatOffenceCheck?.isPotentialRepeat ? (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Found {c.repeatOffenceCheck.matches.length} matching prior case(s) for this establishment / location.
                    </Typography>
                    {c.repeatOffenceCheck.matches.map((m, idx) => (
                      <Paper key={idx} variant="outlined" sx={{ p: 1.5, mb: 1, bgcolor: '#fefce8' }}>
                        <Typography variant="subtitle2" fontWeight={700}>Prior Case: {m.caseId}</Typography>
                        <Typography variant="caption" color="text.secondary">Matches: {m.reasons.join(', ')}</Typography>
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">No prior offences found for this establishment.</Typography>
                )}
              </CardContent>
            </Card>

            {/* 7. CRYPTOGRAPHIC AUDIT LEDGER — Module 4 */}
            <AuditLedgerSection caseId={c.caseId} userRole={userRole} />
          </Stack>
        </Grid>
      </Grid>

      {/* DIALOG 1: OVERRIDE AI RISK */}
      <Dialog open={overrideOpen} onClose={() => setOverrideOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Officer Override: AI Risk Assessment</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <TextField
              label="Overridden Risk Score (0-100)"
              type="number"
              value={overrideForm.riskScore}
              onChange={(e) => setOverrideForm({ ...overrideForm, riskScore: Number(e.target.value) })}
              inputProps={{ min: 0, max: 100 }}
            />
            <TextField
              select
              label="Overridden Risk Level"
              value={overrideForm.riskLevel}
              onChange={(e) => setOverrideForm({ ...overrideForm, riskLevel: e.target.value as any })}
            >
              <MenuItem value="LOW">LOW</MenuItem>
              <MenuItem value="MEDIUM">MEDIUM</MenuItem>
              <MenuItem value="HIGH">HIGH</MenuItem>
              <MenuItem value="CRITICAL">CRITICAL</MenuItem>
            </TextField>
            <TextField
              label="Override Justification Reason"
              multiline
              rows={3}
              value={overrideForm.reason}
              onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOverrideOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!overrideForm.reason.trim() || overrideMutation.isPending}
            onClick={() => overrideMutation.mutate()}
          >
            Save Override
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 2: ASSIGN CASE */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Assign Case to Agency & Officer</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <TextField
              select
              label="Target Enforcement Agency"
              value={assignForm.agencyId}
              onChange={(e) => setAssignForm({ ...assignForm, agencyId: e.target.value })}
              required
            >
              {(agenciesQuery.data || []).map((a: any) => (
                <MenuItem key={a._id} value={a._id}>
                  {a.name} ({a.type} - {a.district})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Priority Level"
              select
              value={assignForm.priority}
              onChange={(e) => setAssignForm({ ...assignForm, priority: e.target.value })}
            >
              <MenuItem value="CRITICAL">CRITICAL</MenuItem>
              <MenuItem value="HIGH">HIGH</MenuItem>
              <MenuItem value="MEDIUM">MEDIUM</MenuItem>
              <MenuItem value="LOW">LOW</MenuItem>
            </TextField>
            <TextField
              label="Assignment Directives & Instructions"
              multiline
              rows={2}
              value={assignForm.notes}
              onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!assignForm.agencyId || assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 3: STATUS TRANSITION */}
      <Dialog open={statusOpen} onClose={() => setStatusOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Advance Case State Machine</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Current State: <b>{c.status}</b>
            </Typography>
            <TextField
              select
              label="New State Machine Status"
              value={statusForm.status}
              onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
              required
            >
              <MenuItem value="VERIFICATION_PENDING">VERIFICATION_PENDING</MenuItem>
              <MenuItem value="VERIFIED">VERIFIED</MenuItem>
              <MenuItem value="PRIORITIZED">PRIORITIZED</MenuItem>
              <MenuItem value="ASSIGNED">ASSIGNED</MenuItem>
              <MenuItem value="INTERVENTION_REQUIRED">INTERVENTION_REQUIRED</MenuItem>
              <MenuItem value="RESCUED_PROTECTED">RESCUED_PROTECTED (Rescue Event)</MenuItem>
              <MenuItem value="REHABILITATION_PLANNED">REHABILITATION_PLANNED</MenuItem>
              <MenuItem value="SHELTER">SHELTER (Care Institution)</MenuItem>
              <MenuItem value="MEDICAL_ASSESSMENT">MEDICAL_ASSESSMENT</MenuItem>
              <MenuItem value="COUNSELLING">COUNSELLING</MenuItem>
              <MenuItem value="EDUCATION">EDUCATION (Bridge / Mainstream)</MenuItem>
              <MenuItem value="FAMILY_ASSESSMENT">FAMILY_ASSESSMENT</MenuItem>
              <MenuItem value="FAMILY_REINTEGRATION">FAMILY_REINTEGRATION</MenuItem>
              <MenuItem value="FOLLOW_UP">FOLLOW_UP</MenuItem>
              <MenuItem value="MONITORING">MONITORING</MenuItem>
              <MenuItem value="CLOSED">CLOSED</MenuItem>
            </TextField>
            <TextField
              label="Transition Notes"
              multiline
              rows={2}
              value={statusForm.notes}
              onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
            />
            {statusMutation.isError && (
              <Alert severity="error">{errorMessage(statusMutation.error)}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!statusForm.status || statusMutation.isPending}
            onClick={() => statusMutation.mutate()}
          >
            Transition Case
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 4: REVIEW REPEAT OFFENCE */}
      <Dialog open={repeatReviewOpen} onClose={() => setRepeatReviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Officer Review: Repeat Offence Link</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2">
              Review potential repeat violations linked to this employer / establishment:
            </Typography>
            <TextField
              select
              label="Officer Determination"
              value={repeatDecision}
              onChange={(e) => setRepeatDecision(e.target.value as any)}
            >
              <MenuItem value="CONFIRMED">CONFIRMED — Same establishment/employer repeat violator</MenuItem>
              <MenuItem value="REJECTED">REJECTED — Coincidental or unrelated incident</MenuItem>
            </TextField>
            <TextField
              label="Review Justification"
              placeholder="Notes on establishment identity or employer verification..."
              multiline
              minRows={2}
              value={repeatNotes}
              onChange={(e) => setRepeatNotes(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRepeatReviewOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={repeatReviewMutation.isPending}
            onClick={() => repeatReviewMutation.mutate()}
          >
            Save Determination
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 5: ADD INTERVENTION MILESTONE (Module 3) */}
      <Dialog open={interventionOpen} onClose={() => setInterventionOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Rehabilitation Intervention Milestone</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <TextField
              select
              label="Intervention Stage / Type"
              value={interventionForm.type}
              onChange={(e) => setInterventionForm({ ...interventionForm, type: e.target.value })}
            >
              <MenuItem value="SHELTER">SHELTER (Child Care Institution / Open Shelter)</MenuItem>
              <MenuItem value="MEDICAL_ASSESSMENT">MEDICAL_ASSESSMENT (Health & Pediatric Screening)</MenuItem>
              <MenuItem value="COUNSELLING">COUNSELLING (Trauma-informed Psychosocial)</MenuItem>
              <MenuItem value="EDUCATION">EDUCATION (School Mainstreaming / Bridge Course)</MenuItem>
              <MenuItem value="FAMILY_ASSESSMENT">FAMILY_ASSESSMENT (Home Study Report Form 22)</MenuItem>
              <MenuItem value="FAMILY_REINTEGRATION">FAMILY_REINTEGRATION (Supervised Reunification)</MenuItem>
              <MenuItem value="FOLLOW_UP">FOLLOW_UP (Scheduled Inspection / Visit)</MenuItem>
              <MenuItem value="MONITORING">MONITORING (Post-release Periodic Audit)</MenuItem>
            </TextField>

            <TextField
              label="Milestone Title"
              placeholder="e.g., Admission to Sneha Child Care Shelter"
              value={interventionForm.title}
              onChange={(e) => setInterventionForm({ ...interventionForm, title: e.target.value })}
              required
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Responsible Agency"
                  value={interventionForm.responsibleAgency}
                  onChange={(e) => setInterventionForm({ ...interventionForm, responsibleAgency: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Responsible Officer / Caseworker"
                  value={interventionForm.responsiblePerson}
                  onChange={(e) => setInterventionForm({ ...interventionForm, responsiblePerson: e.target.value })}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  select
                  label="Intervention Status"
                  value={interventionForm.status}
                  onChange={(e) => setInterventionForm({ ...interventionForm, status: e.target.value })}
                >
                  <MenuItem value="PLANNED">PLANNED</MenuItem>
                  <MenuItem value="IN_PROGRESS">IN_PROGRESS</MenuItem>
                  <MenuItem value="COMPLETED">COMPLETED</MenuItem>
                  <MenuItem value="CANCELLED">CANCELLED</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Outcome Score (0-100)"
                  type="number"
                  value={interventionForm.outcomeScore}
                  onChange={(e) => setInterventionForm({ ...interventionForm, outcomeScore: Number(e.target.value) })}
                />
              </Grid>
            </Grid>

            <TextField
              label="Next Follow-up Due Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={interventionForm.followUpDate}
              onChange={(e) => setInterventionForm({ ...interventionForm, followUpDate: e.target.value })}
            />

            <TextField
              label="Outcome / Progress Notes"
              placeholder="Observations, medical report findings, or child adjustment..."
              multiline
              rows={2}
              value={interventionForm.outcome}
              onChange={(e) => setInterventionForm({ ...interventionForm, outcome: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInterventionOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!interventionForm.title.trim() || addInterventionMutation.isPending}
            onClick={() => addInterventionMutation.mutate()}
          >
            Record Intervention
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 6: CLIENT-SIDE FACE REDACTOR (Module 3) */}
      <FaceRedactorDialog
        open={faceRedactorOpen}
        onClose={() => {
          setFaceRedactorOpen(false);
          setSelectedRedactFile(null);
        }}
        file={selectedRedactFile}
        onApproveAndUpload={handlePairedUpload}
      />
    </Container>
  );
}
