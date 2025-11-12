import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Button,
  Grid,
  Card,
  CardContent,
  Snackbar,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  FileDownload as ExportIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import policyViewerService from '../services/policyViewer.service';
import PolicyTabs from '../components/policy-viewer/PolicyTabs';
import PolicySearchBar from '../components/policy-viewer/PolicySearchBar';
import SyncStatusIndicator from '../components/policy-viewer/SyncStatusIndicator';
import IntunePolicyCard from '../components/policy-viewer/IntunePolicyCard';
import PurviewPolicyCard from '../components/policy-viewer/PurviewPolicyCard';
import AzureADPolicyCard from '../components/policy-viewer/AzureADPolicyCard';
import PolicyDetailModal from '../components/policy-viewer/PolicyDetailModal';
import PolicyCardSkeleton from '../components/policy-viewer/PolicyCardSkeleton';
import EmptyState from '../components/policy-viewer/EmptyState';
import {
  PolicyTypeTab,
  PolicySearchParams,
  PolicyDetail,
} from '../types/policyViewer.types';

const PolicyViewer: React.FC = () => {
  const queryClient = useQueryClient();

  // State
  const [currentTab, setCurrentTab] = useState<PolicyTypeTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'lastSynced' | 'type'>('lastSynced');
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyDetail | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const showSnackbar = (
    message: string,
    severity: 'success' | 'error' | 'info' | 'warning' = 'info'
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleOpenDetail = (policy: PolicyDetail) => {
    setSelectedPolicy(policy);
    setDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setSelectedPolicy(null);
  };

  // Build search params
  const searchParams: PolicySearchParams = {
    policyType: currentTab !== 'all' ? currentTab : undefined,
    searchTerm: searchTerm || undefined,
    isActive:
      activeFilter === 'active' ? true : activeFilter === 'inactive' ? false : undefined,
    sortBy,
    sortOrder: 'desc',
  };

  // Queries
  const {
    data: policies = [],
    isLoading: loadingPolicies,
    error: policiesError,
  } = useQuery({
    queryKey: ['policies', searchParams],
    queryFn: () => policyViewerService.getPolicies(searchParams),
  });

  const {
    data: stats,
    isLoading: loadingStats,
  } = useQuery({
    queryKey: ['policyStats'],
    queryFn: () => policyViewerService.getStats(),
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => policyViewerService.triggerSync(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['policyStats'] });
      showSnackbar(
        `Sync completed! ${data.result?.policiesUpdated || 0} policies updated.`,
        'success'
      );
    },
    onError: (error: any) => {
      showSnackbar(
        `Sync failed: ${error.message || 'Unknown error'}`,
        'error'
      );
    },
  });

  // Tab counts
  const tabCounts = {
    all: stats?.totalPolicies || 0,
    Intune: stats?.byType.Intune || 0,
    Purview: stats?.byType.Purview || 0,
    AzureAD: stats?.byType.AzureAD || 0,
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="Search policies..."]') as HTMLInputElement;
        searchInput?.focus();
      }

      // Ctrl/Cmd + R: Trigger sync
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        if (!syncMutation.isPending) {
          syncMutation.mutate();
        }
      }

      // Ctrl/Cmd + E: Export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        handleExport();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [syncMutation.isPending]);

  const handleExport = async () => {
    try {
      showSnackbar('Preparing export...', 'info');
      const exportData = await policyViewerService.exportData();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `policy-export-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showSnackbar('Export completed successfully!', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      showSnackbar('Export failed. Please try again.', 'error');
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 2,
            mb: 3,
          }}
        >
          <Typography variant="h4" component="h1">
            Policy Settings Viewer
          </Typography>
          <Box display="flex" gap={2} alignItems="center">
            <Tooltip
              title={
                <Box>
                  <Typography variant="caption" display="block">
                    <strong>Keyboard Shortcuts:</strong>
                  </Typography>
                  <Typography variant="caption" display="block">
                    Ctrl/⌘ + K: Focus search
                  </Typography>
                  <Typography variant="caption" display="block">
                    Ctrl/⌘ + R: Sync policies
                  </Typography>
                  <Typography variant="caption" display="block">
                    Ctrl/⌘ + E: Export data
                  </Typography>
                </Box>
              }
            >
              <IconButton size="small">
                <HelpIcon />
              </IconButton>
            </Tooltip>
            <SyncStatusIndicator
              lastSyncDate={stats?.lastSyncDate || null}
              isSyncing={syncMutation.isPending}
              onSync={() => syncMutation.mutate()}
            />
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={handleExport}
            >
              Export
            </Button>
          </Box>
        </Box>

        {/* Stats Summary */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Policies
                  </Typography>
                  <Typography variant="h4">{stats.totalPolicies}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Active Policies
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {stats.activePolicies}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Mapped to Controls
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {stats.policiesWithMappings}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Inactive Policies
                  </Typography>
                  <Typography variant="h4" color="text.secondary">
                    {stats.inactivePolicies}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Tabs */}
        <PolicyTabs
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          counts={tabCounts}
        />

        {/* Search & Filters */}
        <PolicySearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          activeFilter={activeFilter}
          onActiveFilterChange={setActiveFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />

        {/* Policy List */}
        <Paper sx={{ p: 2 }}>
          {loadingPolicies ? (
            <Box>
              <PolicyCardSkeleton />
              <PolicyCardSkeleton />
              <PolicyCardSkeleton />
            </Box>
          ) : policiesError ? (
            <Alert severity="error">Failed to load policies</Alert>
          ) : policies.length === 0 ? (
            <EmptyState
              hasNeverSynced={!stats?.lastSyncDate}
              onSync={() => syncMutation.mutate()}
              isSyncing={syncMutation.isPending}
            />
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Found {policies.length} {policies.length === 1 ? 'policy' : 'policies'}
              </Typography>

              {policies.map((policy) => {
                switch (policy.policyType) {
                  case 'Intune':
                    return (
                      <IntunePolicyCard
                        key={policy.id}
                        policy={policy}
                        onOpenDetail={handleOpenDetail}
                      />
                    );
                  case 'Purview':
                    return (
                      <PurviewPolicyCard
                        key={policy.id}
                        policy={policy}
                        onOpenDetail={handleOpenDetail}
                      />
                    );
                  case 'AzureAD':
                    return (
                      <AzureADPolicyCard
                        key={policy.id}
                        policy={policy}
                        onOpenDetail={handleOpenDetail}
                      />
                    );
                  default:
                    return null;
                }
              })}
            </Box>
          )}
        </Paper>
      </Box>

      {/* Detail Modal */}
      <PolicyDetailModal
        policy={selectedPolicy}
        open={detailModalOpen}
        onClose={handleCloseDetail}
      />

      {/* Snackbar Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default PolicyViewer;
