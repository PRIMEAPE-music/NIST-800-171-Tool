import React from 'react';
import {
  Box,
  Container,
  Typography,
  Skeleton
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { controlService } from '@/services/controlService';
import OverallComplianceCard from '@/components/dashboard/OverallComplianceCard';
import ControlsByStatusCard from '@/components/dashboard/ControlsByStatusCard';
import PriorityDistributionCard from '@/components/dashboard/PriorityDistributionCard';
import FamilyComplianceChart from '@/components/dashboard/FamilyComplianceChart';
import RecentActivityFeed from '@/components/dashboard/RecentActivityFeed';
import TopGapsCard from '@/components/dashboard/TopGapsCard';
import QuickActions from '@/components/dashboard/QuickActions';
import { ErrorMessage } from '@/components/common/ErrorMessage';

export const Dashboard: React.FC = () => {
  // Fetch statistics
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['statistics'],
    queryFn: () => controlService.getStatistics(),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 2, borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 1 }} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <ErrorMessage message="Failed to load dashboard statistics" />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#E0E0E0' }}>
          Compliance Dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
          NIST 800-171 Rev 3 Compliance Overview
        </Typography>
      </Box>

      {/* Row 1: Key Metrics */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 3 }}>
        <OverallComplianceCard stats={stats?.overall} />
        <ControlsByStatusCard stats={stats?.overall?.byStatus} />
        <PriorityDistributionCard stats={stats?.byPriority} />
      </Box>

      {/* Row 2: Family Breakdown */}
      <Box sx={{ mb: 3 }}>
        <FamilyComplianceChart familyData={stats?.byFamily} />
      </Box>

      {/* Row 3: Activity and Gaps */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3, mb: 3 }}>
        <RecentActivityFeed activity={stats?.recentActivity || []} />
        <TopGapsCard gaps={stats?.topGaps || []} />
      </Box>

      {/* Row 4: Quick Actions */}
      <Box>
        <QuickActions onRefresh={refetch} />
      </Box>
    </Container>
  );
};

export default Dashboard;
