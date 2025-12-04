## 🎯 PHASE 6: Enhanced Evidence Library Page

### Step 6.1: Create Enhanced Evidence Library Page

📁 **File:** `client/src/pages/EvidenceLibrary.tsx`

🔄 **COMPLETE REWRITE:**

```typescript
import React, { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Button,
  Tabs,
  Tab,
  Paper,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Refresh as RefreshIcon,
  FileDownload as ExportIcon,
  Assessment as AnalyticsIcon,
  Link as LinkIcon,
  Folder as FolderIcon,
  Policy as PolicyIcon,
} from '@mui/icons-material';
import {
  useEvidence,
  useEvidenceStats,
  useEvidenceCoverage,
  useManualReviewEvidence,
  useDeleteEvidence,
  useArchiveEvidence,
  useUnarchiveEvidence,
} from '@/hooks/useEvidence';
import { EvidenceFilters as EvidenceFiltersType } from '@/types/evidence.types';
import { EvidenceCard } from '@/components/evidence/EvidenceCard';
import { EvidenceUploadDialog } from '@/components/evidence/EvidenceUploadDialog';
import { EvidenceDetailDialog } from '@/components/evidence/EvidenceDetailDialog';
import { EvidenceFilters } from '@/components/evidence/EvidenceFilters';
import { Evidence } from '@/types/evidence.types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const EvidenceLibrary: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [filters, setFilters] = useState<EvidenceFiltersType>({ isArchived: false });
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);

  // Queries
  const {
    data: evidence = [],
    isLoading: evidenceLoading,
    error: evidenceError,
    refetch: refetchEvidence,
  } = useEvidence(filters);

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useEvidenceStats();

  const {
    data: coverage = [],
    isLoading: coverageLoading,
  } = useEvidenceCoverage();

  const {
    data: manualReviewSummary,
    isLoading: manualReviewLoading,
  } = useManualReviewEvidence();

  // Mutations
  const deleteMutation = useDeleteEvidence();
  const archiveMutation = useArchiveEvidence();
  const unarchiveMutation = useUnarchiveEvidence();

  // Group evidence by family
  const evidenceByFamily = useMemo(() => {
    const grouped: Record<string, Evidence[]> = {};
    evidence.forEach((e) => {
      e.controlMappings.forEach((mapping) => {
        const family = mapping.control.family;
        if (!grouped[family]) grouped[family] = [];
        if (!grouped[family].find((ev) => ev.id === e.id)) {
          grouped[family].push(e);
        }
      });
    });
    return grouped;
  }, [evidence]);

  // Group evidence by control
  const evidenceByControl = useMemo(() => {
    const grouped: Record<string, Evidence[]> = {};
    evidence.forEach((e) => {
      e.controlMappings.forEach((mapping) => {
        const controlId = mapping.control.controlId;
        if (!grouped[controlId]) grouped[controlId] = [];
        grouped[controlId].push(e);
      });
    });
    return grouped;
  }, [evidence]);

  // Multi-control evidence
  const multiControlEvidence = useMemo(() => {
    return evidence.filter((e) => e.controlMappings.length > 1);
  }, [evidence]);

  const handleRefresh = () => {
    refetchEvidence();
    refetchStats();
  };

  const handleEdit = (evidence: Evidence) => {
    setSelectedEvidence(evidence);
    setDetailDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this evidence? This action cannot be undone.')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleArchive = async (id: number) => {
    await archiveMutation.mutateAsync({ id });
  };

  const handleUnarchive = async (id: number) => {
    await unarchiveMutation.mutateAsync(id);
  };

  const handleViewDetails = (evidence: Evidence) => {
    setSelectedEvidence(evidence);
    setDetailDialogOpen(true);
  };

  const handleClearFilters = () => {
    setFilters({ isArchived: false });
  };

  const handleUploadComplete = () => {
    refetchEvidence();
    refetchStats();
  };

  if (evidenceError) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">
          Failed to load evidence: {evidenceError.message}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 0.5 }}>
            Evidence Library
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage compliance documentation and evidence across all controls
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Upload Evidence
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      {stats && !statsLoading && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'primary.dark' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {stats.totalFiles}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Files
                    </Typography>
                  </Box>
                  <FolderIcon sx={{ fontSize: 40, opacity: 0.5 }} />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {(stats.totalSize / (1024 * 1024)).toFixed(2)} MB total size
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'success.dark' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {stats.controlsWithEvidence}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Controls Covered
                    </Typography>
                  </Box>
                  <AnalyticsIcon sx={{ fontSize: 40, opacity: 0.5 }} />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {stats.controlsWithoutEvidence} controls need evidence
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'info.dark' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {stats.multiControlEvidenceCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Multi-Control Evidence
                    </Typography>
                  </Box>
                  <LinkIcon sx={{ fontSize: 40, opacity: 0.5 }} />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Avg {stats.averageControlsPerEvidence.toFixed(1)} controls per file
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'warning.dark' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {stats.recentUploads}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Recent Uploads
                    </Typography>
                  </Box>
                  <UploadIcon sx={{ fontSize: 40, opacity: 0.5 }} />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Last 30 days
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <EvidenceFilters
          filters={filters}
          onFilterChange={setFilters}
          onClearFilters={handleClearFilters}
        />
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label={`All Evidence (${evidence.length})`} />
          <Tab label={`By Family (${Object.keys(evidenceByFamily).length})`} />
          <Tab label={`By Control (${Object.keys(evidenceByControl).length})`} />
          <Tab label={`Multi-Control (${multiControlEvidence.length})`} />
          <Tab label={`Manual Reviews (${manualReviewSummary?.reviewsWithEvidence || 0})`} />
        </Tabs>
      </Paper>

      {/* Tab Panels */}

      {/* All Evidence Tab */}
      <TabPanel value={tabValue} index={0}>
        {evidenceLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : evidence.length === 0 ? (
          <Paper sx={{ p: 8, textAlign: 'center' }}>
            <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No evidence files found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {filters.searchTerm || filters.family || filters.evidenceType
                ? 'Try adjusting your filters'
                : 'Upload your first evidence file to get started'}
            </Typography>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => setUploadDialogOpen(true)}
            >
              Upload Evidence
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {evidence.map((item) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                <EvidenceCard
                  evidence={item}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onArchive={handleArchive}
                  onUnarchive={handleUnarchive}
                  onViewDetails={handleViewDetails}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* By Family Tab */}
      <TabPanel value={tabValue} index={1}>
        {Object.keys(evidenceByFamily).length === 0 ? (
          <Paper sx={{ p: 8, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No evidence mapped to controls yet
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={3}>
            {Object.entries(evidenceByFamily)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([family, items]) => (
                <Paper key={family} sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">
                      {family} Family ({items.length} {items.length === 1 ? 'file' : 'files'})
                    </Typography>
                    <Chip label={family} color="primary" />
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    {items.map((item) => (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                        <EvidenceCard
                          evidence={item}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onArchive={handleArchive}
                          onUnarchive={handleUnarchive}
                          onViewDetails={handleViewDetails}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              ))}
          </Stack>
        )}
      </TabPanel>

      {/* By Control Tab */}
      <TabPanel value={tabValue} index={2}>
        {Object.keys(evidenceByControl).length === 0 ? (
          <Paper sx={{ p: 8, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No evidence mapped to controls yet
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={3}>
            {Object.entries(evidenceByControl)
              .sort(([a], [b]) => a.localeCompare(b))
              .slice(0, 20) // Show first 20 controls
              .map(([controlId, items]) => (
                <Paper key={controlId} sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                      <Typography variant="h6">{controlId}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {items[0].controlMappings.find(m => m.control.controlId === controlId)?.control.title}
                      </Typography>
                    </Box>
                    <Chip label={`${items.length} ${items.length === 1 ? 'file' : 'files'}`} color="primary" />
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    {items.map((item) => (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                        <EvidenceCard
                          evidence={item}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onArchive={handleArchive}
                          onUnarchive={handleUnarchive}
                          onViewDetails={handleViewDetails}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              ))}
            {Object.keys(evidenceByControl).length > 20 && (
              <Alert severity="info">
                Showing first 20 controls. Use filters to narrow down results.
              </Alert>
            )}
          </Stack>
        )}
      </TabPanel>

      {/* Multi-Control Evidence Tab */}
      <TabPanel value={tabValue} index={3}>
        {multiControlEvidence.length === 0 ? (
          <Paper sx={{ p: 8, textAlign: 'center' }}>
            <LinkIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No multi-control evidence yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Evidence files mapped to multiple controls will appear here
            </Typography>
          </Paper>
        ) : (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              These {multiControlEvidence.length} files are mapped to multiple controls, making them efficient evidence for compliance.
            </Alert>
            <Grid container spacing={3}>
              {multiControlEvidence.map((item) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                  <EvidenceCard
                    evidence={item}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onArchive={handleArchive}
                    onUnarchive={handleUnarchive}
                    onViewDetails={handleViewDetails}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </TabPanel>

      {/* Manual Reviews Tab */}
      <TabPanel value={tabValue} index={4}>
        {manualReviewLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : !manualReviewSummary || manualReviewSummary.evidenceFiles.length === 0 ? (
          <Paper sx={{ p: 8, textAlign: 'center' }}>
            <PolicyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No manual review evidence
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Evidence uploaded during M365 policy manual reviews will appear here
            </Typography>
          </Paper>
        ) : (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              {manualReviewSummary.totalReviews} manual reviews conducted,{' '}
              {manualReviewSummary.reviewsWithEvidence} have associated evidence files.
            </Alert>

            <Stack spacing={3}>
              {manualReviewSummary.evidenceFiles.map((file) => (
                <Paper key={file.id} sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                      <Typography variant="h6">{file.originalName}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {file.fileType} • {new Date(file.uploadedDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Chip label={`${file.reviews.length} ${file.reviews.length === 1 ? 'review' : 'reviews'}`} color="primary" />
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={1}>
                    {file.reviews.map((review) => (
                      <Paper key={review.id} variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2">
                          {review.setting.displayName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {review.setting.settingPath}
                        </Typography>
                        {review.control && (
                          <Box sx={{ mt: 1 }}>
                            <Chip
                              label={review.control.controlId}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        )}
                        {review.manualComplianceStatus && (
                          <Chip
                            label={review.manualComplianceStatus}
                            size="small"
                            color={
                              review.manualComplianceStatus === 'COMPLIANT'
                                ? 'success'
                                : review.manualComplianceStatus === 'NON_COMPLIANT'
                                ? 'error'
                                : 'warning'
                            }
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Paper>
                    ))}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        )}
      </TabPanel>

      {/* Upload Dialog */}
      <EvidenceUploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onUploadComplete={handleUploadComplete}
      />

      {/* Detail Dialog */}
      {selectedEvidence && (
        <EvidenceDetailDialog
          evidence={selectedEvidence}
          open={detailDialogOpen}
          onClose={() => {
            setDetailDialogOpen(false);
            setSelectedEvidence(null);
          }}
        />
      )}
    </Container>
  );
};
```

