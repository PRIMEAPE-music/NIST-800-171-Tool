import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  InputAdornment,
  Autocomplete,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { EvidenceFilters as EvidenceFiltersType, EvidenceType, EvidenceStatus } from '@/types/evidence.types';

interface EvidenceFiltersProps {
  filters: EvidenceFiltersType;
  onFilterChange: (filters: EvidenceFiltersType) => void;
  onClearFilters: () => void;
}

const CONTROL_FAMILIES = [
  'AC', 'AT', 'AU', 'CA', 'CM', 'CP', 'IA', 'IR', 'MA', 'MP', 'PE', 'PS', 'RA', 'SA', 'SC', 'SI', 'SR'
];

const EVIDENCE_TYPES: EvidenceType[] = [
  'policy', 'procedure', 'execution', 'screenshot', 'log', 'report', 'configuration', 'general'
];

const EVIDENCE_STATUSES: EvidenceStatus[] = [
  'uploaded', 'under_review', 'approved', 'rejected', 'expired'
];

const COMMON_TAGS = [
  'audit', 'annual-review', 'quarterly', 'monthly', 'critical', 'high-priority',
  'training', 'policy-review', 'incident-response', 'backup', 'security'
];

export const EvidenceFilters: React.FC<EvidenceFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
}) => {
  const handleSearchChange = (value: string) => {
    onFilterChange({ ...filters, searchTerm: value });
  };

  const handleFamilyChange = (value: string) => {
    onFilterChange({ ...filters, family: value || undefined });
  };

  const handleTypeChange = (value: string) => {
    onFilterChange({ ...filters, evidenceType: value as EvidenceType || undefined });
  };

  const handleStatusChange = (value: string) => {
    onFilterChange({ ...filters, status: value as EvidenceStatus || undefined });
  };

  const handleTagsChange = (value: string[]) => {
    onFilterChange({ ...filters, tags: value.length > 0 ? value : undefined });
  };

  const handleMultiControlToggle = () => {
    if (filters.hasMultipleControls === undefined) {
      onFilterChange({ ...filters, hasMultipleControls: true });
    } else if (filters.hasMultipleControls === true) {
      onFilterChange({ ...filters, hasMultipleControls: false });
    } else {
      onFilterChange({ ...filters, hasMultipleControls: undefined });
    }
  };

  const handleArchivedToggle = () => {
    onFilterChange({ ...filters, isArchived: !filters.isArchived });
  };

  const hasActiveFilters =
    filters.searchTerm ||
    filters.family ||
    filters.evidenceType ||
    filters.status ||
    (filters.tags && filters.tags.length > 0) ||
    filters.hasMultipleControls !== undefined ||
    filters.isArchived;

  return (
    <Box>
      {/* Search bar - always visible */}
      <TextField
        fullWidth
        placeholder="Search by filename, description, or control ID..."
        value={filters.searchTerm || ''}
        onChange={(e) => handleSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {/* Advanced filters - collapsible */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon />
            <Typography>Advanced Filters</Typography>
            {hasActiveFilters && (
              <Chip label="Active" size="small" color="primary" />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            {/* Row 1: Family and Type */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Control Family</InputLabel>
                <Select
                  value={filters.family || ''}
                  label="Control Family"
                  onChange={(e) => handleFamilyChange(e.target.value)}
                >
                  <MenuItem value="">All Families</MenuItem>
                  {CONTROL_FAMILIES.map((family) => (
                    <MenuItem key={family} value={family}>
                      {family}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Evidence Type</InputLabel>
                <Select
                  value={filters.evidenceType || ''}
                  label="Evidence Type"
                  onChange={(e) => handleTypeChange(e.target.value)}
                >
                  <MenuItem value="">All Types</MenuItem>
                  {EVIDENCE_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Row 2: Status and Tags */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status || ''}
                  label="Status"
                  onChange={(e) => handleStatusChange(e.target.value)}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  {EVIDENCE_STATUSES.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Autocomplete
                multiple
                fullWidth
                options={COMMON_TAGS}
                value={filters.tags || []}
                onChange={(_, value) => handleTagsChange(value)}
                renderInput={(params) => (
                  <TextField {...params} label="Tags" placeholder="Select tags" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip label={option} size="small" {...getTagProps({ index })} />
                  ))
                }
              />
            </Box>

            {/* Row 3: Toggle filters */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={
                  filters.hasMultipleControls === undefined
                    ? 'All Evidence'
                    : filters.hasMultipleControls
                    ? 'Multi-Control Only'
                    : 'Single Control Only'
                }
                onClick={handleMultiControlToggle}
                color={filters.hasMultipleControls !== undefined ? 'primary' : 'default'}
                variant={filters.hasMultipleControls !== undefined ? 'filled' : 'outlined'}
              />
              <Chip
                label={filters.isArchived ? 'Archived Only' : 'Active Only'}
                onClick={handleArchivedToggle}
                color={filters.isArchived ? 'default' : 'primary'}
                variant="outlined"
              />
            </Box>

            {/* Clear filters button */}
            {hasActiveFilters && (
              <Button
                startIcon={<ClearIcon />}
                onClick={onClearFilters}
                size="small"
                sx={{ alignSelf: 'flex-start' }}
              >
                Clear All Filters
              </Button>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};
