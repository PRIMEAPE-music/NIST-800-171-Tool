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
   * Fetch DLP policies from Microsoft Graph API (Beta)
   *
   * Note: Uses beta endpoint - requires InformationProtectionPolicy.Read.All permission
   */
  async getDLPPolicies(): Promise<any[]> {
    try {
      console.log('Fetching DLP policies (beta API)...');

      const response = await graphClientService.getBeta<{ value: any[] }>(
        '/security/informationProtection/dataLossPreventionPolicies'
      );

      console.log(`✅ Found ${response.value.length} DLP policies`);
      return response.value;
    } catch (error: any) {
      console.error('⚠️  Could not fetch DLP policies:', error.message);
      console.log('   This endpoint requires beta API and InformationProtectionPolicy.Read.All permission');
      console.log('   If you see 403/404 errors, verify permissions in Azure AD app registration');

      // Return empty array instead of throwing - DLP may not be configured
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
   * Get information protection summary including DLP policies
   */
  async getInformationProtectionSummary(): Promise<{
    sensitivityLabelsCount: number;
    isConfigured: boolean;
    labels: PurviewSensitivityLabel[];
    dlpPolicies: any[];
  }> {
    // Fetch labels and DLP policies in parallel
    const [labels, dlpPolicies] = await Promise.all([
      this.getSensitivityLabels(),
      this.getDLPPolicies()
    ]);

    return {
      sensitivityLabelsCount: labels.length,
      isConfigured: labels.length > 0 || dlpPolicies.length > 0,
      labels,
      dlpPolicies,
    };
  }
}

export const purviewService = new PurviewService();
