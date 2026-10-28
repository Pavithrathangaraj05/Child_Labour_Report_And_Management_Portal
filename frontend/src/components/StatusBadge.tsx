import { Chip } from '@mui/material';
import { STATUS_LABEL } from '../constants';
import { colors } from '../theme';

const tone: Record<string, { bg: string; fg: string }> = {
  SUBMITTED: { bg: '#E3EDF7', fg: colors.blue }, UNDER_VERIFICATION: { bg: '#FFF1D6', fg: '#7A4B00' },
  VERIFIED: { bg: '#DDF1EE', fg: colors.teal }, ASSIGNED: { bg: '#DDF1EE', fg: colors.teal },
  INTERVENTION: { bg: '#E3E1F5', fg: '#3B3A8C' }, PROTECTION_REHABILITATION: { bg: '#DDF1EE', fg: '#0B5E5A' },
  CLOSED: { bg: '#E8ECEF', fg: '#4A5A68' },
};
export default function StatusBadge({ status }: { status: string }) {
  const t = tone[status] ?? tone.SUBMITTED;
  return <Chip size="small" label={STATUS_LABEL[status] ?? status} sx={{ bgcolor: t.bg, color: t.fg, fontWeight: 600 }} />;
}
