import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Collapse,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ControlCoverageWithMetadata, SortColumn, SortDirection } from '@/types/gapAnalysis.types';
import { ControlGapAccordion } from './ControlGapAccordion';

interface AllControlsTableProps {
  controls: ControlCoverageWithMetadata[];
  loading?: boolean;
}

export const AllControlsTable: React.FC<AllControlsTableProps> = ({ controls, loading }) => {
  const navigate = useNavigate();
  const [sortColumn, setSortColumn] = useState<SortColumn>('overallCoverage');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedControlId, setExpandedControlId] = useState<number | null>(null);

  // Sorting handler
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort controls based on current sort settings
  const sortedControls = React.useMemo(() => {
    const sorted = [...controls].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortColumn) {
        case 'controlId':
          aVal = a.controlId;
          bVal = b.controlId;
          break;
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'dodPoints':
          aVal = a.dodPoints;
          bVal = b.dodPoints;
          break;
        case 'overallCoverage':
          aVal = a.overallCoverage;
          bVal = b.overallCoverage;
          break;
        default:
          aVal = a.controlId;
          bVal = b.controlId;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [controls, sortColumn, sortDirection]);

  // Get color for DoD points badge
  const getDodPointsColor = (points: number): string => {
    switch (points) {
      case 5:
        return '#f44336'; // Red - Critical
      case 3:
        return '#ff9800'; // Orange - High
      case 1:
        return '#4caf50'; // Green - Medium
      case 0:
        return '#757575'; // Gray - Low/NA
      default:
        return '#757575';
    }
  };

  // Get color for coverage percentage
  const getCoverageColor = (coverage: number): string => {
    if (coverage >= 90) return '#4caf50'; // Green - Compliant
    if (coverage >= 70) return '#ff9800'; // Orange - Moderate
    if (coverage >= 50) return '#ff5722'; // Orange-Red - Needs Attention
    return '#f44336'; // Red - Critical
  };

  // Handle control ID click - navigate to control detail page
  const handleControlClick = (controlId: number) => {
    navigate(`/controls/${controlId}`);
  };

  // Handle row expansion
  const handleExpandClick = (controlId: number) => {
    setExpandedControlId(expandedControlId === controlId ? null : controlId);
  };

  // Render sort icon
  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? <KeyboardArrowUp /> : <KeyboardArrowDown />;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 6 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2, color: '#E0E0E0' }}>Loading controls...</Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ bgcolor: '#242424' }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '50px' }} />
            <TableCell
              sx={{ cursor: 'pointer', fontWeight: 600 }}
              onClick={() => handleSort('controlId')}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                Control ID
                {renderSortIcon('controlId')}
              </Box>
            </TableCell>
            <TableCell
              sx={{ cursor: 'pointer', fontWeight: 600 }}
              onClick={() => handleSort('title')}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                Title
                {renderSortIcon('title')}
              </Box>
            </TableCell>
            <TableCell
              align="center"
              sx={{ cursor: 'pointer', fontWeight: 600 }}
              onClick={() => handleSort('dodPoints')}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                DoD Points
                {renderSortIcon('dodPoints')}
              </Box>
            </TableCell>
            <TableCell
              align="center"
              sx={{ cursor: 'pointer', fontWeight: 600 }}
              onClick={() => handleSort('overallCoverage')}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                Overall Coverage
                {renderSortIcon('overallCoverage')}
              </Box>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedControls.map((control) => (
            <React.Fragment key={control.id}>
              {/* Main Row */}
              <TableRow
                sx={{
                  '&:hover': { bgcolor: '#2A2A2A' },
                  cursor: 'pointer',
                }}
              >
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleExpandClick(control.id)}
                    sx={{ color: '#90CAF9' }}
                  >
                    {expandedControlId === control.id ? <ExpandMoreIcon sx={{ transform: 'rotate(180deg)' }} /> : <ExpandMoreIcon />}
                  </IconButton>
                </TableCell>
                <TableCell>
                  <Chip
                    label={control.controlId}
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleControlClick(control.id);
                    }}
                    sx={{
                      bgcolor: '#1976d2',
                      color: '#fff',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: '#1565c0',
                      },
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ color: '#E0E0E0' }}>
                    {control.title}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={`${control.dodPoints} ${control.dodPoints === 1 ? 'pt' : 'pts'}`}
                    size="small"
                    sx={{
                      bgcolor: getDodPointsColor(control.dodPoints),
                      color: '#fff',
                      fontWeight: 600,
                    }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Typography
                    variant="body2"
                    sx={{
                      color: getCoverageColor(control.overallCoverage),
                      fontWeight: 600,
                    }}
                  >
                    {control.overallCoverage}%
                  </Typography>
                </TableCell>
              </TableRow>

              {/* Expanded Accordion Row */}
              <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                  <Collapse in={expandedControlId === control.id} timeout="auto" unmountOnExit>
                    <Box sx={{ py: 3, px: 2, bgcolor: '#1E1E1E' }}>
                      <ControlGapAccordion
                        controlId={control.controlId}
                        controlNumericId={control.id}
                        dodPoints={control.dodPoints}
                        title={control.title}
                      />
                    </Box>
                  </Collapse>
                </TableCell>
              </TableRow>
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
