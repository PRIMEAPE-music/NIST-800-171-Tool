import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Download } from '@mui/icons-material';
import { ReportTypeSelector } from '../components/reports/ReportTypeSelector';
import { ReportOptionsForm } from '../components/reports/ReportOptionsForm';
import { ReportHistory } from '../components/reports/ReportHistory';
import { BatchReportGenerator } from '../components/reports/BatchReportGenerator';
import {
  ReportType,
  ReportFormat,
  ReportFilters,
  ReportOptions,
  ReportTypeInfo,
  ReportHistoryItem,
} from '../types/reports';
import {
  generateReport,
  getReportTypes,
  getReportHistory,
  downloadReport,
  deleteReport,
} from '../services/reportService';

const steps = ['Select Report Type', 'Configure Options', 'Generate & Download'];

export const Reports: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [reportTypes, setReportTypes] = useState<ReportTypeInfo[]>([]);
  const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>('pdf');
  const [filters, setFilters] = useState<ReportFilters>({});
  const [customTitle, setCustomTitle] = useState('');

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<number | null>(null);

  // Batch generation dialog
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);

  // Load report types and history on mount
  useEffect(() => {
    loadReportTypes();
    loadReportHistory();
  }, []);

  const loadReportTypes = async () => {
    try {
      const types = await getReportTypes();
      setReportTypes(types);
    } catch (err) {
      console.error('Error loading report types:', err);
      setError('Failed to load report types');
    }
  };

  const loadReportHistory = async () => {
    try {
      const history = await getReportHistory(20);
      setReportHistory(history);
    } catch (err) {
      console.error('Error loading report history:', err);
    }
  };

  const handleSelectType = (type: ReportType) => {
    setSelectedType(type);
    const typeInfo = reportTypes.find((t) => t.value === type);
    if (typeInfo && typeInfo.formats.length > 0) {
      setSelectedFormat(typeInfo.formats[0]);
    }
  };

  const handleNext = () => {
    if (activeStep === 0 && !selectedType) {
      setError('Please select a report type');
      return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleGenerate = async () => {
    if (!selectedType) {
      setError('Please select a report type');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const options: ReportOptions = {
        reportType: selectedType,
        format: selectedFormat,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        customTitle: customTitle || undefined,
      };

      const result = await generateReport(options);

      if (result.success) {
        setSuccess(
          `Report generated successfully: ${result.fileName} (${(
            (result.fileSize || 0) / 1024
          ).toFixed(1)} KB)`
        );
        // Auto-download
        if (result.reportId) {
          await downloadReport(result.reportId);
        }
        // Refresh history
        await loadReportHistory();
        // Reset form
        handleReset();
      } else {
        setError(result.error || 'Failed to generate report');
      }
    } catch (err: any) {
      console.error('Error generating report:', err);
      setError(err.response?.data?.error || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (reportId: number) => {
    try {
      await downloadReport(reportId);
      setSuccess('Report downloaded successfully');
    } catch (err) {
      console.error('Error downloading report:', err);
      setError('Failed to download report');
    }
  };

  const handleDeleteClick = (reportId: number) => {
    setReportToDelete(reportId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (reportToDelete === null) return;

    try {
      await deleteReport(reportToDelete);
      setSuccess('Report deleted successfully');
      await loadReportHistory();
    } catch (err) {
      console.error('Error deleting report:', err);
      setError('Failed to delete report');
    } finally {
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setSelectedType(null);
    setSelectedFormat('pdf');
    setFilters({});
    setCustomTitle('');
  };

  const selectedTypeInfo = reportTypes.find((t) => t.value === selectedType);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            Report Builder
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Generate compliance reports in multiple formats
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={() => setBatchDialogOpen(true)}
        >
          Batch Generate
        </Button>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step Content */}
      <Box sx={{ mb: 4 }}>
        {activeStep === 0 && (
          <ReportTypeSelector
            reportTypes={reportTypes}
            selectedType={selectedType}
            onSelectType={handleSelectType}
          />
        )}

        {activeStep === 1 && selectedTypeInfo && (
          <ReportOptionsForm
            availableFormats={selectedTypeInfo.formats}
            selectedFormat={selectedFormat}
            onFormatChange={setSelectedFormat}
            filters={filters}
            onFiltersChange={setFilters}
            customTitle={customTitle}
            onCustomTitleChange={setCustomTitle}
            reportType={selectedType || ''}
          />
        )}

        {activeStep === 2 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              Ready to Generate Report
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Report Type: {selectedTypeInfo?.label}
              <br />
              Format: {selectedFormat.toUpperCase()}
              <br />
              {Object.keys(filters).length > 0 &&
                `Filters Applied: ${Object.keys(filters).length}`}
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handleGenerate}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Download />}
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
          </Box>
        )}
      </Box>

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Button disabled={activeStep === 0} onClick={handleBack}>
          Back
        </Button>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button onClick={handleReset}>Reset</Button>
          {activeStep < steps.length - 1 && (
            <Button variant="contained" onClick={handleNext}>
              Next
            </Button>
          )}
        </Box>
      </Box>

      {/* Report History */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
          Report History
        </Typography>
        <ReportHistory
          reports={reportHistory}
          onDownload={handleDownload}
          onDelete={handleDeleteClick}
        />
      </Box>

      {/* Snackbars */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this report? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Batch Report Generator Dialog */}
      <BatchReportGenerator
        open={batchDialogOpen}
        onClose={() => setBatchDialogOpen(false)}
        onSuccess={() => {
          loadReportHistory();
          setSuccess('Batch reports generated successfully');
        }}
      />
    </Container>
  );
};
