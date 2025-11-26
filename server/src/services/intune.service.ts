import { graphClientService } from './graphClient.service';
import { IntuneDeviceCompliancePolicy, IntuneConfigurationPolicy } from '../types/m365.types';
import { settingsHierarchyFlattenerService } from './settings-hierarchy-flattener.service';

class IntuneService {
  /**
   * Fetch all device compliance policies from Intune WITH DETAILED SETTINGS
   */
  async getDeviceCompliancePolicies(): Promise<IntuneDeviceCompliancePolicy[]> {
    try {
      console.log('Fetching Intune device compliance policies...');

      const response = await graphClientService.get<{ value: IntuneDeviceCompliancePolicy[] }>(
        '/deviceManagement/deviceCompliancePolicies'
      );

      console.log(`✅ Found ${response.value.length} device compliance policies`);

      // Fetch detailed settings for each policy
      console.log('📥 Fetching detailed settings for each compliance policy...');
      const detailedPolicies = await Promise.all(
        response.value.map(async (policy) => {
          try {
            // Get detailed policy with all settings
            const detailedPolicy = await graphClientService.get<IntuneDeviceCompliancePolicy>(
              `/deviceManagement/deviceCompliancePolicies/${policy.id}`
            );
            return detailedPolicy;
          } catch (error) {
            console.warn(`⚠️  Could not fetch details for policy ${policy.id}:`, error);
            return policy; // Return basic policy if detailed fetch fails
          }
        })
      );

      console.log(`✅ Fetched detailed settings for ${detailedPolicies.length} compliance policies`);
      return detailedPolicies;
    } catch (error) {
      console.error('Error fetching device compliance policies:', error);
      throw new Error(`Failed to fetch Intune compliance policies: ${error}`);
    }
  }

  /**
   * Fetch all device configuration policies from Intune WITH DETAILED SETTINGS
   * This endpoint returns ALL configuration types including:
   * - Legacy device configurations
   * - Settings Catalog policies
   * - Endpoint Security policies (ASR, BitLocker, Defender, etc.)
   * They are distinguished by their @odata.type value
   */
  async getDeviceConfigurationPolicies(): Promise<IntuneConfigurationPolicy[]> {
    try {
      console.log('Fetching Intune device configuration policies...');

      const response = await graphClientService.get<{ value: IntuneConfigurationPolicy[] }>(
        '/deviceManagement/deviceConfigurations'
      );

      console.log(`✅ Found ${response.value.length} device configuration policies`);

      // Log policy types for debugging
      const policyTypes = response.value.reduce((acc: any, policy: any) => {
        const type = policy['@odata.type'] || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      console.log('📊 Policy types breakdown:');
      Object.entries(policyTypes).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });

      // Fetch detailed settings for each policy
      console.log('📥 Fetching detailed settings for each configuration policy...');
      const detailedPolicies = await Promise.all(
        response.value.map(async (policy) => {
          try {
            // Get detailed policy with all settings
            const detailedPolicy = await graphClientService.get<IntuneConfigurationPolicy>(
              `/deviceManagement/deviceConfigurations/${policy.id}`
            );
            return detailedPolicy;
          } catch (error) {
            console.warn(`⚠️  Could not fetch details for policy ${policy.id}:`, error);
            return policy; // Return basic policy if detailed fetch fails
          }
        })
      );

      console.log(`✅ Fetched detailed settings for ${detailedPolicies.length} configuration policies`);
      return detailedPolicies;
    } catch (error) {
      console.error('Error fetching device configuration policies:', error);
      throw new Error(`Failed to fetch Intune configuration policies: ${error}`);
    }
  }

