// Assessment-related TypeScript interfaces and types

export interface AssessmentCreateDto {
  controlId: number;
  isImplemented: boolean;
  hasEvidence: boolean;
  isTested: boolean;
  meetsRequirement: boolean;
  assessorNotes?: string;
}

export interface AssessmentUpdateDto {
  isImplemented?: boolean;
  hasEvidence?: boolean;
  isTested?: boolean;
  meetsRequirement?: boolean;
  assessorNotes?: string;
  riskScore?: number;
}

export interface AssessmentResponseDto {
  id: number;
  controlId: number;
  controlNumber: string; // e.g., "03.01.01"
  controlTitle: string;
  assessmentDate: Date;
  isImplemented: boolean;
  hasEvidence: boolean;
  isTested: boolean;
  meetsRequirement: boolean;
  riskScore: number;
  assessorNotes?: string;
  createdAt: Date;
}

export interface AssessmentStatsDto {
  totalControls: number;
  assessedControls: number;
  implementedControls: number;
  controlsWithEvidence: number;
  testedControls: number;
  fullyCompliantControls: number;
  averageRiskScore: number;
  riskDistribution: {
    critical: number; // 76-100
    high: number; // 51-75
    medium: number; // 26-50
    low: number; // 0-25
  };
}

export interface GapAnalysisDto {
  controlId: number;
  controlNumber: string;
  controlTitle: string;
  family: string;
  priority: string;
  riskScore: number;
  isImplemented: boolean;
  hasEvidence: boolean;
  isTested: boolean;
  meetsRequirement: boolean;
  gapDescription: string;
}

export interface AssessmentComparisonDto {
  controlNumber: string;
  controlTitle: string;
  oldAssessment: {
    date: Date;
    riskScore: number;
    isImplemented: boolean;
  };
  newAssessment: {
    date: Date;
    riskScore: number;
    isImplemented: boolean;
  };
  improvement: number; // Difference in risk score
}

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface RiskFactors {
  priorityScore: number;
  implementationScore: number;
  evidenceScore: number;
  testingScore: number;
}
