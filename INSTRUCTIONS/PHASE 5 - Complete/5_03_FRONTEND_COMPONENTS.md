# Phase 5: Frontend Implementation - Evidence Management UI

## Overview
This document covers all React components needed for the evidence management interface, including file upload, library view, gap reports, and file preview.

## Component Architecture

```
client/src/
├── pages/
│   ├── EvidenceLibrary.tsx         # Main evidence page
│   └── EvidenceGapReport.tsx       # Gap analysis page
├── components/
│   └── evidence/
│       ├── FileUpload.tsx          # Drag-and-drop upload
│       ├── EvidenceCard.tsx        # Individual evidence display
│       ├── EvidenceTable.tsx       # Table view of evidence
│       ├── EvidenceFilters.tsx     # Filter sidebar
│       ├── ControlLinkDialog.tsx   # Link evidence to controls
│       ├── DocumentViewer.tsx      # Preview PDFs and images
│       ├── EvidenceStats.tsx       # Statistics widget
│       └── DeleteConfirmDialog.tsx # Delete confirmation
├── hooks/
│   └── useEvidence.ts              # Custom hook for evidence data
├── services/
│   └── evidenceService.ts          # API client
└── types/
    └── evidence.types.ts           # TypeScript interfaces
```

## 1. TypeScript Types

### File: `client/src/types/evidence.types.ts`

```typescript
export interface Evidence {
  id: string;
  controlId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  description?: string;
  uploadedBy?: string;
  uploadedDate: string;
  version: number;
  tags?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  control?: {
    id: string;
    controlId: string;
    family: string;
    title: string;
  };
}

export interface EvidenceFilters {
  controlId?: string;
  family?: string;
  fileType?: string;
  startDate?: string;
  endDate?: string;
  isArchived?: boolean;
  searchTerm?: string;
}

export interface EvidenceStats {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<string, number>;
  controlsWithEvidence: number;
  controlsWithoutEvidence: number;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}
```

## 2. API Service

### File: `client/src/services/evidenceService.ts`

```typescript
import axios from 'axios';
import { Evidence, EvidenceFilters, EvidenceStats } from '../types/evidence.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const evidenceService = {
  /**
   * Upload evidence files
   */
  async uploadEvidence(
    files: File[],
    controlId: string,
    description?: string,
    tags?: string[]
  ): Promise<Evidence[]> {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files', file);
    });
    
    formData.append('controlId', controlId);
    if (description) formData.append('description', description);
    if (tags && tags.length > 0) formData.append('tags', JSON.stringify(tags));
    
    const response = await axios.post(`${API_BASE_URL}/evidence/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    return response.data.evidence;
  },

  /**
   * Get all evidence with filters
   */
  async getEvidence(filters?: EvidenceFilters): Promise<Evidence[]> {
    const params = new URLSearchParams();
    
    if (filters?.controlId) params.append('controlId', filters.controlId);
    if (filters?.family) params.append('family', filters.family);
    if (filters?.fileType) params.append('fileType', filters.fileType);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.isArchived !== undefined) {
      params.append('isArchived', String(filters.isArchived));
    }
    
    const response = await axios.get(`${API_BASE_URL}/evidence?${params.toString()}`);
    return response.data.evidence;
  },

  /**
   * Get evidence by ID
   */
  async getEvidenceById(id: string): Promise<Evidence> {
    const response = await axios.get(`${API_BASE_URL}/evidence/${id}`);
    return response.data.evidence;
  },

  /**
   * Get evidence for specific control
   */
  async getEvidenceForControl(controlId: string): Promise<Evidence[]> {
    const response = await axios.get(`${API_BASE_URL}/evidence/control/${controlId}`);
    return response.data.evidence;
  },

  /**
   * Update evidence metadata
   */
  async updateEvidence(
    id: string,
    updates: { description?: string; tags?: string[]; isArchived?: boolean }
  ): Promise<Evidence> {
    const response = await axios.put(`${API_BASE_URL}/evidence/${id}`, updates);
    return response.data.evidence;
  },

  /**
   * Delete evidence
   */
  async deleteEvidence(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/evidence/${id}`);
  },

  /**
   * Get download URL for evidence
   */
  getDownloadUrl(id: string): string {
    return `${API_BASE_URL}/evidence/download/${id}`;
  },

  /**
   * Get controls without evidence (gaps)
   */
  async getEvidenceGaps(): Promise<any[]> {
    const response = await axios.get(`${API_BASE_URL}/evidence/gaps`);
    return response.data.gaps;
  },

  /**
   * Get evidence statistics
   */
  async getEvidenceStats(): Promise<EvidenceStats> {
    const response = await axios.get(`${API_BASE_URL}/evidence/stats`);
    return response.data.stats;
  },
};
```

## 3. Custom Hook

### File: `client/src/hooks/useEvidence.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { evidenceService } from '../services/evidenceService';
import { EvidenceFilters } from '../types/evidence.types';

export function useEvidence(filters?: EvidenceFilters) {
  return useQuery({
    queryKey: ['evidence', filters],
    queryFn: () => evidenceService.getEvidence(filters),
  });
}

export function useEvidenceById(id: string) {
  return useQuery({
    queryKey: ['evidence', id],
    queryFn: () => evidenceService.getEvidenceById(id),
    enabled: !!id,
  });
}

export function useEvidenceForControl(controlId: string) {
  return useQuery({
    queryKey: ['evidence', 'control', controlId],
    queryFn: () => evidenceService.getEvidenceForControl(controlId),
    enabled: !!controlId,
  });
}

export function useEvidenceGaps() {
  return useQuery({
    queryKey: ['evidence', 'gaps'],
    queryFn: () => evidenceService.getEvidenceGaps(),
  });
}

export function useEvidenceStats() {
  return useQuery({
    queryKey: ['evidence', 'stats'],
    queryFn: () => evidenceService.getEvidenceStats(),
  });
}

export function useUploadEvidence() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      files,
      controlId,
      description,
      tags,
    }: {
      files: File[];
      controlId: string;
      description?: string;
      tags?: string[];
    }) => evidenceService.uploadEvidence(files, controlId, description, tags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

export function useUpdateEvidence() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: { description?: string; tags?: string[]; isArchived?: boolean };
    }) => evidenceService.updateEvidence(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

export function useDeleteEvidence() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => evidenceService.deleteEvidence(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}
```

## 4. File Upload Component

### File: `client/src/components/evidence/FileUpload.tsx`

```typescript
import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert,
  Chip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useUploadEvidence } from '../../hooks/useEvidence';
