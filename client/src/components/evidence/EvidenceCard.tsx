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
  onDelete: (id: number) => void;
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
