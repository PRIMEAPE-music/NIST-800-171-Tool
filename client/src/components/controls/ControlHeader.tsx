import React from 'react';
import { Box, Paper, Typography, IconButton, Chip } from '@mui/material';
import { ArrowBack, Edit as EditIcon } from '@mui/icons-material';
import StatusBadge from './StatusBadge';
import { Control } from '@/services/controlService';

interface ControlHeaderProps {
  control: Control;
  onStatusClick: () => void;
  onBack: () => void;
}

export const ControlHeader: React.FC<ControlHeaderProps> = ({
  control,
  onStatusClick,
  onBack,
}) => {
  const priorityColor = {
    Critical: 'error',
    High: 'warning',
    Medium: 'info',
    Low: 'default',
  }[control.priority] as 'error' | 'warning' | 'info' | 'default';

  return (
    <Paper sx={{ p: 3, mb: 3, backgroundColor: '#242424' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
        <IconButton onClick={onBack} sx={{ mr: 1, mt: -1, color: '#B0B0B0' }}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            <Typography variant="h5" component="h1" sx={{ color: '#E0E0E0' }}>
              {control.controlId}
            </Typography>
            <Chip label={control.family} size="small" sx={{ bgcolor: 'rgba(144, 202, 249, 0.1)', color: '#90CAF9' }} />
            <Chip label={control.priority} size="small" color={priorityColor} />
          </Box>
          <Typography variant="h6" sx={{ color: '#B0B0B0', mb: 2 }}>
            {control.title}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
        <Box>
          <Typography variant="caption" sx={{ color: '#B0B0B0' }} display="block">
            Status
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <StatusBadge status={control.status?.status || 'Not Started'} size="medium" />
            <IconButton size="small" onClick={onStatusClick} sx={{ color: '#90CAF9' }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ color: '#B0B0B0' }} display="block">
            Assigned To
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: '#E0E0E0' }}>
            {control.status?.assignedTo || 'Unassigned'}
          </Typography>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ color: '#B0B0B0' }} display="block">
            Last Reviewed
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: '#E0E0E0' }}>
            {control.status?.lastReviewedDate
              ? new Date(control.status.lastReviewedDate).toLocaleDateString()
              : 'Never'}
          </Typography>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ color: '#B0B0B0' }} display="block">
            Evidence Count
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: '#E0E0E0' }}>
            {control.evidence?.length || 0} file(s)
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default ControlHeader;
