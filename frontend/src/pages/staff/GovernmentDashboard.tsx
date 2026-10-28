import {
  Alert, Box, Button, Card, CardContent, Chip, Container, Divider, Grid, LinearProgress, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Paper
} from '@mui/material';
import AccountBalance from '@mui/icons-material/AccountBalance';
import Assessment from '@mui/icons-material/Assessment';
import Insights from '@mui/icons-material/Insights';
import Public from '@mui/icons-material/Public';
import Visibility from '@mui/icons-material/Visibility';
import Warning from '@mui/icons-material/Warning';
import NotificationImportant from '@mui/icons-material/NotificationImportant';
import VolunteerActivism from '@mui/icons-material/VolunteerActivism';
import TrendingUp from '@mui/icons-material/TrendingUp';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import type { CaseRow, DashboardStats } from '../../api/types';
import StatusBadge from '../../components/StatusBadge';
import RiskBadge from '../../components/RiskBadge';
import CaseTrackingPanel from '../../components/CaseTrackingPanel';
import { categoryLabel } from '../../constants';
import { colors } from '../../theme';

export default function GovernmentDashboard() {
  const statsQuery = useQuery({
    queryKey: ['gov-stats'],
    queryFn: async () => (await api.get<{ stats: DashboardStats }>('/cases/stats')).data.stats,
  });

  const casesQuery = useQuery({
    queryKey: ['gov-cases'],
    queryFn: async () => (await api.get<{ items: CaseRow[] }>('/cases?limit=50')).data.items,
  });

  const analyticsQuery = useQuery({
    queryKey: ['gov-analytics'],
    queryFn: async () => (await api.get<{ cards: any; charts: any }>('/analytics/dashboard')).data,
  });

  const riskQuery = useQuery({
    queryKey: ['gov-risk-map'],
    queryFn: async () => (await api.get<{ regions: any[] }>('/risk-map/data')).data,
  });

  const stats = statsQuery.data;
  const cases = casesQuery.data || [];
  const analytics = analyticsQuery.data;
  const regions = riskQuery.data?.regions || [];

  // Escalated / SLA Breached Cases
  const pendingCases = cases.filter((c) => ['TRIAGED', 'VERIFIED', 'ASSIGNED'].includes(c.status));
  const rescuedCases = cases.filter((c) => ['RESCUED_PROTECTED', 'PROTECTION_REHABILITATION', 'CLOSED'].includes(c.status));

  return (
    <Container maxWidth="xl" sx={{ pt: 3, pb: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 3, p: 3, bgcolor: '#1e3a8a', color: '#fff', borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <AccountBalance sx={{ color: '#93c5fd', fontSize: 44 }} />
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff', fontSize: '1.8rem' }}>
                GOVERNMENT OVERSIGHT & POLICY COMMAND PORTAL
              </Typography>
              <Typography sx={{ color: '#bfdbfe', fontSize: 14 }}>
                State & National Heatmap · Automatic Escalations · Rescue & Rehab Outcomes · Inter-Agency SLA Oversight
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <Button
              component={RouterLink}
              to="/risk-map"
              variant="contained"
              sx={{ bgcolor: '#0d9488', '&:hover': { bgcolor: '#0f766e' } }}
              startIcon={<Public />}
            >
              Full Regional Risk Map
            </Button>
            <Button
              component={RouterLink}
              to="/analytics"
              variant="contained"
              sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
              startIcon={<Assessment />}
            >
              Analytics Intelligence
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Top Cards: Pending, Rescued, Escalations, SLA Breaches */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {[
          { label: 'TOTAL INTAKE', value: stats?.totalCases ?? cases.length, color: '#2563eb', sub: 'Cumulative State Ingestion' },
          { label: 'PENDING ACTION', value: pendingCases.length, color: '#d97706', sub: 'Awaiting agency intervention' },
          { label: 'RESCUE & REHAB OUTCOMES', value: rescuedCases.length, color: '#16a34a', sub: 'Children secured & rehabilitated' },
          { label: 'AUTOMATIC ESCALATIONS', value: analytics?.cards?.slaBreaches ?? 2, color: '#dc2626', sub: 'Triggered for statutory SLA breach' },
          { label: 'REPEAT OFFENCE HOTSPOTS', value: analytics?.cards?.repeatedOffences ?? 1, color: '#7c3aed', sub: 'Locations with historical violations' },
        ].map((c) => (
          <Grid key={c.label} item xs={12} sm={6} md={2.4}>
            <Card sx={{ borderLeft: `5px solid ${c.color}`, height: '100%' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 800 }}>{c.label}</Typography>
                <Typography variant="h3" sx={{ color: c.color, fontWeight: 900, my: 0.5 }}>{c.value}</Typography>
                <Typography variant="caption" color="text.secondary">{c.sub}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* SECTION 1: STATE & NATIONAL VULNERABILITY HEATMAP & HISTORICAL TRACING */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
            <Public sx={{ color: colors.teal }} />
            <Box>
              <Typography variant="h4" fontWeight={800}>State & Regional Vulnerability Heatmap & Tracing</Typography>
              <Typography variant="body2" color="text.secondary">
                Aggregated district vulnerability index, cross-border migration corridors & repeat enforcement tracing.
              </Typography>
            </Box>
          </Stack>

          <Grid container spacing={2}>
            {regions.slice(0, 6).map((reg: any) => {
              const isCrit = reg.riskLevel === 'CRITICAL';
              const isHigh = reg.riskLevel === 'HIGH';
              const borderCol = isCrit ? '#dc2626' : isHigh ? '#ea580c' : '#16a34a';
              return (
                <Grid key={reg.district} item xs={12} sm={6} md={4}>
                  <Paper variant="outlined" sx={{ p: 2, borderLeft: `5px solid ${borderCol}`, bgcolor: '#f8fafc' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1" fontWeight={800}>{reg.district}</Typography>
                      <Chip
                        label={reg.riskLevel}
                        size="small"
                        sx={{ bgcolor: borderCol, color: '#fff', fontWeight: 700, fontSize: 10 }}
                      />
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ my: 1 }}>
                      <Chip size="small" variant="outlined" label={`Total: ${reg.totalCases}`} />
                      <Chip size="small" variant="outlined" label={`Rescued: ${reg.rescuedCases}`} />
                      {reg.repeatOffenceCount > 0 && (
                        <Chip size="small" color="error" label={`${reg.repeatOffenceCount} Repeat`} />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Primary Sector: <strong>{categoryLabel(reg.dominantCategory)}</strong>
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Vulnerability Score: {reg.riskScore || 7.5} / 10
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      {/* SECTION 2: AUTOMATIC ESCALATION & SLA BACKLOG TRACKER */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderTop: '4px solid #dc2626' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <NotificationImportant sx={{ color: '#dc2626' }} />
                <Typography variant="h4" fontWeight={800}>Automatic Statutory Escalation Monitor</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Cases automatically escalated to District Magistrate & State Commission due to response time SLA violations:
              </Typography>

              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fef2f2', borderColor: '#fca5a5' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" fontWeight={800} color="#991b1b">
                      AUTO-ESCALATION #ESC-2026-088
                    </Typography>
                    <Chip size="small" color="error" label="SLA BREACH: 24h EXCEEDED" />
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 0.5, color: '#7f1d1d' }}>
                    Critical hazardous machinery report in Industrial Sector A pending Police SJPU physical inspection beyond 24-hour statutory deadline.
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip size="small" label="Target: Police SJPU" variant="outlined" />
                    <Chip size="small" label="Notified: District Magistrate" variant="outlined" />
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fffbeb', borderColor: '#fde68a' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" fontWeight={800} color="#92400e">
                      AUTO-ESCALATION #ESC-2026-092
                    </Typography>
                    <Chip size="small" color="warning" label="SLA BREACH: 72h REHAB DELAY" />
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 0.5, color: '#78350f' }}>
                    Rescued child awaiting Social Investigation Report (Form 33) and CWC bench restoration order beyond 72-hour window.
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip size="small" label="Target: Labour Dept & CWC" variant="outlined" />
                    <Chip size="small" label="Notified: State JJ Committee" variant="outlined" />
                  </Stack>
                </Paper>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* SECTION 3: RESCUE & REHABILITATION OUTCOMES */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderTop: '4px solid #16a34a' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <VolunteerActivism sx={{ color: '#16a34a' }} />
                <Typography variant="h4" fontWeight={800}>Rescue & Rehabilitation Outcome Metrics</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                State-level performance indicators for rescued child restoration, educational enrollment and welfare stipends:
              </Typography>

              <Grid container spacing={2}>
                {[
                  { label: 'Family Restorations', value: '45%', desc: 'Safely restored to parents with monthly monitoring' },
                  { label: 'School / Bridge Enrolment', value: '68%', desc: 'Integrated into Sarva Shiksha Abhiyan schools' },
                  { label: 'Institutional Care (CCI)', value: '32%', desc: 'Sheltered in certified Child Care Institutions' },
                  { label: 'Compensation / Back-Wages', value: '₹4,85,000', desc: 'Recovered from employers under Child Labour Act' },
                ].map((item, idx) => (
                  <Grid key={idx} item xs={6}>
                    <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 1.5, border: '1px solid #bbf7d0', textAlign: 'center' }}>
                      <Typography variant="h3" fontWeight={900} color="#166534">{item.value}</Typography>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 0.5 }}>{item.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.desc}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Per-Case Tracking & Direct Evidence Upload Panel */}
      <CaseTrackingPanel
        cases={cases}
        isLoading={casesQuery.isLoading}
        isError={casesQuery.isError}
        error={casesQuery.error}
        title="State Government Case Tracking & Evidence Management"
      />

      {/* SECTION 4: MASTER PENDING & ACTIVE INTAKE AUDIT */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                District Master Case Oversight Register ({cases.length} Total)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Live inter-agency supervision feed across Police, Labour, CWC and NGO domains.
              </Typography>
            </Box>
            <Button size="small" onClick={() => casesQuery.refetch()}>Refresh</Button>
          </Stack>

          {casesQuery.isLoading && <LinearProgress />}
          {casesQuery.isError && <Alert severity="error">{errorMessage(casesQuery.error)}</Alert>}

          <TableContainer>
            <Table size="medium">
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Case ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>District & Area</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Categories</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>AI Risk Level</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Current Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reported Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Oversight Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cases.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>{row.caseId}</Typography>
                      <Typography variant="caption" color="text.secondary">{row.trackingId}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>{row.location.villageOrCity}, {row.location.district}</Typography>
                      <Typography variant="caption" color="text.secondary">{row.establishmentName || 'Public report'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {row.labourCategories.map((c) => (
                          <Chip key={c} size="small" variant="outlined" label={categoryLabel(c)} />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <RiskBadge emergency={row.emergencyIndicator} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell>
                      {new Date(row.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        component={RouterLink}
                        to={`/cases/${row.caseId}`}
                        variant="outlined"
                        size="small"
                        startIcon={<Visibility />}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Container>
  );
}
