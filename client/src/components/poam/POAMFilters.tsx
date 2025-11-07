import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
} from '@mui/material';
import { FilterList, Clear } from '@mui/icons-material';
import { PoamFilters } from '../../types/poam.types';

interface POAMFiltersProps {
  filters: PoamFilters;
  onFiltersChange: (filters: PoamFilters) => void;
  onClearFilters: () => void;
}

export const POAMFilters: React.FC<POAMFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
}) => {
  const handleChange = (field: keyof PoamFilters, value: any) => {
    onFiltersChange({ ...filters, [field]: value || undefined });
  };

  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== ''
  );

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        flexWrap: 'wrap',
        alignItems: 'center',
        mb: 3,
        p: 2,
        bgcolor: '#1E1E1E',
        borderRadius: 1,
      }}
    >
      <FilterList sx={{ color: '#B0B0B0' }} />

      <FormControl sx={{ minWidth: 150 }} size="small">
        <InputLabel>Status</InputLabel>
        <Select
          value={filters.status || ''}
          label="Status"
          onChange={(e) => handleChange('status', e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="Open">Open</MenuItem>
          <MenuItem value="In Progress">In Progress</MenuItem>
          <MenuItem value="Completed">Completed</MenuItem>
          <MenuItem value="Risk Accepted">Risk Accepted</MenuItem>
        </Select>
      </FormControl>

      <FormControl sx={{ minWidth: 150 }} size="small">
        <InputLabel>Priority</InputLabel>
        <Select
          value={filters.priority || ''}
          label="Priority"
          onChange={(e) => handleChange('priority', e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="High">High</MenuItem>
          <MenuItem value="Medium">Medium</MenuItem>
          <MenuItem value="Low">Low</MenuItem>
        </Select>
      </FormControl>

      <TextField
        label="Assigned To"
        size="small"
        value={filters.assignedTo || ''}
        onChange={(e) => handleChange('assignedTo', e.target.value)}
        sx={{ minWidth: 200 }}
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={filters.overdue || false}
            onChange={(e) => handleChange('overdue', e.target.checked)}
          />
        }
        label="Overdue Only"
      />

      {hasActiveFilters && (
        <Button
          startIcon={<Clear />}
          onClick={onClearFilters}
          variant="outlined"
          size="small"
        >
          Clear Filters
        </Button>
      )}
    </Box>
  );
};