---

## 🎯 PHASE 7: Seed Evidence Templates

### Step 7.1: Create Evidence Template Seeder

📁 **NEW FILE:** `server/src/scripts/seed-evidence-templates.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EVIDENCE_TEMPLATES = [
  {
    name: 'Information Security Policy',
    description: 'Organization-wide information security policy document',
    evidenceType: 'policy',
    suggestedControls: [
      'AC.01.01', 'AC.01.02', 'AC.01.03', 'AC.02.01', 'AC.02.02',
      'AT.01.01', 'AU.01.01', 'CM.01.01', 'IA.01.01', 'MP.01.01',
      'PE.01.01', 'PS.01.01', 'SC.01.01', 'SI.01.01'
    ],
    keywords: ['information', 'security', 'policy', 'infosec', 'cybersecurity'],
    expectedFileTypes: ['pdf', 'docx'],
    defaultRelationship: 'primary',
  },
  {
    name: 'Access Control Policy',
    description: 'Policy governing user access to systems and data',
    evidenceType: 'policy',
    suggestedControls: [
      'AC.01.01', 'AC.01.02', 'AC.01.03', 'AC.02.01', 'AC.02.02',
      'AC.03.01', 'AC.03.02', 'AC.03.03', 'AC.03.04'
    ],
    keywords: ['access', 'control', 'authorization', 'permission', 'privilege'],
    expectedFileTypes: ['pdf', 'docx'],
    defaultRelationship: 'primary',
  },
  {
    name: 'Backup Procedure',
    description: 'Documented backup and recovery procedures',
    evidenceType: 'procedure',
    suggestedControls: [
      'CP.09.01', 'CP.09.02', 'CP.09.03', 'CP.09.04', 'CP.09.05'
    ],
    keywords: ['backup', 'restore', 'recovery', 'continuity'],
    expectedFileTypes: ['pdf', 'docx'],
    defaultRelationship: 'primary',
  },
  {
    name: 'Incident Response Plan',
    description: 'Procedures for responding to security incidents',
    evidenceType: 'procedure',
    suggestedControls: [
      'IR.01.01', 'IR.02.01', 'IR.02.02', 'IR.03.01', 'IR.03.02',
      'IR.04.01', 'IR.05.01', 'IR.06.01'
    ],
    keywords: ['incident', 'response', 'emergency', 'breach', 'compromise'],
    expectedFileTypes: ['pdf', 'docx'],
    defaultRelationship: 'primary',
  },
  {
    name: 'Security Awareness Training',
    description: 'Security awareness training materials and completion records',
    evidenceType: 'execution',
    suggestedControls: [
      'AT.02.01', 'AT.02.02', 'AT.03.01', 'AT.03.02', 'AT.03.03'
    ],
    keywords: ['training', 'awareness', 'education', 'phishing', 'security'],
    expectedFileTypes: ['pdf', 'docx', 'xlsx'],
    defaultRelationship: 'primary',
  },
  {
    name: 'Audit Log Review',
    description: 'Regular review of system audit logs',
    evidenceType: 'execution',
    suggestedControls: [
      'AU.02.01', 'AU.03.01', 'AU.06.01', 'AU.06.02', 'AU.06.03', 'AU.07.01'
    ],
    keywords: ['audit', 'log', 'review', 'monitoring', 'siem'],
    expectedFileTypes: ['pdf', 'xlsx', 'csv'],
    defaultRelationship: 'primary',
  },
  {
    name: 'Vulnerability Scan Results',
    description: 'Output from vulnerability scanning tools',
    evidenceType: 'report',
    suggestedControls: [
      'RA.03.01', 'RA.03.02', 'RA.05.01', 'RA.05.02', 'SI.02.01', 'SI.02.02'
    ],
    keywords: ['vulnerability', 'scan', 'assessment', 'nessus', 'qualys'],
    expectedFileTypes: ['pdf', 'csv', 'xlsx'],
    defaultRelationship: 'primary',
  },
  {
    name: 'Penetration Test Report',
    description: 'Results from penetration testing activities',
    evidenceType: 'report',
    suggestedControls: [
      'CA.02.01', 'CA.02.02', 'CA.08.01', 'RA.05.01'
    ],
    keywords: ['penetration', 'pentest', 'security', 'test', 'assessment'],
    expectedFileTypes: ['pdf', 'docx'],
    defaultRelationship: 'primary',
  },
  {
    name: 'Multi-Factor Authentication Configuration',
    description: 'Screenshots or configuration exports of MFA settings',
    evidenceType: 'screenshot',
    suggestedControls: [
      'IA.02.01', 'IA.02.02', 'IA.02.03', 'IA.02.04', 'IA.02.05', 'IA.02.06'
    ],
    keywords: ['mfa', 'multifactor', '2fa', 'authentication', 'verify'],
    expectedFileTypes: ['png', 'jpg', 'pdf'],
    defaultRelationship: 'primary',
  },
  {
    name: 'Encryption Configuration',
    description: 'Documentation of encryption settings and implementations',
    evidenceType: 'configuration',
    suggestedControls: [
      'SC.13.01', 'SC.28.01', 'MP.03.01', 'MP.05.01', 'MP.05.02'
    ],
    keywords: ['encryption', 'crypto', 'tls', 'ssl', 'bitlocker', 'aes'],
    expectedFileTypes: ['pdf', 'png', 'jpg'],
    defaultRelationship: 'primary',
  },
  {
    name: 'Firewall Rules Configuration',
    description: 'Firewall rule sets and boundary protection configurations',
    evidenceType: 'configuration',
    suggestedControls: [
      'SC.07.01', 'SC.07.02', 'SC.07.03', 'SC.07.04', 'SC.07.05'
    ],
    keywords: ['firewall', 'rules', 'boundary', 'protection', 'network'],
    expectedFileTypes: ['pdf', 'txt', 'csv'],
    defaultRelationship: 'primary',
  },
  {
    name: 'System Inventory',
    description: 'Complete inventory of information systems and components',
    evidenceType: 'report',
    suggestedControls: [
      'CM.08.01', 'CM.08.02', 'CM.08.03'
    ],
    keywords: ['inventory', 'asset', 'system', 'hardware', 'software'],
    expectedFileTypes: ['xlsx', 'csv', 'pdf'],
    defaultRelationship: 'primary',
  },
  {
    name: 'Change Management Records',
    description: 'Records of system changes and approvals',
    evidenceType: 'execution',
    suggestedControls: [
      'CM.03.01', 'CM.03.02', 'CM.03.03', 'CM.03.04', 'SA.10.01'
    ],
    keywords: ['change', 'management', 'approval', 'modification'],
    expectedFileTypes: ['pdf', 'docx', 'xlsx'],
    defaultRelationship: 'primary',
  },
  {
    name: 'Patch Management Report',
    description: 'Records of system patching and updates',
    evidenceType: 'execution',
    suggestedControls: [
      'SI.02.01', 'SI.02.02', 'SI.02.03', 'SI.02.04', 'SI.02.05'
    ],
    keywords: ['patch', 'update', 'remediation', 'vulnerability'],
    expectedFileTypes: ['pdf', 'xlsx', 'csv'],
    defaultRelationship: 'primary',
  },
  {
    name: 'Security Assessment Report',
    description: 'Independent security assessment findings',
    evidenceType: 'report',
    suggestedControls: [
      'CA.02.01', 'CA.02.02', 'CA.02.03', 'CA.07.01'
    ],
    keywords: ['assessment', 'audit', 'evaluation', 'compliance'],
    expectedFileTypes: ['pdf', 'docx'],
    defaultRelationship: 'primary',
  },
];

async function seedEvidenceTemplates() {
  console.log('🌱 Seeding evidence templates...\n');

  try {
    for (const template of EVIDENCE_TEMPLATES) {
      // Check if template already exists
      const existing = await prisma.evidenceTemplate.findUnique({
        where: { name: template.name },
      });

      if (existing) {
        console.log(`  ⏭️  Skipping "${template.name}" - already exists`);
        continue;
      }

      // Create template
      await prisma.evidenceTemplate.create({
        data: {
          ...template,
          suggestedControls: JSON.stringify(template.suggestedControls),
          keywords: JSON.stringify(template.keywords),
          expectedFileTypes: template.expectedFileTypes
            ? JSON.stringify(template.expectedFileTypes)
            : null,
        },
      });

      console.log(`  ✅ Created template: "${template.name}"`);
    }

    console.log('\n✅ Evidence templates seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding templates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeder
seedEvidenceTemplates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Run the seeder:
```bash
npx tsx src/scripts/seed-evidence-templates.ts
```

---

## 🎯 PHASE 8: Testing & Verification

### Step 8.1: Test Checklist

Create a test checklist to verify all functionality:

📁 **NEW FILE:** `EVIDENCE_TESTING_CHECKLIST.md`

```markdown
# Evidence Library Testing Checklist

