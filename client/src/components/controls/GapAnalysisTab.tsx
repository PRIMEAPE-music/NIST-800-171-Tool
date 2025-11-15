import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Typography, Button, Alert, Paper, CircularProgress } from '@mui/material';
import { Download as DownloadIcon, Warning as AlertTriangleIcon, CheckCircle } from '@mui/icons-material';
import { CoverageProgressBars } from '../gaps/CoverageProgressBars';
import { GapList } from '../gaps/GapList';

interface GapAnalysisTabProps {
  controlId: string;
}

export const GapAnalysisTab: React.FC<GapAnalysisTabProps> = ({ controlId }) => {
  const queryClient = useQueryClient();

  // Fetch gap analysis
  const { data, isLoading, error } = useQuery({
    queryKey: ['gap-analysis', controlId],
    queryFn: async () => {
      const response = await fetch(`/api/gaps/control/${controlId}`);
      if (!response.ok) throw new Error('Failed to fetch gap analysis');
      return response.json();
    },
  });

  // Mutation for updating gap status
  const updateGapMutation = useMutation({
    mutationFn: async ({ gapId, status }: { gapId: number; status: string }) => {
      const response = await fetch(`/api/gaps/${gapId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update gap');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gap-analysis', controlId] });
    },
  });

  // Mutation for creating POA&M
  const createPOAMMutation = useMutation({
    mutationFn: async (gapId: number) => {
      const response = await fetch(`/api/gaps/${gapId}/poam`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to create POA&M');
      return response.json();
    },
    onSuccess: () => {
      alert('POA&M item created successfully!');
    },
  });

  const handleStatusChange = (gapId: number, status: string) => {
    updateGapMutation.mutate({ gapId, status });
  };

  const handleCreatePOAM = (gapId: number) => {
    if (confirm('Create a POA&M item from this gap?')) {
      createPOAMMutation.mutate(gapId);
    }
  };

  const handleExportPOAM = async () => {
    const response = await fetch('/api/gaps/poam/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ controlId }),
    });

    const poam = await response.json();
    const blob = new Blob([JSON.stringify(poam, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `POAM_${controlId}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 6 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2, color: '#E0E0E0' }}>Loading gap analysis...</Typography>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load gap analysis. Please try again.
        </Alert>
      </Box>
    );
  }

  const hasGaps = data.gaps.length > 0;
  const hasCriticalGaps = data.criticalGaps > 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header with Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#E0E0E0' }}>
          📊 Gap Analysis & Compliance Coverage
        </Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportPOAM}
        >
          Export POA&M
        </Button>
      </Box>

      {/* Critical Gaps Alert */}
      {hasCriticalGaps && (
        <Alert severity="warning" icon={<AlertTriangleIcon />}>
          <Typography variant="body2">
            <strong>Warning:</strong> This control has {data.criticalGaps} critical gap(s) that require immediate attention.
          </Typography>
        </Alert>
      )}

      {/* Coverage Progress Bars */}
      <Paper sx={{ p: 3, backgroundColor: '#2A2A2A' }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#E0E0E0' }}>
          Compliance Coverage
        </Typography>
        <CoverageProgressBars
          technicalCoverage={data.technicalCoverage}
          policyCoverage={data.policyCoverage}
          proceduralCoverage={data.proceduralCoverage}
          evidenceCoverage={data.evidenceCoverage}
          overallCoverage={data.overallCoverage}
        />

        {/* Coverage Explanation */}
        <Box sx={{ mt: 3, p: 2, backgroundColor: '#1E3A5F', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#90CAF9' }}>
            Understanding Your Coverage:
          </Typography>
          <Box component="ul" sx={{ pl: 2, color: '#E0E0E0', '& li': { mb: 0.5 } }}>
            <li>
              <Typography variant="body2">
                <strong>Technical ({data.technicalCoverage}%):</strong> Microsoft 365 configurations and settings
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Policy ({data.policyCoverage}%):</strong> Written policies and standards documents
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Procedural ({data.proceduralCoverage}%):</strong> Documented procedures and processes
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Evidence ({data.evidenceCoverage}%):</strong> Audit evidence and supporting documentation
              </Typography>
            </li>
          </Box>
          <Typography variant="body2" sx={{ mt: 2, color: '#B0B0B0' }}>
            <strong>Note:</strong> NIST compliance requires BOTH technical controls AND
            policies/procedures/evidence. Microsoft 365 provides technical controls,
            but you must create the documentation.
          </Typography>
        </Box>
      </Paper>

      {/* Gaps List */}
      {hasGaps ? (
        <Paper sx={{ p: 3, backgroundColor: '#2A2A2A' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <AlertTriangleIcon sx={{ color: '#FF9800' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#E0E0E0' }}>
              Identified Gaps ({data.totalGaps})
            </Typography>
          </Box>
          <GapList
            gaps={data.gaps}
            onStatusChange={handleStatusChange}
            onCreatePOAM={handleCreatePOAM}
          />
        </Paper>
      ) : (
        <Paper sx={{ p: 6, backgroundColor: '#2A2A2A', textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 64, color: '#4CAF50', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#E0E0E0' }}>
            No Gaps Detected!
          </Typography>
          <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
            This control appears to be fully compliant based on current analysis.
          </Typography>
        </Paper>
      )}

      {/* Last Assessed */}
      <Typography variant="caption" sx={{ textAlign: 'right', color: '#B0B0B0' }}>
        Last assessed: {new Date(data.lastAssessed).toLocaleString()}
      </Typography>
    </Box>
  );
};
