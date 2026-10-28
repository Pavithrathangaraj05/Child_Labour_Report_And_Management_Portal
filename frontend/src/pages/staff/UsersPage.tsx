import { Alert, Box, Button, Chip, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../../api/client';
import type { User } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import DataTable from '../../components/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';

export default function UsersPage() {
  const { user: me } = useAuth(); const qc = useQueryClient();
  const q = useQuery({ queryKey: ['users'], queryFn: async () => (await api.get<{ items: User[] }>('/users')).data.items });
  const toggle = useMutation({
    mutationFn: (u: User) => api.patch(`/users/${u.id}`, { status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: '1.7rem', mb: 3 }}>Users</Typography>
      {toggle.isError && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(toggle.error)}</Alert>}
      {q.isLoading && <LoadingState label="Loading users" />}
      {q.isError && <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />}
      {q.data && (q.data.length === 0 ? <EmptyState title="No users" /> :
        <DataTable caption="Users" rows={q.data} rowKey={(u) => u.id} columns={[
          { header: 'Name', render: (u) => u.name }, { header: 'Email', render: (u) => u.email },
          { header: 'Role', render: (u) => <Chip size="small" label={u.role} /> },
          { header: 'Status', render: (u) => <Chip size="small" color={u.status === 'ACTIVE' ? 'secondary' : 'default'} label={u.status} /> },
          { header: 'Last sign-in', render: (u) => (u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never') },
          { header: '', render: (u) => <Button size="small" disabled={u.id === me!.id || toggle.isPending} onClick={() => toggle.mutate(u)}>{u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}</Button> },
        ]} />)}
    </Box>
  );
}
