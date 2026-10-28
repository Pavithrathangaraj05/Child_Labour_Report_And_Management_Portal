import {
  Alert, Box, Button, Card, CardContent, Chip, Container, Divider, FormControl,
  Grid, InputLabel, LinearProgress, MenuItem, Select, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import Warning from '@mui/icons-material/Warning';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import Info from '@mui/icons-material/Info';
import FilterList from '@mui/icons-material/FilterList';
import Refresh from '@mui/icons-material/Refresh';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../api/client';
import type { SecurityLogItem } from '../../api/types';
import { colors } from '../../theme';

const SEVERITY_COLORS: Record<string, string> = {
  INFO: '#0284c7',
  WARNING: '#d97706',
  CRITICAL: '#dc2626',
};

const SEVERITY_ICONS: Record<string, React.ReactNode> = {
  INFO: <Info fontSize="small" sx={{ color: '#0284c7' }} />,
  WARNING: <Warning fontSize="small" sx={{ color: '#d97706' }} />,
  CRITICAL: <ErrorOutline fontSize="small" sx={{ color: '#dc2626' }} />,
};

const EVENT_TYPES = [
  'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'CASE_STATUS_CHANGED', 'ABAC_ACCESS_GRANTED',
  'ABAC_ACCESS_DENIED', 'AUDIT_INTEGRITY_VERIFICATION', 'MFA_STEP_UP_REQUESTED',
  'MFA_STEP_UP_VERIFIED', 'MFA_STEP_UP_FAILED', 'REPORT_EXPORTED',
  'TAMPER_SIMULATION_EXECUTED', 'SUSPICIOUS_ACCESS',
];

export default function SecurityCenterPage() {
  const [filters, setFilters] = useState({
    eventType: '', severity: '', userId: '', agencyId: '',
    startDate: '', endDate: '',
  });
  const [activeFilters, setActiveFilters] = useState(filters);

  const logsQuery = useQuery({
    queryKey: ['security-logs', activeFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(activeFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
      return (await api.get<{ total: number; items: SecurityLogItem[]; stats: any }>(
        `/security/logs?${params.toString()}`
      )).data;
    },
    staleTime: 10000,
  });

  const data = logsQuery.data;

  return (
    <Container maxWidth="xl" sx={{ pt: 3, pb: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 3, p: 3, bgcolor: '#1e1b4b', color: '#fff', borderRadius: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <SecurityIcon sx={{ color: '#a5b4fc', fontSize: 44 }} />
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff', fontSize: '1.8rem' }}>
              SECURITY CENTER
            </Typography>
            <Typography sx={{ color: '#c7d2fe', fontSize: 14 }}>
              Centralised Event Monitoring · Authentication Audit · Access Control Log · Integrity Verification
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Stat Cards */}
      {data?.stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'FAILED LOGINS (24H)', value: data.stats.failedLogins24h, color: '#dc2626' },
            { label: 'CRITICAL EVENTS (24H)', value: data.stats.criticalEvents24h, color: '#ea580c' },
            { label: 'EVIDENCE ACCESS (24H)', value: data.stats.evidenceAccess24h, color: '#2563eb' },
            { label: 'STEP-UP MFA (24H)', value: data.stats.stepUpCount24h, color: '#0d9488' },
            { label: 'SUSPICIOUS ACCESS (24H)', value: data.stats.suspiciousCount24h, color: '#7c3aed' },
          ].map((s) => (
            <Grid key={s.label} item xs={6} sm={4} md={2.4}>
              <Card sx={{ borderLeft: `5px solid ${s.color}` }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>{s.label}</Typography>
                  <Typography variant="h3" sx={{ color: s.color, fontWeight: 800, my: 0.5 }}>{s.value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Filter Panel */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <FilterList sx={{ color: colors.teal }} />
            <Typography variant="subtitle2" fontWeight={700}>Filter Security Events</Typography>
          </Stack>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Event Type</InputLabel>
                <Select value={filters.eventType} label="Event Type" onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}>
                  <MenuItem value="">All Events</MenuItem>
                  {EVENT_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Severity</InputLabel>
                <Select value={filters.severity} label="Severity" onChange={(e) => setFilters({ ...filters, severity: e.target.value })}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="INFO">INFO</MenuItem>
                  <MenuItem value="WARNING">WARNING</MenuItem>
                  <MenuItem value="CRITICAL">CRITICAL</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <TextField size="small" fullWidth label="User ID" value={filters.userId} onChange={(e) => setFilters({ ...filters, userId: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <TextField size="small" fullWidth type="date" label="Start Date" InputLabelProps={{ shrink: true }} value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <TextField size="small" fullWidth type="date" label="End Date" InputLabelProps={{ shrink: true }} value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" size="small" onClick={() => setActiveFilters({ ...filters })}>Apply</Button>
                <Button variant="outlined" size="small" onClick={() => {
                  const empty = { eventType: '', severity: '', userId: '', agencyId: '', startDate: '', endDate: '' };
                  setFilters(empty); setActiveFilters(empty);
                }}>Clear</Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Log Table */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h4" fontWeight={700}>
              Security Audit Log {data && `(${data.total} events)`}
            </Typography>
            <Button size="small" startIcon={<Refresh />} onClick={() => logsQuery.refetch()} disabled={logsQuery.isFetching}>
              Refresh
            </Button>
          </Stack>

          {logsQuery.isLoading && <LinearProgress />}
          {logsQuery.isError && <Alert severity="error">Failed to load security logs.</Alert>}

          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Event Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Resource / Action</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>IP Address</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.items.map((log) => (
                  <TableRow key={log.logId} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {SEVERITY_ICONS[log.severity] ?? <Info fontSize="small" />}
                        <Typography variant="caption" sx={{ color: SEVERITY_COLORS[log.severity] ?? '#333', fontWeight: 700 }}>
                          {log.severity}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                        {log.eventType}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{log.userName || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      {log.role && <Chip label={log.role} size="small" variant="outlined" />}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{log.resource}{log.action ? ` / ${log.action}` : ''}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={log.status}
                        color={log.status === 'SUCCESS' ? 'success' : log.status === 'BLOCKED' ? 'error' : 'warning'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{new Date(log.timestamp).toLocaleString()}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{log.ipAddress || '—'}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#64748b' }}>
                      No security events match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Box sx={{ mt: 2, p: 2, bgcolor: '#fef9c3', borderRadius: 1, border: '1px solid #fde68a' }}>
        <Typography variant="caption" color="text.secondary">
          ⚠️ This security log is for authorised system administrators and supervisory government officials only.
          All access to this page is itself audited. Data is retained per statutory obligation.
        </Typography>
      </Box>
    </Container>
  );
}
