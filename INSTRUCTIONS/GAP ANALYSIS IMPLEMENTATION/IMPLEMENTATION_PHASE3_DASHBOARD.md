# PHASE 3: GAP ANALYSIS DASHBOARD UI

## OVERVIEW

Build comprehensive dashboard with:
- Coverage overview cards
- Control family breakdown
- Action type distribution
- Critical controls list
- Interactive charts and visualizations

**Prerequisites:** Phase 1 & 2 complete

---

## Step 3A: Install Chart Library

```bash
cd client
npm install recharts
npm install @types/recharts --save-dev
```

---

## Step 3B: Create Dashboard Page

📁 **File:** `client/src/pages/GapAnalysis.tsx`

🔄 **COMPLETE FILE:**
```typescript
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

      // Fetch all coverages
      const allRes = await fetch('/api/coverage/all');
      const allData = await allRes.json();
      setAllCoverages(allData);

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
        <Tab label="Critical Controls" />
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

      {/* Tab 2: Critical Controls */}
      {tab === 2 && (
        <Card sx={{ bgcolor: '#1E1E1E' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Critical Controls (Coverage &lt; 50%)
            </Typography>
            <TableContainer component={Paper} sx={{ bgcolor: '#242424' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Control ID</TableCell>
                    <TableCell>Overall</TableCell>
                    <TableCell>Technical</TableCell>
                    <TableCell>Operational</TableCell>
                    <TableCell>Documentation</TableCell>
                    <TableCell>Physical</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allCoverages
                    .filter((c) => c.overallCoverage < 50)
                    .sort((a, b) => a.overallCoverage - b.overallCoverage)
                    .map((cov) => (
                      <TableRow key={cov.controlId}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getCoverageIcon(cov.overallCoverage)}
                            {cov.controlId}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ color: getCoverageColor(cov.overallCoverage) }}>
                            {cov.overallCoverage}%
                          </Typography>
                        </TableCell>
                        <TableCell>{cov.technicalCoverage}%</TableCell>
                        <TableCell>{cov.operationalCoverage}%</TableCell>
                        <TableCell>{cov.documentationCoverage}%</TableCell>
                        <TableCell>{cov.physicalCoverage}%</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
```

---

## Step 3C: Add Route to App

📁 **File:** `client/src/App.tsx`

🔍 **FIND:**
```typescript
import Controls from './pages/Controls';
import Dashboard from './pages/Dashboard';
```

✏️ **ADD:**
```typescript
import GapAnalysis from './pages/GapAnalysis';
```

🔍 **FIND the Routes section:**

➕ **ADD route:**
```typescript
<Route path="/gap-analysis" element={<GapAnalysis />} />
```

---

## Step 3D: Add Navigation Link

📁 **File:** `client/src/components/Layout.tsx` (or wherever your nav is)

➕ **ADD navigation item:**
```typescript
<ListItemButton component={Link} to="/gap-analysis">
  <ListItemIcon>
    <Assessment />
  </ListItemIcon>
  <ListItemText primary="Gap Analysis" />
</ListItemButton>
```

Don't forget to import Assessment icon:
```typescript
import { Assessment } from '@mui/icons-material';
```

---

## Step 3E: Create Control Detail Enhancement

📁 **File:** `client/src/components/ControlCoverageCard.tsx`

🔄 **COMPLETE FILE:**
```typescript
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Grid,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { ExpandMore, CheckCircle, Warning, Error } from '@mui/icons-material';

interface CoverageBreakdown {
  percentage: number;
  numerator: number;
  denominator: number;
  details: string[];
}

interface ControlCoverageProps {
  technicalCoverage: number;
  operationalCoverage: number;
  documentationCoverage: number;
  physicalCoverage: number;
  overallCoverage: number;
  breakdown: {
    technical: CoverageBreakdown;
    operational: CoverageBreakdown;
    documentation: CoverageBreakdown;
    physical: CoverageBreakdown;
  };
}

export default function ControlCoverageCard({ coverage }: { coverage: ControlCoverageProps }) {
  const getCoverageColor = (percentage: number) => {
    if (percentage >= 90) return '#4caf50';
    if (percentage >= 70) return '#ff9800';
    if (percentage >= 50) return '#ff5722';
    return '#f44336';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 90) return <CheckCircle sx={{ color: '#4caf50', fontSize: 40 }} />;
    if (percentage >= 50) return <Warning sx={{ color: '#ff9800', fontSize: 40 }} />;
    return <Error sx={{ color: '#f44336', fontSize: 40 }} />;
  };

  return (
    <Card sx={{ bgcolor: '#1E1E1E', mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          {getStatusIcon(coverage.overallCoverage)}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Coverage Status</Typography>
            <Typography variant="h3" sx={{ color: getCoverageColor(coverage.overallCoverage) }}>
              {coverage.overallCoverage}%
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Technical
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={coverage.technicalCoverage}
                sx={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: '#333',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getCoverageColor(coverage.technicalCoverage),
                  },
                }}
              />
              <Typography>{coverage.technicalCoverage}%</Typography>
            </Box>
          </Grid>

          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Operational
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={coverage.operationalCoverage}
                sx={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: '#333',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getCoverageColor(coverage.operationalCoverage),
                  },
                }}
              />
              <Typography>{coverage.operationalCoverage}%</Typography>
            </Box>
          </Grid>

          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Documentation
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={coverage.documentationCoverage}
                sx={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: '#333',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getCoverageColor(coverage.documentationCoverage),
                  },
                }}
              />
              <Typography>{coverage.documentationCoverage}%</Typography>
            </Box>
          </Grid>

          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Physical
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={coverage.physicalCoverage}
                sx={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: '#333',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getCoverageColor(coverage.physicalCoverage),
                  },
                }}
              />
              <Typography>{coverage.physicalCoverage}%</Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Detailed Breakdown */}
        <Accordion sx={{ bgcolor: '#242424', mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>View Detailed Breakdown</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {Object.entries(coverage.breakdown).map(([type, data]) => (
                <Grid item xs={12} md={6} key={type}>
                  <Typography variant="subtitle2" sx={{ textTransform: 'capitalize', mb: 1 }}>
                    {type} ({data.numerator}/{data.denominator})
                  </Typography>
                  <List dense>
                    {data.details.map((detail, idx) => (
                      <ListItem key={idx}>
                        <ListItemText
                          primary={detail}
                          primaryTypographyProps={{
                            variant: 'body2',
                            sx: {
                              color: detail.startsWith('✓')
                                ? '#4caf50'
                                : detail.startsWith('✗')
                                ? '#f44336'
                                : detail.startsWith('⚠')
                                ? '#ff9800'
                                : 'text.primary',
                            },
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );
}
```

---

## ✅ PHASE 3 COMPLETE

**Deliverables:**
- ✅ Gap Analysis Dashboard with overview
- ✅ Coverage type breakdown charts
- ✅ Control family analysis
- ✅ Critical controls identification
- ✅ Control detail coverage card component
- ✅ Interactive visualizations with Recharts

**UI Features:**
- Real-time coverage calculation
- Color-coded status indicators
- Progress bars for each coverage type
- Sortable tables
- Expandable detail breakdowns
- Responsive design

---

## PAUSE POINT

Test the dashboard:
1. Navigate to `/gap-analysis`
2. Verify all statistics load
3. Check charts render correctly
4. Test tab switching
5. Verify color coding matches coverage levels

**Next:** Phase 4 will implement Evidence Management UI for uploading and tracking evidence.
