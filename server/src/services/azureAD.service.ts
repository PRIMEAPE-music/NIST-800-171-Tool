import { graphClientService } from './graphClient.service';
import { AzureADConditionalAccessPolicy, AzureADMFAStatus } from '../types/m365.types';

class AzureADService {
  /**
   * Fetch all conditional access policies
   */
  async getConditionalAccessPolicies(): Promise<AzureADConditionalAccessPolicy[]> {
    try {
      console.log('Fetching Azure AD conditional access policies...');

      const response = await graphClientService.get<{ value: AzureADConditionalAccessPolicy[] }>(
        '/identity/conditionalAccess/policies'
      );

      console.log(`✅ Found ${response.value.length} conditional access policies`);
      return response.value;
    } catch (error) {
      console.error('Error fetching conditional access policies:', error);
      throw new Error(`Failed to fetch conditional access policies: ${error}`);
    }
  }

  /**
   * Get MFA enforcement status
   */
  async getMFAStatus(): Promise<AzureADMFAStatus> {
    try {
      console.log('Checking MFA enforcement status...');

      // Get conditional access policies that enforce MFA
      const policies = await this.getConditionalAccessPolicies();

      const mfaPolicies = policies.filter(policy =>
        policy.state === 'enabled' &&
        policy.grantControls?.builtInControls?.includes('mfa')
      );

      // Get total user count
      const usersResponse = await graphClientService.get<{ value: any[] }>(
        '/users?$select=id&$top=999'
      );
      const totalUsers = usersResponse.value.length;

      // Determine enforcement method
      let enforcementMethod = 'None';
      if (mfaPolicies.length > 0) {
        enforcementMethod = 'ConditionalAccess';
      }

      const enabled = mfaPolicies.length > 0;

      return {
        enabled,
        enforcementMethod,
        totalUsers,
        usersWithMFA: enabled ? totalUsers : 0, // Simplified assumption
        percentageCompliance: enabled ? 100 : 0,
      };
    } catch (error) {
      console.error('Error checking MFA status:', error);
      return {
        enabled: false,
        enforcementMethod: 'Unknown',
        totalUsers: 0,
        usersWithMFA: 0,
        percentageCompliance: 0,
      };
    }
  }

  /**
   * Get password policies
   */
  async getPasswordPolicies(): Promise<any> {
    try {
      console.log('Fetching password policies...');

      const response = await graphClientService.get(
        '/domains'
      );

      return response;
    } catch (error) {
      console.error('Error fetching password policies:', error);
      return null;
    }
  }

  /**
   * Get privileged role assignments
   */
  async getPrivilegedRoleAssignments(): Promise<any[]> {
    try {
      console.log('Fetching privileged role assignments...');

      const response = await graphClientService.get<{ value: any[] }>(
        '/directoryRoles'
      );

      return response.value;
    } catch (error) {
      console.error('Error fetching privileged roles:', error);
      return [];
    }
  }

  /**
   * Check if security defaults are enabled
   */
  async areSecurityDefaultsEnabled(): Promise<boolean> {
    try {
      const response = await graphClientService.get<{ isEnabled: boolean }>(
        '/policies/identitySecurityDefaultsEnforcementPolicy'
      );

      return response.isEnabled;
    } catch (error) {
      console.error('Error checking security defaults:', error);
      return false;
    }
  }

  /**
   * Get comprehensive Azure AD security summary
   */
  async getSecuritySummary(): Promise<{
    conditionalAccessPolicies: AzureADConditionalAccessPolicy[];
    mfaStatus: AzureADMFAStatus;
    securityDefaultsEnabled: boolean;
    privilegedRolesCount: number;
  }> {
    const [policies, mfaStatus, securityDefaults, privilegedRoles] = await Promise.all([
      this.getConditionalAccessPolicies(),
      this.getMFAStatus(),
      this.areSecurityDefaultsEnabled(),
      this.getPrivilegedRoleAssignments(),
    ]);

    return {
      conditionalAccessPolicies: policies,
      mfaStatus,
      securityDefaultsEnabled: securityDefaults,
      privilegedRolesCount: privilegedRoles.length,
    };
  }
}

export const azureADService = new AzureADService();
