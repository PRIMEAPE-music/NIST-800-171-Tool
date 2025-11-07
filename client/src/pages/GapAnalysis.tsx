import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Alert,
  CircularProgress,
  Button,
  Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Assessment as AssessmentIcon, Refresh } from '@mui/icons-material';
import assessmentService, { GapItem, AssessmentStats } from '../services/assessmentService';
import RiskMatrix from '../components/assessment/RiskMatrix';
import GapList from '../components/assessment/GapList';
import AssessmentHistory from '../components/assessment/AssessmentHistory';

export const GapAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const [gaps, setGaps] = useState<GapItem[]>([]);
  const [stats, setStats] = useState<AssessmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [gapsData, statsData] = await Promise.all([
        assessmentService.getGapAnalysis(),
        assessmentService.getStats(),
      ]);
      setGaps(gapsData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gap analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={loadData}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Container>
    );
  }

  // Check if any assessments have been completed
  if (!stats || stats.assessedControls === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Gap Analysis
        </Typography>
        <Paper sx={{ p: 4, mt: 3, textAlign: 'center' }}>
          <AssessmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Assessments Found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            You need to complete the Assessment Wizard first to see gap analysis.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/assessment')}
            sx={{ mt: 2 }}
          >
            Start Assessment
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Gap Analysis
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Identified compliance gaps and risk assessment
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadData}
        >
          Refresh
        </Button>
      </Box>

      {/* Statistics Summary */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
        <Typography variant="h6" gutterBottom>
          Assessment Summary
        </Typography>
        <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={2}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Total Controls
            </Typography>
            <Typography variant="h5">{stats.totalControls}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Assessed Controls
            </Typography>
            <Typography variant="h5">{stats.assessedControls}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Identified Gaps
            </Typography>
            <Typography variant="h5" color="error.main">
              {gaps.length}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Fully Compliant
            </Typography>
            <Typography variant="h5" color="success.main">
              {stats.fullyCompliantControls}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Average Risk Score
            </Typography>
            <Typography variant="h5">{stats.averageRiskScore}</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Risk Matrix */}
      <Box mb={3}>
        <Typography variant="h6" gutterBottom>
          Risk Distribution
        </Typography>
        <RiskMatrix gaps={gaps} />
      </Box>

      {/* Gap List */}
      {gaps.length > 0 ? (
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Compliance Gaps ({gaps.length})
          </Typography>
          <GapList gaps={gaps} />
        </Box>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center', mb: 3 }}>
          <Typography variant="h6" color="success.main" gutterBottom>
            No Compliance Gaps Found!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            All assessed controls are fully compliant.
          </Typography>
        </Paper>
      )}

      {/* Assessment History */}
      <Box>
        <Typography variant="h6" gutterBottom>
          Assessment Timeline
        </Typography>
        <AssessmentHistory />
      </Box>
    </Container>
  );
};