## ✅ Database Schema
- [ ] Run Prisma migration successfully
- [ ] Verify new tables created: `evidence_control_mappings`, `evidence_templates`, `evidence_upload_sessions`
- [ ] Verify Evidence model updated with new fields
- [ ] Run migration script for existing evidence
- [ ] Verify all existing evidence migrated to new structure

## ✅ Backend API
- [ ] Test GET /api/evidence - returns all evidence
- [ ] Test GET /api/evidence/:id - returns single evidence
- [ ] Test GET /api/evidence/stats - returns statistics
- [ ] Test GET /api/evidence/coverage - returns coverage data
- [ ] Test GET /api/evidence/gaps - returns controls without evidence
- [ ] Test GET /api/evidence/manual-reviews - returns manual review summary
- [ ] Test GET /api/evidence/suggest-controls - returns suggestions
- [ ] Test POST /api/evidence/upload - uploads single file
- [ ] Test POST /api/evidence/bulk-upload - uploads multiple files
- [ ] Test POST /api/evidence/:id/mappings - adds control mapping
- [ ] Test PATCH /api/evidence/:id - updates evidence metadata
- [ ] Test PATCH /api/evidence/:id/mappings/:mappingId - updates mapping
- [ ] Test DELETE /api/evidence/:id - deletes evidence
- [ ] Test DELETE /api/evidence/:id/mappings/:mappingId - removes mapping
- [ ] Test POST /api/evidence/:id/archive - archives evidence
- [ ] Test POST /api/evidence/:id/unarchive - unarchives evidence

