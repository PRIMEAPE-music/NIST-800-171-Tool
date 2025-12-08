import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Box,
  Typography,
  TablePagination,
  Checkbox,
} from '@mui/material';
import { Edit, Delete, Visibility, Warning } from '@mui/icons-material';
import { POAMStatusChip } from './POAMStatusChip';
import { POAMPriorityChip } from './POAMPriorityChip';
import { PoamWithControl } from '../../types/poam.types';
import { format, isPast } from 'date-fns';

interface POAMListProps {
  poams: PoamWithControl[];
  onView: (poam: PoamWithControl) => void;
  onEdit: (poam: PoamWithControl) => void;
  onDelete: (poam: PoamWithControl) => void;
  // New props for selection
  selectedIds?: number[];
  onSelectionChange?: (ids: number[]) => void;
  showCheckboxes?: boolean;
}

export const POAMList: React.FC<POAMListProps> = ({
  poams,
  onView,
  onEdit,
  onDelete,
  selectedIds = [],
  onSelectionChange,
  showCheckboxes = true,
}) => {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onSelectionChange?.(poams.map((p) => p.id));
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectOne = (poamId: number, checked: boolean) => {
    if (checked) {
      onSelectionChange?.([...selectedIds, poamId]);
    } else {
      onSelectionChange?.(selectedIds.filter((id) => id !== poamId));
    }
  };

  const isSelected = (poamId: number) => selectedIds.includes(poamId);
  const allSelected = poams.length > 0 && selectedIds.length === poams.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < poams.length;

  const isOverdue = (poam: PoamWithControl) => {
    return (
      poam.targetCompletionDate &&
      isPast(new Date(poam.targetCompletionDate)) &&
      poam.status !== 'Completed'
    );
  };

  const paginatedPoams = poams.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Paper sx={{ bgcolor: '#242424' }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#1E1E1E' }}>
              {showCheckboxes && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={someSelected}
                    checked={allSelected}
                    onChange={handleSelectAll}
                    sx={{
                      color: '#90CAF9',
                      '&.Mui-checked': { color: '#90CAF9' },
                      '&.MuiCheckbox-indeterminate': { color: '#90CAF9' },
                    }}
                  />
                </TableCell>
              )}
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 600 }}>
                Control
              </TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 600 }}>
                Gap Description
              </TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 600 }}>
                Priority
              </TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 600 }}>
                Status
              </TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 600 }}>
                Assigned To
              </TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 600 }}>
                Target Date
              </TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 600 }}>
                Progress
              </TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 600 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedPoams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showCheckboxes ? 9 : 8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No POAMs found. Create one to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedPoams.map((poam) => {
                const completedMilestones = poam.milestones.filter(
                  (m) => m.status === 'Completed'
                ).length;
                const totalMilestones = poam.milestones.length;
                const progress =
                  totalMilestones > 0
                    ? Math.round((completedMilestones / totalMilestones) * 100)
                    : 0;

                return (
                  <TableRow
                    key={poam.id}
                    hover
                    sx={{
                      '&:hover': { bgcolor: '#2C2C2C' },
                      bgcolor: isOverdue(poam)
                        ? 'rgba(244, 67, 54, 0.05)'
                        : isSelected(poam.id)
                        ? 'rgba(144, 202, 249, 0.08)'
                        : 'transparent',
                    }}
                  >
                    {showCheckboxes && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected(poam.id)}
                          onChange={(e) => handleSelectOne(poam.id, e.target.checked)}
                          sx={{
                            color: '#90CAF9',
                            '&.Mui-checked': { color: '#90CAF9' },
                          }}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ color: '#90CAF9', fontWeight: 500 }}
                        >
                          {poam.control.controlId}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {poam.control.family}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={poam.gapDescription} arrow>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 250,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {poam.gapDescription}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <POAMPriorityChip priority={poam.priority} />
                    </TableCell>
                    <TableCell>
                      <POAMStatusChip status={poam.status} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {poam.assignedTo || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {isOverdue(poam) && (
                          <Tooltip title="Overdue">
                            <Warning sx={{ color: '#F44336', fontSize: 18 }} />
                          </Tooltip>
                        )}
                        <Typography variant="body2">
                          {poam.targetCompletionDate
                            ? format(
                                new Date(poam.targetCompletionDate),
                                'MMM dd, yyyy'
                              )
                            : '-'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {progress}% ({completedMilestones}/{totalMilestones})
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => onView(poam)}
                            sx={{ color: '#90CAF9' }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => onEdit(poam)}
                            sx={{ color: '#FFA726' }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => onDelete(poam)}
                            sx={{ color: '#F44336' }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={poams.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        sx={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          bgcolor: '#1E1E1E',
        }}
      />
    </Paper>
  );
};
