import { graphClientService } from './graphClient.service';
import {
  ComplianceAssessment,
  ComplianceScoreSummary,
  ComplianceImprovementAction,
  EnrichedComplianceRecommendation,
  EnrichComplianceRecommendationsResponse,
  ComplianceSyncResult,
} from '../types/complianceManager.types';
import * as fs from 'fs';
import * as path from 'path';

class ComplianceManagerService {
  private cache: {
    assessments?: ComplianceAssessment[];
    nistAssessment?: any;
    improvementActions?: ComplianceImprovementAction[];
    lastUpdated?: Date;
  } = {};

  private readonly CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly IMPROVEMENT_ACTIONS_PATH = path.join(
    __dirname,
    '../../..',
    'data',
    'nist-improvement-actions.json'
  );

  /**
   * Fetch all compliance assessments from Microsoft Graph API
   * Tries multiple API endpoints to find the correct one
   */
  async fetchAssessments(): Promise<ComplianceAssessment[] | null> {
    try {
      console.log('🔍 Fetching Compliance Manager assessments...');

      // Try different possible API endpoints
      const endpoints = [
        '/compliance/manager/assessments',
        '/security/compliance/assessments',
        '/compliance/assessments',
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`   Trying endpoint: ${endpoint}`);
          const response = await graphClientService.get<{ value: any[] }>(endpoint);

          if (response.value && response.value.length > 0) {
            console.log(`   ✅ Found ${response.value.length} assessments at ${endpoint}`);
            return this.mapToComplianceAssessments(response.value);
          } else {
            console.log(`   ⚠️ Endpoint returned empty: ${endpoint}`);
          }
        } catch (error: any) {
          console.log(`   ❌ Endpoint ${endpoint} failed: ${error.message}`);
          if (error.statusCode === 403) {
            console.log(`   🔐 Permission error - you may need additional API permissions`);
          }
          // Continue to next endpoint
        }
      }

      // Try beta endpoint as last resort
      try {
        console.log('   Trying beta endpoint...');
        const betaResponse = await graphClientService.get<{ value: any[] }>(
          'https://graph.microsoft.com/beta/compliance/manager/assessments'
        );

        if (betaResponse.value && betaResponse.value.length > 0) {
          console.log(`   ✅ Found ${betaResponse.value.length} assessments at beta endpoint`);
          return this.mapToComplianceAssessments(betaResponse.value);
        } else {
          console.log(`   ⚠️ Beta endpoint returned empty`);
        }
      } catch (error: any) {
        console.log(`   ❌ Beta endpoint failed: ${error.message}`);
        if (error.statusCode === 403) {
          console.log(`   🔐 Permission error - you may need additional API permissions`);
        }
      }

