import React from 'react';
import { Chip } from '@mui/material';

interface POAMPriorityChipProps {
  priority: 'High' | 'Medium' | 'Low';
  size?: 'small' | 'medium';
}

const priorityColors = {
  High: '#F44336',
  Medium: '#FF9800',
  Low: '#4CAF50',
};

export const POAMPriorityChip: React.FC<POAMPriorityChipProps> = ({
  priority,
  size = 'small',
}) => {
  return (
    <Chip
      label={priority}
      size={size}
      sx={{
        backgroundColor: priorityColors[priority],
        color: '#FFFFFF',
        fontWeight: 500,
      }}
    />
  );
};
