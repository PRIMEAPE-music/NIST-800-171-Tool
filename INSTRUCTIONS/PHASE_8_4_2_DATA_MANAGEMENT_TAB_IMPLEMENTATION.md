# Phase 8.4.2: Data Management Tab - Detailed Implementation

## Overview
The Data Management tab provides tools for backup/restore, data export/import, and database maintenance operations. This is a critical feature for data safety and portability.

## Component Architecture

```
DataManagementTab (Main Container)
├── BackupRestoreSection
│   ├── Create Backup Button
│   ├── Restore from File
│   └── Backup History List
├── DataExportSection
│   ├── Export Format Selector
│   ├── Data Type Checkboxes
│   └── Export Button
├── DataImportSection
│   ├── File Upload Zone
│   ├── Import Preview
│   └── Import Button
└── DangerZoneSection
    ├── Clear Assessments
    ├── Clear POAMs
    ├── Clear Evidence
    └── Factory Reset
```

## Part 1: Main Data Management Tab Component

### File: client/src/components/settings/DataManagementTab.tsx

```typescript
import React, { useState } from 'react';
import { Box, Typography, Alert, Divider } from '@mui/material';
import { BackupRestoreSection } from './BackupRestoreSection';
import { DataExportSection } from './DataExportSection';
import { DataImportSection } from './DataImportSection';
import { DangerZoneSection } from './DangerZoneSection';
import { SystemSettings } from '../../types/settings.types';

interface DataManagementTabProps {
  systemSettings: SystemSettings;
  onUpdate: () => void;
}

export const DataManagementTab: React.FC<DataManagementTabProps> = ({
  systemSettings,
  onUpdate,
}) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDataChange = () => {
    setRefreshKey((prev) => prev + 1);
    onUpdate();
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Important Notice */}
      <Alert severity="warning" sx={{ mb: 3 }}>
        <strong>Important:</strong> Always create a backup before performing any data
        management operations. These actions can result in permanent data loss.
      </Alert>

      {/* Backup & Restore Section */}
      <BackupRestoreSection
        lastBackup={systemSettings.lastBackup}
        onDataChange={handleDataChange}
      />

      <Divider sx={{ my: 4, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

      {/* Data Export Section */}
      <DataExportSection />

      <Divider sx={{ my: 4, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

      {/* Data Import Section */}
      <DataImportSection onDataChange={handleDataChange} />

      <Divider sx={{ my: 4, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

      {/* Danger Zone Section */}
      <DangerZoneSection onDataChange={handleDataChange} />
    </Box>
  );
};

export default DataManagementTab;
```

## Part 2: Backup & Restore Section

### File: client/src/components/settings/BackupRestoreSection.tsx

