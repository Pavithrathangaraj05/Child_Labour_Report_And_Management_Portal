import { Box, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import FolderOpen from '@mui/icons-material/FolderOpen';
import People from '@mui/icons-material/People';
import Apartment from '@mui/icons-material/Apartment';
import Dashboard from '@mui/icons-material/Dashboard';
import LocalPolice from '@mui/icons-material/LocalPolice';
import Business from '@mui/icons-material/Business';
import EscalatorWarning from '@mui/icons-material/EscalatorWarning';
import AccountBalance from '@mui/icons-material/AccountBalance';
import { NavLink } from 'react-router-dom';
import type { Role } from '../api/types';
import { colors } from '../theme';

export default function Sidebar({ role }: { role: Role }) {
  const getDashboardLink = () => {
    switch (role) {
      case 'POLICE': return { to: '/dashboard/police', label: 'Police Desk', icon: <LocalPolice /> };
      case 'LABOUR': return { to: '/dashboard/labour', label: 'Labour Desk', icon: <Business /> };
      case 'CWC': return { to: '/dashboard/cwc', label: 'CWC Bench', icon: <EscalatorWarning /> };
      case 'GOVERNMENT': return { to: '/dashboard/government', label: 'Govt Oversight', icon: <AccountBalance /> };
      default: return { to: '/staff', label: 'Dashboard', icon: <Dashboard /> };
    }
  };

  const items = [
    ...(role !== 'ADMIN' ? [getDashboardLink()] : []),
    ...(role !== 'ADMIN' ? [{ to: '/staff/cases', label: 'All Cases', icon: <FolderOpen /> }] : []),
    ...(role === 'ADMIN' ? [{ to: '/staff/users', label: 'Users', icon: <People /> }] : []),
    { to: '/staff/agencies', label: 'Agencies', icon: <Apartment /> },
  ];

  return (
    <Box component="nav" aria-label="Staff" sx={{ width: { md: 220 }, flexShrink: 0, borderRight: { md: `1px solid ${colors.line}` }, borderBottom: { xs: `1px solid ${colors.line}`, md: 0 }, bgcolor: '#fff' }}>
      <Typography sx={{ px: 2, pt: 2, pb: 0.5, color: 'text.secondary', fontSize: 14 }}>
        Signed in as <b>{role}</b>
      </Typography>
      <List sx={{ display: 'flex', flexDirection: { xs: 'row', md: 'column' }, p: 1 }}>
        {items.map((i) => (
          <ListItemButton key={i.to} component={NavLink} to={i.to} sx={{ borderRadius: 1, '&.active': { bgcolor: colors.wash, color: colors.blue, fontWeight: 700 } }}>
            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>{i.icon}</ListItemIcon>
            <ListItemText primary={i.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
