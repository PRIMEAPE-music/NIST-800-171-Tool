## 🎯 PHASE 5: Frontend Components

### Step 5.1: Create Evidence Card Component

📁 **NEW FILE:** `client/src/components/evidence/EvidenceCard.tsx`

```typescript
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Stack,
  Divider,
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  Verified as VerifiedIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { Evidence } from '@/types/evidence.types';
import { evidenceService } from '@/services/evidenceService';

interface EvidenceCardProps {
  evidence: Evidence;
  onEdit?: (evidence: Evidence) => void;
  onDelete?: (id: number) => void;
  onArchive?: (id: number) => void;
  onUnarchive?: (id: number) => void;
  onViewDetails?: (evidence: Evidence) => void;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  evidence,
  onEdit,
  onDelete,
  onArchive,
  onUnarchive,
  onViewDetails,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDownload = () => {
    evidenceService.downloadEvidence(evidence.id);
    handleMenuClose();
  };

  const handleEdit = () => {
    if (onEdit) onEdit(evidence);
    handleMenuClose();
  };

  const handleDelete = () => {
    if (onDelete) onDelete(evidence.id);
    handleMenuClose();
  };

  const handleArchive = () => {
    if (onArchive) onArchive(evidence.id);
    handleMenuClose();
  };

  const handleUnarchive = () => {
    if (onUnarchive) onUnarchive(evidence.id);
    handleMenuClose();
  };

  const fileIcon = evidenceService.getFileIcon(evidence.fileType);
  const statusColor = evidenceService.getStatusColor(evidence.status);

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRadius: 2,
        transition: 'all 0.2s',
        cursor: onViewDetails ? 'pointer' : 'default',
        '&:hover': {
          transform: onViewDetails ? 'translateY(-4px)' : 'none',
          boxShadow: onViewDetails ? 6 : 1,
        },
        opacity: evidence.isArchived ? 0.6 : 1,
      }}
      onClick={() => onViewDetails && onViewDetails(evidence)}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* Header with icon and menu */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h3" sx={{ fontSize: 32 }}>
            {fileIcon}
          </Typography>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleMenuOpen(e);
            }}
            sx={{ mt: -1, mr: -1 }}
          >
            <MoreIcon />
          </IconButton>
        </Box>

        {/* Filename */}
        <Tooltip title={evidence.originalName}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              mb: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {evidence.originalName}
          </Typography>
        </Tooltip>

        {/* File info */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {evidenceService.formatFileSize(evidence.fileSize)} • {evidence.evidenceType}
        </Typography>

        {/* Description */}
        {evidence.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 1.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {evidence.description}
          </Typography>
        )}

        <Divider sx={{ my: 1.5 }} />

        {/* Status and controls count */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Chip
            label={evidence.status.replace('_', ' ')}
            size="small"
            color={statusColor}
          />
          <Chip
            label={`${evidence.controlMappings.length} control${evidence.controlMappings.length !== 1 ? 's' : ''}`}
            size="small"
            color={evidence.controlMappings.length > 1 ? 'primary' : 'default'}
            icon={<LinkIcon />}
          />
          {evidence.isArchived && (
            <Chip label="Archived" size="small" color="default" />
          )}
        </Box>

        {/* Control mappings preview */}
        {evidence.controlMappings.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Mapped to:
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              {evidence.controlMappings.slice(0, 3).map((mapping) => (
                <Chip
                  key={mapping.id}
                  label={mapping.control.controlId}
                  size="small"
                  variant="outlined"
                  color={evidenceService.getRelationshipColor(mapping.relationship)}
                  icon={mapping.isVerified ? <VerifiedIcon fontSize="small" /> : undefined}
                />
              ))}
              {evidence.controlMappings.length > 3 && (
                <Chip
                  label={`+${evidence.controlMappings.length - 3}`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>
          </Box>
        )}

        {/* Tags */}
        {evidence.tags && evidence.tags.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Tags:
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              {evidence.tags.slice(0, 3).map((tag) => (
                <Chip key={tag} label={tag} size="small" variant="outlined" />
              ))}
              {evidence.tags.length > 3 && (
                <Chip label={`+${evidence.tags.length - 3}`} size="small" variant="outlined" />
              )}
            </Stack>
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {new Date(evidence.uploadedDate).toLocaleDateString()}
        </Typography>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          sx={{ color: 'primary.main' }}
        >
          <DownloadIcon fontSize="small" />
        </IconButton>
      </CardActions>

      {/* Context menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleDownload}>
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          Download
        </MenuItem>
        {onEdit && (
          <MenuItem onClick={handleEdit}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        )}
        {!evidence.isArchived && onArchive && (
          <MenuItem onClick={handleArchive}>
            <ArchiveIcon fontSize="small" sx={{ mr: 1 }} />
            Archive
          </MenuItem>
        )}
        {evidence.isArchived && onUnarchive && (
          <MenuItem onClick={handleUnarchive}>
            <UnarchiveIcon fontSize="small" sx={{ mr: 1 }} />
            Unarchive
          </MenuItem>
        )}
        {onDelete && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
};
```