```typescript
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Backup,
  Restore,
  Download,
  Delete,
  CloudDownload,
} from '@mui/icons-material';
import { settingsService } from '../../services/settings.service';
import { ConfirmationDialog } from '../common/ConfirmationDialog';

interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
}

interface BackupRestoreSectionProps {
  lastBackup?: string;
  onDataChange: () => void;
}

export const BackupRestoreSection: React.FC<BackupRestoreSectionProps> = ({
  lastBackup,
  onDataChange,
}) => {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      setIsLoading(true);
      const response = await settingsService.listBackups();
      setBackups(response);
    } catch (error) {
      console.error('Failed to load backups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setIsCreating(true);
      setMessage(null);

      const result = await settingsService.createBackup();

      setMessage({
        type: 'success',
        text: `Backup created successfully: ${result.filename}`,
      });

      await loadBackups();
      onDataChange();
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to create backup. Please try again.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.db') || file.name.endsWith('.sqlite')) {
        setUploadedFile(file);
        setShowRestoreDialog(true);
        setMessage(null);
      } else {
        setMessage({
          type: 'error',
          text: 'Invalid file type. Please select a .db or .sqlite file.',
        });
      }
    }
  };

  const handleRestore = async () => {
    if (!uploadedFile) return;

    try {
      setMessage({
        type: 'info',
        text: 'Restoring database... This may take a moment.',
      });

      await settingsService.restoreBackup(uploadedFile);

      setMessage({
        type: 'success',
        text: 'Database restored successfully! Please refresh the page.',
      });

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to restore backup. The file may be corrupted or invalid.',
      });
    } finally {
      setShowRestoreDialog(false);
      setUploadedFile(null);
    }
  };

  const handleDownloadBackup = async (filename: string) => {
    try {
      await settingsService.downloadBackup(filename);
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to download backup file.',
      });
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    try {
      await settingsService.deleteBackup(filename);
      await loadBackups();
      setMessage({
        type: 'success',
        text: 'Backup deleted successfully.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to delete backup.',
      });
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ color: '#E0E0E0', mb: 2 }}>
        Backup & Restore
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      <Paper
        sx={{
          p: 3,
          backgroundColor: '#1E1E1E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Last Backup Info */}
        {lastBackup && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
              Last Backup: {formatDate(lastBackup)}
            </Typography>
          </Box>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            startIcon={isCreating ? <CircularProgress size={16} /> : <Backup />}
            onClick={handleCreateBackup}
            disabled={isCreating}
            sx={{
              backgroundColor: '#90CAF9',
              color: '#121212',
              '&:hover': { backgroundColor: '#64B5F6' },
            }}
          >
            Create Backup
          </Button>

          <Button
            variant="outlined"
            component="label"
            startIcon={<Restore />}
            sx={{
              color: '#90CAF9',
              borderColor: '#90CAF9',
              '&:hover': {
                borderColor: '#64B5F6',
                backgroundColor: 'rgba(144, 202, 249, 0.08)',
              },
            }}
          >
            Restore from File
            <input
              type="file"
              hidden
              accept=".db,.sqlite"
              onChange={handleFileSelect}
            />
          </Button>
        </Box>

        {/* Backup History */}
        <Typography variant="subtitle2" sx={{ color: '#E0E0E0', mb: 1 }}>
          Backup History
        </Typography>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : backups.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#757575', p: 2 }}>
            No backups found. Create your first backup above.
          </Typography>
        ) : (
          <List sx={{ backgroundColor: '#242424', borderRadius: 1 }}>
            {backups.map((backup, index) => (
              <ListItem
                key={backup.filename}
                divider={index < backups.length - 1}
                sx={{
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.03)' },
                }}
              >
                <ListItemText
                  primary={backup.filename}
                  secondary={`${formatDate(backup.createdAt)} • ${formatBytes(
                    backup.size
                  )}`}
                  primaryTypographyProps={{ color: '#E0E0E0' }}
                  secondaryTypographyProps={{ color: '#B0B0B0' }}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleDownloadBackup(backup.filename)}
                    sx={{ color: '#90CAF9', mr: 1 }}
                  >
                    <Download />
                  </IconButton>
                  <IconButton
                    edge="end"
                    onClick={() => handleDeleteBackup(backup.filename)}
                    sx={{ color: '#F44336' }}
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Restore Confirmation Dialog */}
      <ConfirmationDialog
        open={showRestoreDialog}
        title="Restore Database?"
        message="This will replace your current database with the backup file. All current data will be lost. Are you sure you want to continue?"
        onConfirm={handleRestore}
        onCancel={() => {
          setShowRestoreDialog(false);
          setUploadedFile(null);
        }}
        confirmText="Restore"
        severity="warning"
      />
    </Box>
  );
};
```

## Part 3: Data Export Section

### File: client/src/components/settings/DataExportSection.tsx

