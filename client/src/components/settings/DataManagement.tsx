import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Button,
  Typography,
  Alert,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  HealthAndSafety as HealthIcon,
  CleaningServices as CleanIcon,
} from '@mui/icons-material';
import { backupService } from '../../services/backup.service';

interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
  metadata?: any;
}

interface SystemHealth {
  database: {
    size: number;
    sizeFormatted: string;
    path: string;
  };
  records: {
    controls: number;
    assessments: number;
    poams: number;
    evidence: number;
  };
  backups: {
    count: number;
    lastBackup: {
      filename: string;
      createdAt: string;
      size: string;
    } | null;
  };
  integrity: {
    passed: boolean;
    checks: Array<{
      name: string;
      passed: boolean;
      message: string;
      details?: any;
    }>;
    summary: {
      totalChecks: number;
      passedChecks: number;
      failedChecks: number;
    };
  };
}

export const DataManagement: React.FC = () => {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Dialog states
  const [restoreDialog, setRestoreDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [clearAssessmentsDialog, setClearAssessmentsDialog] = useState(false);
  const [clearHistoryDialog, setClearHistoryDialog] = useState(false);
  const [integrityDialog, setIntegrityDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [backupList, health] = await Promise.all([
        backupService.listBackups(),
        backupService.getSystemHealth(),
      ]);
      setBackups(backupList);
      setSystemHealth(health);
    } catch (error) {
      console.error('Failed to load data:', error);
      showMessage('error', 'Failed to load data management information');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setStatus(type);
    setMessage(text);
    setTimeout(() => setStatus('idle'), 5000);
  };

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      await backupService.createBackup();
      showMessage('success', 'Backup created successfully');
      await loadData();
    } catch (error) {
      showMessage('error', 'Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;

    try {
      setLoading(true);
      setRestoreDialog(false);
      await backupService.restoreBackup(selectedBackup);
      showMessage('success', 'Database restored successfully. Page will reload...');

      // Reload page after 2 seconds
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      showMessage('error', 'Failed to restore backup');
      setLoading(false);
    }
  };

  const handleDeleteBackup = async () => {
    if (!selectedBackup) return;

    try {
      setLoading(true);
      setDeleteDialog(false);
      await backupService.deleteBackup(selectedBackup);
      showMessage('success', 'Backup deleted successfully');
      await loadData();
    } catch (error) {
      showMessage('error', 'Failed to delete backup');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      await backupService.exportData();
      showMessage('success', 'Data exported successfully');
    } catch (error) {
      showMessage('error', 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIntegrity = async () => {
    try {
      setLoading(true);
      await backupService.checkIntegrity();
      await loadData();
      setIntegrityDialog(true);
    } catch (error) {
      showMessage('error', 'Failed to check integrity');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAssessments = async () => {
    try {
      setLoading(true);
      setClearAssessmentsDialog(false);
      const count = await backupService.clearAssessmentHistory();
      showMessage('success', `Cleared ${count} assessment records`);
      await loadData();
    } catch (error) {
      showMessage('error', 'Failed to clear assessment history');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      setLoading(true);
      setClearHistoryDialog(false);
      const count = await backupService.clearChangeHistory();
      showMessage('success', `Cleared ${count} change history records`);
      await loadData();
    } catch (error) {
      showMessage('error', 'Failed to clear change history');
    } finally {
      setLoading(false);
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
    return new Date(dateString).toLocaleString();
  };

  return (
    <Box>
      {/* Status Messages */}
      {status !== 'idle' && (
        <Alert severity={status === 'error' ? 'error' : 'success'} sx={{ mb: 3 }}>
          {message}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* System Health Section */}
      {systemHealth && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#2C2C2C' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">System Health</Typography>
            <Button
              startIcon={<RefreshIcon />}
              onClick={loadData}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            {/* Database Info */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Database
              </Typography>
              <Typography variant="body2">
                Size: {systemHealth.database.sizeFormatted}
              </Typography>
              <Typography variant="body2" color="text.secondary" fontSize="0.75rem">
                {systemHealth.database.path}
              </Typography>
            </Grid>

            {/* Record Counts */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Records
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="body2">Controls: {systemHealth.records.controls}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Assessments: {systemHealth.records.assessments}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">POAMs: {systemHealth.records.poams}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Evidence: {systemHealth.records.evidence}</Typography>
                </Grid>
              </Grid>
            </Grid>

            {/* Last Backup */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Backups
              </Typography>
              {systemHealth.backups.lastBackup ? (
                <>
                  <Typography variant="body2">
                    Last Backup: {formatDate(systemHealth.backups.lastBackup.createdAt)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Size: {systemHealth.backups.lastBackup.size}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No backups available
                </Typography>
              )}
            </Grid>

            {/* Integrity Status */}
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Integrity
                  </Typography>
                  <Chip
                    icon={systemHealth.integrity.passed ? <CheckCircleIcon /> : <ErrorIcon />}
                    label={systemHealth.integrity.passed ? 'All Checks Passed' : 'Issues Found'}
                    color={systemHealth.integrity.passed ? 'success' : 'error'}
                    size="small"
                  />
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                    {systemHealth.integrity.summary.passedChecks}/{systemHealth.integrity.summary.totalChecks} checks passed
                  </Typography>
                </Box>
                <Button
                  size="small"
                  onClick={handleCheckIntegrity}
                  startIcon={<AssessmentIcon />}
                  disabled={loading}
                >
                  Run Checks
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Backup Operations */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#2C2C2C' }}>
        <Typography variant="h6" gutterBottom>
          Backup & Restore
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<BackupIcon />}
            onClick={handleCreateBackup}
            disabled={loading}
            sx={{ mr: 2, mb: 1 }}
          >
            Create Backup
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportData}
            disabled={loading}
            sx={{ mb: 1 }}
          >
            Export Data (JSON)
          </Button>
        </Box>

        {/* Backups Table */}
        {backups.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Filename</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.filename}>
                    <TableCell>{backup.filename}</TableCell>
                    <TableCell>{formatDate(backup.createdAt)}</TableCell>
                    <TableCell>{formatBytes(backup.size)}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedBackup(backup.filename);
                          setRestoreDialog(true);
                        }}
                        disabled={loading}
                        title="Restore"
                      >
                        <RestoreIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedBackup(backup.filename);
                          setDeleteDialog(true);
                        }}
                        disabled={loading}
                        title="Delete"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info">
            No backups available. Create your first backup to enable restore functionality.
          </Alert>
        )}
      </Paper>

      {/* Data Cleanup */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#2C2C2C' }}>
        <Typography variant="h6" gutterBottom>
          Data Cleanup
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Alert severity="warning" sx={{ mb: 2 }}>
          These operations cannot be undone. Create a backup before proceeding.
        </Alert>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<CleanIcon />}
              onClick={() => setClearAssessmentsDialog(true)}
              disabled={loading}
              fullWidth
            >
              Clear Assessment History
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<CleanIcon />}
              onClick={() => setClearHistoryDialog(true)}
              disabled={loading}
              fullWidth
            >
              Clear Change History
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialog} onClose={() => setRestoreDialog(false)}>
        <DialogTitle>Restore Database?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will replace your current database with the backup. The application will reload after restore.
            <br /><br />
            <strong>Backup to restore: {selectedBackup}</strong>
            <br /><br />
            A backup of your current database will be created before restoring.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialog(false)}>Cancel</Button>
          <Button onClick={handleRestoreBackup} color="primary" variant="contained">
            Restore
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Backup?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this backup? This action cannot be undone.
            <br /><br />
            <strong>Backup: {selectedBackup}</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteBackup} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear Assessments Dialog */}
      <Dialog open={clearAssessmentsDialog} onClose={() => setClearAssessmentsDialog(false)}>
        <DialogTitle>Clear Assessment History?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete all assessment records. Control status and other data will not be affected.
            <br /><br />
            <strong>This action cannot be undone.</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearAssessmentsDialog(false)}>Cancel</Button>
          <Button onClick={handleClearAssessments} color="error" variant="contained">
            Clear Assessments
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear History Dialog */}
      <Dialog open={clearHistoryDialog} onClose={() => setClearHistoryDialog(false)}>
        <DialogTitle>Clear Change History?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete all change history records. Current data will not be affected.
            <br /><br />
            <strong>This action cannot be undone.</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearHistoryDialog(false)}>Cancel</Button>
          <Button onClick={handleClearHistory} color="error" variant="contained">
            Clear History
          </Button>
        </DialogActions>
      </Dialog>

      {/* Integrity Check Dialog */}
      {systemHealth && (
        <Dialog
          open={integrityDialog}
          onClose={() => setIntegrityDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HealthIcon />
              Integrity Check Results
            </Box>
          </DialogTitle>
          <DialogContent>
            <List>
              {systemHealth.integrity.checks.map((check, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    {check.passed ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={check.name}
                    secondary={check.message}
                  />
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Summary: {systemHealth.integrity.summary.passedChecks} of {systemHealth.integrity.summary.totalChecks} checks passed
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIntegrityDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};