## ✅ Frontend Components

### EvidenceCard
- [ ] Displays file icon based on mime type
- [ ] Shows filename, size, and type
- [ ] Displays status chip with correct color
- [ ] Shows control mapping count
- [ ] Shows tags
- [ ] Context menu opens and closes
- [ ] Download action works
- [ ] Edit action triggers callback
- [ ] Delete action triggers callback
- [ ] Archive/unarchive actions work

### EvidenceUploadDialog
- [ ] Opens and closes properly
- [ ] Drag and drop works
- [ ] File picker works
- [ ] Multiple file selection works
- [ ] File list displays correctly
- [ ] Evidence type selection works
- [ ] Description input works
- [ ] Tag addition/removal works
- [ ] Auto-suggest toggle works
- [ ] Upload progress displays
- [ ] Success/error states display
- [ ] Bulk upload works for multiple files

### EvidenceDetailDialog
- [ ] Opens with correct evidence data
- [ ] Tabs switch correctly
- [ ] Details tab shows all metadata
- [ ] Edit mode works
- [ ] Controls tab shows mappings
- [ ] Verify mapping button works
- [ ] Remove mapping button works
- [ ] Manual reviews tab displays correctly
- [ ] Download button works

### EvidenceFilters
- [ ] Search input filters evidence
- [ ] Family filter works
- [ ] Evidence type filter works
- [ ] Status filter works
- [ ] Tags filter works
- [ ] Multi-control toggle works
- [ ] Archived toggle works
- [ ] Clear filters button works
- [ ] Filters persist across tabs

