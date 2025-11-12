import React from 'react';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

interface SyncStatusIndicatorProps {
  lastSyncDate: string | null;
  isSyncing?: boolean;
  onSync: () => void;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  lastSyncDate,
  isSyncing = false,
  onSync,
}) => {
  const getSyncStatus = () => {
    if (!lastSyncDate) {
      return { color: 'error', icon: <ErrorIcon />, label: 'Never synced' };
    }

    const syncDate = new Date(lastSyncDate);
    const hoursSinceSync = (Date.now() - syncDate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceSync < 24) {
      return {
        color: 'success',
        icon: <CheckCircleIcon />,
        label: `Synced ${formatDistanceToNow(syncDate, { addSuffix: true })}`,
      };
    } else if (hoursSinceSync < 168) {
      // 7 days
      return {
        color: 'warning',
        icon: <WarningIcon />,
        label: `Synced ${formatDistanceToNow(syncDate, { addSuffix: true })}`,
      };
    } else {
      return {
        color: 'error',
        icon: <ErrorIcon />,
        label: `Stale (${formatDistanceToNow(syncDate, { addSuffix: true })})`,
      };
    }
  };

  const status = getSyncStatus();

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Chip
        icon={status.icon}
        label={status.label}
        color={status.color as any}
        size="small"
        variant="outlined"
      />
      <Tooltip title="Sync policies now">
        <span>
          <IconButton
            onClick={onSync}
            disabled={isSyncing}
            size="small"
            color="primary"
          >
            {isSyncing ? (
              <CircularProgress size={20} />
            ) : (
              <SyncIcon />
            )}
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

export default SyncStatusIndicator;