import { UploadProgress } from '../../types/evidence.types';

interface FileUploadProps {
  controlId: string;
  onUploadComplete?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'text/plain',
  'text/csv',
];

export const FileUpload: React.FC<FileUploadProps> = ({ controlId, onUploadComplete }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const uploadMutation = useUploadEvidence();

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);
    
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(f => f.errors[0].message).join(', ');
      setError(errors);
      return;
    }
    
    // Add accepted files
    setSelectedFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }
    
    try {
      setError(null);
      await uploadMutation.mutateAsync({
        files: selectedFiles,
        controlId,
        description,
      });
      
      // Clear files on success
      setSelectedFiles([]);
      setDescription('');
      onUploadComplete?.();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Box>
      {/* Dropzone */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          },
        }}
      >
        <input {...getInputProps()} />
        <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          or click to browse
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Supported: PDF, DOCX, XLSX, PNG, JPG, TXT, CSV (Max 10MB)
        </Typography>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Selected Files ({selectedFiles.length})
          </Typography>
          <List>
            {selectedFiles.map((file, index) => (
              <ListItem
                key={index}
                sx={{
                  bgcolor: 'background.paper',
                  mb: 1,
                  borderRadius: 1,
                }}
                secondaryAction={
                  <IconButton edge="end" onClick={() => removeFile(index)}>
                    <CloseIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={file.name}
                  secondary={formatFileSize(file.size)}
                />
              </ListItem>
            ))}
          </List>

          {/* Upload Button */}
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={handleUpload}
            disabled={uploadMutation.isPending}
            fullWidth
            sx={{ mt: 2 }}
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload Files'}
          </Button>

          {uploadMutation.isPending && (
            <LinearProgress sx={{ mt: 2 }} />
          )}
        </Box>
      )}
    </Box>
  );
};
```

## 5. Evidence Card Component

### File: `client/src/components/evidence/EvidenceCard.tsx`

```typescript
import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Chip,
  Box,
  Tooltip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Description as DocIcon,
} from '@mui/icons-material';
import { Evidence } from '../../types/evidence.types';
import { evidenceService } from '../../services/evidenceService';

