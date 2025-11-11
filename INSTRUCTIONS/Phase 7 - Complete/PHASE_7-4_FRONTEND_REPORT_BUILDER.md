# Phase 7.4: Frontend Report Builder Interface

## Overview
Create a comprehensive React-based user interface for report generation, including report type selection, filter configuration, preview, download management, and report history.

**Duration**: 2-3 days
**Prerequisites**: Phase 7.1-7.3 completed (backend report generation fully functional)

---

## Step 1: Create TypeScript Types for Frontend

📁 **File**: `client/src/types/reports.ts`

🔄 **COMPLETE NEW FILE**:

```typescript
export type ReportType =
  | 'executive-summary'
  | 'detailed-compliance'
  | 'gap-analysis'
  | 'poam'
  | 'audit-package'
  | 'progress';

export type ReportFormat = 'csv' | 'excel' | 'pdf';

export interface ReportTypeInfo {
  value: ReportType;
  label: string;
  description: string;
  formats: ReportFormat[];
}

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  families?: string[];
  statuses?: string[];
  priorities?: string[];
  hasEvidence?: boolean;
  assignedTo?: string;
  riskScoreMin?: number;
  riskScoreMax?: number;
  poamStatuses?: string[];
  overdueOnly?: boolean;
}

export interface ReportOptions {
  reportType: ReportType;
  format: ReportFormat;
  filters?: ReportFilters;
  includeCharts?: boolean;
  includeEvidence?: boolean;
  customTitle?: string;
}

export interface ReportHistoryItem {
  id: number;
  reportType: ReportType;
  reportName: string;
  format: ReportFormat;
  filePath: string | null;
  fileSize: number | null;
  filters: string | null;
  generatedAt: string;
  generatedBy: string | null;
  status: string;
}

export interface ReportGenerationResult {
  success: boolean;
  reportId?: number;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}
```

---

## Step 2: Create Report Service API Client

📁 **File**: `client/src/services/reportService.ts`

🔄 **COMPLETE NEW FILE**:

```typescript
import axios from 'axios';
import {
  ReportOptions,
  ReportGenerationResult,
  ReportHistoryItem,
  ReportTypeInfo,
} from '../types/reports';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Generate a report
 */
export async function generateReport(
  options: ReportOptions
): Promise<ReportGenerationResult> {
  const response = await axios.post<ReportGenerationResult>(
    `${API_BASE_URL}/reports/generate`,
    options
  );
  return response.data;
}

/**
 * Get available report types
 */
export async function getReportTypes(): Promise<ReportTypeInfo[]> {
  const response = await axios.get<ReportTypeInfo[]>(`${API_BASE_URL}/reports/types`);
  return response.data;
}

/**
 * Get report history
 */
export async function getReportHistory(limit?: number): Promise<ReportHistoryItem[]> {
  const response = await axios.get<ReportHistoryItem[]>(
    `${API_BASE_URL}/reports/history`,
    {
      params: { limit },
    }
  );
  return response.data;
}

/**
 * Download a report
 */
export async function downloadReport(reportId: number): Promise<void> {
  const response = await axios.get(`${API_BASE_URL}/reports/${reportId}/download`, {
    responseType: 'blob',
  });

  // Get filename from content-disposition header or use default
  const contentDisposition = response.headers['content-disposition'];
  let fileName = 'report.pdf';
  if (contentDisposition) {
    const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
    if (fileNameMatch && fileNameMatch.length === 2) {
      fileName = fileNameMatch[1];
    }
  }

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Delete a report from history
 */
export async function deleteReport(reportId: number): Promise<void> {
  await axios.delete(`${API_BASE_URL}/reports/${reportId}`);
}
```

---

## Step 3: Create Report Type Selector Component

📁 **File**: `client/src/components/reports/ReportTypeSelector.tsx`

🔄 **COMPLETE NEW FILE**:

```typescript
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
```

---

## Step 4: Create Report Options Form Component

📁 **File**: `client/src/components/reports/ReportOptionsForm.tsx`

🔄 **COMPLETE NEW FILE**:

