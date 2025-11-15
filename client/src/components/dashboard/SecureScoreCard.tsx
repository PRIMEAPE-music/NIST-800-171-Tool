import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Divider,
  Button,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface SecureScoreSummary {
  currentScore: number;
  maxScore: number;
  percentage: number;
  activeUserCount: number;
  licensedUserCount: number;
  enabledServices: string[];
  lastUpdated: string;
}

// Fetch Secure Score summary
const fetchSecureScoreSummary = async (forceRefresh = false): Promise<SecureScoreSummary | null> => {
  try {
    const response = await fetch(`/api/m365/secure-score?forceRefresh=${forceRefresh}`);
    if (!response.ok) {
      return null;
    }
    const result = await response.json();
    return result.summary;
  } catch (error) {
    console.error('Error fetching Secure Score summary:', error);
    return null;
  }
};

// Sync Secure Score data
const syncSecureScore = async () => {
  const response = await fetch('/api/m365/secure-score/sync', {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to sync Secure Score');
  }
  return response.json();
};

const SecureScoreCard: React.FC = () => {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch Secure Score summary
  const { data: secureScoreSummary, isLoading } = useQuery({
    queryKey: ['secure-score-summary'],
    queryFn: () => fetchSecureScoreSummary(),
    retry: 1,
  });

  // Sync Secure Score mutation
  const syncMutation = useMutation({
    mutationFn: syncSecureScore,
    onMutate: () => {
      setIsSyncing(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secure-score-summary'] });
      setIsSyncing(false);
    },
    onError: (error) => {
      console.error('Sync failed:', error);
      setIsSyncing(false);
    },
  });

  const handleSync = () => {
    syncMutation.mutate();
  };

  if (isLoading) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          bgcolor: '#1a1a1a',
          borderColor: '#42A5F5',
          borderWidth: 2,
        }}
      >
        <Skeleton variant="text" width="60%" height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={100} />
      </Paper>
    );
  }

  if (!secureScoreSummary) {
    return null;
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        bgcolor: '#1a1a1a',
        borderColor: '#42A5F5',
        borderWidth: 2,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ color: '#E0E0E0', fontWeight: 'bold' }}>
            Microsoft Secure Score
          </Typography>
          <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
            Security & Compliance Assessment
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={isSyncing ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={handleSync}
          disabled={isSyncing}
          sx={{
            borderColor: '#42A5F5',
            color: '#42A5F5',
            '&:hover': {
              borderColor: '#90CAF9',
              bgcolor: 'rgba(66, 165, 245, 0.1)',
            },
          }}
        >
          {isSyncing ? 'Syncing...' : 'Sync'}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h3" sx={{ color: '#42A5F5', fontWeight: 'bold' }}>
            {secureScoreSummary.currentScore} / {secureScoreSummary.maxScore}
          </Typography>
          <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 1 }}>
            {secureScoreSummary.percentage.toFixed(1)}% Security Score
          </Typography>
          <LinearProgress
            variant="determinate"
            value={secureScoreSummary.percentage}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: '#2A2A2A',
              '& .MuiLinearProgress-bar': {
                bgcolor: '#42A5F5',
                borderRadius: 5,
              },
            }}
          />
          <Typography variant="caption" sx={{ color: '#B0B0B0', mt: 1, display: 'block' }}>
            Updated: {new Date(secureScoreSummary.lastUpdated).toLocaleString()}
          </Typography>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ borderColor: '#4A4A4A' }} />

        <Box sx={{ textAlign: 'center', minWidth: 100 }}>
          <Typography variant="h4" sx={{ color: '#90CAF9', fontWeight: 'bold' }}>
            {secureScoreSummary.activeUserCount}
          </Typography>
          <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
            Active Users
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default SecureScoreCard;
