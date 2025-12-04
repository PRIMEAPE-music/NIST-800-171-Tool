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
              {evidenceService.formatFileSize(evidence.fileSize)} " {evidence.fileType}
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
