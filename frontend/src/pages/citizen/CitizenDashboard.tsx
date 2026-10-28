import {
  Alert, Box, Button, Card, CardContent, Chip, Collapse, Container, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Grid, IconButton, LinearProgress, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import AddCircleOutline from '@mui/icons-material/AddCircleOutline';
import VolunteerActivism from '@mui/icons-material/VolunteerActivism';
import TrackChanges from '@mui/icons-material/TrackChanges';
import CheckCircle from '@mui/icons-material/CheckCircle';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import LocationOn from '@mui/icons-material/LocationOn';
import Business from '@mui/icons-material/Business';
import UploadFile from '@mui/icons-material/UploadFile';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ExpandLess from '@mui/icons-material/ExpandLess';
import AttachFile from '@mui/icons-material/AttachFile';
import { useQuery } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { STATUS_LABEL, categoryLabel } from '../../constants';
import { colors } from '../../theme';
import StatusBadge from '../../components/StatusBadge';

interface MyReport {
  id: string;
  caseId: string;
  trackingId: string;
  status: string;
  emergencyIndicator: boolean;
  labourCategories: string[];
  district: string;
  villageOrCity: string;
  timeline: Array<{ stage: string; timestamp: string; details?: string }>;
  createdAt: string;
  updatedAt: string;
}

const VOLUNTEER_EVENTS = [
  {
    id: 'EVT-01',
    title: 'National Child Labour Project (NCLP) District Outreach Drive',
    organizer: 'Ministry of Labour & Employment, Government of India',
    date: 'Next Saturday, 10:00 AM – 4:00 PM',
    location: 'District Community Hall & Market Area',
    target: 'Out-of-school children & roadside vendors',
    description: 'Join government labor inspectors and community social workers in mapping out-of-school children working in local markets. Distribute awareness pamphlets and assist in family counseling for bridge school admissions.',
    category: 'GOVERNMENT INITIATIVE',
    seatsLeft: 14,
  },
  {
    id: 'EVT-02',
    title: 'Operation Smile / Muskaan — Railway & Bus Terminal Vigilance Camp',
    organizer: 'State Police Special Juvenile Police Unit (SJPU) & CWC',
    date: 'Sunday, 8:00 AM – 2:00 PM',
    location: 'Central Inter-State Bus Terminal (ISBT)',
    target: 'Unaccompanied minors & suspected transit trafficking',
    description: 'Support local law enforcement teams by maintaining vigilance at arrival bays. Report vulnerable runaway or trafficking-prone children to helpdesks and provide initial hydration & child helpline assistance.',
    category: 'POLICE CO-ORDINATION',
    seatsLeft: 8,
  },
  {
    id: 'EVT-03',
    title: 'Back-to-School Transition & Literacy Bridge Camp',
    organizer: 'Samagra Shiksha & Child Rights Protection Society',
    date: 'Weekdays 4:00 PM – 6:30 PM',
    location: 'Government Model Primary School Campus',
    target: 'Children recently rescued from domestic and shop labor',
    description: 'Help newly rescued children transition back to formal school environments through basic reading, recreational art, and mathematics mentoring sessions. Study kits and books are provided by the government.',
    category: 'EDUCATION & REHABILITATION',
    seatsLeft: 22,
  },
  {
    id: 'EVT-04',
    title: 'Brick Kiln & Hazardous Unit Community Watch Squad',
    organizer: 'District Child Protection Society (DCPS) & Certified NGO Partners',
    date: 'Upcoming Weekend, 9:00 AM – 1:00 PM',
    location: 'Industrial Estate Perimeter & Brick Manufacturing Cluster',
    target: 'Adolescent safety & hazardous sector monitoring',
    description: 'Community monitoring initiative focused on observing peripheral kiln operations and reporting hazardous conditions or migrant child exploitation directly to ChildSafe rapid intake teams.',
    category: 'COMMUNITY WATCH',
    seatsLeft: 6,
  },
];

// ─── Citizen Evidence Upload Widget ─────────────────────────────────────────
function CitizenEvidenceUpload({ caseId, caseLabel }: { caseId: string; caseLabel: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState('');
  const [description, setDescription] = useState('');

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setErr('');
    setSuccess(false);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('files', f));
      fd.append('description', description || 'Additional evidence from reporter');
      fd.append('classification', 'STANDARD');
      await api.post(`/cases/${caseId}/evidence`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(true);
      setDescription('');
    } catch (e: any) {
      setErr(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        color="primary"
        startIcon={<AttachFile />}
        onClick={() => setOpen(true)}
      >
        Upload Evidence
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <UploadFile />
            <span>Upload Evidence — Case #{caseLabel}</span>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)}
          />

          {success && (
            <Alert severity="success" icon={<CheckCircle fontSize="inherit" />} sx={{ mb: 2 }}>
              Evidence uploaded successfully. Our team will review it shortly.
            </Alert>
          )}
          {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
          {uploading && <LinearProgress sx={{ mb: 2 }} />}

          <TextField
            label="Brief Description (optional)"
            placeholder="E.g. Photo taken at 6 PM near market stall"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />

          <Box
            sx={{
              border: '2px dashed #94a3b8',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': { borderColor: colors.teal, bgcolor: '#f0fdfa' },
            }}
            onClick={() => fileRef.current?.click()}
          >
            <UploadFile sx={{ fontSize: 40, color: '#94a3b8', mb: 1 }} />
            <Typography sx={{ fontWeight: 600 }}>Click to select files</Typography>
            <Typography variant="caption" color="text.secondary">
              Photos, videos, audio recordings, PDF, Word, Excel, text, ZIP — up to 5 files
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mt: 2, fontSize: 13 }}>
            Your uploaded evidence is encrypted and accessible only to authorized government officials handling this case. Your identity is protected.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
          <Button variant="contained" startIcon={<UploadFile />} onClick={() => fileRef.current?.click()} disabled={uploading}>
            Choose &amp; Upload Files
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
export default function CitizenDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<number>(0);

  // Volunteering modal state
  const [selectedEvent, setSelectedEvent] = useState<typeof VOLUNTEER_EVENTS[0] | null>(null);
  const [registeredEvents, setRegisteredEvents] = useState<string[]>([]);
  const [volunteerForm, setVolunteerForm] = useState({ phone: '', preferredRole: 'Community Outreach', availability: 'Weekends' });
  const [volSuccess, setVolSuccess] = useState<boolean>(false);

  // Fetch logged in citizen's reports
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['my-reports'],
    queryFn: async () => (await api.get<{ reports: MyReport[] }>('/cases/my')).data.reports,
  });

  const handleRegisterVolunteer = () => {
    if (selectedEvent) {
      setRegisteredEvents([...registeredEvents, selectedEvent.id]);
      setVolSuccess(true);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ pt: 4, pb: 8 }}>
      {/* Citizen Welcome Header */}
      <Box sx={{ mb: 4, p: 3, bgcolor: '#f8fafc', border: `1px solid ${colors.line}`, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid item xs={12} md={8}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <VolunteerActivism sx={{ color: colors.teal, fontSize: 36 }} />
              <Box>
                <Typography variant="h2" sx={{ fontSize: '1.75rem', fontWeight: 700 }}>
                  Citizen Portal & Community Vigilance
                </Typography>
                <Typography color="text.secondary">
                  Welcome, <b>{user?.name}</b>. Track your submitted complaints end-to-end and participate in government child welfare drives.
                </Typography>
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Button
              component={RouterLink}
              to="/report"
              variant="contained"
              size="large"
              startIcon={<AddCircleOutline />}
            >
              Report New Case
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: `1px solid ${colors.line}` }}>
        <Tab icon={<TrackChanges />} iconPosition="start" label={`My Submitted Complaints (${data?.length ?? 0})`} />
        <Tab icon={<VolunteerActivism />} iconPosition="start" label="Government Volunteering & Prevention Events" />
      </Tabs>

      {/* TAB 0: My Submitted Complaints (End-to-End Tracking) */}
      {tab === 0 && (
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>End-to-End Complaint Progress</Typography>
            <Button size="small" onClick={() => refetch()}>Refresh</Button>
          </Box>

          {isLoading && <LinearProgress />}
          {isError && <Alert severity="error">{errorMessage(error)}</Alert>}

          {data && data.length === 0 && (
            <Card sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h5" color="text.secondary" sx={{ mb: 1.5 }}>
                You have not submitted any complaints yet.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Whenever you submit a report while logged in, it appears here automatically with real-time status and investigation timeline updates.
              </Typography>
              <Button component={RouterLink} to="/report" variant="contained">
                Report Child Labour
              </Button>
            </Card>
          )}

          {data && data.map((item) => (
            <Card key={item.id} sx={{ borderLeft: `6px solid ${item.emergencyIndicator ? '#dc2626' : colors.teal}` }}>
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={2} alignItems="flex-start" justifyContent="space-between">
                  <Grid item xs={12} md={8}>
                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>Case #{item.caseId}</Typography>
                      <StatusBadge status={item.status} />
                      {item.emergencyIndicator && <Chip size="small" label="Emergency Alert" color="error" />}
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      Tracking ID: <b>{item.trackingId}</b> • Location: <b>{item.villageOrCity}, {item.district}</b> • Submitted: <b>{new Date(item.createdAt).toLocaleDateString()}</b>
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
                      {item.labourCategories.map((c) => (
                        <Chip key={c} size="small" variant="outlined" label={categoryLabel(c)} />
                      ))}
                    </Stack>

                    {item.timeline && item.timeline.length > 0 && (
                      <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                          LATEST PROGRESS MILESTONE:
                        </Typography>
                        <Typography variant="body2">
                          <b>{item.timeline[item.timeline.length - 1].stage}</b>: {item.timeline[item.timeline.length - 1].details}
                        </Typography>
                      </Box>
                    )}
                  </Grid>

                  <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                    <Stack direction={{ xs: 'column', sm: 'row', md: 'column' }} spacing={1} alignItems={{ xs: 'stretch', md: 'flex-end' }}>
                      <Button
                        component={RouterLink}
                        to={`/track?id=${encodeURIComponent(item.trackingId)}`}
                        variant="outlined"
                        size="small"
                        startIcon={<TrackChanges />}
                      >
                        View Live Stepper
                      </Button>
                      <CitizenEvidenceUpload caseId={item.id} caseLabel={item.caseId} />
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* TAB 1: Volunteering Events Conducted by Government & Child Labour Prevention Authorities */}
      {tab === 1 && (
        <Stack spacing={3}>
          <Box sx={{ p: 2.5, bgcolor: '#eff6ff', borderRadius: 1.5, border: '1px solid #bfdbfe' }}>
            <Typography variant="h5" sx={{ color: '#1e40af', fontWeight: 700 }}>
              Government Child Labour Prevention & Rescue Support Drives
            </Typography>
            <Typography variant="body2" sx={{ color: '#1e3a8a', mt: 0.5 }}>
              Citizen volunteers play a decisive role in identifying vulnerable children, supporting transit monitoring, and aiding bridge schooling. All events are coordinated by district authorities.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {VOLUNTEER_EVENTS.map((evt) => {
              const isRegistered = registeredEvents.includes(evt.id);
              return (
                <Grid item xs={12} md={6} key={evt.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: isRegistered ? `2px solid ${colors.teal}` : `1px solid ${colors.line}` }}>
                    <CardContent sx={{ flex: 1, p: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Chip size="small" label={evt.category} color="primary" variant="outlined" />
                        <Typography variant="caption" color="text.secondary">{evt.seatsLeft} volunteer spots left</Typography>
                      </Stack>

                      <Typography variant="h4" sx={{ fontSize: '1.2rem', fontWeight: 700, mt: 1 }}>
                        {evt.title}
                      </Typography>

                      <Stack spacing={1} sx={{ my: 1.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Business fontSize="small" sx={{ color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">{evt.organizer}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CalendarMonth fontSize="small" sx={{ color: colors.teal }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{evt.date}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <LocationOn fontSize="small" sx={{ color: 'error.main' }} />
                          <Typography variant="body2">{evt.location}</Typography>
                        </Stack>
                      </Stack>

                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                        {evt.description}
                      </Typography>
                    </CardContent>

                    <Box sx={{ p: 2, pt: 0 }}>
                      {isRegistered ? (
                        <Button fullWidth variant="contained" color="success" startIcon={<CheckCircle />} disabled>
                          Registered as Volunteer
                        </Button>
                      ) : (
                        <Button
                          fullWidth
                          variant="contained"
                          color="primary"
                          onClick={() => { setSelectedEvent(evt); setVolSuccess(false); }}
                        >
                          Join as Citizen Volunteer
                        </Button>
                      )}
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Stack>
      )}

      {/* Volunteer Registration Dialog */}
      <Dialog open={!!selectedEvent} onClose={() => setSelectedEvent(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {volSuccess ? 'Registration Confirmed!' : `Volunteer for: ${selectedEvent?.title}`}
        </DialogTitle>
        <DialogContent dividers>
          {volSuccess ? (
            <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
              <CheckCircle sx={{ color: colors.teal, fontSize: 56 }} />
              <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'center' }}>
                Thank You for Standing Up for Child Rights!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                Your volunteer application for <b>{selectedEvent?.title}</b> has been received. You will receive an SMS and email briefing with reporting instructions.
              </Typography>
              <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 1.5, border: `1px solid ${colors.teal}`, width: '100%' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Digital Volunteer Pass ID: CP-VOL-{Math.floor(100000 + Math.random() * 900000)}</Typography>
                <Typography variant="caption" color="text.secondary">Present this digital confirmation at the reporting desk.</Typography>
              </Box>
            </Stack>
          ) : (
            <Stack spacing={2.5}>
              <Typography variant="body2" color="text.secondary">
                Coordinated by: <b>{selectedEvent?.organizer}</b>
              </Typography>
              <TextField
                label="Your Contact Phone"
                placeholder="+91 98765 43210"
                value={volunteerForm.phone}
                onChange={(e) => setVolunteerForm({ ...volunteerForm, phone: e.target.value })}
                required
              />
              <TextField
                label="Preferred Volunteer Role"
                select
                SelectProps={{ native: true }}
                value={volunteerForm.preferredRole}
                onChange={(e) => setVolunteerForm({ ...volunteerForm, preferredRole: e.target.value })}
              >
                <option value="Community Outreach">Community Outreach & Survey</option>
                <option value="Helpline & Desk Support">Helpline & Welcome Desk</option>
                <option value="Bridge School Mentoring">Bridge School & Art Mentoring</option>
                <option value="Logistics & Hydration">Logistics & Supply Support</option>
              </TextField>
              <TextField
                label="Availability"
                select
                SelectProps={{ native: true }}
                value={volunteerForm.availability}
                onChange={(e) => setVolunteerForm({ ...volunteerForm, availability: e.target.value })}
              >
                <option value="Weekends">Weekends Only</option>
                <option value="Weekdays">Weekdays (Morning)</option>
                <option value="On-Call Emergency">On-Call Rapid Support</option>
              </TextField>
              <Alert severity="info" sx={{ fontSize: 13 }}>
                Volunteers receive official volunteer certificates endorsed by the District Child Protection Committee upon event completion.
              </Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {volSuccess ? (
            <Button onClick={() => setSelectedEvent(null)} variant="contained">Done</Button>
          ) : (
            <>
              <Button onClick={() => setSelectedEvent(null)}>Cancel</Button>
              <Button variant="contained" onClick={handleRegisterVolunteer}>Confirm Enrollment</Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}
