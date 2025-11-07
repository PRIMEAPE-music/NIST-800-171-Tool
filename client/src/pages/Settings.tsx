import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export const Settings: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: '#E0E0E0' }}>
        Settings
      </Typography>
      <Paper sx={{ p: 3, mt: 2, backgroundColor: '#242424' }}>
        <Typography sx={{ color: '#B0B0B0' }}>
          Application settings and configuration will be displayed here.
        </Typography>
      </Paper>
    </Box>
  );
};
