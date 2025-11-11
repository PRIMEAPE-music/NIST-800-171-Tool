import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  Chip,
  CircularProgress,
} from '@mui/material';
import { Add, Delete, PlayArrow } from '@mui/icons-material';
import { ReportOptions, ReportType, ReportFormat } from '../../types/reports';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface BatchReportGeneratorProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BatchReportGenerator: React.FC<BatchReportGeneratorProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [reportConfigs, setReportConfigs] = useState<ReportOptions[]>([]);
  const [generating, setGenerating] = useState(false);

  const addReport = (reportType: ReportType, format: ReportFormat) => {
    setReportConfigs([
      ...reportConfigs,
      {
        reportType,
        format,
      },
    ]);
  };

  const removeReport = (index: number) => {
    setReportConfigs(reportConfigs.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (reportConfigs.length === 0) return;

    setGenerating(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/reports/batch`, {
        reportConfigs,
      });

      alert(
        `Batch generation complete! Success: ${response.data.successCount}, Failed: ${response.data.failCount}`
      );
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Batch generation failed:', error);
      alert('Batch generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const quickBatchOptions = [
    { label: 'All Reports (PDF)', configs: [
      { reportType: 'executive-summary' as ReportType, format: 'pdf' as ReportFormat },
      { reportType: 'detailed-compliance' as ReportType, format: 'pdf' as ReportFormat },
      { reportType: 'gap-analysis' as ReportType, format: 'pdf' as ReportFormat },
      { reportType: 'poam' as ReportType, format: 'pdf' as ReportFormat },
    ]},
    { label: 'Audit Package', configs: [
      { reportType: 'executive-summary' as ReportType, format: 'pdf' as ReportFormat },
      { reportType: 'detailed-compliance' as ReportType, format: 'excel' as ReportFormat },
      { reportType: 'gap-analysis' as ReportType, format: 'excel' as ReportFormat },
      { reportType: 'poam' as ReportType, format: 'excel' as ReportFormat },
    ]},
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Batch Report Generation</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Add multiple reports to generate them all at once. Maximum 10 reports per batch.
        </Typography>

        {/* Quick Batch Options */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Quick Batch:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {quickBatchOptions.map((option) => (
              <Button
                key={option.label}
                variant="outlined"
                size="small"
                onClick={() => setReportConfigs(option.configs)}
              >
                {option.label}
              </Button>
            ))}
          </Box>
        </Box>

        {/* Report List */}
        <List>
          {reportConfigs.map((config, index) => (
            <ListItem
              key={index}
              secondaryAction={
                <IconButton edge="end" onClick={() => removeReport(index)}>
                  <Delete />
                </IconButton>
              }
            >
              <ListItemText
                primary={config.reportType.replace('-', ' ')}
                secondary={
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Chip label={config.format.toUpperCase()} size="small" />
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>

        {reportConfigs.length === 0 && (
          <Typography variant="body2" color="text.secondary" align="center">
            No reports added yet. Use quick batch options or add manually.
          </Typography>
        )}

        <Typography variant="caption" color="text.secondary">
          {reportConfigs.length} / 10 reports
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={reportConfigs.length === 0 || generating}
          startIcon={generating ? <CircularProgress size={20} /> : <PlayArrow />}
        >
          {generating ? 'Generating...' : 'Generate All'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