### EvidenceLibrary Page
- [ ] Page loads without errors
- [ ] Summary cards display correct data
- [ ] All tabs display correctly
- [ ] All Evidence tab shows all files
- [ ] By Family tab groups correctly
- [ ] By Control tab groups correctly
- [ ] Multi-Control tab filters correctly
- [ ] Manual Reviews tab displays correctly
- [ ] Upload button opens dialog
- [ ] Refresh button reloads data
- [ ] Export button (placeholder) works
- [ ] Empty states display correctly

## ✅ Feature Testing

### Multi-Control Mapping
- [ ] Upload evidence and map to multiple controls
- [ ] Verify evidence appears in all mapped control views
- [ ] Remove mapping from one control
- [ ] Verify evidence still appears in other controls
- [ ] Add new control mapping to existing evidence
- [ ] Verify multi-control count updates

### Smart Suggestions
- [ ] Upload file with "policy" in name
- [ ] Verify policy-related controls suggested
- [ ] Upload file with "backup" in name
- [ ] Verify backup-related controls suggested
- [ ] Upload file with "mfa" in name
- [ ] Verify authentication controls suggested

### Search and Filtering
- [ ] Search by filename
- [ ] Search by control ID
- [ ] Filter by family
- [ ] Filter by evidence type
- [ ] Filter by status
- [ ] Filter by tags
- [ ] Combine multiple filters
- [ ] Verify filter results are correct

