import React from 'react';
import {
  Card,
  CardContent,
  Skeleton,
  Box,
} from '@mui/material';

const PolicyCardSkeleton: React.FC = () => {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Skeleton variant="text" width="60%" height={32} />
          <Skeleton variant="rectangular" width={80} height={24} />
        </Box>
        <Skeleton variant="text" width="90%" />
        <Skeleton variant="text" width="40%" />
        <Box display="flex" gap={1} mt={2}>
          <Skeleton variant="rectangular" width={60} height={24} />
          <Skeleton variant="rectangular" width={60} height={24} />
          <Skeleton variant="rectangular" width={60} height={24} />
        </Box>
      </CardContent>
    </Card>
  );
};

export default PolicyCardSkeleton;