  /**
   * Fetch Settings Catalog policies (newer policy format) WITH DETAILED SETTINGS
   * These use a different endpoint than legacy deviceConfigurations
   * Requires Graph API beta
   */
  async getSettingsCatalogPolicies(): Promise<any[]> {
    try {
      console.log('Fetching Intune Settings Catalog policies (beta API)...');

      // Settings Catalog policies require beta API
      const response = await graphClientService.getBeta<{ value: any[] }>(
        '/deviceManagement/configurationPolicies'
      );

      console.log(`✅ Found ${response.value.length} Settings Catalog policies`);

      // Fetch settings for each policy
      console.log('📥 Fetching detailed settings for each Settings Catalog policy...');
      const detailedPolicies = await Promise.all(
        response.value.map(async (policy) => {
          try {
            // Get policy settings
            const settings = await graphClientService.getBeta<{ value: any[] }>(
              `/deviceManagement/configurationPolicies/${policy.id}/settings`
            );

            // Flatten settings to extract nested children
            const flattenedSettings = settingsHierarchyFlattenerService.flattenPolicySettings(
              settings.value
            );

            const childCount = flattenedSettings.length - settings.value.length;
            if (childCount > 0) {
              console.log(`   📦 ${policy.name}: extracted ${childCount} child settings`);
            }

            return {
              ...policy,
              settings: settings.value, // Keep original structure
              flattenedSettings, // Add flattened structure with children
              settingsCount: flattenedSettings.length,
            };
          } catch (error) {
            console.warn(`⚠️  Could not fetch settings for policy ${policy.id}:`, error);
            return policy;
          }
        })
      );

      console.log(`✅ Fetched detailed settings for ${detailedPolicies.length} Settings Catalog policies`);
      return detailedPolicies;
    } catch (error: any) {
      console.error('⚠️  Could not fetch Settings Catalog policies:', error.message);
      console.log('   This endpoint requires Graph API beta or additional permissions');
      return [];
    }
  }

  /**
   * Fetch Endpoint Security policies (templates) WITH DETAILED SETTINGS
   * These include ASR Rules, BitLocker, Defender ATP, Firewall, etc.
   * Requires Graph API beta
   */
  async getEndpointSecurityPolicies(): Promise<any[]> {
    try {
      console.log('Fetching Intune Endpoint Security policies (beta API)...');

      // Endpoint Security policies require beta API
      const response = await graphClientService.getBeta<{ value: any[] }>(
        '/deviceManagement/intents'
      );

      console.log(`✅ Found ${response.value.length} Endpoint Security policies`);

      // Fetch settings for each intent
      console.log('📥 Fetching detailed settings for each Endpoint Security policy...');
      const detailedPolicies = await Promise.all(
        response.value.map(async (intent) => {
          try {
            // Get intent settings
            const settings = await graphClientService.getBeta<{ value: any[] }>(
              `/deviceManagement/intents/${intent.id}/settings`
            );

            // Flatten settings to extract nested children
            const flattenedSettings = settingsHierarchyFlattenerService.flattenPolicySettings(
              settings.value
            );

            const childCount = flattenedSettings.length - settings.value.length;
            if (childCount > 0) {
              console.log(`   📦 ${intent.displayName || intent.id}: extracted ${childCount} child settings`);
            }

            return {
              ...intent,
              settings: settings.value, // Keep original structure
              flattenedSettings, // Add flattened structure with children
              settingsCount: flattenedSettings.length,
            };
          } catch (error) {
            console.warn(`⚠️  Could not fetch settings for intent ${intent.id}:`, error);
            return intent;
          }
        })
      );

      console.log(`✅ Fetched detailed settings for ${detailedPolicies.length} Endpoint Security policies`);
      return detailedPolicies;
    } catch (error: any) {
      console.error('⚠️  Could not fetch Endpoint Security policies:', error.message);
      console.log('   This endpoint requires Graph API beta or additional permissions');
      return [];
    }
  }

  /**
   * Fetch device enrollment restrictions
   */
  async getDeviceEnrollmentRestrictions(): Promise<any[]> {
    try {
      console.log('Fetching device enrollment restrictions...');

      const response = await graphClientService.get<{ value: any[] }>(
        '/deviceManagement/deviceEnrollmentConfigurations'
      );

      console.log(`✅ Found ${response.value.length} enrollment restrictions`);
      return response.value;
    } catch (error) {
      console.error('Error fetching enrollment restrictions:', error);
      return []; // Non-critical, return empty array
    }
  }

  /**
   * Get count of managed devices
   */
  async getManagedDeviceCount(): Promise<number> {
    try {
      const response = await graphClientService.get<{ value: any[] }>(
        '/deviceManagement/managedDevices?$select=id&$top=999'
      );

      return response.value.length;
    } catch (error) {
      console.error('Error fetching managed device count:', error);
      return 0;
    }
  }

