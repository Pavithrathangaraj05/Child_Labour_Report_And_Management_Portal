import { Chip } from '@mui/material';
import WarningAmber from '@mui/icons-material/WarningAmber';
import { colors } from '../theme';

export default function RiskBadge({ emergency, risk, level }: { emergency?: boolean; risk?: string; level?: string }) {
  const currentRisk = risk || level;
  if (emergency) {
    return <Chip size="small" icon={<WarningAmber />} label="Emergency reported" sx={{ bgcolor: colors.emergency, color: '#fff', fontWeight: 700, '& .MuiChip-icon': { color: '#fff' } }} />;
  }
  if (currentRisk === 'CRITICAL') {
    return <Chip size="small" label="CRITICAL" sx={{ bgcolor: '#dc2626', color: '#fff', fontWeight: 700 }} />;
  }
  if (currentRisk === 'HIGH') {
    return <Chip size="small" label="HIGH" sx={{ bgcolor: '#ea580c', color: '#fff', fontWeight: 700 }} />;
  }
  if (currentRisk === 'MEDIUM') {
    return <Chip size="small" label="MEDIUM" sx={{ bgcolor: '#d97706', color: '#fff', fontWeight: 700 }} />;
  }
  if (currentRisk === 'LOW') {
    return <Chip size="small" label="LOW" sx={{ bgcolor: '#16a34a', color: '#fff', fontWeight: 700 }} />;
  }
  return <Chip size="small" variant="outlined" label="Standard" />;
}
