# NIST 800-171 Auto-Mapping Verification & Enhancement Instructions

## Executive Summary

**STATUS: ✅ AUTO-MAPPING IS ALREADY DESIGNED AND IMPLEMENTED**

Your NIST 800-171 compliance tracker has a functional auto-mapping system that automatically links Microsoft 365 policies to NIST controls during synchronization. This document provides:

1. Verification steps to confirm it's working
2. Enhancement instructions to improve accuracy and usability
3. Testing procedures

---

## Part 1: Current Implementation Verification

### What's Already Built

#### 1. **Database Schema** ✅
**Location:** `server/prisma/schema.prisma`

```prisma
model ControlPolicyMapping {
  id                Int      @id @default(autoincrement())
  controlId         Int      @map("control_id")
  policyId          Int      @map("policy_id")
  mappingConfidence String   @default("Medium") @map("mapping_confidence") // 'High' | 'Medium' | 'Low'
  mappingNotes      String?  @map("mapping_notes")
  createdAt         DateTime @default(now()) @map("created_at")

  control Control    @relation(fields: [controlId], references: [id], onDelete: Cascade)
  policy  M365Policy @relation(fields: [policyId], references: [id], onDelete: Cascade)

  @@unique([controlId, policyId])
  @@map("control_policy_mappings")
}
```

**Purpose:** Stores the relationships between NIST controls and M365 policies with confidence levels.

#### 2. **Mapping Templates** ✅
**Location:** `data/control-m365-mappings.json`

Contains pre-defined mappings with:
- Control IDs (e.g., "03.05.03")
- Policy types (Intune, Purview, AzureAD)
- Keywords for matching (e.g., ["mfa", "multifactor", "multi-factor"])
- Confidence levels (High, Medium, Low)
- Mapping rationale

**Example from the file:**
```json
{
  "controlId": "03.05.03",
  "controlTitle": "Use multifactor authentication",
  "policyTypes": ["AzureAD"],
  "searchCriteria": {
    "policyTypeMatch": "ConditionalAccess",
    "keywords": ["mfa", "multifactor", "multi-factor"],
    "requiresMFA": true
  },
  "mappingConfidence": "High",
  "mappingReason": "Conditional Access policies can enforce MFA requirements"
}
```

#### 3. **Auto-Mapping Service** ✅
**Location:** `server/src/services/policySync.service.ts`

**Key Function:** `autoMapPolicies()`

**How It Works:**
1. Loads mapping templates from `control-m365-mappings.json`
2. For each template:
   - Finds the NIST control in the database
   - Searches for M365 policies that match:
     - Policy type (Intune/Purview/AzureAD)
     - Keywords in policy name (case-insensitive)
   - Creates mappings if they don't already exist
3. Returns count of mappings created

**Current Implementation:**
```typescript
private async autoMapPolicies(): Promise<number> {
  let count = 0;

  for (const template of this.mappingTemplates) {
    // Find control by controlId
    const control = await prisma.control.findFirst({
      where: { controlId: template.controlId },
    });

    if (!control) continue;

    // Find matching policies based on keywords
    const policies = await prisma.m365Policy.findMany({
      where: {
        policyType: { in: template.policyTypes },
        isActive: true,
        OR: template.searchCriteria.keywords.map((keyword: string) => ({
          policyName: { contains: keyword },
        })),
      },
    });

    // Create mappings
    for (const policy of policies) {
      const existing = await prisma.controlPolicyMapping.findFirst({
        where: { controlId: control.id, policyId: policy.id },
      });

      if (!existing) {
        await prisma.controlPolicyMapping.create({
          data: {
            controlId: control.id,
            policyId: policy.id,
            mappingConfidence: template.mappingConfidence,
            mappingNotes: template.mappingReason,
          },
        });
        count++;
      }
    }
  }

  return count;
}
```

#### 4. **API Endpoint** ✅
**Endpoint:** `POST /api/m365/map-policies`

This endpoint triggers auto-mapping and is called automatically during M365 sync.

#### 5. **Sync Integration** ✅
Auto-mapping runs automatically during the sync process:

```typescript
async syncAllPolicies(forceRefresh = false) {
  // ... sync Intune, Purview, Azure AD policies ...
  
  // Auto-map policies to controls
  controlsUpdated = await this.autoMapPolicies();
  
  // ... log results ...
}
```

---

## Part 2: Verification Steps

