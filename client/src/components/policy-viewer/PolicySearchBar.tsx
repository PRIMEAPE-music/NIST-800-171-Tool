import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
} from '@mui/material';
import {
  Search as SearchIcon,
} from '@mui/icons-material';

interface PolicySearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeFilter: 'all' | 'active' | 'inactive';
  onActiveFilterChange: (value: 'all' | 'active' | 'inactive') => void;
  sortBy: 'name' | 'lastSynced' | 'type';
  onSortByChange: (value: 'name' | 'lastSynced' | 'type') => void;
}

const PolicySearchBar: React.FC<PolicySearchBarProps> = ({
  searchTerm,
  onSearchChange,
  activeFilter,
  onActiveFilterChange,
  sortBy,
  onSortByChange,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
        mb: 3,
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 1,
      }}
    >
      {/* Search Field */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search policies..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
        }}
        sx={{ flex: 1 }}
      />

      {/* Active Filter */}
      <Box sx={{ minWidth: 200 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
          Status
        </Typography>
        <ToggleButtonGroup
          value={activeFilter}
          exclusive
          onChange={(_, value) => value && onActiveFilterChange(value)}
          size="small"
          fullWidth
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="active">Active</ToggleButton>
          <ToggleButton value="inactive">Inactive</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Sort By */}
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Sort By</InputLabel>
        <Select
          value={sortBy}
          label="Sort By"
          onChange={(e) => onSortByChange(e.target.value as any)}
        >
          <MenuItem value="name">Name</MenuItem>
          <MenuItem value="lastSynced">Last Synced</MenuItem>
          <MenuItem value="type">Type</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

export default PolicySearchBar;
