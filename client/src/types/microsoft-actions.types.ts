export interface MicrosoftImprovementAction {
  id: number;
  actionId: string;
  actionTitle: string;
  confidence: 'High' | 'Medium' | 'Low';
  coverageLevel: 'Full' | 'Partial' | 'Supplementary';
  isPrimary: boolean;
  mappingRationale: string;
  nistRequirement: string;
}

export interface ImprovementActionsStats {
  totalActions: number;
  totalMappings: number;
  controlsWithActions: number;
}

export interface ImprovementActionsResponse {
  success: boolean;
  data: MicrosoftImprovementAction[];
}

export interface ImprovementActionsStatsResponse {
  success: boolean;
  data: ImprovementActionsStats;
}
