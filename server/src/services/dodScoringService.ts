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
  // Fetch all controls with their DoD scoring data and status
  const controls = await prisma.control.findMany({
    include: {
      status: true,
    },
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
    // Get the status from the related ControlStatus model
    const controlStatus = control.status?.status || 'Not Started';

    const isCompliant = COMPLIANT_STATUSES.includes(controlStatus);
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
        status: controlStatus,
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
        status: controlStatus,
        isCompliant,
        specialType: 'NA_ALLOWED',
        note: 'Can be N/A if capability not used and policy prevents enablement',
      });
    }

    // Count by status
    if (controlStatus === 'Verified') {
      verifiedCount++;
    } else if (controlStatus === 'Not Applicable') {
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
