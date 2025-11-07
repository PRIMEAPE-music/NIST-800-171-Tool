import React, { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Drawer,
  IconButton,
  Fab,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { controlService } from '@/services/controlService';
import { ControlFilters } from '@/components/controls/ControlFilters';
import { ControlTable } from '@/components/controls/ControlTable';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';

// Filter state interface
interface FilterState {
  families: string[];
  statuses: string[];
  priorities: string[];
  search: string;
}

export const ControlLibrary: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({
    families: [],
    statuses: [],
    priorities: [],
    search: '',
  });
  const [sortBy, setSortBy] = useState<string>('controlId');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState<number>(1);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState<boolean>(false);
  const [selectedControls, setSelectedControls] = useState<number[]>([]);

  // Fetch controls with filters
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['controls', filters, sortBy, sortOrder, page],
    queryFn: () =>
      controlService.getAllControls({
        family: filters.families.join(',') || undefined,
        status: filters.statuses.join(',') || undefined,
        priority: filters.priorities.join(',') || undefined,
        search: filters.search || undefined,
        sortBy,
        sortOrder,
        page,
        limit: 50,
      }),
  });

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1); // Reset to first page on filter change
    setSelectedControls([]); // Clear selection on filter change
  };

  // Handle sort change
  const handleSortChange = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Handle selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedControls(data?.data.map((c) => c.id) || []);
    } else {
      setSelectedControls([]);
    }
  };

  const handleSelectOne = (controlId: number, checked: boolean) => {
    if (checked) {
      setSelectedControls((prev) => [...prev, controlId]);
    } else {
      setSelectedControls((prev) => prev.filter((id) => id !== controlId));
    }
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({
      families: [],
      statuses: [],
      priorities: [],
      search: '',
    });
    setPage(1);
    setSelectedControls([]);
  };

  // Check if filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.families.length > 0 ||
      filters.statuses.length > 0 ||
      filters.priorities.length > 0 ||
      filters.search.length > 0
    );
  }, [filters]);

  if (isLoading) {
    return <LoadingSpinner message="Loading controls..." />;
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#E0E0E0' }}>
          Control Library
        </Typography>
        <ErrorMessage message="Failed to load controls. Please ensure the server is running." />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography variant="h4" gutterBottom sx={{ color: '#E0E0E0' }}>
            Control Library
          </Typography>
          <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
            {data?.pagination.total || 0} NIST 800-171 Rev 3 Controls
            {hasActiveFilters && ` (${data?.data.length || 0} filtered)`}
          </Typography>
        </Box>

        {/* Filter toggle for mobile */}
        <IconButton
          onClick={() => setFilterDrawerOpen(true)}
          sx={{ display: { xs: 'block', md: 'none' }, color: '#B0B0B0' }}
        >
          <FilterIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', gap: 2 }}>
        {/* Filters Sidebar - Desktop */}
        <Paper
          sx={{
            width: 280,
            flexShrink: 0,
            p: 2,
            display: { xs: 'none', md: 'block' },
            backgroundColor: '#242424',
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
          }}
        >
          <ControlFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
          />
        </Paper>

        {/* Filters Drawer - Mobile */}
        <Drawer
          anchor="left"
          open={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
          sx={{ display: { xs: 'block', md: 'none' } }}
          PaperProps={{
            sx: {
              backgroundColor: '#242424',
              color: '#E0E0E0',
            },
          }}
        >
          <Box sx={{ width: 280, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#E0E0E0' }}>
                Filters
              </Typography>
              <IconButton
                size="small"
                onClick={() => setFilterDrawerOpen(false)}
                sx={{ color: '#B0B0B0' }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
            <ControlFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
            />
          </Box>
        </Drawer>

        {/* Main Table */}
        <Box sx={{ flexGrow: 1 }}>
          <ControlTable
            controls={data?.data || []}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            selectedControls={selectedControls}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            page={page}
            totalPages={data?.pagination.totalPages || 1}
            onPageChange={setPage}
            onRefresh={refetch}
          />
        </Box>
      </Box>

      {/* Floating action button for filters on mobile */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', md: 'none' },
        }}
        onClick={() => setFilterDrawerOpen(true)}
      >
        <FilterIcon />
      </Fab>
    </Container>
  );
};

export default ControlLibrary;
