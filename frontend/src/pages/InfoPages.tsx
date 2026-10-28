import { Alert, Box, Button, Card, CardContent, Container, Grid, Stack, Typography } from '@mui/material';
import Phone from '@mui/icons-material/Phone';
import { Link as RouterLink } from 'react-router-dom';
import InfoCard from '../components/InfoCard';
import { STATUSES, STATUS_HELP, STATUS_LABEL } from '../constants';
import { colors } from '../theme';
import { awareness } from './awarenessData';

const Page = ({ title, lead, children }: { title: string; lead?: string; children: React.ReactNode }) => (
  <Container maxWidth="lg" sx={{ pt: 6 }}>
    <Typography variant="h1" component="h1" sx={{ fontSize: 'clamp(1.9rem,4vw,2.6rem)', color: colors.ink }}>{title}</Typography>
    {lead && <Typography color="text.secondary" sx={{ mt: 1.5, mb: 4, maxWidth: 720, fontSize: '1.1rem' }}>{lead}</Typography>}
    {children}
  </Container>
);

export function AwarenessPage() {
  return (
    <Page title="Child Labour Awareness" lead="Not all child labour looks the same. Every report matters. Work is a concern when it harms a child's health or safety, keeps them from school, is forced, or is done by a child too young for it.">
      <Grid container spacing={2.5}>{awareness.map((a) => <Grid item xs={12} sm={6} md={3} key={a.title}><InfoCard icon={a.icon} title={a.title}>{a.text}</InfoCard></Grid>)}</Grid>
      <Typography variant="h3" sx={{ mt: 6, mb: 2 }}>Signs that a child may need help</Typography>
      <Box component="ul" sx={{ pl: 3, maxWidth: 720, '& li': { mb: 1 } }}>
        <li>Working during school hours, or long hours late at night.</li>
        <li>Carrying heavy loads or handling machinery, chemicals or fire.</li>
        <li>Being shouted at, threatened or kept from leaving the workplace.</li>
        <li>Appearing underfed, injured, or without a parent or guardian nearby.</li>
        <li>Being taken from place to place by an adult who is not a relative.</li>
      </Box>
      <Button component={RouterLink} to="/report" variant="contained" sx={{ mt: 3 }}>Report a case</Button>
    </Page>
  );
}

export function HowItWorksPage() {
  return (
    <Page title="How It Works" lead="Reporting takes a few minutes. You can stay anonymous and still follow what happens next.">
      <Stack spacing={2} sx={{ maxWidth: 760 }}>
        {STATUSES.map((s, i) => (
          <Card key={s}><CardContent sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ minWidth: 34, height: 34, borderRadius: '50%', bgcolor: colors.teal, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>{i + 1}</Box>
            <Box><Typography variant="h5">{STATUS_LABEL[s]}</Typography><Typography color="text.secondary">{STATUS_HELP[s]}</Typography></Box>
          </CardContent></Card>
        ))}
      </Stack>
      {/* <Alert severity="info" sx={{ mt: 3, maxWidth: 760 }}>
        This is a Module 1 prototype. Only the first stage is automatic today. Later stages are set by officers once the matching modules are built.
      </Alert> */}
    </Page>
  );
}

export function EmergencyPage() {
  return (
    <Page title="Emergency Help" lead="If a child is in immediate danger, call now. Do not wait for a report to be reviewed.">
      <Grid container spacing={2.5} sx={{ maxWidth: 820 }}>
        {[['112', 'Police emergency'], ['1098', 'Childline (child helpline)']].map(([n, l]) => (
          <Grid item xs={12} sm={6} key={n}>
            <Card sx={{ borderColor: colors.emergency, borderWidth: 2 }}><CardContent>
              <Typography sx={{ color: colors.emergency, fontWeight: 700, fontSize: 44, fontFamily: '"Source Serif 4", serif' }}>{n}</Typography>
              <Typography variant="h5">{l}</Typography>
              <Button href={`tel:${n}`} startIcon={<Phone />} variant="contained" color="error" sx={{ mt: 2 }}>Call {n}</Button>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>
      <Alert severity="warning" sx={{ mt: 3, maxWidth: 820 }}>
        Marking a report as an emergency on this portal does <b>not</b> dispatch anyone yet. Automatic emergency routing is planned for a later module. Always call the numbers above first.
      </Alert>
      <Typography color="text.secondary" sx={{ mt: 2 }}>Helpline numbers are for India. Confirm them against official sources before any public launch.</Typography>
    </Page>
  );
}
