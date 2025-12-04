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
  const [selectedControls, setSelectedControls] = useState<
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
