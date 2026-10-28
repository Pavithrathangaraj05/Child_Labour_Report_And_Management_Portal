import {
  Alert, Box, Button, Card, CardContent, Container, Link, Stack, TextField, Typography
} from '@mui/material';
import LockOpen from '@mui/icons-material/LockOpen';
import Security from '@mui/icons-material/Security';
import { useMutation } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import AppButton from '../components/AppButton';

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const from = (useLocation().state as any)?.from as string | undefined;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpChallenge, setOtpChallenge] = useState<{ challengeId: string; demoOtp?: string; message?: string } | null>(null);

  const m = useMutation({
    mutationFn: async () => {
      if (!otpChallenge) {
        const res = await login(email.trim(), password);
        if (res.requiresOtp && res.challengeId) {
          setOtpChallenge({ challengeId: res.challengeId, demoOtp: res.demoOtp, message: res.message });
          return null;
        }
        return res.user;
      } else {
        const res = await login(email.trim(), password, otp.trim(), otpChallenge.challengeId);
        return res.user;
      }
    },
    onSuccess: (u) => {
      if (u) {
        nav(from ?? (u.role === 'CITIZEN' ? '/report' : '/staff'), { replace: true });
      }
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    m.mutate();
  };

  return (
    <Container maxWidth="xs" sx={{ pt: 8 }}>
      <Card>
        <CardContent component="form" onSubmit={submit} sx={{ p: 4 }}>
          <Stack spacing={2.5}>
            {!otpChallenge ? (
              <>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Security sx={{ color: '#1e3a8a', fontSize: 32 }} />
                  <Typography variant="h3" component="h1">Sign in</Typography>
                </Stack>
                <Typography color="text.secondary" variant="body2">
                  Official multi-agency enforcement portal and citizen access. Real-time OTP authentication is enforced for all roles.
                </Typography>

                {m.isError && <Alert severity="error">{errorMessage(m.error)}</Alert>}

                <TextField
                  label="Email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <TextField
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <AppButton type="submit" variant="contained" size="large" loading={m.isPending}>
                  Verify Credentials & Send OTP
                </AppButton>
                <Typography variant="body2">
                  New citizen account? <Link component={RouterLink} to="/register">Register</Link>
                </Typography>
              </>
            ) : (
              <>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <LockOpen sx={{ color: '#0d9488', fontSize: 32 }} />
                  <Typography variant="h3" component="h1">Real-Time OTP Verification</Typography>
                </Stack>

                <Alert severity="info" sx={{ bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  {otpChallenge.message || `A 6-digit real-time verification code has been dispatched to ${email}.`}
                </Alert>

                {m.isError && <Alert severity="error">{errorMessage(m.error)}</Alert>}

                <TextField
                  label="Enter 6-Digit OTP"
                  type="text"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  helperText={otpChallenge.demoOtp ? `Real-Time Demo Code: ${otpChallenge.demoOtp}` : 'Check your official email inbox'}
                  autoFocus
                  required
                />

                <AppButton type="submit" variant="contained" size="large" loading={m.isPending}>
                  Authenticate & Enter Dashboard
                </AppButton>

                <Button
                  variant="text"
                  size="small"
                  onClick={() => { setOtpChallenge(null); setOtp(''); }}
                >
                  Back to Sign In
                </Button>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