### Prerequisites
Ensure your application is running:
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend  
cd client
npm run dev
```

### Step 1: Check Database Schema
```bash
cd server
npx prisma studio
```

**Verify tables exist:**
- `m365_policies` (stores synced policies)
- `control_policy_mappings` (stores auto-mappings)
- Check if `control_policy_mappings` has a `mappingConfidence` column

### Step 2: Verify Mapping Templates
```bash
cat data/control-m365-mappings.json | head -50
```

**Confirm structure includes:**
- controlId
- policyTypes
- searchCriteria with keywords
- mappingConfidence
- mappingReason

### Step 3: Test Auto-Mapping Function

**Create a test script:**

📁 **File:** `server/src/scripts/test-auto-mapping.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function testAutoMapping() {
  console.log('🔍 Testing Auto-Mapping Functionality\n');

  // 1. Load mapping templates
  const mappingsPath = path.join(__dirname, '../../../data/control-m365-mappings.json');
  const mappingsData = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
  console.log(`✅ Loaded ${mappingsData.mappings.length} mapping templates\n`);

  // 2. Check controls exist
  const controlCount = await prisma.control.count();
  console.log(`✅ Database contains ${controlCount} NIST controls\n`);

  // 3. Check for M365 policies
  const policyCount = await prisma.m365Policy.count();
  console.log(`📋 Currently synced M365 policies: ${policyCount}`);
  
  if (policyCount === 0) {
    console.log('⚠️  No M365 policies found. Run a sync first.');
    console.log('   You can do this via the UI or by calling the sync API endpoint.\n');
  }

  // 4. Check existing mappings
  const existingMappings = await prisma.controlPolicyMapping.count();
  console.log(`🔗 Current policy-to-control mappings: ${existingMappings}\n`);

  // 5. Sample some mappings
  const sampleMappings = await prisma.controlPolicyMapping.findMany({
    take: 5,
    include: {
      control: { select: { controlId: true, title: true } },
      policy: { select: { policyName: true, policyType: true } },
    },
  });

  if (sampleMappings.length > 0) {
    console.log('📊 Sample Mappings:');
    sampleMappings.forEach((mapping, idx) => {
      console.log(`\n${idx + 1}. Control ${mapping.control.controlId}: ${mapping.control.title}`);
      console.log(`   ↳ Policy: ${mapping.policy.policyName} (${mapping.policy.policyType})`);
      console.log(`   ↳ Confidence: ${mapping.mappingConfidence}`);
      console.log(`   ↳ Reason: ${mapping.mappingNotes}`);
    });
  } else {
    console.log('⚠️  No mappings found. Auto-mapping may not have run yet.\n');
  }

  // 6. Test a specific mapping template
  console.log('\n\n🧪 Testing Specific Mapping (MFA Control 3.5.3):');
  
  const mfaControl = await prisma.control.findFirst({
    where: { controlId: '03.05.03' },
  });

  if (mfaControl) {
    console.log(`✅ Found control: ${mfaControl.controlId} - ${mfaControl.title}`);
    
    // Find policies that should match MFA keywords
    const mfaPolicies = await prisma.m365Policy.findMany({
      where: {
        policyType: 'AzureAD',
        isActive: true,
        OR: [
          { policyName: { contains: 'mfa' } },
          { policyName: { contains: 'multifactor' } },
          { policyName: { contains: 'multi-factor' } },
        ],
      },
    });

    console.log(`   Found ${mfaPolicies.length} policies matching MFA keywords`);
    
    if (mfaPolicies.length > 0) {
      console.log('   Policies:');
      mfaPolicies.forEach(policy => {
        console.log(`   - ${policy.policyName}`);
      });
    }

    // Check if mappings exist
    const mfaMappings = await prisma.controlPolicyMapping.findMany({
      where: { controlId: mfaControl.id },
      include: { policy: true },
    });

    console.log(`   Mapped to ${mfaMappings.length} policies`);
  } else {
    console.log('❌ Control 03.05.03 not found in database');
  }

  await prisma.$disconnect();
}

testAutoMapping().catch(console.error);
```

**Run the test:**
```bash
cd server
npx ts-node src/scripts/test-auto-mapping.ts
```

### Step 4: Trigger a Manual Sync

**Option A: Via API**
```bash
curl -X POST http://localhost:3001/api/m365/sync \
  -H "Content-Type: application/json"
```

**Option B: Via UI**
1. Navigate to M365 Integration page
2. Click "Sync Now" button
3. Check console logs for auto-mapping results

### Step 5: Verify Results

**Check sync logs:**
```typescript
// Query sync logs
const logs = await prisma.m365SyncLog.findMany({
  orderBy: { syncDate: 'desc' },
  take: 5,
});

