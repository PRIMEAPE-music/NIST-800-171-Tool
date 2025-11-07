import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  IconButton,
  Collapse,
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { GapItem } from '../../services/assessmentService';

interface GapListProps {
  gaps: GapItem[];
}

type SortField = 'riskScore' | 'controlNumber' | 'priority';
type SortOrder = 'asc' | 'desc';

const GapList: React.FC<GapListProps> = ({ gaps }) => {
  const [sortField, setSortField] = useState<SortField>('riskScore');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterFamily, setFilterFamily] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Get unique families
  const families = Array.from(new Set(gaps.map((g) => g.family))).sort();

  // Filter gaps
  const filteredGaps = gaps.filter((gap) => {
    if (filterFamily !== 'all' && gap.family !== filterFamily) return false;
    if (filterPriority !== 'all' && gap.priority !== filterPriority) return false;
    return true;
  });

  // Sort gaps
  const sortedGaps = [...filteredGaps].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'riskScore') {
      comparison = a.riskScore - b.riskScore;
    } else if (sortField === 'controlNumber') {
      comparison = a.controlNumber.localeCompare(b.controlNumber);
    } else if (sortField === 'priority') {
      const priorityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      comparison =
        priorityOrder[a.priority as keyof typeof priorityOrder] -
        priorityOrder[b.priority as keyof typeof priorityOrder];
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 76) return '#F44336';
    if (riskScore >= 51) return '#FF9800';
    if (riskScore >= 26) return '#FFA726';
    return '#66BB6A';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'error';
      case 'High':
        return 'warning';
      case 'Medium':
        return 'info';
      case 'Low':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Card sx={{ bgcolor: 'background.paper' }}>
      <CardContent>
        {/* Filters */}
        <Box display="flex" gap={2} mb={3}>
          <TextField
            select
            label="Filter by Family"
            value={filterFamily}
            onChange={(e) => setFilterFamily(e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">All Families</MenuItem>
            {families.map((family) => (
              <MenuItem key={family} value={family}>
                {family}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Filter by Priority"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">All Priorities</MenuItem>
            <MenuItem value="Critical">Critical</MenuItem>
            <MenuItem value="High">High</MenuItem>
            <MenuItem value="Medium">Medium</MenuItem>
            <MenuItem value="Low">Low</MenuItem>
          </TextField>

          <Box flex={1} />

          <Typography variant="body2" color="text.secondary" alignSelf="center">
            Showing {sortedGaps.length} of {gaps.length} gaps
          </Typography>
        </Box>

        {/* Gap Table */}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width={50} />
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'controlNumber'}
                    direction={sortField === 'controlNumber' ? sortOrder : 'asc'}
                    onClick={() => handleSort('controlNumber')}
                  >
                    Control
                  </TableSortLabel>
                </TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Family</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'priority'}
                    direction={sortField === 'priority' ? sortOrder : 'asc'}
                    onClick={() => handleSort('priority')}
                  >
                    Priority
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'riskScore'}
                    direction={sortField === 'riskScore' ? sortOrder : 'asc'}
                    onClick={() => handleSort('riskScore')}
                  >
                    Risk Score
                  </TableSortLabel>
                </TableCell>
                <TableCell>Gap Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedGaps.map((gap) => (
                <React.Fragment key={gap.controlId}>
                  <TableRow hover>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setExpandedRow(expandedRow === gap.controlId ? null : gap.controlId)
                        }
                      >
                        {expandedRow === gap.controlId ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {gap.controlNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap maxWidth={300}>
                        {gap.controlTitle}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={gap.family} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={gap.priority}
                        size="small"
                        color={getPriorityColor(gap.priority) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: 'inline-block',
                          bgcolor: getRiskColor(gap.riskScore),
                          color: 'white',
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          fontWeight: 'bold',
                        }}
                      >
                        {gap.riskScore}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" noWrap maxWidth={300}>
                        {gap.gapDescription}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 0, borderBottom: 'none' }}>
                      <Collapse in={expandedRow === gap.controlId}>
                        <Box sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Gap Details:
                          </Typography>
                          <Box display="flex" gap={2} mb={2}>
                            <Chip
                              label={`Implemented: ${gap.isImplemented ? 'Yes' : 'No'}`}
                              size="small"
                              color={gap.isImplemented ? 'success' : 'error'}
                            />
                            <Chip
                              label={`Evidence: ${gap.hasEvidence ? 'Yes' : 'No'}`}
                              size="small"
                              color={gap.hasEvidence ? 'success' : 'error'}
                            />
                            <Chip
                              label={`Tested: ${gap.isTested ? 'Yes' : 'No'}`}
                              size="small"
                              color={gap.isTested ? 'success' : 'error'}
                            />
                            <Chip
                              label={`Meets Req: ${gap.meetsRequirement ? 'Yes' : 'No'}`}
                              size="small"
                              color={gap.meetsRequirement ? 'success' : 'error'}
                            />
                          </Box>
                          <Typography variant="body2">{gap.gapDescription}</Typography>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {sortedGaps.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary">No gaps match your filters</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default GapList;
