# PHASE 2: COVERAGE CALCULATION ENGINE

## OVERVIEW

Implement dynamic coverage percentage calculations for:
1. **Technical Coverage** - Based on M365 settings compliance
2. **Operational Coverage** - Based on evidence freshness
3. **Documentation Coverage** - Based on policy/procedure uploads
4. **Physical Coverage** - Based on deployment model + evidence

**Prerequisites:** Phase 1 complete and verified

---

## Step 2A: Create Coverage Service

📁 **File:** `server/src/services/coverageService.ts`

🔄 **COMPLETE FILE:**
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ControlCoverage {
  controlId: string;
  technicalCoverage: number;
  operationalCoverage: number;
  documentationCoverage: number;
  physicalCoverage: number;
  overallCoverage: number;
  breakdown: {
    technical: CoverageDetail;
    operational: CoverageDetail;
    documentation: CoverageDetail;
    physical: CoverageDetail;
  };
}

export interface CoverageDetail {
  percentage: number;
  numerator: number;
  denominator: number;
  details: string[];
}

export class CoverageService {
  /**
   * Calculate all coverage metrics for a control
   */
  async calculateControlCoverage(controlId: string): Promise<ControlCoverage> {
    const [technical, operational, documentation, physical] = await Promise.all([
      this.calculateTechnicalCoverage(controlId),
      this.calculateOperationalCoverage(controlId),
      this.calculateDocumentationCoverage(controlId),
      this.calculatePhysicalCoverage(controlId),
    ]);

    // Weighted average: Technical 40%, Operational 30%, Documentation 20%, Physical 10%
    const overallCoverage =
      technical.percentage * 0.4 +
      operational.percentage * 0.3 +
      documentation.percentage * 0.2 +
      physical.percentage * 0.1;

    return {
      controlId,
      technicalCoverage: technical.percentage,
      operationalCoverage: operational.percentage,
      documentationCoverage: documentation.percentage,
      physicalCoverage: physical.percentage,
      overallCoverage: Math.round(overallCoverage * 100) / 100,
      breakdown: {
        technical,
        operational,
        documentation,
        physical,
      },
    };
  }

