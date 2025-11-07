import React from 'react';
import { Box, Typography, Alert, Button } from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { Control } from '@/services/controlService';

interface EvidenceTabProps {
  control: Control;
}

export const EvidenceTab: React.FC<EvidenceTabProps> = ({ control }) => {
  return (
    <Box sx={{ px: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0' }}>
        Evidence & Documentation
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Evidence management will be fully implemented in Phase 5. This is a placeholder.
      </Alert>

      {control.evidence && control.evidence.length > 0 ? (
        <Box>
          <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
            {control.evidence.length} evidence file(s) attached
          </Typography>
        </Box>
      ) : (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <UploadIcon sx={{ fontSize: 48, color: '#757575', mb: 2 }} />
          <Typography variant="body1" sx={{ color: '#B0B0B0' }} gutterBottom>
            No evidence uploaded yet
          </Typography>
          <Typography variant="body2" sx={{ color: '#757575', mb: 3 }}>
            Upload screenshots, policies, or documentation to support this control
          </Typography>
          <Button variant="outlined" disabled>
            Upload Evidence (Coming in Phase 5)
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default EvidenceTab;