---

### Step 5.2: Create Evidence Upload Dialog

📁 **NEW FILE:** `client/src/components/evidence/EvidenceUploadDialog.tsx`

```typescript
import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Stack,
  LinearProgress,
  Alert,
  Autocomplete,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useUploadEvidence, useBulkUploadEvidence } from '@/hooks/useEvidence';
import { EvidenceType, EvidenceRelationship, ControlSuggestion } from '@/types/evidence.types';
import { evidenceService } from '@/services/evidenceService';

interface EvidenceUploadDialogProps {
  open: boolean;
  onClose: () => void;
  preSelectedControlId?: number;
  onUploadComplete?: () => void;
}

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
  suggestions?: ControlSuggestion[];
}

export const EvidenceUploadDialog: React.FC<EvidenceUploadDialogProps> = ({
  open,
  onClose,
  preSelectedControlId,
  onUploadComplete,
}) => {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('general');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedControls, setSelectedControls] = useState
    Array<{ controlId: number; relationship: EvidenceRelationship }>
  >([]);
  const [autoSuggest, setAutoSuggest] = useState(true);
  const [uploading, setUploading] = useState(false);

  const uploadMutation = useUploadEvidence();
  const bulkUploadMutation = useBulkUploadEvidence();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newFiles: FileWithProgress[] = acceptedFiles.map((file) => ({
        file,
        progress: 0,
        status: 'pending' as const,
      }));

      setFiles((prev) => [...prev, ...newFiles]);

      // Auto-suggest controls for each file
      if (autoSuggest) {
        for (const fileWithProgress of newFiles) {
          try {
            const suggestions = await evidenceService.suggestControlsForEvidence(
              fileWithProgress.file.name,
              evidenceType
            );
            setFiles((prev) =>
              prev.map((f) =>
                f.file === fileWithProgress.file ? { ...f, suggestions } : f
              )
            );
          } catch (error) {
            console.error('Error fetching suggestions:', error);
          }
        }
      }
    },
    [evidenceType, autoSuggest]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);

    try {
      if (files.length === 1) {
        // Single file upload
        const fileWithProgress = files[0];
        await uploadMutation.mutateAsync({
          file: fileWithProgress.file,
          data: {
            evidenceType,
            description,
            tags,
            controlMappings: selectedControls.map((sc) => ({
              controlId: sc.controlId,
              relationship: sc.relationship,
            })),
          },
          onProgress: (progress) => {
            setFiles((prev) =>
              prev.map((f, i) => (i === 0 ? { ...f, progress, status: 'uploading' as const } : f))
            );
          },
        });

        setFiles((prev) =>
          prev.map((f, i) => (i === 0 ? { ...f, progress: 100, status: 'complete' as const } : f))
        );
      } else {
        // Bulk upload
        await bulkUploadMutation.mutateAsync({
          files: files.map((f) => f.file),
          data: {
            evidenceType,
            defaultControlMappings: selectedControls.map((sc) => ({
              controlId: sc.controlId,
              relationship: sc.relationship,
            })),
          },
          onProgress: (progress) => {
            setFiles((prev) =>
              prev.map((f) => ({ ...f, progress, status: 'uploading' as const }))
            );
          },
        });

        setFiles((prev) =>
          prev.map((f) => ({ ...f, progress: 100, status: 'complete' as const }))
        );
      }

      // Close dialog after brief delay
      setTimeout(() => {
        handleClose();
        if (onUploadComplete) onUploadComplete();
      }, 1000);
    } catch (error) {
      console.error('Upload error:', error);
      setFiles((prev) =>
        prev.map((f) => ({
          ...f,
          status: 'error' as const,
          error: error instanceof Error ? error.message : 'Upload failed',
        }))
      );
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFiles([]);
      setEvidenceType('general');
      setDescription('');
      setTags([]);
      setSelectedControls([]);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Upload Evidence
        <IconButton
          onClick={handleClose}
          disabled={uploading}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Dropzone */}
        <Box
          {...getRootProps()}
          sx={{
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.400',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            bgcolor: isDragActive ? 'action.hover' : 'background.default',
            cursor: 'pointer',
            mb: 3,
            transition: 'all 0.2s',
          }}
        >
          <input {...getInputProps()} />
          <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            or click to browse (max 50MB per file)
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Supported: PDF, Word, Excel, Images, Text, CSV
          </Typography>
        </Box>

        {/* File list */}
        {files.length > 0 && (
          <Paper variant="outlined" sx={{ mb: 3, maxHeight: 200, overflow: 'auto' }}>
            <List dense>
              {files.map((fileWithProgress, index) => (
                <ListItem
                  key={index}
                  secondaryAction={
                    !uploading && (
                      <IconButton edge="end" onClick={() => removeFile(index)} size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )
                  }
                >
                  <ListItemText
                    primary={fileWithProgress.file.name}
                    secondary={
                      <Box>
                        <Typography variant="caption">
                          {evidenceService.formatFileSize(fileWithProgress.file.size)}
                        </Typography>
                        {fileWithProgress.status === 'uploading' && (
                          <LinearProgress
                            variant="determinate"
                            value={fileWithProgress.progress}
                            sx={{ mt: 0.5 }}
                          />
                        )}
                        {fileWithProgress.status === 'complete' && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <CheckIcon fontSize="small" color="success" sx={{ mr: 0.5 }} />
                            <Typography variant="caption" color="success.main">
                              Uploaded
                            </Typography>
                          </Box>
                        )}
                        {fileWithProgress.status === 'error' && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <ErrorIcon fontSize="small" color="error" sx={{ mr: 0.5 }} />
                            <Typography variant="caption" color="error.main">
                              {fileWithProgress.error}
                            </Typography>
                          </Box>
                        )}
                        {fileWithProgress.suggestions && fileWithProgress.suggestions.length > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Suggested: {fileWithProgress.suggestions.slice(0, 3).map(s => s.controlId).join(', ')}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}

        {/* Evidence type */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Evidence Type</InputLabel>
          <Select
            value={evidenceType}
            label="Evidence Type"
            onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
            disabled={uploading}
          >
            <MenuItem value="general">General</MenuItem>
            <MenuItem value="policy">Policy</MenuItem>
            <MenuItem value="procedure">Procedure</MenuItem>
            <MenuItem value="execution">Execution</MenuItem>
            <MenuItem value="screenshot">Screenshot</MenuItem>
            <MenuItem value="log">Log</MenuItem>
            <MenuItem value="report">Report</MenuItem>
            <MenuItem value="configuration">Configuration</MenuItem>
          </Select>
        </FormControl>

        {/* Description */}
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={uploading}
          sx={{ mb: 2 }}
        />

        {/* Tags */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Tags (optional)
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              size="small"
              placeholder="Add tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              disabled={uploading}
            />
            <Button onClick={handleAddTag} disabled={!tagInput.trim() || uploading}>
              Add
            </Button>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onDelete={() => handleRemoveTag(tag)}
                disabled={uploading}
                size="small"
              />
            ))}
          </Stack>
        </Box>

        {/* Auto-suggest toggle */}
        <FormControlLabel
          control={
            <Checkbox
              checked={autoSuggest}
              onChange={(e) => setAutoSuggest(e.target.checked)}
              disabled={uploading}
            />
          }
          label="Auto-suggest control mappings"
          sx={{ mb: 2 }}
        />

        {/* Control mappings info */}
        {files.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {files.length === 1
              ? 'You can map this evidence to multiple controls after upload.'
              : `These ${files.length} files will be uploaded. You can map each to controls individually after upload.`}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          startIcon={<UploadIcon />}
        >
          {uploading ? 'Uploading...' : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

---

### Step 5.3: Create Evidence Detail Dialog

📁 **NEW FILE:** `client/src/components/evidence/EvidenceDetailDialog.tsx`

```typescript
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Stack,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Verified as VerifiedIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { Evidence, EvidenceRelationship } from '@/types/evidence.types';
import { evidenceService } from '@/services/evidenceService';
import {
  useUpdateEvidence,
  useAddControlMapping,
  useRemoveControlMapping,
  useVerifyControlMapping,
} from '@/hooks/useEvidence';

