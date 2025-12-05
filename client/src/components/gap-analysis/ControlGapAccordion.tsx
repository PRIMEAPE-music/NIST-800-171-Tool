import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  Button,
  Snackbar,
} from '@mui/material';
import {
  ExpandMore,
  Assessment as TechnicalIcon,
  PlayArrow as OperationalIcon,
  Description as DocumentationIcon,
  Business as PhysicalIcon,
  Policy as PolicyIcon,
  Settings as SettingsIcon,
  Assignment as ProcedureIcon,
  PictureAsPdf as EvidenceIcon,
} from '@mui/icons-material';
import { GapItemCheckboxList, GapItemData } from './GapItemCheckboxList';
import { POAMForm } from '../poam/POAMForm';
import { useQuery } from '@tanstack/react-query';

interface ControlGapAccordionProps {
  controlId: string; // String ID like "03.01.01"
  controlNumericId: number; // Numeric ID for API calls
  dodPoints: number; // DoD assessment points for priority calculation
  title: string; // Control title
}

interface EvidenceRequirement {
  id: number;
  evidenceType: string;
  name: string;
  description: string;
  rationale: string;
  frequency: string | null;
  freshnessThreshold: number | null;
  uploadedEvidence: Array<{
    id: number;
    fileName: string;
    uploadedAt: string;
    executionDate: string | null;
  }>;
}

interface ControlData {
  operationalActivities: string;
}

interface CoverageData {
  controlId: string;
  technicalCoverage: number;
  operationalCoverage: number;
  documentationCoverage: number;
  physicalCoverage: number;
  overallCoverage: number;
  breakdown: any;
}

interface M365Setting {
  id: string;
  displayName: string;
  settingId: string;
}

