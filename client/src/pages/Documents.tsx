import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Menu,
  InputAdornment,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Description as DocumentIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { documentService } from '@/services/documentService';
import { Document, DocumentCategory } from '@/types/document.types';

export const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | ''>('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadMetadata, setUploadMetadata] = useState({
    category: 'external_compliance' as DocumentCategory,
    title: '',
    description: '',
    organization: '',
  });
  const [editMetadata, setEditMetadata] = useState({
    title: '',
    description: '',
    category: 'external_compliance' as DocumentCategory,
    organization: '',
    version: '1.0',
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuDocument, setMenuDocument] = useState<Document | null>(null);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const docs = await documentService.getDocuments({
        category: categoryFilter || undefined,
        searchTerm: searchTerm || undefined,
      });
      // Filter out SSP documents (they have their own page)
      setDocuments(docs.filter(doc => doc.category !== 'ssp'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [categoryFilter, searchTerm]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
      if (files.length === 1 && !uploadMetadata.title) {
        setUploadMetadata({ ...uploadMetadata, title: files[0].name });
      }
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setError(null);

      if (selectedFiles.length === 1) {
        await documentService.uploadDocument(selectedFiles[0], uploadMetadata);
      } else {
        await documentService.uploadDocuments(selectedFiles, {
          category: uploadMetadata.category,
          organization: uploadMetadata.organization,
        });
      }

      setUploadDialogOpen(false);
      setSelectedFiles([]);
      setUploadMetadata({
        category: 'external_compliance',
        title: '',
        description: '',
        organization: '',
      });
      loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload documents');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedDocument) return;

    try {
      await documentService.updateDocument(selectedDocument.id, editMetadata);
      setEditDialogOpen(false);
      setSelectedDocument(null);
      loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update document');
    }
  };

  const handleDelete = async () => {
    if (!selectedDocument) return;

    try {
      await documentService.deleteDocument(selectedDocument.id);
      setDeleteDialogOpen(false);
      setSelectedDocument(null);
      loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      await documentService.downloadDocument(document.id, document.originalName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download document');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, document: Document) => {
    setAnchorEl(event.currentTarget);
    setMenuDocument(document);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuDocument(null);
  };

  const openEditDialog = (document: Document) => {
    setSelectedDocument(document);
    setEditMetadata({
      title: document.title || '',
      description: document.description || '',
      category: document.category,
      organization: document.organization || '',
      version: document.version,
    });
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const openDeleteDialog = (document: Document) => {
    setSelectedDocument(document);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <PdfIcon fontSize="large" color="error" />;
    return <DocumentIcon fontSize="large" color="primary" />;
  };

  const categories: { value: DocumentCategory; label: string }[] = [
    { value: 'external_compliance', label: 'External Compliance' },
    { value: 'certification', label: 'Certification' },
    { value: 'audit', label: 'Audit' },
    { value: 'general', label: 'General' },
  ];

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Documents
          </Typography>
          <Typography variant="body2" color="text.secondary">
            External official documents for compliance checking and attestation
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadDocuments} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Upload Documents
          </Button>
        </Stack>
      </Box>

      {/* Filters */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              label="Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as DocumentCategory | '')}
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Document Grid */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : documents.length === 0 ? (
        <Paper
          elevation={2}
          sx={{
            p: 6,
            textAlign: 'center',
            backgroundColor: 'background.default',
          }}
        >
          <DocumentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Documents Found
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Upload external official documents to get started.
          </Typography>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Upload Documents
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {documents.map((document) => (
            <Grid item xs={12} sm={6} md={4} key={document.id}>
              <Card elevation={2}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>{getFileIcon(document.fileType)}</Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, document)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>

                  <Tooltip title={document.title || document.originalName}>
                    <Typography
                      variant="h6"
                      noWrap
                      sx={{ mb: 1, fontSize: '1rem' }}
                    >
                      {document.title || document.originalName}
                    </Typography>
                  </Tooltip>

                  <Chip
                    label={documentService.getCategoryDisplayName(document.category)}
                    color={documentService.getCategoryColor(document.category) as any}
                    size="small"
                    sx={{ mb: 1 }}
                  />

                  {document.organization && (
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1 }}>
                      {document.organization}
                    </Typography>
                  )}

                  {document.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: 1,
                      }}
                    >
                      {document.description}
                    </Typography>
                  )}

                  <Stack direction="row" spacing={1} flexWrap="wrap" mt={2}>
                    <Chip
                      label={documentService.formatFileSize(document.fileSize)}
                      size="small"
                    />
                    <Chip
                      label={`v${document.version}`}
                      size="small"
                    />
                  </Stack>

                  <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                    {new Date(document.uploadedDate).toLocaleDateString()}
                  </Typography>
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownload(document)}
                  >
                    Download
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => menuDocument && openEditDialog(menuDocument)}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => menuDocument && handleDownload(menuDocument)}>
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          Download
        </MenuItem>
        <MenuItem onClick={() => menuDocument && openDeleteDialog(menuDocument)}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => !uploading && setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload Documents</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Alert severity="info">
              Upload PDFs and Word documents. Multiple files can be selected.
            </Alert>

            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              fullWidth
            >
              {selectedFiles.length > 0
                ? `${selectedFiles.length} file(s) selected`
                : 'Select Files'}
              <input
                type="file"
                hidden
                multiple
                accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileSelect}
              />
            </Button>

            {selectedFiles.length > 0 && (
              <>
                <TextField
                  select
                  fullWidth
                  label="Category"
                  value={uploadMetadata.category}
                  onChange={(e) =>
                    setUploadMetadata({
                      ...uploadMetadata,
                      category: e.target.value as DocumentCategory,
                    })
                  }
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </TextField>

                {selectedFiles.length === 1 && (
                  <>
                    <TextField
                      label="Title"
                      fullWidth
                      value={uploadMetadata.title}
                      onChange={(e) =>
                        setUploadMetadata({ ...uploadMetadata, title: e.target.value })
                      }
                    />

                    <TextField
                      label="Description"
                      fullWidth
                      multiline
                      rows={3}
                      value={uploadMetadata.description}
                      onChange={(e) =>
                        setUploadMetadata({ ...uploadMetadata, description: e.target.value })
                      }
                    />
                  </>
                )}

                <TextField
                  label="Organization"
                  fullWidth
                  value={uploadMetadata.organization}
                  onChange={(e) =>
                    setUploadMetadata({ ...uploadMetadata, organization: e.target.value })
                  }
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={selectedFiles.length === 0 || uploading}
          >
            {uploading ? <CircularProgress size={24} /> : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Document</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="Title"
              fullWidth
              value={editMetadata.title}
              onChange={(e) =>
                setEditMetadata({ ...editMetadata, title: e.target.value })
              }
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={editMetadata.description}
              onChange={(e) =>
                setEditMetadata({ ...editMetadata, description: e.target.value })
              }
            />

            <TextField
              select
              fullWidth
              label="Category"
              value={editMetadata.category}
              onChange={(e) =>
                setEditMetadata({
                  ...editMetadata,
                  category: e.target.value as DocumentCategory,
                })
              }
            >
              {categories.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Organization"
              fullWidth
              value={editMetadata.organization}
              onChange={(e) =>
                setEditMetadata({ ...editMetadata, organization: e.target.value })
              }
            />

            <TextField
              label="Version"
              fullWidth
              value={editMetadata.version}
              onChange={(e) =>
                setEditMetadata({ ...editMetadata, version: e.target.value })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Document</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedDocument?.title || selectedDocument?.originalName}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Documents;