      console.warn('⚠️ No Compliance Manager assessments found at any endpoint');
      console.warn('   This could mean:');
      console.warn('   1. No assessments created in Compliance Manager yet');
      console.warn('   2. Missing API permissions (check Azure AD app permissions)');
      console.warn('   3. Compliance Manager API not available for your tenant');
      return null;
    } catch (error) {
      console.error('❌ Error fetching Compliance Manager assessments:', error);
      throw new Error(`Failed to fetch Compliance Manager assessments: ${error}`);
    }
  }

  /**
   * Map raw API response to ComplianceAssessment interface
   */
  private mapToComplianceAssessments(rawAssessments: any[]): ComplianceAssessment[] {
    return rawAssessments.map((assessment) => ({
      id: assessment.id,
      displayName: assessment.displayName || assessment.name || 'Unknown Assessment',
      description: assessment.description,
      creationDateTime: assessment.creationDateTime || assessment.createdDateTime,
      lastModifiedDateTime: assessment.lastModifiedDateTime || assessment.modifiedDateTime,
      assessmentTemplateId: assessment.assessmentTemplateId,
      status: this.mapStatus(assessment.status),
      score: assessment.score || assessment.complianceScore,
    }));
  }

  /**
   * Map various status formats to our standard format
   */
  private mapStatus(status: any): 'Active' | 'Inactive' | 'Draft' {
    if (!status) return 'Draft';
    const statusStr = typeof status === 'string' ? status.toLowerCase() : status.toString();

    if (statusStr.includes('active')) return 'Active';
    if (statusStr.includes('inactive')) return 'Inactive';
    return 'Draft';
  }

  /**
   * Find NIST 800-171 assessment (Rev 2 or Rev 3)
   */
  async getNISTAssessment(forceRefresh: boolean = false): Promise<any | null> {
    const { assessments } = await this.getComplianceData(forceRefresh);

    if (!assessments || assessments.length === 0) {
      console.warn('⚠️ No assessments available');
      console.warn('   Make sure you have created a NIST 800-171 assessment in Compliance Manager');
      return null;
    }

    console.log(`📋 Searching through ${assessments.length} assessments...`);
    assessments.forEach((a, idx) => {
      console.log(`   ${idx + 1}. "${a.displayName}" (Status: ${a.status})`);
    });

    // Search for NIST 800-171 assessment (flexible matching)
    const nistAssessment = assessments.find((assessment) => {
      const name = assessment.displayName.toLowerCase();
      return (
        (name.includes('nist') && name.includes('800')) ||
        (name.includes('nist') && name.includes('171')) ||
        name.includes('nist 800-171')
      );
    });

    if (nistAssessment) {
      console.log(`✅ Found NIST 800-171 assessment: "${nistAssessment.displayName}"`);
      console.log(`   Assessment ID: ${nistAssessment.id}`);
      console.log(`   Status: ${nistAssessment.status}`);
      return nistAssessment;
    }

    // Try to find any NIST assessment
    const anyNistAssessment = assessments.find((assessment) =>
      assessment.displayName.toLowerCase().includes('nist')
    );

    if (anyNistAssessment) {
      console.log(`✅ Found NIST assessment: "${anyNistAssessment.displayName}"`);
      console.log(`   Assessment ID: ${anyNistAssessment.id}`);
      return anyNistAssessment;
    }

    console.warn('⚠️ No NIST assessment found in Compliance Manager');
    console.warn('   Available assessments listed above');
    console.warn('   Assessment name must contain "NIST" and "800" or "171"');
    return null;
  }

  /**
   * Fetch improvement actions for an assessment
   */
  async fetchImprovementActions(assessmentId: string): Promise<ComplianceImprovementAction[]> {
    try {
      console.log(`Fetching improvement actions for assessment ${assessmentId}...`);

      // Try different possible endpoints
      const endpoints = [
        `/compliance/manager/assessments/${assessmentId}/improvementActions`,
        `/compliance/manager/improvementActions?$filter=assessmentId eq '${assessmentId}'`,
        `/compliance/manager/improvementActions`,
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          const response = await graphClientService.get<{ value: any[] }>(endpoint);

          if (response.value && response.value.length > 0) {
            console.log(`✅ Found ${response.value.length} improvement actions`);
            return this.mapToImprovementActions(response.value);
          }
        } catch (error: any) {
          console.log(`⚠️ Endpoint ${endpoint} failed: ${error.message}`);
          // Continue to next endpoint
        }
      }

      console.warn('⚠️ No improvement actions found');
      return [];
    } catch (error) {
      console.error('❌ Error fetching improvement actions:', error);
      throw new Error(`Failed to fetch improvement actions: ${error}`);
    }
  }

  /**
   * Map raw improvement actions to our interface
   */
  private mapToImprovementActions(rawActions: any[]): ComplianceImprovementAction[] {
    return rawActions.map((action) => ({
      id: action.id,
      title: action.title || action.displayName || 'Unknown Action',
      description: action.description,
      category: action.category || action.controlFamily || 'General',
      status: this.mapActionStatus(action.status || action.implementationStatus),
      points: action.score || action.points || 0,
      maxPoints: action.maxScore || action.maxPoints,
      implementationCost: action.implementationCost,
      userImpact: action.userImpact,
      implementationUrl: action.implementationUrl || action.actionUrl,
      controlMappings: action.controlMappings || action.relatedControls,
      dueDate: action.dueDate,
      assignedTo: action.assignedTo,
      completedDate: action.completedDate,
      lastModifiedDate: action.lastModifiedDateTime || action.modifiedDateTime,
      implementationStatus: action.implementationStatus,
      testStatus: action.testStatus,
      evidence: action.evidence || {
        required: false,
        uploaded: false,
        fileCount: 0,
      },
      isManaged: action.isManaged || action.managedBy === 'Microsoft',
    }));
  }

  /**
   * Map action status to our standard format
   */
  private mapActionStatus(
    status: any
  ): 'Completed' | 'InProgress' | 'NotStarted' | 'NotApplicable' | 'Unknown' {
    if (!status) return 'Unknown';
    const statusStr = typeof status === 'string' ? status.toLowerCase() : status.toString();

    if (statusStr.includes('completed') || statusStr.includes('complete')) return 'Completed';
    if (statusStr.includes('inprogress') || statusStr.includes('in progress'))
      return 'InProgress';
    if (statusStr.includes('notstarted') || statusStr.includes('not started')) return 'NotStarted';
    if (statusStr.includes('notapplicable') || statusStr.includes('not applicable'))
      return 'NotApplicable';

    return 'Unknown';
  }

  /**
   * Get Compliance Manager data from cache or fetch fresh data
   */
  async getComplianceData(forceRefresh: boolean = false): Promise<{
    assessments: ComplianceAssessment[] | null;
    nistAssessment: any | null;
    improvementActions: ComplianceImprovementAction[];
  }> {
    const isCacheValid =
      this.cache.lastUpdated &&
      Date.now() - this.cache.lastUpdated.getTime() < this.CACHE_DURATION_MS;

    if (!forceRefresh && isCacheValid && this.cache.assessments) {
      console.log('📦 Using cached Compliance Manager data');
      return {
        assessments: this.cache.assessments,
        nistAssessment: this.cache.nistAssessment || null,
        improvementActions: this.cache.improvementActions || [],
      };
    }

    console.log('🔄 Fetching fresh Compliance Manager data...');

    // Fetch assessments
    const assessments = await this.fetchAssessments();

    if (!assessments || assessments.length === 0) {
      // Update cache even if empty
      this.cache = {
        assessments: undefined,
        nistAssessment: undefined,
        improvementActions: [],
        lastUpdated: new Date(),
      };

      return {
        assessments: null,
        nistAssessment: null,
        improvementActions: [],
      };
    }

    // Find NIST assessment
    const nistAssessment = assessments.find(
      (assessment) =>
        assessment.displayName.toLowerCase().includes('nist') &&
        assessment.displayName.toLowerCase().includes('800-171')
    ) || assessments.find((assessment) =>
      assessment.displayName.toLowerCase().includes('nist')
    );

    // Fetch improvement actions if NIST assessment exists
    let improvementActions: ComplianceImprovementAction[] = [];
    if (nistAssessment) {
      improvementActions = await this.fetchImprovementActions(nistAssessment.id);
    }

    // Update cache
    this.cache = {
      assessments,
      nistAssessment,
      improvementActions,
      lastUpdated: new Date(),
    };

    return { assessments, nistAssessment, improvementActions };
  }

  /**
   * Get Compliance Score Summary
   */
  async getComplianceScoreSummary(
    forceRefresh: boolean = false
  ): Promise<ComplianceScoreSummary | null> {
    const { nistAssessment, improvementActions } = await this.getComplianceData(forceRefresh);

    if (!nistAssessment) {
      console.warn('⚠️ No NIST assessment found for score summary');
      return null;
    }

    // Calculate scores from improvement actions or use assessment score
    let totalScore = 0;
    let maxScore = 0;
    let yourPoints = 0;
    let yourMaxPoints = 0;
    let microsoftPoints = 0;
    let microsoftMaxPoints = 0;

    if (nistAssessment.score) {
      // Use score from assessment if available
      totalScore = nistAssessment.score.current || 0;
      maxScore = nistAssessment.score.max || 0;
    } else if (improvementActions.length > 0) {
      // Calculate from improvement actions
      improvementActions.forEach((action) => {
        const actionPoints = action.status === 'Completed' ? action.points : 0;
        const actionMaxPoints = action.maxPoints || action.points;

        if (action.isManaged) {
          microsoftPoints += actionPoints;
          microsoftMaxPoints += actionMaxPoints;
        } else {
          yourPoints += actionPoints;
          yourMaxPoints += actionMaxPoints;
        }
      });

      totalScore = yourPoints + microsoftPoints;
      maxScore = yourMaxPoints + microsoftMaxPoints;
    }

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    return {
      totalScore,
      maxScore,
      percentage,
      yourPoints,
      yourMaxPoints,
      microsoftPoints,
      microsoftMaxPoints,
      assessmentId: nistAssessment.id,
      assessmentName: nistAssessment.displayName,
      lastUpdated: nistAssessment.lastModifiedDateTime || new Date().toISOString(),
      controlsCount: improvementActions.length,
      actionsCount: improvementActions.length,
    };
  }

  /**
   * Load static improvement actions from JSON file
   */
  private loadStaticImprovementActions(): any {
    try {
      const fileContent = fs.readFileSync(this.IMPROVEMENT_ACTIONS_PATH, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error('❌ Error loading improvement actions file:', error);
      return { mappings: {} };
    }
  }

  /**
   * Find matching compliance action by fuzzy matching on title
   */
  private findMatchingComplianceAction(
    actionTitle: string,
    complianceActions: ComplianceImprovementAction[]
  ): ComplianceImprovementAction | null {
    // Try exact match first
    let match = complianceActions.find(
      (action) => action.title.toLowerCase() === actionTitle.toLowerCase()
    );

    if (match) return match;

    // Try contains match
    match = complianceActions.find((action) =>
      action.title.toLowerCase().includes(actionTitle.toLowerCase())
    );

    if (match) return match;

    // Try reverse contains match
    match = complianceActions.find((action) =>
      actionTitle.toLowerCase().includes(action.title.toLowerCase())
    );

    return match || null;
  }

  /**
   * Enrich static recommendations with live Compliance Manager data
   */
  async enrichComplianceRecommendations(
    controlId: string,
    forceRefresh: boolean = false
  ): Promise<EnrichComplianceRecommendationsResponse> {
    try {
      // Load static improvement actions
      const improvementActionsData = this.loadStaticImprovementActions();
      const controlMappings = improvementActionsData.mappings[controlId];

      if (!controlMappings || !controlMappings.improvementActions) {
        return {
          controlId,
          recommendations: [],
          lastSynced: new Date().toISOString(),
        };
      }

      // Get live Compliance Manager data
      const { nistAssessment, improvementActions } = await this.getComplianceData(forceRefresh);

      // If no live data available, return static data only
      if (!improvementActions || improvementActions.length === 0) {
        console.warn(
          '⚠️ No live Compliance Manager data available, returning static recommendations'
        );
        const staticRecommendations: EnrichedComplianceRecommendation[] =
          controlMappings.improvementActions.map((action: any) => ({
            title: action.title,
            priority: action.priority,
            category: action.category,
            description: action.description,
            status: 'Unknown',
          }));

        return {
          controlId,
          recommendations: staticRecommendations,
          lastSynced: new Date().toISOString(),
        };
      }

      // Enrich each recommendation with live compliance data
      const enrichedRecommendations: EnrichedComplianceRecommendation[] =
        controlMappings.improvementActions.map((action: any) => {
          const matchingAction = this.findMatchingComplianceAction(action.title, improvementActions);

          if (matchingAction) {
            return {
              title: action.title,
              priority: action.priority,
              category: matchingAction.category || action.category,
              description: matchingAction.description || action.description,
              status: matchingAction.status,
              points: matchingAction.points,
              maxPoints: matchingAction.maxPoints,
              implementationCost: matchingAction.implementationCost,
              userImpact: matchingAction.userImpact,
              implementationUrl: matchingAction.implementationUrl,
              lastUpdated: matchingAction.lastModifiedDate,
              completedDate: matchingAction.completedDate,
              assignedTo: matchingAction.assignedTo,
              dueDate: matchingAction.dueDate,
              evidenceRequired: matchingAction.evidence?.required,
              evidenceUploaded: matchingAction.evidence?.uploaded,
              isManaged: matchingAction.isManaged,
            };
          }

          // No matching action found, return static data
          return {
            title: action.title,
            priority: action.priority,
            category: action.category,
            description: action.description,
            status: 'Unknown',
          };
        });

      // Get compliance score if available
      let complianceScore;
      if (nistAssessment && nistAssessment.score) {
        complianceScore = {
          totalScore: nistAssessment.score.current || 0,
          maxScore: nistAssessment.score.max || 0,
          percentage:
            nistAssessment.score.max > 0
              ? (nistAssessment.score.current / nistAssessment.score.max) * 100
              : 0,
        };
      }

      return {
        controlId,
        recommendations: enrichedRecommendations,
        complianceScore,
        lastSynced: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`❌ Error enriching compliance recommendations for control ${controlId}:`, error);
      throw error;
    }
  }

  /**
   * Sync Compliance Manager data (force refresh)
   */
  async syncComplianceManager(): Promise<ComplianceSyncResult> {
    try {
      console.log('🔄 Starting Compliance Manager sync...');
      const startTime = new Date();

      // Force refresh all data
      const { assessments, nistAssessment, improvementActions } = await this.getComplianceData(true);

      const result: ComplianceSyncResult = {
        success: true,
        assessmentsFound: assessments?.length || 0,
        nistAssessmentFound: !!nistAssessment,
        improvementActionsCount: improvementActions.length,
        lastSyncTime: startTime.toISOString(),
      };

      console.log('✅ Compliance Manager sync completed successfully');
      console.log(`   - Assessments found: ${result.assessmentsFound}`);
      console.log(`   - NIST assessment: ${result.nistAssessmentFound ? 'Yes' : 'No'}`);
      console.log(`   - Improvement actions: ${result.improvementActionsCount}`);

      return result;
    } catch (error: any) {
      console.error('❌ Compliance Manager sync failed:', error);
      return {
        success: false,
        assessmentsFound: 0,
        nistAssessmentFound: false,
        improvementActionsCount: 0,
        lastSyncTime: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }

  /**
   * Clear cache (useful for testing or forcing refresh)
   */
  clearCache(): void {
    this.cache = {};
    console.log('🗑️ Compliance Manager cache cleared');
  }

  /**
   * Get cache status
   */
  getCacheStatus(): {
    isCached: boolean;
    lastUpdated?: Date;
    validUntil?: Date;
  } {
    const isCached = !!(this.cache.assessments && this.cache.nistAssessment);
    const validUntil = this.cache.lastUpdated
      ? new Date(this.cache.lastUpdated.getTime() + this.CACHE_DURATION_MS)
      : undefined;

    return {
      isCached,
      lastUpdated: this.cache.lastUpdated,
      validUntil,
    };
  }
}

// Export singleton instance
export const complianceManagerService = new ComplianceManagerService();
