import {
  Alert, Box, Button, Card, CardContent, Chip, Container, Divider, Grid, LinearProgress, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import LocalPolice from '@mui/icons-material/LocalPolice';
import WarningAmber from '@mui/icons-material/WarningAmber';
import ReportProblem from '@mui/icons-material/ReportProblem';
import Shield from '@mui/icons-material/Shield';
import LocationCity from '@mui/icons-material/LocationCity';
import Visibility from '@mui/icons-material/Visibility';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import type { CaseRow, DashboardStats } from '../../api/types';
import StatusBadge from '../../components/StatusBadge';
import RiskBadge from '../../components/RiskBadge';
import CaseTrackingPanel from '../../components/CaseTrackingPanel';
import { categoryLabel } from '../../constants';
import { colors } from '../../theme';

export default function PoliceDashboard() {
  const statsQuery = useQuery({
    queryKey: ['police-stats'],
    queryFn: async () => (await api.get<{ stats: DashboardStats }>('/cases/stats')).data.stats,
  });

  const casesQuery = useQuery({
    queryKey: ['police-cases'],
    queryFn: async () => (await api.get<{ items: CaseRow[] }>('/cases?limit=50')).data.items,
  });

  const stats = statsQuery.data;
  const cases = casesQuery.data || [];

  // Filter queues
  const emergencyCases = cases.filter((c) => c.emergencyIndicator || c.riskAssessment?.riskLevel === 'CRITICAL');
  const repeatCases = cases.filter((c) => c.repeatOffenceCheck?.isPotentialRepeat);
  const activePoliceQueue = cases.filter((c) => ['REPORTED', 'AI_SCREENED', 'PRIORITIZED', 'ASSIGNED', 'INTERVENTION_REQUIRED'].includes(c.status));

  return (
    <Container maxWidth="xl" sx={{ pt: 3, pb: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 3, p: 3, bgcolor: '#0f172a', color: '#fff', borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <LocalPolice sx={{ color: '#38bdf8', fontSize: 44 }} />
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff', fontSize: '1.8rem' }}>
                POLICE RAPID FIRST-RESPONDER COMMAND
              </Typography>
              <Typography sx={{ color: '#94a3b8', fontSize: 14 }}>
                Special Juvenile Police Unit (SJPU) • Emergency Rescue & Trafficking Investigation Desk
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <Button component={RouterLink} to="/report" variant="contained" color="error" startIcon={<ReportProblem />}>
              Log First-Responder Alert
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Emergency Alert Banner if emergencies exist */}
      {emergencyCases.length > 0 && (
        <Alert severity="error" icon={<ReportProblem fontSize="large" />} sx={{ mb: 3, fontWeight: 600, fontSize: '1.05rem', bgcolor: '#fef2f2', border: '1px solid #f87171' }}>
          🚨 ACTIVE CRITICAL SAFETY ALERT: {emergencyCases.length} emergency incident(s) require immediate law enforcement dispatch and rescue squad mobilization.
        </Alert>
      )}

      {/* Real Statistics Grid */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderLeft: '5px solid #dc2626' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>EMERGENCY CASES</Typography>
              <Typography variant="h3" sx={{ color: '#dc2626', fontWeight: 800, my: 0.5 }}>
                {stats?.emergencyCases ?? emergencyCases.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">Immediate physical threat</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderLeft: '5px solid #ea580c' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>CRITICAL RISK CASES</Typography>
              <Typography variant="h3" sx={{ color: '#ea580c', fontWeight: 800, my: 0.5 }}>
                {stats?.criticalCases ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">AI Score 75–100</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderLeft: '5px solid #d97706' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>REPEAT-OFFENCE ALERTS</Typography>
              <Typography variant="h3" sx={{ color: '#d97706', fontWeight: 800, my: 0.5 }}>
                {stats?.repeatAlerts ?? repeatCases.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">Recurring violator places</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderLeft: '5px solid #0284c7' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>ACTIVE RESCUE QUEUE</Typography>
              <Typography variant="h3" sx={{ color: '#0284c7', fontWeight: 800, my: 0.5 }}>
                {stats?.interventionCases ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">Intervention required</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderLeft: '5px solid #16a34a' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>RESCUED & SECURED</Typography>
              <Typography variant="h3" sx={{ color: '#16a34a', fontWeight: 800, my: 0.5 }}>
                {stats?.rescuedCases ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">Transferred to CWC custody</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Vulnerability Hotspots & Geography Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <LocationCity sx={{ color: colors.teal }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>Vulnerability Hotspots & High-Risk Areas</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Real-time geographic frequency analysis identifying areas with recurring complaints and emergency distress calls:
              </Typography>
              {stats?.districtHotspots && stats.districtHotspots.length > 0 ? (
                <Stack spacing={1.5}>
                  {stats.districtHotspots.map((h, i) => (
                    <Box key={i} sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: `1px solid ${colors.line}` }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography sx={{ fontWeight: 600 }}>{h.name}</Typography>
                        <Stack direction="row" spacing={1}>
                          <Chip size="small" label={`${h.count} total cases`} />
                          {h.emergency > 0 && <Chip size="small" color="error" label={`${h.emergency} emergency alerts`} />}
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">No hotspot data available yet.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <WarningAmber sx={{ color: '#d97706' }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>Repeat Offence Monitoring</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Establishments and employers with recurring complaints flagged by structured AI matchers:
              </Typography>
              {repeatCases.length > 0 ? (
                <Stack spacing={1.5}>
                  {repeatCases.map((rc) => (
                    <Box key={rc.id} sx={{ p: 1.5, borderLeft: '4px solid #d97706', bgcolor: '#fffbeb', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {rc.establishmentName || rc.location.landmark || 'Establishment near ' + rc.location.villageOrCity}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Case #{rc.caseId} • {rc.repeatOffenceCheck?.matches.length} prior complaint link(s)
                      </Typography>
                      <Button component={RouterLink} to={`/cases/${rc.caseId}`} size="small" sx={{ display: 'block', p: 0, mt: 0.5, textTransform: 'none' }}>
                        Review Repeat Offence Record →
                      </Button>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Alert severity="success" sx={{ fontSize: 13 }}>No active repeat offence anomalies currently pending review.</Alert>
              )}
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
        title="Police Case Tracking & Evidence Management"
      />

      {/* Police Rapid Action Queue */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Active Police Emergency & Investigation Queue ({activePoliceQueue.length})
            </Typography>
            <Button size="small" onClick={() => casesQuery.refetch()}>Refresh Queue</Button>
          </Stack>

          {casesQuery.isLoading && <LinearProgress />}
          {casesQuery.isError && <Alert severity="error">{errorMessage(casesQuery.error)}</Alert>}

          <TableContainer>
            <Table size="medium">
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Case ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Location & Place</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>AI Risk Assessment</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Workplace / Category</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>State Machine Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Enforcement Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activePoliceQueue.map((row) => (
                  <TableRow key={row.id} hover sx={{ bgcolor: row.emergencyIndicator ? '#fef2f2' : undefined }}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>{row.caseId}</Typography>
                      <Typography variant="caption" color="text.secondary">Ref: {row.trackingId}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>{row.location.villageOrCity}, {row.location.district}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.establishmentName || row.location.landmark || 'No establishment recorded'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <RiskBadge emergency={row.emergencyIndicator} />
                        {row.riskAssessment && (
                          <Chip
                            size="small"
                            label={`${row.riskAssessment.riskScore}/100 (${row.riskAssessment.riskLevel})`}
                            sx={{ fontWeight: 700 }}
                          />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {row.labourCategories.map((cat) => (
                          <Chip key={cat} size="small" variant="outlined" label={categoryLabel(cat)} />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        component={RouterLink}
                        to={`/cases/${row.caseId}`}
                        variant="contained"
                        size="small"
                        startIcon={<Visibility />}
                      >
                        Open Case File
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
