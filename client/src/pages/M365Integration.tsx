import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export const M365Integration: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: '#E0E0E0' }}>
        Microsoft 365 Integration
      </Typography>
      <Paper sx={{ p: 3, mt: 2, backgroundColor: '#242424' }}>
        <Typography sx={{ color: '#B0B0B0' }}>
          M365 policy synchronization and mapping will be displayed here.
        </Typography>
      </Paper>
    </Box>
  );
};
