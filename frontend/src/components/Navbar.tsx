import { AppBar, Box, Button, Drawer, IconButton, List, ListItemButton, ListItemText, Stack, Toolbar, Typography } from '@mui/material';
import Menu from '@mui/icons-material/Menu';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import { useState } from 'react';
import { Link as RouterLink, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../theme';

const links = [
  ['/', 'Home'], ['/report', 'Report a Case'], 
  ['/how-it-works', 'How It Works'],
  ['/awareness', 'Child Labour Awareness'], ['/transparency', 'Public Transparency'],
  ['/emergency', 'Emergency Help'], ['/track', 'Track Complaint'],
] as const;

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'CITIZEN') return '/dashboard/citizen';
    if (user.role === 'POLICE') return '/dashboard/police';
    if (user.role === 'LABOUR') return '/dashboard/labour';
    if (user.role === 'CWC') return '/dashboard/cwc';
    if (user.role === 'NGO') return '/dashboard/ngo';
    if (user.role === 'GOVERNMENT') return '/dashboard/government';
    return '/staff';
  };

  return (
    <>
      <Box sx={{ bgcolor: colors.ink, color: '#fff', fontSize: 14, py: 0.75, px: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ maxWidth: 1200, mx: 'auto' }} flexWrap="wrap" gap={1}>
          <span>Child in danger right now? Call police on <b>112</b> or Childline on <b>1098</b>.</span>
          <Button component={RouterLink} to="/emergency" size="small" variant="contained" color="error" sx={{ minHeight: 28, py: 0, px: 1.5 }}>Emergency help</Button>
        </Stack>
      </Box>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: `1px solid ${colors.line}` }}>
        <Toolbar sx={{ maxWidth: 1200, width: '100%', mx: 'auto', gap: 2 }}>
          <Stack component={RouterLink} to="/" direction="row" alignItems="center" spacing={1} sx={{ textDecoration: 'none', color: colors.ink, mr: 'auto' }} aria-label="CHILD-SAFE home">
            <ShieldOutlined sx={{ color: colors.teal, fontSize: 32 }} />
            <Box>
              <Typography sx={{ fontFamily: '"Source Serif 4", serif', fontWeight: 700, fontSize: 22, lineHeight: 1 }}>CHILD-SAFE</Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>Child labour reporting & protection</Typography>
            </Box>
          </Stack>
          <Stack component="nav" aria-label="Main" direction="row" spacing={0.25} sx={{ display: { xs: 'none', lg: 'flex' } }}>
            {links.map(([to, label]) => (
              <Button key={to} component={NavLink} to={to} end={to === '/'} color="inherit" size="small"
                sx={{ '&.active': { color: colors.blue, boxShadow: `inset 0 -3px 0 ${colors.teal}`, borderRadius: 0 } }}>{label}</Button>
            ))}

            {user ? (
              <>
                {user.role !== 'CITIZEN' && (
                  <>
                    <Button component={RouterLink} to="/analytics" color="inherit" size="small">Analytics</Button>
                    <Button component={RouterLink} to="/risk-map" color="inherit" size="small">Risk Map</Button>
                    <Button component={RouterLink} to="/reports" color="inherit" size="small">Reports</Button>
                    {['ADMIN', 'GOVERNMENT'].includes(user.role) && (
                      <Button component={RouterLink} to="/security" color="inherit" size="small">Security</Button>
                    )}
                  </>
                )}
                <Button component={RouterLink} to={getDashboardPath()} variant="contained" size="small" sx={{ ml: 1 }}>
                  {user.role === 'CITIZEN' ? 'Citizen Dashboard' : `${user.role} Dashboard`}
                </Button>
                <Button variant="outlined" size="small" sx={{ ml: 1 }} onClick={() => logout().then(() => nav('/'))}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button component={RouterLink} to="/login" variant="contained" size="small" sx={{ ml: 1 }}>
                  Login
                </Button>
                <Button component={RouterLink} to="/register" variant="outlined" size="small" sx={{ ml: 1 }}>
                  Register
                </Button>
              </>
            )}
          </Stack>
          <IconButton sx={{ display: { lg: 'none' } }} onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></IconButton>
        </Toolbar>
      </AppBar>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <List sx={{ width: 280 }} component="nav" aria-label="Mobile">
          {links.map(([to, label]) => (
            <ListItemButton key={to} component={RouterLink} to={to} onClick={() => setOpen(false)}><ListItemText primary={label} /></ListItemButton>
          ))}
          {user ? (
            <>
              <ListItemButton onClick={() => { setOpen(false); nav(getDashboardPath()); }}>
                <ListItemText primary={user.role === 'CITIZEN' ? 'Citizen Dashboard' : `${user.role} Dashboard`} primaryTypographyProps={{ fontWeight: 700 }} />
              </ListItemButton>
              <ListItemButton onClick={() => { setOpen(false); logout().then(() => nav('/')); }}>
                <ListItemText primary="Sign out" />
              </ListItemButton>
            </>
          ) : (
            <>
              <ListItemButton onClick={() => { setOpen(false); nav('/login'); }}><ListItemText primary="Login" /></ListItemButton>
              <ListItemButton onClick={() => { setOpen(false); nav('/register'); }}><ListItemText primary="Register" /></ListItemButton>
            </>
          )}
        </List>
      </Drawer>
    </>
  );
}
