import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface FamilyComplianceChartProps {
  familyData?: Record<string, {
    total: number;
    byStatus: {
      notStarted: number;
      inProgress: number;
      implemented: number;
      verified: number;
    };
    compliancePercentage: number;
  }>;
}

const FamilyComplianceChart: React.FC<FamilyComplianceChartProps> = ({ familyData }) => {
  if (!familyData) return null;

  // Transform data for chart
  const chartData = Object.entries(familyData)
    .map(([family, data]) => ({
      family,
      'Not Started': data.byStatus.notStarted,
      'In Progress': data.byStatus.inProgress,
      'Implemented': data.byStatus.implemented,
      'Verified': data.byStatus.verified,
      compliance: data.compliancePercentage
    }))
    .sort((a, b) => a.family.localeCompare(b.family));

  return (
    <Card sx={{ backgroundColor: '#242424' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0' }}>
          Compliance by Control Family
        </Typography>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
            <XAxis
              dataKey="family"
              stroke="#B0B0B0"
              style={{ fontSize: '0.875rem' }}
            />
            <YAxis
              stroke="#B0B0B0"
              style={{ fontSize: '0.875rem' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#2C2C2C',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 4,
                color: '#E0E0E0'
              }}
              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
            />
            <Legend wrapperStyle={{ color: '#B0B0B0' }} />
            <Bar dataKey="Not Started" stackId="a" fill="#757575" />
            <Bar dataKey="In Progress" stackId="a" fill="#FFA726" />
            <Bar dataKey="Implemented" stackId="a" fill="#66BB6A" />
            <Bar dataKey="Verified" stackId="a" fill="#42A5F5" />
          </BarChart>
        </ResponsiveContainer>

        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {chartData.map((item) => (
            <Box key={item.family} sx={{ minWidth: 100 }}>
              <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                {item.family}
              </Typography>
              <Typography
                variant="body2"
                fontWeight="medium"
                sx={{
                  color: item.compliance >= 80 ? '#66BB6A' :
                         item.compliance >= 50 ? '#FFA726' : '#F44336'
                }}
              >
                {item.compliance}%
              </Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default FamilyComplianceChart;
