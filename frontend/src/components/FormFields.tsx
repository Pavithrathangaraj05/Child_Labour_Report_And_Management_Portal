import { Box, Chip, FormControl, FormLabel, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';

/** Yes / No / Not sure, as a single accessible group. */
export function TriChoice({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <FormControl component="fieldset" sx={{ width: '100%' }}>
      <FormLabel component="legend" sx={{ color: 'text.primary', mb: 0.75 }}>{label}</FormLabel>
      <ToggleButtonGroup exclusive size="small" value={value} onChange={(_, v) => v && onChange(v)} aria-label={label} color="primary">
        <ToggleButton value="YES" sx={{ px: 2.5 }}>Yes</ToggleButton>
        <ToggleButton value="NO" sx={{ px: 2.5 }}>No</ToggleButton>
        <ToggleButton value="UNKNOWN" sx={{ px: 2.5 }}>Not sure</ToggleButton>
      </ToggleButtonGroup>
    </FormControl>
  );
}

export function ChipSelect({ label, options, value, onChange, helper }:
  { label: string; options: [string, string][]; value: string[]; onChange: (v: string[]) => void; helper?: string }) {
  const toggle = (k: string) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <FormControl component="fieldset" sx={{ width: '100%' }}>
      <FormLabel component="legend" sx={{ color: 'text.primary', mb: 1 }}>{label}</FormLabel>
      <Stack direction="row" flexWrap="wrap" gap={1} role="group" aria-label={label}>
        {options.map(([k, l]) => (
          <Chip key={k} label={l} clickable color={value.includes(k) ? 'primary' : 'default'} variant={value.includes(k) ? 'filled' : 'outlined'}
            onClick={() => toggle(k)} role="checkbox" aria-checked={value.includes(k)} sx={{ height: 40, fontSize: '0.95rem' }} />
        ))}
      </Stack>
      {helper && <Box sx={{ mt: 0.75, color: 'text.secondary', fontSize: 14 }}>{helper}</Box>}
    </FormControl>
  );
}
