import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Alert,
  Paper,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  ExpandMore,
  Warning,
  Error,
  Policy as PolicyIcon,
  Description as ProcedureIcon,
  PlayArrow as ExecutionIcon,
  Business as PhysicalIcon,
  Upload as UploadIcon,
  Close as CloseIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Description as DocIcon,
  TableChart as ExcelIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import ControlCoverageCard from '../ControlCoverageCard';
import { format } from 'date-fns';
import { FileUpload } from '../evidence/FileUpload';

interface GapAnalysisTabProps {
  controlId: string;
}

interface EvidenceRequirement {
  id: number;
  evidenceType: string;
  name: string;
  description: string;
  rationale: string;
  frequency: string | null;
  freshnessThreshold: number | null;
  policy: { name: string; fileName: string | null } | null;
  procedure: { name: string; fileName: string | null } | null;
  uploadedEvidence: Array<{
    id: number;
    fileName: string;
    uploadedAt: string;
    executionDate: string | null;
  }>;
}

export const GapAnalysisTab: React.FC<GapAnalysisTabProps> = ({ controlId }) => {
  const [expandedType, setExpandedType] = useState<string | false>('policy');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<EvidenceRequirement | null>(null);

  // Fetch coverage data
  const { data: coverage, isLoading: loadingCoverage } = useQuery({
    queryKey: ['coverage', controlId],
    queryFn: async () => {
      const response = await fetch(`/api/coverage/control/${controlId}`);
      if (!response.ok) throw new Error('Failed to fetch coverage');
      return response.json();
    },
  });

  // Fetch evidence requirements
  const { data: requirements, isLoading: loadingRequirements } = useQuery({
    queryKey: ['evidence-requirements', controlId],
    queryFn: async () => {
      const response = await fetch(`/api/evidence/requirements/${controlId}`);
      if (!response.ok) throw new Error('Failed to fetch requirements');
      return response.json();
    },
  });

  const isLoading = loadingCoverage || loadingRequirements;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 6 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2, color: '#E0E0E0' }}>Loading gap analysis...</Typography>
      </Box>
    );
  }

  if (!coverage || !requirements) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load gap analysis. Please try again.
        </Alert>
      </Box>
    );
  }

  // Group requirements by type
  const requirementsByType = {
    policy: requirements.filter((r: EvidenceRequirement) => r.evidenceType === 'policy'),
    procedure: requirements.filter((r: EvidenceRequirement) => r.evidenceType === 'procedure'),
    execution: requirements.filter((r: EvidenceRequirement) => r.evidenceType === 'execution'),
    physical: requirements.filter((r: EvidenceRequirement) => r.evidenceType === 'physical'),
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactElement> = {
      policy: <PolicyIcon />,
      procedure: <ProcedureIcon />,
      execution: <ExecutionIcon />,
      physical: <PhysicalIcon />,
    };
    return icons[type];
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      policy: '#2196F3',
      procedure: '#4CAF50',
      execution: '#FF9800',
      physical: '#9C27B0',
    };
    return colors[type] || '#757575';
  };

  const getRequirementStatus = (req: EvidenceRequirement) => {
    if (req.uploadedEvidence.length === 0) {
      return { status: 'missing', color: '#f44336', label: 'Missing' };
    }

    if (req.evidenceType === 'execution' && req.freshnessThreshold) {
      const latest = req.uploadedEvidence[0];
      const referenceDate = latest.executionDate || latest.uploadedAt;
      const ageInDays = Math.floor(
        (Date.now() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (ageInDays <= req.freshnessThreshold) {
        return { status: 'fresh', color: '#4caf50', label: 'Fresh' };
      } else if (ageInDays <= req.freshnessThreshold * 2) {
        return { status: 'aging', color: '#ff9800', label: 'Aging' };
      } else if (ageInDays <= req.freshnessThreshold * 3) {
        return { status: 'stale', color: '#ff5722', label: 'Stale' };
      } else {
        return { status: 'critical', color: '#d32f2f', label: 'Critical' };
      }
    }

    return { status: 'uploaded', color: '#4caf50', label: 'Uploaded' };
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <PdfIcon sx={{ fontSize: 18 }} />;
      case 'png':
      case 'jpg':
      case 'jpeg':
        return <ImageIcon sx={{ fontSize: 18 }} />;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <ExcelIcon sx={{ fontSize: 18 }} />;
      case 'docx':
      case 'doc':
        return <DocIcon sx={{ fontSize: 18 }} />;
      default:
        return <FileIcon sx={{ fontSize: 18 }} />;
    }
  };

  const handleOpenUploadDialog = (requirement: EvidenceRequirement) => {
    setSelectedRequirement(requirement);
    setUploadDialogOpen(true);
  };

  const handleCloseUploadDialog = () => {
    setUploadDialogOpen(false);
    setSelectedRequirement(null);
  };

  const handleUploadComplete = () => {
    handleCloseUploadDialog();
    // Refetch evidence requirements to show updated data
    window.location.reload(); // Simple reload for now, can be improved with query invalidation
  };

  const renderRequirementsTable = (reqs: EvidenceRequirement[], type: string) => {
    if (reqs.length === 0) {
      return (
        <Typography variant="body2" sx={{ color: '#B0B0B0', fontStyle: 'italic', p: 2 }}>
          No {type} requirements for this control
        </Typography>
      );
    }

    return (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '15%' }}>Requirement</TableCell>
              <TableCell sx={{ width: '45%' }}>Description & Rationale</TableCell>
              {type === 'execution' && <TableCell sx={{ width: '10%' }}>Frequency</TableCell>}
              <TableCell sx={{ width: '10%' }}>Status</TableCell>
              <TableCell sx={{ width: type === 'execution' ? '20%' : '30%' }}>Evidence</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reqs.map((req) => {
              const status = getRequirementStatus(req);
              return (
                <TableRow key={req.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {req.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem', mb: req.rationale ? 1 : 0 }}>
                      {req.description}
                    </Typography>
                    {req.rationale && (
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#B0B0B0', fontStyle: 'italic' }}>
                        <strong>Rationale:</strong> {req.rationale}
                      </Typography>
                    )}
                  </TableCell>
                  {type === 'execution' && (
                    <TableCell>
                      <Chip
                        label={req.frequency || 'N/A'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Chip
                      label={status.label}
                      size="small"
                      sx={{ bgcolor: status.color, color: '#fff' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {req.uploadedEvidence.length > 0 ? (
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flex: 1 }}>
                          <Tooltip title={req.uploadedEvidence[0].fileName}>
                            <Box sx={{ display: 'flex', alignItems: 'center', color: '#90CAF9' }}>
                              {getFileIcon(req.uploadedEvidence[0].fileName)}
                            </Box>
                          </Tooltip>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="caption" noWrap sx={{ display: 'block' }}>
                              {req.uploadedEvidence[0].fileName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#B0B0B0', fontSize: '0.7rem' }}>
                              {format(new Date(req.uploadedEvidence[0].uploadedAt), 'MMM d, yyyy')}
                            </Typography>
                          </Box>
                          {req.uploadedEvidence.length > 1 && (
                            <Chip
                              label={`+${req.uploadedEvidence.length - 1}`}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.7rem',
                                bgcolor: '#424242',
                                color: '#90CAF9',
                              }}
                            />
                          )}
                        </Stack>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#f44336', flex: 1 }}>
                          No evidence uploaded
                        </Typography>
                      )}
                      <Tooltip title="Upload Evidence">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenUploadDialog(req)}
                          sx={{
                            bgcolor: req.uploadedEvidence.length > 0 ? '#424242' : '#1976d2',
                            color: '#fff',
                            '&:hover': {
                              bgcolor: req.uploadedEvidence.length > 0 ? '#616161' : '#1565c0',
                            },
                            width: 28,
                            height: 28,
                          }}
                        >
                          <UploadIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const totalMissing =
    requirementsByType.policy.filter(r => r.uploadedEvidence.length === 0).length +
    requirementsByType.procedure.filter(r => r.uploadedEvidence.length === 0).length +
    requirementsByType.execution.filter(r => r.uploadedEvidence.length === 0).length +
    requirementsByType.physical.filter(r => r.uploadedEvidence.length === 0).length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#E0E0E0' }}>
          Coverage & Evidence Requirements
        </Typography>
        <Button
          variant="outlined"
          onClick={() => window.open('/gap-analysis', '_blank')}
        >
          View Full Dashboard
        </Button>
      </Box>

      {/* Alert if coverage is low */}
      {coverage.overallCoverage < 50 && (
        <Alert severity="warning" icon={<Warning />}>
          <Typography variant="body2">
            <strong>Action Required:</strong> This control has {coverage.overallCoverage}% coverage and {totalMissing} missing evidence item(s).
          </Typography>
        </Alert>
      )}

      {/* Coverage Card */}
      {coverage && <ControlCoverageCard coverage={coverage} />}

      {/* Evidence Requirements by Type */}
      <Paper sx={{ p: 3, backgroundColor: '#2A2A2A' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#E0E0E0' }}>
          Evidence Requirements ({requirements.length})
        </Typography>

        <Typography variant="body2" sx={{ mb: 3, color: '#B0B0B0' }}>
          This control requires the following evidence to demonstrate compliance. Upload evidence through the Evidence tab.
        </Typography>

        {/* Policy Requirements */}
        <Accordion
          expanded={expandedType === 'policy'}
          onChange={() => setExpandedType(expandedType === 'policy' ? false : 'policy')}
          sx={{ bgcolor: '#1E1E1E', mb: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
              <Box sx={{ color: getTypeColor('policy') }}>
                {getTypeIcon('policy')}
              </Box>
              <Typography sx={{ fontWeight: 600 }}>
                Policy Requirements ({requirementsByType.policy.length})
              </Typography>
              <Chip
                size="small"
                label={`${requirementsByType.policy.filter(r => r.uploadedEvidence.length > 0).length}/${requirementsByType.policy.length} uploaded`}
                sx={{
                  bgcolor: requirementsByType.policy.filter(r => r.uploadedEvidence.length > 0).length === requirementsByType.policy.length
                    ? '#4caf50'
                    : '#ff9800',
                  color: '#fff',
                }}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {renderRequirementsTable(requirementsByType.policy, 'policy')}
          </AccordionDetails>
        </Accordion>

        {/* Procedure Requirements */}
        <Accordion
          expanded={expandedType === 'procedure'}
          onChange={() => setExpandedType(expandedType === 'procedure' ? false : 'procedure')}
          sx={{ bgcolor: '#1E1E1E', mb: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
              <Box sx={{ color: getTypeColor('procedure') }}>
                {getTypeIcon('procedure')}
              </Box>
              <Typography sx={{ fontWeight: 600 }}>
                Procedure Requirements ({requirementsByType.procedure.length})
              </Typography>
              <Chip
                size="small"
                label={`${requirementsByType.procedure.filter(r => r.uploadedEvidence.length > 0).length}/${requirementsByType.procedure.length} uploaded`}
                sx={{
                  bgcolor: requirementsByType.procedure.filter(r => r.uploadedEvidence.length > 0).length === requirementsByType.procedure.length
                    ? '#4caf50'
                    : '#ff9800',
                  color: '#fff',
                }}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {renderRequirementsTable(requirementsByType.procedure, 'procedure')}
          </AccordionDetails>
        </Accordion>

        {/* Execution Evidence Requirements */}
        <Accordion
          expanded={expandedType === 'execution'}
          onChange={() => setExpandedType(expandedType === 'execution' ? false : 'execution')}
          sx={{ bgcolor: '#1E1E1E', mb: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
              <Box sx={{ color: getTypeColor('execution') }}>
                {getTypeIcon('execution')}
              </Box>
              <Typography sx={{ fontWeight: 600 }}>
                Execution Evidence Requirements ({requirementsByType.execution.length})
              </Typography>
              <Chip
                size="small"
                label={`${requirementsByType.execution.filter(r => r.uploadedEvidence.length > 0).length}/${requirementsByType.execution.length} uploaded`}
                sx={{
                  bgcolor: requirementsByType.execution.filter(r => r.uploadedEvidence.length > 0).length === requirementsByType.execution.length
                    ? '#4caf50'
                    : '#ff9800',
                  color: '#fff',
                }}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {renderRequirementsTable(requirementsByType.execution, 'execution')}
          </AccordionDetails>
        </Accordion>

        {/* Physical Evidence Requirements */}
        {requirementsByType.physical.length > 0 && (
          <Accordion
            expanded={expandedType === 'physical'}
            onChange={() => setExpandedType(expandedType === 'physical' ? false : 'physical')}
            sx={{ bgcolor: '#1E1E1E' }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                <Box sx={{ color: getTypeColor('physical') }}>
                  {getTypeIcon('physical')}
                </Box>
                <Typography sx={{ fontWeight: 600 }}>
                  Physical Evidence Requirements ({requirementsByType.physical.length})
                </Typography>
                <Chip
                  size="small"
                  label={`${requirementsByType.physical.filter(r => r.uploadedEvidence.length > 0).length}/${requirementsByType.physical.length} uploaded`}
                  sx={{
                    bgcolor: requirementsByType.physical.filter(r => r.uploadedEvidence.length > 0).length === requirementsByType.physical.length
                      ? '#4caf50'
                      : '#ff9800',
                    color: '#fff',
                  }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {renderRequirementsTable(requirementsByType.physical, 'physical')}
            </AccordionDetails>
          </Accordion>
        )}
      </Paper>

      {/* Summary Stats */}
      <Paper sx={{ p: 2, backgroundColor: '#1E3A5F' }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#90CAF9' }}>
          Quick Stats:
        </Typography>
        <Box component="ul" sx={{ pl: 2, m: 0, color: '#E0E0E0', '& li': { mb: 0.5 } }}>
          <li>Total Requirements: {requirements.length}</li>
          <li>Evidence Uploaded: {requirements.filter((r: EvidenceRequirement) => r.uploadedEvidence.length > 0).length}</li>
          <li>Missing Evidence: {totalMissing}</li>
          <li>Overall Coverage: {coverage.overallCoverage}%</li>
        </Box>
      </Paper>

      {/* Upload Evidence Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={handleCloseUploadDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">Upload Evidence</Typography>
            {selectedRequirement && (
              <Typography variant="body2" sx={{ color: '#B0B0B0', mt: 0.5 }}>
                {selectedRequirement.name} • {selectedRequirement.evidenceType}
              </Typography>
            )}
          </Box>
          <IconButton onClick={handleCloseUploadDialog} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedRequirement && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Description:</strong> {selectedRequirement.description}
              </Typography>
              {selectedRequirement.rationale && (
                <Typography variant="body2" sx={{ color: '#B0B0B0', fontStyle: 'italic' }}>
                  <strong>Rationale:</strong> {selectedRequirement.rationale}
                </Typography>
              )}
            </Box>
          )}
          <FileUpload
            controlId={parseInt(controlId)}
            onUploadComplete={handleUploadComplete}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
