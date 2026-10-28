import {
  Alert, Box, Button, Card, CardContent, Chip, Container, Divider, Grid, LinearProgress, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import Business from '@mui/icons-material/Business';
import FactCheck from '@mui/icons-material/FactCheck';
import Engineering from '@mui/icons-material/Engineering';
import AssignmentLate from '@mui/icons-material/AssignmentLate';
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

export default function LabourDashboard() {
  const statsQuery = useQuery({
    queryKey: ['labour-stats'],
    queryFn: async () => (await api.get<{ stats: DashboardStats }>('/cases/stats')).data.stats,
  });

  const casesQuery = useQuery({
    queryKey: ['labour-cases'],
    queryFn: async () => (await api.get<{ items: CaseRow[] }>('/cases?limit=50')).data.items,
  });

  const stats = statsQuery.data;
  const cases = casesQuery.data || [];

  // Labour Queues
  const pendingVerification = cases.filter((c) => ['REPORTED', 'AI_SCREENED', 'VERIFICATION_PENDING', 'UNDER_VERIFICATION'].includes(c.status));
  const verifiedViolations = cases.filter((c) => ['VERIFIED', 'PRIORITIZED', 'ASSIGNED', 'INTERVENTION_REQUIRED'].includes(c.status));
  const repeatEmployerCases = cases.filter((c) => c.repeatOffenceCheck?.isPotentialRepeat || c.employerName);

  return (
    <Container maxWidth="xl" sx={{ pt: 3, pb: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 3, p: 3, bgcolor: '#1e293b', color: '#fff', borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Business sx={{ color: '#38bdf8', fontSize: 44 }} />
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff', fontSize: '1.8rem' }}>
                DEPARTMENT OF LABOUR & EMPLOYMENT ENFORCEMENT
              </Typography>
              <Typography sx={{ color: '#94a3b8', fontSize: 14 }}>
                Child & Adolescent Labour (Prohibition & Regulation) Act Enforcement • Factory & Commercial Inspection Wing
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderLeft: '5px solid #d97706' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>PENDING VERIFICATION</Typography>
              <Typography variant="h3" sx={{ color: '#d97706', fontWeight: 800, my: 0.5 }}>
                {pendingVerification.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">Workplace inspections due</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderLeft: '5px solid #0284c7' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>VERIFIED VIOLATIONS</Typography>
              <Typography variant="h3" sx={{ color: '#0284c7', fontWeight: 800, my: 0.5 }}>
                {stats?.verifiedCases ?? verifiedViolations.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">CLPRA charges substantiated</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderLeft: '5px solid #ea580c' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>HIGH & CRITICAL RISK</Typography>
              <Typography variant="h3" sx={{ color: '#ea580c', fontWeight: 800, my: 0.5 }}>
                {(stats?.criticalCases ?? 0) + (stats?.highCases ?? 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">Hazardous sector violations</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderLeft: '5px solid #b91c1c' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>REPEAT EMPLOYER ALERTS</Typography>
              <Typography variant="h3" sx={{ color: '#b91c1c', fontWeight: 800, my: 0.5 }}>
                {stats?.repeatAlerts ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">Multiple complaint units</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderLeft: '5px solid #16a34a' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>ASSIGNED INSPECTIONS</Typography>
              <Typography variant="h3" sx={{ color: '#16a34a', fontWeight: 800, my: 0.5 }}>
                {stats?.assignedCases ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">Active field caseworkers</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Category Breakdown & Repeat Offence Register */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Engineering sx={{ color: colors.teal }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>Workplace Sector & Category Violations</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Distribution of child labour cases across commercial and industrial sectors:
              </Typography>
              {stats?.categoryStats && stats.categoryStats.length > 0 ? (
                <Grid container spacing={1.5}>
                  {stats.categoryStats.map((c, i) => (
                    <Grid item xs={12} sm={6} key={i}>
                      <Box sx={{ p: 1.5, border: `1px solid ${colors.line}`, borderRadius: 1, bgcolor: '#f8fafc' }}>
                        <Typography sx={{ fontWeight: 600 }}>{categoryLabel(c.category)}</Typography>
                        <Typography variant="caption" color="text.secondary">{c.count} verified complaints</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary">No category distribution data recorded yet.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <AssignmentLate sx={{ color: '#ea580c' }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>Employer Repeat Offence Register</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Establishments and business owners under review for recurring CLPRA non-compliance:
              </Typography>
              {repeatEmployerCases.length > 0 ? (
                <Stack spacing={1.5}>
                  {repeatEmployerCases.slice(0, 4).map((rc) => (
                    <Box key={rc.id} sx={{ p: 1.5, borderLeft: '4px solid #ea580c', bgcolor: '#fff7ed', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {rc.establishmentName || rc.location.villageOrCity}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Employer: {rc.employerName || 'Undisclosed'} • Case #{rc.caseId}
                      </Typography>
                      <Button component={RouterLink} to={`/cases/${rc.caseId}`} size="small" sx={{ display: 'block', p: 0, mt: 0.5, textTransform: 'none' }}>
                        Inspect Workplace Case File →
                      </Button>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Alert severity="success" sx={{ fontSize: 13 }}>No recurring employer violations currently reported.</Alert>
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
        title="Labour Department Case Tracking & Evidence Management"
      />

      {/* Labour Workplace Inspection Queue */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Labour Department Inspection & Verification Queue ({pendingVerification.length})
            </Typography>
            <Button size="small" onClick={() => casesQuery.refetch()}>Refresh</Button>
          </Stack>

          {casesQuery.isLoading && <LinearProgress />}
          {casesQuery.isError && <Alert severity="error">{errorMessage(casesQuery.error)}</Alert>}

          <TableContainer>
            <Table size="medium">
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Case ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Establishment / Workplace</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Employer Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Labour Categories</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Risk Level</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Inspection Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingVerification.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>{row.caseId}</Typography>
                      <Typography variant="caption" color="text.secondary">District: {row.location.district}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>{row.establishmentName || row.location.villageOrCity}</Typography>
                      <Typography variant="caption" color="text.secondary">{row.location.landmark || 'No landmark specified'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>{row.employerName || 'To be verified'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {row.labourCategories.map((cat) => (
                          <Chip key={cat} size="small" variant="outlined" label={categoryLabel(cat)} />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <RiskBadge emergency={row.emergencyIndicator} />
                      {row.riskAssessment && (
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                          Score: {row.riskAssessment.riskScore}
                        </Typography>
                      )}
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
                        startIcon={<FactCheck />}
                      >
                        Verify & Inspect
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
