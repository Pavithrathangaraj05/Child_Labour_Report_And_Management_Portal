import {
  Alert, Box, Card, CardContent, Container, Grid, LinearProgress, Stack, Typography, Chip
} from '@mui/material';
import Public from '@mui/icons-material/Public';
import VerifiedUser from '@mui/icons-material/VerifiedUser';
import VolunteerActivism from '@mui/icons-material/VolunteerActivism';
import Shield from '@mui/icons-material/Shield';
import LocationCity from '@mui/icons-material/LocationCity';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { colors } from '../theme';

export default function PublicTransparencyPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['public-transparency'],
    queryFn: async () => (await api.get('/transparency/stats')).data,
    staleTime: 60000,
  });

  const metrics = data?.transparencyMetrics;
  const districtTrends = data?.districtTrends ?? [];

  return (
    <Container maxWidth="xl" sx={{ pt: 4, pb: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 4, p: 3.5, bgcolor: '#0f172a', color: '#fff', borderRadius: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Public sx={{ color: '#38bdf8', fontSize: 48 }} />
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff', fontSize: '1.9rem' }}>
              PUBLIC TRANSPARENCY & IMPACT MONITOR
            </Typography>
            <Typography sx={{ color: '#94a3b8', fontSize: 14 }}>
              Statutory Open Governance · Aggregated Anti-Child-Labour Enforcement Metrics
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Mandatory Statutory Privacy Notice */}
      <Alert severity="info" sx={{ mb: 4, bgcolor: '#f0f9ff', border: '1px solid #bae6fd' }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#0369a1' }}>
          Statutory Privacy Safeguard (Section 74 Juvenile Justice Act & DPDP Act):
        </Typography>
        <Typography variant="caption" sx={{ color: '#334155' }}>
          To protect minor children, individual case identities, exact GPS locations, shelter details, and confidential investigation notes are strictly sealed and excluded from this public transparency disclosure. All figures represent district-level aggregations.
        </Typography>
      </Alert>

      {isLoading && <LinearProgress sx={{ mb: 4 }} />}

      {/* Impact Metric Cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {[
          { label: 'REPORTS RECEIVED', value: metrics?.reportsReceived ?? 0, icon: <Shield sx={{ color: '#2563eb' }} />, color: '#2563eb', desc: 'Citizen & whistle-blower reports registered' },
          { label: 'CASES VERIFIED', value: metrics?.casesVerified ?? 0, icon: <VerifiedUser sx={{ color: '#d97706' }} />, color: '#d97706', desc: 'Independently vetted by enforcement agencies' },
          { label: 'CHILDREN RESCUED', value: metrics?.casesRescued ?? 0, icon: <VolunteerActivism sx={{ color: '#16a34a' }} />, color: '#16a34a', desc: 'Secured via joint multi-agency interventions' },
          { label: 'REHABILITATION ONGOING', value: metrics?.rehabilitationProgress ?? 0, icon: <Public sx={{ color: '#0d9488' }} />, color: '#0d9488', desc: 'Education, family reunion & care plans underway' },
        ].map((card) => (
          <Grid key={card.label} item xs={12} sm={6} md={3}>
            <Card sx={{ borderLeft: `6px solid ${card.color}`, height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b' }}>{card.label}</Typography>
                  {card.icon}
                </Stack>
                <Typography variant="h2" sx={{ color: card.color, fontWeight: 900, my: 1, fontSize: '2.5rem' }}>
                  {card.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">{card.desc}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* District-level Trends */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <LocationCity sx={{ color: colors.teal }} />
            <Typography variant="h4" fontWeight={800}>District-Level Aggregate Trends</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Overview of enforcement volume and rescue operations across regional jurisdictions.
          </Typography>

          {districtTrends.length > 0 ? (
            <Stack spacing={2}>
              {districtTrends.map((d: any, idx: number) => {
                const max = Math.max(...districtTrends.map((t: any) => t.reportsCount), 1);
                const pct = Math.round((d.reportsCount / max) * 100);
                return (
                  <Box key={idx} sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight={700}>{d.district}</Typography>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Chip size="small" label={`${d.reportsCount} Reports`} sx={{ bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 700 }} />
                        <Chip size="small" label={`${d.rescuedCount} Rescued`} sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 700 }} />
                      </Stack>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{ height: 6, borderRadius: 3, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#3b82f6' } }}
                    />
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">Loading district aggregates…</Typography>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
