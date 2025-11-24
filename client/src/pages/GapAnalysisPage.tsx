import React, { useState, useEffect, useCallback } from 'react';
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
  Drawer,
  Fab,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  CheckCircle as CompleteIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { controlService } from '@/services/controlService';
import { ControlFilters } from '@/components/controls/ControlFilters';
import { ControlTable } from '@/components/controls/ControlTable';
import M365SettingsTab from '@/components/M365Settings/M365SettingsTab';
import M365ActionsTab from '@/components/controls/M365ActionsTab';
import { usePreferences } from '@/hooks/usePreferences';

// --- Types for Gap Analysis Dashboard ---
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

// --- Types for Control Library (All Controls Tab) ---
interface FilterState {
  families: string[];
  statuses: string[];
  priorities: string[];
  search: string;
}

// --- Helper Components ---
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index} role="tabpanel" style={{ height: '100%' }}>
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

export const GapAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { preferences } = usePreferences();
  const [activeTab, setActiveTab] = useState<number>(0);

  // --- Dashboard State ---
  const [expandedGaps, setExpandedGaps] = useState<Set<string>>(new Set());
  const [dashboardSubTab, setDashboardSubTab] = useState<number>(0);

  // --- All Controls Tab State ---
  const [searchInput, setSearchInput] = useState<string>('');
  const [filters, setFilters] = useState<FilterState>({
    families: [],
    statuses: [],
    priorities: [],
    search: '',
  });
  const [sortBy, setSortBy] = useState<string>('controlId');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState<number>(1);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState<boolean>(false);
  const [selectedControls, setSelectedControls] = useState<number[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState<number>(preferences.itemsPerPage);

  useEffect(() => {
    setItemsPerPage(preferences.itemsPerPage);
  }, [preferences.itemsPerPage]);

  // --- Queries ---

  // 1. Dashboard Data
  const { data: analysis, isLoading: isLoadingAnalysis, error: analysisError } = useQuery({
    queryKey: ['m365-gap-analysis'],
    queryFn: fetchGapAnalysis,
  });

  // 2. All Controls Data (Only fetch if tab is active)
  const { data: controlsData, isLoading: isLoadingControls, refetch: refetchControls } = useQuery({
    queryKey: ['controls', filters.families, filters.statuses, filters.priorities, filters.search, sortBy, sortOrder, page, itemsPerPage],
    queryFn: () =>
      controlService.getAllControls({
        family: filters.families.join(',') || undefined,
        status: filters.statuses.join(',') || undefined,
        priority: filters.priorities.join(',') || undefined,
        search: filters.search || undefined,
        sortBy,
        sortOrder,
        page,
        limit: itemsPerPage,
      }),
    enabled: activeTab === 1, // Only fetch when All Controls tab is active
  });

  // --- Handlers ---

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

  // Control Table Handlers
  const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
    setSelectedControls([]);
  }, []);

  const handleSortChange = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedControls(controlsData?.data.map((c) => c.id) || []);
    } else {
      setSelectedControls([]);
    }
  };

  const handleSelectOne = (controlId: number, checked: boolean) => {
    if (checked) {
      setSelectedControls((prev) => [...prev, controlId]);
    } else {
      setSelectedControls((prev) => prev.filter((id) => id !== controlId));
    }
  };

  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    setFilters({
      families: [],
      statuses: [],
      priorities: [],
      search: '',
    });
    setPage(1);
    setSelectedControls([]);
  }, []);

  // --- Derived Data for Dashboard ---
  const noSettingsGaps = analysis?.gaps.filter((g) => g.gapType === 'NoSettings') || [];
  const nonCompliantGaps = analysis?.gaps.filter((g) => g.gapType === 'NonCompliantSettings') || [];
  const gapsByFamily = analysis?.gaps.reduce((acc, gap) => {
    if (!acc[gap.family]) {
      acc[gap.family] = [];
    }
    acc[gap.family].push(gap);
    return acc;
  }, {} as Record<string, ControlGap[]>) || {};

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Gap Analysis
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive view of compliance gaps, controls, settings, and improvement actions.
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

      {/* Main Tabs */}
      <Paper sx={{ backgroundColor: '#242424', mb: 3 }}>
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
          <Tab label="Dashboard" />
          <Tab label="All Controls" />
          <Tab label="All Policy Settings" />
          <Tab label="All Improvement Actions" />
        </Tabs>
      </Paper>

      {/* TAB 0: DASHBOARD */}
      <TabPanel value={activeTab} index={0}>
        {isLoadingAnalysis ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : analysisError || !analysis ? (
          <Alert severity="error">Failed to load gap analysis dashboard.</Alert>
        ) : (
          <Box>
            {/* Summary Statistics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ bgcolor: '#1a1a1a', borderLeft: '4px solid #66BB6A' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="caption" color="text.secondary">Fully Covered</Typography>
                        <Typography variant="h4" color="success.main">{analysis.controlsFullyCovered}</Typography>
                      </Box>
                      <CompleteIcon sx={{ fontSize: 40, color: '#66BB6A', opacity: 0.5 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ bgcolor: '#1a1a1a', borderLeft: '4px solid #FFA726' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="caption" color="text.secondary">Partially Covered</Typography>
                        <Typography variant="h4" color="warning.main">{analysis.controlsPartiallyCovered}</Typography>
                      </Box>
                      <WarningIcon sx={{ fontSize: 40, color: '#FFA726', opacity: 0.5 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ bgcolor: '#1a1a1a', borderLeft: '4px solid #EF5350' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="caption" color="text.secondary">Not Covered</Typography>
                        <Typography variant="h4" color="error.main">{analysis.controlsNotCovered}</Typography>
                      </Box>
                      <ErrorIcon sx={{ fontSize: 40, color: '#EF5350', opacity: 0.5 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ bgcolor: '#1a1a1a', borderLeft: '4px solid #42A5F5' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="caption" color="text.secondary">Coverage %</Typography>
                        <Typography variant="h4" color="info.main">{Math.round(analysis.coveragePercentage)}%</Typography>
                      </Box>
                      <TrendingUpIcon sx={{ fontSize: 40, color: '#42A5F5', opacity: 0.5 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Dashboard Sub-Tabs */}
            <Paper sx={{ backgroundColor: '#242424' }}>
              <Tabs
                value={dashboardSubTab}
                onChange={(_e, newValue) => setDashboardSubTab(newValue)}
                sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { color: '#B0B0B0' }, '& .Mui-selected': { color: '#90CAF9' }, '& .MuiTabs-indicator': { backgroundColor: '#90CAF9' } }}
              >
                <Tab label={`All Gaps (${analysis.gaps.length})`} />
                <Tab label={`No Settings (${noSettingsGaps.length})`} />
                <Tab label={`Non-Compliant (${nonCompliantGaps.length})`} />
                <Tab label="By Family" />
              </Tabs>

              <TabPanel value={dashboardSubTab} index={0}>
                <Box sx={{ px: 3 }}>
                  {analysis.gaps.length === 0 ? (
                    <Alert severity="success" icon={<CompleteIcon />}>Excellent! No gaps found.</Alert>
                  ) : (
                    <List>
                      {analysis.gaps.map((gap) => (
                        <GapCard key={gap.controlId} gap={gap} expanded={expandedGaps.has(gap.controlId)} onToggle={() => toggleGap(gap.controlId)} onViewControl={() => navigate(`/controls/${gap.id}`)} />
                      ))}
                    </List>
                  )}
                </Box>
              </TabPanel>

              <TabPanel value={dashboardSubTab} index={1}>
                <Box sx={{ px: 3 }}>
                  {noSettingsGaps.length === 0 ? (
                    <Alert severity="info">All controls have settings mapped.</Alert>
                  ) : (
                    <List>
                      {noSettingsGaps.map((gap) => (
                        <GapCard key={gap.controlId} gap={gap} expanded={expandedGaps.has(gap.controlId)} onToggle={() => toggleGap(gap.controlId)} onViewControl={() => navigate(`/controls/${gap.id}`)} />
                      ))}
                    </List>
                  )}
                </Box>
              </TabPanel>

              <TabPanel value={dashboardSubTab} index={2}>
                <Box sx={{ px: 3 }}>
                  {nonCompliantGaps.length === 0 ? (
                    <Alert severity="success">All mapped settings are compliant!</Alert>
                  ) : (
                    <List>
                      {nonCompliantGaps.map((gap) => (
                        <GapCard key={gap.controlId} gap={gap} expanded={expandedGaps.has(gap.controlId)} onToggle={() => toggleGap(gap.controlId)} onViewControl={() => navigate(`/controls/${gap.id}`)} />
                      ))}
                    </List>
                  )}
                </Box>
              </TabPanel>

              <TabPanel value={dashboardSubTab} index={3}>
                <Box sx={{ px: 3 }}>
                  {Object.entries(gapsByFamily).sort(([a], [b]) => a.localeCompare(b)).map(([family, gaps]) => (
                    <Box key={family} sx={{ mb: 3 }}>
                      <Typography variant="h6" gutterBottom sx={{ color: '#90CAF9' }}>{family} Family ({gaps.length} gaps)</Typography>
                      <List>
                        {gaps.map((gap) => (
                          <GapCard key={gap.controlId} gap={gap} expanded={expandedGaps.has(gap.controlId)} onToggle={() => toggleGap(gap.controlId)} onViewControl={() => navigate(`/controls/${gap.id}`)} />
                        ))}
                      </List>
                    </Box>
                  ))}
                </Box>
              </TabPanel>
            </Paper>
          </Box>
        )}
      </TabPanel>

      {/* TAB 1: ALL CONTROLS */}
      <TabPanel value={activeTab} index={1}>
        {/* Search Bar */}
        <Box sx={{ mb: 3 }}>
          <input
            type="text"
            placeholder="Search controls... (Press Enter to search)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleFilterChange({ search: searchInput });
              }
            }}
            onBlur={() => {
              if (searchInput !== filters.search) {
                handleFilterChange({ search: searchInput });
              }
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              color: '#E0E0E0',
              backgroundColor: '#2A2A2A',
              border: '1px solid #4A4A4A',
              borderRadius: '8px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Filters Sidebar - Desktop */}
          <Paper
            sx={{
              width: 280,
              flexShrink: 0,
              p: 2,
              display: { xs: 'none', md: 'block' },
              backgroundColor: '#242424',
              maxHeight: 'calc(100vh - 300px)',
              overflowY: 'auto',
            }}
          >
            <ControlFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
            />
          </Paper>

          {/* Filters Drawer - Mobile */}
          <Drawer
            anchor="left"
            open={filterDrawerOpen}
            onClose={() => setFilterDrawerOpen(false)}
            sx={{ display: { xs: 'block', md: 'none' } }}
            PaperProps={{ sx: { backgroundColor: '#242424', color: '#E0E0E0' } }}
          >
            <Box sx={{ width: 280, p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#E0E0E0' }}>Filters</Typography>
                <IconButton size="small" onClick={() => setFilterDrawerOpen(false)} sx={{ color: '#B0B0B0' }}><CloseIcon /></IconButton>
              </Box>
              <ControlFilters filters={filters} onFilterChange={handleFilterChange} onClearFilters={handleClearFilters} />
            </Box>
          </Drawer>

          {/* Main Table */}
          <Box sx={{ flexGrow: 1 }}>
            {isLoadingControls && !controlsData ? (
              <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
            ) : (
              <ControlTable
                controls={controlsData?.data || []}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
                selectedControls={selectedControls}
                onSelectAll={handleSelectAll}
                onSelectOne={handleSelectOne}
                page={page}
                totalPages={controlsData?.pagination.totalPages || 1}
                onPageChange={setPage}
                onRefresh={refetchControls}
              />
            )}
          </Box>
        </Box>

        {/* Floating action button for filters on mobile */}
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16, display: { xs: 'flex', md: 'none' } }}
          onClick={() => setFilterDrawerOpen(true)}
        >
          <FilterIcon />
        </Fab>
      </TabPanel>

      {/* TAB 2: ALL POLICY SETTINGS */}
      <TabPanel value={activeTab} index={2}>
        <M365SettingsTab />
      </TabPanel>

      {/* TAB 3: ALL IMPROVEMENT ACTIONS */}
      <TabPanel value={activeTab} index={3}>
        <M365ActionsTab />
      </TabPanel>
    </Container>
  );
};

