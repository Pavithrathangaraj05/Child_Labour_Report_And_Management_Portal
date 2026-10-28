import { Box, Container, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink, Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import OfflineBanner from './OfflineBanner';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../theme';

export function PublicLayout() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <a href="#main" style={{ position: 'absolute', left: -9999 }} onFocus={(e) => (e.currentTarget.style.left = '8px')} onBlur={(e) => (e.currentTarget.style.left = '-9999px')}>Skip to content</a>
      <OfflineBanner />
      <Navbar />
      <Box component="main" id="main" sx={{ flex: 1 }}><Outlet /></Box>
      <Box component="footer" sx={{ bgcolor: colors.ink, color: '#C9D6E3', py: 4, mt: 8 }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
            <Box sx={{ maxWidth: 520 }}>
              <Typography sx={{ fontFamily: '"Source Serif 4", serif', fontWeight: 700, color: '#fff', fontSize: 20 }}>CHILD-SAFE</Typography>
              <Typography variant="body2">Every Report Matters. Every Child Deserves a Future.</Typography>
              <Typography variant="body2" sx={{ mt: 1.5, opacity: 0.8 }}>Prototype (Module 1). Demo data is fictional. Not connected to any government system.</Typography>
            </Box>
            <Stack spacing={0.5}>
              <Link component={RouterLink} to="/report" color="inherit">Report a case</Link>
              <Link component={RouterLink} to="/track" color="inherit">Track a complaint</Link>
              <Link component={RouterLink} to="/emergency" color="inherit">Emergency help</Link>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}

export function StaffLayout() {
  const { user } = useAuth();
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
        <Sidebar role={user!.role} />
        <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 4 }, minWidth: 0 }}><Outlet /></Box>
      </Box>
    </Box>
  );
}
