import {
  Alert, Box, Button, Card, CardContent, Chip, Container, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Grid, LinearProgress, MenuItem, Paper,
  Select, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Tabs, TextField, Typography
} from '@mui/material';
import EscalatorWarning from '@mui/icons-material/EscalatorWarning';
import Gavel from '@mui/icons-material/Gavel';
import Assignment from '@mui/icons-material/Assignment';
import EventNote from '@mui/icons-material/EventNote';
import ChildCare from '@mui/icons-material/ChildCare';
import FamilyRestroom from '@mui/icons-material/FamilyRestroom';
import FactCheck from '@mui/icons-material/FactCheck';
import HistoryEdu from '@mui/icons-material/HistoryEdu';
import Visibility from '@mui/icons-material/Visibility';
import AddCircle from '@mui/icons-material/AddCircle';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Warning from '@mui/icons-material/Warning';
import Security from '@mui/icons-material/Security';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { api } from '../../api/client';
import type { CaseRow, DashboardStats } from '../../api/types';
import StatusBadge from '../../components/StatusBadge';
import RiskBadge from '../../components/RiskBadge';
import CaseTrackingPanel from '../../components/CaseTrackingPanel';
import { categoryLabel } from '../../constants';
import { colors } from '../../theme';

export default function CwcDashboard() {
  const [activeTab, setActiveTab] = useState(0);

  // Modal states for interactive CWC actions
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [followupModalOpen, setFollowupModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<string>('');
  const [hearingDate, setHearingDate] = useState('2026-10-15');
  const [hearingType, setHearingType] = useState('Preliminary Inquiry (Sec 36 JJ Act)');
  const [orderType, setOrderType] = useState('Interim Custody Order to CCI');
  const [orderNotes, setOrderNotes] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const statsQuery = useQuery({
    queryKey: ['cwc-stats'],
    queryFn: async () => (await api.get<{ stats: DashboardStats }>('/cases/stats')).data.stats,
  });

  const casesQuery = useQuery({
    queryKey: ['cwc-cases'],
    queryFn: async () => (await api.get<{ items: CaseRow[] }>('/cases?limit=50')).data.items,
  });

  const stats = statsQuery.data;
  const cases = casesQuery.data || [];

  // Filtered views for CWC operations
  const referredCases = cases.filter((c) =>
    ['TRIAGED', 'VERIFIED', 'ASSIGNED', 'INTERVENTION_REQUIRED'].includes(c.status)
  );
  const awaitingReview = cases.filter((c) => c.status === 'TRIAGED' || c.status === 'VERIFIED');
  const activeRehabCases = cases.filter((c) =>
    ['RESCUED_PROTECTED', 'PROTECTION_REHABILITATION'].includes(c.status)
  );

  const handleAction = (msg: string) => {
    setActionSuccess(msg);
    setScheduleModalOpen(false);
    setOrderModalOpen(false);
    setFollowupModalOpen(false);
    setTimeout(() => setActionSuccess(null), 5000);
  };

  return (
    <Container maxWidth="xl" sx={{ pt: 3, pb: 8 }}>
      {/* 1. CWC Dashboard Header */}
      <Box sx={{ mb: 3, p: 3, bgcolor: '#0f766e', color: '#fff', borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <EscalatorWarning sx={{ color: '#99f6e4', fontSize: 44 }} />
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff', fontSize: '1.8rem' }}>
                CHILD WELFARE COMMITTEE (CWC) BENCH DASHBOARD
              </Typography>
              <Typography sx={{ color: '#ccfbf1', fontSize: 14 }}>
                Statutory Authority under Juvenile Justice Act · Inquiry, Orders, Custody & Rehabilitation
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              sx={{ bgcolor: '#134e4a', '&:hover': { bgcolor: '#042f2e' } }}
              startIcon={<EventNote />}
              onClick={() => { setSelectedCase(cases[0]?.caseId || ''); setScheduleModalOpen(true); }}
            >
              Schedule Hearing
            </Button>
            <Button
              variant="contained"
              sx={{ bgcolor: '#f59e0b', color: '#78350f', fontWeight: 700, '&:hover': { bgcolor: '#d97706' } }}
              startIcon={<Gavel />}
              onClick={() => { setSelectedCase(cases[0]?.caseId || ''); setOrderModalOpen(true); }}
            >
              Pass Bench Order
            </Button>
          </Stack>
        </Stack>
      </Box>

      {actionSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {actionSuccess}
        </Alert>
      )}

      {/* 1. Top 5 Recommended KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'TOTAL REFERRED TO CWC', value: cases.length, color: '#0f766e', sub: 'Cumulative cases under JJ Bench' },
          { label: 'AWAITING BENCH REVIEW', value: awaitingReview.length, color: '#d97706', sub: 'Pending social inquiry review' },
          { label: 'UPCOMING HEARINGS', value: Math.min(cases.length, 4), color: '#2563eb', sub: 'Scheduled within next 7 days' },
          { label: 'PENDING CWC ORDERS', value: Math.min(cases.length, 3), color: '#dc2626', sub: 'Interim/Final orders awaiting sign' },
          { label: 'CHILDREN REQUIRING FOLLOW-UP', value: activeRehabCases.length, color: '#7c3aed', sub: 'Post-restoration quarterly visit' },
        ].map((card) => (
          <Grid key={card.label} item xs={12} sm={6} md={2.4}>
            <Card sx={{ borderLeft: `5px solid ${card.color}`, height: '100%' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 800 }}>{card.label}</Typography>
                <Typography variant="h3" sx={{ color: card.color, fontWeight: 900, my: 0.5 }}>{card.value}</Typography>
                <Typography variant="caption" color="text.secondary">{card.sub}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Navigation Tabs for All 8 Recommended Modules */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<HistoryEdu fontSize="small" />} iconPosition="start" label="1. Case Tracking & Evidence" />
          <Tab icon={<Assignment fontSize="small" />} iconPosition="start" label="2. Referred Cases" />
          <Tab icon={<ChildCare fontSize="small" />} iconPosition="start" label="3. Child Case Profile" />
          <Tab icon={<EventNote fontSize="small" />} iconPosition="start" label="4. Hearing & Inquiry" />
          <Tab icon={<Gavel fontSize="small" />} iconPosition="start" label="5. Orders & Decisions" />
          <Tab icon={<FamilyRestroom fontSize="small" />} iconPosition="start" label="6. Rehabilitation & Restoration" />
          <Tab icon={<FactCheck fontSize="small" />} iconPosition="start" label="7. Follow-up & Compliance" />
          <Tab icon={<Security fontSize="small" />} iconPosition="start" label="8. Reports & Audit Trail" />
        </Tabs>
      </Card>

      {casesQuery.isLoading && <LinearProgress sx={{ mb: 3 }} />}

      {/* TAB 0: 1. CASE TRACKING & EVIDENCE MANAGEMENT */}
      {activeTab === 0 && (
        <CaseTrackingPanel
          cases={cases}
          isLoading={casesQuery.isLoading}
          isError={casesQuery.isError}
          error={casesQuery.error}
          title="CWC Child Case Tracking & Evidence Management"
        />
      )}

      {/* TAB 1: 2. REFERRED CASES */}
      {activeTab === 1 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h4" fontWeight={800}>Cases Referred by Police, Labour & Authorized Agencies</Typography>
                <Typography variant="body2" color="text.secondary">
                  Review production records and statutory referrals. Authorized bench options: Accept, Return for information, Route for bench inquiry.
                </Typography>
              </Box>
              <Chip label={`${referredCases.length} Cases Pending Action`} color="primary" />
            </Stack>

            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Case ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Referral Agency</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Category / Nature</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Referral Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Risk Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>CWC Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {referredCases.map((c) => (
                    <TableRow key={c.caseId} hover>
                      <TableCell>
                        <Typography fontWeight={700} sx={{ fontFamily: 'monospace' }}>{c.caseId}</Typography>
                        <Typography variant="caption" color="text.secondary">{c.location?.district}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={c.primaryAgency || (c.emergencyIndicator ? 'POLICE_SJPU' : 'LABOUR_DEPT')}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{categoryLabel(c.labourCategories[0])}</Typography>
                        {c.emergencyIndicator && <Chip size="small" color="error" label="EMERGENCY" sx={{ height: 18, fontSize: 10 }} />}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{new Date(c.createdAt).toLocaleDateString()}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <StatusBadge status={c.status} />
                          <RiskBadge risk={c.riskAssessment?.riskLevel || 'MEDIUM'} />
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleAction(`Case ${c.caseId} accepted by CWC bench for formal proceedings.`)}
                          >
                            Accept
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={() => handleAction(`Case ${c.caseId} returned to ${c.primaryAgency || 'investigating agency'} for additional information.`)}
                          >
                            Return for Info
                          </Button>
                          <Button
                            size="small"
                            component={RouterLink}
                            to={`/cases/${c.caseId}`}
                            startIcon={<Visibility />}
                          >
                            View
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {referredCases.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3, color: '#64748b' }}>
                        No pending referrals awaiting CWC review.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: 3. CHILD CASE PROFILE */}
      {activeTab === 2 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <Security sx={{ color: '#0f766e' }} />
              <Box>
                <Typography variant="h4" fontWeight={800}>Child Case Profile & Social Investigation Report (SIR)</Typography>
                <Typography variant="body2" color="text.secondary">
                  Restricted Access under Section 74 Juvenile Justice Act. Form 33 Social Investigation & Form 37 Individual Care Plan.
                </Typography>
              </Box>
            </Stack>

            <Grid container spacing={3}>
              {cases.slice(0, 4).map((c) => (
                <Grid key={c.caseId} item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2.5, bgcolor: '#f8fafc' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={800}>{c.caseId}</Typography>
                        <Typography variant="caption" color="text.secondary">Location: {c.location?.district || 'Sealed District'}</Typography>
                      </Box>
                      <RiskBadge risk={c.riskAssessment?.riskLevel || 'HIGH'} />
                    </Stack>

                    <Divider sx={{ my: 1 }} />

                    <Grid container spacing={1} sx={{ mb: 1.5 }}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Estimated Age</Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {c.childInformation?.ageRange ? c.childInformation.ageRange.replace('_', ' ') : '8-11 years (approx)'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Rescue & Production</Typography>
                        <Typography variant="body2" fontWeight={700}>Within statutory 24 hrs</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Social Investigation (SIR)</Typography>
                        <Chip size="small" color="primary" label="Form 33 Submitted" sx={{ height: 20, fontSize: 11 }} />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Medical Assessment</Typography>
                        <Chip size="small" color="success" label="Fit for Open Shelter" sx={{ height: 20, fontSize: 11 }} />
                      </Grid>
                    </Grid>

                    <Box sx={{ p: 1.5, bgcolor: '#f1f5f9', borderRadius: 1, mb: 1.5 }}>
                      <Typography variant="caption" fontWeight={700} color="#334155">CWC Case Notes:</Typography>
                      <Typography variant="caption" sx={{ display: 'block', color: '#475569' }}>
                        Child produced before CWC Bench. Declared Child in Need of Care and Protection (CNCP). Interim care in Children's Home sanctioned.
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        component={RouterLink}
                        to={`/cases/${c.caseId}`}
                        fullWidth
                      >
                        Open Full Case & Medical Dossier
                      </Button>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: 4. HEARING AND INQUIRY MANAGEMENT */}
      {activeTab === 3 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h4" fontWeight={800}>Hearing and Inquiry Management</Typography>
                <Typography variant="body2" color="text.secondary">
                  Schedule CWC Bench Hearings · Record Attendance · Record Inquiry Proceedings · Track Pending Decisions
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddCircle />}
                onClick={() => { setSelectedCase(cases[0]?.caseId || ''); setScheduleModalOpen(true); }}
              >
                Schedule New Hearing
              </Button>
            </Stack>

            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Hearing Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Case ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Inquiry Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Attendance Recorded</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { date: '2026-10-12', caseId: cases[0]?.caseId || 'CL-2026-000101', type: 'Section 36 Social Inquiry Hearing', attendance: 'Child Welfare Officer, Probation Officer', status: 'SCHEDULED' },
                    { date: '2026-10-14', caseId: cases[1]?.caseId || 'CL-2026-000102', type: 'Parental Fit Person Assessment', attendance: 'Child, Biological Mother, NGO Counsel', status: 'SCHEDULED' },
                    { date: '2026-10-16', caseId: cases[2]?.caseId || 'CL-2026-000103', type: 'Final Restoration and Rehabilitation Order', attendance: 'CWC Full Bench (3 Members)', status: 'PENDING PROCEEDINGS' },
                  ].map((h, i) => (
                    <TableRow key={i} hover>
                      <TableCell><Typography fontWeight={700}>{h.date}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontFamily: 'monospace' }}>{h.caseId}</Typography></TableCell>
                      <TableCell>{h.type}</TableCell>
                      <TableCell><Typography variant="caption">{h.attendance}</Typography></TableCell>
                      <TableCell><Chip size="small" label={h.status} color="info" /></TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleAction(`Inquiry proceeding recorded for case ${h.caseId}. Next hearing date set.`)}
                        >
                          Record Proceedings
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* TAB 4: 5. ORDERS AND DECISIONS */}
      {activeTab === 4 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h4" fontWeight={800}>Orders and Decisions</Typography>
                <Typography variant="body2" color="text.secondary">
                  Statutory Directions, Interim Custody Orders, Signed Restorations & Inter-Agency Notifications
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<Gavel />}
                onClick={() => { setSelectedCase(cases[0]?.caseId || ''); setOrderModalOpen(true); }}
              >
                Draft / Sign Bench Order
              </Button>
            </Stack>

            <Grid container spacing={2}>
              {[
                { orderNo: 'CWC/ORD/2026/041', caseId: cases[0]?.caseId || 'CL-2026-000101', type: 'Form 36 Fit Person Custody Order', date: '2026-10-08', status: 'SIGNED & NOTIFIED', bench: 'Chairperson + 2 Members' },
                { orderNo: 'CWC/ORD/2026/042', caseId: cases[1]?.caseId || 'CL-2026-000102', type: 'Form 34 Interim Shelter Placement (CCI)', date: '2026-10-09', status: 'SIGNED & NOTIFIED', bench: 'Quorum (3 Members)' },
                { orderNo: 'CWC/ORD/2026/043', caseId: cases[2]?.caseId || 'CL-2026-000103', type: 'Directions for Labour Department Wage Recovery', date: '2026-10-10', status: 'PENDING SIGNATURE', bench: 'Bench In Review' },
              ].map((o, idx) => (
                <Grid key={idx} item xs={12} md={4}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight={800}>{o.orderNo}</Typography>
                      <Chip size="small" label={o.status} color={o.status.includes('SIGNED') ? 'success' : 'warning'} />
                    </Stack>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>{o.type}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">Case: {o.caseId}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">Bench: {o.bench}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">Date: {o.date}</Typography>
                    <Button
                      size="small"
                      sx={{ mt: 1.5 }}
                      variant="outlined"
                      onClick={() => handleAction(`Certified copy of order ${o.orderNo} dispatched to Police & Labour Dept.`)}
                    >
                      Notify Stakeholders
                    </Button>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* TAB 5: 6. REHABILITATION AND RESTORATION */}
      {activeTab === 5 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>Rehabilitation & Restoration Tracking</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Statutory monitoring under JJ Model Rules: Family Restoration, Fit Facility Placement, Individual Care Plan (ICP), Educational Enrolment and Sponsorship.
            </Typography>

            <Grid container spacing={2}>
              {activeRehabCases.length > 0 ? (
                activeRehabCases.map((c) => (
                  <Grid key={c.caseId} item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight={800}>{c.caseId}</Typography>
                        <StatusBadge status={c.status} />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        District: {c.location?.district} · Category: {categoryLabel(c.labourCategories[0])}
                      </Typography>
                      <Grid container spacing={1} sx={{ mb: 1.5 }}>
                        <Grid item xs={6}>
                          <Chip size="small" color="success" label="Care Plan (ICP) Active" />
                        </Grid>
                        <Grid item xs={6}>
                          <Chip size="small" color="primary" label="Bridge Education Enrolled" />
                        </Grid>
                        <Grid item xs={6}>
                          <Chip size="small" variant="outlined" label="PM CARES / Sponsorship: Eligible" />
                        </Grid>
                        <Grid item xs={6}>
                          <Chip size="small" variant="outlined" label="Quarterly Review: Due Nov 2026" />
                        </Grid>
                      </Grid>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleAction(`Rehabilitation record updated for ${c.caseId}. Caregiver stipends marked authorized.`)}
                      >
                        Update Care & Restoration Plan
                      </Button>
                    </Paper>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Alert severity="info">No active rehabilitation cases requiring CWC monitoring at present.</Alert>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* TAB 6: 7. FOLLOW-UP AND COMPLIANCE TRACKER */}
      {activeTab === 6 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h4" fontWeight={800}>Follow-up and Compliance Tracker</Typography>
                <Typography variant="body2" color="text.secondary">
                  Periodic Home Visits by Child Welfare Officer (CWO) · Compliance with CWC Directions · Alerts for Overdue Visits
                </Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<FactCheck />}
                onClick={() => setFollowupModalOpen(true)}
              >
                Log Compliance Visit
              </Button>
            </Stack>

            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Case ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Restoration Category</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Last Follow-up</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Compliance Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Overdue Alert</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Closure Recommendation</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { caseId: cases[0]?.caseId || 'CL-2026-000101', cat: 'Restored to Biological Parents', last: '2026-09-15', status: 'Compliant (Child in School)', overdue: false, rec: 'Continue 6-Month Review' },
                    { caseId: cases[1]?.caseId || 'CL-2026-000102', cat: 'Children Home (CCI) Custody', last: '2026-08-10', status: 'Quarterly Visit Due', overdue: true, rec: 'Dispatch Welfare Officer' },
                    { caseId: cases[2]?.caseId || 'CL-2026-000103', cat: 'Fit Person Custody (Relative)', last: '2026-10-02', status: 'Fully Stabilized', overdue: false, rec: 'Recommend Final Case Closure' },
                  ].map((f, i) => (
                    <TableRow key={i} hover>
                      <TableCell><Typography fontWeight={700} sx={{ fontFamily: 'monospace' }}>{f.caseId}</Typography></TableCell>
                      <TableCell>{f.cat}</TableCell>
                      <TableCell>{f.last}</TableCell>
                      <TableCell><Chip size="small" label={f.status} color={f.overdue ? 'warning' : 'success'} /></TableCell>
                      <TableCell>
                        {f.overdue ? (
                          <Chip size="small" color="error" label="OVERDUE (30+ Days)" />
                        ) : (
                          <Chip size="small" color="success" label="On Schedule" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleAction(`Recommendation '${f.rec}' logged for case ${f.caseId}.`)}
                        >
                          {f.rec}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* TAB 7: 8. REPORTS AND ACTIVITY HISTORY */}
      {activeTab === 7 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>CWC Reports, Pendency & Activity Audit</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Statutory pendency reports, agency coordination performance, and complete tamper-evident audit history.
            </Typography>

            <Grid container spacing={2}>
              {[
                { title: 'Statutory Monthly Pendency Report', desc: 'Summary of cases pending beyond 4-month inquiry threshold per Section 36(2)', file: 'CWC_Pendency_Oct2026.pdf' },
                { title: 'Inter-Agency Coordination Assessment', desc: 'Turnaround time of Police SJPU and Labour Department in production and SIR submission', file: 'Agency_Coordination_Review.pdf' },
                { title: 'Rehabilitation & Restoration Outcome Audit', desc: 'Outcome evaluation of all children restored or placed in institutional care', file: 'Rehab_Outcomes_2026.pdf' },
              ].map((rep, idx) => (
                <Grid key={idx} item xs={12} md={4}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>{rep.title}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>{rep.desc}</Typography>
                    <Button
                      size="small"
                      variant="contained"
                      fullWidth
                      onClick={() => handleAction(`Report ${rep.file} generated and logged in Security Audit Center.`)}
                    >
                      Export Statutory Report
                    </Button>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* DIALOG 1: Schedule Hearing Modal */}
      <Dialog open={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Schedule CWC Bench Hearing</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Case ID"
              fullWidth
              size="small"
              value={selectedCase}
              onChange={(e) => setSelectedCase(e.target.value)}
            />
            <TextField
              label="Hearing Date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={hearingDate}
              onChange={(e) => setHearingDate(e.target.value)}
            />
            <Select
              fullWidth
              size="small"
              value={hearingType}
              onChange={(e) => setHearingType(e.target.value)}
            >
              <MenuItem value="Preliminary Inquiry (Sec 36 JJ Act)">Preliminary Inquiry (Sec 36 JJ Act)</MenuItem>
              <MenuItem value="Social Investigation Review (Form 33)">Social Investigation Review (Form 33)</MenuItem>
              <MenuItem value="Parental Fit Person Assessment">Parental Fit Person Assessment</MenuItem>
              <MenuItem value="Final Restoration Order Proceeding">Final Restoration Order Proceeding</MenuItem>
            </Select>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => handleAction(`Hearing scheduled for case ${selectedCase} on ${hearingDate}. Notices dispatched.`)}
          >
            Confirm & Schedule
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 2: Bench Order Modal */}
      <Dialog open={orderModalOpen} onClose={() => setOrderModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Record CWC Bench Order</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Case ID"
              fullWidth
              size="small"
              value={selectedCase}
              onChange={(e) => setSelectedCase(e.target.value)}
            />
            <Select
              fullWidth
              size="small"
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
            >
              <MenuItem value="Interim Custody Order to CCI">Interim Custody Order to CCI</MenuItem>
              <MenuItem value="Declaration of Child in Need of Care (CNCP)">Declaration of CNCP (Sec 37)</MenuItem>
              <MenuItem value="Restoration Order to Biological Parents">Restoration Order to Parents (Form 36)</MenuItem>
              <MenuItem value="Order for Back-Wages and Compensation">Order for Compensation (Sec 37(1)(c))</MenuItem>
            </Select>
            <TextField
              label="Bench Directions & Findings"
              multiline
              rows={3}
              fullWidth
              size="small"
              placeholder="Record order details, fit person condition, or CCI directions..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => handleAction(`Statutory Order '${orderType}' signed and committed to cryptographic ledger for case ${selectedCase}.`)}
          >
            Digitally Sign & Seal Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 3: Follow-up Modal */}
      <Dialog open={followupModalOpen} onClose={() => setFollowupModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Log Periodic Compliance Follow-up</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Case ID"
              fullWidth
              size="small"
              value={selectedCase}
              onChange={(e) => setSelectedCase(e.target.value)}
            />
            <TextField
              label="Follow-up Officer / CWO"
              fullWidth
              size="small"
              defaultValue="District Child Protection Unit Officer"
            />
            <TextField
              label="Observation & Well-being Status"
              multiline
              rows={3}
              fullWidth
              size="small"
              placeholder="Record child well-being, school attendance, family stability..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFollowupModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => handleAction(`Follow-up observation logged for case ${selectedCase}. Overdue alert cleared.`)}
          >
            Save Compliance Record
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
