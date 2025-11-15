import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';

interface CoverageProgressBarsProps {
  technicalCoverage: number;
  policyCoverage: number;
  proceduralCoverage: number;
  evidenceCoverage: number;
  overallCoverage: number;
  showLabels?: boolean;
}

export const CoverageProgressBars: React.FC<CoverageProgressBarsProps> = ({
  technicalCoverage,
  policyCoverage,
  proceduralCoverage,
  evidenceCoverage,
  overallCoverage,
  showLabels = true,
}) => {
  const getCoverageColor = (percentage: number): string => {
    if (percentage >= 80) return '#4CAF50';
    if (percentage >= 50) return '#FFC107';
    return '#F44336';
  };

  const getCoverageIcon = (percentage: number): string => {
    if (percentage >= 80) return '✅';
    if (percentage >= 50) return '⚠️';
    return '❌';
  };

  const bars = [
    {
      label: 'Technical Implementation',
      value: technicalCoverage,
      description: 'M365 configurations and technical controls',
    },
    {
      label: 'Policy Documentation',
      value: policyCoverage,
      description: 'Written policies and standards',
    },
    {
      label: 'Procedural Controls',
      value: proceduralCoverage,
      description: 'Documented procedures and processes',
    },
    {
      label: 'Evidence Collection',
      value: evidenceCoverage,
      description: 'Audit evidence and documentation',
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Individual Coverage Bars */}
      {bars.map((bar, index) => (
        <Box key={index}>
          {showLabels && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500, color: '#E0E0E0' }}>
                  {getCoverageIcon(bar.value)} {bar.label}
                </Typography>
                <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                  {bar.description}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#E0E0E0' }}>
                {bar.value}%
              </Typography>
            </Box>
          )}
          <LinearProgress
            variant="determinate"
            value={bar.value}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: '#424242',
              '& .MuiLinearProgress-bar': {
                backgroundColor: getCoverageColor(bar.value),
                borderRadius: 4,
              },
            }}
          />
        </Box>
      ))}

      {/* Overall Coverage */}
      <Box sx={{ pt: 2, borderTop: '1px solid #424242' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body1" sx={{ fontWeight: 700, color: '#E0E0E0' }}>
            {getCoverageIcon(overallCoverage)} Overall NIST Compliance
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#E0E0E0' }}>
            {overallCoverage}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={overallCoverage}
          sx={{
            height: 12,
            borderRadius: 6,
            backgroundColor: '#424242',
            '& .MuiLinearProgress-bar': {
              backgroundColor: getCoverageColor(overallCoverage),
              borderRadius: 6,
            },
          }}
        />
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#B0B0B0', mt: 1 }}>
          Weighted average: Technical (40%), Policy (30%), Procedural (20%), Evidence (10%)
        </Typography>
      </Box>
    </Box>
  );
};
