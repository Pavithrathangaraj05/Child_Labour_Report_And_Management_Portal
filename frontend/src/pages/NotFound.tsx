import { Container } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Button } from '@mui/material';
import { EmptyState } from '../components/States';

export default function NotFound() {
  return <Container maxWidth="sm"><EmptyState title="Page not found" action={<Button component={RouterLink} to="/" variant="contained">Go to home</Button>}>The page you are looking for does not exist or has moved.</EmptyState></Container>;
}
