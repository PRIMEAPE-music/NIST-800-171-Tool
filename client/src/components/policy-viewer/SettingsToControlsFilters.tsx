import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  SelectChangeEvent,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { SettingsToControlsFilters } from '@/types/policyViewer.types';

interface SettingsToControlsFiltersProps {
  filters: SettingsToControlsFilters;
  onFilterChange: (filters: SettingsToControlsFilters) => void;
  availablePlatforms: string[];
  availableFamilies: string[];
}

const SettingsToControlsFiltersComponent: React.FC<SettingsToControlsFiltersProps> = ({
  filters,
  onFilterChange,
  availablePlatforms,
  availableFamilies,
}) => {
  const handleFilterChange = (
    field: keyof SettingsToControlsFilters,
    value: string
  ) => {
    onFilterChange({
      ...filters,
      [field]: value,
    });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        mb: 3,
        p: 2,
        bgcolor: '#2C2C2C',
        borderRadius: 1,
      }}
    >
      {/* Search */}
      <TextField
        size="small"
        placeholder="Search settings..."
        value={filters.searchQuery}
        onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ minWidth: 250, flexGrow: 1 }}
      />

      {/* Policy Type */}
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Policy Type</InputLabel>
        <Select
          value={filters.policyType}
          label="Policy Type"
          onChange={(e: SelectChangeEvent) =>
            handleFilterChange('policyType', e.target.value)
          }
        >
          <MenuItem value="all">All Types</MenuItem>
          <MenuItem value="Intune">Intune</MenuItem>
          <MenuItem value="Purview">Purview</MenuItem>
          <MenuItem value="AzureAD">Azure AD</MenuItem>
        </Select>
      </FormControl>

      {/* Platform */}
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Platform</InputLabel>
        <Select
          value={filters.platform}
          label="Platform"
          onChange={(e: SelectChangeEvent) =>
            handleFilterChange('platform', e.target.value)
          }
        >
          <MenuItem value="all">All Platforms</MenuItem>
          {availablePlatforms.map((platform) => (
            <MenuItem key={platform} value={platform}>
              {platform}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Control Priority */}
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Priority</InputLabel>
        <Select
          value={filters.controlPriority}
          label="Priority"
          onChange={(e: SelectChangeEvent) =>
            handleFilterChange('controlPriority', e.target.value)
          }
        >
          <MenuItem value="all">All Priorities</MenuItem>
          <MenuItem value="Critical">Critical</MenuItem>
          <MenuItem value="High">High</MenuItem>
          <MenuItem value="Medium">Medium</MenuItem>
          <MenuItem value="Low">Low</MenuItem>
        </Select>
      </FormControl>

      {/* Control Family */}
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Family</InputLabel>
        <Select
          value={filters.controlFamily}
          label="Family"
          onChange={(e: SelectChangeEvent) =>
            handleFilterChange('controlFamily', e.target.value)
          }
        >
          <MenuItem value="all">All Families</MenuItem>
          {availableFamilies.sort().map((family) => (
            <MenuItem key={family} value={family}>
              {family}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Compliance Status */}
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel>Compliance Status</InputLabel>
        <Select
          value={filters.complianceStatus}
          label="Compliance Status"
          onChange={(e: SelectChangeEvent) =>
            handleFilterChange('complianceStatus', e.target.value)
          }
        >
          <MenuItem value="all">All Statuses</MenuItem>
          <MenuItem value="COMPLIANT">Compliant</MenuItem>
          <MenuItem value="NON_COMPLIANT">Non-Compliant</MenuItem>
          <MenuItem value="NOT_CONFIGURED">Not Configured</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

export default SettingsToControlsFiltersComponent;
