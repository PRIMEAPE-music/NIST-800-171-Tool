import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Divider,
  IconButton,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { PolicyDetail } from '../../types/policyViewer.types';

interface PolicyDetailModalProps {
  policy: PolicyDetail | null;
  open: boolean;
  onClose: () => void;
}

const PolicyDetailModal: React.FC<PolicyDetailModalProps> = ({
  policy,
  open,
  onClose,
}) => {
  if (!policy) return null;

  const renderJsonSection = (title: string, data: any) => {
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
      return null;
    }

    return (
      <Box mb={3}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Paper
          sx={{
            p: 2,
            bgcolor: 'background.default',
            maxHeight: 300,
            overflow: 'auto',
          }}
        >
          <pre style={{ margin: 0, fontSize: '0.875rem' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </Paper>
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" component="span">
              {policy.policyName}
            </Typography>
            <Box mt={1}>
              <Chip
                label={policy.policyType}
                size="small"
                color={
                  policy.policyType === 'Intune'
                    ? 'info'
                    : policy.policyType === 'Purview'
                    ? 'secondary'
                    : 'success'
                }
                sx={{ mr: 1 }}
              />
              <Chip
                label={policy.isActive ? 'Active' : 'Inactive'}
                size="small"
                color={policy.isActive ? 'success' : 'default'}
              />
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent>
        {/* Description */}
        {policy.policyDescription && (
          <Box mb={3}>
            <Typography variant="body1">{policy.policyDescription}</Typography>
          </Box>
        )}

        {/* Metadata */}
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Metadata
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Policy ID: {policy.policyId}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last Synced: {formatDistanceToNow(new Date(policy.lastSynced), { addSuffix: true })}
          </Typography>
          {policy.parsedData.createdDateTime && (
            <Typography variant="body2" color="text.secondary">
              Created: {new Date(policy.parsedData.createdDateTime).toLocaleString()}
            </Typography>
          )}
          {policy.parsedData.modifiedDateTime && (
            <Typography variant="body2" color="text.secondary">
              Modified: {new Date(policy.parsedData.modifiedDateTime).toLocaleString()}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Mapped Controls */}
        {policy.mappedControls.length > 0 && (
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              Mapped NIST Controls ({policy.mappedControls.length})
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              {policy.mappedControls.map((control) => (
                <Paper key={control.controlId} sx={{ p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="start">
                    <Box>
                      <Typography variant="subtitle2">{control.controlId}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {control.controlTitle}
                      </Typography>
                      {control.mappingNotes && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                          Note: {control.mappingNotes}
                        </Typography>
                      )}
                    </Box>
                    <Chip
                      label={`${control.mappingConfidence} Confidence`}
                      size="small"
                      color={
                        control.mappingConfidence === 'High'
                          ? 'success'
                          : control.mappingConfidence === 'Medium'
                          ? 'warning'
                          : 'default'
                      }
                    />
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Settings */}
        {renderJsonSection('Policy Settings', policy.parsedData.settings)}

        {/* Full Policy Data */}
        {renderJsonSection('Complete Policy Data', policy.parsedData)}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PolicyDetailModal;
