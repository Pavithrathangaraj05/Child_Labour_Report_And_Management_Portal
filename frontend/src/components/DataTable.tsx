import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { ReactNode } from 'react';

export interface Column<T> { header: string; render: (row: T) => ReactNode; width?: number | string }

export default function DataTable<T>({ rows, columns, rowKey, onRowClick, caption }:
  { rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; onRowClick?: (r: T) => void; caption: string }) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="medium" aria-label={caption}>
        <TableHead>
          <TableRow sx={{ bgcolor: 'background.default' }}>
            {columns.map((c) => <TableCell key={c.header} sx={{ fontWeight: 700, width: c.width }}>{c.header}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={rowKey(r)} hover={!!onRowClick} onClick={() => onRowClick?.(r)}
              onKeyDown={(e) => { if (onRowClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onRowClick(r); } }}
              tabIndex={onRowClick ? 0 : undefined} sx={{ cursor: onRowClick ? 'pointer' : 'default' }}>
              {columns.map((c) => <TableCell key={c.header}>{c.render(r)}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
