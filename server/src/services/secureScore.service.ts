import { graphClientService } from './graphClient.service';
import {
  SecureScore,
  SecureScoreControlProfile,
  SecureScoreSummary,
  EnrichedRecommendation,
  EnrichRecommendationsResponse,
} from '../types/secureScore.types';
import * as fs from 'fs';
import * as path from 'path';

class SecureScoreService {
  private cache: {
    secureScore?: SecureScore;
    controlProfiles?: SecureScoreControlProfile[];
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
   * Fetch the latest Secure Score from Microsoft Graph API
   */
  async fetchSecureScore(): Promise<SecureScore | null> {
    try {
      console.log('Fetching Secure Score data from Microsoft Graph API...');

      // Get the most recent secure score
      const response = await graphClientService.get<{ value: SecureScore[] }>(
        '/security/secureScores?$top=1'
      );

      if (response.value && response.value.length > 0) {
        const score = response.value[0];
        console.log(
          `✅ Secure Score: ${score.currentScore}/${score.maxScore} (${((score.currentScore / score.maxScore) * 100).toFixed(1)}%)`
        );
        return score;
      }

      console.warn('⚠️ No Secure Score data available');
      return null;
    } catch (error) {
      console.error('❌ Error fetching Secure Score:', error);
      throw new Error(`Failed to fetch Secure Score: ${error}`);
    }
  }

  /**
   * Fetch all Secure Score Control Profiles
   */
  async fetchControlProfiles(): Promise<SecureScoreControlProfile[]> {
    try {
      console.log('Fetching Secure Score Control Profiles...');

      const response = await graphClientService.get<{ value: SecureScoreControlProfile[] }>(
        '/security/secureScoreControlProfiles'
      );

      if (response.value) {
        console.log(`✅ Found ${response.value.length} control profiles`);
        return response.value;
      }

      console.warn('⚠️ No control profiles available');
      return [];
    } catch (error) {
      console.error('❌ Error fetching control profiles:', error);
      throw new Error(`Failed to fetch control profiles: ${error}`);
    }
  }

  /**
   * Get Secure Score data from cache or fetch fresh data
   */
  async getSecureScoreData(forceRefresh: boolean = false): Promise<{
    secureScore: SecureScore | null;
    controlProfiles: SecureScoreControlProfile[];
  }> {
    const isCacheValid =
      this.cache.lastUpdated &&
      Date.now() - this.cache.lastUpdated.getTime() < this.CACHE_DURATION_MS;

    if (!forceRefresh && isCacheValid && this.cache.secureScore && this.cache.controlProfiles) {
      console.log('📦 Using cached Secure Score data');
      return {
        secureScore: this.cache.secureScore,
        controlProfiles: this.cache.controlProfiles,
      };
    }

    console.log('🔄 Fetching fresh Secure Score data...');

    // Fetch both in parallel
    const [secureScore, controlProfiles] = await Promise.all([
      this.fetchSecureScore(),
      this.fetchControlProfiles(),
    ]);

    // Update cache
    this.cache = {
      secureScore: secureScore || undefined,
      controlProfiles,
      lastUpdated: new Date(),
    };

    return { secureScore, controlProfiles };
  }

  /**
   * Get summary of Secure Score data
   */
  async getSecureScoreSummary(forceRefresh: boolean = false): Promise<SecureScoreSummary | null> {
    const { secureScore, controlProfiles } = await this.getSecureScoreData(forceRefresh);

    if (!secureScore) {
      return null;
    }

    return {
      currentScore: secureScore.currentScore,
      maxScore: secureScore.maxScore,
      percentage: (secureScore.currentScore / secureScore.maxScore) * 100,
      activeUserCount: secureScore.activeUserCount,
      licensedUserCount: secureScore.licensedUserCount,
      enabledServices: secureScore.enabledServices,
      lastUpdated: secureScore.createdDateTime,
      controlProfiles,
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
   * Find matching control profile by fuzzy matching on title
   */
  private findMatchingControlProfile(
    actionTitle: string,
    controlProfiles: SecureScoreControlProfile[]
  ): SecureScoreControlProfile | null {
    // Try exact match first
    let match = controlProfiles.find(
      (profile) => profile.title.toLowerCase() === actionTitle.toLowerCase()
    );

    if (match) return match;

    // Try contains match
    match = controlProfiles.find((profile) =>
      profile.title.toLowerCase().includes(actionTitle.toLowerCase())
    );

    if (match) return match;

    // Try reverse contains match
    match = controlProfiles.find((profile) =>
      actionTitle.toLowerCase().includes(profile.title.toLowerCase())
    );

    return match || null;
  }

  /**
   * Get the current state of a control from its state updates
   */
  private getControlState(profile: SecureScoreControlProfile): {
    status: 'Completed' | 'InProgress' | 'NotStarted' | 'Unknown';
    lastUpdated?: string;
    completedDate?: string;
    assignedTo?: string;
    comment?: string;
  } {
    if (!profile.controlStateUpdates || profile.controlStateUpdates.length === 0) {
      return { status: 'Unknown' };
    }

    // Get the most recent state update
    const latestUpdate = profile.controlStateUpdates.sort((a, b) => {
      const dateA = new Date(a.updatedDateTime || 0).getTime();
      const dateB = new Date(b.updatedDateTime || 0).getTime();
      return dateB - dateA;
    })[0];

    let status: 'Completed' | 'InProgress' | 'NotStarted' | 'Unknown' = 'Unknown';

    // Map Microsoft's state values to our status
    switch (latestUpdate.state?.toLowerCase()) {
      case 'completed':
      case 'complete':
        status = 'Completed';
        break;
      case 'inprogress':
      case 'in progress':
        status = 'InProgress';
        break;
      case 'notstarted':
      case 'not started':
      case 'toaddress':
        status = 'NotStarted';
        break;
      default:
        status = 'Unknown';
    }

    return {
      status,
      lastUpdated: latestUpdate.updatedDateTime,
      completedDate: status === 'Completed' ? latestUpdate.updatedDateTime : undefined,
      assignedTo: latestUpdate.assignedTo,
      comment: latestUpdate.comment,
    };
  }

  /**
   * Enrich static recommendations with live Secure Score data
   */
  async enrichRecommendations(
    controlId: string,
    forceRefresh: boolean = false
  ): Promise<EnrichRecommendationsResponse> {
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

      // Get live Secure Score data
      const { secureScore, controlProfiles } = await this.getSecureScoreData(forceRefresh);

      // If no live data available, return static data only
      if (!controlProfiles || controlProfiles.length === 0) {
        console.warn('⚠️ No live Secure Score data available, returning static recommendations');
        const staticRecommendations: EnrichedRecommendation[] =
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

      // Enrich each recommendation with live data
      const enrichedRecommendations: EnrichedRecommendation[] =
        controlMappings.improvementActions.map((action: any) => {
          const matchingProfile = this.findMatchingControlProfile(action.title, controlProfiles);

          if (matchingProfile) {
            const state = this.getControlState(matchingProfile);

            return {
              title: action.title,
              priority: action.priority,
              category: action.category,
              description: matchingProfile.remediation || action.description,
              status: state.status,
              scoreImpact: matchingProfile.maxScore,
              implementationCost: matchingProfile.implementationCost,
              userImpact: matchingProfile.userImpact,
              implementationUrl: matchingProfile.actionUrl,
              lastUpdated: state.lastUpdated,
              completedDate: state.completedDate,
              assignedTo: state.assignedTo,
              stateComment: state.comment,
            };
          }

          // No matching profile found, return static data
          return {
            title: action.title,
            priority: action.priority,
            category: action.category,
            description: action.description,
            status: 'Unknown',
          };
        });

      return {
        controlId,
        recommendations: enrichedRecommendations,
        scoreData: secureScore
          ? {
              currentScore: secureScore.currentScore,
              maxScore: secureScore.maxScore,
              percentage: (secureScore.currentScore / secureScore.maxScore) * 100,
            }
          : undefined,
        lastSynced: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`❌ Error enriching recommendations for control ${controlId}:`, error);
      throw error;
    }
  }

  /**
   * Clear cache (useful for testing or forcing refresh)
   */
  clearCache(): void {
    this.cache = {};
    console.log('🗑️ Secure Score cache cleared');
  }

  /**
   * Get cache status
   */
  getCacheStatus(): {
    isCached: boolean;
    lastUpdated?: Date;
    validUntil?: Date;
  } {
    const isCached = !!(this.cache.secureScore && this.cache.controlProfiles);
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
export const secureScoreService = new SecureScoreService();
