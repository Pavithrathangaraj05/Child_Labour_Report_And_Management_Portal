import {
  Box, Button, Card, CardContent, Chip, Collapse, Divider, IconButton,
  LinearProgress, Stack, Tab, Tabs, TextField, Typography, Alert,
} from '@mui/material';
import TrackChanges from '@mui/icons-material/TrackChanges';
import Visibility from '@mui/icons-material/Visibility';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ExpandLess from '@mui/icons-material/ExpandLess';
import FiberManualRecord from '@mui/icons-material/FiberManualRecord';
import UploadFile from '@mui/icons-material/UploadFile';
import CheckCircle from '@mui/icons-material/CheckCircle';
import { useQuery } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { CaseRow } from '../api/types';
import StatusBadge from './StatusBadge';
import RiskBadge from './RiskBadge';
import { STATUS_LABEL, categoryLabel } from '../constants';
import { colors } from '../theme';

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#d97706',
  LOW: '#16a34a',
};

const STAGE_ORDER = [
  'REPORTED', 'AI_SCREENED', 'VERIFICATION_PENDING', 'UNDER_VERIFICATION',
  'VERIFIED', 'PRIORITIZED', 'ASSIGNED', 'INTERVENTION_REQUIRED',
  'RESCUE_INITIATED', 'RESCUED', 'UNDER_REHABILITATION', 'REINTEGRATED',
  'FOLLOW_UP', 'CASE_CLOSED',
];

function StageTimeline({ timeline }: { timeline: Array<{ stage: string; timestamp: string; details?: string }> }) {
  return (
    <Box sx={{ mt: 1 }}>
      {timeline.slice(-6).map((t, i) => (
        <Stack key={i} direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 0.75 }}>
          <FiberManualRecord sx={{ fontSize: 10, color: colors.teal, mt: 0.6, flexShrink: 0 }} />
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
              {t.stage.replace(/_/g, ' ')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(t.timestamp).toLocaleString()} {t.details ? `— ${t.details}` : ''}
            </Typography>
          </Box>
        </Stack>
      ))}
    </Box>
  );
}

interface EvidenceUploadMiniProps {
  caseId: string;
}

function EvidenceUploadMini({ caseId }: EvidenceUploadMiniProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState('');

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setErr('');
    setSuccess(false);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('files', f));
      fd.append('description', 'Staff evidence upload');
      fd.append('classification', 'STANDARD');
      await api.post(`/cases/${caseId}/evidence`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(true);
    } catch (e: any) {
      setErr(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ mt: 1 }}>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {success && (
        <Alert severity="success" icon={<CheckCircle fontSize="inherit" />} sx={{ mb: 1, py: 0 }}>
          Evidence uploaded successfully
        </Alert>
      )}
      {err && <Alert severity="error" sx={{ mb: 1, py: 0 }}>{err}</Alert>}
      {uploading && <LinearProgress sx={{ mb: 1 }} />}
      <Button
        size="small"
        variant="outlined"
        startIcon={<UploadFile />}
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        fullWidth
      >
        Upload Evidence Files
      </Button>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        Images, video, audio, PDF, Word, Excel, text — max 5 files
      </Typography>
    </Box>
  );
}

interface CaseTrackingRowProps {
  item: CaseRow;
  showUpload?: boolean;
}

function CaseTrackingRow({ item, showUpload = true }: CaseTrackingRowProps) {
  const [expanded, setExpanded] = useState(false);
  const risk = item.riskAssessment?.riskLevel;
  const riskColor = risk ? RISK_COLORS[risk] ?? colors.teal : colors.teal;
  const currentStageIndex = STAGE_ORDER.indexOf(item.status);
  const progressPct = currentStageIndex >= 0 ? Math.round(((currentStageIndex + 1) / STAGE_ORDER.length) * 100) : 0;

  return (
    <Card
      variant="outlined"
      sx={{
        borderLeft: `5px solid ${item.emergencyIndicator ? '#dc2626' : riskColor}`,
        mb: 1.5,
        '&:last-child': { mb: 0 },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Row header */}
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
              #{item.caseId}
            </Typography>
            {item.trackingId && (
              <Chip
                size="small"
                label={`TRK: ${item.trackingId}`}
                variant="outlined"
                sx={{ fontFamily: 'monospace', fontSize: 11 }}
              />
            )}
            <StatusBadge status={item.status} />
            {risk && <RiskBadge risk={risk} />}
            {item.emergencyIndicator && (
              <Chip size="small" label="EMERGENCY" color="error" />
            )}
            {item.repeatOffenceCheck?.isPotentialRepeat && (
              <Chip size="small" label="REPEAT OFFENCE" color="warning" />
            )}
          </Stack>

          <Stack direction="row" spacing={0.5} alignItems="center">
            <Button
              component={RouterLink}
              to={`/cases/${item.id}`}
              size="small"
              startIcon={<Visibility />}
              variant="outlined"
              sx={{ whiteSpace: 'nowrap' }}
            >
              View
            </Button>
            <IconButton size="small" onClick={() => setExpanded((p) => !p)}>
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Stack>
        </Stack>

        {/* Progress bar */}
        <Box sx={{ mt: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Workflow Progress — {STATUS_LABEL[item.status] ?? item.status}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: riskColor }}>
              {progressPct}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progressPct}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: '#e2e8f0',
              '& .MuiLinearProgress-bar': { bgcolor: riskColor },
            }}
          />
        </Box>

        {/* Location & categories */}
        <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
          <Typography variant="caption" color="text.secondary">
            {item.location?.villageOrCity || item.location?.district || 'Location recorded'}
          </Typography>
          {item.labourCategories?.slice(0, 2).map((c) => (
            <Chip key={c} size="small" label={categoryLabel(c)} variant="outlined" sx={{ fontSize: 11 }} />
          ))}
        </Stack>

        {/* Expanded section: timeline + upload */}
        <Collapse in={expanded}>
          <Divider sx={{ my: 1.5 }} />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {/* Timeline */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                RECENT TIMELINE
              </Typography>
              {item.timeline && item.timeline.length > 0 ? (
                <StageTimeline timeline={item.timeline} />
              ) : (
                <Typography variant="caption" color="text.secondary">No timeline recorded yet.</Typography>
              )}
            </Box>
            {/* Evidence Upload */}
            {showUpload && (
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                  ADD EVIDENCE
                </Typography>
                <EvidenceUploadMini caseId={item.id} />
              </Box>
            )}
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
}

