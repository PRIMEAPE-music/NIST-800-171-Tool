/**
 * Settings Mapper Service
 * Maps individual M365 policy settings to NIST 800-171 controls
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  SettingsMappingLibrary,
  ControlMappingDefinition,
  SettingMapping,
  PolicyMappingInput,
  PolicyMappingOutput,
  ControlMappingResult,
  MappedSetting,
  ControlPolicyMappingCreate,
  SettingsMappingStats,
} from '../types/settingsMapper.types';
import {
  validateSetting,
  calculateConfidenceLevel,
  calculateOverallCompliance,
} from '../utils/validationHelpers';

const prisma = new PrismaClient();

class SettingsMapperService {
  private mappingLibrary: SettingsMappingLibrary | null = null;
  private microsoftActionsLibrary: any | null = null;

  /**
   * Load the settings mapping library from JSON file
   */
  loadMappingLibrary(): SettingsMappingLibrary {
    if (this.mappingLibrary) {
      return this.mappingLibrary;
    }

    const libraryPath = path.join(
      __dirname,
      '../../..',
      'data',
      'control-settings-mappings.json'
    );

    if (!fs.existsSync(libraryPath)) {
      throw new Error(`Mapping library not found at: ${libraryPath}`);
    }

    const libraryData = fs.readFileSync(libraryPath, 'utf-8');

    this.mappingLibrary = JSON.parse(libraryData) as SettingsMappingLibrary;

    console.log(
      `✓ Loaded settings mapping library v${this.mappingLibrary.version} ` +
      `with ${Object.keys(this.mappingLibrary.controls).length} controls`
    );

    return this.mappingLibrary;
  }

  /**
   * Load Microsoft improvement actions library from JSON file
   */
  loadMicrosoftActionsLibrary(): any {
    if (this.microsoftActionsLibrary) {
      return this.microsoftActionsLibrary;
    }

    const libraryPath = path.join(
      __dirname,
      '../../..',
      'data',
      'nist-improvement-actions.json'
    );

    if (!fs.existsSync(libraryPath)) {
      console.warn(`NIST 800-171 improvement actions library not found at: ${libraryPath}`);
      return { mappings: {} };
    }

    const libraryData = fs.readFileSync(libraryPath, 'utf-8');
    this.microsoftActionsLibrary = JSON.parse(libraryData);

    console.log(
      `✓ Loaded NIST 800-171 improvement actions library v${this.microsoftActionsLibrary.version} ` +
      `with ${Object.keys(this.microsoftActionsLibrary.mappings).length} control mappings`
    );

    return this.microsoftActionsLibrary;
  }

  /**
   * Map all settings for a single policy to NIST controls
   */
  mapPolicySettings(policy: PolicyMappingInput): PolicyMappingOutput {
    const library = this.loadMappingLibrary();
    const controlMappings: ControlMappingResult[] = [];

    // Iterate through all controls in the library
    for (const [controlId, controlDef] of Object.entries(library.controls)) {
      const mappingResult = this.mapPolicyToControl(policy, controlDef);

      // Only include mappings that have matched settings
      if (mappingResult && mappingResult.mappedSettings.length > 0) {
        controlMappings.push(mappingResult);
      }
    }

    return {
      policyId: policy.policyId,
      controlMappings,
    };
  }

  /**
   * Map a single policy to a single control
   */
  private mapPolicyToControl(
    policy: PolicyMappingInput,
    controlDef: ControlMappingDefinition
  ): ControlMappingResult | null {
    const mappedSettings: MappedSetting[] = [];

    // Check each setting mapping for this control
    for (const settingMapping of controlDef.settingMappings) {
      // Skip if policy type doesn't match
      if (!settingMapping.policyTypes.includes(policy.policyType)) {
        continue;
      }

      // Check each setting name (synonyms)
      for (const settingName of settingMapping.settingNames) {
        const settingValue = policy.settings[settingName];

        // Skip if setting doesn't exist in policy
        if (settingValue === undefined || settingValue === null) {
          continue;
        }

        // Validate the setting
        const validationResult = validateSetting(
          settingValue,
          settingMapping.validationType,
          settingMapping.requiredValue,
          settingName
        );

        // Add to mapped settings
        mappedSettings.push({
          settingName,
          settingValue,
          meetsRequirement: validationResult.meetsRequirement,
          requiredValue: settingMapping.requiredValue,
          validationType: settingMapping.validationType,
          validationMessage: validationResult.validationMessage,
        });

        // Only match first synonym that exists
        break;
      }
    }

    // No mapped settings for this control
    if (mappedSettings.length === 0) {
      return null;
    }

    // Calculate confidence
    const compliancePercentages = mappedSettings.map((s) =>
      s.meetsRequirement ? 100 : 0
    );
    const overallCompliance = calculateOverallCompliance(
      compliancePercentages.map((pct, idx) => ({
        settingName: mappedSettings[idx].settingName,
        settingValue: mappedSettings[idx].settingValue,
        requiredValue: mappedSettings[idx].requiredValue || false,
        validationType: mappedSettings[idx].validationType || 'boolean',
        meetsRequirement: mappedSettings[idx].meetsRequirement,
        compliancePercentage: pct,
        validationMessage: mappedSettings[idx].validationMessage || '',
      }))
    );

    const confidenceLevel = calculateConfidenceLevel(overallCompliance);

    // Generate mapping notes
    const compliantCount = mappedSettings.filter((s) => s.meetsRequirement).length;
    const totalCount = mappedSettings.length;
    const mappingNotes =
      `Settings-based mapping: ${compliantCount}/${totalCount} settings meet requirements. ` +
      `Settings: ${mappedSettings.map((s) => s.settingName).join(', ')}`;

    return {
      controlId: controlDef.controlId,
      controlTitle: controlDef.title,
      mappedSettings,
      overallConfidence: Math.round(overallCompliance),
      confidenceLevel,
      mappingNotes,
    };
  }

  /**
   * Extract settings from policy data
   * Returns a flat object of all settings
   */
  private extractPolicySettings(policyData: any, policyType: string): Record<string, any> {
    // For all policy types, settings are directly in the policy object
    // We return the entire policy data object so settings mapper can access any field
    return policyData;
  }

  /**
   * Map all policies in the database to controls
   * This is the main function called by policy sync
   */
  async mapAllPolicies(): Promise<SettingsMappingStats> {
    const startTime = Date.now();

    console.log('🔍 Starting settings-based auto-mapping...');

    // Load library
    this.loadMappingLibrary();

    // Fetch all policies from database
    const policies = await prisma.m365Policy.findMany({
      select: {
        id: true,
        policyId: true,
        policyName: true,
        policyType: true,
        policyData: true,
      },
    });

    console.log(`📋 Found ${policies.length} policies to map`);

    // Delete old auto-mapped mappings
    const deleteResult = await prisma.controlPolicyMapping.deleteMany({
      where: { isAutoMapped: true },
    });
    console.log(`🗑️  Deleted ${deleteResult.count} old auto-mapped records`);

    // Map each policy
    const allMappings: ControlPolicyMappingCreate[] = [];
    let settingsMatchedTotal = 0;

    for (const policy of policies) {
      // Parse policy data
      let policyData: any;
      try {
        policyData = JSON.parse(policy.policyData);
      } catch (error) {
        console.warn(`⚠️  Failed to parse policy data for ${policy.policyName}`);
        continue;
      }

      // Extract settings based on policy type
      // For Intune: settings are at root level
      // For Purview/AzureAD: settings are also at root
      const settings = this.extractPolicySettings(policyData, policy.policyType);

      const input: PolicyMappingInput = {
        policyId: policy.id,
        policyExternalId: policy.policyId,
        policyName: policy.policyName,
        policyType: policy.policyType as 'Intune' | 'Purview' | 'AzureAD',
        settings,
      };

      const output = this.mapPolicySettings(input);

      // Convert to database format
      for (const mapping of output.controlMappings) {
        // Get control database ID
        const control = await prisma.control.findUnique({
          where: { controlId: mapping.controlId },
          select: { id: true },
        });

        if (!control) {
          console.warn(`⚠️  Control ${mapping.controlId} not found in database`);
          continue;
        }

        allMappings.push({
          controlId: mapping.controlId,
          policyId: policy.id,
          mappingConfidence: mapping.confidenceLevel,
          mappingNotes: mapping.mappingNotes,
          mappedSettings: mapping.mappedSettings,
          isAutoMapped: true,
        });

        settingsMatchedTotal += mapping.mappedSettings.length;
      }
    }

    console.log(`✅ Generated ${allMappings.length} control-policy mappings`);

    // Insert new mappings
    let insertedCount = 0;
    for (const mapping of allMappings) {
      try {
        // Get control ID from controlId string
        const control = await prisma.control.findUnique({
          where: { controlId: mapping.controlId },
          select: { id: true },
        });

        if (!control) continue;

        await prisma.controlPolicyMapping.create({
          data: {
            controlId: control.id,
            policyId: mapping.policyId,
            mappingConfidence: mapping.mappingConfidence,
            mappingNotes: mapping.mappingNotes,
            mappedSettings: JSON.stringify(mapping.mappedSettings),
            isAutoMapped: mapping.isAutoMapped,
          },
        });
        insertedCount++;
      } catch (error: any) {
        // Skip duplicates (shouldn't happen with unique constraint)
        if (error.code !== 'P2002') {
          console.error(`Error inserting mapping:`, error);
        }
      }
    }

    // Calculate statistics
    const mappingsByConfidence = {
      High: allMappings.filter((m) => m.mappingConfidence === 'High').length,
      Medium: allMappings.filter((m) => m.mappingConfidence === 'Medium').length,
      Low: allMappings.filter((m) => m.mappingConfidence === 'Low').length,
    };

    const controlsCovered = new Set(allMappings.map((m) => m.controlId)).size;

    const duration = Date.now() - startTime;

    const stats: SettingsMappingStats = {
      totalPolicies: policies.length,
      totalMappingsCreated: insertedCount,
      mappingsByConfidence,
      controlsCovered,
      settingsMatched: settingsMatchedTotal,
      duration,
    };

    console.log('📊 Settings Mapping Statistics:');
    console.log(`   ├─ Policies analyzed: ${stats.totalPolicies}`);
    console.log(`   ├─ Mappings created: ${stats.totalMappingsCreated}`);
    console.log(`   ├─ Controls covered: ${stats.controlsCovered}`);
    console.log(`   ├─ Settings matched: ${stats.settingsMatched}`);
    console.log(`   ├─ High confidence: ${stats.mappingsByConfidence.High}`);
    console.log(`   ├─ Medium confidence: ${stats.mappingsByConfidence.Medium}`);
    console.log(`   ├─ Low confidence: ${stats.mappingsByConfidence.Low}`);
    console.log(`   └─ Duration: ${stats.duration}ms`);

    return stats;
  }

  /**
   * Get gap analysis - controls with no settings or non-compliant settings
   */
  /**
   * Get priority level for a control family
   * High priority families are those most commonly audited for NIST 800-171
   */
  private getFamilyPriority(family: string): 'Critical' | 'High' | 'Medium' | 'Low' {
    const criticalFamilies = ['AC', 'IA', 'SC']; // Access Control, Identification & Authentication, System & Communications Protection
    const highFamilies = ['AU', 'CM', 'SI', 'IR']; // Audit & Accountability, Configuration Management, System & Information Integrity, Incident Response
    const mediumFamilies = ['AT', 'MA', 'MP', 'PS', 'PE']; // Awareness & Training, Maintenance, Media Protection, Personnel Security, Physical Protection

    if (criticalFamilies.includes(family)) return 'Critical';
    if (highFamilies.includes(family)) return 'High';
    if (mediumFamilies.includes(family)) return 'Medium';
    return 'Low';
  }

  /**
   * Generate detailed remediation actions for a gap
   */
  private generateRemediationActions(
    controlId: string,
    gapType: 'NoSettings' | 'NonCompliantSettings',
    nonCompliantPolicies: any[]
  ): string[] {
    const library = this.loadMappingLibrary();
    const controlDef = library.controls[controlId];
    const actions: string[] = [];

    if (gapType === 'NoSettings') {
      actions.push('No Microsoft 365 settings currently satisfy this control');

      if (controlDef) {
        // Suggest what settings COULD satisfy this control
        const possibleSettings = controlDef.settingMappings.map(sm => {
          const policyTypeStr = sm.policyTypes.join(' or ');
          return `Configure ${policyTypeStr} policy with ${sm.settingNames[0]} setting`;
        });

        if (possibleSettings.length > 0) {
          actions.push('Recommended M365 settings to configure:');
          actions.push(...possibleSettings);
        } else {
          actions.push('Consider manual policy configuration or procedural controls');
        }
      } else {
        actions.push('Consider manual policy configuration or procedural controls');
      }
    } else {
      // NonCompliantSettings
      for (const policy of nonCompliantPolicies) {
        for (const setting of policy.nonCompliantSettings) {
          // More specific remediation based on setting
          if (setting.requiredValue !== undefined) {
            const requiredStr = typeof setting.requiredValue === 'object'
              ? JSON.stringify(setting.requiredValue)
              : String(setting.requiredValue);
            actions.push(
              `Update policy "${policy.policyName}": ` +
              `Change "${setting.settingName}" from "${setting.settingValue}" to "${requiredStr}"`
            );
          } else {
            actions.push(`${policy.policyName}: ${setting.validationMessage || setting.settingName + ' does not meet requirements'}`);
          }
        }
      }
    }

    return actions;
  }

  async getGapAnalysis() {
    const library = this.loadMappingLibrary();
    const allControlIds = Object.keys(library.controls);

    // Get all controls with their mappings
    const controlsWithMappings = await prisma.control.findMany({
      where: {
        controlId: { in: allControlIds },
      },
      include: {
        policyMappings: {
          where: { isAutoMapped: true },
          include: {
            policy: true,
          },
        },
      },
    });

    const gaps = [];

    for (const control of controlsWithMappings) {
      const priority = this.getFamilyPriority(control.family);

      if (control.policyMappings.length === 0) {
        // No settings mapped at all
        const recommendedActions = this.generateRemediationActions(
          control.controlId,
          'NoSettings',
          []
        );

        gaps.push({
          id: control.id,
          controlId: control.controlId,
          controlTitle: control.title,
          family: control.family,
          priority,
          gapType: 'NoSettings' as const,
          affectedPolicies: [],
          recommendedActions,
        });
      } else {
        // Check for non-compliant settings
        const nonCompliantPolicies = [];

        for (const mapping of control.policyMappings) {
          if (mapping.mappedSettings) {
            const settings = JSON.parse(mapping.mappedSettings);
            const nonCompliant = settings.filter((s: MappedSetting) => !s.meetsRequirement);

            if (nonCompliant.length > 0) {
              nonCompliantPolicies.push({
                policyId: mapping.policyId,
                policyName: mapping.policy.policyName,
                nonCompliantSettings: nonCompliant,
              });
            }
          }
        }

        if (nonCompliantPolicies.length > 0) {
          const recommendedActions = this.generateRemediationActions(
            control.controlId,
            'NonCompliantSettings',
            nonCompliantPolicies
          );

          gaps.push({
            id: control.id,
            controlId: control.controlId,
            controlTitle: control.title,
            family: control.family,
            priority,
            gapType: 'NonCompliantSettings' as const,
            affectedPolicies: nonCompliantPolicies,
            recommendedActions,
          });
        }
      }
    }

    // Sort gaps by priority (Critical first, then by control ID)
    const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
    gaps.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.controlId.localeCompare(b.controlId);
    });

    return {
      totalControls: allControlIds.length,
      controlsFullyCovered: controlsWithMappings.filter(
        (c) =>
          c.policyMappings.length > 0 &&
          c.policyMappings.every((m) => m.mappingConfidence === 'High')
      ).length,
      controlsPartiallyCovered: gaps.filter((g) => g.gapType === 'NonCompliantSettings').length,
      controlsNotCovered: gaps.filter((g) => g.gapType === 'NoSettings').length,
      gaps,
      coveragePercentage:
        ((controlsWithMappings.filter((c) => c.policyMappings.length > 0).length /
          allControlIds.length) *
          100),
    };
  }

  /**
   * Get M365 implementation recommendations for a specific control
   * Shows what settings should be configured with checkmarks for already satisfied settings
   */
  async getRecommendations(controlId: string) {
    const library = this.loadMappingLibrary();
    const controlDef = library.controls[controlId];

    if (!controlDef) {
      return {
        controlId,
        hasRecommendations: false,
        message: 'No M365 recommendations available for this control',
        recommendations: [],
      };
    }

    // Get current policy mappings for this control
    const controlWithMappings = await prisma.control.findUnique({
      where: { controlId },
      include: {
        policyMappings: {
          where: { isAutoMapped: true },
          include: {
            policy: true,
          },
        },
      },
    });

    // Extract all currently mapped settings
    const currentSettings: { [key: string]: any } = {};
    if (controlWithMappings) {
      for (const mapping of controlWithMappings.policyMappings) {
        if (mapping.mappedSettings) {
          const settings = JSON.parse(mapping.mappedSettings);
          for (const setting of settings) {
            currentSettings[setting.settingName] = {
              value: setting.settingValue,
              meetsRequirement: setting.meetsRequirement,
              policyName: mapping.policy.policyName,
              policyType: mapping.policy.policyType,
            };
          }
        }
      }
    }

    // Build recommendations with satisfaction status
    const recommendations = controlDef.settingMappings.map((settingMapping) => {
      // Check if any of the setting names in this mapping are currently satisfied
      const matchedSettings = settingMapping.settingNames
        .map((name) => currentSettings[name])
        .filter((s) => s !== undefined);

      const isSatisfied = matchedSettings.some((s) => s.meetsRequirement);
      const satisfiedBy = matchedSettings.find((s) => s.meetsRequirement);

      return {
        settingNames: settingMapping.settingNames,
        settingDisplayName: settingMapping.settingDisplayName,
        validationType: settingMapping.validationType,
        requiredValue: settingMapping.requiredValue,
        policyTypes: settingMapping.policyTypes,
        policySubType: settingMapping.policySubType,
        description: settingMapping.description,
        contextualHelp: settingMapping.contextualHelp,
        isSatisfied,
        satisfiedBy: satisfiedBy
          ? {
              settingName: settingMapping.settingNames.find((n) => currentSettings[n]?.meetsRequirement),
              settingValue: satisfiedBy.value,
              policyName: satisfiedBy.policyName,
              policyType: satisfiedBy.policyType,
            }
          : undefined,
      };
    });

    // Load Microsoft improvement actions for this control
    const microsoftActionsLib = this.loadMicrosoftActionsLibrary();
    const microsoftActions = microsoftActionsLib.mappings[controlId];

    return {
      controlId: controlDef.controlId,
      controlTitle: controlDef.title,
      family: controlDef.family,
      hasRecommendations: recommendations.length > 0,
      totalRecommendations: recommendations.length,
      satisfiedCount: recommendations.filter((r) => r.isSatisfied).length,
      recommendations,
      microsoftImprovementActions: microsoftActions?.improvementActions || [],
    };
  }
}

export default new SettingsMapperService();
