import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  IconButton,
  Toolbar,
  Typography,
  Button,
} from '@mui/material';
import {
  ArrowUpward,
  ArrowDownward,
  MoreVert,
  Refresh,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import BulkActionsDialog from './BulkActionsDialog';
import { Control } from '@/services/controlService';

interface ControlTableProps {
  controls: Control[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (column: string) => void;
  selectedControls: number[];
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: number, checked: boolean) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

export const ControlTable: React.FC<ControlTableProps> = ({
  controls,
  sortBy,
  sortOrder,
  onSortChange,
  selectedControls,
  onSelectAll,
  onSelectOne,
  page,
  totalPages,
  onPageChange,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  const allSelected = controls.length > 0 && selectedControls.length === controls.length;
  const someSelected = selectedControls.length > 0 && selectedControls.length < controls.length;

  const handleRowClick = (controlId: number) => {
    navigate(`/controls/${controlId}`);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? (
      <ArrowUpward fontSize="small" sx={{ ml: 0.5 }} />
    ) : (
      <ArrowDownward fontSize="small" sx={{ ml: 0.5 }} />
    );
  };

  return (
    <Paper sx={{ backgroundColor: '#242424' }}>
      {/* Toolbar with bulk actions */}
      {selectedControls.length > 0 && (
        <Toolbar sx={{ bgcolor: 'rgba(144, 202, 249, 0.1)' }}>
          <Typography variant="subtitle1" sx={{ flex: 1, color: '#E0E0E0' }}>
            {selectedControls.length} selected
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={() => setBulkDialogOpen(true)}
          >
            Bulk Actions
          </Button>
        </Toolbar>
      )}

      {/* Table */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#2C2C2C' }}>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  sx={{
                    color: '#B0B0B0',
                    '&.Mui-checked': { color: '#90CAF9' },
                    '&.MuiCheckbox-indeterminate': { color: '#90CAF9' },
                  }}
                />
              </TableCell>
              <TableCell
                sx={{ color: '#E0E0E0', fontWeight: 'bold', cursor: 'pointer' }}
                onClick={() => onSortChange('controlId')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Control ID
                  <SortIcon column="controlId" />
                </Box>
              </TableCell>
              <TableCell
                sx={{ color: '#E0E0E0', fontWeight: 'bold', cursor: 'pointer' }}
                onClick={() => onSortChange('family')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Family
                  <SortIcon column="family" />
                </Box>
              </TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 'bold' }}>Title</TableCell>
              <TableCell
                sx={{ color: '#E0E0E0', fontWeight: 'bold', cursor: 'pointer' }}
                onClick={() => onSortChange('priority')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Priority
                  <SortIcon column="priority" />
                </Box>
              </TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 'bold' }}>Assigned To</TableCell>
              <TableCell align="center" sx={{ color: '#E0E0E0', fontWeight: 'bold' }}>
                Evidence
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {controls.map((control) => (
              <TableRow
                key={control.id}
                hover
                selected={selectedControls.includes(control.id)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#2C2C2C' },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(144, 202, 249, 0.08)',
                    '&:hover': { backgroundColor: 'rgba(144, 202, 249, 0.12)' },
                  },
                }}
              >
                <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedControls.includes(control.id)}
                    onChange={(e) => onSelectOne(control.id, e.target.checked)}
                    sx={{
                      color: '#B0B0B0',
                      '&.Mui-checked': { color: '#90CAF9' },
                    }}
                  />
                </TableCell>
                <TableCell onClick={() => handleRowClick(control.id)}>
                  <Typography
                    variant="body2"
                    fontWeight="medium"
                    sx={{ color: '#90CAF9', fontFamily: 'monospace' }}
                  >
                    {control.controlId}
                  </Typography>
                </TableCell>
                <TableCell onClick={() => handleRowClick(control.id)}>
                  <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
                    {control.family}
                  </Typography>
                </TableCell>
                <TableCell onClick={() => handleRowClick(control.id)}>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 300, color: '#E0E0E0' }}>
                    {control.title}
                  </Typography>
                </TableCell>
                <TableCell onClick={() => handleRowClick(control.id)}>
                  <Typography
                    variant="body2"
                    sx={{
                      color:
                        control.priority === 'Critical'
                          ? '#EF5350'
                          : control.priority === 'High'
                          ? '#FFA726'
                          : '#B0B0B0',
                      fontWeight: control.priority === 'Critical' ? 600 : 400,
                    }}
                  >
                    {control.priority}
                  </Typography>
                </TableCell>
                <TableCell onClick={() => handleRowClick(control.id)}>
                  <StatusBadge status={control.status?.status || 'Not Started'} />
                </TableCell>
                <TableCell onClick={() => handleRowClick(control.id)}>
                  <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
                    {control.status?.assignedTo || '—'}
                  </Typography>
                </TableCell>
                <TableCell align="center" onClick={() => handleRowClick(control.id)}>
                  <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
                    {control.evidence?.length || 0}
                  </Typography>
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRowClick(control.id);
                    }}
                  >
                    <MoreVert fontSize="small" sx={{ color: '#B0B0B0' }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
        <Button
          startIcon={<Refresh />}
          onClick={onRefresh}
          size="small"
          sx={{ color: '#B0B0B0' }}
        >
          Refresh
        </Button>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button disabled={page === 1} onClick={() => onPageChange(page - 1)} size="small">
            Previous
          </Button>
          <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
            Page {page} of {totalPages}
          </Typography>
          <Button
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
            size="small"
          >
            Next
          </Button>
        </Box>
      </Box>

      {/* Bulk Actions Dialog */}
      <BulkActionsDialog
        open={bulkDialogOpen}
        onClose={() => setBulkDialogOpen(false)}
        selectedControlIds={selectedControls}
        onSuccess={() => {
          setBulkDialogOpen(false);
          onRefresh();
        }}
      />
    </Paper>
  );
};

export default ControlTable;
