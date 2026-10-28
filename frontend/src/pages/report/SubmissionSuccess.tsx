import { Alert, Box, Button, Card, CardContent, Container, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Print from '@mui/icons-material/Print';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import type { Submission } from '../../api/types';
import { colors } from '../../theme';

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <Box>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography sx={{ fontSize: 26, fontWeight: 700, fontFamily: mono ? 'ui-monospace, Menlo, monospace' : undefined, letterSpacing: mono ? 3 : 0, color: colors.ink }}>{value}</Typography>
        <Tooltip title={copied ? 'Copied' : `Copy ${label}`}>
          <IconButton aria-label={`Copy ${label}`} onClick={() => navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}><ContentCopy fontSize="small" /></IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}

export default function SubmissionSuccess({ s, uploadReport }: { s: Submission; uploadReport?: { ok: number; failed: string[] } }) {
  // Pre-filled track URL for convenient 1-click tracking by complainer
  const trackUrl = `/track?id=${encodeURIComponent(s.trackingId)}&pin=${encodeURIComponent(s.pin)}`;
  const qrUrl = `${window.location.origin}/track?id=${s.trackingId}`;

  return (
    <Container maxWidth="sm" sx={{ pt: 6, pb: 6 }}>
      <Card><CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
        <Stack spacing={3}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CheckCircle sx={{ color: colors.teal, fontSize: 40 }} />
            <Typography variant="h2" component="h1" sx={{ fontSize: '1.7rem' }}>Complaint Submitted Successfully</Typography>
          </Stack>

          {/* Explanation of WHO gives the PIN and WHY it is there */}
          <Box sx={{ p: 2, bgcolor: '#f0fdf4', border: `1px solid ${colors.teal}`, borderRadius: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <InfoOutlined sx={{ color: colors.teal, mt: 0.2 }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: colors.ink }}>
                  Who gives the Secure PIN & Why is it here?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  The <b>ChildSafe Intake Engine</b> generated this 6-digit Secret PIN specifically for your report.
                  It prevents unauthorized individuals or perpetrators from guessing your Tracking ID to view the child's case status.
                  Only you have this PIN for secure, confidential tracking.
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Alert severity="warning">
            <b>Save your PIN now.</b> It is shown here once. You need it with your Tracking ID to track updates anonymously.
          </Alert>

          <Field label="Case ID" value={s.caseId} />
          <Field label="Tracking ID" value={s.trackingId} />
          <Field label="Secure PIN" value={s.pin} mono />

          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ p: 1.5, border: `1px solid ${colors.line}`, borderRadius: 1, bgcolor: '#fff' }}>
              <QRCodeSVG value={qrUrl} size={116} title="QR code that opens the tracking page" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Scan with your phone to open the tracking page with your Tracking ID pre-filled. Keep your 6-digit PIN handy.
            </Typography>
          </Stack>

          {uploadReport && uploadReport.ok > 0 && <Alert severity="success">{uploadReport.ok} evidence file(s) attached.</Alert>}
          {uploadReport && uploadReport.failed.length > 0 && (
            <Alert severity="error">Your report was saved, but these files were not attached: {uploadReport.failed.join('; ')}.</Alert>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component={RouterLink} to={trackUrl} variant="contained" color="primary">
              Track this complaint now (1-Click)
            </Button>
            <Button variant="outlined" startIcon={<Print />} onClick={() => window.print()}>
              Print details
            </Button>
            <Button component={RouterLink} to="/" variant="text">
              Back to home
            </Button>
          </Stack>
        </Stack>
      </CardContent></Card>
    </Container>
  );
}
