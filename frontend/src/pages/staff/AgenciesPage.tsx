import { Box, Chip, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '../../api/client';
import type { Agency } from '../../api/types';
import DataTable from '../../components/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';

export default function AgenciesPage() {
  const q = useQuery({ queryKey: ['agencies'], queryFn: async () => (await api.get<{ items: Agency[] }>('/agencies')).data.items });
  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: '1.7rem', mb: 3 }}>Agencies</Typography>
      {q.isLoading && <LoadingState label="Loading agencies" />}
      {q.isError && <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />}
      {q.data && (q.data.length === 0 ? <EmptyState title="No agencies yet">Run the seed script to add fictional demo agencies.</EmptyState> :
        <DataTable caption="Agencies" rows={q.data} rowKey={(a) => a._id} columns={[
          { header: 'Name', render: (a) => a.name }, { header: 'Type', render: (a) => <Chip size="small" label={a.type} /> },
          { header: 'District', render: (a) => a.district }, { header: 'Contact', render: (a) => a.contact?.phone ?? 'Not listed' },
        ]} />)}
    </Box>
  );
}