logs.forEach(log => {
  console.log(`Sync: ${log.syncDate}`);
  console.log(`  Policies Updated: ${log.policiesUpdated}`);
  console.log(`  Controls Updated: ${log.controlsUpdated}`);
  console.log(`  Status: ${log.status}`);
});
```

---

## Part 3: Known Limitations & Enhancements Needed

### Current Limitations

1. **Only Searches Policy Names**
   - ❌ Doesn't search policy descriptions
   - ❌ Doesn't search policy configuration JSON

2. **No Confidence Threshold**
   - ❌ Maps all keyword matches regardless of confidence
   - ❌ No filtering by confidence level

3. **No Manual Review UI**
   - ❌ No interface to review suggested mappings before accepting
   - ❌ Can't reject or modify auto-mappings

4. **Simple Keyword Matching**
   - ❌ Only uses basic string contains (no fuzzy matching)
   - ❌ Doesn't weight keywords by importance
   - ❌ No scoring algorithm beyond the template confidence level

5. **No Pattern Matching**
   - ❌ Doesn't use regex patterns from templates
   - ❌ Can't match complex policy structures

---

## Part 4: Enhancement Instructions for Claude Code

### Enhancement 1: Search Policy Descriptions

**Problem:** Currently only searches policy names, missing relevant policies with generic names but detailed descriptions.

**Solution:** Extend search to include `policyDescription` field.

📁 **File:** `server/src/services/policySync.service.ts`

🔍 **FIND:**
```typescript
const policies = await prisma.m365Policy.findMany({
  where: {
    policyType: {
      in: template.policyTypes,
    },
    isActive: true,
    OR: template.searchCriteria.keywords.map((keyword: string) => ({
      policyName: {
        contains: keyword,
      },
    })),
  },
});
```

✏️ **REPLACE WITH:**
```typescript
const policies = await prisma.m365Policy.findMany({
  where: {
    policyType: {
      in: template.policyTypes,
    },
    isActive: true,
    OR: template.searchCriteria.keywords.flatMap((keyword: string) => [
      { policyName: { contains: keyword } },
      { policyDescription: { contains: keyword } },
    ]),
  },
});
```

---

### Enhancement 2: Confidence-Based Scoring

**Problem:** All keyword matches are treated equally. Need intelligent scoring based on match quality.

**Solution:** Implement a scoring algorithm that calculates match confidence.

📁 **File:** `server/src/services/policySync.service.ts`

➕ **ADD AFTER:** `private mappingTemplates` declaration

```typescript
/**
 * Calculate match confidence score for a policy-control pair
 */
private calculateMatchScore(
  policy: { policyName: string; policyDescription: string | null },
  template: any
): { score: number; matchedKeywords: string[] } {
  const searchText = `${policy.policyName} ${policy.policyDescription || ''}`.toLowerCase();
  const matchedKeywords: string[] = [];
  let score = 0;

  // Check each keyword
  for (const keyword of template.searchCriteria.keywords) {
    const keywordLower = keyword.toLowerCase();
    
    // Check policy name (higher weight)
    if (policy.policyName.toLowerCase().includes(keywordLower)) {
      matchedKeywords.push(keyword);
      score += 2; // Name matches are worth more
    }
    // Check policy description (lower weight)
    else if (policy.policyDescription?.toLowerCase().includes(keywordLower)) {
      matchedKeywords.push(keyword);
      score += 1;
    }
  }

  // Calculate percentage of keywords matched
  const matchPercentage = matchedKeywords.length / template.searchCriteria.keywords.length;
  
  // Apply template confidence weight
  const templateWeight = {
    'High': 1.0,
    'Medium': 0.75,
    'Low': 0.5,
  }[template.mappingConfidence] || 0.75;

  const finalScore = (matchPercentage * score * templateWeight) / template.searchCriteria.keywords.length;

  return {
    score: Math.min(1.0, finalScore), // Cap at 1.0
    matchedKeywords,
  };
}
```

➕ **ADD AFTER:** Previous function

```typescript
/**
 * Convert numeric score to confidence level
 */
