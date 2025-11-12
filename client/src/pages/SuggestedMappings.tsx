import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Alert,
  Button,
  Checkbox,
  Stack,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

interface SuggestedMapping {
  id: number;
  mappingConfidence: 'High' | 'Medium' | 'Low';
  mappingNotes: string;
  createdAt: string;
  control: {
    controlId: string;
    title: string;
    family: string;
  };
  policy: {
    policyName: string;
    policyType: string;
    policyDescription: string | null;
  };
}

const SuggestedMappingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [confidenceFilter, setConfidenceFilter] = useState<string>('');
  const [selectedMapping, setSelectedMapping] = useState<SuggestedMapping | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Fetch suggested mappings
  const { data: mappings = [], isLoading } = useQuery<SuggestedMapping[]>({
    queryKey: ['suggestedMappings', confidenceFilter],
    queryFn: async () => {
      const params = confidenceFilter ? `?confidence=${confidenceFilter}` : '';
      const response = await axios.get(`/api/m365/suggested-mappings${params}`);
      return response.data;
    },
  });

  // Approve mapping mutation
  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      await axios.post(`/api/m365/mappings/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestedMappings'] });
    },
  });

  // Reject mapping mutation
  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`/api/m365/mappings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestedMappings'] });
    },
  });

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await axios.post('/api/m365/mappings/bulk-approve', { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestedMappings'] });
      setSelectedIds([]);
    },
  });

  // Bulk reject mutation
  const bulkRejectMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await axios.post('/api/m365/mappings/bulk-reject', { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestedMappings'] });
      setSelectedIds([]);
    },
  });

  const handleViewDetails = (mapping: SuggestedMapping) => {
    setSelectedMapping(mapping);
    setDetailsOpen(true);
  };

  const handleApprove = (id: number) => {
    if (window.confirm('Approve this mapping?')) {
      approveMutation.mutate(id);
    }
  };

  const handleReject = (id: number) => {
    if (window.confirm('Reject and delete this mapping?')) {
      rejectMutation.mutate(id);
    }
  };

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Approve ${selectedIds.length} selected mapping(s)?`)) {
      bulkApproveMutation.mutate(selectedIds);
    }
  };

  const handleBulkReject = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Reject and delete ${selectedIds.length} selected mapping(s)?`)) {
      bulkRejectMutation.mutate(selectedIds);
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedIds(mappings.map(m => m.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High':
        return 'success';
      case 'Medium':
        return 'warning';
      case 'Low':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Review Auto-Mapped Policies</Typography>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Confidence</InputLabel>
          <Select
            value={confidenceFilter}
            label="Filter by Confidence"
            onChange={(e) => setConfidenceFilter(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="High">High Confidence</MenuItem>
            <MenuItem value="Medium">Medium Confidence</MenuItem>
            <MenuItem value="Low">Low Confidence</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {selectedIds.length > 0 && (
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Button
            variant="contained"
            color="success"
            onClick={handleBulkApprove}
            disabled={bulkApproveMutation.isPending}
          >
            Approve Selected ({selectedIds.length})
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleBulkReject}
            disabled={bulkRejectMutation.isPending}
          >
            Reject Selected ({selectedIds.length})
          </Button>
        </Stack>
      )}

      {mappings.length === 0 && !isLoading && (
        <Alert severity="info">
          No suggested mappings to review. Run an M365 sync to generate mappings.
        </Alert>
      )}

      {isLoading && (
        <Alert severity="info">Loading mappings...</Alert>
      )}

      {mappings.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedIds.length > 0 && selectedIds.length < mappings.length}
                    checked={mappings.length > 0 && selectedIds.length === mappings.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Control ID</TableCell>
                <TableCell>Control Title</TableCell>
                <TableCell>Policy Name</TableCell>
                <TableCell>Policy Type</TableCell>
                <TableCell>Confidence</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.includes(mapping.id)}
                      onChange={() => handleSelectOne(mapping.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {mapping.control.controlId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                      {mapping.control.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                      {mapping.policy.policyName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={mapping.policy.policyType} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={mapping.mappingConfidence}
                      color={getConfidenceColor(mapping.mappingConfidence) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => handleViewDetails(mapping)}>
                        <InfoIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Approve Mapping">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleApprove(mapping.id)}
                      >
                        <ApproveIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Reject Mapping">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleReject(mapping.id)}
                      >
                        <RejectIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Mapping Details</DialogTitle>
        <DialogContent>
          {selectedMapping && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Control: {selectedMapping.control.controlId}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {selectedMapping.control.title}
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Policy: {selectedMapping.policy.policyName}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Type: {selectedMapping.policy.policyType}
              </Typography>
              {selectedMapping.policy.policyDescription && (
                <Typography variant="body2" color="text.secondary" paragraph>
                  Description: {selectedMapping.policy.policyDescription}
                </Typography>
              )}

              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Mapping Confidence: {selectedMapping.mappingConfidence}
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {selectedMapping.mappingNotes}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          {selectedMapping && (
            <>
              <Button
                variant="contained"
                color="error"
                onClick={() => {
                  handleReject(selectedMapping.id);
                  setDetailsOpen(false);
                }}
              >
                Reject
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => {
                  handleApprove(selectedMapping.id);
                  setDetailsOpen(false);
                }}
              >
                Approve
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuggestedMappingsPage;