```typescript
import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  SelectChangeEvent,
} from '@mui/material';
import { CloudDownload } from '@mui/icons-material';
import { settingsService } from '../../services/settings.service';

interface ExportOptions {
  format: 'json' | 'csv' | 'excel';
  includeControls: boolean;
  includeAssessments: boolean;
  includePoams: boolean;
  includeEvidence: boolean;
}

export const DataExportSection: React.FC = () => {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'json',
    includeControls: true,
    includeAssessments: true,
    includePoams: true,
    includeEvidence: true,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const handleFormatChange = (event: SelectChangeEvent<string>) => {
    setOptions({ ...options, format: event.target.value as 'json' | 'csv' | 'excel' });
    setMessage(null);
  };

  const handleCheckboxChange = (field: keyof ExportOptions) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setOptions({ ...options, [field]: event.target.checked });
    setMessage(null);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setMessage(null);

      // Validate at least one data type is selected
      if (
        !options.includeControls &&
        !options.includeAssessments &&
        !options.includePoams &&
        !options.includeEvidence
      ) {
        setMessage({
          type: 'error',
          text: 'Please select at least one data type to export.',
        });
        return;
      }

      await settingsService.exportData(options);

      setMessage({
        type: 'success',
        text: 'Data exported successfully! Your download should start automatically.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to export data. Please try again.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ color: '#E0E0E0', mb: 2 }}>
        Data Export
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      <Paper
        sx={{
          p: 3,
          backgroundColor: '#1E1E1E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Export Format */}
          <FormControl fullWidth>
            <InputLabel sx={{ color: '#B0B0B0' }}>Export Format</InputLabel>
            <Select
              value={options.format}
              onChange={handleFormatChange}
              label="Export Format"
              sx={{
                backgroundColor: '#242424',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                },
                '& .MuiSelect-select': { color: '#E0E0E0' },
              }}
            >
              <MenuItem value="json">JSON</MenuItem>
              <MenuItem value="csv">CSV</MenuItem>
              <MenuItem value="excel">Excel (.xlsx)</MenuItem>
            </Select>
          </FormControl>

          {/* Data Type Selection */}
          <Box>
            <Typography variant="subtitle2" sx={{ color: '#E0E0E0', mb: 1 }}>
              Include Data Types:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={options.includeControls}
                    onChange={handleCheckboxChange('includeControls')}
                    sx={{ color: '#90CAF9' }}
                  />
                }
                label="Controls & Status"
                sx={{ color: '#E0E0E0' }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={options.includeAssessments}
                    onChange={handleCheckboxChange('includeAssessments')}
                    sx={{ color: '#90CAF9' }}
                  />
                }
                label="Assessments"
                sx={{ color: '#E0E0E0' }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={options.includePoams}
                    onChange={handleCheckboxChange('includePoams')}
                    sx={{ color: '#90CAF9' }}
                  />
                }
                label="POAMs"
                sx={{ color: '#E0E0E0' }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={options.includeEvidence}
                    onChange={handleCheckboxChange('includeEvidence')}
                    sx={{ color: '#90CAF9' }}
                  />
                }
                label="Evidence Metadata"
                sx={{ color: '#E0E0E0' }}
              />
            </Box>
          </Box>

          {/* Export Button */}
          <Button
            variant="contained"
            startIcon={
              isExporting ? <CircularProgress size={16} /> : <CloudDownload />
            }
            onClick={handleExport}
            disabled={isExporting}
            sx={{
              backgroundColor: '#90CAF9',
              color: '#121212',
              '&:hover': { backgroundColor: '#64B5F6' },
              alignSelf: 'flex-start',
            }}
          >
            Export Data
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
```

## Part 4: Data Import Section

### File: client/src/components/settings/DataImportSection.tsx