private scoreToConfidence(score: number): 'High' | 'Medium' | 'Low' {
  if (score >= 0.7) return 'High';
  if (score >= 0.4) return 'Medium';
  return 'Low';
}
```

🔍 **FIND:** Inside `autoMapPolicies()` function, the section where mappings are created:

```typescript
// Create mappings
for (const policy of policies) {
  const existing = await prisma.controlPolicyMapping.findFirst({
    where: {
      controlId: control.id,
      policyId: policy.id,
    },
  });

  if (!existing) {
    await prisma.controlPolicyMapping.create({
      data: {
        controlId: control.id,
        policyId: policy.id,
        mappingConfidence: template.mappingConfidence,
        mappingNotes: template.mappingReason,
      },
    });
    count++;
  }
}
```

✏️ **REPLACE WITH:**
```typescript
// Create mappings with calculated confidence
for (const policy of policies) {
  const existing = await prisma.controlPolicyMapping.findFirst({
    where: {
      controlId: control.id,
      policyId: policy.id,
    },
  });

  if (!existing) {
    // Calculate match score
    const { score, matchedKeywords } = this.calculateMatchScore(policy, template);
    const calculatedConfidence = this.scoreToConfidence(score);
    
    // Only create mapping if score meets minimum threshold (0.3 = 30%)
    if (score >= 0.3) {
      const mappingNotes = `${template.mappingReason}\nMatched keywords: ${matchedKeywords.join(', ')}\nScore: ${(score * 100).toFixed(0)}%`;
      
      await prisma.controlPolicyMapping.create({
        data: {
          controlId: control.id,
          policyId: policy.id,
          mappingConfidence: calculatedConfidence,
          mappingNotes,
        },
      });
      count++;
      
      console.log(`✓ Mapped ${policy.policyName} → ${control.controlId} (${calculatedConfidence} confidence, ${(score * 100).toFixed(0)}% score)`);
    } else {
      console.log(`✗ Skipped ${policy.policyName} → ${control.controlId} (score ${(score * 100).toFixed(0)}% below threshold)`);
    }
  }
}
```

---

### Enhancement 3: Manual Review Interface

**Problem:** No UI to review auto-mapped suggestions before accepting them.

**Solution:** Create a "Suggested Mappings" review page.

#### Backend Changes

📁 **File:** `server/src/routes/m365.routes.ts`

➕ **ADD AFTER:** Existing routes

```typescript
// Get suggested mappings for review
router.get('/suggested-mappings', async (req, res) => {
  try {
    const { confidence } = req.query;
    
    const where: any = {};
    if (confidence) {
      where.mappingConfidence = confidence;
    }

    const suggestions = await prisma.controlPolicyMapping.findMany({
      where,
      include: {
        control: {
          select: {
            controlId: true,
            title: true,
            family: true,
          },
        },
        policy: {
          select: {
            policyName: true,
            policyType: true,
            policyDescription: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching suggested mappings:', error);
    res.status(500).json({ error: 'Failed to fetch suggested mappings' });
  }
});

// Approve a mapping
router.post('/mappings/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    const mapping = await prisma.controlPolicyMapping.update({
      where: { id: parseInt(id) },
      data: {
        mappingNotes: `${req.body.notes || ''}\n[Approved by user]`,
      },
    });

    res.json({ success: true, mapping });
  } catch (error) {
    console.error('Error approving mapping:', error);
    res.status(500).json({ error: 'Failed to approve mapping' });
  }
});

// Reject and delete a mapping
router.delete('/mappings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.controlPolicyMapping.delete({
      where: { id: parseInt(id) },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting mapping:', error);
    res.status(500).json({ error: 'Failed to delete mapping' });
  }
});
```

#### Frontend Changes

📁 **File:** `client/src/pages/M365/SuggestedMappingsPage.tsx`

🔄 **COMPLETE FILE:**
```typescript
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
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Alert,
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

      {mappings.length === 0 && !isLoading && (
        <Alert severity="info">
          No suggested mappings to review. Run an M365 sync to generate mappings.
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
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
```

📁 **File:** `client/src/App.tsx`

➕ **ADD IMPORT:**
```typescript
import SuggestedMappingsPage from './pages/M365/SuggestedMappingsPage';
```

➕ **ADD ROUTE:** (inside your Routes component)
```typescript
<Route path="/m365/suggested-mappings" element={<SuggestedMappingsPage />} />
```

📁 **File:** Navigation component (add to M365 submenu)

➕ **ADD NAVIGATION ITEM:**
```typescript
{
  text: 'Review Mappings',
  path: '/m365/suggested-mappings',
  icon: <AssignmentIcon />,
}
```

---

### Enhancement 4: Bulk Operations

**Problem:** No way to approve/reject multiple mappings at once.

**Solution:** Add bulk approval/rejection.

📁 **File:** `server/src/routes/m365.routes.ts`

➕ **ADD ROUTES:**
```typescript
// Bulk approve mappings
router.post('/mappings/bulk-approve', async (req, res) => {
  try {
    const { ids } = req.body;
    
    await prisma.controlPolicyMapping.updateMany({
      where: { id: { in: ids } },
      data: {
        mappingNotes: prisma.sql`CONCAT(mapping_notes, '\n[Bulk approved by user]')`,
      },
    });

    res.json({ success: true, count: ids.length });
  } catch (error) {
    console.error('Error bulk approving mappings:', error);
    res.status(500).json({ error: 'Failed to bulk approve mappings' });
  }
});

// Bulk reject mappings
router.post('/mappings/bulk-reject', async (req, res) => {
  try {
    const { ids } = req.body;
    
    await prisma.controlPolicyMapping.deleteMany({
      where: { id: { in: ids } },
    });

    res.json({ success: true, count: ids.length });
  } catch (error) {
    console.error('Error bulk rejecting mappings:', error);
    res.status(500).json({ error: 'Failed to bulk reject mappings' });
  }
});
```

Update the frontend `SuggestedMappingsPage.tsx` to add checkboxes and bulk action buttons.

---

## Part 5: Testing Plan

### Test Case 1: Verify Auto-Mapping Runs on Sync

**Steps:**
1. Ensure you have M365 policies synced (or mock data in database)
2. Clear existing mappings: `DELETE FROM control_policy_mappings;`
3. Trigger sync via UI or API
4. Check console logs for mapping count
5. Verify mappings exist in database: `SELECT COUNT(*) FROM control_policy_mappings;`

**Expected Result:** Mappings created based on keyword matches

### Test Case 2: Verify Confidence Scoring

**Steps:**
1. Create test policies with varying keyword matches:
   - Policy A: "Require MFA for All Users" (should match 3.5.3 with HIGH confidence)
   - Policy B: "Authentication Policy" (should match 3.5.3 with LOWER confidence)
2. Run auto-mapping
3. Check confidence levels in database

**Expected Result:** More specific matches get higher confidence scores

### Test Case 3: Test Manual Review UI

**Steps:**
1. Navigate to /m365/suggested-mappings
2. Filter by confidence level
3. View mapping details
4. Approve a mapping
5. Reject a mapping
6. Verify changes in database

**Expected Result:** UI displays all mappings, actions work correctly

### Test Case 4: Test Threshold Filtering

**Steps:**
1. Set minimum score threshold to 0.5 (50%)
2. Create policies with low keyword matches
3. Run auto-mapping
4. Verify low-score policies are NOT mapped

**Expected Result:** Only high-quality matches create mappings

---

## Part 6: Monitoring & Maintenance

### Key Metrics to Track

1. **Mapping Accuracy Rate**
   - % of auto-mappings that are approved vs rejected
   - Track over time to improve keyword templates

2. **Unmapped Policies**
   - Policies that don't match any controls
   - Review regularly to update mapping templates

3. **Sync Performance**
   - Time taken for auto-mapping
   - Number of mappings created per sync

### Logs to Monitor

```typescript
// Add logging to auto-mapping function
console.log(`[Auto-Mapping] Started for ${this.mappingTemplates.length} templates`);
console.log(`[Auto-Mapping] Found ${policies.length} matching policies`);
console.log(`[Auto-Mapping] Created ${count} new mappings`);
console.log(`[Auto-Mapping] Skipped ${skippedCount} low-confidence matches`);
```

### Maintenance Tasks

**Monthly:**
- Review rejected mappings to identify missing keywords
- Update `control-m365-mappings.json` with new keywords
- Add mappings for newly identified policy types

**Quarterly:**
- Analyze accuracy metrics
- Refine confidence thresholds
- Update mapping rationale text

---

## Part 7: Summary & Next Steps

### What Works Now ✅
- Auto-mapping runs automatically during M365 sync
- Keyword-based matching for policy names
- Confidence levels stored with mappings
- Basic mapping templates for common controls

### What Needs Enhancement 🔧
1. **Search policy descriptions** (not just names)
2. **Intelligent confidence scoring** (beyond template values)
3. **Manual review UI** (approve/reject suggestions)
4. **Bulk operations** (approve/reject multiple at once)
5. **Analytics dashboard** (track mapping accuracy)

### Implementation Priority

**Phase 1 (High Priority):**
- Enhancement 1: Search policy descriptions ← Start here
- Enhancement 2: Confidence-based scoring

**Phase 2 (Medium Priority):**
- Enhancement 3: Manual review interface
- Enhancement 4: Bulk operations

**Phase 3 (Nice to Have):**
- Analytics dashboard
- Machine learning for keyword optimization
- Pattern matching with regex

---

## Questions or Issues?

If you encounter any issues during implementation:

1. **Check database schema** - Ensure all tables exist
2. **Review console logs** - Look for error messages during sync
3. **Test with sample data** - Create mock policies to test matching
4. **Verify mapping templates** - Ensure JSON file is valid and loaded

The auto-mapping system is already functional - these enhancements will make it more accurate and user-friendly!
