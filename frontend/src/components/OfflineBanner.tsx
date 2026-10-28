import { useEffect, useState } from 'react';
import { Alert, Box, Button, Collapse, Stack, Typography } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import SyncIcon from '@mui/icons-material/Sync';
import { flushOfflineQueue, getQueuedActions } from '../utils/offlineQueue';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setQueuedCount(getQueuedActions().length);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setQueuedCount(getQueuedActions().length);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      await flushOfflineQueue();
      setQueuedCount(getQueuedActions().length);
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && queuedCount === 0) return null;

  return (
    <Box sx={{ width: '100%', position: 'sticky', top: 0, zIndex: 1300 }}>
      <Collapse in={!isOnline || queuedCount > 0}>
        <Alert
          severity={!isOnline ? 'warning' : 'info'}
          icon={!isOnline ? <WifiOffIcon /> : <SyncIcon />}
          action={
            isOnline && queuedCount > 0 ? (
              <Button color="inherit" size="small" onClick={triggerSync} disabled={syncing}>
                {syncing ? 'Syncing...' : `Sync Now (${queuedCount})`}
              </Button>
            ) : undefined
          }
          sx={{ borderRadius: 0, fontWeight: 600 }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
            <Typography variant="body2" fontWeight={700}>
              {!isOnline
                ? 'Offline — Data will sync automatically when connection is restored.'
                : `Connected! ${queuedCount} offline action(s) ready to synchronize.`}
            </Typography>
            {queuedCount > 0 && !isOnline && (
              <Typography variant="caption">({queuedCount} actions currently queued locally)</Typography>
            )}
          </Stack>
        </Alert>
      </Collapse>
    </Box>
  );
}
