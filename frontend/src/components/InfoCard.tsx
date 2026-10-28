import { Card, CardContent, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';
import { colors } from '../theme';

export default function InfoCard({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <Card sx={{ height: '100%', borderColor: colors.line }}>
      <CardContent>
        <Stack spacing={1.25}>
          {icon && <span style={{ color: colors.teal, display: 'flex' }} aria-hidden>{icon}</span>}
          <Typography variant="h5" component="h3">{title}</Typography>
          {children && <Typography color="text.secondary">{children}</Typography>}
        </Stack>
      </CardContent>
    </Card>
  );
}
