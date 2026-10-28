import { Alert, AlertTitle, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import InboxOutlined from '@mui/icons-material/InboxOutlined';
import { ReactNode } from 'react';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <Stack alignItems="center" spacing={2} sx={{ py: 8 }} role="status" aria-live="polite">
      <CircularProgress size={32} color="secondary" /><Typography color="text.secondary">{label}…</Typography>
    </Stack>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert severity="error" action={onRetry && <Button color="inherit" size="small" onClick={onRetry}>Try again</Button>} sx={{ my: 2 }}>
      <AlertTitle>That did not work</AlertTitle>{message}
    </Alert>
  );
}
export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <Box sx={{ textAlign: 'center', py: 7, px: 2 }}>
      <InboxOutlined sx={{ fontSize: 44, color: 'text.secondary' }} />
      <Typography variant="h5" sx={{ mt: 1 }}>{title}</Typography>
      {children && <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: 460, mx: 'auto' }}>{children}</Typography>}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  );
}
