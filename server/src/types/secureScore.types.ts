// Microsoft Secure Score Types

/**
 * Secure Score data from Microsoft Graph API
 * API: GET /security/secureScores
 */
export interface SecureScore {
  id: string;
  azureTenantId: string;
  activeUserCount: number;
  createdDateTime: string;
  currentScore: number;
  maxScore: number;
  averageComparativeScores: Array<{
    basis: string;
    averageScore: number;
  }>;
  enabledServices: string[];
  licensedUserCount: number;
  controlScores: ControlScore[];
}

/**
 * Individual control score information
 */
export interface ControlScore {
  controlName: string;
  controlCategory: string;
  score: number;
  description?: string;
}

/**
 * Secure Score Control Profile
 * API: GET /security/secureScoreControlProfiles
 */
export interface SecureScoreControlProfile {
  id: string;
  azureTenantId: string;
  actionType: string;
  actionUrl?: string;
  controlCategory: string;
  title: string;
  deprecated: boolean;
  implementationCost: string; // 'Low' | 'Moderate' | 'High'
  lastModifiedDateTime: string;
  maxScore: number;
  rank: number;
  remediation?: string;
  remediationImpact?: string;
  service: string;
  threats: string[];
  tier: string;
  userImpact: string; // 'Low' | 'Moderate' | 'High'
  complianceInformation?: Array<{
    certificationName: string;
    certificationControls: Array<{
      name: string;
      url?: string;
    }>;
  }>;
  controlStateUpdates?: Array<{
    assignedTo?: string;
    comment?: string;
    state: string;
    updatedBy?: string;
    updatedDateTime?: string;
  }>;
  vendorInformation?: {
    provider: string;
    providerVersion?: string;
    subProvider?: string;
    vendor: string;
  };
}

/**
 * Enriched recommendation combining static data with live Secure Score data
 */
export interface EnrichedRecommendation {
  title: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  category: string;
  description?: string;
  // Live data from Secure Score
  status?: 'Completed' | 'InProgress' | 'NotStarted' | 'Unknown';
  scoreImpact?: number;
  implementationCost?: string;
  userImpact?: string;
  implementationUrl?: string;
  lastUpdated?: string;
  completedDate?: string;
  assignedTo?: string;
  stateComment?: string;
}

/**
 * Secure Score summary data
 */
export interface SecureScoreSummary {
  currentScore: number;
  maxScore: number;
  percentage: number;
  activeUserCount: number;
  licensedUserCount: number;
  enabledServices: string[];
  lastUpdated: string;
  controlProfiles: SecureScoreControlProfile[];
}

/**
 * Mapping between Secure Score control IDs and improvement action titles
 */
export interface SecureScoreMapping {
  secureScoreControlId: string;
  actionTitle: string;
  category: string;
  confidence: 'High' | 'Medium' | 'Low';
}

/**
 * Response from enriching recommendations with live data
 */
export interface EnrichRecommendationsResponse {
  controlId: string;
  recommendations: EnrichedRecommendation[];
  scoreData?: {
    currentScore: number;
    maxScore: number;
    percentage: number;
  };
  lastSynced: string;
}
