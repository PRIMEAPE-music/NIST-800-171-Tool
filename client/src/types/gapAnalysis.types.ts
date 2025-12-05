export interface ControlCoverageWithMetadata {
  id: number;
  controlId: string;
  title: string;
  dodPoints: number;
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

export type SortColumn = 'controlId' | 'title' | 'dodPoints' | 'overallCoverage';
export type SortDirection = 'asc' | 'desc';

export interface GapItem {
  id: number | string;
  name: string;
  description?: string;
  rationale?: string;
  frequency?: string;
  freshnessStatus?: 'missing' | 'fresh' | 'aging' | 'stale' | 'critical';
}

export interface ControlGapBreakdown {
  missingPolicies: GapItem[];
  missingProcedures: GapItem[];
  missingEvidence: GapItem[];
  missingSettings: GapItem[];
  operationalActivities: string[];
}
