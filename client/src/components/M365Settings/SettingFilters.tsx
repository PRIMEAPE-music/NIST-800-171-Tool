import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Button,
  Chip,
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import { FilterState } from './types';

interface SettingFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  policyTypes: string[];
  platforms: string[];
}

const SettingFilters: React.FC<SettingFiltersProps> = ({
  filters,
  onFilterChange,
  policyTypes,
  platforms,
}) => {
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  const handleClearFilters = () => {
    onFilterChange({
      policyType: 'all',
      platform: 'all',
      confidenceLevel: 'all',
      complianceStatus: 'all',
      searchQuery: '',
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.policyType !== 'all' ||
      filters.platform !== 'all' ||
      filters.confidenceLevel !== 'all' ||
      filters.complianceStatus !== 'all' ||
      filters.searchQuery !== ''
    );
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.policyType !== 'all') count++;
    if (filters.platform !== 'all') count++;
    if (filters.confidenceLevel !== 'all') count++;
    if (filters.complianceStatus !== 'all') count++;
    if (filters.searchQuery !== '') count++;
    return count;
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          mb: 2,
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
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Policy Type</InputLabel>
          <Select
            value={filters.policyType}
            label="Policy Type"
            onChange={(e) => handleFilterChange('policyType', e.target.value)}
          >
            <MenuItem value="all">All Types</MenuItem>
            {policyTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Platform */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Platform</InputLabel>
          <Select
            value={filters.platform}
            label="Platform"
            onChange={(e) => handleFilterChange('platform', e.target.value)}
          >
            <MenuItem value="all">All Platforms</MenuItem>
            {platforms.map((platform) => (
              <MenuItem key={platform} value={platform}>
                {platform}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Confidence Level */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Confidence</InputLabel>
          <Select
            value={filters.confidenceLevel}
            label="Confidence"
            onChange={(e) => handleFilterChange('confidenceLevel', e.target.value)}
          >
            <MenuItem value="all">All Levels</MenuItem>
            <MenuItem value="High">High Confidence</MenuItem>
            <MenuItem value="Medium">Medium Confidence</MenuItem>
            <MenuItem value="Low">Low Confidence</MenuItem>
          </Select>
        </FormControl>

        {/* Compliance Status */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Compliance</InputLabel>
          <Select
            value={filters.complianceStatus}
            label="Compliance"
            onChange={(e) => handleFilterChange('complianceStatus', e.target.value)}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="COMPLIANT">Compliant</MenuItem>
            <MenuItem value="NON_COMPLIANT">Non-Compliant</MenuItem>
            <MenuItem value="NOT_CONFIGURED">Not Configured</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Active filters summary */}
      {hasActiveFilters() && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`${getActiveFilterCount()} filter${getActiveFilterCount() > 1 ? 's' : ''} active`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Button
            size="small"
            startIcon={<ClearIcon />}
            onClick={handleClearFilters}
            sx={{ textTransform: 'none' }}
          >
            Clear All Filters
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default SettingFilters;
