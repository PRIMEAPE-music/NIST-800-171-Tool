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