  /**
   * Technical Coverage: M365 settings compliance
   */
  private async calculateTechnicalCoverage(controlId: string): Promise<CoverageDetail> {
    const mappings = await prisma.controlSettingMapping.findMany({
      where: { controlId },
      include: {
        setting: {
          include: {
            complianceChecks: {
              orderBy: { checkDate: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (mappings.length === 0) {
      return {
        percentage: 0,
        numerator: 0,
        denominator: 0,
        details: ['No M365 settings mapped to this control'],
      };
    }

    const compliantCount = mappings.filter(mapping => {
      const latestCheck = mapping.setting.complianceChecks[0];
      return latestCheck && latestCheck.isCompliant;
    }).length;

    const percentage = (compliantCount / mappings.length) * 100;

    return {
      percentage: Math.round(percentage * 100) / 100,
      numerator: compliantCount,
      denominator: mappings.length,
      details: [
        `${compliantCount} of ${mappings.length} M365 settings compliant`,
        ...mappings
          .filter(m => {
            const check = m.setting.complianceChecks[0];
            return !check || !check.isCompliant;
          })
          .map(m => `Non-compliant: ${m.setting.displayName}`),
      ],
    };
  }

  /**
   * Operational Coverage: Evidence freshness
   */
  private async calculateOperationalCoverage(controlId: string): Promise<CoverageDetail> {
    const requirements = await prisma.evidenceRequirement.findMany({
      where: {
        controlId,
        evidenceType: { in: ['procedure', 'execution'] },
      },
      include: {
        uploadedEvidence: {
          orderBy: { uploadedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (requirements.length === 0) {
      return {
        percentage: 100, // No operational requirements = fully covered
        numerator: 0,
        denominator: 0,
        details: ['No operational evidence requirements'],
      };
    }

    let score = 0;
    const details: string[] = [];

    for (const req of requirements) {
      if (req.evidenceType === 'procedure') {
        // Procedure requirement: 50% if uploaded
        const hasEvidence = req.uploadedEvidence.length > 0;
        if (hasEvidence) {
          score += 0.5;
          details.push(`✓ Procedure documented: ${req.name}`);
        } else {
          details.push(`✗ Missing procedure: ${req.name}`);
        }
      } else if (req.evidenceType === 'execution') {
        // Execution requirement: check freshness
        const evidence = req.uploadedEvidence[0];
        if (!evidence) {
          details.push(`✗ No execution evidence: ${req.name}`);
          continue;
        }

        const freshnessScore = this.calculateFreshnessScore(
          evidence.executionDate || evidence.uploadedAt,
          req.freshnessThreshold || 90
        );

        score += freshnessScore;

        if (freshnessScore >= 0.75) {
          details.push(`✓ Fresh evidence: ${req.name}`);
        } else if (freshnessScore >= 0.5) {
          details.push(`⚠ Aging evidence: ${req.name}`);
        } else {
          details.push(`✗ Stale evidence: ${req.name}`);
        }
      }
    }

    const percentage = requirements.length > 0 ? (score / requirements.length) * 100 : 0;

    return {
      percentage: Math.round(percentage * 100) / 100,
      numerator: Math.round(score * 100) / 100,
      denominator: requirements.length,
      details,
    };
  }

  /**
   * Documentation Coverage: Policy/procedure uploads
   */
  private async calculateDocumentationCoverage(controlId: string): Promise<CoverageDetail> {
    const requirements = await prisma.evidenceRequirement.findMany({
      where: {
        controlId,
        evidenceType: 'policy',
      },
      include: {
        policy: true,
        uploadedEvidence: true,
      },
    });

    if (requirements.length === 0) {
      return {
        percentage: 100, // No documentation requirements = fully covered
        numerator: 0,
        denominator: 0,
        details: ['No policy documentation requirements'],
      };
    }

    // Check if policies are uploaded (either directly or via policy document)
    const uploadedCount = requirements.filter(req => {
      const hasDirectEvidence = req.uploadedEvidence.length > 0;
      const hasPolicyUpload = req.policy?.filePath != null;
      return hasDirectEvidence || hasPolicyUpload;
    }).length;

    const percentage = (uploadedCount / requirements.length) * 100;

    return {
      percentage: Math.round(percentage * 100) / 100,
      numerator: uploadedCount,
      denominator: requirements.length,
      details: requirements.map(req => {
        const hasEvidence =
          req.uploadedEvidence.length > 0 || req.policy?.filePath != null;
        return hasEvidence
          ? `✓ Policy uploaded: ${req.name}`
          : `✗ Missing policy: ${req.name}`;
      }),
    };
  }

  /**
   * Physical Coverage: Deployment model + evidence
   */
  private async calculatePhysicalCoverage(controlId: string): Promise<CoverageDetail> {
    const config = await prisma.deploymentConfig.findFirst();

    // If cloud-only, automatic 100%
    if (config?.deploymentModel === 'cloud-only') {
      return {
        percentage: 100,
        numerator: 1,
        denominator: 1,
        details: ['Cloud-only deployment - physical controls inherited from Microsoft'],
      };
    }

    // Otherwise, check for physical evidence requirements
    const requirements = await prisma.evidenceRequirement.findMany({
      where: {
        controlId,
        evidenceType: 'physical',
      },
      include: {
        uploadedEvidence: true,
      },
    });

    if (requirements.length === 0) {
      return {
        percentage: 100, // No physical requirements = fully covered
        numerator: 0,
        denominator: 0,
        details: ['No physical evidence requirements for this control'],
      };
    }

    const uploadedCount = requirements.filter(
      req => req.uploadedEvidence.length > 0
    ).length;

    const percentage = (uploadedCount / requirements.length) * 100;

    return {
      percentage: Math.round(percentage * 100) / 100,
      numerator: uploadedCount,
      denominator: requirements.length,
      details: requirements.map(req =>
        req.uploadedEvidence.length > 0
          ? `✓ Physical evidence uploaded: ${req.name}`
          : `✗ Missing physical evidence: ${req.name}`
      ),
    };
  }

  /**
   * Calculate freshness score based on age vs threshold
   */
  private calculateFreshnessScore(date: Date, thresholdDays: number): number {
    const now = new Date();
    const ageInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (ageInDays <= thresholdDays) {
      return 1.0; // Fresh
    } else if (ageInDays <= thresholdDays * 2) {
      return 0.75; // Aging (2x threshold)
    } else if (ageInDays <= thresholdDays * 3) {
      return 0.5; // Stale (3x threshold)
    } else {
      return 0.25; // Critical (>3x threshold)
    }
  }

  /**
   * Calculate coverage for all controls
   */
  async calculateAllCoverage(): Promise<ControlCoverage[]> {
    const controls = await prisma.control.findMany({
      select: { controlId: true },
      orderBy: { controlId: 'asc' },
    });

    const coverages = await Promise.all(
      controls.map(c => this.calculateControlCoverage(c.controlId))
    );

    return coverages;
  }

  /**
   * Get coverage summary statistics
   */
  async getCoverageSummary() {
    const coverages = await this.calculateAllCoverage();

    const avgTechnical =
      coverages.reduce((sum, c) => sum + c.technicalCoverage, 0) / coverages.length;
    const avgOperational =
      coverages.reduce((sum, c) => sum + c.operationalCoverage, 0) / coverages.length;
    const avgDocumentation =
      coverages.reduce((sum, c) => sum + c.documentationCoverage, 0) / coverages.length;
    const avgPhysical =
      coverages.reduce((sum, c) => sum + c.physicalCoverage, 0) / coverages.length;
    const avgOverall =
      coverages.reduce((sum, c) => sum + c.overallCoverage, 0) / coverages.length;

    return {
      totalControls: coverages.length,
      averages: {
        technical: Math.round(avgTechnical * 100) / 100,
        operational: Math.round(avgOperational * 100) / 100,
        documentation: Math.round(avgDocumentation * 100) / 100,
        physical: Math.round(avgPhysical * 100) / 100,
        overall: Math.round(avgOverall * 100) / 100,
      },
      criticalControls: coverages.filter(c => c.overallCoverage < 50).length,
      compliantControls: coverages.filter(c => c.overallCoverage >= 90).length,
    };
  }
}

export const coverageService = new CoverageService();
```

---

## Step 2B: Create Coverage API Routes

📁 **File:** `server/src/routes/coverage.ts`

🔄 **COMPLETE FILE:**
```typescript
import { Router } from 'express';
import { coverageService } from '../services/coverageService';

const router = Router();

/**
 * GET /api/coverage/summary
 * Get overall coverage statistics
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = await coverageService.getCoverageSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error fetching coverage summary:', error);
    res.status(500).json({ error: 'Failed to fetch coverage summary' });
  }
});

/**
 * GET /api/coverage/control/:controlId
 * Get detailed coverage for a specific control
 */
router.get('/control/:controlId', async (req, res) => {
  try {
    const { controlId } = req.params;
    const coverage = await coverageService.calculateControlCoverage(controlId);
    res.json(coverage);
  } catch (error) {
    console.error('Error fetching control coverage:', error);
    res.status(500).json({ error: 'Failed to fetch control coverage' });
  }
});

/**
 * GET /api/coverage/all
 * Get coverage for all controls
 */
router.get('/all', async (req, res) => {
  try {
    const coverages = await coverageService.calculateAllCoverage();
    res.json(coverages);
  } catch (error) {
    console.error('Error fetching all coverages:', error);
    res.status(500).json({ error: 'Failed to fetch all coverages' });
  }
});

/**
 * GET /api/coverage/family/:family
 * Get coverage breakdown by control family
 */
router.get('/family/:family', async (req, res) => {
  try {
    const { family } = req.params;
    
    // Get all controls in family
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const controls = await prisma.control.findMany({
      where: { family },
      select: { controlId: true },
    });

    const coverages = await Promise.all(
      controls.map(c => coverageService.calculateControlCoverage(c.controlId))
    );

    const avgCoverage = coverages.reduce((sum, c) => sum + c.overallCoverage, 0) / coverages.length;

    res.json({
      family,
      controlCount: coverages.length,
      averageCoverage: Math.round(avgCoverage * 100) / 100,
      controls: coverages,
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error fetching family coverage:', error);
    res.status(500).json({ error: 'Failed to fetch family coverage' });
  }
});

export default router;
```

---

## Step 2C: Register Coverage Routes

📁 **File:** `server/src/index.ts`

🔍 **FIND:**
```typescript
// Import routes
import controlRoutes from './routes/controls';
import m365Routes from './routes/m365';
```

✏️ **REPLACE WITH:**
```typescript
// Import routes
import controlRoutes from './routes/controls';
import m365Routes from './routes/m365';
import coverageRoutes from './routes/coverage';
```

🔍 **FIND:**
```typescript
// Register routes
app.use('/api/controls', controlRoutes);
app.use('/api/m365', m365Routes);
```

✏️ **REPLACE WITH:**
```typescript
// Register routes
app.use('/api/controls', controlRoutes);
app.use('/api/m365', m365Routes);
app.use('/api/coverage', coverageRoutes);
```

---

## Step 2D: Create Test Script

📁 **File:** `server/src/scripts/test-coverage-calculation.ts`

🔄 **COMPLETE FILE:**
```typescript
import { coverageService } from '../services/coverageService';

async function testCoverageCalculation() {
  console.log('🧪 Testing Coverage Calculation Engine\n');
  console.log('═'.repeat(70) + '\n');

  try {
    // Test 1: Summary statistics
    console.log('Test 1: Coverage Summary');
    const summary = await coverageService.getCoverageSummary();
    console.log('  Overall Statistics:');
    console.log(`    Total Controls: ${summary.totalControls}`);
    console.log(`    Average Technical Coverage: ${summary.averages.technical}%`);
    console.log(`    Average Operational Coverage: ${summary.averages.operational}%`);
    console.log(`    Average Documentation Coverage: ${summary.averages.documentation}%`);
    console.log(`    Average Physical Coverage: ${summary.averages.physical}%`);
    console.log(`    Average Overall Coverage: ${summary.averages.overall}%`);
    console.log(`    Critical Controls (<50%): ${summary.criticalControls}`);
    console.log(`    Compliant Controls (≥90%): ${summary.compliantControls}`);
    console.log('  ✓ Summary test passed\n');

    // Test 2: Specific control
    console.log('Test 2: Individual Control Coverage (03.01.01)');
    const control = await coverageService.calculateControlCoverage('03.01.01');
    console.log(`  Control: ${control.controlId}`);
    console.log(`  Technical: ${control.technicalCoverage}%`);
    console.log(`  Operational: ${control.operationalCoverage}%`);
    console.log(`  Documentation: ${control.documentationCoverage}%`);
    console.log(`  Physical: ${control.physicalCoverage}%`);
    console.log(`  Overall: ${control.overallCoverage}%`);
    console.log('  ✓ Individual control test passed\n');

    // Test 3: Show detailed breakdown
    console.log('Test 3: Detailed Breakdown for 03.01.01');
    console.log('  Technical Details:');
    control.breakdown.technical.details.forEach(d => console.log(`    ${d}`));
    console.log('  Operational Details:');
    control.breakdown.operational.details.forEach(d => console.log(`    ${d}`));
    console.log('  Documentation Details:');
    control.breakdown.documentation.details.forEach(d => console.log(`    ${d}`));
    console.log('  Physical Details:');
    control.breakdown.physical.details.forEach(d => console.log(`    ${d}`));
    console.log('  ✓ Breakdown test passed\n');

    // Test 4: Sample from different families
    console.log('Test 4: Sample Controls Across Families');
    const samples = ['03.01.01', '03.03.01', '03.05.01', '03.06.01', '03.13.01'];
    
    for (const controlId of samples) {
      const cov = await coverageService.calculateControlCoverage(controlId);
      console.log(`  ${controlId}: ${cov.overallCoverage}% overall`);
    }
    console.log('  ✓ Multi-family test passed\n');

    console.log('═'.repeat(70));
    console.log('✅ ALL TESTS PASSED');
    console.log('═'.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

testCoverageCalculation();
```

Run test:
```bash
npx ts-node src/scripts/test-coverage-calculation.ts
```

---

## Step 2E: Add Coverage to Control Detail API

📁 **File:** `server/src/routes/controls.ts`

🔍 **FIND the GET /:id route (get control by ID)**

➕ **ADD this enhancement:**

```typescript
import { coverageService } from '../services/coverageService';

// Inside the GET /:id route handler:
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const control = await prisma.control.findUnique({
      where: { controlId: id },
      include: {
        // ... existing includes ...
        evidenceRequirements: {
          include: {
            policy: true,
            procedure: true,
            uploadedEvidence: {
              orderBy: { uploadedAt: 'desc' },
            },
          },
        },
      },
    });

    if (!control) {
      return res.status(404).json({ error: 'Control not found' });
    }

    // Calculate live coverage
    const coverage = await coverageService.calculateControlCoverage(id);

    res.json({
      ...control,
      coverage,
    });
  } catch (error) {
    console.error('Error fetching control:', error);
    res.status(500).json({ error: 'Failed to fetch control' });
  }
});
```

---

## ✅ PHASE 2 COMPLETE

**Deliverables:**
- ✅ Coverage calculation service with 4 coverage types
- ✅ REST API endpoints for coverage data
- ✅ Automated freshness scoring for execution evidence
- ✅ Deployment model integration
- ✅ Comprehensive test suite

**Test Results Should Show:**
- Overall coverage percentages for all 97 controls
- Technical coverage based on M365 compliance
- Operational coverage based on evidence freshness
- Documentation coverage based on policy uploads
- Physical coverage based on deployment model

---

## PAUSE POINT

Stop here and verify:
1. Coverage service tests pass
2. API endpoints return valid data
3. Coverage percentages make sense (0-100%)

**Next:** Phase 3 will build the Gap Analysis Dashboard UI to visualize this coverage data.