interface EvidenceDetailDialogProps {
  evidence: Evidence;
  open: boolean;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

export const EvidenceDetailDialog: React.FC<EvidenceDetailDialogProps> = ({
  evidence,
  open,
  onClose,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(evidence.description || '');
  const [editedTags, setEditedTags] = useState<string[]>(evidence.tags || []);

  const updateMutation = useUpdateEvidence();
  const addMappingMutation = useAddControlMapping();
  const removeMappingMutation = useRemoveControlMapping();
  const verifyMappingMutation = useVerifyControlMapping();

  const handleDownload = () => {
    evidenceService.downloadEvidence(evidence.id);
  };

  const handleSaveEdit = async () => {
    await updateMutation.mutateAsync({
      id: evidence.id,
      data: {
        description: editedDescription,
        tags: editedTags,
      },
    });
    setEditing(false);
  };

  const handleVerifyMapping = async (mappingId: number) => {
    await verifyMappingMutation.mutateAsync({
      evidenceId: evidence.id,
      mappingId,
    });
  };

  const handleRemoveMapping = async (mappingId: number) => {
    if (confirm('Are you sure you want to remove this control mapping?')) {
      await removeMappingMutation.mutateAsync({
        evidenceId: evidence.id,
        mappingId,
      });
    }
  };

  const fileIcon = evidenceService.getFileIcon(evidence.fileType);
  const statusColor = evidenceService.getStatusColor(evidence.status);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h3" sx={{ fontSize: 32 }}>
            {fileIcon}
          </Typography>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">{evidence.originalName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {evidenceService.formatFileSize(evidence.fileSize)} • {evidence.fileType}
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Status and metadata */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip label={evidence.status.replace('_', ' ')} size="small" color={statusColor} />
            <Chip label={evidence.evidenceType} size="small" variant="outlined" />
            {evidence.isArchived && <Chip label="Archived" size="small" color="default" />}
          </Stack>

          <Typography variant="body2" color="text.secondary">
            <strong>Uploaded:</strong> {new Date(evidence.uploadedDate).toLocaleString()}
            {evidence.uploadedBy && ` by ${evidence.uploadedBy}`}
          </Typography>

          {evidence.reviewedAt && (
            <Typography variant="body2" color="text.secondary">
              <strong>Reviewed:</strong> {new Date(evidence.reviewedAt).toLocaleString()}
              {evidence.reviewedBy && ` by ${evidence.reviewedBy}`}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Tabs */}
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
          <Tab label="Details" />
          <Tab label={`Controls (${evidence.controlMappings.length})`} />
          <Tab label="Manual Reviews" />
        </Tabs>

        {/* Details Tab */}
        <TabPanel value={tabValue} index={0}>
          {/* Description */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Description</Typography>
              {!editing && (
                <IconButton size="small" onClick={() => setEditing(true)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            {editing ? (
              <Box>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  sx={{ mb: 1 }}
                />
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="contained" onClick={handleSaveEdit}>
                    Save
                  </Button>
                  <Button size="small" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </Stack>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {evidence.description || 'No description provided'}
              </Typography>
            )}
          </Box>

          {/* Tags */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Tags
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {evidence.tags && evidence.tags.length > 0 ? (
                evidence.tags.map((tag) => <Chip key={tag} label={tag} size="small" />)
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No tags
                </Typography>
              )}
            </Stack>
          </Box>

          {/* Review notes */}
          {evidence.reviewNotes && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Review Notes
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="body2">{evidence.reviewNotes}</Typography>
              </Paper>
            </Box>
          )}
        </TabPanel>

        {/* Controls Tab */}
        <TabPanel value={tabValue} index={1}>
          {evidence.controlMappings.length > 0 ? (
            <List>
              {evidence.controlMappings.map((mapping) => (
                <ListItem
                  key={mapping.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">{mapping.control.controlId}</Typography>
                        <Chip
                          label={mapping.relationship}
                          size="small"
                          color={evidenceService.getRelationshipColor(mapping.relationship)}
                        />
                        {mapping.isVerified && (
                          <Chip
                            icon={<VerifiedIcon />}
                            label="Verified"
                            size="small"
                            color="success"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2">{mapping.control.title}</Typography>
                        {mapping.notes && (
                          <Typography variant="caption" color="text.secondary">
                            {mapping.notes}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Stack direction="row" spacing={1}>
                      {!mapping.isVerified && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VerifiedIcon />}
                          onClick={() => handleVerifyMapping(mapping.id)}
                        >
                          Verify
                        </Button>
                      )}
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleRemoveMapping(mapping.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Alert severity="info">
              No control mappings yet. Add controls to link this evidence to NIST requirements.
            </Alert>
          )}

          <Button startIcon={<AddIcon />} sx={{ mt: 2 }}>
            Add Control Mapping
          </Button>
        </TabPanel>

        {/* Manual Reviews Tab */}
        <TabPanel value={tabValue} index={2}>
          {evidence.manualReviewLinks.length > 0 ? (
            <List>
              {evidence.manualReviewLinks.map((link) => (
                <ListItem key={link.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                  <ListItemText
                    primary={`Manual Review #${link.reviewId}`}
                    secondary={`Setting ID: ${link.review.settingId}`}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Alert severity="info">
              No manual review associations. This evidence is not linked to any M365 policy reviews.
            </Alert>
          )}
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleDownload}>
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

---

### Step 5.4: Create Evidence Filters Component

📁 **NEW FILE:** `client/src/components/evidence/EvidenceFilters.tsx`

```typescript
import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  InputAdornment,
  Autocomplete,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { EvidenceFilters as EvidenceFiltersType, EvidenceType, EvidenceStatus } from '@/types/evidence.types';

interface EvidenceFiltersProps {
  filters: EvidenceFiltersType;
  onFilterChange: (filters: EvidenceFiltersType) => void;
  onClearFilters: () => void;
}

const CONTROL_FAMILIES = [
  'AC', 'AT', 'AU', 'CA', 'CM', 'CP', 'IA', 'IR', 'MA', 'MP', 'PE', 'PS', 'RA', 'SA', 'SC', 'SI', 'SR'
];

const EVIDENCE_TYPES: EvidenceType[] = [
  'policy', 'procedure', 'execution', 'screenshot', 'log', 'report', 'configuration', 'general'
];

const EVIDENCE_STATUSES: EvidenceStatus[] = [
  'uploaded', 'under_review', 'approved', 'rejected', 'expired'
];

const COMMON_TAGS = [
  'audit', 'annual-review', 'quarterly', 'monthly', 'critical', 'high-priority',
  'training', 'policy-review', 'incident-response', 'backup', 'security'
];

export const EvidenceFilters: React.FC<EvidenceFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
}) => {
  const handleSearchChange = (value: string) => {
    onFilterChange({ ...filters, searchTerm: value });
  };

  const handleFamilyChange = (value: string) => {
    onFilterChange({ ...filters, family: value || undefined });
  };

  const handleTypeChange = (value: string) => {
    onFilterChange({ ...filters, evidenceType: value as EvidenceType || undefined });
  };

  const handleStatusChange = (value: string) => {
    onFilterChange({ ...filters, status: value as EvidenceStatus || undefined });
  };

  const handleTagsChange = (value: string[]) => {
    onFilterChange({ ...filters, tags: value.length > 0 ? value : undefined });
  };

  const handleMultiControlToggle = () => {
    if (filters.hasMultipleControls === undefined) {
      onFilterChange({ ...filters, hasMultipleControls: true });
    } else if (filters.hasMultipleControls === true) {
      onFilterChange({ ...filters, hasMultipleControls: false });
    } else {
      onFilterChange({ ...filters, hasMultipleControls: undefined });
    }
  };

  const handleArchivedToggle = () => {
    onFilterChange({ ...filters, isArchived: !filters.isArchived });
  };

  const hasActiveFilters =
    filters.searchTerm ||
    filters.family ||
    filters.evidenceType ||
    filters.status ||
    (filters.tags && filters.tags.length > 0) ||
    filters.hasMultipleControls !== undefined ||
    filters.isArchived;

  return (
    <Box>
      {/* Search bar - always visible */}
      <TextField
        fullWidth
        placeholder="Search by filename, description, or control ID..."
        value={filters.searchTerm || ''}
        onChange={(e) => handleSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {/* Advanced filters - collapsible */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon />
            <Typography>Advanced Filters</Typography>
            {hasActiveFilters && (
              <Chip label="Active" size="small" color="primary" />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            {/* Row 1: Family and Type */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Control Family</InputLabel>
                <Select
                  value={filters.family || ''}
                  label="Control Family"
                  onChange={(e) => handleFamilyChange(e.target.value)}
                >
                  <MenuItem value="">All Families</MenuItem>
                  {CONTROL_FAMILIES.map((family) => (
                    <MenuItem key={family} value={family}>
                      {family}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Evidence Type</InputLabel>
                <Select
                  value={filters.evidenceType || ''}
                  label="Evidence Type"
                  onChange={(e) => handleTypeChange(e.target.value)}
                >
                  <MenuItem value="">All Types</MenuItem>
                  {EVIDENCE_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Row 2: Status and Tags */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status || ''}
                  label="Status"
                  onChange={(e) => handleStatusChange(e.target.value)}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  {EVIDENCE_STATUSES.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Autocomplete
                multiple
                fullWidth
                options={COMMON_TAGS}
                value={filters.tags || []}
                onChange={(_, value) => handleTagsChange(value)}
                renderInput={(params) => (
                  <TextField {...params} label="Tags" placeholder="Select tags" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip label={option} size="small" {...getTagProps({ index })} />
                  ))
                }
              />
            </Box>

            {/* Row 3: Toggle filters */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={
                  filters.hasMultipleControls === undefined
                    ? 'All Evidence'
                    : filters.hasMultipleControls
                    ? 'Multi-Control Only'
                    : 'Single Control Only'
                }
                onClick={handleMultiControlToggle}
                color={filters.hasMultipleControls !== undefined ? 'primary' : 'default'}
                variant={filters.hasMultipleControls !== undefined ? 'filled' : 'outlined'}
              />
              <Chip
                label={filters.isArchived ? 'Archived Only' : 'Active Only'}
                onClick={handleArchivedToggle}
                color={filters.isArchived ? 'default' : 'primary'}
                variant="outlined"
              />
            </Box>

            {/* Clear filters button */}
            {hasActiveFilters && (
              <Button
                startIcon={<ClearIcon />}
                onClick={onClearFilters}
                size="small"
                sx={{ alignSelf: 'flex-start' }}
              >
                Clear All Filters
              </Button>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};
```