```typescript
import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { settingsService } from '../../services/settings.service';
import { ConfirmationDialog } from '../common/ConfirmationDialog';

interface DataImportSectionProps {
  onDataChange: () => void;
}

export const DataImportSection: React.FC<DataImportSectionProps> = ({
  onDataChange,
}) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [mergeStrategy, setMergeStrategy] = useState<'overwrite' | 'skip' | 'merge'>(
    'merge'
  );
  const [isImporting, setIsImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.json')) {
        setUploadedFile(file);
        setShowImportDialog(true);
        setMessage(null);
      } else {
        setMessage({
          type: 'error',
          text: 'Invalid file type. Please select a JSON file.',
        });
      }
    }
  };

  const handleImport = async () => {
    if (!uploadedFile) return;

    try {
      setIsImporting(true);
      setMessage({
        type: 'info',
        text: 'Importing data... This may take a moment.',
      });

      await settingsService.importData(uploadedFile, { mergeStrategy });

      setMessage({
        type: 'success',
        text: 'Data imported successfully!',
      });

      onDataChange();
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to import data. The file may be invalid or corrupted.',
      });
    } finally {
      setIsImporting(false);
      setShowImportDialog(false);
      setUploadedFile(null);
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ color: '#E0E0E0', mb: 2 }}>
        Data Import
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      <Paper
        sx={{
          p: 3,
          backgroundColor: '#1E1E1E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Merge Strategy */}
          <FormControl fullWidth>
            <InputLabel sx={{ color: '#B0B0B0' }}>Merge Strategy</InputLabel>
            <Select
              value={mergeStrategy}
              onChange={(e: SelectChangeEvent<'overwrite' | 'skip' | 'merge'>) =>
                setMergeStrategy(e.target.value as 'overwrite' | 'skip' | 'merge')
              }
              label="Merge Strategy"
              sx={{
                backgroundColor: '#242424',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                },
                '& .MuiSelect-select': { color: '#E0E0E0' },
              }}
            >
              <MenuItem value="merge">Merge - Keep both versions</MenuItem>
              <MenuItem value="overwrite">Overwrite - Replace existing</MenuItem>
              <MenuItem value="skip">Skip - Keep existing only</MenuItem>
            </Select>
          </FormControl>

          {/* File Upload */}
          <Box
            sx={{
              border: '2px dashed rgba(255, 255, 255, 0.12)',
              borderRadius: 1,
              p: 3,
              textAlign: 'center',
              backgroundColor: '#242424',
            }}
          >
            <CloudUpload sx={{ fontSize: 48, color: '#757575', mb: 2 }} />
            <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 2 }}>
              Drag and drop a JSON file here, or click to browse
            </Typography>
            <Button
              variant="outlined"
              component="label"
              disabled={isImporting}
              sx={{
                color: '#90CAF9',
                borderColor: '#90CAF9',
                '&:hover': {
                  borderColor: '#64B5F6',
                  backgroundColor: 'rgba(144, 202, 249, 0.08)',
                },
              }}
            >
              Select File
              <input
                type="file"
                hidden
                accept=".json"
                onChange={handleFileSelect}
              />
            </Button>
          </Box>

          {uploadedFile && (
            <Alert severity="info">
              Selected file: {uploadedFile.name}
            </Alert>
          )}
        </Box>
      </Paper>

      {/* Import Confirmation Dialog */}
      <ConfirmationDialog
        open={showImportDialog}
        title="Import Data?"
        message={`This will import data using the "${mergeStrategy}" strategy. ${
          mergeStrategy === 'overwrite'
            ? 'Existing data will be replaced.'
            : 'Data will be merged with existing records.'
        } Continue?`}
        onConfirm={handleImport}
        onCancel={() => {
          setShowImportDialog(false);
          setUploadedFile(null);
        }}
        confirmText="Import"
        severity="warning"
      />
    </Box>
  );
};
```

## Part 5: Danger Zone Section

### File: client/src/components/settings/DangerZoneSection.tsx

