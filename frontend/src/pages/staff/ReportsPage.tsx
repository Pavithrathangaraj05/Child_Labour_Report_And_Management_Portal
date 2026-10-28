import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Container,
  Divider, FormControl, Grid, InputLabel, MenuItem, Select, Stack, Typography,
} from '@mui/material';
import Assessment from '@mui/icons-material/Assessment';
import Download from '@mui/icons-material/Download';
import PictureAsPdf from '@mui/icons-material/PictureAsPdf';
import TableChart from '@mui/icons-material/TableChart';
import Description from '@mui/icons-material/Description';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { colors } from '../../theme';

const REPORT_TYPES = [
  { value: 'daily', label: 'Daily Report', description: 'All cases reported and updated today' },
  { value: 'monthly', label: 'Monthly Report', description: 'Monthly case flow and outcomes summary' },
  { value: 'district', label: 'District Report', description: 'Cases grouped by district with risk analysis' },
  { value: 'agency_performance', label: 'Agency Performance', description: 'SLA compliance and workload per agency' },
  { value: 'risk', label: 'Risk Report', description: 'High/Critical risk case concentrations' },
  { value: 'rehabilitation', label: 'Rehabilitation Report', description: 'Rehabilitation plans, outcomes and follow-ups' },
  { value: 'sla', label: 'SLA Report', description: 'Cases breaching SLA targets and escalation status' },
  { value: 'repeat_offences', label: 'Repeat Offences Report', description: 'Identified repeated offences by location' },
  { value: 'high_risk_regions', label: 'High-Risk Regions', description: 'Districts with CRITICAL or HIGH risk aggregation' },
];