  /**
   * Check if specific security features are enabled
   */
  async checkSecurityFeatures(): Promise<{
    bitLockerEnabled: boolean;
    firewallEnabled: boolean;
    antivirusEnabled: boolean;
  }> {
    try {
      const compliancePolicies = await this.getDeviceCompliancePolicies();

      // Check for BitLocker requirements
      const bitLockerEnabled = compliancePolicies.some(policy =>
        (policy as any).bitLockerEnabled === true ||
        (policy as any).requireEncryption === true
      );

      // Check for Firewall requirements
      const firewallEnabled = compliancePolicies.some(policy =>
        (policy as any).firewallRequired === true
      );

      // Check for Antivirus requirements
      const antivirusEnabled = compliancePolicies.some(policy =>
        (policy as any).antivirusRequired === true ||
        (policy as any).defenderEnabled === true
      );

      return {
        bitLockerEnabled,
        firewallEnabled,
        antivirusEnabled,
      };
    } catch (error) {
      console.error('Error checking security features:', error);
      return {
        bitLockerEnabled: false,
        firewallEnabled: false,
        antivirusEnabled: false,
      };
    }
  }


  /**
   * Fetch App Protection policies
   * Windows MAM policies require beta API
   */
  async getAppProtectionPolicies(): Promise<any[]> {
    try {
      console.log('Fetching Intune App Protection policies...');

      const [iosAppProtection, androidAppProtection, windowsAppProtection] = await Promise.all([
        graphClientService.get<{ value: any[] }>('/deviceAppManagement/iosManagedAppProtections').catch(() => ({ value: [] })),
        graphClientService.get<{ value: any[] }>('/deviceAppManagement/androidManagedAppProtections').catch(() => ({ value: [] })),
        // Windows App Protection requires beta API
        graphClientService.getBeta<{ value: any[] }>('/deviceAppManagement/windowsManagedAppProtections').catch(() => ({ value: [] })),
      ]);

      const allAppProtection = [
        ...iosAppProtection.value,
        ...androidAppProtection.value,
        ...windowsAppProtection.value,
      ];

      console.log(`✅ Found ${allAppProtection.length} App Protection policies (iOS: ${iosAppProtection.value.length}, Android: ${androidAppProtection.value.length}, Windows: ${windowsAppProtection.value.length})`);
      return allAppProtection;
    } catch (error) {
      console.error('Error fetching App Protection policies:', error);
      return []; // Non-critical, return empty array
    }
  }

  /**
   * Fetch Compliance Policies (all platforms)
   */
  async getAllCompliancePolicies(): Promise<any[]> {
    try {
      console.log('Fetching all Intune compliance policies...');

      const response = await graphClientService.get<{ value: any[] }>(
        '/deviceManagement/deviceCompliancePolicies'
      );

      console.log(`✅ Found ${response.value.length} compliance policies`);
      return response.value;
    } catch (error) {
      console.error('Error fetching compliance policies:', error);
      return [];
    }
  }

  /**
   * Get all Intune policies combined
   */
  async getAllPolicies(): Promise<{
    compliancePolicies: IntuneDeviceCompliancePolicy[];
    configurationPolicies: IntuneConfigurationPolicy[];
    settingsCatalogPolicies: any[];
    endpointSecurityPolicies: any[];
    appProtectionPolicies: any[];
    enrollmentRestrictions: any[];
    deviceCount: number;
  }> {
    const [
      compliancePolicies,
      configurationPolicies,
      settingsCatalogPolicies,
      endpointSecurityPolicies,
      appProtectionPolicies,
      enrollmentRestrictions,
      deviceCount
    ] = await Promise.all([
      this.getDeviceCompliancePolicies(),
      this.getDeviceConfigurationPolicies(),
      this.getSettingsCatalogPolicies(),
      this.getEndpointSecurityPolicies(),
      this.getAppProtectionPolicies(),
      this.getDeviceEnrollmentRestrictions(),
      this.getManagedDeviceCount(),
    ]);

    return {
      compliancePolicies,
      configurationPolicies,
      settingsCatalogPolicies,
      endpointSecurityPolicies,
      appProtectionPolicies,
      enrollmentRestrictions,
      deviceCount,
    };
  }
}

export const intuneService = new IntuneService();