interface CaseTrackingPanelProps {
  /** Cases to display — pass the already-fetched list from the parent */
  cases: CaseRow[];
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  /** Optional filter to pre-select tab */
  defaultFilter?: 'all' | 'active' | 'emergency' | 'repeat';
  /** Whether to show the evidence upload widget per case */
  showUpload?: boolean;
  /** Panel title */
  title?: string;
}

/**
 * CaseTrackingPanel — reusable per-case tracking panel for staff dashboards.
 * Shows Tracking ID, current workflow stage, risk level, progress bar, timeline, and evidence upload.
 * NOT shown on citizen portal.
 */
export default function CaseTrackingPanel({
  cases,
  isLoading,
  isError,
  error,
  defaultFilter = 'active',
  showUpload = true,
  title = 'Case Tracking & Evidence',
}: CaseTrackingPanelProps) {
  const [tab, setTab] = useState<'all' | 'active' | 'emergency' | 'repeat'>(defaultFilter);
  const [search, setSearch] = useState('');

  const filtered = cases.filter((c) => {
    if (tab === 'active') return !['CASE_CLOSED', 'REINTEGRATED'].includes(c.status);
    if (tab === 'emergency') return c.emergencyIndicator || c.riskAssessment?.riskLevel === 'CRITICAL';
    if (tab === 'repeat') return c.repeatOffenceCheck?.isPotentialRepeat;
    return true;
  }).filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.caseId?.toLowerCase().includes(q) ||
      c.trackingId?.toLowerCase().includes(q) ||
      c.location?.district?.toLowerCase().includes(q) ||
      c.location?.villageOrCity?.toLowerCase().includes(q) ||
      c.status?.toLowerCase().includes(q)
    );
  });

  const emergencyCount = cases.filter((c) => c.emergencyIndicator || c.riskAssessment?.riskLevel === 'CRITICAL').length;
  const repeatCount = cases.filter((c) => c.repeatOffenceCheck?.isPotentialRepeat).length;
  const activeCount = cases.filter((c) => !['CASE_CLOSED', 'REINTEGRATED'].includes(c.status)).length;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TrackChanges sx={{ color: colors.teal }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{title}</Typography>
          </Stack>
          <TextField
            size="small"
            placeholder="Search Case ID / Tracking ID / District…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 260 }}
          />
        </Stack>

        {/* Tab filter */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 2, borderBottom: `1px solid ${colors.line}` }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab value="all" label={`All (${cases.length})`} />
          <Tab value="active" label={`Active (${activeCount})`} />
          <Tab
            value="emergency"
            label={`Emergency / Critical (${emergencyCount})`}
            sx={emergencyCount > 0 ? { color: '#dc2626', fontWeight: 700 } : {}}
          />
          <Tab
            value="repeat"
            label={`Repeat Offence (${repeatCount})`}
            sx={repeatCount > 0 ? { color: '#ea580c', fontWeight: 700 } : {}}
          />
        </Tabs>

        {/* Content */}
        {isLoading && <LinearProgress />}
        {isError && <Alert severity="error">{errorMessage(error)}</Alert>}

        {!isLoading && filtered.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <TrackChanges sx={{ fontSize: 48, color: '#94a3b8', mb: 1 }} />
            <Typography color="text.secondary">No cases match the current filter.</Typography>
          </Box>
        )}

        {filtered.slice(0, 20).map((item) => (
          <CaseTrackingRow key={item.id} item={item} showUpload={showUpload} />
        ))}

        {filtered.length > 20 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
            Showing 20 of {filtered.length} cases. Use search or visit{' '}
            <RouterLink to="/cases" style={{ color: colors.teal }}>Cases</RouterLink> for full list.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
