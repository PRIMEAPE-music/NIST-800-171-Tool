import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import {
  CloudOff as NoDataIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';

interface EmptyStateProps {
  hasNeverSynced: boolean;
  onSync: () => void;
  isSyncing: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  hasNeverSynced,
  onSync,
  isSyncing,
}) => {
  return (
    <Box display="flex" justifyContent="center" py={8}>
      <Paper sx={{ p: 4, maxWidth: 400, textAlign: 'center' }}>
        <NoDataIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {hasNeverSynced ? 'No Policies Found' : 'No Matching Policies'}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {hasNeverSynced
            ? 'Sync with Microsoft 365 to view your policies.'
            : 'Try adjusting your search or filters.'}
        </Typography>
        {hasNeverSynced && (
          <Button
            variant="contained"
            startIcon={<SyncIcon />}
            onClick={onSync}
            disabled={isSyncing}
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        )}
      </Paper>
    </Box>
  );
};

export default EmptyState;
