import { PrismaClient } from '@prisma/client';
import { SmartExtractor } from '../services/smart-extractor.service.js';

const prisma = new PrismaClient();
const smartExtractor = new SmartExtractor();

/**
 * Script to rebuild SettingComplianceCheck records correctly
 *
 * This script will:
 * 1. For each policy, find all settings that match its template type
 * 2. Parse the policy's actual configuration data
 * 3. Create SettingComplianceCheck records linking policy -> setting with actual values
 * 4. Calculate compliance status by comparing actual vs expected values
 */

async function rebuildComplianceChecks() {
  console.log('\n' + '='.repeat(80));
  console.log('REBUILDING SETTING COMPLIANCE CHECKS');
  console.log('='.repeat(80) + '\n');

  // Get all policies
  const policies = await prisma.m365Policy.findMany({
    select: {
      id: true,
      policyName: true,
      policyType: true,
      odataType: true,
      policyData: true,
    }
  });

  console.log(`Found ${policies.length} policies to process\n`);

  let totalChecksCreated = 0;
  let totalPoliciesProcessed = 0;

  for (const policy of policies) {
    console.log(`\n📋 Processing: ${policy.policyName}`);
    console.log(`   Type: ${policy.policyType}`);
    console.log(`   Template: ${policy.odataType || 'NONE'}`);

    if (!policy.odataType) {
      console.log('   ⚠️  No template type - skipping');
      continue;
    }

    // Find all settings that match this policy template
    const settings = await prisma.m365Setting.findMany({
      where: {
        policyTemplate: policy.odataType,
        isActive: true,
      },
      include: {
        controlMappings: true,
      }
    });

    console.log(`   Found ${settings.length} settings for this template`);

    if (settings.length === 0) {
      console.log('   ℹ️  No settings found for this template');
      continue;
    }

    // Parse policy data to extract actual values
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(policy.policyData);
    } catch (error) {
      console.log('   ❌ Failed to parse policy data');
      continue;
    }

    // Show sample of policy data structure
    console.log(`   Policy data keys: ${Object.keys(parsedData).slice(0, 5).join(', ')}...`);

    // Delete existing compliance checks for this policy
    const deleted = await prisma.settingComplianceCheck.deleteMany({
      where: { policyId: policy.id }
    });
    console.log(`   Deleted ${deleted.count} old compliance checks`);

    let checksCreated = 0;

    // Create new compliance checks
    for (const setting of settings) {
      // Extract actual value using SmartExtractor (includes Settings Catalog & OMA-URI support)
      const extractionResult = await smartExtractor.extractValue(policy, setting);
      const actualValue = extractionResult.value;

      // Only create check if we found an actual value
      if (actualValue !== null && actualValue !== undefined) {
        const isCompliant = checkCompliance(actualValue, setting.expectedValue, setting.validationOperator);

        await prisma.settingComplianceCheck.create({
          data: {
            policyId: policy.id,
            settingId: setting.id,
            expectedValue: String(setting.expectedValue),
            actualValue: String(actualValue),
            isCompliant,
            lastChecked: new Date(),
          }
        });

        checksCreated++;
      }
    }

    console.log(`   ✅ Created ${checksCreated} compliance checks`);
    totalChecksCreated += checksCreated;
    totalPoliciesProcessed++;
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Policies processed: ${totalPoliciesProcessed}/${policies.length}`);
  console.log(`Total compliance checks created: ${totalChecksCreated}`);

  await prisma.$disconnect();
}

/**
 * Extract actual value from policy data based on setting configuration
 * HYBRID APPROACH: Try multiple strategies
 */
function extractActualValue(policyData: any, setting: any): any {
  // Strategy 1: Direct property match
  if (setting.settingName && policyData[setting.settingName] !== undefined) {
    return policyData[setting.settingName];
  }

  // Strategy 2: Try alternate names
  if (setting.alternateNames) {
    try {
      const alternates = JSON.parse(setting.alternateNames);
      for (const altName of alternates) {
        if (policyData[altName] !== undefined) {
          return policyData[altName];
        }
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  }

  // Strategy 3: Strip prefix from setting name (e.g., "authorizationPolicy.allowedToUseSSPR" → "allowedToUseSSPR")
  if (setting.settingName && setting.settingName.includes('.')) {
    const withoutPrefix = setting.settingName.split('.').pop();
    if (withoutPrefix && policyData[withoutPrefix] !== undefined) {
      return policyData[withoutPrefix];
    }
  }

  // Strategy 4: Path-based lookup (e.g., "security.passwordMinimumLength")
  if (setting.settingPath) {
    const value = getNestedValue(policyData, setting.settingPath);
    if (value !== undefined) {
      return value;
    }
  }

  // Strategy 5: Search in nested "settings" array (for settingsCatalog policies)
  if (policyData.settings && Array.isArray(policyData.settings)) {
    const value = searchInSettingsArray(policyData.settings, setting.settingName, setting.displayName);
    if (value !== undefined) {
      return value;
    }
  }

  // Strategy 6: Case-insensitive property match
  if (setting.settingName) {
    const lowerSettingName = setting.settingName.toLowerCase();
    for (const key of Object.keys(policyData)) {
      if (key.toLowerCase() === lowerSettingName) {
        return policyData[key];
      }
    }
  }

  return null;
}

/**
 * Search for a setting value in nested settings array (settingsCatalog policies)
 */
function searchInSettingsArray(settings: any[], settingName: string | null, displayName: string): any {
  if (!settingName && !displayName) return undefined;

  for (const settingGroup of settings) {
    // Settings can be nested in different ways
    if (settingGroup.settingInstance) {
      // Check if this is the setting we're looking for
      const instance = settingGroup.settingInstance;

      // Match by settingDefinitionId or display name
      if (instance.settingDefinitionId && settingName) {
        if (instance.settingDefinitionId.includes(settingName) ||
            settingName.includes(instance.settingDefinitionId)) {
          // Extract the value based on type
          if (instance.simpleSettingValue) {
            return instance.simpleSettingValue.value;
          } else if (instance.choiceSettingValue) {
            return instance.choiceSettingValue.value;
          } else if (instance.groupSettingValue) {
            // For group settings, might need to recurse
            return JSON.stringify(instance.groupSettingValue);
          }
        }
      }

      // Try matching by display name as fallback
      if (instance.displayName && displayName) {
        const similarity = instance.displayName.toLowerCase().includes(displayName.toLowerCase()) ||
                          displayName.toLowerCase().includes(instance.displayName.toLowerCase());
        if (similarity && instance.simpleSettingValue) {
          return instance.simpleSettingValue.value;
        }
      }
    }

    // Recurse into children if they exist
    if (settingGroup.children && Array.isArray(settingGroup.children)) {
      const childValue = searchInSettingsArray(settingGroup.children, settingName, displayName);
      if (childValue !== undefined) {
        return childValue;
      }
    }
  }

  return undefined;
}

/**
 * Get nested property value using dot notation path
 */
function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Check if actual value complies with expected value based on operator
 */
function checkCompliance(actualValue: any, expectedValue: any, operator: string): boolean {
  // Convert values to comparable types
  const actual = String(actualValue).toLowerCase();
  const expected = String(expectedValue).toLowerCase();

  switch (operator?.toLowerCase()) {
    case 'equals':
    case 'equal':
    case '==':
      return actual === expected;

    case 'notequals':
    case 'notequal':
    case '!=':
      return actual !== expected;

    case 'greaterthan':
    case '>':
      return parseFloat(actual) > parseFloat(expected);

    case 'lessthan':
    case '<':
      return parseFloat(actual) < parseFloat(expected);

    case 'contains':
      return actual.includes(expected);

    case 'notcontains':
      return !actual.includes(expected);

    case 'isset':
    case 'exists':
      return actual !== 'null' && actual !== 'undefined' && actual !== '';

    default:
      // Default: treat as equals
      return actual === expected;
  }
}

// Run the script
rebuildComplianceChecks().catch(console.error);