// --- GapCard Component (Preserved) ---
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
      case 'Critical': return '#EF5350';
      case 'High': return '#FF9800';
      case 'Medium': return '#FFC107';
      case 'Low': return '#9E9E9E';
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
            {gap.gapType === 'NoSettings' ? <ErrorIcon color="error" fontSize="small" /> : <WarningIcon color="warning" fontSize="small" />}
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#90CAF9' }}>{gap.controlId}</Typography>
            <Chip label={gap.family} size="small" sx={{ fontSize: '0.7rem' }} />
            <Chip label={gap.priority} size="small" sx={{ fontSize: '0.7rem', bgcolor: getPriorityColor(gap.priority), color: 'white', fontWeight: 'bold' }} />
            <Chip label={gap.gapType === 'NoSettings' ? 'No Settings' : 'Non-Compliant'} size="small" color={gap.gapType === 'NoSettings' ? 'error' : 'warning'} sx={{ fontSize: '0.7rem' }} />
          </Box>
          <Typography variant="body2" color="text.secondary">{gap.controlTitle}</Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          <Button size="small" variant="outlined" startIcon={<AssignmentIcon />} onClick={(e) => { e.stopPropagation(); onViewControl(); }} sx={{ color: '#90CAF9', borderColor: '#90CAF9' }}>View Control</Button>
          <IconButton size="small" sx={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }}><ExpandMoreIcon /></IconButton>
        </Box>
      </ListItem>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ px: 2, pb: 2, bgcolor: 'rgba(0, 0, 0, 0.2)' }}>
          <Divider sx={{ my: 2, borderColor: '#4A4A4A' }} />
          <Typography variant="subtitle2" gutterBottom sx={{ color: '#E0E0E0' }}>Recommended Actions:</Typography>
          <List dense>
            {gap.recommendedActions.map((action, idx) => (
              <ListItem key={idx} sx={{ py: 0.5, pl: 0 }}>
                <ListItemText primary={<Typography variant="body2" sx={{ color: '#B0B0B0' }}>• {action}</Typography>} />
              </ListItem>
            ))}
          </List>
          {gap.affectedPolicies.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ color: '#E0E0E0' }}>Affected Policies:</Typography>
              {gap.affectedPolicies.map((policy, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 1.5, mb: 1, bgcolor: '#242424' }}>
                  <Typography variant="body2" fontWeight="medium" sx={{ color: '#90CAF9', mb: 1 }}>{policy.policyName}</Typography>
                  <Typography variant="caption" sx={{ color: '#B0B0B0', display: 'block', mb: 1 }}>Non-compliant settings:</Typography>
                  {policy.nonCompliantSettings.map((setting, sIdx) => (
                    <Box key={sIdx} sx={{ pl: 2, mb: 0.5 }}>
                      <Typography variant="caption" sx={{ color: '#EF5350' }}>✗ {setting.settingName}: {String(setting.settingValue)}</Typography>
                      {setting.validationMessage && <Typography variant="caption" display="block" sx={{ color: '#9E9E9E', pl: 2 }}>{setting.validationMessage}</Typography>}
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

export default GapAnalysisPage;
