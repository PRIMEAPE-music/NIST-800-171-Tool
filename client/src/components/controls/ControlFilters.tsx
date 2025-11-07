import React from 'react';
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  Button,
  Chip,
  TextField,
} from '@mui/material';
import { ControlStatus, ControlPriority, FAMILY_LABELS } from '@/types/enums';

interface FilterState {
  families: string[];
  statuses: string[];
  priorities: string[];
  search: string;
}

interface ControlFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  onClearFilters: () => void;
}

export const ControlFilters: React.FC<ControlFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
}) => {
  const handleFamilyChange = (family: string, checked: boolean) => {
    const newFamilies = checked
      ? [...filters.families, family]
      : filters.families.filter((f) => f !== family);
    onFilterChange({ families: newFamilies });
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatuses = checked
      ? [...filters.statuses, status]
      : filters.statuses.filter((s) => s !== status);
    onFilterChange({ statuses: newStatuses });
  };

  const handlePriorityChange = (priority: string, checked: boolean) => {
    const newPriorities = checked
      ? [...filters.priorities, priority]
      : filters.priorities.filter((p) => p !== priority);
    onFilterChange({ priorities: newPriorities });
  };

  const activeFilterCount =
    filters.families.length +
    filters.statuses.length +
    filters.priorities.length +
    (filters.search ? 1 : 0);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ color: '#E0E0E0' }}>
          Filters
          {activeFilterCount > 0 && (
            <Chip
              label={activeFilterCount}
              size="small"
              color="primary"
              sx={{ ml: 1 }}
            />
          )}
        </Typography>
        {activeFilterCount > 0 && (
          <Button size="small" onClick={onClearFilters}>
            Clear All
          </Button>
        )}
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search controls..."
        value={filters.search}
        onChange={(e) => onFilterChange({ search: e.target.value })}
        sx={{
          mb: 2,
          '& .MuiInputBase-root': { color: '#E0E0E0' },
          '& .MuiInputLabel-root': { color: '#B0B0B0' },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4A4A4A' },
        }}
      />

      <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

      {/* Control Families */}
      <Typography variant="subtitle2" gutterBottom sx={{ color: '#E0E0E0' }}>
        Control Family
      </Typography>
      <FormGroup sx={{ mb: 2, maxHeight: '300px', overflowY: 'auto' }}>
        {Object.entries(FAMILY_LABELS).map(([code, label]) => (
          <FormControlLabel
            key={code}
            control={
              <Checkbox
                checked={filters.families.includes(code)}
                onChange={(e) => handleFamilyChange(code, e.target.checked)}
                size="small"
                sx={{
                  color: '#B0B0B0',
                  '&.Mui-checked': { color: '#90CAF9' },
                }}
              />
            }
            label={
              <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
                {label}
              </Typography>
            }
          />
        ))}
      </FormGroup>

      <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

      {/* Status */}
      <Typography variant="subtitle2" gutterBottom sx={{ color: '#E0E0E0' }}>
        Implementation Status
      </Typography>
      <FormGroup sx={{ mb: 2 }}>
        {Object.values(ControlStatus).map((status) => (
          <FormControlLabel
            key={status}
            control={
              <Checkbox
                checked={filters.statuses.includes(status)}
                onChange={(e) => handleStatusChange(status, e.target.checked)}
                size="small"
                sx={{
                  color: '#B0B0B0',
                  '&.Mui-checked': { color: '#90CAF9' },
                }}
              />
            }
            label={
              <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
                {status}
              </Typography>
            }
          />
        ))}
      </FormGroup>

      <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

      {/* Priority */}
      <Typography variant="subtitle2" gutterBottom sx={{ color: '#E0E0E0' }}>
        Priority Level
      </Typography>
      <FormGroup>
        {Object.values(ControlPriority).map((priority) => (
          <FormControlLabel
            key={priority}
            control={
              <Checkbox
                checked={filters.priorities.includes(priority)}
                onChange={(e) => handlePriorityChange(priority, e.target.checked)}
                size="small"
                sx={{
                  color: '#B0B0B0',
                  '&.Mui-checked': { color: '#90CAF9' },
                }}
              />
            }
            label={
              <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
                {priority}
              </Typography>
            }
          />
        ))}
      </FormGroup>
    </Box>
  );
};

export default ControlFilters;
