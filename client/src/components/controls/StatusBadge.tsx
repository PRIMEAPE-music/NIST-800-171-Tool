import React from 'react';
import { Chip } from '@mui/material';

interface StatusBadgeProps {
  status: string;
  size?: 'small' | 'medium';
}

const STATUS_COLORS: Record<string, { color: string; bgcolor: string }> = {
  'Not Started': {
    color: '#757575',
    bgcolor: 'rgba(117, 117, 117, 0.1)',
  },
  'In Progress': {
    color: '#FFA726',
    bgcolor: 'rgba(255, 167, 38, 0.1)',
  },
  'Implemented': {
    color: '#66BB6A',
    bgcolor: 'rgba(102, 187, 106, 0.1)',
  },
  'Verified': {
    color: '#42A5F5',
    bgcolor: 'rgba(66, 165, 245, 0.1)',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'small' }) => {
  const colors = STATUS_COLORS[status] || STATUS_COLORS['Not Started'];

  return (
    <Chip
      label={status}
      size={size}
      sx={{
        color: colors.color,
        bgcolor: colors.bgcolor,
        fontWeight: 500,
        fontSize: size === 'small' ? '0.75rem' : '0.875rem',
        border: `1px solid ${colors.color}`,
      }}
    />
  );
};

export default StatusBadge;
