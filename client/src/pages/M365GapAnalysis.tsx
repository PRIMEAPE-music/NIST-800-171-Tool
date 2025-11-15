import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
  Divider,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  CheckCircle as CompleteIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

interface GapAnalysis {
  totalControls: number;
  controlsFullyCovered: number;
  controlsPartiallyCovered: number;
  controlsNotCovered: number;
  coveragePercentage: number;
  gaps: ControlGap[];
}

interface ControlGap {
  id: number;
  controlId: string;
  controlTitle: string;
  family: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  gapType: 'NoSettings' | 'NonCompliantSettings';
  affectedPolicies: AffectedPolicy[];
  recommendedActions: string[];
}

interface AffectedPolicy {
  policyId: number;
  policyName: string;
  nonCompliantSettings: NonCompliantSetting[];
}

interface NonCompliantSetting {
  settingName: string;
  settingValue: any;
  meetsRequirement: boolean;
  requiredValue?: any;
  validationType?: string;
  validationMessage?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index} role="tabpanel">
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const fetchGapAnalysis = async (): Promise<GapAnalysis> => {
  const response = await fetch('/api/m365/gap-analysis');
  if (!response.ok) {
    throw new Error('Failed to fetch gap analysis');
  }
  const data = await response.json();
  return data.analysis;
};

