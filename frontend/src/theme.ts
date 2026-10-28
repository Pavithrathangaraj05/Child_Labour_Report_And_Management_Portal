import { createTheme } from '@mui/material/styles';

export const colors = { ink: '#0B2545', blue: '#1D4E89', teal: '#0B7A75', wash: '#EEF4F7', line: '#D3DEE6', emergency: '#C62828' };

export const theme = createTheme({
  palette: {
    primary: { main: colors.blue, dark: colors.ink },
    secondary: { main: colors.teal },
    error: { main: colors.emergency }, // red is reserved for emergencies and form errors
    background: { default: '#F7FAFC', paper: '#FFFFFF' },
    text: { primary: '#14263D', secondary: '#42566B' },
    divider: colors.line,
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: '"Source Sans 3", "Segoe UI", system-ui, sans-serif',
    fontSize: 16,
    h1: { fontFamily: '"Source Serif 4", Georgia, serif', fontWeight: 700, fontSize: 'clamp(2.1rem, 5vw, 3.4rem)', lineHeight: 1.12, letterSpacing: '-0.01em' },
    h2: { fontFamily: '"Source Serif 4", Georgia, serif', fontWeight: 700, fontSize: 'clamp(1.6rem, 3.2vw, 2.1rem)', lineHeight: 1.2 },
    h3: { fontFamily: '"Source Serif 4", Georgia, serif', fontWeight: 600, fontSize: '1.4rem' },
    h4: { fontFamily: '"Source Serif 4", Georgia, serif', fontWeight: 600, fontSize: '1.25rem' },
    h5: { fontWeight: 700, fontSize: '1.1rem' },
    h6: { fontWeight: 700, fontSize: '1rem' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 44, paddingInline: 20 } } },
    MuiCssBaseline: { styleOverrides: { 'a:focus-visible, button:focus-visible, [tabindex]:focus-visible': { outline: `3px solid ${colors.teal}`, outlineOffset: 2 } } },
    MuiTextField: { defaultProps: { fullWidth: true } },
    MuiCard: { defaultProps: { variant: 'outlined' } },
  },
});