```typescript
import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import { DeleteForever, Warning } from '@mui/icons-material';
import { settingsService } from '../../services/settings.service';
import { ConfirmationDialog } from '../common/ConfirmationDialog';

interface DangerZoneSectionProps {
  onDataChange: () => void;
}

type DangerAction =
  | 'clearAssessments'
  | 'clearPoams'
  | 'clearEvidence'
  | 'factoryReset'
  | null;

export const DangerZoneSection: React.FC<DangerZoneSectionProps> = ({
  onDataChange,
}) => {
  const [activeAction, setActiveAction] = useState<DangerAction>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleAction = async (action: DangerAction) => {
    if (!action) return;

    try {
      setIsProcessing(true);
      setMessage(null);

      switch (action) {
        case 'clearAssessments':
          await settingsService.clearAssessments();
          setMessage({
            type: 'success',
            text: 'All assessments have been cleared.',
          });
          break;
        case 'clearPoams':
          await settingsService.clearPoams();
          setMessage({
            type: 'success',
            text: 'All POAMs have been cleared.',
          });
          break;
        case 'clearEvidence':
          await settingsService.clearEvidence();
          setMessage({
            type: 'success',
            text: 'All evidence records have been cleared.',
          });
          break;
        case 'factoryReset':
          await settingsService.factoryReset();
          setMessage({
            type: 'success',
            text: 'Database reset to factory defaults. Refreshing...',
          });
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          break;
      }

      onDataChange();
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Operation failed. Please try again.',
      });
    } finally {
      setIsProcessing(false);
      setActiveAction(null);
    }
  };

  const getDialogContent = (action: DangerAction) => {
    switch (action) {
      case 'clearAssessments':
        return {
          title: 'Clear All Assessments?',
          message:
            'This will permanently delete all assessment data. Control definitions will remain. This action cannot be undone.',
          confirmText: 'DELETE ASSESSMENTS',
        };
      case 'clearPoams':
        return {
          title: 'Clear All POAMs?',
          message:
            'This will permanently delete all Plan of Action and Milestones records. This action cannot be undone.',
          confirmText: 'DELETE POAMS',
        };
      case 'clearEvidence':
        return {
          title: 'Clear All Evidence?',
          message:
            'This will permanently delete all evidence records and uploaded files. This action cannot be undone.',
          confirmText: 'DELETE EVIDENCE',
        };
      case 'factoryReset':
        return {
          title: 'Reset to Factory Defaults?',
          message:
            'This will delete ALL data except NIST control definitions. Assessments, POAMs, evidence, settings, and all custom data will be permanently deleted. This action cannot be undone.',
          confirmText: 'RESET EVERYTHING',
        };
      default:
        return {
          title: '',
          message: '',
          confirmText: '',
        };
    }
  };

  const dialogContent = activeAction ? getDialogContent(activeAction) : null;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Warning sx={{ color: '#F44336' }} />
        <Typography variant="h6" sx={{ color: '#F44336' }}>
          Danger Zone
        </Typography>
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      <Paper
        sx={{
          p: 3,
          backgroundColor: '#1E1E1E',
          border: '2px solid #F44336',
        }}
      >
        <Alert severity="error" sx={{ mb: 3 }}>
          <strong>Warning:</strong> These actions are irreversible and will result in
          permanent data loss. Always create a backup before proceeding.
        </Alert>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={
              isProcessing && activeAction === 'clearAssessments' ? (
                <CircularProgress size={16} />
              ) : (
                <DeleteForever />
              )
            }
            onClick={() => setActiveAction('clearAssessments')}
            disabled={isProcessing}
            sx={{
              color: '#F44336',
              borderColor: '#F44336',
              '&:hover': {
                borderColor: '#D32F2F',
                backgroundColor: 'rgba(244, 67, 54, 0.08)',
              },
            }}
          >
            Clear All Assessments
          </Button>

          <Button
            variant="outlined"
            startIcon={
              isProcessing && activeAction === 'clearPoams' ? (
                <CircularProgress size={16} />
              ) : (
                <DeleteForever />
              )
            }
            onClick={() => setActiveAction('clearPoams')}
            disabled={isProcessing}
            sx={{
              color: '#F44336',
              borderColor: '#F44336',
              '&:hover': {
                borderColor: '#D32F2F',
                backgroundColor: 'rgba(244, 67, 54, 0.08)',
              },
            }}
          >
            Clear All POAMs
          </Button>

          <Button
            variant="outlined"
            startIcon={
              isProcessing && activeAction === 'clearEvidence' ? (
                <CircularProgress size={16} />
              ) : (
                <DeleteForever />
              )
            }
            onClick={() => setActiveAction('clearEvidence')}
            disabled={isProcessing}
            sx={{
              color: '#F44336',
              borderColor: '#F44336',
              '&:hover': {
                borderColor: '#D32F2F',
                backgroundColor: 'rgba(244, 67, 54, 0.08)',
              },
            }}
          >
            Clear All Evidence
          </Button>

          <Button
            variant="contained"
            startIcon={
              isProcessing && activeAction === 'factoryReset' ? (
                <CircularProgress size={16} />
              ) : (
                <DeleteForever />
              )
            }
            onClick={() => setActiveAction('factoryReset')}
            disabled={isProcessing}
            sx={{
              backgroundColor: '#F44336',
              color: '#FFFFFF',
              '&:hover': {
                backgroundColor: '#D32F2F',
              },
            }}
          >
            Reset to Factory Defaults
          </Button>
        </Box>
      </Paper>

      {/* Confirmation Dialog */}
      {dialogContent && (
        <ConfirmationDialog
          open={activeAction !== null}
          title={dialogContent.title}
          message={dialogContent.message}
          confirmText={dialogContent.confirmText}
          onConfirm={() => handleAction(activeAction)}
          onCancel={() => setActiveAction(null)}
          severity="error"
          requireTextConfirmation
        />
      )}
    </Box>
  );
};
```

