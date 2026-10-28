import { Button, ButtonProps, CircularProgress } from '@mui/material';

export default function AppButton({ loading, children, disabled, ...rest }: ButtonProps & { loading?: boolean; to?: string }) {
  return (
    <Button {...rest} disabled={disabled || loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : rest.startIcon}>
      {children}
    </Button>
  );
}
