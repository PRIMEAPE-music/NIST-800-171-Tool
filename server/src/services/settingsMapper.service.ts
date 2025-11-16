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
    const parsedData = JSON.parse(libraryData);

    // Check if this is the new keyword-based structure (array) vs old structure (object)
    if (parsedData.mappingStrategy === 'keyword-based' && Array.isArray(parsedData.controls)) {
      console.log(
        `⚠️  Settings mapping file is using new keyword-based structure. ` +
        `Old auto-mapper will be skipped. Use validateControlSettings() instead.`
      );
      // Return empty structure to allow old code to continue without errors
      this.mappingLibrary = {
        $schema: parsedData.version || 'NIST SP 800-171 Revision 3',
        version: parsedData.version || 'NIST SP 800-171 Revision 3',
        lastUpdated: parsedData.lastUpdated || new Date().toISOString(),
        description: 'Keyword-based structure - use validateControlSettings()',
        controls: {}
      };
    } else {
      // Old object-based structure
      this.mappingLibrary = parsedData as SettingsMappingLibrary;
    }

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
    for (const [, controlDef] of Object.entries(library.controls)) {
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
   * Handles both root-level settings and nested settings arrays
   */
  private extractPolicySettings(policyData: any, policyType: string): Record<string, any> {
    const extractedSettings: Record<string, any> = {};

    // First, copy all root-level properties (works for legacy policies)
    for (const [key, value] of Object.entries(policyData)) {
      // Skip metadata fields
      if (
        key !== 'id' &&
        key !== '@odata.type' &&
        key !== '@odata.context' &&
        key !== 'displayName' &&
        key !== 'name' &&
        key !== 'description' &&
        key !== 'createdDateTime' &&
        key !== 'lastModifiedDateTime' &&
        key !== 'createdBy' &&
        key !== 'lastModifiedBy' &&
        key !== 'createdTime' &&
        key !== 'lastModifiedTime' &&
        key !== 'platformType' &&
        key !== 'templateId'
      ) {
        extractedSettings[key] = value;
      }
    }

    // Handle Intune Settings Catalog policies (settings array)
    if (policyData.settings && Array.isArray(policyData.settings)) {
      console.log(`   📋 Extracting ${policyData.settings.length} settings from nested array`);

      policyData.settings.forEach((setting: any, index: number) => {
        if (setting.settingInstance) {
          const settingId = setting.settingInstance.settingDefinitionId || `setting_${index}`;

          // Extract the setting value
          let value = null;
          if (setting.settingInstance.simpleSettingValue) {
            value = setting.settingInstance.simpleSettingValue.value;
          } else if (setting.settingInstance.choiceSettingValue) {
            value = setting.settingInstance.choiceSettingValue.value;
          } else if (setting.settingInstance.groupSettingCollectionValue) {
            value = setting.settingInstance.groupSettingCollectionValue;
          }

          // Create a friendly key from the setting ID
          const friendlyKey = settingId
            .replace(/device_vendor_msft_/gi, '')
            .replace(/policy_/gi, '')
            .replace(/\//g, '_')
            .replace(/{/g, '')
            .replace(/}/g, '');

          extractedSettings[friendlyKey] = value;
        }
      });
    }

    // Handle Endpoint Security policies (also use settings array)
    if (policyType === 'Intune' && policyData.settings && !Array.isArray(policyData.settings)) {
      // Sometimes settings is an object with value arrays
      for (const [key, value] of Object.entries(policyData.settings)) {
        extractedSettings[key] = value;
      }
    }

    // Handle Purview DLP policies
    if (policyType === 'Purview') {
      if (policyData.Mode) extractedSettings.dlpMode = policyData.Mode;
      if (policyData.Enabled !== undefined) extractedSettings.enabled = policyData.Enabled;
    }

    // Handle Azure AD Conditional Access
    if (policyType === 'AzureAD') {
      if (policyData.state) extractedSettings.state = policyData.state;
      if (policyData.conditions) extractedSettings.conditions = policyData.conditions;
      if (policyData.grantControls) extractedSettings.grantControls = policyData.grantControls;
      if (policyData.sessionControls) extractedSettings.sessionControls = policyData.sessionControls;
    }

    const settingsCount = Object.keys(extractedSettings).length;
    if (settingsCount > 0) {
      console.log(`   ✅ Extracted ${settingsCount} settings for mapping`);
    } else {
      console.log(`   ⚠️  No settings extracted (policy may only have metadata)`);
    }

    return extractedSettings;
  }

  /**
   * Map all policies in the database to controls
   * This is the main function called by policy sync
   */
  async mapAllPolicies(): Promise<SettingsMappingStats> {
    const startTime = Date.now();

    console.log('🔍 Starting settings-based auto-mapping...');

    // Check if we should use keyword-based mapping
    const keywordMappings = await this.loadKeywordBasedMappings();
    const isKeywordBased = keywordMappings.mappingStrategy === 'keyword-based' && Array.isArray(keywordMappings.controls);

    if (isKeywordBased) {
      console.log('✨ Using new keyword-based auto-mapping approach');
      return await this.mapAllPoliciesKeywordBased();
    }

    // Fall back to old mapping approach
    console.log('⚠️  Using legacy auto-mapping approach');

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
   * Map all policies using keyword-based approach
   * This is the new auto-mapper for the keyword-based structure
   */
  private async mapAllPoliciesKeywordBased(): Promise<SettingsMappingStats> {
    const startTime = Date.now();

    // Load keyword-based mappings
    const keywordMappings = await this.loadKeywordBasedMappings();
    const controls = keywordMappings.controls || [];

    console.log(`📋 Found ${controls.length} controls with keyword-based mappings`);

    // Delete old auto-mapped mappings
    const deleteResult = await prisma.controlPolicyMapping.deleteMany({
      where: { isAutoMapped: true },
    });
    console.log(`🗑️  Deleted ${deleteResult.count} old auto-mapped records`);

    const allMappings: ControlPolicyMappingCreate[] = [];
    let settingsMatchedTotal = 0;

    // Process each control
    for (const control of controls) {
      const { controlId, settingsMappings } = control;

      // Get control from database
      const dbControl = await prisma.control.findUnique({
        where: { controlId },
        select: { id: true },
      });

      if (!dbControl) {
        console.warn(`⚠️  Control ${controlId} not found in database`);
        continue;
      }

      console.log(`\n🔍 Processing control ${controlId}: ${control.controlTitle}`);

      // Search for settings across all mappings for this control
      const matchedPolicies = new Map<number, { settings: any[], confidence: string }>();

      for (const mapping of settingsMappings) {
        console.log(`   📝 Searching for: ${mapping.description}`);
        console.log(`      Keywords: ${mapping.searchStrategy.settingNameKeywords.join(', ')}`);
        console.log(`      Policy types: ${mapping.policyTypes.join(', ')}`);

        // Search for matching settings
        const matchedSettings = await this.searchSettingsByKeywords(
          mapping.policyTypes,
          mapping.searchStrategy
        );

        console.log(`      ✓ Found ${matchedSettings.length} matching settings`);

        if (matchedSettings.length > 0) {
          settingsMatchedTotal += matchedSettings.length;

          // Group by policy
          for (const setting of matchedSettings) {
            const validation = this.validateSettingValue(
              setting.settingValue,
              mapping.validation
            );

            const settingData = {
              settingName: setting.settingName,
              settingValue: setting.settingValue,
              meetsRequirement: validation.isCompliant,
              requiredValue: mapping.validation.expectedValue,
              validationType: mapping.validation.dataType,
              validationMessage: validation.message,
            };

            if (!matchedPolicies.has(setting.policyId)) {
              matchedPolicies.set(setting.policyId, {
                settings: [],
                confidence: mapping.compliance.confidence,
              });
            }

            const policyData = matchedPolicies.get(setting.policyId)!;
            policyData.settings.push(settingData);

            // Upgrade confidence if this mapping has higher confidence
            if (
              mapping.compliance.confidence === 'High' ||
              (mapping.compliance.confidence === 'Medium' && policyData.confidence === 'Low')
            ) {
              policyData.confidence = mapping.compliance.confidence;
            }
          }
        }
      }

      // Create mappings for each policy that matched
      for (const [policyId, data] of matchedPolicies.entries()) {
        const compliantCount = data.settings.filter((s) => s.meetsRequirement).length;
        const totalCount = data.settings.length;

        allMappings.push({
          controlId: controlId,
          policyId: policyId,
          mappingConfidence: data.confidence as 'High' | 'Medium' | 'Low',
          mappingNotes: `Keyword-based mapping: ${compliantCount}/${totalCount} settings meet requirements. ` +
            `Settings: ${data.settings.map((s) => s.settingName).join(', ')}`,
          mappedSettings: data.settings,
          isAutoMapped: true,
        });
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
      totalPolicies: await prisma.m365Policy.count(),
      totalMappingsCreated: insertedCount,
      mappingsByConfidence,
      controlsCovered,
      settingsMatched: settingsMatchedTotal,
      duration,
    };

    console.log('📊 Keyword-Based Mapping Statistics:');
    console.log(`   ├─ Total controls processed: ${controls.length}`);
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
   * Load keyword-based settings mappings file
   */
  private async loadKeywordBasedMappings(): Promise<any> {
    try {
      const mappingsPath = path.join(__dirname, '../../../data/control-settings-mappings.json');
      const data = fs.readFileSync(mappingsPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading keyword-based settings mappings:', error);
      return { controls: [] };
    }
  }

  /**
   * Search for settings in policies using keyword-based matching
   */
  private async searchSettingsByKeywords(
    policyTypes: string[],
    searchStrategy: {
      mode: string;
      settingNameKeywords: string[];
      settingPathPatterns?: string[];
      excludeKeywords?: string[];
    }
  ): Promise<Array<{
    policyId: number;
    policyName: string;
    policyType: string;
    settingName: string;
    settingValue: any;
    matchScore: number;
  }>> {
    // Get all policies of specified types
    const policies = await prisma.m365Policy.findMany({
      where: {
        policyType: { in: policyTypes }
      }
    });

    console.log(`         → Searching ${policies.length} ${policyTypes.join('/')} policies`);

    const matches: Array<{
      policyId: number;
      policyName: string;
      policyType: string;
      settingName: string;
      settingValue: any;
      matchScore: number;
    }> = [];

    for (const policy of policies) {
      let settings: any = {};

      try {
        // Parse policy data
        let parsedData: any;
        if (policy.policyData) {
          if (typeof policy.policyData === 'string') {
            parsedData = JSON.parse(policy.policyData);
          } else {
            parsedData = policy.policyData;
          }
        }

        // Extract settings using the improved extraction function
        // This properly handles nested Settings Catalog arrays
        settings = this.extractPolicySettings(parsedData, policy.policyType);
      } catch (error) {
        console.warn(`Failed to parse settings for policy ${policy.id}:`, error);
        continue;
      }

      // Search through all settings in this policy
      const policyMatches = this.findMatchingSettings(
        settings,
        searchStrategy.settingNameKeywords,
        searchStrategy.settingPathPatterns,
        searchStrategy.excludeKeywords
      );

      // Add matches with policy context
      for (const match of policyMatches) {
        matches.push({
          policyId: policy.id,
          policyName: policy.policyName,
          policyType: policy.policyType,
          settingName: match.path,
          settingValue: match.value,
          matchScore: match.score
        });
      }
    }

    return matches;
  }

  /**
   * Recursively find settings matching keywords in a nested object
   */
  private findMatchingSettings(
    obj: any,
    keywords: string[],
    pathPatterns?: string[],
    excludeKeywords?: string[],
    currentPath: string = ''
  ): Array<{ path: string; value: any; score: number }> {
    const matches: Array<{ path: string; value: any; score: number }> = [];

    if (obj === null || obj === undefined) {
      return matches;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const itemPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`;
        matches.push(...this.findMatchingSettings(item, keywords, pathPatterns, excludeKeywords, itemPath));
      });
      return matches;
    }

    // Handle objects
    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;

        // Check if this setting name matches keywords
        const keyLower = key.toLowerCase();
        const pathLower = newPath.toLowerCase();

        // Check exclude keywords first
        if (excludeKeywords && excludeKeywords.some(exclude =>
          keyLower.includes(exclude.toLowerCase()) || pathLower.includes(exclude.toLowerCase())
        )) {
          continue; // Skip this setting
        }

        // Check if keywords match
        const keywordMatches = keywords.filter(keyword =>
          keyLower.includes(keyword.toLowerCase()) || pathLower.includes(keyword.toLowerCase())
        );

        // Calculate match percentage
        const matchPercentage = keywordMatches.length / keywords.length;

        // Require at least 50% keyword match (at least half the keywords must match)
        // OR if there are only 1-2 keywords, require all to match
        const minMatchThreshold = keywords.length <= 2 ? 1.0 : 0.5;

        // Check path patterns if specified
        let pathMatch = !pathPatterns || pathPatterns.length === 0;
        if (pathPatterns && pathPatterns.length > 0) {
          pathMatch = pathPatterns.some(pattern => {
            const regexPattern = pattern.replace(/\*/g, '.*').toLowerCase();
            return new RegExp(`^${regexPattern}$`).test(pathLower);
          });
        }

        // If this is a match, add it
        if (matchPercentage >= minMatchThreshold && pathMatch) {
          const score = matchPercentage;
          matches.push({
            path: newPath,
            value: value,
            score: score
          });
        }

        // Recursively search nested objects
        if (typeof value === 'object' && value !== null) {
          matches.push(...this.findMatchingSettings(value, keywords, pathPatterns, excludeKeywords, newPath));
        }
      }
    }

    return matches;
  }

  /**
   * Validate a setting value against expected criteria
   */
  private validateSettingValue(
    actualValue: any,
    validation: {
      expectedValue: any;
      operator: string;
      dataType: string;
      allowedValues?: any[];
    }
  ): { isCompliant: boolean; message: string } {
    const { expectedValue, operator, dataType, allowedValues } = validation;

    // Type conversion based on dataType
    let actual = actualValue;
    let expected = expectedValue;

    if (dataType === 'integer') {
      actual = parseInt(actualValue);
      expected = parseInt(expectedValue);
    } else if (dataType === 'boolean') {
      actual = actualValue === true || actualValue === 'true' || actualValue === 1;
      expected = expectedValue === true || expectedValue === 'true';
    }

    // Perform comparison based on operator
    let isCompliant = false;
    let message = '';

    switch (operator) {
      case '==':
        isCompliant = actual === expected;
        message = isCompliant
          ? `Value matches expected: ${expected}`
          : `Value ${actual} does not match expected ${expected}`;
        break;

      case '>=':
        isCompliant = actual >= expected;
        message = isCompliant
          ? `Value ${actual} meets minimum requirement of ${expected}`
          : `Value ${actual} is below minimum requirement of ${expected}`;
        break;

      case '<=':
        isCompliant = actual <= expected;
        message = isCompliant
          ? `Value ${actual} meets maximum requirement of ${expected}`
          : `Value ${actual} exceeds maximum requirement of ${expected}`;
        break;

      case '>':
        isCompliant = actual > expected;
        message = isCompliant
          ? `Value ${actual} exceeds minimum of ${expected}`
          : `Value ${actual} does not exceed ${expected}`;
        break;

      case '<':
        isCompliant = actual < expected;
        message = isCompliant
          ? `Value ${actual} is below maximum of ${expected}`
          : `Value ${actual} is not below ${expected}`;
        break;

      case 'contains':
        if (Array.isArray(actual)) {
          isCompliant = actual.includes(expected);
        } else if (typeof actual === 'string') {
          isCompliant = actual.includes(expected);
        }
        message = isCompliant
          ? `Value contains ${expected}`
          : `Value does not contain ${expected}`;
        break;

      case 'in':
        if (allowedValues) {
          isCompliant = allowedValues.includes(actual);
          message = isCompliant
            ? `Value ${actual} is in allowed list`
            : `Value ${actual} not in allowed list: ${allowedValues.join(', ')}`;
        } else if (Array.isArray(expected)) {
          isCompliant = expected.includes(actual);
          message = isCompliant
            ? `Value ${actual} is in expected list`
            : `Value ${actual} not in expected list`;
        }
        break;

      case 'matches':
        try {
          const regex = new RegExp(expected);
          isCompliant = regex.test(String(actual));
          message = isCompliant
            ? `Value matches pattern ${expected}`
            : `Value does not match pattern ${expected}`;
        } catch (error) {
          message = `Invalid regex pattern: ${expected}`;
        }
        break;

      default:
        message = `Unknown operator: ${operator}`;
    }

    return { isCompliant, message };
  }

  /**
   * Validate control settings using keyword-based search
   */
  async validateControlSettings(controlId: string) {
    // Validate Rev 3 format
    if (!controlId.match(/^03\.\d{2}\.\d{2}$/)) {
      throw new Error('Invalid control ID format. Expected 03.XX.YY');
    }

    // Load keyword-based settings mappings
    const settingsMappings = await this.loadKeywordBasedMappings();
    const controlMappings = settingsMappings.controls.find((c: any) => c.controlId === controlId);

    if (!controlMappings || !controlMappings.settingsMappings || controlMappings.settingsMappings.length === 0) {
      return {
        controlId,
        hasSettings: false,
        message: 'No settings mappings defined for this control',
        mappings: []
      };
    }

    // Search for and validate each settings mapping
    const validationResults = [];

    for (const mapping of controlMappings.settingsMappings) {
      // Search for matching settings across policies
      const matchedSettings = await this.searchSettingsByKeywords(
        mapping.policyTypes,
        mapping.searchStrategy
      );

      // Validate each matched setting
      const settingResults = matchedSettings.map(setting => {
        const validation = this.validateSettingValue(
          setting.settingValue,
          mapping.validation
        );

        return {
          mappingId: mapping.id,
          description: mapping.description,
          policyId: setting.policyId,
          policyName: setting.policyName,
          policyType: setting.policyType,
          settingName: setting.settingName,
          settingValue: setting.settingValue,
          expectedValue: mapping.validation.expectedValue,
          isCompliant: validation.isCompliant,
          validationMessage: validation.message,
          confidence: mapping.compliance.confidence,
          nistRequirement: mapping.compliance.nistRequirement,
          matchScore: setting.matchScore
        };
      });

      validationResults.push({
        mappingId: mapping.id,
        description: mapping.description,
        settingsFound: matchedSettings.length,
        results: settingResults
      });
    }

    return {
      controlId,
      controlTitle: controlMappings.controlTitle,
      priority: controlMappings.priority,
      hasSettings: validationResults.some(r => r.settingsFound > 0),
      totalMappings: controlMappings.settingsMappings.length,
      validationResults
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
        message: 'No Microsoft Improvement Actions available for this control',
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
