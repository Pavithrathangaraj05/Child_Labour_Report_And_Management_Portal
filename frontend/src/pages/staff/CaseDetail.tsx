import { Alert, Box, Button, Chip, Divider, Grid, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import UploadFile from '@mui/icons-material/UploadFile';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../../api/client';
import type { CaseRow, Role } from '../../api/types';
import { ErrorState, LoadingState } from '../../components/States';
import Modal from '../../components/Modal';
import RiskBadge from '../../components/RiskBadge';
import StatusBadge from '../../components/StatusBadge';
import { AGE_RANGES, STATUS_LABEL, VULNERABILITIES, categoryLabel, fmtBytes } from '../../constants';

const lab = (list: [string, string][], v?: string) => list.find(([k]) => k === v)?.[1] ?? v ?? 'Not recorded';
const Row = ({ k, v }: { k: string; v?: React.ReactNode }) => (
  <Grid item xs={12} sm={6}><Typography variant="body2" color="text.secondary">{k}</Typography><Typography>{v ?? 'Not recorded'}</Typography></Grid>
);
const tri = (v?: string) => (v === 'YES' ? 'Yes' : v === 'NO' ? 'No' : v ? 'Not sure' : undefined);

export default function CaseDetail({ id, role, onClose }: { id: string; role: Role; onClose: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['case', id], queryFn: async () => (await api.get<{ case: CaseRow }>(`/cases/${id}`)).data.case });
  const canUpload = ['POLICE', 'LABOUR', 'CWC', 'NGO'].includes(role);
  const up = useMutation({
    mutationFn: async (files: FileList) => {
      const fd = new FormData(); Array.from(files).forEach((f) => fd.append('files', f));
      const r = await api.post(`/cases/${id}/evidence`, fd, { validateStatus: (s) => s < 500 });
      if (r.status >= 400) throw new Error(r.data?.rejected?.[0]?.reason ?? r.data?.error?.message ?? 'Upload failed');
      return r.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case', id] }),
  });
  const c = q.data; const sd = c?.situationDetails; const ci = c?.childInformation;

  return (
    <Modal open title={c ? `Case ${c.caseId}` : 'Case'} onClose={onClose}>
      {q.isLoading && <LoadingState label="Loading case" />}
      {q.isError && <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />}
      {c && (
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap><StatusBadge status={c.status} /><RiskBadge emergency={c.emergencyIndicator} />
            {c.labourCategories.map((k) => <Chip key={k} size="small" label={categoryLabel(k)} variant="outlined" />)}</Stack>
          <Alert severity="info" icon={false} sx={{ py: 0 }}>Your view is limited to what the {role} role needs. Fields you cannot see are not sent to your browser.</Alert>

          <Typography variant="h5">Child</Typography>
          <Grid container spacing={1.5}>
            <Row k="Age range" v={lab(AGE_RANGES, ci?.ageRange)} />
            {ci?.approximateAge !== undefined && <Row k="Approximate age" v={ci.approximateAge} />}
            <Row k="Number of children" v={ci?.numberOfChildren} />
            {ci && 'gender' in ci && <Row k="Gender" v={ci.gender} />}
            {ci && 'identityKnown' in ci && <Row k="Reporter knows the child" v={ci.identityKnown ? 'Yes' : 'No'} />}
            {ci?.vulnerabilityIndicators && <Row k="Vulnerability indicators" v={ci.vulnerabilityIndicators.length ? ci.vulnerabilityIndicators.map((v: string) => lab(VULNERABILITIES, v)).join(', ') : 'None reported'} />}
          </Grid>
          <Divider />
          <Typography variant="h5">Location</Typography>
          <Grid container spacing={1.5}>
            <Row k="District" v={c.location.district} /><Row k="State" v={c.location.state} />
            {'taluk' in c.location && <Row k="Taluk" v={c.location.taluk} />}
            {c.location.villageOrCity && <Row k="Village / city" v={c.location.villageOrCity} />}
            {c.location.landmark && <Row k="Landmark" v={c.location.landmark} />}
            {c.location.coordinates && <Row k="GPS" v={`${c.location.coordinates.lat}, ${c.location.coordinates.lng}`} />}
          </Grid>
          {sd && (<>
            <Divider /><Typography variant="h5">Situation</Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12}><Typography variant="body2" color="text.secondary">What the child is doing</Typography><Typography>{sd.childActivity}</Typography></Grid>
              <Row k="Working for" v={sd.workDuration?.replaceAll('_', ' ').toLowerCase()} />
              {'currentlyInDanger' in sd && <><Row k="In danger now" v={tri(sd.currentlyInDanger)} /><Row k="Threatened" v={tri(sd.threatened)} /><Row k="Forced to work" v={tri(sd.forcedToWork)} />
                <Row k="With an adult" v={tri(sd.accompaniedByAdult)} /><Row k="Suspected trafficking" v={tri(sd.suspectedTrafficking)} /><Row k="Used for begging" v={tri(sd.usedForBegging)} />
                <Row k="Multiple children" v={tri(sd.multipleChildren)} /></>}
              <Row k="Kept from school" v={tri(sd.preventedFromSchool)} />
              {sd.additionalDescription && <Grid item xs={12}><Typography variant="body2" color="text.secondary">Reporter's description</Typography><Typography sx={{ whiteSpace: 'pre-wrap' }}>{sd.additionalDescription}</Typography></Grid>}
            </Grid>
          </>)}
          {c.reporterContact !== undefined && (<>
            <Divider /><Typography variant="h5">Reporter</Typography>
            {c.reporterType === 'ANONYMOUS' || !c.reporterContact
              ? <Typography color="text.secondary">Anonymous reporter. No contact details held.</Typography>
              : <Grid container spacing={1.5}><Row k="Name" v={c.reporterContact.name} /><Row k="Phone" v={c.reporterContact.phone} /><Row k="Email" v={c.reporterContact.email} /></Grid>}
          </>)}
          <Divider />
          <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="h5">Evidence ({c.evidence?.length ?? 0})</Typography>
            {canUpload && <Button component="label" size="small" variant="outlined" startIcon={<UploadFile />} disabled={up.isPending}>
              {up.isPending ? 'Uploading…' : 'Upload evidence'}
              <input hidden type="file" multiple onChange={(e) => { if (e.target.files?.length) up.mutate(e.target.files); e.target.value = ''; }} />
            </Button>}
          </Stack>
          {up.isError && <Alert severity="error">{(up.error as Error).message}</Alert>}
          {c.evidence?.length ? (
            <List dense disablePadding>{c.evidence.map((e) => (
              <ListItem key={e.id} disableGutters><ListItemText primary={e.filename} secondary={`${e.fileType.toLowerCase()} · ${fmtBytes(e.sizeBytes)} · ${new Date(e.uploadedAt).toLocaleString()} · ${e.classification.toLowerCase()} · faces not redacted`} /></ListItem>
            ))}</List>
          ) : <Typography color="text.secondary">No evidence attached.</Typography>}
          {c.statusHistory && <Box><Typography variant="h5" sx={{ mb: 0.5 }}>History</Typography>
            {c.statusHistory.map((h, i) => <Typography key={i} variant="body2">{STATUS_LABEL[h.status]} on {new Date(h.at).toLocaleString()}</Typography>)}</Box>}
        </Stack>
      )}
    </Modal>
  );
}
