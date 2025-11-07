import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { useEvidenceGaps } from '../hooks/useEvidence';
import { useNavigate } from 'react-router-dom';

export const EvidenceGapReport: React.FC = () => {
  const { data: gaps, isLoading, error } = useEvidenceGaps();
  const navigate = useNavigate();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'error';
      case 'High':
        return 'warning';
      case 'Medium':
        return 'info';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">
          Failed to load gap report: {error.message}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
          Evidence Gap Report
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Controls without supporting evidence documentation
        </Typography>
      </Box>

      {/* Summary Card */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'warning.dark' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <WarningIcon sx={{ fontSize: 48, mr: 2 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {gaps?.length || 0} Controls Missing Evidence
            </Typography>
            <Typography variant="body2">
              These controls require evidence documentation for compliance
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Gap Table */}
      {gaps && gaps.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Control ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Family</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gaps.map((control) => (
                <TableRow key={control.id} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>
                      {control.controlId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={control.family} size="small" />
                  </TableCell>
                  <TableCell>{control.title}</TableCell>
                  <TableCell>
                    <Chip
                      label={control.priority}
                      size="small"
                      color={getPriorityColor(control.priority) as any}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<UploadIcon />}
                      onClick={() => navigate(`/controls/${control.id}`)}
                    >
                      Upload Evidence
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Paper sx={{ p: 8, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No evidence gaps found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            All controls have supporting evidence documentation
          </Typography>
        </Paper>
      )}
    </Container>
  );
};
