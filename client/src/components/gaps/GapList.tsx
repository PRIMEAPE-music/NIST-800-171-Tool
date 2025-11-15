import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Collapse,
} from '@mui/material';
import {
  Warning as AlertTriangle,
  CheckCircle,
  Cancel as XCircle,
  AccessTime as Clock,
  Description as FileText,
  Settings,
  MenuBook as BookOpen,
  FolderOpen
} from '@mui/icons-material';

interface Gap {
  id: number;
  gapType: 'technical' | 'policy' | 'procedure' | 'evidence';
  gapTitle: string;
  gapDescription: string;
  nistRequirement: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved' | 'accepted';
  remediationGuidance: string;
  assignedTo?: string;
  dueDate?: string;
}

interface GapListProps {
  gaps: Gap[];
  onStatusChange?: (gapId: number, status: string) => void;
  onCreatePOAM?: (gapId: number) => void;
  showFilters?: boolean;
}

export const GapList: React.FC<GapListProps> = ({
  gaps,
  onStatusChange,
  onCreatePOAM,
  showFilters = true,
}) => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [expandedGap, setExpandedGap] = useState<number | null>(null);

  const getSeverityColor = (severity: string): 'error' | 'warning' | 'info' | 'success' => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'info';
    }
  };

  const getTypeIcon = (type: string) => {
    const iconStyle = { fontSize: 20 };
    switch (type) {
      case 'technical': return <Settings sx={iconStyle} />;
      case 'policy': return <FileText sx={iconStyle} />;
      case 'procedure': return <BookOpen sx={iconStyle} />;
      case 'evidence': return <FolderOpen sx={iconStyle} />;
      default: return <AlertTriangle sx={iconStyle} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'technical': return '#2196F3';
      case 'policy': return '#9C27B0';
      case 'procedure': return '#4CAF50';
      case 'evidence': return '#FF9800';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status: string) => {
    const iconStyle = { fontSize: 20 };
    switch (status) {
      case 'resolved': return <CheckCircle sx={{ ...iconStyle, color: '#4CAF50' }} />;
      case 'in_progress': return <Clock sx={{ ...iconStyle, color: '#FFC107' }} />;
      case 'open': return <XCircle sx={{ ...iconStyle, color: '#F44336' }} />;
      case 'accepted': return <CheckCircle sx={{ ...iconStyle, color: '#757575' }} />;
      default: return <AlertTriangle sx={{ ...iconStyle, color: '#757575' }} />;
    }
  };

  // Filter gaps
  const filteredGaps = gaps.filter(gap => {
    if (selectedType !== 'all' && gap.gapType !== selectedType) return false;
    if (selectedSeverity !== 'all' && gap.severity !== selectedSeverity) return false;
    return true;
  });

  // Group by type
  const gapsByType = filteredGaps.reduce((acc, gap) => {
    if (!acc[gap.gapType]) acc[gap.gapType] = [];
    acc[gap.gapType].push(gap);
    return acc;
  }, {} as Record<string, Gap[]>);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Filters */}
      {showFilters && (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              label="Type"
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="technical">Technical</MenuItem>
              <MenuItem value="policy">Policy</MenuItem>
              <MenuItem value="procedure">Procedure</MenuItem>
              <MenuItem value="evidence">Evidence</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Severity</InputLabel>
            <Select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              label="Severity"
            >
              <MenuItem value="all">All Severities</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Gap Count Summary */}
      <Card sx={{ backgroundColor: '#2A2A2A' }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="body2" sx={{ color: '#B0B0B0' }}>Total Gaps:</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#E0E0E0' }}>
                {filteredGaps.length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#B0B0B0' }}>Open:</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#F44336' }}>
                {filteredGaps.filter(g => g.status === 'open').length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#B0B0B0' }}>In Progress:</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#FFC107' }}>
                {filteredGaps.filter(g => g.status === 'in_progress').length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#B0B0B0' }}>Resolved:</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                {filteredGaps.filter(g => g.status === 'resolved').length}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Gaps by Type */}
      {Object.entries(gapsByType).map(([type, typeGaps]) => (
        <Box key={type}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            {getTypeIcon(type)}
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#E0E0E0' }}>
              {type.charAt(0).toUpperCase() + type.slice(1)} Gaps ({typeGaps.length})
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {typeGaps.map(gap => (
              <Card key={gap.id} sx={{ backgroundColor: '#2A2A2A' }}>
                <CardContent>
                  {/* Gap Header */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    {getStatusIcon(gap.status)}
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#E0E0E0', flex: 1 }}>
                      {gap.gapTitle}
                    </Typography>
                    <Chip
                      label={gap.severity.toUpperCase()}
                      color={getSeverityColor(gap.severity)}
                      size="small"
                    />
                    <Chip
                      label={gap.gapType}
                      size="small"
                      sx={{
                        backgroundColor: getTypeColor(gap.gapType),
                        color: '#FFF',
                      }}
                    />
                  </Box>

                  {/* Gap Description */}
                  <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 2 }}>
                    {gap.gapDescription}
                  </Typography>

                  {/* NIST Requirement */}
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>NIST Requirement:</strong> {gap.nistRequirement}
                    </Typography>
                  </Alert>

                  {/* Expandable Remediation */}
                  <Collapse in={expandedGap === gap.id}>
                    <Box sx={{ backgroundColor: '#1E1E1E', borderRadius: 1, p: 2, mb: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#E0E0E0' }}>
                        Remediation Guidance:
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 1 }}>
                        {gap.remediationGuidance}
                      </Typography>

                      {gap.assignedTo && (
                        <Typography variant="body2" sx={{ color: '#B0B0B0', mt: 1 }}>
                          <strong>Assigned to:</strong> {gap.assignedTo}
                        </Typography>
                      )}

                      {gap.dueDate && (
                        <Typography variant="body2" sx={{ color: '#B0B0B0', mt: 1 }}>
                          <strong>Due date:</strong> {new Date(gap.dueDate).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                  </Collapse>

                  {/* Actions */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setExpandedGap(expandedGap === gap.id ? null : gap.id)}
                    >
                      {expandedGap === gap.id ? 'Hide Details' : 'Show Details'}
                    </Button>

                    {gap.status !== 'resolved' && onStatusChange && (
                      <>
                        {gap.status === 'open' && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => onStatusChange(gap.id, 'in_progress')}
                          >
                            Mark In Progress
                          </Button>
                        )}
                        {gap.status === 'in_progress' && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => onStatusChange(gap.id, 'resolved')}
                          >
                            Mark Resolved
                          </Button>
                        )}
                      </>
                    )}

                    {onCreatePOAM && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => onCreatePOAM(gap.id)}
                      >
                        Add to POA&M
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      ))}

      {/* No gaps message */}
      {filteredGaps.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CheckCircle sx={{ fontSize: 64, color: '#4CAF50', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#E0E0E0' }}>
            No gaps found matching your criteria!
          </Typography>
        </Box>
      )}
    </Box>
  );
};
