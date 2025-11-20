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
   * Fetch PIM Role Management Policies
   *
   * Note: Requires RoleManagement.Read.Directory permission
   * Returns policies that govern privileged role activation and assignment
   */
  async getPIMRoleManagementPolicies(): Promise<any[]> {
    try {
      console.log('Fetching PIM Role Management Policies...');

      const response = await graphClientService.get<{ value: any[] }>(
        '/policies/roleManagementPolicies'
      );

      console.log(`✅ Found ${response.value.length} PIM role management policies`);
      return response.value;
    } catch (error: any) {
      console.error('⚠️  Could not fetch PIM policies:', error.message);
      console.log('   This endpoint requires RoleManagement.Read.Directory permission');
      console.log('   If you see 403/404 errors, verify permissions in Azure AD app registration');

      // Return empty array instead of throwing - PIM may not be configured
      return [];
    }
  }

  /**
   * Fetch PIM Role Assignment Schedule Instances (Active assignments)
   *
   * Optional: Provides additional PIM context for active role assignments
   */
  async getPIMRoleAssignments(): Promise<any[]> {
    try {
      console.log('Fetching PIM Role Assignment Schedules...');

      const response = await graphClientService.get<{ value: any[] }>(
        '/roleManagement/directory/roleAssignmentScheduleInstances'
      );

      console.log(`✅ Found ${response.value.length} PIM role assignments`);
      return response.value;
    } catch (error: any) {
      console.error('⚠️  Could not fetch PIM role assignments:', error.message);

      // Return empty array - this is supplementary data
      return [];
    }
  }

  /**
   * Fetch Authorization Policy (singleton - one per tenant)
   *
   * Note: This is a singleton resource - there's only ONE authorization policy per tenant
   * Contains guest user settings, user consent settings, default user permissions, etc.
   * Requires Policy.Read.All permission
   */
  async getAuthorizationPolicy(): Promise<any | null> {
    try {
      console.log('Fetching Authorization Policy (singleton)...');

      const response = await graphClientService.get<{
        id: string;
        displayName?: string;
        allowInvitesFrom?: string;
        allowedToSignUpEmailBasedSubscriptions?: boolean;
        blockMsolPowerShell?: boolean;
        defaultUserRolePermissions?: {
          allowedToCreateApps?: boolean;
          allowedToCreateSecurityGroups?: boolean;
          allowedToReadOtherUsers?: boolean;
        };
      }>(
        '/policies/authorizationPolicy'
      );

      console.log('✅ Retrieved tenant authorization policy');
      console.log(`   Guest user access: ${response.allowedToSignUpEmailBasedSubscriptions ? 'Enabled' : 'Disabled'}`);
      console.log(`   Guest invites: ${response.allowInvitesFrom || 'Default'}`);

      return response;
    } catch (error: any) {
      console.error('⚠️  Could not fetch authorization policy:', error.message);
      console.log('   This endpoint requires Policy.Read.All permission');
      console.log('   If you see 403/404 errors, verify permissions in Azure AD app registration');

      // Return null instead of throwing - this is a singleton that should always exist
      return null;
    }
  }

  /**
   * Fetch Attack Simulation Training campaigns
   *
   * Note: Requires AttackSimulation.Read.All permission
   * Returns training simulations configured in Microsoft Defender for Office 365
   */
  async getAttackSimulations(): Promise<any[]> {
    try {
      console.log('Fetching Attack Simulation campaigns...');

      const response = await graphClientService.get<{ value: any[] }>(
        '/security/attackSimulation/simulations'
      );

      console.log(`✅ Found ${response.value.length} attack simulation campaigns`);
      return response.value;
    } catch (error: any) {
      console.error('⚠️  Could not fetch attack simulations:', error.message);
      console.log('   This endpoint requires AttackSimulation.Read.All permission');
      console.log('   Attack simulations also require Microsoft Defender for Office 365 Plan 2');
      console.log('   If you see 403/404 errors, verify permissions and licensing');

      // Return empty array - attack simulations may not be configured
      return [];
    }
  }

  /**
   * Fetch Attack Simulation Training automations (optional)
   *
   * Provides additional context about automated training campaigns
   */
  async getAttackSimulationAutomations(): Promise<any[]> {
    try {
      console.log('Fetching Attack Simulation automations...');

      const response = await graphClientService.get<{ value: any[] }>(
        '/security/attackSimulation/simulationAutomations'
      );

      console.log(`✅ Found ${response.value.length} simulation automations`);
      return response.value;
    } catch (error: any) {
      console.error('⚠️  Could not fetch simulation automations:', error.message);

      // Return empty array - this is supplementary data
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
   * Get comprehensive Azure AD security summary including PIM, Authorization Policy, and Attack Simulations
   */
  async getSecuritySummary(): Promise<{
    conditionalAccessPolicies: AzureADConditionalAccessPolicy[];
    mfaStatus: AzureADMFAStatus;
    securityDefaultsEnabled: boolean;
    privilegedRolesCount: number;
    pimPolicies: any[];
    pimAssignments: any[];
    authorizationPolicy: any | null;
    attackSimulations: any[];
    attackSimulationAutomations: any[];
  }> {
    const [
      policies,
      mfaStatus,
      securityDefaults,
      privilegedRoles,
      pimPolicies,
      pimAssignments,
      authorizationPolicy,
      attackSimulations,
      attackSimulationAutomations
    ] = await Promise.all([
      this.getConditionalAccessPolicies(),
      this.getMFAStatus(),
      this.areSecurityDefaultsEnabled(),
      this.getPrivilegedRoleAssignments(),
      this.getPIMRoleManagementPolicies(),
      this.getPIMRoleAssignments(),
      this.getAuthorizationPolicy(),
      this.getAttackSimulations(),
      this.getAttackSimulationAutomations(),
    ]);

    return {
      conditionalAccessPolicies: policies,
      mfaStatus,
      securityDefaultsEnabled: securityDefaults,
      privilegedRolesCount: privilegedRoles.length,
      pimPolicies,
      pimAssignments,
      authorizationPolicy,
      attackSimulations,
      attackSimulationAutomations,
    };
  }
}

export const azureADService = new AzureADService();
