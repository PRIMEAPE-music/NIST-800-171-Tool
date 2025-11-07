import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle as ImplementedIcon,
  Verified as VerifiedIcon
} from '@mui/icons-material';

interface OverallComplianceCardProps {
  stats?: {
    total: number;
    byStatus: {
      implemented: number;
      verified: number;
    };
    compliancePercentage: number;
  };
}

const OverallComplianceCard: React.FC<OverallComplianceCardProps> = ({ stats }) => {
  if (!stats) return null;

  const { total, byStatus, compliancePercentage } = stats;
  const compliantCount = byStatus.implemented + byStatus.verified;

  // Determine color based on percentage
  const getColor = (percentage: number) => {
    if (percentage >= 80) return '#66BB6A'; // Green
    if (percentage >= 50) return '#FFA726'; // Orange
    return '#F44336'; // Red
  };

  const color = getColor(compliancePercentage);

  return (
    <Card sx={{ backgroundColor: '#242424', height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0' }}>
          Overall Compliance
        </Typography>

        <Box sx={{ textAlign: 'center', my: 3 }}>
          <Typography
            variant="h2"
            component="div"
            sx={{ color, fontWeight: 'bold', mb: 1 }}
          >
            {compliancePercentage}%
          </Typography>
          <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
            {compliantCount} of {total} controls
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={compliancePercentage}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: color,
              borderRadius: 4
            }
          }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ImplementedIcon sx={{ color: '#66BB6A', fontSize: 20 }} />
            <Box>
              <Typography variant="body2" fontWeight="medium" sx={{ color: '#E0E0E0' }}>
                {byStatus.implemented}
              </Typography>
              <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                Implemented
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VerifiedIcon sx={{ color: '#42A5F5', fontSize: 20 }} />
            <Box>
              <Typography variant="body2" fontWeight="medium" sx={{ color: '#E0E0E0' }}>
                {byStatus.verified}
              </Typography>
              <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                Verified
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default OverallComplianceCard;