export const ControlGapAccordion: React.FC<ControlGapAccordionProps> = ({
  controlId,
  controlNumericId,
  dodPoints,
  title,
}) => {
  const [loading, setLoading] = useState(true);
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [requirements, setRequirements] = useState<EvidenceRequirement[]>([]);
  const [controlData, setControlData] = useState<ControlData | null>(null);
  const [missingSettings, setMissingSettings] = useState<M365Setting[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | false>(false);

  // Selection state for POAM creation
  const [selectedItems, setSelectedItems] = useState<Set<number | string>>(new Set());
  const [poamDialogOpen, setPoamDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Fetch controls for POAM form
  const { data: controlsData } = useQuery({
    queryKey: ['controls-list'],
    queryFn: async () => {
      const response = await fetch('/api/controls');
      if (!response.ok) throw new Error('Failed to fetch controls');
      const result = await response.json();
      return result.data; // Extract the data array from the response
    },
  });

  useEffect(() => {
    loadGapDetails();
  }, [controlId]);

  const loadGapDetails = async () => {
    setLoading(true);
    try {
      // Fetch coverage
      const coverageRes = await fetch(`/api/coverage/control/${controlId}`);
      const coverageData = await coverageRes.json();
      setCoverage(coverageData);

      // Fetch evidence requirements
      const requirementsRes = await fetch(`/api/evidence/requirements/${controlId}`);
      const requirementsData = await requirementsRes.json();
      setRequirements(requirementsData);

      // Fetch control data for operational activities
      const controlRes = await fetch(`/api/controls/control/${controlId}`);
      const controlResult = await controlRes.json();
      setControlData(controlResult.data || controlResult);

      // Fetch missing M365 settings (optional - may not exist for all controls)
      try {
        const settingsRes = await fetch(`/api/controls/${controlNumericId}/missing-settings`);
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setMissingSettings(settingsData);
        }
      } catch (error) {
        // Ignore - not all controls have M365 settings
        setMissingSettings([]);
      }
    } catch (error) {
      console.error('Error loading gap details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate fresh ness status for evidence
  const getFreshnessStatus = (
    req: EvidenceRequirement
  ): 'missing' | 'fresh' | 'aging' | 'stale' | 'critical' => {
    if (req.uploadedEvidence.length === 0) return 'missing';

    if (!req.freshnessThreshold) return 'fresh';

    const latest = req.uploadedEvidence[0];
    const referenceDate = latest.executionDate || latest.uploadedAt;
    const ageInDays = Math.floor(
      (Date.now() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (ageInDays <= req.freshnessThreshold) return 'fresh';
    if (ageInDays <= req.freshnessThreshold * 2) return 'aging';
    if (ageInDays <= req.freshnessThreshold * 3) return 'stale';
    return 'critical';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
        <Typography sx={{ ml: 2, color: '#B0B0B0' }}>
          Loading gap details...
        </Typography>
      </Box>
    );
  }

  if (!coverage || !controlData) {
    return (
      <Alert severity="error">
        Failed to load gap details. Please try again.
      </Alert>
    );
  }

  const operationalActivities = controlData.operationalActivities
    ? JSON.parse(controlData.operationalActivities)
    : [];

  // Group requirements by type
  const missingPolicies: GapItemData[] = requirements
    .filter((r) => r.evidenceType === 'policy' && r.uploadedEvidence.length === 0)
    .map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      rationale: r.rationale,
    }));

  const missingProcedures: GapItemData[] = requirements
    .filter((r) => r.evidenceType === 'procedure' && r.uploadedEvidence.length === 0)
    .map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      rationale: r.rationale,
    }));

  const missingEvidence: GapItemData[] = requirements
    .filter((r) => {
      if (r.evidenceType !== 'execution') return false;
      const status = getFreshnessStatus(r);
      return status !== 'fresh';
    })
    .map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      rationale: r.rationale,
      frequency: r.frequency || undefined,
      freshnessStatus: getFreshnessStatus(r),
    }));

  const missingSettingsData: GapItemData[] = missingSettings.map((s) => ({
    id: s.id,
    name: s.displayName,
    description: `Setting ID: ${s.settingId}`,
  }));

  const operationalActivitiesData: GapItemData[] = operationalActivities.map((activity: string, index: number) => ({
    id: `op-${index}`,
    name: activity,
  }));

  // Selection handlers
  const handleToggleItem = (itemId: number | string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleToggleAll = (itemIds: (number | string)[]) => {
    const newSelected = new Set(selectedItems);
    const allSelected = itemIds.every((id) => newSelected.has(id));

    if (allSelected) {
      // Deselect all
      itemIds.forEach((id) => newSelected.delete(id));
    } else {
      // Select all
      itemIds.forEach((id) => newSelected.add(id));
    }

    setSelectedItems(newSelected);
  };

  // Generate gap description from selected items
  const generateGapDescription = (): string => {
    const selectedPolicies = missingPolicies.filter((p) => selectedItems.has(p.id));
    const selectedProcedures = missingProcedures.filter((p) => selectedItems.has(p.id));
    const selectedEvidence = missingEvidence.filter((e) => selectedItems.has(e.id));
    const selectedSettings = missingSettingsData.filter((s) => selectedItems.has(s.id));
    const selectedActivities = operationalActivitiesData.filter((a) => selectedItems.has(a.id));

    let description = `Gap Analysis for Control ${controlId} - ${title}\n\n`;

    if (selectedPolicies.length > 0) {
      description += `Missing Policies (${selectedPolicies.length}):\n`;
      selectedPolicies.forEach((p) => {
        description += `- ${p.name}\n`;
        if (p.description) description += `  ${p.description}\n`;
      });
      description += '\n';
    }

    if (selectedProcedures.length > 0) {
      description += `Missing Procedures (${selectedProcedures.length}):\n`;
      selectedProcedures.forEach((p) => {
        description += `- ${p.name}\n`;
        if (p.description) description += `  ${p.description}\n`;
      });
      description += '\n';
    }

    if (selectedEvidence.length > 0) {
      description += `Missing/Stale Evidence (${selectedEvidence.length}):\n`;
      selectedEvidence.forEach((e) => {
        description += `- ${e.name} [${e.freshnessStatus}]\n`;
        if (e.description) description += `  ${e.description}\n`;
      });
      description += '\n';
    }

    if (selectedSettings.length > 0) {
      description += `Missing Settings (${selectedSettings.length}):\n`;
      selectedSettings.forEach((s) => {
        description += `- ${s.name}\n`;
      });
      description += '\n';
    }

    if (selectedActivities.length > 0) {
      description += `Required Operational Activities (${selectedActivities.length}):\n`;
      selectedActivities.forEach((a) => {
        description += `- ${a.name}\n`;
      });
    }

    return description.trim();
  };

  // Get priority based on DoD points
  const getPriorityFromDoDPoints = (points: number): string => {
    if (points === 5) return 'High';
    if (points === 3) return 'High';
    if (points === 1) return 'Medium';
    return 'Low';
  };

  // Handle Create POAM button click
  const handleCreatePOAM = () => {
    if (selectedItems.size === 0) return;
    // Pre-fill form data is generated when the button is clicked, not at render time
    setPoamDialogOpen(true);
  };

  // Handle POAM submission
  const handlePOAMSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/poams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create POAM');

      setSnackbarMessage('POAM created successfully!');
      setSnackbarOpen(true);
      setPoamDialogOpen(false);
      setSelectedItems(new Set()); // Clear selections
    } catch (error) {
      console.error('Error creating POAM:', error);
      setSnackbarMessage('Failed to create POAM. Please try again.');
      setSnackbarOpen(true);
    }
  };

  const getCoverageColor = (coverage: number): string => {
    if (coverage >= 90) return '#4caf50';
    if (coverage >= 70) return '#ff9800';
    if (coverage >= 50) return '#ff5722';
    return '#f44336';
  };

  const totalGaps =
    missingPolicies.length +
    missingProcedures.length +
    missingEvidence.length +
    missingSettingsData.length +
    operationalActivitiesData.length;

  const buttonText = selectedItems.size > 0
    ? `Create POAM (${selectedItems.size} items)`
    : 'Start POAM';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Coverage Breakdown Cards */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 2, color: '#B0B0B0', fontWeight: 600 }}>
          Coverage Breakdown
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#242424', height: '100%' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <TechnicalIcon sx={{ fontSize: 20, color: '#2196F3' }} />
                  <Typography variant="caption" color="text.secondary">
                    Technical
                  </Typography>
                </Box>
                <Typography
                  variant="h5"
                  sx={{ color: getCoverageColor(coverage.technicalCoverage), fontWeight: 600 }}
                >
                  {coverage.technicalCoverage}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#242424', height: '100%' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <OperationalIcon sx={{ fontSize: 20, color: '#FF9800' }} />
                  <Typography variant="caption" color="text.secondary">
                    Operational
                  </Typography>
                </Box>
                <Typography
                  variant="h5"
                  sx={{ color: getCoverageColor(coverage.operationalCoverage), fontWeight: 600 }}
                >
                  {coverage.operationalCoverage}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#242424', height: '100%' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <DocumentationIcon sx={{ fontSize: 20, color: '#4CAF50' }} />
                  <Typography variant="caption" color="text.secondary">
                    Documentation
                  </Typography>
                </Box>
                <Typography
                  variant="h5"
                  sx={{ color: getCoverageColor(coverage.documentationCoverage), fontWeight: 600 }}
                >
                  {coverage.documentationCoverage}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#242424', height: '100%' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <PhysicalIcon sx={{ fontSize: 20, color: '#9C27B0' }} />
                  <Typography variant="caption" color="text.secondary">
                    Physical
                  </Typography>
                </Box>
                <Typography
                  variant="h5"
                  sx={{ color: getCoverageColor(coverage.physicalCoverage), fontWeight: 600 }}
                >
                  {coverage.physicalCoverage}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Gap Details Section */}
      {totalGaps > 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ color: '#B0B0B0', fontWeight: 600 }}>
              Gap Details ({totalGaps} items)
            </Typography>
            <Button
              variant="contained"
              disabled={selectedItems.size === 0}
              onClick={handleCreatePOAM}
              sx={{
                bgcolor: selectedItems.size > 0 ? '#4caf50' : '#1976d2',
                '&:hover': {
                  bgcolor: selectedItems.size > 0 ? '#45a049' : '#1565c0',
                },
                '&.Mui-disabled': {
                  bgcolor: '#424242',
                  color: '#757575',
                },
              }}
            >
              {buttonText}
            </Button>
          </Box>

          {/* Sub-Accordions */}
          {missingPolicies.length > 0 && (
            <Accordion
              expanded={expandedSection === 'policies'}
              onChange={() => setExpandedSection(expandedSection === 'policies' ? false : 'policies')}
              sx={{ bgcolor: '#242424', mb: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                  <PolicyIcon sx={{ color: '#2196F3', fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 600 }}>Missing Policies</Typography>
                  <Chip
                    label={missingPolicies.length}
                    size="small"
                    sx={{ bgcolor: '#f44336', color: '#fff', fontWeight: 600 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <GapItemCheckboxList
                  items={missingPolicies}
                  selectedItems={selectedItems}
                  onToggleItem={handleToggleItem}
                  onToggleAll={handleToggleAll}
                />
              </AccordionDetails>
            </Accordion>
          )}

          {missingProcedures.length > 0 && (
            <Accordion
              expanded={expandedSection === 'procedures'}
              onChange={() => setExpandedSection(expandedSection === 'procedures' ? false : 'procedures')}
              sx={{ bgcolor: '#242424', mb: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                  <ProcedureIcon sx={{ color: '#4CAF50', fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 600 }}>Missing Procedures</Typography>
                  <Chip
                    label={missingProcedures.length}
                    size="small"
                    sx={{ bgcolor: '#f44336', color: '#fff', fontWeight: 600 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <GapItemCheckboxList
                  items={missingProcedures}
                  selectedItems={selectedItems}
                  onToggleItem={handleToggleItem}
                  onToggleAll={handleToggleAll}
                />
              </AccordionDetails>
            </Accordion>
          )}

          {missingEvidence.length > 0 && (
            <Accordion
              expanded={expandedSection === 'evidence'}
              onChange={() => setExpandedSection(expandedSection === 'evidence' ? false : 'evidence')}
              sx={{ bgcolor: '#242424', mb: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                  <EvidenceIcon sx={{ color: '#FF9800', fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 600 }}>Missing/Stale Evidence</Typography>
                  <Chip
                    label={missingEvidence.length}
                    size="small"
                    sx={{ bgcolor: '#f44336', color: '#fff', fontWeight: 600 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <GapItemCheckboxList
                  items={missingEvidence}
                  selectedItems={selectedItems}
                  onToggleItem={handleToggleItem}
                  onToggleAll={handleToggleAll}
                />
              </AccordionDetails>
            </Accordion>
          )}

          {missingSettingsData.length > 0 && (
            <Accordion
              expanded={expandedSection === 'settings'}
              onChange={() => setExpandedSection(expandedSection === 'settings' ? false : 'settings')}
              sx={{ bgcolor: '#242424', mb: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                  <SettingsIcon sx={{ color: '#9C27B0', fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 600 }}>Missing Settings</Typography>
                  <Chip
                    label={missingSettingsData.length}
                    size="small"
                    sx={{ bgcolor: '#f44336', color: '#fff', fontWeight: 600 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <GapItemCheckboxList
                  items={missingSettingsData}
                  selectedItems={selectedItems}
                  onToggleItem={handleToggleItem}
                  onToggleAll={handleToggleAll}
                />
              </AccordionDetails>
            </Accordion>
          )}

          {operationalActivitiesData.length > 0 && (
            <Accordion
              expanded={expandedSection === 'activities'}
              onChange={() => setExpandedSection(expandedSection === 'activities' ? false : 'activities')}
              sx={{ bgcolor: '#242424' }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                  <OperationalIcon sx={{ color: '#FF9800', fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 600 }}>Operational Activities</Typography>
                  <Chip
                    label={operationalActivitiesData.length}
                    size="small"
                    sx={{ bgcolor: '#1976d2', color: '#fff', fontWeight: 600 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <GapItemCheckboxList
                  items={operationalActivitiesData}
                  selectedItems={selectedItems}
                  onToggleItem={handleToggleItem}
                  onToggleAll={handleToggleAll}
                />
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      )}

      {totalGaps === 0 && (
        <Alert severity="success">
          <Typography variant="body2">
            <strong>Great job!</strong> This control has no identified gaps. All requirements are met.
          </Typography>
        </Alert>
      )}

      {/* POAM Form Dialog */}
      {controlsData && poamDialogOpen && (
        <POAMForm
          open={poamDialogOpen}
          onClose={() => setPoamDialogOpen(false)}
          onSubmit={handlePOAMSubmit}
          controls={controlsData}
          editPoam={
            poamDialogOpen
              ? ({
                  controlId: controlNumericId,
                  gapDescription: generateGapDescription(),
                  remediationPlan: 'Please provide a remediation plan for the identified gaps listed above.',
                  priority: getPriorityFromDoDPoints(dodPoints),
                  status: 'Open',
                  assignedTo: '',
                  startDate: null,
                  targetCompletionDate: null,
                  resourcesRequired: '',
                  budgetEstimate: null,
                } as any)
              : null
          }
        />
      )}

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};
