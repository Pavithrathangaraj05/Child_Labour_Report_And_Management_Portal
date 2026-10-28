import { Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from '@mui/material';
import Close from '@mui/icons-material/Close';
import { ReactNode } from 'react';
import AppButton from './AppButton';

export default function Modal({ open, title, onClose, children, actions, maxWidth = 'md' }:
  { open: boolean; title: string; onClose: () => void; children: ReactNode; actions?: ReactNode; maxWidth?: 'sm' | 'md' | 'lg' }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={maxWidth} aria-labelledby="modal-title">
      <DialogTitle id="modal-title" sx={{ pr: 6 }}>
        {title}
        <IconButton aria-label="Close" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions>{actions ?? <AppButton onClick={onClose}>Close</AppButton>}</DialogActions>
    </Dialog>
  );
}