```typescript
import React, { useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Paper,
  Chip,
  SelectChangeEvent,
} from '@mui/material';
import { ReportFilters, ReportFormat } from '../../types/reports';

interface ReportOptionsFormProps {
  availableFormats: ReportFormat[];
  selectedFormat: ReportFormat;
  onFormatChange: (format: ReportFormat) => void;
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  customTitle: string;
  onCustomTitleChange: (title: string) => void;
  reportType: string;
}

const CONTROL_FAMILIES = [
  'AC',
  'AT',
  'AU',
  'CA',
  'CM',
  'CP',
  'IA',
  'IR',
  'MA',
  'MP',
  'PE',
  'PS',
  'RA',
  'SC',
  'SI',
];

const STATUSES = ['Not Started', 'In Progress', 'Implemented', 'Verified'];

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

const POAM_STATUSES = ['Open', 'In Progress', 'Completed', 'Risk Accepted'];

export const ReportOptionsForm: React.FC<ReportOptionsFormProps> = ({
  availableFormats,
  selectedFormat,
  onFormatChange,
  filters,
  onFiltersChange,
  customTitle,
  onCustomTitleChange,
  reportType,
}) => {
  const handleFilterChange = (key: keyof ReportFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleMultiSelectChange = (
    key: keyof ReportFilters,
    event: SelectChangeEvent<string[]>
  ) => {
    const value = event.target.value;
    onFiltersChange({
      ...filters,
      [key]: typeof value === 'string' ? value.split(',') : value,
    });
  };

  return (
    <Paper sx={{ p: 3, bgcolor: 'background.paper' }}>
      <Typography variant="h6" gutterBottom>
        Report Options
      </Typography>

      {/* Format Selection */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Format</InputLabel>
        <Select
          value={selectedFormat}
          label="Format"
          onChange={(e) => onFormatChange(e.target.value as ReportFormat)}
        >
          {availableFormats.map((format) => (
            <MenuItem key={format} value={format}>
              {format.toUpperCase()}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Custom Title */}
      <TextField
        fullWidth
        label="Custom Title (Optional)"
        value={customTitle}
        onChange={(e) => onCustomTitleChange(e.target.value)}
        sx={{ mb: 2 }}
        placeholder="Leave blank for default title"
      />

      {/* Filters Section */}
      <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
        Filters
      </Typography>

      {/* Date Range */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          type="date"
          label="Date From"
          value={filters.dateFrom || ''}
          onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
        <TextField
          type="date"
          label="Date To"
          value={filters.dateTo || ''}
          onChange={(e) => handleFilterChange('dateTo', e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
      </Box>

      {/* Control Families */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Control Families</InputLabel>
        <Select
          multiple
          value={filters.families || []}
          label="Control Families"
          onChange={(e) => handleMultiSelectChange('families', e)}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => (
                <Chip key={value} label={value} size="small" />
              ))}
            </Box>
          )}
        >
          {CONTROL_FAMILIES.map((family) => (
            <MenuItem key={family} value={family}>
              {family}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Statuses (except for POAM report) */}
      {reportType !== 'poam' && (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Statuses</InputLabel>
          <Select
            multiple
            value={filters.statuses || []}
            label="Statuses"
            onChange={(e) => handleMultiSelectChange('statuses', e)}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
          >
            {STATUSES.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* POAM Statuses (only for POAM report) */}
      {reportType === 'poam' && (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>POAM Statuses</InputLabel>
          <Select
            multiple
            value={filters.poamStatuses || []}
            label="POAM Statuses"
            onChange={(e) => handleMultiSelectChange('poamStatuses', e)}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
          >
            {POAM_STATUSES.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Priorities */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Priorities</InputLabel>
        <Select
          multiple
          value={filters.priorities || []}
          label="Priorities"
          onChange={(e) => handleMultiSelectChange('priorities', e)}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => (
                <Chip key={value} label={value} size="small" />
              ))}
            </Box>
          )}
        >
          {PRIORITIES.map((priority) => (
            <MenuItem key={priority} value={priority}>
              {priority}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Risk Score Range (for Gap Analysis) */}
      {reportType === 'gap-analysis' && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            type="number"
            label="Min Risk Score"
            value={filters.riskScoreMin || ''}
            onChange={(e) =>
              handleFilterChange('riskScoreMin', parseInt(e.target.value) || undefined)
            }
            inputProps={{ min: 0, max: 10 }}
            fullWidth
          />
          <TextField
            type="number"
            label="Max Risk Score"
            value={filters.riskScoreMax || ''}
            onChange={(e) =>
              handleFilterChange('riskScoreMax', parseInt(e.target.value) || undefined)
            }
            inputProps={{ min: 0, max: 10 }}
            fullWidth
          />
        </Box>
      )}

      {/* Evidence Filter */}
      {(reportType === 'detailed-compliance' || reportType === 'gap-analysis') && (
        <FormGroup sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={filters.hasEvidence === true}
                onChange={(e) =>
                  handleFilterChange(
                    'hasEvidence',
                    e.target.checked ? true : undefined
                  )
                }
              />
            }
            label="Has Evidence Only"
          />
        </FormGroup>
      )}

      {/* Overdue Only (for POAM) */}
      {reportType === 'poam' && (
        <FormGroup sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={filters.overdueOnly || false}
                onChange={(e) =>
                  handleFilterChange('overdueOnly', e.target.checked)
                }
              />
            }
            label="Overdue POAMs Only"
          />
        </FormGroup>
      )}

      {/* Clear Filters Button */}
      <Button
        variant="outlined"
        onClick={() => onFiltersChange({})}
        fullWidth
        sx={{ mt: 2 }}
      >
        Clear All Filters
      </Button>
    </Paper>
  );
};
```

