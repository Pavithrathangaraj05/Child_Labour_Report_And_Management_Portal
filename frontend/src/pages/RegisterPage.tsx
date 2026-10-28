import {
  Alert, Box, Button, Card, CardContent, Container, Link, Stack, TextField, Typography, CircularProgress,
} from '@mui/material';
import MarkEmailReadOutlined from '@mui/icons-material/MarkEmailReadOutlined';
import KeyOutlined from '@mui/icons-material/KeyOutlined';
import { useMutation } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import AppButton from '../components/AppButton';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../theme';

export default function RegisterPage() {
  const nav = useNavigate();
  const { login: setAuthSession } = useAuth() as any;

  // Step 1: Form details, Step 2: OTP verification
  const [step, setStep] = useState<'DETAILS' | 'OTP'>('DETAILS');
  const [f, setF] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    otp: '',
  });
  const [demoOtpHint, setDemoOtpHint] = useState<string>('');
  const [localError, setLocalError] = useState<string>('');

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError('');
    setF({ ...f, [k]: e.target.value });
  };

  // Mutation 1: Send OTP to Email
  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const resp = await api.post<{ success: boolean; message: string; demoOtp?: string }>('/auth/send-otp', {
        email: f.email,
      });
      return resp.data;
    },
    onSuccess: (data) => {
      if (data.demoOtp) {
        setDemoOtpHint(data.demoOtp);
      }
      setStep('OTP');
    },
  });

  // Mutation 2: Verify OTP and Register
  const registerMutation = useMutation({
    mutationFn: async () => {
      const resp = await api.post('/auth/register', {
        name: f.name,
        email: f.email,
        phone: f.phone || undefined,
        password: f.password,
        confirmPassword: f.confirmPassword,
        otp: f.otp,
      });
      return resp.data;
    },
    onSuccess: (data) => {
      // Set session if returned
      if (data.accessToken && setAuthSession) {
        setAuthSession(data.accessToken, data.user);
      }
      nav('/dashboard/citizen', { replace: true });
    },
  });

  const handleSendOtp = (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (f.password !== f.confirmPassword) {
      setLocalError('Passwords do not match. Please re-enter identical passwords.');
      return;
    }
    if (f.password.length < 10) {
      setLocalError('Password must be at least 10 characters with upper case, lower case, and a digit.');
      return;
    }

    sendOtpMutation.mutate();
  };

  const handleVerifyOtp = (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!f.otp || f.otp.trim().length !== 6) {
      setLocalError('Please enter the 6-digit OTP code sent to your email.');
      return;
    }
    registerMutation.mutate();
  };

  return (
    <Container maxWidth="xs" sx={{ pt: 6, pb: 8 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          {step === 'DETAILS' ? (
            <Stack component="form" onSubmit={handleSendOtp} spacing={2.5}>
              <Typography variant="h3" component="h1">Create Citizen Account</Typography>
              <Typography variant="body2" color="text.secondary">
                Register as a vigilant citizen to follow your reports end-to-end, upload follow-up evidence, and join community child labour prevention drives.
              </Typography>

              {localError && <Alert severity="error">{localError}</Alert>}
              {sendOtpMutation.isError && <Alert severity="error">{errorMessage(sendOtpMutation.error)}</Alert>}

              <TextField
                label="Full Name"
                value={f.name}
                onChange={set('name')}
                required
              />
              <TextField
                label="Email Address"
                type="email"
                value={f.email}
                onChange={set('email')}
                required
                helperText="We will send a 6-digit verification OTP to this email."
              />
              <TextField
                label="Phone (optional)"
                value={f.phone}
                onChange={set('phone')}
                placeholder="+91 98765 43210"
              />
              <TextField
                label="Password"
                type="password"
                autoComplete="new-password"
                value={f.password}
                onChange={set('password')}
                required
                helperText="At least 10 characters with upper case, lower case and a digit."
              />
              <TextField
                label="Confirm Password"
                type="password"
                autoComplete="new-password"
                value={f.confirmPassword}
                onChange={set('confirmPassword')}
                required
                error={!!f.confirmPassword && f.password !== f.confirmPassword}
                helperText={f.confirmPassword && f.password !== f.confirmPassword ? 'Passwords do not match' : ''}
              />

              <AppButton
                type="submit"
                variant="contained"
                size="large"
                loading={sendOtpMutation.isPending}
                startIcon={<MarkEmailReadOutlined />}
              >
                Send Verification OTP
              </AppButton>

              <Typography variant="body2">
                Already registered? <Link component={RouterLink} to="/login">Sign in</Link>
              </Typography>
            </Stack>
          ) : (
            <Stack component="form" onSubmit={handleVerifyOtp} spacing={2.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <KeyOutlined sx={{ color: colors.teal, fontSize: 32 }} />
                <Typography variant="h3" component="h1">Verify Email via OTP</Typography>
              </Stack>

              <Typography variant="body2" color="text.secondary">
                We sent a 6-digit verification code to <b>{f.email}</b>. Please enter the code below to activate your account.
              </Typography>

              {demoOtpHint && (
                <Alert severity="info" sx={{ fontSize: 13 }}>
                  Demo OTP code: <b>{demoOtpHint}</b> (In production, sent via email).
                </Alert>
              )}

              {localError && <Alert severity="error">{localError}</Alert>}
              {registerMutation.isError && <Alert severity="error">{errorMessage(registerMutation.error)}</Alert>}

              <TextField
                label="6-Digit OTP Code"
                placeholder="123456"
                value={f.otp}
                onChange={(e) => setF({ ...f, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                required
                autoFocus
                inputProps={{ inputMode: 'numeric', maxLength: 6, style: { fontSize: 24, letterSpacing: 8, textAlign: 'center' } }}
              />

              <AppButton
                type="submit"
                variant="contained"
                size="large"
                loading={registerMutation.isPending}
              >
                Verify & Create Account
              </AppButton>

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Button
                  size="small"
                  disabled={sendOtpMutation.isPending}
                  onClick={() => sendOtpMutation.mutate()}
                >
                  Resend OTP
                </Button>
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => setStep('DETAILS')}
                >
                  Change Email
                </Button>
              </Stack>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
