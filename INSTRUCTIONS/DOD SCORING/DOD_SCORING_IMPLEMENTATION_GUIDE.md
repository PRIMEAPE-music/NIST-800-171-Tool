# DoD Assessment Scoring Implementation Guide
## NIST 800-171 Rev 3 Compliance Application

**Purpose**: Add DoD Assessment Methodology scoring to track SPRS compliance scores  
**Complexity**: Medium (database changes, new service, UI updates)  
**Estimated Implementation**: 4-6 phases

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 1: Database Schema Updates](#phase-1-database-schema-updates)
3. [Phase 2: Seed Script for DoD Scoring Data](#phase-2-seed-script-for-dod-scoring-data)
4. [Phase 3: DoD Score Calculation Service](#phase-3-dod-score-calculation-service)
5. [Phase 4: API Endpoints](#phase-4-api-endpoints)
6. [Phase 5: Dashboard DoD Score Card](#phase-5-dashboard-dod-score-card)
7. [Phase 6: Control Library & Detail Updates](#phase-6-control-library--detail-updates)
8. [Verification Checklist](#verification-checklist)

---

## Overview

### Scoring Summary

| Metric | Value |
|--------|-------|
| Total Controls | 97 |
| Max Score | 97 |
| Min Score | -195 |
| Total Weighted Points | 292 |

### Formula

```
DoD Score = 97 - Σ(dodPoints for each control where status ≠ 'Verified')
```

### Point Distribution

| Points | Count | Description |
|--------|-------|-------------|
| 5 | 40 | Critical - exploitation/exfiltration risk |
| 3 | 18 | Moderate - specific security effect |
| 1 | 38 | Low - indirect effect |
| 0 | 1 | SSP (prerequisite) |

---

## Phase 1: Database Schema Updates

### Step 1.1: Update Prisma Schema

📁 **File**: `server/prisma/schema.prisma`

🔍 **FIND** the `Control` model and add the following fields:

```prisma
model Control {
  id                    Int       @id @default(autoincrement())
  controlId             String    @unique
  title                 String
  family                String
  familyName            String?
  description           String?
  discussion            String?
  status                String    @default("Not Started")
  priority              String    @default("Medium")
  implementationStatus  String?
  notes                 String?
  requirementType       String?   // "Basic" or "Derived"
  
  // === ADD THESE NEW FIELDS ===
  dodPoints             Int       @default(1)        // Penalty points (1, 3, or 5)
  dodSpecialScoring     Boolean   @default(false)    // MFA or FIPS crypto
  dodNaAllowed          Boolean   @default(false)    // Remote/Wireless/Mobile
  dodRev2Mapping        String?                      // Original Rev 2 control ID(s)
  dodMappingType        String?                      // Direct, Consolidated, New, Moved
  // === END NEW FIELDS ===
  
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  
  // Relations
  evidence              Evidence[]
  poams                 Poam[]
  policyMappings        PolicyMapping[]
  
  @@index([family])
  @@index([status])
}
```

### Step 1.2: Create and Run Migration

```bash
cd server
npx prisma migrate dev --name add_dod_scoring_fields
```

### Step 1.3: Verify Migration

```bash
npx prisma studio
# Check that Control table has new columns: dodPoints, dodSpecialScoring, dodNaAllowed, dodRev2Mapping, dodMappingType
```

---

## Phase 2: Seed Script for DoD Scoring Data

### Step 2.1: Copy DoD Scoring JSON to Server

📁 **File**: `server/prisma/data/dod-assessment-scoring-rev3.json`

Copy the complete JSON file from `/mnt/user-data/outputs/dod-assessment-scoring-rev3.json` to this location.

### Step 2.2: Create DoD Scoring Seed Script

📁 **File**: `server/prisma/seedDodScoring.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface DoDControl {
  controlId: string;
  title: string;
  family: string;
  dodPoints: number;
  requirementType: string;
  rev2Mapping: string | string[] | null;
  mappingType: string;
  rationale: string;
  specialScoring?: boolean;
  naAllowed?: boolean;
}

interface DoDScoringData {
  metadata: {
    rev3MaxScore: number;
    rev3TotalWeightedPoints: number;
    rev3MinimumPossibleScore: number;
  };
  controls: DoDControl[];
}

async function seedDodScoring(): Promise<void> {
  console.log('🎯 Starting DoD Assessment Scoring seed...');

  // Load the DoD scoring data
  const dataPath = path.join(__dirname, 'data', 'dod-assessment-scoring-rev3.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error('❌ DoD scoring data file not found at:', dataPath);
    console.log('📁 Please copy dod-assessment-scoring-rev3.json to server/prisma/data/');
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const scoringData: DoDScoringData = JSON.parse(rawData);

  console.log(`📊 Loaded ${scoringData.controls.length} controls from DoD scoring data`);
  console.log(`   Max Score: ${scoringData.metadata.rev3MaxScore}`);
  console.log(`   Total Weighted Points: ${scoringData.metadata.rev3TotalWeightedPoints}`);

  let updated = 0;
  let notFound = 0;
  const notFoundControls: string[] = [];

  for (const control of scoringData.controls) {
    // Format rev2Mapping as string
    let rev2MappingStr: string | null = null;
    if (control.rev2Mapping) {
      if (Array.isArray(control.rev2Mapping)) {
        rev2MappingStr = control.rev2Mapping.join(', ');
      } else {
        rev2MappingStr = control.rev2Mapping;
      }
    }

    try {
      const result = await prisma.control.update({
        where: { controlId: control.controlId },
        data: {
          dodPoints: control.dodPoints,
          dodSpecialScoring: control.specialScoring || false,
          dodNaAllowed: control.naAllowed || false,
          dodRev2Mapping: rev2MappingStr,
          dodMappingType: control.mappingType,
          requirementType: control.requirementType,
        },
      });
      updated++;
      console.log(`   ✓ ${control.controlId}: ${control.dodPoints} pts (${control.mappingType})`);
    } catch (error) {
      notFound++;
      notFoundControls.push(control.controlId);
      console.log(`   ✗ ${control.controlId}: Not found in database`);
    }
  }

  console.log('\n📈 DoD Scoring Seed Summary:');
  console.log(`   Updated: ${updated} controls`);
  console.log(`   Not Found: ${notFound} controls`);
  
  if (notFoundControls.length > 0) {
    console.log(`   Missing Controls: ${notFoundControls.join(', ')}`);
  }

  // Verify point distribution
  const pointCounts = await prisma.control.groupBy({
    by: ['dodPoints'],
    _count: { dodPoints: true },
    orderBy: { dodPoints: 'desc' },
  });

  console.log('\n📊 Point Distribution Verification:');
  let totalPoints = 0;
  for (const pc of pointCounts) {
    const count = pc._count.dodPoints;
    const points = pc.dodPoints * count;
    totalPoints += points;
    console.log(`   ${pc.dodPoints} pts: ${count} controls (${points} total points)`);
  }
  console.log(`   Total Weighted Points: ${totalPoints}`);

  if (totalPoints === 292) {
    console.log('   ✅ Point distribution verified correctly!');
  } else {
    console.log(`   ⚠️  Expected 292 total points, got ${totalPoints}`);
  }
}

seedDodScoring()
  .then(() => {
    console.log('\n✅ DoD scoring seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ DoD scoring seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Step 2.3: Add Script to package.json

📁 **File**: `server/package.json`

🔍 **FIND** the `"scripts"` section and **ADD**:

```json
"scripts": {
  // ... existing scripts ...
  "seed:dod": "ts-node prisma/seedDodScoring.ts"
}
```

### Step 2.4: Run the Seed Script

```bash
cd server
npm run seed:dod
```

**Expected Output**:
```
🎯 Starting DoD Assessment Scoring seed...
📊 Loaded 97 controls from DoD scoring data
   Max Score: 97
   Total Weighted Points: 292
   ✓ 03.01.01: 5 pts (Direct)
   ✓ 03.01.02: 5 pts (Direct)
   ... (95 more controls)

📈 DoD Scoring Seed Summary:
   Updated: 97 controls
   Not Found: 0 controls

📊 Point Distribution Verification:
   5 pts: 40 controls (200 total points)
   3 pts: 18 controls (54 total points)
   1 pts: 38 controls (38 total points)
   0 pts: 1 controls (0 total points)
   Total Weighted Points: 292
   ✅ Point distribution verified correctly!

✅ DoD scoring seed completed successfully
```

---

## Phase 3: DoD Score Calculation Service

### Step 3.1: Create DoD Scoring Service

📁 **File**: `server/src/services/dodScoringService.ts`

```typescript
import { PrismaClient, Control } from '@prisma/client';

const prisma = new PrismaClient();

// Constants
const DOD_MAX_SCORE = 97;
const DOD_TOTAL_WEIGHTED_POINTS = 292;
const DOD_MIN_SCORE = DOD_MAX_SCORE - DOD_TOTAL_WEIGHTED_POINTS; // -195

// Statuses that count as "compliant" (no points deducted)
const COMPLIANT_STATUSES = ['Verified', 'Not Applicable'];

export interface DoDScoreResult {
  maxScore: number;
  minScore: number;
  currentScore: number;
  totalWeightedPoints: number;
  pointsDeducted: number;
  verifiedControls: number;
  notApplicableControls: number;
  nonCompliantControls: number;
  totalControls: number;
  compliancePercentage: number;
  sprsScore: number; // Alias for currentScore (SPRS = Supplier Performance Risk System)
  scoreBreakdown: {
    fivePointControls: { total: number; compliant: number; deducted: number };
    threePointControls: { total: number; compliant: number; deducted: number };
    onePointControls: { total: number; compliant: number; deducted: number };
    zeroPointControls: { total: number; compliant: number };
  };
  familyScores: FamilyScore[];
  specialScoringControls: SpecialScoringControl[];
}

export interface FamilyScore {
  family: string;
  familyName: string;
  totalControls: number;
  totalPoints: number;
  compliantControls: number;
  pointsDeducted: number;
  compliancePercentage: number;
}

export interface SpecialScoringControl {
  controlId: string;
  title: string;
  dodPoints: number;
  status: string;
  isCompliant: boolean;
  specialType: 'MFA' | 'FIPS' | 'NA_ALLOWED';
  note: string;
}

// Family name mapping
const FAMILY_NAMES: Record<string, string> = {
  AC: 'Access Control',
  AT: 'Awareness and Training',
  AU: 'Audit and Accountability',
  CA: 'Security Assessment',
  CM: 'Configuration Management',
  IA: 'Identification and Authentication',
  IR: 'Incident Response',
  MA: 'Maintenance',
  MP: 'Media Protection',
  PE: 'Physical Protection',
  PL: 'Planning',
  PS: 'Personnel Security',
  RA: 'Risk Assessment',
  SA: 'System and Services Acquisition',
  SC: 'System and Communications Protection',
  SI: 'System and Information Integrity',
  SR: 'Supply Chain Risk Management',
};

/**
 * Calculate the DoD Assessment Score based on control statuses
 */
export async function calculateDoDScore(): Promise<DoDScoreResult> {
  // Fetch all controls with their DoD scoring data
  const controls = await prisma.control.findMany({
    orderBy: { controlId: 'asc' },
  });

  let pointsDeducted = 0;
  let verifiedCount = 0;
  let naCount = 0;
  let nonCompliantCount = 0;

  // Point breakdown tracking
  const breakdown = {
    fivePoint: { total: 0, compliant: 0, deducted: 0 },
    threePoint: { total: 0, compliant: 0, deducted: 0 },
    onePoint: { total: 0, compliant: 0, deducted: 0 },
    zeroPoint: { total: 0, compliant: 0 },
  };

  // Family score tracking
  const familyMap = new Map<string, {
    totalControls: number;
    totalPoints: number;
    compliantControls: number;
    pointsDeducted: number;
  }>();

  // Special scoring controls
  const specialControls: SpecialScoringControl[] = [];

  for (const control of controls) {
    const isCompliant = COMPLIANT_STATUSES.includes(control.status);
    const points = control.dodPoints;

    // Track special scoring controls
    if (control.dodSpecialScoring) {
      let specialType: 'MFA' | 'FIPS' = 'MFA';
      let note = '';
      
      if (control.controlId === '03.05.03') {
        specialType = 'MFA';
        note = 'MFA: 5pts if none, 3pts if partial, 0pts if all users';
      } else if (control.controlId === '03.13.11') {
        specialType = 'FIPS';
        note = 'FIPS: 5pts if none, 3pts if non-FIPS, 0pts if FIPS-validated';
      }

      specialControls.push({
        controlId: control.controlId,
        title: control.title,
        dodPoints: points,
        status: control.status,
        isCompliant,
        specialType,
        note,
      });
    }

    if (control.dodNaAllowed) {
      specialControls.push({
        controlId: control.controlId,
        title: control.title,
        dodPoints: points,
        status: control.status,
        isCompliant,
        specialType: 'NA_ALLOWED',
        note: 'Can be N/A if capability not used and policy prevents enablement',
      });
    }

    // Count by status
    if (control.status === 'Verified') {
      verifiedCount++;
    } else if (control.status === 'Not Applicable') {
      naCount++;
    } else {
      nonCompliantCount++;
      pointsDeducted += points;
    }

    // Track by point value
    if (points === 5) {
      breakdown.fivePoint.total++;
      if (isCompliant) {
        breakdown.fivePoint.compliant++;
      } else {
        breakdown.fivePoint.deducted += points;
      }
    } else if (points === 3) {
      breakdown.threePoint.total++;
      if (isCompliant) {
        breakdown.threePoint.compliant++;
      } else {
        breakdown.threePoint.deducted += points;
      }
    } else if (points === 1) {
      breakdown.onePoint.total++;
      if (isCompliant) {
        breakdown.onePoint.compliant++;
      } else {
        breakdown.onePoint.deducted += points;
      }
    } else {
      breakdown.zeroPoint.total++;
      if (isCompliant) {
        breakdown.zeroPoint.compliant++;
      }
    }

    // Track by family
    const family = control.family;
    if (!familyMap.has(family)) {
      familyMap.set(family, {
        totalControls: 0,
        totalPoints: 0,
        compliantControls: 0,
        pointsDeducted: 0,
      });
    }

    const familyData = familyMap.get(family)!;
    familyData.totalControls++;
    familyData.totalPoints += points;
    if (isCompliant) {
      familyData.compliantControls++;
    } else {
      familyData.pointsDeducted += points;
    }
  }

  // Build family scores array
  const familyScores: FamilyScore[] = Array.from(familyMap.entries())
    .map(([family, data]) => ({
      family,
      familyName: FAMILY_NAMES[family] || family,
      totalControls: data.totalControls,
      totalPoints: data.totalPoints,
      compliantControls: data.compliantControls,
      pointsDeducted: data.pointsDeducted,
      compliancePercentage: data.totalControls > 0
        ? Math.round((data.compliantControls / data.totalControls) * 100)
        : 0,
    }))
    .sort((a, b) => a.family.localeCompare(b.family));

  const currentScore = DOD_MAX_SCORE - pointsDeducted;
  const compliancePercentage = Math.round(
    ((verifiedCount + naCount) / controls.length) * 100
  );

  return {
    maxScore: DOD_MAX_SCORE,
    minScore: DOD_MIN_SCORE,
    currentScore,
    totalWeightedPoints: DOD_TOTAL_WEIGHTED_POINTS,
    pointsDeducted,
    verifiedControls: verifiedCount,
    notApplicableControls: naCount,
    nonCompliantControls: nonCompliantCount,
    totalControls: controls.length,
    compliancePercentage,
    sprsScore: currentScore, // SPRS score is the same as DoD score
    scoreBreakdown: {
      fivePointControls: breakdown.fivePoint,
      threePointControls: breakdown.threePoint,
      onePointControls: breakdown.onePoint,
      zeroPointControls: breakdown.zeroPoint,
    },
    familyScores,
    specialScoringControls: specialControls,
  };
}

/**
 * Get score color based on current score
 */
export function getScoreColor(score: number): 'success' | 'warning' | 'error' {
  if (score >= 80) return 'success';      // 80-97: Good
  if (score >= 50) return 'warning';      // 50-79: Needs work
  return 'error';                          // Below 50: Critical
}

/**
 * Get score label based on current score
 */
export function getScoreLabel(score: number): string {
  if (score === 97) return 'Full Compliance';
  if (score >= 80) return 'Strong';
  if (score >= 50) return 'Moderate';
  if (score >= 0) return 'At Risk';
  return 'Critical'; // Negative score
}

export default {
  calculateDoDScore,
  getScoreColor,
  getScoreLabel,
  DOD_MAX_SCORE,
  DOD_MIN_SCORE,
  DOD_TOTAL_WEIGHTED_POINTS,
};
```

### Step 3.2: Export from Services Index

📁 **File**: `server/src/services/index.ts`

🔍 **ADD** to exports:

```typescript
export * from './dodScoringService';
```

---

## Phase 4: API Endpoints

### Step 4.1: Create DoD Scoring Routes

📁 **File**: `server/src/routes/dodScoring.ts`

```typescript
import { Router, Request, Response } from 'express';
import { calculateDoDScore, getScoreColor, getScoreLabel } from '../services/dodScoringService';

const router = Router();

/**
 * GET /api/dod-score
 * Returns the complete DoD Assessment Score calculation
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const scoreResult = await calculateDoDScore();
    
    res.json({
      success: true,
      data: {
        ...scoreResult,
        scoreColor: getScoreColor(scoreResult.currentScore),
        scoreLabel: getScoreLabel(scoreResult.currentScore),
      },
    });
  } catch (error) {
    console.error('Error calculating DoD score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate DoD score',
    });
  }
});

/**
 * GET /api/dod-score/summary
 * Returns a simplified score summary for dashboard cards
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const scoreResult = await calculateDoDScore();
    
    res.json({
      success: true,
      data: {
        currentScore: scoreResult.currentScore,
        maxScore: scoreResult.maxScore,
        minScore: scoreResult.minScore,
        pointsDeducted: scoreResult.pointsDeducted,
        verifiedControls: scoreResult.verifiedControls,
        totalControls: scoreResult.totalControls,
        compliancePercentage: scoreResult.compliancePercentage,
        scoreColor: getScoreColor(scoreResult.currentScore),
        scoreLabel: getScoreLabel(scoreResult.currentScore),
      },
    });
  } catch (error) {
    console.error('Error calculating DoD score summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate DoD score summary',
    });
  }
});

/**
 * GET /api/dod-score/family/:family
 * Returns score breakdown for a specific control family
 */
router.get('/family/:family', async (req: Request, res: Response) => {
  try {
    const { family } = req.params;
    const scoreResult = await calculateDoDScore();
    
    const familyScore = scoreResult.familyScores.find(
      (f) => f.family.toUpperCase() === family.toUpperCase()
    );
    
    if (!familyScore) {
      return res.status(404).json({
        success: false,
        error: `Family '${family}' not found`,
      });
    }
    
    res.json({
      success: true,
      data: familyScore,
    });
  } catch (error) {
    console.error('Error calculating family score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate family score',
    });
  }
});

export default router;
```

### Step 4.2: Register Routes in App

📁 **File**: `server/src/app.ts` or `server/src/index.ts`

🔍 **FIND** the route imports section and **ADD**:

```typescript
import dodScoringRoutes from './routes/dodScoring';
```

🔍 **FIND** the route registration section and **ADD**:

```typescript
app.use('/api/dod-score', dodScoringRoutes);
```

### Step 4.3: Update Controls Endpoint to Include DoD Fields

📁 **File**: `server/src/routes/controls.ts` (or wherever controls routes are defined)

Ensure the control response includes the new DoD fields. The Prisma query should already return them, but verify the response type includes:

```typescript
interface ControlResponse {
  id: number;
  controlId: string;
  title: string;
  family: string;
  // ... existing fields ...
  
  // DoD scoring fields
  dodPoints: number;
  dodSpecialScoring: boolean;
  dodNaAllowed: boolean;
  dodRev2Mapping: string | null;
  dodMappingType: string | null;
}
```

---

## Phase 5: Dashboard DoD Score Card

### Step 5.1: Create DoD Score Types

📁 **File**: `client/src/types/dodScore.ts`

```typescript
export interface DoDScoreSummary {
  currentScore: number;
  maxScore: number;
  minScore: number;
  pointsDeducted: number;
  verifiedControls: number;
  totalControls: number;
  compliancePercentage: number;
  scoreColor: 'success' | 'warning' | 'error';
  scoreLabel: string;
}

export interface DoDScoreBreakdown {
  fivePointControls: { total: number; compliant: number; deducted: number };
  threePointControls: { total: number; compliant: number; deducted: number };
  onePointControls: { total: number; compliant: number; deducted: number };
  zeroPointControls: { total: number; compliant: number };
}

export interface FamilyScore {
  family: string;
  familyName: string;
  totalControls: number;
  totalPoints: number;
  compliantControls: number;
  pointsDeducted: number;
  compliancePercentage: number;
}

export interface SpecialScoringControl {
  controlId: string;
  title: string;
  dodPoints: number;
  status: string;
  isCompliant: boolean;
  specialType: 'MFA' | 'FIPS' | 'NA_ALLOWED';
  note: string;
}

export interface DoDScoreResult {
  maxScore: number;
  minScore: number;
  currentScore: number;
  totalWeightedPoints: number;
  pointsDeducted: number;
  verifiedControls: number;
  notApplicableControls: number;
  nonCompliantControls: number;
  totalControls: number;
  compliancePercentage: number;
  sprsScore: number;
  scoreBreakdown: DoDScoreBreakdown;
  familyScores: FamilyScore[];
  specialScoringControls: SpecialScoringControl[];
  scoreColor: 'success' | 'warning' | 'error';
  scoreLabel: string;
}
```

### Step 5.2: Create DoD Score API Hook

📁 **File**: `client/src/hooks/useDoDScore.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { DoDScoreSummary, DoDScoreResult } from '../types/dodScore';

const API_BASE = '/api/dod-score';

export function useDoDScoreSummary() {
  const [data, setData] = useState<DoDScoreSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScore = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}/summary`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch DoD score');
      }
    } catch (err) {
      setError('Network error fetching DoD score');
      console.error('DoD score fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  return { data, loading, error, refetch: fetchScore };
}

export function useDoDScoreDetails() {
  const [data, setData] = useState<DoDScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScore = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(API_BASE);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch DoD score details');
      }
    } catch (err) {
      setError('Network error fetching DoD score details');
      console.error('DoD score details fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  return { data, loading, error, refetch: fetchScore };
}
```

### Step 5.3: Create DoD Score Card Component

📁 **File**: `client/src/components/Dashboard/DoDScoreCard.tsx`

```typescript
import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Tooltip,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useDoDScoreSummary } from '../../hooks/useDoDScore';

const DoDScoreCard: React.FC = () => {
  const { data, loading, error } = useDoDScoreSummary();

  if (loading) {
    return (
      <Card sx={{ height: '100%', bgcolor: 'background.paper' }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card sx={{ height: '100%', bgcolor: 'background.paper' }}>
        <CardContent>
          <Alert severity="error">{error || 'Failed to load DoD score'}</Alert>
        </CardContent>
      </Card>
    );
  }

  // Calculate progress percentage (handle negative scores)
  const scoreRange = data.maxScore - data.minScore; // 97 - (-195) = 292
  const scoreFromMin = data.currentScore - data.minScore; // currentScore - (-195)
  const progressPercent = Math.max(0, Math.min(100, (scoreFromMin / scoreRange) * 100));

  // Color mapping
  const colorMap = {
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
  };

  const scoreColor = colorMap[data.scoreColor] || colorMap.warning;

  return (
    <Card sx={{ height: '100%', bgcolor: 'background.paper' }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SecurityIcon sx={{ color: scoreColor, mr: 1 }} />
          <Typography variant="h6" component="div">
            DoD Assessment Score
          </Typography>
          <Tooltip title="SPRS Score for DFARS 252.204-7012 compliance">
            <Chip
              label="SPRS"
              size="small"
              sx={{ ml: 'auto', bgcolor: 'rgba(255,255,255,0.1)' }}
            />
          </Tooltip>
        </Box>

        {/* Main Score Display */}
        <Box sx={{ textAlign: 'center', my: 3 }}>
          <Typography
            variant="h2"
            component="div"
            sx={{ fontWeight: 'bold', color: scoreColor }}
          >
            {data.currentScore}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            out of {data.maxScore} (min: {data.minScore})
          </Typography>
          <Chip
            label={data.scoreLabel}
            size="small"
            sx={{ mt: 1, bgcolor: scoreColor, color: 'white' }}
          />
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': {
                bgcolor: scoreColor,
                borderRadius: 5,
              },
            }}
          />
        </Box>

        {/* Stats */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Verified Controls
            </Typography>
            <Typography variant="h6">
              {data.verifiedControls} / {data.totalControls}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Points Deducted
            </Typography>
            <Typography variant="h6" sx={{ color: data.pointsDeducted > 0 ? '#f44336' : '#4caf50' }}>
              {data.pointsDeducted > 0 ? (
                <>
                  <TrendingDownIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                  -{data.pointsDeducted}
                </>
              ) : (
                <>
                  <TrendingUpIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                  0
                </>
              )}
            </Typography>
          </Box>
        </Box>

        {/* Compliance Percentage */}
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Typography variant="body2" color="text.secondary" align="center">
            {data.compliancePercentage}% of controls verified
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default DoDScoreCard;
```

### Step 5.4: Add DoD Score Card to Dashboard

📁 **File**: `client/src/pages/Dashboard.tsx` (or wherever the dashboard is)

🔍 **FIND** the imports section and **ADD**:

```typescript
import DoDScoreCard from '../components/Dashboard/DoDScoreCard';
```

🔍 **FIND** where dashboard cards are rendered and **ADD** the DoDScoreCard:

```tsx
<Grid item xs={12} md={4}>
  <DoDScoreCard />
</Grid>
```

---

## Phase 6: Control Library & Detail Updates

### Step 6.1: Update Control Library Table Columns

📁 **File**: `client/src/components/Controls/ControlLibrary.tsx` (or similar)

🔍 **FIND** the table column definitions and **ADD** a DoD Points column:

```typescript
// Add to column definitions
{
  field: 'dodPoints',
  headerName: 'DoD Pts',
  width: 80,
  align: 'center',
  headerAlign: 'center',
  renderCell: (params) => {
    const points = params.value as number;
    const color = points === 5 ? '#f44336' : points === 3 ? '#ff9800' : '#4caf50';
    return (
      <Chip
        label={points}
        size="small"
        sx={{
          bgcolor: color,
          color: 'white',
          fontWeight: 'bold',
          minWidth: 32,
        }}
      />
    );
  },
},
```

### Step 6.2: Update Control Detail Overview

📁 **File**: `client/src/components/Controls/ControlDetail.tsx` (or similar)

🔍 **FIND** the control overview section and **ADD** DoD scoring information:

```tsx
{/* DoD Assessment Scoring Section */}
<Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
    <SecurityIcon sx={{ mr: 1 }} />
    DoD Assessment Scoring
  </Typography>
  
  <Grid container spacing={2}>
    <Grid item xs={6} md={3}>
      <Typography variant="body2" color="text.secondary">
        Penalty Points
      </Typography>
      <Chip
        label={`${control.dodPoints} pts`}
        sx={{
          bgcolor: control.dodPoints === 5 ? '#f44336' :
                   control.dodPoints === 3 ? '#ff9800' : '#4caf50',
          color: 'white',
          fontWeight: 'bold',
        }}
      />
    </Grid>
    
    <Grid item xs={6} md={3}>
      <Typography variant="body2" color="text.secondary">
        Requirement Type
      </Typography>
      <Typography variant="body1">
        {control.requirementType || 'N/A'}
      </Typography>
    </Grid>
    
    <Grid item xs={6} md={3}>
      <Typography variant="body2" color="text.secondary">
        Rev 2 Mapping
      </Typography>
      <Typography variant="body1">
        {control.dodRev2Mapping || 'New in Rev 3'}
      </Typography>
    </Grid>
    
    <Grid item xs={6} md={3}>
      <Typography variant="body2" color="text.secondary">
        Mapping Type
      </Typography>
      <Chip
        label={control.dodMappingType || 'Direct'}
        size="small"
        variant="outlined"
      />
    </Grid>
  </Grid>

  {/* Special Scoring Indicators */}
  {control.dodSpecialScoring && (
    <Alert severity="info" sx={{ mt: 2 }}>
      <Typography variant="body2">
        <strong>Special Scoring:</strong>{' '}
        {control.controlId === '03.05.03'
          ? 'MFA: 5pts if none, 3pts if partial, 0pts if all users'
          : 'FIPS Crypto: 5pts if none, 3pts if non-FIPS, 0pts if FIPS-validated'}
      </Typography>
    </Alert>
  )}
  
  {control.dodNaAllowed && (
    <Alert severity="warning" sx={{ mt: 2 }}>
      <Typography variant="body2">
        <strong>N/A Allowed:</strong> This control can be marked Not Applicable if the
        capability is not used AND a policy prevents inadvertent enablement.
      </Typography>
    </Alert>
  )}
</Box>
```

---

## Verification Checklist

### Database Verification

```bash
cd server
npx prisma studio
```

- [ ] Control table has `dodPoints` column (values: 0, 1, 3, 5)
- [ ] Control table has `dodSpecialScoring` column (boolean)
- [ ] Control table has `dodNaAllowed` column (boolean)
- [ ] Control table has `dodRev2Mapping` column (string)
- [ ] Control table has `dodMappingType` column (string)
- [ ] All 97 controls have DoD scoring data populated

### API Verification

```bash
# Test DoD score endpoint
curl http://localhost:3001/api/dod-score | jq

# Test summary endpoint
curl http://localhost:3001/api/dod-score/summary | jq

# Test family endpoint
curl http://localhost:3001/api/dod-score/family/AC | jq
```

**Expected `/api/dod-score/summary` response**:
```json
{
  "success": true,
  "data": {
    "currentScore": 97,
    "maxScore": 97,
    "minScore": -195,
    "pointsDeducted": 0,
    "verifiedControls": 0,
    "totalControls": 97,
    "compliancePercentage": 0,
    "scoreColor": "error",
    "scoreLabel": "Critical"
  }
}
```

### UI Verification

- [ ] Dashboard displays DoD Score Card
- [ ] Score shows correctly (starts at 97 if no controls verified, goes down as controls are not verified)
- [ ] Control Library shows "DoD Pts" column
- [ ] Control Detail shows DoD Assessment Scoring section
- [ ] Special scoring controls show appropriate alerts
- [ ] N/A allowed controls show appropriate alerts

### Point Distribution Verification

Run this SQL query in Prisma Studio or via script:

```sql
SELECT 
  dodPoints,
  COUNT(*) as count,
  SUM(dodPoints) as totalPoints
FROM Control
GROUP BY dodPoints
ORDER BY dodPoints DESC;
```

**Expected Results**:
| dodPoints | count | totalPoints |
|-----------|-------|-------------|
| 5 | 40 | 200 |
| 3 | 18 | 54 |
| 1 | 38 | 38 |
| 0 | 1 | 0 |

**Total**: 97 controls, 292 weighted points

---

## Troubleshooting

### Common Issues

1. **"Column does not exist" error**
   - Run `npx prisma migrate dev` to apply schema changes
   - Run `npx prisma generate` to regenerate client

2. **DoD scores not showing**
   - Verify seed script ran successfully
   - Check that all 97 controls exist in database
   - Verify API endpoint is registered in app

3. **Score calculation incorrect**
   - Verify point distribution with SQL query above
   - Check that only "Verified" and "Not Applicable" statuses count as compliant

4. **TypeScript errors in frontend**
   - Ensure `dodScore.ts` types are exported
   - Update any existing Control type definitions to include new fields

---

## Summary

This implementation adds complete DoD Assessment Methodology scoring to your NIST 800-171 Rev 3 compliance application:

| Component | File(s) |
|-----------|---------|
| Database Schema | `server/prisma/schema.prisma` |
| Seed Script | `server/prisma/seedDodScoring.ts` |
| Score Service | `server/src/services/dodScoringService.ts` |
| API Routes | `server/src/routes/dodScoring.ts` |
| Types | `client/src/types/dodScore.ts` |
| Hooks | `client/src/hooks/useDoDScore.ts` |
| Dashboard Card | `client/src/components/Dashboard/DoDScoreCard.tsx` |
| Control Library | Updated column definitions |
| Control Detail | Updated overview section |

**Key Features**:
- Real-time SPRS score calculation
- Score breakdown by point value and family
- Special scoring handling for MFA and FIPS crypto
- N/A allowed control tracking
- Visual score indicators with color coding
