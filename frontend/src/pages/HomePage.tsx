import { Box, Button, Card, CardContent, Container, Grid, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import InfoCard from '../components/InfoCard';
import { STATUSES, STATUS_HELP, STATUS_LABEL } from '../constants';
import { colors } from '../theme';
import { awareness } from './awarenessData';

export default function HomePage() {
  return (
    <>
      <Box sx={{ bgcolor: colors.wash, borderBottom: `1px solid ${colors.line}` }}>
        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 9 } }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography sx={{ color: colors.teal, fontWeight: 600, mb: 1.5 }}>Integrated Child Labour Reporting, Protection & Rehabilitation Platform</Typography>
              <Typography variant="h1" component="h1" sx={{ color: colors.ink }}>Every Child Deserves a Childhood, Not a Workplace.</Typography>
              <Typography sx={{ mt: 2.5, fontSize: '1.15rem', maxWidth: 580 }} color="text.secondary">
                Report child labour, exploitation, forced work, domestic labour, street vending, begging, and other situations involving children.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
                <Button component={RouterLink} to="/report" variant="contained" color="primary" size="large">Report a Case</Button>
                <Button component={RouterLink} to="/report?anonymous=1" variant="outlined" color="primary" size="large">Report Anonymously</Button>
                <Button component={RouterLink} to="/track" variant="text" color="secondary" size="large">Track Existing Case</Button>
              </Stack>
              <Typography sx={{ mt: 3, fontWeight: 600, color: colors.ink }}>Every Report Matters. Every Child Deserves a Future.</Typography>
            </Grid>
            <Grid item xs={12} md={5}>
              <Card sx={{ borderColor: colors.line }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h4" component="h2">What happens to a report</Typography>
                  <Box component="ol" sx={{ listStyle: 'none', m: 0, mt: 2, p: 0, position: 'relative', '&::before': { content: '""', position: 'absolute', left: 9, top: 10, bottom: 10, width: 2, bgcolor: colors.line } }}>
                    {STATUSES.map((s, i) => (
                      <Box component="li" key={s} sx={{ display: 'flex', gap: 2, py: 0.9, position: 'relative' }}>
                        <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: i === 0 ? colors.teal : '#fff', border: `2px solid ${colors.teal}`, flexShrink: 0, mt: 0.25, zIndex: 1 }} />
                        <Typography sx={{ fontWeight: i === 0 ? 700 : 500 }}>{STATUS_LABEL[s]}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>You can follow your report through these stages with a Tracking ID and PIN.</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 8 }}>
        <Typography variant="h2" component="h2" sx={{ color: colors.ink }}>Not all child labour looks the same. Every report matters.</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 4, maxWidth: 720 }}>
          Child labour is not limited to factories. If a child is working in a way that harms them, keeps them from school, or is forced, you can report it.
        </Typography>
        <Grid container spacing={2.5}>
          {awareness.map((a) => (
            <Grid item xs={12} sm={6} md={3} key={a.title}><InfoCard icon={a.icon} title={a.title}>{a.text}</InfoCard></Grid>
          ))}
        </Grid>
      </Container>

      <Container maxWidth="lg" sx={{ mt: 8 }}>
        <Card sx={{ bgcolor: colors.ink, color: '#fff', borderColor: colors.ink }}>
          <CardContent sx={{ p: { xs: 3, md: 5 } }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={8}>
                <Typography variant="h3" component="h2">You do not have to give your name.</Typography>
                <Typography sx={{ mt: 1, color: '#C9D6E3' }}>
                  Report anonymously and you receive a Tracking ID and a secret PIN. We never show the child's exact location publicly.
                </Typography>
              </Grid>
              <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
                <Button component={RouterLink} to="/report?anonymous=1" variant="contained" color="secondary" size="large">Report Anonymously</Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>{STATUS_HELP.SUBMITTED}</Typography>
      </Container>
    </>
  );
}
