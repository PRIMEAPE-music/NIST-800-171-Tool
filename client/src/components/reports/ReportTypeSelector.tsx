import React from 'react';
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  Chip,
  Grid,
} from '@mui/material';
import {
  Assessment,
  ListAlt,
  BugReport,
  Assignment,
  Folder,
  TrendingUp,
} from '@mui/icons-material';
import { ReportType, ReportTypeInfo } from '../../types/reports';

interface ReportTypeSelectorProps {
  reportTypes: ReportTypeInfo[];
  selectedType: ReportType | null;
  onSelectType: (type: ReportType) => void;
}

const reportIcons: Record<ReportType, React.ReactElement> = {
  'executive-summary': <Assessment fontSize="large" />,
  'detailed-compliance': <ListAlt fontSize="large" />,
  'gap-analysis': <BugReport fontSize="large" />,
  poam: <Assignment fontSize="large" />,
  'audit-package': <Folder fontSize="large" />,
  progress: <TrendingUp fontSize="large" />,
};

export const ReportTypeSelector: React.FC<ReportTypeSelectorProps> = ({
  reportTypes,
  selectedType,
  onSelectType,
}) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Select Report Type
      </Typography>
      <Grid container spacing={2}>
        {reportTypes.map((report) => (
          <Grid item xs={12} sm={6} md={4} key={report.value}>
            <Card
              elevation={selectedType === report.value ? 8 : 2}
              sx={{
                border:
                  selectedType === report.value
                    ? '2px solid'
                    : '1px solid transparent',
                borderColor:
                  selectedType === report.value ? 'primary.main' : 'transparent',
                bgcolor: selectedType === report.value ? 'action.selected' : 'background.paper',
              }}
            >
              <CardActionArea onClick={() => onSelectType(report.value)}>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 1,
                    }}
                  >
                    <Box
                      sx={{
                        mr: 1,
                        color: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {reportIcons[report.value]}
                    </Box>
                    <Typography variant="h6" component="div">
                      {report.label}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1, minHeight: '40px' }}
                  >
                    {report.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {report.formats.map((format) => (
                      <Chip
                        key={format}
                        label={format.toUpperCase()}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
