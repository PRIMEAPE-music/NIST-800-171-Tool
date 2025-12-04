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