## Part 6: Confirmation Dialog Component

### File: client/src/components/common/ConfirmationDialog.tsx

```typescript
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Alert,
} from '@mui/material';
import { Warning } from '@mui/icons-material';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  severity?: 'warning' | 'error';
  requireTextConfirmation?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  title,
  message,
  confirmText = 'Confirm',
  onConfirm,
  onCancel,
  severity = 'warning',
  requireTextConfirmation = false,
}) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      await onConfirm();
    } finally {
      setIsProcessing(false);
      setConfirmationText('');
    }
  };

  const handleCancel = () => {
    setConfirmationText('');
    onCancel();
  };

  const isConfirmEnabled =
    !requireTextConfirmation || confirmationText === confirmText;

  const severityColor = severity === 'error' ? '#F44336' : '#FF9800';

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      PaperProps={{
        sx: {
          backgroundColor: '#242424',
          border: `2px solid ${severityColor}`,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Warning sx={{ color: severityColor }} />
        <Typography variant="h6" sx={{ color: '#E0E0E0' }}>
          {title}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Alert severity={severity} sx={{ mb: 2 }}>
          {message}
        </Alert>

        {requireTextConfirmation && (
          <TextField
            fullWidth
            label={`Type "${confirmText}" to confirm`}
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#1E1E1E',
              },
              '& .MuiInputLabel-root': {
                color: '#B0B0B0',
              },
              '& .MuiOutlinedInput-input': {
                color: '#E0E0E0',
              },
            }}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={handleCancel}
          disabled={isProcessing}
          sx={{
            color: '#B0B0B0',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!isConfirmEnabled || isProcessing}
          variant="contained"
          sx={{
            backgroundColor: severityColor,
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: severity === 'error' ? '#D32F2F' : '#F57C00',
            },
            '&.Mui-disabled': {
              backgroundColor: '#424242',
              color: '#757575',
            },
          }}
        >
          {isProcessing ? 'Processing...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;
```

## Next: Backend Implementation

Continue to Phase 8.4.3 for backend API implementation details.
