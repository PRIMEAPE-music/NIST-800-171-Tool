import React from 'react';
import { Chip } from '@mui/material';

interface POAMStatusChipProps {
  status: 'Open' | 'In Progress' | 'Completed' | 'Risk Accepted';
  size?: 'small' | 'medium';
}

const statusColors = {
  Open: '#757575',
  'In Progress': '#FFA726',
  Completed: '#66BB6A',
  'Risk Accepted': '#42A5F5',
};

export const POAMStatusChip: React.FC<POAMStatusChipProps> = ({
  status,
  size = 'small',
}) => {
  return (
    <Chip
      label={status}
      size={size}
      sx={{
        backgroundColor: statusColors[status],
        color: '#FFFFFF',
        fontWeight: 500,
      }}
    />
  );
};
