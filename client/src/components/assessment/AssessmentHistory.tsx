import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import assessmentService, { AssessmentResponse } from '../../services/assessmentService';

const AssessmentHistory: React.FC = () => {
  const [assessments, setAssessments] = useState<AssessmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAssessments();
  }, []);

  const loadAssessments = async () => {
    try {
      const data = await assessmentService.getAllAssessments();
      setAssessments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  // Group assessments by date
  const groupedByDate = assessments.reduce((acc, assessment) => {
    const date = new Date(assessment.assessmentDate).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(assessment);
    return acc;
  }, {} as Record<string, AssessmentResponse[]>);

  const dates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  if (loading) {
    return (
      <Card sx={{ bgcolor: 'background.paper' }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ bgcolor: 'background.paper' }}>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  const getRiskColor = (avgRiskScore: number) => {
    if (avgRiskScore >= 76) return '#F44336';
    if (avgRiskScore >= 51) return '#FF9800';
    if (avgRiskScore >= 26) return '#FFA726';
    return '#66BB6A';
  };

  const getRiskLevel = (avgRiskScore: number) => {
    if (avgRiskScore >= 76) return 'Critical';
    if (avgRiskScore >= 51) return 'High';
    if (avgRiskScore >= 26) return 'Medium';
    return 'Low';
  };

  return (
    <Card sx={{ bgcolor: 'background.paper' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Assessment History
        </Typography>

        {dates.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={4}>
            No assessment history available
          </Typography>
        ) : (
          <Box>
            {dates.map((date) => {
              const assessmentsOnDate = groupedByDate[date];
              const avgRiskScore =
                assessmentsOnDate.reduce((sum, a) => sum + a.riskScore, 0) /
                assessmentsOnDate.length;

              return (
                <Box
                  key={date}
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {date}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {assessmentsOnDate.length} control{assessmentsOnDate.length > 1 ? 's' : ''} assessed
                      </Typography>
                    </Box>
                    <Box display="flex" gap={1} alignItems="center">
                      <Chip
                        label={getRiskLevel(avgRiskScore)}
                        size="small"
                        sx={{
                          bgcolor: getRiskColor(avgRiskScore),
                          color: 'white',
                          fontWeight: 'bold',
                        }}
                      />
                      <Chip
                        label={`Risk: ${Math.round(avgRiskScore)}`}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: getRiskColor(avgRiskScore),
                          color: getRiskColor(avgRiskScore),
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Stats breakdown */}
                  <Box display="flex" gap={2} mt={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Implemented
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {assessmentsOnDate.filter((a) => a.isImplemented).length}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        With Evidence
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {assessmentsOnDate.filter((a) => a.hasEvidence).length}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Tested
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {assessmentsOnDate.filter((a) => a.isTested).length}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Fully Compliant
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {
                          assessmentsOnDate.filter(
                            (a) => a.isImplemented && a.hasEvidence && a.isTested && a.meetsRequirement
                          ).length
                        }
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AssessmentHistory;
