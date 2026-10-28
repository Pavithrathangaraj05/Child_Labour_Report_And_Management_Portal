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

function validatePassword(pw: string): string | null {
  if (pw.length < 10) {
    return 'Password must be at least 10 characters long.';
  }
  if (!/[a-z]/.test(pw)) {
    return 'Password must include at least one lowercase letter (a-z).';
  }
  if (!/[A-Z]/.test(pw)) {
    return 'Password must include at least one uppercase letter (A-Z).';
  }
  if (!/\d/.test(pw)) {
    return 'Password must include at least one number (0-9).';
  }
  return null;
}

export default function RegisterPage() {
  const nav = useNavigate();
  const { login: setAuthSession } = useAuth() as any;

  // Step 1: Form details, Step 2: OTP verification
  const [step, setStep] = useState<'DETAILS' | 'OTP'>('DETAILS');
  const [showPasswordEdit, setShowPasswordEdit] = useState<boolean>(false);
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
      setDemoOtpHint(data.demoOtp || '');
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
    const pwErr = validatePassword(f.password);
    if (pwErr) {
      setLocalError(pwErr);
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
    if (f.password !== f.confirmPassword) {
      setLocalError('Passwords do not match. Please ensure both passwords match.');
      setShowPasswordEdit(true);
      return;
    }
    const pwErr = validatePassword(f.password);
    if (pwErr) {
      setLocalError(pwErr);
      setShowPasswordEdit(true);
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
                helperText="At least 10 characters with uppercase (A-Z), lowercase (a-z) and a digit (0-9)."
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

              {f.email && (
                <Button size="small" variant="text" color="secondary" onClick={() => setStep('OTP')}>
                  Already received code? Enter OTP
                </Button>
              )}

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
                We sent a 6-digit verification code to <b>{f.email}</b>. Please enter the code below to confirm your email and activate your account.
              </Typography>

              {!demoOtpHint && (
                <Alert severity="success" sx={{ fontSize: 13 }}>
                  Verification code dispatched to <b>{f.email}</b>. Please check your inbox (and spam/junk folder).
                </Alert>
              )}

              {/* {demoOtpHint && (
                // <Alert severity="info" sx={{ fontSize: 13 }}>
                //   Demo OTP code: <b>{demoOtpHint}</b> (In production with SMTP configured, sent directly via email).
                // </Alert>
              )} */}

              {localError && <Alert severity="error">{localError}</Alert>}
              {sendOtpMutation.isError && <Alert severity="error">{errorMessage(sendOtpMutation.error)}</Alert>}
              {registerMutation.isError && (
                <Alert severity="error">
                  {errorMessage(registerMutation.error)}
                  <Box sx={{ mt: 1 }}>
                    <Button size="small" variant="outlined" color="inherit" onClick={() => setShowPasswordEdit(true)}>
                      Update Password Below
                    </Button>
                  </Box>
                </Alert>
              )}

              {showPasswordEdit && (
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #cbd5e1' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: '#0f172a' }}>
                    Set Password Meeting Security Policy:
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    Must have 10+ characters, 1 uppercase (A-Z), 1 lowercase (a-z), and 1 number (0-9).
                  </Typography>
                  <Stack spacing={1.5}>
                    <TextField
                      label="Password"
                      type="password"
                      size="small"
                      value={f.password}
                      onChange={set('password')}
                      required
                    />
                    <TextField
                      label="Confirm Password"
                      type="password"
                      size="small"
                      value={f.confirmPassword}
                      onChange={set('confirmPassword')}
                      error={!!f.confirmPassword && f.password !== f.confirmPassword}
                      helperText={f.confirmPassword && f.password !== f.confirmPassword ? 'Passwords do not match' : ''}
                      required
                    />
                  </Stack>
                </Box>
              )}

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
                  onClick={() => {
                    setLocalError('');
                    sendOtpMutation.mutate();
                  }}
                >
                  {sendOtpMutation.isPending ? 'Sending...' : 'Resend OTP'}
                </Button>
                <Button
                  size="small"
                  color={showPasswordEdit ? 'inherit' : 'primary'}
                  onClick={() => setShowPasswordEdit((v) => !v)}
                >
                  {showPasswordEdit ? 'Hide Password' : 'Edit Password'}
                </Button>
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => setStep('DETAILS')}
                >
                  Edit Details
                </Button>
              </Stack>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
