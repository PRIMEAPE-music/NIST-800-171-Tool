import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { ExpandMore, CheckCircle, Warning, Error } from '@mui/icons-material';

interface CoverageBreakdown {
  percentage: number;
  numerator: number;
  denominator: number;
  details: string[];
}

interface ControlCoverageProps {
  technicalCoverage: number;
  operationalCoverage: number;
  documentationCoverage: number;
  physicalCoverage: number;
  overallCoverage: number;
  breakdown: {
    technical: CoverageBreakdown;
    operational: CoverageBreakdown;
    documentation: CoverageBreakdown;
    physical: CoverageBreakdown;
  };
}

export default function ControlCoverageCard({ coverage }: { coverage: ControlCoverageProps }) {
  const getCoverageColor = (percentage: number) => {
    if (percentage >= 90) return '#4caf50';
    if (percentage >= 70) return '#ff9800';
    if (percentage >= 50) return '#ff5722';
    return '#f44336';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 90) return <CheckCircle sx={{ color: '#4caf50', fontSize: 40 }} />;
    if (percentage >= 50) return <Warning sx={{ color: '#ff9800', fontSize: 40 }} />;
    return <Error sx={{ color: '#f44336', fontSize: 40 }} />;
  };

  return (
    <Card sx={{ bgcolor: '#1E1E1E', mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          {getStatusIcon(coverage.overallCoverage)}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Coverage Status</Typography>
            <Typography variant="h3" sx={{ color: getCoverageColor(coverage.overallCoverage) }}>
              {coverage.overallCoverage}%
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Technical
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={coverage.technicalCoverage}
                sx={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: '#333',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getCoverageColor(coverage.technicalCoverage),
                  },
                }}
              />
              <Typography>{coverage.technicalCoverage}%</Typography>
            </Box>
          </Grid>

          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Operational
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={coverage.operationalCoverage}
                sx={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: '#333',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getCoverageColor(coverage.operationalCoverage),
                  },
                }}
              />
              <Typography>{coverage.operationalCoverage}%</Typography>
            </Box>
          </Grid>

          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Documentation
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={coverage.documentationCoverage}
                sx={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: '#333',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getCoverageColor(coverage.documentationCoverage),
                  },
                }}
              />
              <Typography>{coverage.documentationCoverage}%</Typography>
            </Box>
          </Grid>

          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Physical
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={coverage.physicalCoverage}
                sx={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: '#333',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getCoverageColor(coverage.physicalCoverage),
                  },
                }}
              />
              <Typography>{coverage.physicalCoverage}%</Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Detailed Breakdown */}
        <Accordion sx={{ bgcolor: '#242424', mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>View Detailed Breakdown</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {Object.entries(coverage.breakdown).map(([type, data]) => (
                <Grid item xs={12} md={6} key={type}>
                  <Typography variant="subtitle2" sx={{ textTransform: 'capitalize', mb: 1 }}>
                    {type} ({data.numerator}/{data.denominator})
                  </Typography>
                  <List dense>
                    {data.details.map((detail, idx) => (
                      <ListItem key={idx}>
                        <ListItemText
                          primary={detail}
                          primaryTypographyProps={{
                            variant: 'body2',
                            sx: {
                              color: detail.startsWith('✓')
                                ? '#4caf50'
                                : detail.startsWith('✗')
                                ? '#f44336'
                                : detail.startsWith('⚠')
                                ? '#ff9800'
                                : 'text.primary',
                            },
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );
}