export const M365GapAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [expandedGaps, setExpandedGaps] = useState<Set<string>>(new Set());

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/m365/gap-analysis/export?format=${format}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `m365-gap-analysis-${new Date().toISOString().split('T')[0]}.${format === 'json' ? 'json' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const { data: analysis, isLoading, error } = useQuery({
    queryKey: ['m365-gap-analysis'],
    queryFn: fetchGapAnalysis,
  });

  const toggleGap = (controlId: string) => {
    setExpandedGaps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(controlId)) {
        newSet.delete(controlId);
      } else {
        newSet.add(controlId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !analysis) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">
          Failed to load M365 gap analysis. Please try again later.
        </Alert>
      </Container>
    );
  }

  const noSettingsGaps = analysis.gaps.filter((g) => g.gapType === 'NoSettings');
  const nonCompliantGaps = analysis.gaps.filter((g) => g.gapType === 'NonCompliantSettings');

  // Group by family
  const gapsByFamily = analysis.gaps.reduce((acc, gap) => {
    if (!acc[gap.family]) {
      acc[gap.family] = [];
    }
    acc[gap.family].push(gap);
    return acc;
  }, {} as Record<string, ControlGap[]>);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            M365 Gap Analysis
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Identify controls with missing or non-compliant Microsoft 365 settings
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport('csv')}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport('json')}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Export JSON
          </Button>
        </Box>
      </Box>

      {/* Summary Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1a1a1a', borderLeft: '4px solid #66BB6A' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Fully Covered
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {analysis.controlsFullyCovered}
                  </Typography>
                </Box>
                <CompleteIcon sx={{ fontSize: 40, color: '#66BB6A', opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1a1a1a', borderLeft: '4px solid #FFA726' }}>
            <CardContent>
              <Box display="flex" alignments="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Partially Covered
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {analysis.controlsPartiallyCovered}
                  </Typography>
                </Box>
                <WarningIcon sx={{ fontSize: 40, color: '#FFA726', opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1a1a1a', borderLeft: '4px solid #EF5350' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Not Covered
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {analysis.controlsNotCovered}
                  </Typography>
                </Box>
                <ErrorIcon sx={{ fontSize: 40, color: '#EF5350', opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1a1a1a', borderLeft: '4px solid #42A5F5' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Coverage %
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {Math.round(analysis.coveragePercentage)}%
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: '#42A5F5', opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ backgroundColor: '#242424' }}>
        <Tabs
          value={activeTab}
          onChange={(_e, newValue) => setActiveTab(newValue)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { color: '#B0B0B0' },
            '& .Mui-selected': { color: '#90CAF9' },
            '& .MuiTabs-indicator': { backgroundColor: '#90CAF9' },
          }}
        >
          <Tab label={`All Gaps (${analysis.gaps.length})`} />
          <Tab label={`No Settings (${noSettingsGaps.length})`} />
          <Tab label={`Non-Compliant (${nonCompliantGaps.length})`} />
          <Tab label="By Family" />
        </Tabs>

        {/* All Gaps Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ px: 3 }}>
            {analysis.gaps.length === 0 ? (
              <Alert severity="success" icon={<CompleteIcon />}>
                Excellent! No gaps found. All controls have fully compliant M365 settings.
              </Alert>
            ) : (
              <List>
                {analysis.gaps.map((gap) => (
                  <GapCard
                    key={gap.controlId}
                    gap={gap}
                    expanded={expandedGaps.has(gap.controlId)}
                    onToggle={() => toggleGap(gap.controlId)}
                    onViewControl={() => navigate(`/controls/${gap.id}`)}
                  />
                ))}
              </List>
            )}
          </Box>
        </TabPanel>

        {/* No Settings Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ px: 3 }}>
            {noSettingsGaps.length === 0 ? (
              <Alert severity="info">
                All controls in the mapping library have at least one M365 setting mapped.
              </Alert>
            ) : (
              <>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  These controls have no M365 settings currently mapped. Consider manual
                  configuration or procedural controls.
                </Alert>
                <List>
                  {noSettingsGaps.map((gap) => (
                    <GapCard
                      key={gap.controlId}
                      gap={gap}
                      expanded={expandedGaps.has(gap.controlId)}
                      onToggle={() => toggleGap(gap.controlId)}
                      onViewControl={() => navigate(`/controls/${gap.id}`)}
                    />
                  ))}
                </List>
              </>
            )}
          </Box>
        </TabPanel>

        {/* Non-Compliant Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ px: 3 }}>
            {nonCompliantGaps.length === 0 ? (
              <Alert severity="success">
                All mapped settings are compliant with NIST requirements!
              </Alert>
            ) : (
              <>
                <Alert severity="error" sx={{ mb: 2 }}>
                  These controls have settings that don't meet NIST requirements. Review and
                  update your M365 policies.
                </Alert>
                <List>
                  {nonCompliantGaps.map((gap) => (
                    <GapCard
                      key={gap.controlId}
                      gap={gap}
                      expanded={expandedGaps.has(gap.controlId)}
                      onToggle={() => toggleGap(gap.controlId)}
                      onViewControl={() => navigate(`/controls/${gap.id}`)}
                    />
                  ))}
                </List>
              </>
            )}
          </Box>
        </TabPanel>

        {/* By Family Tab */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ px: 3 }}>
            {Object.entries(gapsByFamily)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([family, gaps]) => (
                <Box key={family} sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ color: '#90CAF9' }}>
                    {family} Family ({gaps.length} gaps)
                  </Typography>
                  <List>
                    {gaps.map((gap) => (
                      <GapCard
                        key={gap.controlId}
                        gap={gap}
                        expanded={expandedGaps.has(gap.controlId)}
                        onToggle={() => toggleGap(gap.controlId)}
                        onViewControl={() => navigate(`/controls/${gap.id}`)}
                      />
                    ))}
                  </List>
                </Box>
              ))}
          </Box>
        </TabPanel>
      </Paper>
    </Container>
  );
};

interface GapCardProps {
  gap: ControlGap;
  expanded: boolean;
  onToggle: () => void;
  onViewControl: () => void;
}

const GapCard: React.FC<GapCardProps> = ({ gap, expanded, onToggle, onViewControl }) => {
  const getSeverityColor = (gapType: string) => {
    return gapType === 'NoSettings' ? '#EF5350' : '#FFA726';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return '#EF5350'; // Red
      case 'High': return '#FF9800'; // Orange
      case 'Medium': return '#FFC107'; // Yellow
      case 'Low': return '#9E9E9E'; // Gray
      default: return '#9E9E9E';
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        mb: 1,
        bgcolor: '#1a1a1a',
        borderColor: '#4A4A4A',
        borderLeft: `4px solid ${getSeverityColor(gap.gapType)}`,
      }}
    >
      <ListItem
        sx={{
          display: 'flex',
          alignItems: 'start',
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.02)' },
        }}
        onClick={onToggle}
      >
        <Box sx={{ flex: 1 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            {gap.gapType === 'NoSettings' ? (
              <ErrorIcon color="error" fontSize="small" />
            ) : (
              <WarningIcon color="warning" fontSize="small" />
            )}
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#90CAF9' }}>
              {gap.controlId}
            </Typography>
            <Chip
              label={gap.family}
              size="small"
              sx={{ fontSize: '0.7rem' }}
            />
            <Chip
              label={gap.priority}
              size="small"
              sx={{
                fontSize: '0.7rem',
                bgcolor: getPriorityColor(gap.priority),
                color: 'white',
                fontWeight: 'bold',
              }}
            />
            <Chip
              label={gap.gapType === 'NoSettings' ? 'No Settings' : 'Non-Compliant'}
              size="small"
              color={gap.gapType === 'NoSettings' ? 'error' : 'warning'}
              sx={{ fontSize: '0.7rem' }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {gap.controlTitle}
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AssignmentIcon />}
            onClick={(e) => {
              e.stopPropagation();
              onViewControl();
            }}
            sx={{ color: '#90CAF9', borderColor: '#90CAF9' }}
          >
            View Control
          </Button>
          <IconButton
            size="small"
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: '0.3s',
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Box>
      </ListItem>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ px: 2, pb: 2, bgcolor: 'rgba(0, 0, 0, 0.2)' }}>
          <Divider sx={{ my: 2, borderColor: '#4A4A4A' }} />

          {/* Recommended Actions */}
          <Typography variant="subtitle2" gutterBottom sx={{ color: '#E0E0E0' }}>
            Recommended Actions:
          </Typography>
          <List dense>
            {gap.recommendedActions.map((action, idx) => (
              <ListItem key={idx} sx={{ py: 0.5, pl: 0 }}>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
                      • {action}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>

          {/* Affected Policies */}
          {gap.affectedPolicies.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ color: '#E0E0E0' }}>
                Affected Policies:
              </Typography>
              {gap.affectedPolicies.map((policy, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 1.5, mb: 1, bgcolor: '#242424' }}>
                  <Typography variant="body2" fontWeight="medium" sx={{ color: '#90CAF9', mb: 1 }}>
                    {policy.policyName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#B0B0B0', display: 'block', mb: 1 }}>
                    Non-compliant settings:
                  </Typography>
                  {policy.nonCompliantSettings.map((setting, sIdx) => (
                    <Box key={sIdx} sx={{ pl: 2, mb: 0.5 }}>
                      <Typography variant="caption" sx={{ color: '#EF5350' }}>
                        ✗ {setting.settingName}: {String(setting.settingValue)}
                      </Typography>
                      {setting.validationMessage && (
                        <Typography variant="caption" display="block" sx={{ color: '#9E9E9E', pl: 2 }}>
                          {setting.validationMessage}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default M365GapAnalysis;
