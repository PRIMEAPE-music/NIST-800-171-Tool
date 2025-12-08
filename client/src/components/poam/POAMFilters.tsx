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
  Autocomplete,
} from '@mui/material';
import { FilterList, Clear } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { PoamFilters, ControlOption } from '../../types/poam.types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
  // Fetch unique controls for autocomplete
  const { data: controlOptions = [] } = useQuery({
    queryKey: ['poam-controls'],
    queryFn: async () => {
      const response = await axios.get<{ success: boolean; data: ControlOption[] }>(
        `${API_BASE}/poams/controls`
      );
      return response.data.data || [];
    },
  });

  const handleChange = (field: keyof PoamFilters, value: any) => {
    onFiltersChange({ ...filters, [field]: value || undefined });
  };

  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== ''
  );

  const selectedControl = controlOptions.find((c) => c.id === filters.controlId) || null;

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

      <Autocomplete
        options={controlOptions}
        getOptionLabel={(option) => `${option.controlId} - ${option.title}`}
        value={selectedControl}
        onChange={(_, newValue) => {
          handleChange('controlId', newValue?.id);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Control ID"
            size="small"
            placeholder="Search by control"
          />
        )}
        sx={{ minWidth: 250 }}
        size="small"
      />

      <TextField
        label="Assigned To"
        size="small"
        value={filters.assignedTo || ''}
        onChange={(e) => handleChange('assignedTo', e.target.value)}
        sx={{ minWidth: 200 }}
      />

      <TextField
        label="Start Date From"
        type="date"
        size="small"
        value={filters.startDateFrom || ''}
        onChange={(e) => handleChange('startDateFrom', e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ minWidth: 160 }}
      />

      <TextField
        label="Start Date To"
        type="date"
        size="small"
        value={filters.startDateTo || ''}
        onChange={(e) => handleChange('startDateTo', e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ minWidth: 160 }}
      />

      <TextField
        label="Target Date From"
        type="date"
        size="small"
        value={filters.targetDateFrom || ''}
        onChange={(e) => handleChange('targetDateFrom', e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ minWidth: 160 }}
      />

      <TextField
        label="Target Date To"
        type="date"
        size="small"
        value={filters.targetDateTo || ''}
        onChange={(e) => handleChange('targetDateTo', e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ minWidth: 160 }}
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
