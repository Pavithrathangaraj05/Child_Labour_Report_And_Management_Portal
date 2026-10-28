import {
  Box, Button, Card, CardContent, Chip, Grid, MenuItem, Pagination, Stack, TextField, Typography,
} from '@mui/material';
import Search from '@mui/icons-material/Search';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import type { CaseList } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import DataTable from '../../components/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import RiskBadge from '../../components/RiskBadge';
import StatusBadge from '../../components/StatusBadge';
import { LABOUR_CATEGORIES, STATUSES, STATUS_LABEL, categoryLabel } from '../../constants';

const SCOPE: Record<string, string> = {
  POLICE: 'Cases assigned to your agency, plus emergency reports in your district.',
  LABOUR: 'Cases assigned to your agency, plus labour-related reports in your district.',
  CWC: 'Cases assigned to your committee, plus child-protection-relevant reports in your district.',
  NGO: 'Cases assigned to your organisation only.',
  GOVERNMENT: 'District-level summary view. Individual child details are not shown.',
};

export default function CasesPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const q = useQuery({
    queryKey: ['cases', page, status, category, search],
    queryFn: async () =>
      (await api.get<CaseList>('/cases', {
        params: {
          page,
          limit: 15,
          status: status || undefined,
          category: category || undefined,
          search: search.trim() || undefined,
        },
      })).data,
  });

  const d = q.data;
  const kpi = (label: string, v: number | string, red = false) => (
    <Grid item xs={6} md={3}>
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          <Typography sx={{ fontSize: 30, fontWeight: 700, color: red && Number(v) > 0 ? 'error.main' : 'primary.dark' }}>
            {v}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: '1.7rem' }}>Master Case Search & Directory</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>{SCOPE[user!.role]}</Typography>

      {d && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpi('Cases in your view', d.total)}
          {kpi('Emergency reports', d.summary.emergencies, true)}
          {kpi('Pending verification / screening', (d.summary.byStatus.REPORTED ?? 0) + (d.summary.byStatus.AI_SCREENED ?? 0) + (d.summary.byStatus.VERIFICATION_PENDING ?? 0) + (d.summary.byStatus.SUBMITTED ?? 0))}
          {kpi('Closed', d.summary.byStatus.CLOSED ?? 0)}
        </Grid>
      )}

      {/* Multi-parameter Search and Filter bar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          size="small"
          label="Search by Case ID, Tracking ID, Establishment, or City"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          sx={{ flex: 1 }}
          InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }}
        />
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          sx={{ width: { xs: '100%', sm: 200 } }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {STATUSES.map((s) => <MenuItem key={s} value={s}>{STATUS_LABEL[s]}</MenuItem>)}
        </TextField>
        <TextField
          select
          size="small"
          label="Labour Category"
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          sx={{ width: { xs: '100%', sm: 220 } }}
        >
          <MenuItem value="">All categories</MenuItem>
          {LABOUR_CATEGORIES.map(([val, lbl]) => <MenuItem key={val} value={val}>{lbl}</MenuItem>)}
        </TextField>
      </Stack>

      {q.isLoading && <LoadingState label="Loading cases" />}
      {q.isError && <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />}

      {d && (d.items.length === 0 ? (
        <EmptyState title="No cases match search criteria">
          Adjust the filters or search keywords above.
        </EmptyState>
      ) : (
        <>
          <DataTable
            caption="Cases"
            rows={d.items}
            rowKey={(r) => r.id}
            onRowClick={(r) => nav(`/cases/${r.caseId}`)}
            columns={[
              { header: 'Case ID', render: (r) => <b>{r.caseId}</b> },
              {
                header: 'Type of work',
                render: (r) => (
                  <Stack direction="row" gap={0.5} flexWrap="wrap">
                    {r.labourCategories.slice(0, 2).map((k) => (
                      <Chip key={k} size="small" variant="outlined" label={categoryLabel(k)} />
                    ))}
                    {r.labourCategories.length > 2 && <Chip size="small" label={`+${r.labourCategories.length - 2}`} />}
                  </Stack>
                ),
              },
              {
                header: 'Establishment / Place',
                render: (r) => r.establishmentName || r.location.villageOrCity || '—',
              },
              { header: 'District', render: (r) => r.location.district },
              { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { header: 'Emergency', render: (r) => <RiskBadge emergency={r.emergencyIndicator} /> },
              { header: 'Submitted', render: (r) => new Date(r.createdAt).toLocaleDateString() },
              {
                header: 'Action',
                render: (r) => (
                  <Button size="small" variant="text" onClick={(e) => { e.stopPropagation(); nav(`/cases/${r.caseId}`); }}>
                    Open
                  </Button>
                ),
              },
            ]}
          />
          <Stack alignItems="center" sx={{ mt: 2 }}>
            <Pagination page={page} count={Math.max(1, Math.ceil(d.total / d.limit))} onChange={(_, p) => setPage(p)} />
          </Stack>
        </>
      ))}
    </Box>
  );
}
