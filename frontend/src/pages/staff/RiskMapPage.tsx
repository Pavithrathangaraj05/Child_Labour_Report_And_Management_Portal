import {
  Alert, Box, Button, Card, CardContent, Chip, Container, FormControl,
  Grid, InputLabel, LinearProgress, MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import FilterList from '@mui/icons-material/FilterList';
import Warning from '@mui/icons-material/Warning';
import Dangerous from '@mui/icons-material/Dangerous';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ReportProblem from '@mui/icons-material/ReportProblem';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../api/client';
import type { RegionRiskData } from '../../api/types';
import { categoryLabel } from '../../constants';
import { colors } from '../../theme';

const RISK_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  LOW: { color: '#16a34a', bg: '#f0fdf4', border: '#86efac', icon: <CheckCircle fontSize="small" sx={{ color: '#16a34a' }} /> },
  MODERATE: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: <Warning fontSize="small" sx={{ color: '#d97706' }} /> },
  HIGH: { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', icon: <ReportProblem fontSize="small" sx={{ color: '#ea580c' }} /> },
  CRITICAL: { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', icon: <Dangerous fontSize="small" sx={{ color: '#dc2626' }} /> },
};

const CATEGORIES = [
  'domestic_servitude', 'street_vending', 'manufacturing_factory',
  'agriculture_farming', 'hazardous_labour', 'sexual_exploitation', 'other',
];

export default function RiskMapPage() {
  const [filters, setFilters] = useState({ district: '', category: '', riskLevel: '' });
  const [activeFilters, setActiveFilters] = useState(filters);

  const riskQuery = useQuery({
    queryKey: ['risk-map', activeFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(activeFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
      return (await api.get<{ regions: RegionRiskData[] }>(`/risk-map/data?${params.toString()}`)).data;
    },
    staleTime: 30000,
  });

  const regions = riskQuery.data?.regions ?? [];
  const riskLevelCounts = (['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map((level) => ({
    level, count: regions.filter((r) => (r.riskLevel || r.regionalRisk) === level).length,
  }));

  return (
    <Container maxWidth="xl" sx={{ pt: 3, pb: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 3, p: 3, bgcolor: '#064e3b', color: '#fff', borderRadius: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <MapIcon sx={{ color: '#6ee7b7', fontSize: 44 }} />
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff', fontSize: '1.8rem' }}>
              REGIONAL RISK MAP
            </Typography>
            <Typography sx={{ color: '#a7f3d0', fontSize: 14 }}>
              Aggregated District-Level Risk Intelligence · No Individual Locations Exposed
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Privacy Notice */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Privacy Safeguard:</strong> This map displays aggregated district-level statistics only.
        No individual child locations, shelter addresses, or personal identifiers are shown at any risk level.
      </Alert>

      {/* Summary Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {riskLevelCounts.map(({ level, count }) => {
          const cfg = RISK_CONFIG[level];
          return (
            <Grid key={level} item xs={6} sm={3}>
              <Card sx={{ border: `2px solid ${cfg.border}`, bgcolor: cfg.bg }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    {cfg.icon}
                    <Typography fontWeight={800} sx={{ color: cfg.color }}>{level}</Typography>
                  </Stack>
                  <Typography variant="h3" sx={{ color: cfg.color, fontWeight: 900 }}>{count}</Typography>
                  <Typography variant="caption" color="text.secondary">districts</Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Filter Panel */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <FilterList sx={{ color: colors.teal }} />
            <Typography variant="subtitle2" fontWeight={700}>Filter Risk Map</Typography>
          </Stack>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4} md={3}>
              <TextField size="small" fullWidth label="District" value={filters.district} onChange={(e) => setFilters({ ...filters, district: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Labour Category</InputLabel>
                <Select value={filters.category} label="Labour Category" onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
                  <MenuItem value="">All Categories</MenuItem>
                  {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{categoryLabel(c)}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Risk Level</InputLabel>
                <Select value={filters.riskLevel} label="Risk Level" onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}>
                  <MenuItem value="">All Levels</MenuItem>
                  <MenuItem value="CRITICAL">Critical</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="MODERATE">Moderate</MenuItem>
                  <MenuItem value="LOW">Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" size="small" onClick={() => setActiveFilters({ ...filters })}>Apply</Button>
                <Button variant="outlined" size="small" onClick={() => {
                  const e = { district: '', category: '', riskLevel: '' };
                  setFilters(e); setActiveFilters(e);
                }}>Clear</Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Heatmap Grid */}
      {riskQuery.isLoading && <LinearProgress sx={{ mb: 2 }} />}
      {riskQuery.isError && <Alert severity="error">Failed to load risk map data.</Alert>}

      {/* Legend */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        {Object.entries(RISK_CONFIG).map(([level, cfg]) => (
          <Stack key={level} direction="row" spacing={0.5} alignItems="center">
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: cfg.color }} />
            <Typography variant="caption" sx={{ color: cfg.color, fontWeight: 700 }}>{level}</Typography>
          </Stack>
        ))}
        <Typography variant="caption" color="text.secondary">— Aggregated district-level indicators only</Typography>
      </Stack>

      <Grid container spacing={2}>
        {regions.map((region) => {
          const riskLevel = region.riskLevel || region.regionalRisk || 'LOW';
          const cfg = RISK_CONFIG[riskLevel] ?? RISK_CONFIG.LOW;
          const dominant = region.dominantCategory || region.topCategories?.[0]?.category;
          const active = region.activeCases ?? Math.max(0, region.totalCases - region.verifiedCases);
          const rescued = region.rescuedCases ?? region.verifiedCases;
          const repeats = region.repeatOffenceCount ?? region.repeatOffences ?? 0;

          return (
            <Grid key={region.district} item xs={12} sm={6} md={4} lg={3}>
              <Card sx={{ border: `2px solid ${cfg.border}`, bgcolor: cfg.bg, height: '100%' }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={800}>{region.district}</Typography>
                    <Chip
                      label={riskLevel}
                      size="small"
                      sx={{ bgcolor: cfg.color, color: '#fff', fontWeight: 700, fontSize: 10 }}
                      aria-label={`Risk level: ${riskLevel}`}
                    />
                  </Stack>
                  <Grid container spacing={1} sx={{ mb: 1 }}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Total Cases</Typography>
                      <Typography variant="h4" fontWeight={800} sx={{ color: cfg.color }}>{region.totalCases}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Active</Typography>
                      <Typography variant="h4" fontWeight={800}>{active}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Rescued</Typography>
                      <Typography variant="h4" fontWeight={700} sx={{ color: '#16a34a' }}>{rescued}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Repeat Offences</Typography>
                      <Typography variant="h4" fontWeight={700} sx={{ color: repeats > 0 ? '#dc2626' : '#64748b' }}>
                        {repeats}
                      </Typography>
                    </Grid>
                  </Grid>
                  {dominant && (
                    <Chip
                      size="small"
                      label={`Primary: ${categoryLabel(dominant)}`}
                      variant="outlined"
                      sx={{ fontSize: 10, mt: 0.5 }}
                    />
                  )}
                  {region.riskScore !== undefined && (
                    <Box sx={{ mt: 1 }}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">Risk Score</Typography>
                        <Typography variant="caption" fontWeight={700} sx={{ color: cfg.color }}>{region.riskScore}/10</Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={(region.riskScore / 10) * 100}
                        sx={{ height: 4, borderRadius: 2, mt: 0.5, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: cfg.color } }}
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        {regions.length === 0 && !riskQuery.isLoading && (
          <Grid item xs={12}>
            <Card sx={{ p: 4, textAlign: 'center' }}>
              <MapIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
              <Typography color="text.secondary">No district data found for the selected filters.</Typography>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}
