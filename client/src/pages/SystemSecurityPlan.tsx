import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
} from '@mui/icons-material';
import { Document as PDFDocument, Page as PDFPage, pdfjs } from 'react-pdf';
import { documentService } from '@/services/documentService';
import { Document } from '@/types/document.types';

// Configure PDF.js worker - using jsDelivr CDN for better reliability
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const SystemSecurityPlan: React.FC = () => {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState({
    title: '',
    description: '',
    version: '1.0',
  });

  // PDF viewer state
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [pdfLoading, setPdfLoading] = useState<boolean>(true);

  const loadSSP = async () => {
    try {
      setLoading(true);
      setError(null);
      const ssp = await documentService.getSystemSecurityPlan();
      setDocument(ssp);
      setPageNumber(1); // Reset to first page when loading new document
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load System Security Plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSSP();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type - allow PDF and Word documents
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!allowedTypes.includes(file.type)) {
        setError('Only PDF and Word documents are allowed for System Security Plan');
        return;
      }
      setSelectedFile(file);
      setUploadMetadata({
        ...uploadMetadata,
        title: uploadMetadata.title || file.name,
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);

      await documentService.uploadDocument(selectedFile, {
        category: 'ssp',
        title: uploadMetadata.title,
        description: uploadMetadata.description,
        version: uploadMetadata.version,
      });

      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadMetadata({ title: '', description: '', version: '1.0' });
      loadSSP();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!document) return;

    try {
      await documentService.downloadDocument(document.id, document.originalName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download document');
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    console.error('PDF URL:', document?.id ? documentService.getDocumentViewUrl(document.id) : 'No document');
    setError(`Failed to load PDF: ${error.message}`);
    setPdfLoading(false);
  };

  const handlePreviousPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            System Security Plan
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Official System Security Plan document for your organization
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadSSP} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Upload SSP
          </Button>
        </Stack>
      </Box>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Document Display */}
      {document ? (
        <Paper elevation={2} sx={{ p: 3 }}>
          {/* Document Info */}
          <Box mb={3}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">{document.title || document.originalName}</Typography>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
              >
                Download
              </Button>
            </Box>

            <Stack direction="row" spacing={2} flexWrap="wrap" mb={2}>
              <Chip
                label={`Version ${document.version}`}
                color="primary"
                size="small"
              />
              <Chip
                label={`${documentService.formatFileSize(document.fileSize)}`}
                size="small"
              />
              <Chip
                label={`Uploaded ${new Date(document.uploadedDate).toLocaleDateString()}`}
                size="small"
              />
            </Stack>

            {document.description && (
              <Box display="flex" gap={1} mt={2}>
                <InfoIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {document.description}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Document Viewer */}
          {document.fileType === 'application/pdf' ? (
            <Box>
              {/* PDF Controls */}
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
                p={2}
                sx={{
                  backgroundColor: 'background.default',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Tooltip title="Previous Page">
                    <span>
                      <IconButton
                        onClick={handlePreviousPage}
                        disabled={pageNumber <= 1}
                        size="small"
                      >
                        <PrevIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Typography variant="body2">
                    Page {pageNumber} of {numPages}
                  </Typography>
                  <Tooltip title="Next Page">
                    <span>
                      <IconButton
                        onClick={handleNextPage}
                        disabled={pageNumber >= numPages}
                        size="small"
                      >
                        <NextIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Tooltip title="Zoom Out">
                    <span>
                      <IconButton
                        onClick={handleZoomOut}
                        disabled={scale <= 0.5}
                        size="small"
                      >
                        <ZoomOutIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Typography variant="body2">
                    {Math.round(scale * 100)}%
                  </Typography>
                  <Tooltip title="Zoom In">
                    <span>
                      <IconButton
                        onClick={handleZoomIn}
                        disabled={scale >= 3.0}
                        size="small"
                      >
                        <ZoomInIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Box>

              {/* PDF Viewer */}
              <Box
                sx={{
                  width: '100%',
                  minHeight: '800px',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  overflow: 'auto',
                  display: 'flex',
                  justifyContent: 'center',
                  backgroundColor: '#525659',
                  p: 2,
                }}
              >
                {pdfLoading && (
                  <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress />
                  </Box>
                )}
                <PDFDocument
                  file={{
                    url: documentService.getDocumentViewUrl(document.id),
                    httpHeaders: {},
                    withCredentials: false,
                  }}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                      <CircularProgress />
                    </Box>
                  }
                  options={{
                    cMapUrl: 'https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/',
                    cMapPacked: true,
                  }}
                >
                  <PDFPage
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                </PDFDocument>
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                width: '100%',
                minHeight: '400px',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,
                backgroundColor: 'background.default',
              }}
            >
              <InfoIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Word Document Preview Not Available
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3} textAlign="center">
                Word documents cannot be previewed directly in the browser.
                Please download the document to view it.
              </Typography>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
              >
                Download Document
              </Button>
            </Box>
          )}
        </Paper>
      ) : (
        <Paper
          elevation={2}
          sx={{
            p: 6,
            textAlign: 'center',
            backgroundColor: 'background.default',
          }}
        >
          <InfoIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No System Security Plan Uploaded
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Upload your organization's System Security Plan to display it here.
          </Typography>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Upload SSP
          </Button>
        </Paper>
      )}

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => !uploading && setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload System Security Plan</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Alert severity="info">
              PDF and Word documents are accepted. The new document will replace the existing SSP.
            </Alert>

            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              fullWidth
            >
              {selectedFile ? selectedFile.name : 'Select PDF or Word Document'}
              <input
                type="file"
                hidden
                accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileSelect}
              />
            </Button>

            {selectedFile && (
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

                <TextField
                  label="Version"
                  fullWidth
                  value={uploadMetadata.version}
                  onChange={(e) =>
                    setUploadMetadata({ ...uploadMetadata, version: e.target.value })
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
            disabled={!selectedFile || uploading}
          >
            {uploading ? <CircularProgress size={24} /> : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemSecurityPlan;