---

## Step 5: Create Report History Component

📁 **File**: `client/src/components/reports/ReportHistory.tsx`

🔄 **COMPLETE NEW FILE**:

```typescript
import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import { Download, Delete, PictureAsPdf, Description, TableChart } from '@mui/icons-material';
import { ReportHistoryItem, ReportFormat } from '../../types/reports';
import { format } from 'date-fns';

interface ReportHistoryProps {
  reports: ReportHistoryItem[];
  onDownload: (reportId: number) => void;
  onDelete: (reportId: number) => void;
}

const formatIcons: Record<ReportFormat, React.ReactElement> = {
  pdf: <PictureAsPdf fontSize="small" />,
  excel: <TableChart fontSize="small" />,
  csv: <Description fontSize="small" />,
};

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const ReportHistory: React.FC<ReportHistoryProps> = ({
  reports,
  onDownload,
  onDelete,
}) => {
  if (reports.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No reports generated yet
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ bgcolor: 'background.paper' }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Report Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Format</TableCell>
            <TableCell>Generated</TableCell>
            <TableCell>Size</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id} hover>
              <TableCell>
                <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                  {report.reportName}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={report.reportType.replace('-', ' ')}
                  size="small"
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {formatIcons[report.format]}
                  <Typography variant="body2">
                    {report.format.toUpperCase()}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {format(new Date(report.generatedAt), 'MMM dd, yyyy HH:mm')}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {formatFileSize(report.fileSize)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Download">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => onDownload(report.id)}
                  >
                    <Download />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onDelete(report.id)}
                  >
                    <Delete />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
```

---

## Step 6: Create Main Reports Page

📁 **File**: `client/src/pages/Reports.tsx`

🔄 **COMPLETE NEW FILE**:

```typescript
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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Report Builder
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Generate compliance reports in multiple formats
        </Typography>
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
    </Container>
  );
};
```

---

## Step 7: Add Report Route to App

📁 **File**: `client/src/App.tsx`

🔍 **FIND** the route definitions section:
```typescript
<Route path="/poams" element={<POAMManager />} />
```

✏️ **ADD AFTER**:
```typescript
import { Reports } from './pages/Reports';

<Route path="/reports" element={<Reports />} />
```

---

## Step 8: Add Reports to Navigation

📁 **File**: `client/src/components/layout/Sidebar.tsx` (or wherever navigation is defined)

🔍 **FIND** the navigation menu items:
```typescript
{ text: 'POAMs', path: '/poams', icon: <Assignment /> },
```

✏️ **ADD AFTER**:
```typescript
import { Assessment } from '@mui/icons-material';

{ text: 'Reports', path: '/reports', icon: <Assessment /> },
```

---

## Step 9: Testing the Frontend

### Manual Testing Checklist:
1. Navigate to `/reports` page
2. Verify all 6 report types are displayed
3. Select each report type and verify available formats
4. Configure filters and options
5. Generate a report (test all 3 formats)
6. Verify download starts automatically
7. Check report history updates
8. Download report from history
9. Delete report from history
10. Test stepper navigation (Next, Back, Reset)

---

## Verification Checklist

- [ ] Reports page loads without errors
- [ ] All report types displayed with correct icons and descriptions
- [ ] Format selection updates based on report type
- [ ] Filters update correctly
- [ ] Custom title input works
- [ ] Generate button triggers report generation
- [ ] Loading state shows during generation
- [ ] Success message displays on completion
- [ ] Report auto-downloads after generation
- [ ] Report history displays generated reports
- [ ] Download from history works
- [ ] Delete from history works with confirmation
- [ ] Stepper navigation works correctly
- [ ] Reset button clears all selections

---

## Success Criteria

✅ Phase 7.4 is complete when:
1. Report Builder page fully functional
2. All 6 report types selectable
3. Format selection works for CSV, Excel, PDF
4. Filters apply correctly based on report type
5. Report generation triggers backend API
6. Reports download automatically
7. Report history displays and updates
8. Download and delete from history work
9. UI provides clear feedback (loading, success, errors)
10. Responsive design works on mobile/tablet

---

## Next Steps

Proceed to **Phase 7.5: Advanced Features & Polish**