interface EvidenceCardProps {
  evidence: Evidence;
  onDelete: (id: string) => void;
  onView?: (evidence: Evidence) => void;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  evidence,
  onDelete,
  onView,
}) => {
  const getFileIcon = () => {
    if (evidence.fileType.includes('pdf')) return <PdfIcon />;
    if (evidence.fileType.includes('image')) return <ImageIcon />;
    return <DocIcon />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDownload = () => {
    window.open(evidenceService.getDownloadUrl(evidence.id), '_blank');
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ mr: 2, color: 'primary.main' }}>
            {getFileIcon()}
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Tooltip title={evidence.originalName}>
              <Typography
                variant="subtitle1"
                noWrap
                sx={{ fontWeight: 600 }}
              >
                {evidence.originalName}
              </Typography>
            </Tooltip>
            <Typography variant="caption" color="text.secondary">
              {formatFileSize(evidence.fileSize)}
            </Typography>
          </Box>
        </Box>

        {evidence.control && (
          <Chip
            label={`${evidence.control.controlId} - ${evidence.control.family}`}
            size="small"
            sx={{ mb: 1 }}
          />
        )}

        {evidence.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {evidence.description}
          </Typography>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Uploaded: {formatDate(evidence.uploadedDate)}
        </Typography>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Box>
          {onView && (
            <Tooltip title="Preview">
              <IconButton size="small" onClick={() => onView(evidence)}>
                <ViewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Download">
            <IconButton size="small" onClick={handleDownload}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Tooltip title="Delete">
          <IconButton
            size="small"
            color="error"
            onClick={() => onDelete(evidence.id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};
```

## 6. Evidence Library Page

### File: `client/src/pages/EvidenceLibrary.tsx`

```typescript
import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { FileUpload } from '../components/evidence/FileUpload';
import { EvidenceCard } from '../components/evidence/EvidenceCard';
import { useEvidence, useDeleteEvidence } from '../hooks/useEvidence';
import { Evidence, EvidenceFilters } from '../types/evidence.types';

export const EvidenceLibrary: React.FC = () => {
  const [filters, setFilters] = useState<EvidenceFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedControlId, setSelectedControlId] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [evidenceToDelete, setEvidenceToDelete] = useState<string | null>(null);

  const { data: evidence, isLoading, error, refetch } = useEvidence(filters);
  const deleteMutation = useDeleteEvidence();

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    // Implement client-side filtering
  };

  const handleDeleteClick = (id: string) => {
    setEvidenceToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (evidenceToDelete) {
      try {
        await deleteMutation.mutateAsync(evidenceToDelete);
        setDeleteConfirmOpen(false);
        setEvidenceToDelete(null);
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const filteredEvidence = evidence?.filter(item =>
    item.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.control?.controlId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Evidence Library
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Upload Evidence
          </Button>
        </Box>
      </Box>

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search by filename or control ID..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load evidence: {error.message}
        </Alert>
      )}

      {/* Evidence Grid */}
      {filteredEvidence && (
        <Grid container spacing={3}>
          {filteredEvidence.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 8, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  No evidence files found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Upload your first evidence file to get started
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setUploadDialogOpen(true)}
                  sx={{ mt: 3 }}
                >
                  Upload Evidence
                </Button>
              </Paper>
            </Grid>
          ) : (
            filteredEvidence.map((item) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                <EvidenceCard
                  evidence={item}
                  onDelete={handleDeleteClick}
                />
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Upload Evidence</DialogTitle>
        <DialogContent>
          {/* Add control selector here */}
          <FileUpload
            controlId={selectedControlId || 'temp-control-id'}
            onUploadComplete={() => {
              setUploadDialogOpen(false);
              refetch();
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this evidence file? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
```

## 7. Evidence Gap Report Page

### File: `client/src/pages/EvidenceGapReport.tsx`

```typescript
import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { useEvidenceGaps } from '../hooks/useEvidence';
import { useNavigate } from 'react-router-dom';

export const EvidenceGapReport: React.FC = () => {
  const { data: gaps, isLoading, error } = useEvidenceGaps();
  const navigate = useNavigate();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'error';
      case 'High':
        return 'warning';
      case 'Medium':
        return 'info';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">
          Failed to load gap report: {error.message}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
          Evidence Gap Report
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Controls without supporting evidence documentation
        </Typography>
      </Box>

      {/* Summary Card */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'warning.dark' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <WarningIcon sx={{ fontSize: 48, mr: 2 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {gaps?.length || 0} Controls Missing Evidence
            </Typography>
            <Typography variant="body2">
              These controls require evidence documentation for compliance
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Gap Table */}
      {gaps && gaps.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Control ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Family</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gaps.map((control) => (
                <TableRow key={control.id} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>
                      {control.controlId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={control.family} size="small" />
                  </TableCell>
                  <TableCell>{control.title}</TableCell>
                  <TableCell>
                    <Chip
                      label={control.priority}
                      size="small"
                      color={getPriorityColor(control.priority) as any}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<UploadIcon />}
                      onClick={() => navigate(`/controls/${control.id}`)}
                    >
                      Upload Evidence
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Paper sx={{ p: 8, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No evidence gaps found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            All controls have supporting evidence documentation
          </Typography>
        </Paper>
      )}
    </Container>
  );
};
```

## 8. Add Routes

### Update `client/src/App.tsx`:

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { EvidenceLibrary } from './pages/EvidenceLibrary';
import { EvidenceGapReport } from './pages/EvidenceGapReport';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ... existing routes */}
        <Route path="/evidence" element={<EvidenceLibrary />} />
        <Route path="/evidence/gaps" element={<EvidenceGapReport />} />
      </Routes>
    </BrowserRouter>
  );
}
```

## Next Steps
Proceed to `05_TESTING_CHECKLIST.md` to test all evidence management features.

## Checklist
- [ ] Created TypeScript types
- [ ] Implemented API service
- [ ] Created custom hooks
- [ ] Built FileUpload component
- [ ] Built EvidenceCard component
- [ ] Built EvidenceLibrary page
- [ ] Built EvidenceGapReport page
- [ ] Added routes to App
- [ ] Tested file upload
- [ ] Tested file display
- [ ] Tested file download
- [ ] Tested file deletion
- [ ] Tested gap report
- [ ] All components use dark theme colors
- [ ] No TypeScript errors
