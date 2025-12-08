import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  CircularProgress,
  Alert,
  Button,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { Document as PDFDocument, Page as PDFPage, pdfjs } from 'react-pdf';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerDialogProps {
  open: boolean;
  onClose: () => void;
  documentUrl: string;
  documentTitle: string;
  onDownload?: () => void;
}

export const PDFViewerDialog: React.FC<PDFViewerDialogProps> = ({
  open,
  onClose,
  documentUrl,
  documentTitle,
  onDownload,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [pageError, setPageError] = useState<string | null>(null);
  const [documentKey, setDocumentKey] = useState<number>(0);
  const pageLoadTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Memoize file and options to prevent unnecessary reloads
  const fileConfig = React.useMemo(() => ({
    url: documentUrl,
    httpHeaders: {},
    withCredentials: false,
  }), [documentUrl]);

  const pdfOptions = React.useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
  }), []);

  const clearPageLoadTimeout = () => {
    if (pageLoadTimeoutRef.current) {
      clearTimeout(pageLoadTimeoutRef.current);
      pageLoadTimeoutRef.current = null;
    }
  };

  const startPageLoadTimeout = () => {
    clearPageLoadTimeout();
    pageLoadTimeoutRef.current = setTimeout(() => {
      setPageError(`Page ${pageNumber} is taking too long to load. It may be stuck.`);
    }, 10000);
  };

  const handlePreviousPage = () => {
    setPageError(null);
    clearPageLoadTimeout();
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPageError(null);
    clearPageLoadTimeout();
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  const handleReloadDocument = () => {
    setPageError(null);
    clearPageLoadTimeout();
    setDocumentKey((prev) => prev + 1);
  };

  const onPageRenderSuccess = () => {
    clearPageLoadTimeout();
    setPageError(null);
  };

  const onPageRenderError = (error: Error) => {
    clearPageLoadTimeout();
    console.error('Error rendering page:', error);
    setPageError(`Failed to render page ${pageNumber}: ${error.message}`);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setPageError(`Failed to load PDF: ${error.message}`);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  // Start timeout when page number changes
  useEffect(() => {
    if (pageNumber > 0 && open) {
      startPageLoadTimeout();
    }
    return () => clearPageLoadTimeout();
  }, [pageNumber, open]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setPageNumber(1);
      setPageError(null);
      setScale(1.0);
      setDocumentKey((prev) => prev + 1);
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ py: 1, px: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{documentTitle}</Typography>
          <Box display="flex" gap={1}>
            {onDownload && (
              <Tooltip title="Download">
                <IconButton onClick={onDownload} size="small">
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <IconButton onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        {/* PDF Controls */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          px={1.5}
          py={0.5}
          sx={{
            backgroundColor: 'background.default',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title="Previous Page">
              <span>
                <IconButton
                  onClick={handlePreviousPage}
                  disabled={pageNumber <= 1}
                  size="small"
                  sx={{ padding: '4px' }}
                >
                  <PrevIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Typography variant="caption" sx={{ fontSize: '0.8rem', minWidth: '80px', textAlign: 'center' }}>
              Page {pageNumber} of {numPages}
            </Typography>
            <Tooltip title="Next Page">
              <span>
                <IconButton
                  onClick={handleNextPage}
                  disabled={pageNumber >= numPages}
                  size="small"
                  sx={{ padding: '4px' }}
                >
                  <NextIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>

          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title="Zoom Out">
              <span>
                <IconButton
                  onClick={handleZoomOut}
                  disabled={scale <= 0.5}
                  size="small"
                  sx={{ padding: '4px' }}
                >
                  <ZoomOutIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Typography variant="caption" sx={{ fontSize: '0.8rem', minWidth: '45px', textAlign: 'center' }}>
              {Math.round(scale * 100)}%
            </Typography>
            <Tooltip title="Zoom In">
              <span>
                <IconButton
                  onClick={handleZoomIn}
                  disabled={scale >= 3.0}
                  size="small"
                  sx={{ padding: '4px' }}
                >
                  <ZoomInIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Box>

        {/* PDF Viewer */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#525659',
            p: 2,
          }}
        >
          {pageError ? (
            <Box textAlign="center" p={3}>
              <Alert severity="error" sx={{ mb: 2 }}>
                {pageError}
              </Alert>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="outlined"
                  onClick={handleReloadDocument}
                  startIcon={<RefreshIcon />}
                >
                  Reload Document
                </Button>
                {pageNumber > 1 && (
                  <Button variant="outlined" onClick={handlePreviousPage}>
                    Try Previous Page
                  </Button>
                )}
                {pageNumber < numPages && (
                  <Button variant="outlined" onClick={handleNextPage}>
                    Skip to Next Page
                  </Button>
                )}
              </Stack>
            </Box>
          ) : (
            <PDFDocument
              key={`document_${documentKey}`}
              file={fileConfig}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                  <CircularProgress />
                </Box>
              }
              options={pdfOptions}
            >
              <PDFPage
                key={`page_${pageNumber}`}
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onRenderSuccess={onPageRenderSuccess}
                onRenderError={onPageRenderError}
              />
            </PDFDocument>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default PDFViewerDialog;