export default function ReportsPage() {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('monthly');
  const [format, setFormat] = useState<'pdf' | 'csv' | 'excel'>('csv');
  const [reportData, setReportData] = useState<any>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/reports/generate', {
        type: reportType,
        reportType,
        format,
      });
      const data = res.data;
      const records = data.records || data.data || [];
      return { ...data, records };
    },
    onSuccess: (data) => {
      setReportData(data);
    },
  });

  const handleExport = (exportFormat: 'pdf' | 'csv' | 'excel') => {
    if (!reportData) return;

    if (exportFormat === 'csv') {
      const rows = reportData.records ?? [];
      if (!rows.length) return;
      const headers = Object.keys(rows[0]).join(',');
      const csv = [headers, ...rows.map((r: any) => Object.values(r).map((v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    } else if (exportFormat === 'excel') {
      import('xlsx').then((XLSX) => {
        const rows = reportData.records ?? [];
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Report');
        XLSX.writeFile(wb, `${reportType}_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
      });
    } else if (exportFormat === 'pdf') {
      import('jspdf').then(({ jsPDF }) => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(`CHILD-SAFE — ${REPORT_TYPES.find((r) => r.value === reportType)?.label ?? reportType}`, 14, 18);
        doc.setFontSize(11);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
        doc.text(`Authorised by: ${user?.name ?? 'Official'} (${user?.role})`, 14, 36);
        doc.setFontSize(10);
        let y = 48;
        (reportData.records ?? []).slice(0, 40).forEach((row: any, i: number) => {
          const line = Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(' | ');
          const wrapped = doc.splitTextToSize(line, 180);
          if (y + wrapped.length * 6 > 280) { doc.addPage(); y = 14; }
          doc.text(wrapped, 14, y);
          y += wrapped.length * 6 + 2;
        });
        doc.save(`${reportType}_report_${new Date().toISOString().slice(0, 10)}.pdf`);
      });
    }
  };

  const selected = REPORT_TYPES.find((r) => r.value === reportType);

  return (
    <Container maxWidth="xl" sx={{ pt: 3, pb: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 3, p: 3, bgcolor: '#312e81', color: '#fff', borderRadius: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Assessment sx={{ color: '#c4b5fd', fontSize: 44 }} />
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff', fontSize: '1.8rem' }}>
              REPORTS
            </Typography>
            <Typography sx={{ color: '#ddd6fe', fontSize: 14 }}>
              Authorised Report Generation · PDF / CSV / Excel Export · Audit-Protected
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        {/* Left: Report Selector */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>Select Report Type</Typography>
              <Stack spacing={1.5}>
                {REPORT_TYPES.map((r) => (
                  <Box
                    key={r.value}
                    onClick={() => setReportType(r.value)}
                    sx={{
                      p: 1.5, borderRadius: 1, cursor: 'pointer',
                      border: `2px solid ${reportType === r.value ? colors.blue : colors.line}`,
                      bgcolor: reportType === r.value ? '#eff6ff' : '#fff',
                      transition: 'all 0.15s',
                      '&:hover': { bgcolor: '#f1f5f9' },
                    }}
                  >
                    <Typography fontWeight={700} sx={{ color: reportType === r.value ? colors.blue : 'inherit' }}>
                      {r.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{r.description}</Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Configure & Preview */}
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            {/* Configuration */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
                  {selected?.label ?? 'Configure Report'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {selected?.description}
                </Typography>

                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={generateMutation.isPending ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <Assessment />}
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending}
                  >
                    {generateMutation.isPending ? 'Generating…' : 'Generate Report'}
                  </Button>

                  {reportData && (
                    <>
                      <Button variant="outlined" size="small" startIcon={<Download />} onClick={() => handleExport('csv')}>
                        Export CSV
                      </Button>
                      <Button variant="outlined" size="small" startIcon={<TableChart />} onClick={() => handleExport('excel')} sx={{ borderColor: '#16a34a', color: '#16a34a' }}>
                        Export Excel
                      </Button>
                      <Button variant="outlined" size="small" startIcon={<PictureAsPdf />} onClick={() => handleExport('pdf')} sx={{ borderColor: '#dc2626', color: '#dc2626' }}>
                        Export PDF
                      </Button>
                    </>
                  )}
                </Stack>

                {generateMutation.isError && (
                  <Alert severity="error">Failed to generate report. You may not have the required authorisation for this report type.</Alert>
                )}
              </CardContent>
            </Card>

            {/* Report Preview */}
            {reportData && (
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Description sx={{ color: colors.blue }} />
                      <Typography variant="h4" fontWeight={700}>Report Preview</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Chip label={`${reportData.records?.length ?? 0} records`} size="small" />
                      <Chip label={reportData.reportType} size="small" color="primary" />
                      <Chip label={`Generated: ${new Date(reportData.generatedAt).toLocaleString()}`} size="small" variant="outlined" />
                    </Stack>
                  </Stack>

                  {/* Summary metadata */}
                  {reportData.metadata && (
                    <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1, mb: 2, border: `1px solid ${colors.line}` }}>
                      <Grid container spacing={2}>
                        {Object.entries(reportData.metadata).map(([k, v]) => (
                          <Grid key={k} item xs={6} sm={4} md={3}>
                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                              {k.replace(/([A-Z])/g, ' $1').trim()}
                            </Typography>
                            <Typography fontWeight={700}>{String(v)}</Typography>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}

                  {/* Records table */}
                  <Box sx={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
                    {(reportData.records ?? []).length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr>
                            {Object.keys(reportData.records[0]).map((col) => (
                              <th key={col} style={{ padding: '6px 12px', textAlign: 'left', backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap', fontWeight: 700 }}>
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.records.map((row: any, i: number) => (
                            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                              {Object.values(row).map((v: any, j: number) => (
                                <td key={j} style={{ padding: '5px 12px', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                                  {v != null ? String(v) : '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                        No records available for the selected report type and parameters.
                      </Typography>
                    )}
                  </Box>

                  <Divider sx={{ my: 2 }} />
                  <Alert severity="warning" icon={false}>
                    <Typography variant="caption">
                      <strong>Classification:</strong> This report contains information restricted to authorised government officials.
                      Distribution outside the case management system must be authorised by the competent authority.
                      Personal identifiers are not included in exported data by default.
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
}
