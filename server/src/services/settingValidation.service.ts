// server/src/services/settingValidation.service.ts

import { PrismaClient } from '@prisma/client';
import { validationEngineService } from './validationEngine.service';
import {
  ValidationOperator,
  ValidationType,
  SettingValidationResult,
} from '../types/m365.types';

const prisma = new PrismaClient();

/**
 * Setting Validation Service
 *
 * Integrates validation engine with database operations.
 * Validates M365 policy settings and stores results.
 */
class SettingValidationService {
  /**
   * Validate a single setting against policy data
   *
   * @param settingId - Database ID of the M365Setting
   * @param policyData - The policy data containing the actual value (as JSON object or string)
   * @returns Validation result with compliance status
   */
  async validateSetting(
    settingId: number,
    policyData: any
  ): Promise<SettingValidationResult | null> {
    try {
      // Get setting details from database
      const setting = await prisma.m365Setting.findUnique({
        where: { id: settingId },
      });

      if (!setting) {
        console.error(`Setting not found: ${settingId}`);
        return null;
      }

      // Parse policy data if it's a string
      let parsedPolicyData = policyData;
      if (typeof policyData === 'string') {
        try {
          parsedPolicyData = JSON.parse(policyData);
        } catch (e) {
          console.error('Failed to parse policy data:', e);
          parsedPolicyData = {};
        }
      }

      // Extract actual value from policy data using settingPath
      const extraction = validationEngineService.extractValueFromPath(
        parsedPolicyData,
        setting.settingPath
      );

      if (!extraction.success) {
        // Setting not found in policy - mark as not configured
        return {
          settingId: setting.id.toString(),
          settingName: setting.displayName,
          policyType: setting.policyType,
          isCompliant: false,
          validationResult: {
            isValid: false,
            actualValue: null,
            expectedValue: setting.expectedValue,
            operator: setting.validationOperator as ValidationOperator,
            errorMessage: 'Setting not found in policy data (not configured)',
          },
          timestamp: new Date(),
        };
      }

      // Validate the extracted value
      const validationResult = validationEngineService.validate(
        extraction.value,
        setting.expectedValue,
        setting.validationOperator as ValidationOperator,
        setting.dataType as ValidationType
      );

      return {
        settingId: setting.id.toString(),
        settingName: setting.displayName,
        policyType: setting.policyType,
        isCompliant: validationResult.isValid,
        validationResult,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error validating setting:', error);
      return null;
    }
  }

  /**
   * Validate all settings for a specific policy
   *
   * @param policyId - Database ID of the M365Policy
   * @returns Array of validation results
   */
  async validatePolicySettings(policyId: number): Promise<SettingValidationResult[]> {
    try {
      // Get policy and its data
      const policy = await prisma.m365Policy.findUnique({
        where: { id: policyId },
      });

      if (!policy) {
        console.error(`Policy not found: ${policyId}`);
        return [];
      }

      // Parse policy data
      let policyData;
      try {
        policyData = JSON.parse(policy.policyData);
      } catch (e) {
        console.error('Failed to parse policy data:', e);
        return [];
      }

      // Get all settings for this policy type
      const settings = await prisma.m365Setting.findMany({
        where: {
          policyType: policy.policyType,
          isActive: true,
        },
      });

      // Validate each setting
      const validationPromises = settings.map(setting =>
        this.validateSetting(setting.id, policyData)
      );

      const results = await Promise.all(validationPromises);

      // Filter out null results
      return results.filter((result): result is SettingValidationResult => result !== null);
    } catch (error) {
      console.error('Error validating policy settings:', error);
      return [];
    }
  }

  /**
   * Validate all settings for a control
   *
   * @param controlId - The control database ID (not controlId string like 'AC.1.001')
   * @returns Array of validation results
   */
  async validateControlSettings(controlId: number): Promise<SettingValidationResult[]> {
    try {
      // Get all settings mapped to this control
      const mappings = await prisma.controlSettingMapping.findMany({
        where: { controlId },
        include: {
          setting: true,
        },
      });

      if (mappings.length === 0) {
        console.log(`No settings mapped to control ID: ${controlId}`);
        return [];
      }

      // Get all relevant policies
      const policyTypes = [...new Set(mappings.map(m => m.setting.policyType))];
      const policies = await prisma.m365Policy.findMany({
        where: {
          policyType: { in: policyTypes },
          isActive: true,
        },
      });

      // Create a map of policy type to policy data
      const policyDataMap = new Map<string, any>();
      for (const policy of policies) {
        try {
          const parsedData = JSON.parse(policy.policyData);
          policyDataMap.set(policy.policyType, parsedData);
        } catch (e) {
          console.error(`Failed to parse policy data for ${policy.policyType}:`, e);
        }
      }

      // Validate each setting
      const validationPromises = mappings.map(async mapping => {
        const policyData = policyDataMap.get(mapping.setting.policyType);
        if (!policyData) {
          return null;
        }
        return this.validateSetting(mapping.setting.id, policyData);
      });

      const results = await Promise.all(validationPromises);

      // Filter out null results
      return results.filter((result): result is SettingValidationResult => result !== null);
    } catch (error) {
      console.error('Error validating control settings:', error);
      return [];
    }
  }

  /**
   * Store validation results in database
   *
   * @param results - Array of validation results to store
   * @param policyId - The policy ID these validations are for
   */
  async storeValidationResults(
    results: SettingValidationResult[],
    policyId: number
  ): Promise<void> {
    try {
      // Delete old results for these setting/policy combinations
      const settingIds = results.map(r => parseInt(r.settingId));
      await prisma.settingComplianceCheck.deleteMany({
        where: {
          settingId: { in: settingIds },
          policyId: policyId,
        },
      });

      // Insert new results
      const creates = results.map(result =>
        prisma.settingComplianceCheck.create({
          data: {
            settingId: parseInt(result.settingId),
            policyId: policyId,
            isCompliant: result.isCompliant,
            actualValue: JSON.stringify(result.validationResult.actualValue),
            expectedValue: JSON.stringify(result.validationResult.expectedValue),
            complianceMessage: result.validationResult.errorMessage ||
              (result.isCompliant ? 'Compliant' : 'Non-compliant'),
            lastChecked: result.timestamp,
          },
        })
      );

      await Promise.all(creates);
      console.log(`Stored ${results.length} validation results`);
    } catch (error) {
      console.error('Error storing validation results:', error);
      throw error;
    }
  }

  /**
   * Get compliance status for a specific setting
   *
   * @param settingId - Database ID of the M365Setting
   * @param policyId - Database ID of the M365Policy
   * @returns Compliance check result or null
   */
  async getSettingComplianceStatus(
    settingId: number,
    policyId: number
  ): Promise<any> {
    try {
      const check = await prisma.settingComplianceCheck.findUnique({
        where: {
          settingId_policyId: {
            settingId,
            policyId,
          },
        },
        include: {
          setting: true,
          policy: true,
        },
      });

      return check;
    } catch (error) {
      console.error('Error getting setting compliance status:', error);
      return null;
    }
  }

  /**
   * Get all compliance checks for a control
   *
   * @param controlId - The control database ID
   * @returns Array of compliance checks
   */
  async getControlComplianceChecks(controlId: number): Promise<any[]> {
    try {
      const mappings = await prisma.controlSettingMapping.findMany({
        where: { controlId },
        include: {
          setting: {
            include: {
              complianceChecks: {
                include: {
                  policy: true,
                },
              },
            },
          },
        },
      });

      // Flatten the compliance checks
      const checks = mappings.flatMap(m =>
        m.setting.complianceChecks.map(check => ({
          ...check,
          settingDisplayName: m.setting.displayName,
          policyName: check.policy.policyName,
        }))
      );

      return checks;
    } catch (error) {
      console.error('Error getting control compliance checks:', error);
      return [];
    }
  }
}

// Export singleton instance
export const settingValidationService = new SettingValidationService();
