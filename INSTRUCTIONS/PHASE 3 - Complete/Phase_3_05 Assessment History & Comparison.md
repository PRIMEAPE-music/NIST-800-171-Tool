## Part 5: Assessment History & Comparison

### Create Assessment History Component

📁 **File:** `client/src/components/assessment/AssessmentHistory.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
} from '@mui/material';
import { Visibility } from '@mui/icons-material';
import assessmentService, { AssessmentResponse } from '../../services/assessmentService';

const AssessmentHistory: React.FC = () => {
  const [assessments, setAssessments] = useState<AssessmentResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssessments();
  }, []);

  const loadAssessments = async () => {
    try {
      const data = await assessmentService.getAllAssessments();
      // Group by date and show unique dates
      const uniqueDates = Array.from(
        new Set(data.map((a) => new Date(a.assessmentDate).toLocaleDateString()))
      );
      setAssessments(data);
    } catch (error) {
      console.error('Failed to load assessments:', error);
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

  const dates = Object.keys(groupedByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <Card sx={{ bgcolor: 'background.paper' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Assessment History
        </Typography>

        {dates.map((date) => {
          const assessmentsOnDate = groupedByDate[date];
          const avgRiskScore =
            assessmentsOnDate.reduce((sum, a) => sum + a.riskScore, 0) /
            assessmentsOnDate.length;

          return (
            <Box key={date} mb={3}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1">{date}</Typography>
                <Box display="flex" gap={2} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {assessmentsOnDate.length} controls assessed
                  </Typography>
                  <Chip
                    label={`Avg Risk: ${Math.round(avgRiskScore)}`}
                    size="small"
                    sx={{
                      bgcolor:
                        avgRiskScore >= 76
                          ? '#F44336'
                          : avgRiskScore >= 51
                          ? '#FF9800'
                          : avgRiskScore >= 26
                          ? '#FFA726'
                          : '#66BB6A',
                      color: 'white',
                    }}
                  />
                </Box>
              </Box>
            </Box>
          );
        })}

        {dates.length === 0 && (
          <Typography color="text.secondary" textAlign="center" py={4}>
            No assessment history available
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default AssessmentHistory;
```