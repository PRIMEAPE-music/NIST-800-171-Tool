import React from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Sync as SyncIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  Devices as DevicesIcon,
  Policy as PolicyIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { m365Service } from '@/services/m365.service';
import { format } from 'date-fns';

export const M365Integration: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch dashboard data
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useQuery({
    queryKey: ['m365', 'dashboard'],
    queryFn: () => m365Service.getDashboard(),
  });

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['m365', 'stats'],
    queryFn: () => m365Service.getStats(),
  });

  // Fetch sync status
  const { data: syncStatus, isLoading: syncLoading } = useQuery({
    queryKey: ['m365', 'sync-status'],
    queryFn: () => m365Service.getSyncStatus(),
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => m365Service.triggerSync(true),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['m365'] });
    },
  });

  const handleSync = () => {
    syncMutation.mutate();
  };

  const isLoading = dashboardLoading || statsLoading || syncLoading;

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (dashboardError) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>
          Failed to load M365 integration data. Please check your connection and try again.
        </Alert>
      </Container>
    );
  }

  const lastSync = syncStatus?.lastSyncDate
    ? format(new Date(syncStatus.lastSyncDate), 'PPpp')
    : 'Never';

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Microsoft 365 Integration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last synced: {lastSync}
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<AssessmentIcon />}
            onClick={() => navigate('/m365/gap-analysis')}
          >
            Gap Analysis
          </Button>
          <Button
            variant="contained"
            startIcon={syncMutation.isPending ? <CircularProgress size={20} /> : <SyncIcon />}
            onClick={handleSync}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
          </Button>
        </Box>
      </Box>

      {/* Sync Result Alert */}
      {syncMutation.isSuccess && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => syncMutation.reset()}>
          Sync completed successfully! {syncMutation.data?.result?.policiesUpdated || 0} policies and{' '}
          {syncMutation.data?.result?.controlsUpdated || 0} controls updated.
        </Alert>
      )}

      {syncMutation.isError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => syncMutation.reset()}>
          Sync failed. Please try again.
        </Alert>
      )}

      {/* Gap Analysis Quick Access Card */}
      <Card
        sx={{
          mb: 4,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 6,
          },
        }}
        onClick={() => navigate('/m365/gap-analysis')}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssessmentIcon />
                M365 Gap Analysis
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                Identify controls with missing or non-compliant Microsoft 365 settings
              </Typography>
              <Button
                variant="contained"
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.3)',
                  },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/m365/gap-analysis');
                }}
              >
                View Gap Analysis
              </Button>
            </Box>
            <TrendingUpIcon sx={{ fontSize: 64, opacity: 0.3 }} />
          </Box>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Policies
                  </Typography>
                  <Typography variant="h4">{stats?.totalPolicies || 0}</Typography>
                </Box>
                <PolicyIcon sx={{ fontSize: 48, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Active Policies
                  </Typography>
                  <Typography variant="h4">{stats?.activePolicies || 0}</Typography>
                </Box>
                <CheckIcon sx={{ fontSize: 48, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Mapped Controls
                  </Typography>
                  <Typography variant="h4">{stats?.mappedControls || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    out of 110
                  </Typography>
                </Box>
                <SecurityIcon sx={{ fontSize: 48, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Integration Health
                  </Typography>
                  <Chip
                    label="Healthy"
                    color="success"
                    size="small"
                    icon={<CheckIcon />}
                  />
                </Box>
                <InfoIcon sx={{ fontSize: 48, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Service Status Cards */}
      <Grid container spacing={3}>
        {/* Intune Card */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <DevicesIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Microsoft Intune</Typography>
            </Box>

            {dashboardData?.intune ? (
              <>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Compliance Policies
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {dashboardData.intune.compliancePoliciesCount}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Configuration Policies
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {dashboardData.intune.configurationPoliciesCount}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Managed Devices
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {dashboardData.intune.managedDevicesCount}
                  </Typography>
                </Box>
                <Chip
                  label="Connected"
                  color="success"
                  size="small"
                  icon={<CheckIcon />}
                  sx={{ mt: 2 }}
                />
              </>
            ) : (
              <Alert severity="warning" sx={{ mt: 2 }}>
                No Intune data available. Trigger a sync to fetch policies.
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Purview Card */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Microsoft Purview</Typography>
            </Box>

            {dashboardData?.purview ? (
              <>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Sensitivity Labels
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {dashboardData.purview.sensitivityLabelsCount}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Configuration Status
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {dashboardData.purview.isConfigured ? 'Configured' : 'Not Configured'}
                  </Typography>
                </Box>
                <Chip
                  label={dashboardData.purview.isConfigured ? 'Connected' : 'Limited Data'}
                  color={dashboardData.purview.isConfigured ? 'success' : 'warning'}
                  size="small"
                  icon={dashboardData.purview.isConfigured ? <CheckIcon /> : <WarningIcon />}
                  sx={{ mt: 2 }}
                />
              </>
            ) : (
              <Alert severity="warning" sx={{ mt: 2 }}>
                No Purview data available. Trigger a sync to fetch policies.
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Azure AD Card */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <PolicyIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Azure AD / Entra ID</Typography>
            </Box>

            {dashboardData?.azureAD ? (
              <>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Conditional Access Policies
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {dashboardData.azureAD.conditionalAccessPoliciesCount}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    MFA Enforcement
                  </Typography>
                  <Chip
                    label={dashboardData.azureAD.mfaEnabled ? 'Enabled' : 'Disabled'}
                    color={dashboardData.azureAD.mfaEnabled ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Security Defaults
                  </Typography>
                  <Chip
                    label={dashboardData.azureAD.securityDefaultsEnabled ? 'Enabled' : 'Disabled'}
                    color={dashboardData.azureAD.securityDefaultsEnabled ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>
                <Chip
                  label="Connected"
                  color="success"
                  size="small"
                  icon={<CheckIcon />}
                  sx={{ mt: 2 }}
                />
              </>
            ) : (
              <Alert severity="warning" sx={{ mt: 2 }}>
                No Azure AD data available. Trigger a sync to fetch policies.
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Sync History */}
      {syncStatus && syncStatus.recentLogs.length > 0 && (
        <Paper sx={{ p: 3, mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Recent Sync History
          </Typography>
          <Box>
            {syncStatus.recentLogs.slice(0, 5).map((log) => (
              <Box
                key={log.id}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                py={1}
                borderBottom="1px solid"
                borderColor="divider"
              >
                <Box>
                  <Typography variant="body2">
                    {format(new Date(log.syncDate), 'PPp')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {log.syncType} • {log.policiesUpdated} policies, {log.controlsUpdated} controls
                  </Typography>
                </Box>
                <Chip
                  label={log.status}
                  color={log.status === 'Success' ? 'success' : log.status === 'Failed' ? 'error' : 'warning'}
                  size="small"
                />
              </Box>
            ))}
          </Box>
        </Paper>
      )}
    </Container>
  );
};
