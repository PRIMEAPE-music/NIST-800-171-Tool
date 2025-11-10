import { graphClientService } from './graphClient.service';
import { PurviewSensitivityLabel } from '../types/m365.types';

class PurviewService {
  /**
   * Fetch information protection sensitivity labels
   */
  async getSensitivityLabels(): Promise<PurviewSensitivityLabel[]> {
    try {
      console.log('Fetching Purview sensitivity labels...');

      const response = await graphClientService.get<{ value: PurviewSensitivityLabel[] }>(
        '/informationProtection/policy/labels'
      );

      console.log(`✅ Found ${response.value.length} sensitivity labels`);
      return response.value;
    } catch (error) {
      console.error('Error fetching sensitivity labels:', error);
      // Return empty array if user doesn't have Purview
      return [];
    }
  }

  /**
   * Fetch DLP policies (Note: Limited Graph API support, may need PowerShell)
   */
  async getDLPPolicies(): Promise<any[]> {
    try {
      console.log('Fetching DLP policies...');

      // Note: DLP policies have limited Graph API support
      // This is a placeholder - actual implementation may require
      // Security & Compliance PowerShell or different API endpoint

      console.log('⚠️  DLP policies require Security & Compliance Center API');
      console.log('   Current Graph API has limited DLP support');

      return [];
    } catch (error) {
      console.error('Error fetching DLP policies:', error);
      return [];
    }
  }

  /**
   * Check if information protection is configured
   */
  async isInformationProtectionConfigured(): Promise<boolean> {
    try {
      const labels = await this.getSensitivityLabels();
      return labels.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get information protection summary
   */
  async getInformationProtectionSummary(): Promise<{
    sensitivityLabelsCount: number;
    isConfigured: boolean;
    labels: PurviewSensitivityLabel[];
  }> {
    const labels = await this.getSensitivityLabels();

    return {
      sensitivityLabelsCount: labels.length,
      isConfigured: labels.length > 0,
      labels,
    };
  }
}

export const purviewService = new PurviewService();
