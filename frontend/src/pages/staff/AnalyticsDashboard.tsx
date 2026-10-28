import {
  Alert, Box, Card, CardContent, Chip, Container, Grid, LinearProgress, Stack, Typography,
} from '@mui/material';
import BarChart from '@mui/icons-material/BarChart';
import TrendingUp from '@mui/icons-material/TrendingUp';
import PeopleAlt from '@mui/icons-material/PeopleAlt';
import VerifiedUser from '@mui/icons-material/VerifiedUser';
import Warning from '@mui/icons-material/Warning';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '../../api/client';
import { categoryLabel } from '../../constants';
import { colors } from '../../theme';

const RISK_COLORS: Record<string, string> = {
  LOW: '#16a34a', MEDIUM: '#d97706', HIGH: '#ea580c', CRITICAL: '#dc2626', UNKNOWN: '#64748b',
};

export default function AnalyticsDashboard() {
  const analyticsQuery = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: async () => (await api.get<{ cards: any; charts: any }>('/analytics/dashboard')).data,
    staleTime: 60000,
    refetchInterval: 120000,
  });

  const data = analyticsQuery.data;
  const cards = data?.cards;
  const charts = data?.charts;

  const cardDef = [
    { label: 'TOTAL REPORTS', key: 'totalReports', color: '#2563eb' },
    { label: 'PENDING VERIFY', key: 'pendingVerification', color: '#d97706' },
    { label: 'HIGH RISK', key: 'highRisk', color: '#ea580c' },
    { label: 'CRITICAL CASES', key: 'criticalCases', color: '#dc2626' },
    { label: 'CASES ASSIGNED', key: 'casesAssigned', color: '#0284c7' },
    { label: 'CASES RESCUED', key: 'casesRescued', color: '#16a34a' },
    { label: 'UNDER REHAB', key: 'underRehab', color: '#0d9488' },
    { label: 'SLA BREACHES', key: 'slaBreaches', color: '#7c3aed' },
    { label: 'REPEAT OFFENCES', key: 'repeatedOffences', color: '#b45309' },
    { label: 'CASES CLOSED', key: 'casesClosed', color: '#475569' },
  ];

  return (
    <Container maxWidth="xl" sx={{ pt: 3, pb: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 3, p: 3, bgcolor: '#1e3a8a', color: '#fff', borderRadius: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <BarChart sx={{ color: '#93c5fd', fontSize: 44 }} />
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff', fontSize: '1.8rem' }}>
              ANALYTICS DASHBOARD
            </Typography>
            <Typography sx={{ color: '#bfdbfe', fontSize: 14 }}>
              District-Level Intelligence · Case Flow Analysis · Rehabilitation Outcomes · Agency Workload
            </Typography>
          </Box>
        </Stack>
      </Box>

      {analyticsQuery.isLoading && <LinearProgress sx={{ mb: 2 }} />}
      {analyticsQuery.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(analyticsQuery.error)}</Alert>}

      {/* Top 10 Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {cardDef.map(({ label, key, color }) => (
          <Grid key={key} item xs={6} sm={4} md={2.4} lg={1.2}>
            <Card sx={{ borderLeft: `5px solid ${color}`, height: '100%' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, fontSize: 10 }}>{label}</Typography>
                <Typography variant="h3" sx={{ color, fontWeight: 900, my: 0.5, fontSize: '2rem' }}>
                  {cards?.[key] ?? '—'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Cases by District */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <PeopleAlt sx={{ color: colors.teal }} />
                <Typography variant="h4" fontWeight={700}>Cases by District</Typography>
              </Stack>
              {charts?.casesByDistrict?.length ? (
                <Stack spacing={1}>
                  {charts.casesByDistrict.slice(0, 10).map((d: any, i: number) => {
                    const max = charts.casesByDistrict[0].count || 1;
                    const pct = Math.round((d.count / max) * 100);
                    return (
                      <Box key={i}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" fontWeight={600}>{d.district}</Typography>
                          <Stack direction="row" spacing={1}>
                            <Chip size="small" label={`${d.count} cases`} />
                            {d.emergency > 0 && <Chip size="small" color="error" label={`${d.emergency} critical`} />}
                          </Stack>
                        </Stack>
                        <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3, mt: 0.5, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#2563eb' } }} />
                      </Box>
                    );
                  })}
                </Stack>
              ) : <Typography variant="body2" color="text.secondary">No district data available yet.</Typography>}
            </CardContent>
          </Card>
        </Grid>

        {/* Cases by Labour Type */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Warning sx={{ color: '#d97706' }} />
                <Typography variant="h4" fontWeight={700}>Cases by Labour Type</Typography>
              </Stack>
              {charts?.casesByLabourType?.length ? (
                <Stack spacing={1}>
                  {charts.casesByLabourType.slice(0, 10).map((c: any, i: number) => {
                    const max = charts.casesByLabourType[0].count || 1;
                    const pct = Math.round((c.count / max) * 100);
                    return (
                      <Box key={i}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">{categoryLabel(c.category)}</Typography>
                          <Typography variant="body2" fontWeight={700}>{c.count}</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3, mt: 0.5, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#d97706' } }} />
                      </Box>
                    );
                  })}
                </Stack>
              ) : <Typography variant="body2" color="text.secondary">No category data available yet.</Typography>}
            </CardContent>
          </Card>
        </Grid>

        {/* Cases by Risk */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>Cases by Risk Level</Typography>
              {charts?.casesByRisk?.length ? (
                <Stack spacing={1.5}>
                  {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((level) => {
                    const found = charts.casesByRisk.find((r: any) => r.risk === level);
                    const count = found?.count || 0;
                    return (
                      <Box key={level} sx={{ p: 1.5, borderRadius: 1, bgcolor: '#f8fafc', border: `2px solid ${RISK_COLORS[level]}20` }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: RISK_COLORS[level] }} />
                            <Typography fontWeight={700} sx={{ color: RISK_COLORS[level] }}>{level}</Typography>
                          </Stack>
                          <Typography variant="h4" fontWeight={800} sx={{ color: RISK_COLORS[level] }}>{count}</Typography>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              ) : <Typography variant="body2" color="text.secondary">No risk data yet.</Typography>}
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Trend */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <TrendingUp sx={{ color: colors.teal }} />
                <Typography variant="h4" fontWeight={700}>Monthly Trend</Typography>
              </Stack>
              {charts?.monthlyTrend?.length ? (
                <Stack spacing={1}>
                  {charts.monthlyTrend.slice(-6).map((m: any, i: number) => (
                    <Box key={i}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" fontWeight={600}>{m.month}</Typography>
                        <Stack direction="row" spacing={1}>
                          <Chip size="small" label={`${m.total} reports`} />
                          <Chip size="small" color="success" label={`${m.rescued} rescued`} />
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              ) : <Typography variant="body2" color="text.secondary">No trend data yet.</Typography>}
            </CardContent>
          </Card>
        </Grid>

        {/* SLA Performance */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>SLA Performance</Typography>
              {charts?.slaPerformance ? (
                <Stack spacing={2}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h2" sx={{ fontWeight: 900, color: '#16a34a' }}>
                      {charts.slaPerformance.onTimePercent}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Cases within SLA Target</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={charts.slaPerformance.onTimePercent}
                    sx={{ height: 10, borderRadius: 5, bgcolor: '#fecaca', '& .MuiLinearProgress-bar': { bgcolor: '#16a34a' } }}
                  />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Breached: <strong style={{ color: '#dc2626' }}>{charts.slaPerformance.breachedCount}</strong></Typography>
                    <Typography variant="body2" color="text.secondary">Total: <strong>{charts.slaPerformance.totalTracked}</strong></Typography>
                  </Stack>
                </Stack>
              ) : <Typography variant="body2" color="text.secondary">No SLA data yet.</Typography>}
            </CardContent>
          </Card>
        </Grid>

        {/* Agency Workload */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <VerifiedUser sx={{ color: '#2563eb' }} />
                <Typography variant="h4" fontWeight={700}>Agency Workload</Typography>
              </Stack>
              {charts?.agencyWorkload?.length ? (
                <Stack spacing={1.5}>
                  {charts.agencyWorkload.map((a: any, i: number) => (
                    <Box key={i} sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1, border: `1px solid ${colors.line}` }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography fontWeight={700}>{a.agency}</Typography>
                        <Stack direction="row" spacing={1}>
                          <Chip size="small" label={`${a.activeCases} active`} color="primary" variant="outlined" />
                          <Chip size="small" label={`${a.avgResponseHours}h avg`} variant="outlined" />
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              ) : <Typography variant="body2" color="text.secondary">No workload data.</Typography>}
            </CardContent>
          </Card>
        </Grid>

        {/* Rehabilitation Outcomes */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>Rehabilitation Outcomes</Typography>
              {charts?.rehabilitationOutcomes ? (
                <Grid container spacing={1.5}>
                  {[
                    { label: 'Family Reintegration', value: charts.rehabilitationOutcomes.reintegratedWithFamily, color: '#16a34a' },
                    { label: 'Education Enrollment', value: charts.rehabilitationOutcomes.educationalEnrollment, color: '#0284c7' },
                    { label: 'Shelter Care Ongoing', value: charts.rehabilitationOutcomes.shelterCareOngoing, color: '#d97706' },
                    { label: 'Vocational Training', value: charts.rehabilitationOutcomes.vocationalTraining, color: '#7c3aed' },
                  ].map((o) => (
                    <Grid key={o.label} item xs={6}>
                      <Box sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 1, border: `2px solid ${o.color}30` }}>
                        <Typography variant="h3" sx={{ color: o.color, fontWeight: 800 }}>{o.value}</Typography>
                        <Typography variant="caption" color="text.secondary">{o.label}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              ) : <Typography variant="body2" color="text.secondary">No rehabilitation data yet.</Typography>}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
