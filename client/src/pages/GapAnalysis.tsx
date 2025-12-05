import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Warning, CheckCircle, Error } from '@mui/icons-material';
import { AllControlsTable } from '@/components/gap-analysis/AllControlsTable';
import { ControlCoverageWithMetadata } from '@/types/gapAnalysis.types';

interface CoverageSummary {
  totalControls: number;
  averages: {
    technical: number;
    operational: number;
    documentation: number;
    physical: number;
    overall: number;
  };
  criticalControls: number;
  compliantControls: number;
}

interface ControlCoverage {
  controlId: string;
  technicalCoverage: number;
  operationalCoverage: number;
  documentationCoverage: number;
  physicalCoverage: number;
  overallCoverage: number;
}

interface FamilyCoverage {
  family: string;
  controlCount: number;
  averageCoverage: number;
}

const FAMILY_NAMES: Record<string, string> = {
  AC: 'Access Control',
  AT: 'Awareness and Training',
  AU: 'Audit and Accountability',
  CA: 'Assessment, Authorization, and Monitoring',
  CM: 'Configuration Management',
  IA: 'Identification and Authentication',
  IR: 'Incident Response',
  MA: 'Maintenance',
  MP: 'Media Protection',
  PE: 'Physical and Environmental Protection',
  PL: 'Planning',
  PS: 'Personnel Security',
  RA: 'Risk Assessment',
  SA: 'System and Services Acquisition',
  SC: 'System and Communications Protection',
  SI: 'System and Information Integrity',
  SR: 'Supply Chain Risk Management',
};

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function GapAnalysis() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [summary, setSummary] = useState<CoverageSummary | null>(null);
  const [allCoverages, setAllCoverages] = useState<ControlCoverage[]>([]);
  const [allCoveragesWithMetadata, setAllCoveragesWithMetadata] = useState<ControlCoverageWithMetadata[]>([]);
  const [familyCoverages, setFamilyCoverages] = useState<FamilyCoverage[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch summary
      const summaryRes = await fetch('/api/coverage/summary');
      const summaryData = await summaryRes.json();
      setSummary(summaryData);

      // Fetch all coverages (basic)
      const allRes = await fetch('/api/coverage/all');
      const allData = await allRes.json();
      setAllCoverages(allData);

      // Fetch all coverages with metadata (for All Controls tab)
      const allMetadataRes = await fetch('/api/coverage/all-with-metadata');
      const allMetadataData = await allMetadataRes.json();
      setAllCoveragesWithMetadata(allMetadataData);

      // Calculate family averages
      const familyMap = new Map<string, { total: number; count: number }>();
      allData.forEach((cov: ControlCoverage) => {
        const family = cov.controlId.substring(3, 5);
        const existing = familyMap.get(family) || { total: 0, count: 0 };
        familyMap.set(family, {
          total: existing.total + cov.overallCoverage,
          count: existing.count + 1,
        });
      });

      const famCov: FamilyCoverage[] = Array.from(familyMap.entries()).map(
        ([family, data]) => ({
          family,
          controlCount: data.count,
          averageCoverage: Math.round((data.total / data.count) * 100) / 100,
        })
      );

      setFamilyCoverages(famCov.sort((a, b) => a.family.localeCompare(b.family)));
    } catch (error) {
      console.error('Error loading gap analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 90) return '#4caf50';
    if (coverage >= 70) return '#ff9800';
    if (coverage >= 50) return '#ff5722';
    return '#f44336';
  };

  const getCoverageIcon = (coverage: number) => {
    if (coverage >= 90) return <CheckCircle sx={{ color: '#4caf50' }} />;
    if (coverage >= 50) return <Warning sx={{ color: '#ff9800' }} />;
    return <Error sx={{ color: '#f44336' }} />;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!summary) {
    return <Typography>Error loading gap analysis data</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        Gap Analysis Dashboard
      </Typography>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={2.4}>
          <Card sx={{ bgcolor: '#1E1E1E', height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Overall Coverage
              </Typography>
              <Typography variant="h3" sx={{ color: getCoverageColor(summary.averages.overall) }}>
                {summary.averages.overall}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2.4}>
          <Card sx={{ bgcolor: '#1E1E1E', height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Technical
              </Typography>
              <Typography variant="h4" sx={{ color: getCoverageColor(summary.averages.technical) }}>
                {summary.averages.technical}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2.4}>
          <Card sx={{ bgcolor: '#1E1E1E', height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Operational
              </Typography>
              <Typography variant="h4" sx={{ color: getCoverageColor(summary.averages.operational) }}>
                {summary.averages.operational}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2.4}>
          <Card sx={{ bgcolor: '#1E1E1E', height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Documentation
              </Typography>
              <Typography variant="h4" sx={{ color: getCoverageColor(summary.averages.documentation) }}>
                {summary.averages.documentation}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2.4}>
          <Card sx={{ bgcolor: '#1E1E1E', height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Physical
              </Typography>
              <Typography variant="h4" sx={{ color: getCoverageColor(summary.averages.physical) }}>
                {summary.averages.physical}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Overview" />
        <Tab label="By Control Family" />
        <Tab label="All Controls" />
      </Tabs>

      {/* Tab 0: Overview */}
      {tab === 0 && (
        <Grid container spacing={3}>
          {/* Coverage Type Breakdown */}
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#1E1E1E' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Coverage Type Breakdown
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      { name: 'Technical', value: summary.averages.technical },
                      { name: 'Operational', value: summary.averages.operational },
                      { name: 'Documentation', value: summary.averages.documentation },
                      { name: 'Physical', value: summary.averages.physical },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#fff" />
                    <YAxis stroke="#fff" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#2C2C2C', border: 'none' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="value" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Control Status Distribution */}
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#1E1E1E' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Control Status Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Compliant (≥90%)', value: summary.compliantControls },
                        {
                          name: 'Moderate (50-89%)',
                          value:
                            summary.totalControls -
                            summary.compliantControls -
                            summary.criticalControls,
                        },
                        { name: 'Critical (<50%)', value: summary.criticalControls },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2].map((index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#2C2C2C', border: 'none' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: By Control Family */}
      {tab === 1 && (
        <Card sx={{ bgcolor: '#1E1E1E' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Coverage by Control Family
            </Typography>
            <TableContainer component={Paper} sx={{ bgcolor: '#242424' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Family</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell align="center">Controls</TableCell>
                    <TableCell align="center">Average Coverage</TableCell>
                    <TableCell>Progress</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {familyCoverages.map((fam) => (
                    <TableRow key={fam.family}>
                      <TableCell>
                        <Chip label={fam.family} size="small" />
                      </TableCell>
                      <TableCell>{FAMILY_NAMES[fam.family] || fam.family}</TableCell>
                      <TableCell align="center">{fam.controlCount}</TableCell>
                      <TableCell align="center">
                        <Typography sx={{ color: getCoverageColor(fam.averageCoverage) }}>
                          {fam.averageCoverage}%
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <LinearProgress
                            variant="determinate"
                            value={fam.averageCoverage}
                            sx={{
                              width: '200px',
                              height: 8,
                              borderRadius: 4,
                              bgcolor: '#333',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: getCoverageColor(fam.averageCoverage),
                              },
                            }}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: All Controls */}
      {tab === 2 && (
        <Card sx={{ bgcolor: '#1E1E1E' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              All Controls
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: '#B0B0B0' }}>
              View and manage gap analysis for all controls. Click on a control to expand details, or click the control ID to navigate to the detail page.
            </Typography>
            <AllControlsTable controls={allCoveragesWithMetadata} loading={loading} />
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
