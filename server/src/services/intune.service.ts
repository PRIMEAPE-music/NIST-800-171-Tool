import { graphClientService } from './graphClient.service';
import { IntuneDeviceCompliancePolicy, IntuneConfigurationPolicy } from '../types/m365.types';

class IntuneService {
  /**
   * Fetch all device compliance policies from Intune
   */
  async getDeviceCompliancePolicies(): Promise<IntuneDeviceCompliancePolicy[]> {
    try {
      console.log('Fetching Intune device compliance policies...');

      const response = await graphClientService.get<{ value: IntuneDeviceCompliancePolicy[] }>(
        '/deviceManagement/deviceCompliancePolicies'
      );

      console.log(`✅ Found ${response.value.length} device compliance policies`);
      return response.value;
    } catch (error) {
      console.error('Error fetching device compliance policies:', error);
      throw new Error(`Failed to fetch Intune compliance policies: ${error}`);
    }
  }

  /**
   * Fetch all device configuration policies from Intune
   */
  async getDeviceConfigurationPolicies(): Promise<IntuneConfigurationPolicy[]> {
    try {
      console.log('Fetching Intune device configuration policies...');

      const response = await graphClientService.get<{ value: IntuneConfigurationPolicy[] }>(
        '/deviceManagement/deviceConfigurations'
      );

      console.log(`✅ Found ${response.value.length} device configuration policies`);
      return response.value;
    } catch (error) {
      console.error('Error fetching device configuration policies:', error);
      throw new Error(`Failed to fetch Intune configuration policies: ${error}`);
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
   * Get all Intune policies combined
   */
  async getAllPolicies(): Promise<{
    compliancePolicies: IntuneDeviceCompliancePolicy[];
    configurationPolicies: IntuneConfigurationPolicy[];
    enrollmentRestrictions: any[];
    deviceCount: number;
  }> {
    const [compliancePolicies, configurationPolicies, enrollmentRestrictions, deviceCount] =
      await Promise.all([
        this.getDeviceCompliancePolicies(),
        this.getDeviceConfigurationPolicies(),
        this.getDeviceEnrollmentRestrictions(),
        this.getManagedDeviceCount(),
      ]);

    return {
      compliancePolicies,
      configurationPolicies,
      enrollmentRestrictions,
      deviceCount,
    };
  }
}

export const intuneService = new IntuneService();
