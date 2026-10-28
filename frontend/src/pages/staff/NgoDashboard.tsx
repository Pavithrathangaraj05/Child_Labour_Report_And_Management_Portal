import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
} from '@mui/material';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import SchoolIcon from '@mui/icons-material/School';
import NightShelterIcon from '@mui/icons-material/NightShelter';
import PsychologyIcon from '@mui/icons-material/Psychology';
import Diversity1Icon from '@mui/icons-material/Diversity1';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import CaseTrackingPanel from '../../components/CaseTrackingPanel';

export default function NgoDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [caseRes, statsRes] = await Promise.all([
        api.get('/cases', { params: { limit: 50 } }),
        api.get('/cases/stats').catch(() => ({ data: { stats: null } })),
      ]);
      setCases(caseRes.data.items || []);
      setStats(statsRes.data?.stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter cases relevant to NGO operations
  const shelterCases = cases.filter(
    (c) => c.status === 'SHELTER' || c.rehabilitationPlan?.recommendedShelter || c.status === 'RESCUED_PROTECTED'
  );
  const educationCases = cases.filter(
    (c) => c.status === 'EDUCATION' || c.childInformation?.vulnerabilityIndicators?.includes('OUT_OF_SCHOOL')
  );
  const counsellingCases = cases.filter(
    (c) => c.status === 'COUNSELLING' || c.riskAssessment?.riskLevel === 'CRITICAL'
  );
  const familyCases = cases.filter(
    (c) => c.status === 'FAMILY_ASSESSMENT' || c.status === 'FAMILY_REINTEGRATION'
  );
  const followUpCases = cases.filter(
    (c) => c.status === 'FOLLOW_UP' || c.status === 'MONITORING'
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} mb={3}>
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <VolunteerActivismIcon sx={{ fontSize: 36, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight={800} color="text.primary">
              NGO Rehabilitation & Field Command
            </Typography>
          </Stack>
          <Typography variant="body1" color="text.secondary" mt={0.5}>
            Care Coordination, Shelter Placement, Education & Community Reintegration ({user?.name || 'NGO Partner'})
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchData}>
            Refresh
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>NGO Operational Scope:</strong> Access restricted to assigned child welfare, rehabilitation milestones, and care pathways. Confidential police intelligence files are classified and withheld.
      </Alert>

      {/* Summary KPI Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: 'background.paper', borderLeft: '4px solid #3b82f6' }}>
            <CardContent sx={{ py: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary" fontWeight={600}>Shelter Support</Typography>
                <NightShelterIcon sx={{ color: '#3b82f6' }} />
              </Stack>
              <Typography variant="h4" fontWeight={800} color="#3b82f6" mt={1}>
                {shelterCases.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">Shelter placements</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: 'background.paper', borderLeft: '4px solid #10b981' }}>
            <CardContent sx={{ py: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary" fontWeight={600}>Education Enrollment</Typography>
                <SchoolIcon sx={{ color: '#10b981' }} />
              </Stack>
              <Typography variant="h4" fontWeight={800} color="#10b981" mt={1}>
                {educationCases.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">RTE & Bridge School</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: 'background.paper', borderLeft: '4px solid #8b5cf6' }}>
            <CardContent sx={{ py: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary" fontWeight={600}>Psychosocial Care</Typography>
                <PsychologyIcon sx={{ color: '#8b5cf6' }} />
              </Stack>
              <Typography variant="h4" fontWeight={800} color="#8b5cf6" mt={1}>
                {counsellingCases.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">Trauma counselling</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: 'background.paper', borderLeft: '4px solid #f59e0b' }}>
            <CardContent sx={{ py: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary" fontWeight={600}>Family Reintegration</Typography>
                <Diversity1Icon sx={{ color: '#f59e0b' }} />
              </Stack>
              <Typography variant="h4" fontWeight={800} color="#f59e0b" mt={1}>
                {familyCases.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">Home study & reunification</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: 'background.paper', borderLeft: '4px solid #06b6d4' }}>
            <CardContent sx={{ py: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary" fontWeight={600}>Follow-up Reports</Typography>
                <EventRepeatIcon sx={{ color: '#06b6d4' }} />
              </Stack>
              <Typography variant="h4" fontWeight={800} color="#06b6d4" mt={1}>
                {followUpCases.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">Periodic monitoring</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Per-Case Tracking & Direct Evidence Upload Panel */}
      <CaseTrackingPanel
        cases={cases}
        isLoading={loading}
        title="NGO Rehabilitation Case Tracking & Evidence Management"
      />

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, val) => setTab(val)} indicatorColor="primary" textColor="primary" variant="scrollable">
          <Tab label={`All Assigned Cases (${cases.length})`} />
          <Tab label={`Shelter Care (${shelterCases.length})`} />
          <Tab label={`Education Pathway (${educationCases.length})`} />
          <Tab label={`Counselling (${counsellingCases.length})`} />
          <Tab label={`Family Reintegration (${familyCases.length})`} />
          <Tab label={`Follow-up Monitoring (${followUpCases.length})`} />
        </Tabs>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Case Table */}
      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead sx={{ bgcolor: 'grey.50' }}>
            <TableRow>
              <TableCell><strong>Case ID</strong></TableCell>
              <TableCell><strong>Current Status</strong></TableCell>
              <TableCell><strong>Risk Level</strong></TableCell>
              <TableCell><strong>Location</strong></TableCell>
              <TableCell><strong>Child Profile</strong></TableCell>
              <TableCell><strong>Rehab Plan / Milestones</strong></TableCell>
              <TableCell align="right"><strong>Action</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(() => {
              let displayList = cases;
              if (tab === 1) displayList = shelterCases;
              if (tab === 2) displayList = educationCases;
              if (tab === 3) displayList = counsellingCases;
              if (tab === 4) displayList = familyCases;
              if (tab === 5) displayList = followUpCases;

              if (displayList.length === 0) {
                return (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        No cases found in this rehabilitation category.
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              }

              return displayList.map((c) => {
                const isCritical = c.riskAssessment?.riskLevel === 'CRITICAL';
                return (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {c.caseId}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Ref: {c.trackingId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={c.status.replace(/_/g, ' ')}
                        size="small"
                        color={
                          c.status === 'RESCUED_PROTECTED'
                            ? 'success'
                            : c.status.includes('REHAB') || c.status === 'SHELTER'
                            ? 'primary'
                            : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={c.riskAssessment?.riskLevel || 'MEDIUM'}
                        size="small"
                        color={isCritical ? 'error' : c.riskAssessment?.riskLevel === 'HIGH' ? 'warning' : 'info'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{c.location?.villageOrCity}</Typography>
                      <Typography variant="caption" color="text.secondary">{c.location?.district}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {c.childInformation?.ageRange?.replace(/_/g, ' ') || 'Age ~12'} • {c.childInformation?.gender || 'Unknown'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(c.labourCategories || []).join(', ')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {c.rehabilitationPlan ? (
                        <Box>
                          <Typography variant="caption" fontWeight={600} display="block" color="primary.main">
                            {c.rehabilitationPlan.recommendedPathway || 'Reintegration Plan'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {c.rehabilitationPlan.interventions?.length || 0} active milestones
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Plan Pending
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        component={Link}
                        to={`/cases/${c.caseId}`}
                        size="small"
                        variant="contained"
                        endIcon={<ArrowForwardIcon />}
                      >
                        Rehab File
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              });
            })()}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}