### Evidence Analytics
- [ ] Total files count is accurate
- [ ] Total size calculation is correct
- [ ] Controls with evidence count is accurate
- [ ] Multi-control evidence count is correct
- [ ] Recent uploads (30 days) count is accurate
- [ ] By type breakdown is accurate
- [ ] By status breakdown is accurate
- [ ] By family breakdown is accurate

### Manual Review Integration
- [ ] Manual review evidence displays
- [ ] Links to reviews are correct
- [ ] Control associations display
- [ ] Compliance status displays

### Evidence Validation
- [ ] Upload approved evidence
- [ ] Verify status chip shows "approved"
- [ ] Mark evidence as under review
- [ ] Verify status updates
- [ ] Add review notes
- [ ] Verify notes display

### Archive Functionality
- [ ] Archive evidence
- [ ] Verify it disappears from active view
- [ ] Toggle archived filter
- [ ] Verify archived evidence appears
- [ ] Unarchive evidence
- [ ] Verify it returns to active view

## ✅ Edge Cases
- [ ] Upload file with no suggested controls
- [ ] Upload very large file (near 50MB limit)
- [ ] Upload file with special characters in name
- [ ] Map evidence to 20+ controls
- [ ] Delete evidence with multiple mappings
- [ ] Archive evidence with multiple mappings
- [ ] Upload same file twice
- [ ] Remove all mappings from evidence

