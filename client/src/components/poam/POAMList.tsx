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
}

export const POAMList: React.FC<POAMListProps> = ({
  poams,
  onView,
  onEdit,
  onDelete,
}) => {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

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
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
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
                      bgcolor: isOverdue(poam) ? 'rgba(244, 67, 54, 0.05)' : 'transparent',
                    }}
                  >
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