## ✅ Performance
- [ ] Load 100+ evidence files
- [ ] Filter through large dataset
- [ ] Switch between tabs quickly
- [ ] Upload 10+ files simultaneously
- [ ] Verify no memory leaks

## ✅ Error Handling
- [ ] Upload file over size limit
- [ ] Upload unsupported file type
- [ ] Network error during upload
- [ ] Network error during delete
- [ ] Invalid control ID in mapping
- [ ] Malformed API response

## ✅ Integration
- [ ] Evidence appears in control detail pages
- [ ] Evidence gap report updates correctly
- [ ] Dashboard statistics reflect evidence data
- [ ] Manual review evidence links correctly
```

---

### Step 8.2: Update Package Dependencies

Ensure required packages are installed:

**Server:**
```bash
cd server
npm install uuid multer @types/multer
```

**Client:**
```bash
cd client
npm install react-dropzone
```

---

### Step 8.3: Run Complete Test

Create a comprehensive test script:

📁 **NEW FILE:** `TEST_EVIDENCE_LIBRARY.md`

```markdown
# Evidence Library Complete Test

## Prerequisites
1. Database migrated with new schema
2. Existing evidence migrated to new structure
3. Evidence templates seeded
4. Both server and client running

## Test Sequence

### 1. Fresh Start Test
1. Clear browser cache
2. Navigate to `/evidence`
3. Verify page loads without errors
4. Verify summary cards display zeros (if no evidence)
5. Verify empty state displays

### 2. Upload Single File Test
1. Click "Upload Evidence"
2. Select single PDF file named "Information-Security-Policy-2024.pdf"
3. Verify file appears in list
4. Verify suggested controls appear (AC.01.01, AC.01.02, etc.)
5. Select evidence type: "Policy"
6. Add description: "Annual information security policy review"
7. Add tags: "policy", "annual-review", "2024"
8. Click "Upload"
9. Verify upload progress
10. Verify success message
11. Verify dialog closes
12. Verify file appears in All Evidence tab
13. Verify summary cards updated

### 3. Multi-Control Mapping Test
1. Click on uploaded policy file
2. Verify detail dialog opens
3. Go to Controls tab
4. Verify suggested controls listed
5. Add 5 more control mappings manually
6. Verify mappings display
7. Close dialog
8. Switch to Multi-Control tab
9. Verify policy file appears
10. Verify control count badge shows correct number

### 4. Bulk Upload Test
1. Click "Upload Evidence"
2. Select 5 different files (mix of types)
3. Verify all 5 appear in list
4. Set default evidence type: "General"
5. Click "Upload"
6. Verify bulk upload progress
7. Verify success count
8. Verify all files appear in library

### 5. Filter Test
1. Open Advanced Filters
2. Select family: "AC"
3. Verify only AC-related evidence appears
4. Add evidence type filter: "Policy"
5. Verify results narrow down
6. Add tag filter: "annual-review"
7. Verify further filtering
8. Clear filters
9. Verify all evidence returns

### 6. Search Test
1. Type "policy" in search box
2. Verify only policy files appear
3. Type control ID "AC.01.01"
4. Verify only evidence mapped to AC.01.01 appears
5. Clear search
6. Verify all evidence returns

### 7. By Family Tab Test
1. Switch to "By Family" tab
2. Verify evidence grouped by families
3. Verify each group shows correct count
4. Verify evidence cards display within groups

### 8. By Control Tab Test
1. Switch to "By Control" tab
2. Verify evidence grouped by control IDs
3. Verify control titles display
4. Verify evidence counts correct

### 9. Manual Review Integration Test
1. Switch to "Manual Reviews" tab
2. If no data, note that it's expected
3. If manual reviews exist:
   - Verify evidence files display
   - Verify review associations show
   - Verify compliance status displays

### 10. Evidence Actions Test
1. Select an evidence file
2. Open context menu
3. Test Download
4. Test Edit (update description)
5. Test Archive
6. Verify file archived (disappears from view)
7. Toggle archived filter
8. Verify archived file appears
9. Test Unarchive
10. Verify file returns to active view

### 11. Delete Test
1. Select a test evidence file
2. Click Delete from context menu
3. Confirm deletion
4. Verify file deleted
5. Verify summary cards updated
6. Verify mappings removed from controls

### 12. Verification Workflow Test
1. Select evidence with multiple mappings
2. Open detail dialog
3. Go to Controls tab
4. Click "Verify" on first mapping
5. Verify verified badge appears
6. Repeat for other mappings
7. Close dialog
8. Verify verification persists

### 13. Statistics Test
1. Verify all summary card numbers match actual evidence
2. Check total files count
3. Check total size calculation
4. Check controls covered count
5. Check multi-control evidence count
6. Verify recent uploads count

### 14. Error Handling Test
1. Try uploading 60MB file (should fail)
2. Try uploading .exe file (should fail)
3. Simulate network error (disconnect)
4. Verify error messages display
5. Verify graceful recovery

### 15. Performance Test
1. Upload 20+ files in bulk
2. Verify page remains responsive
3. Switch between tabs quickly
4. Apply multiple filters
5. Search with partial matches
6. Verify no lag or freezing

## Success Criteria
✅ All tests pass without errors
✅ UI is responsive and intuitive
✅ Data persists correctly
✅ Filters work accurately
✅ Multi-control mapping functions properly
✅ Statistics are accurate
✅ Error handling is graceful
✅ Performance is acceptable

## Known Limitations
- Manual review evidence depends on M365 integration
- Bulk upload limited to 20 files
- File size limited to 50MB
- Some features require populated data to test fully
```

---

## 🎉 PHASE 9: Summary & Next Steps

### Congratulations! 🎊

You've now implemented a **comprehensive, production-ready evidence management system** with:

✅ **Multi-control evidence mapping** - One file can support many controls
✅ **Smart auto-suggestions** - AI-powered control recommendations
✅ **Advanced filtering** - Search by family, type, tags, status, and more
✅ **Evidence analytics** - Real-time statistics and coverage tracking
✅ **Bulk operations** - Upload multiple files simultaneously
✅ **Validation workflow** - Review, approve, and verify evidence
✅ **Manual review integration** - M365 policy evidence integration
✅ **Evidence templates** - Pre-configured suggestions for common evidence
✅ **Archive management** - Soft delete with archive/unarchive
✅ **Tag system** - Flexible categorization
✅ **Evidence requirements tracking** - Link to formal requirements
✅ **Version control** - Track evidence versions
✅ **Freshness monitoring** - Track execution evidence staleness (foundation)

---

### 📝 Post-Implementation Tasks

1. **Run all migrations:**
   ```bash
   cd server
   npx prisma migrate dev --name add_multi_control_evidence_mapping
   npx tsx src/scripts/migrate-existing-evidence.ts
   npx tsx src/scripts/seed-evidence-templates.ts
   ```

2. **Install dependencies:**
   ```bash
   # Server
   cd server
   npm install uuid multer @types/multer
   
   # Client
   cd client
   npm install react-dropzone
   ```

3. **Test thoroughly** using the testing checklist

4. **Optional enhancements:**
   - Add evidence export functionality (PDF/ZIP packages)
   - Implement evidence comparison/diff
   - Add evidence approval workflows
   - Create evidence matrix report
   - Add OCR for uploaded documents
   - Implement evidence versioning UI
   - Add evidence reminders for execution evidence
   - Create evidence dashboard widget

---

### 🚀 What You Can Do Now

1. **Upload evidence** to multiple controls efficiently
2. **Track compliance** through evidence coverage metrics
3. **Automate suggestions** using smart templates
4. **Organize evidence** with tags and filters
5. **Integrate M365** policy review evidence
6. **Generate reports** on evidence coverage
7. **Manage lifecycle** with archive functionality
8. **Verify evidence** through validation workflow

---

### 📚 Additional Features to Consider

**Phase 10 (Future):**
- Evidence expiration alerts
- Automated evidence collection from systems
- Evidence quality scoring
- Evidence dependency mapping
- Evidence sharing between controls
- Evidence audit trail
- Evidence compliance reports
- Integration with POAM system
- Evidence-based risk scoring

