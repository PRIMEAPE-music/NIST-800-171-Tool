/**
 * Smart Extractor Service
 *
 * Multi-strategy extraction engine for M365 policy settings
 * Tries multiple approaches to find setting values in policy JSON
 *
 * CORRECTED: Uses policyData field and odataType from database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ===== TYPE DEFINITIONS =====

export interface ExtractionResult {
  value: any;
  strategy: string;
  confidence: number;
  path?: string; // Actual path where value was found
  error?: string;
}

export interface ExtractionStrategy {
  name: string;
  priority: number;
  description: string;
  extract: (policyData: any, setting: any) => ExtractionResult | null;
}

// ===== UTILITY FUNCTIONS =====

/**
 * Safely get nested value from object using dot notation path
 */
function getNestedValue(obj: any, path: string): any {
  if (!path || !obj) return undefined;

  try {
    return path.split('.').reduce((current, key) => {
      // Handle array notation like "properties[0]"
      if (key.includes('[')) {
        const arrayKey = key.substring(0, key.indexOf('['));
        const indexMatch = key.match(/\[(\d+)\]/);
        if (indexMatch && current?.[arrayKey]) {
          return current[arrayKey][parseInt(indexMatch[1])];
        }
      }
      return current?.[key];
    }, obj);
  } catch (error) {
    return undefined;
  }
}

/**
 * Convert string to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase());
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * Recursively search object for a key (shallow - max 2 levels)
 */
function shallowSearch(obj: any, searchKey: string, maxDepth: number = 2): any {
  const normalizedKey = searchKey.toLowerCase();

  function search(current: any, depth: number): any {
    if (depth > maxDepth || !current || typeof current !== 'object') {
      return undefined;
    }

    // Search current level
    for (const key in current) {
      if (key.toLowerCase() === normalizedKey) {
        return current[key];
      }
    }

    // Search one level deeper
    if (depth < maxDepth) {
      for (const key in current) {
        if (current[key] && typeof current[key] === 'object') {
          const result = search(current[key], depth + 1);
          if (result !== undefined) return result;
        }
      }
    }

    return undefined;
  }

  return search(obj, 0);
}

/**
 * Search in Settings Catalog settings array (the actual format used by Graph API)
 * Settings Catalog policies store values in settings[].settingInstance
 */
function searchSettingsCatalog(settings: any[], searchKey: string): { value: any; definitionId: string } | undefined {
  if (!Array.isArray(settings)) return undefined;

  const normalizedKey = searchKey.toLowerCase();

  // Generate multiple search variants
  const searchVariants = [
    normalizedKey,
    normalizedKey.replace(/[^a-z0-9]/g, ''), // Remove special chars
    toCamelCase(searchKey).toLowerCase(),
  ];

  for (const item of settings) {
    const instance = item.settingInstance;
    if (!instance) continue;

    const definitionId = instance.settingDefinitionId || '';
    const defIdLower = definitionId.toLowerCase();

    // Check if any search variant matches the definitionId
    const matches = searchVariants.some(variant => {
      // Check for exact match at end (after last underscore)
      const parts = defIdLower.split('_');
      const lastPart = parts[parts.length - 1];

      if (lastPart === variant) return true;
      if (defIdLower.includes(variant)) return true;

      return false;
    });

    if (matches) {
      // Extract the value based on setting type
      let value: any = undefined;

      if (instance.choiceSettingValue) {
        value = instance.choiceSettingValue.value;
      } else if (instance.simpleSettingValue) {
        value = instance.simpleSettingValue.value;
      } else if (instance.groupSettingCollectionValue) {
        // For group collections, try to extract meaningful values
        value = extractGroupCollectionValues(instance.groupSettingCollectionValue);
      }

      if (value !== undefined) {
        return { value, definitionId };
      }
    }
  }

  return undefined;
}

/**
 * Extract values from groupSettingCollectionValue
 * These contain nested children with actual values
 */
function extractGroupCollectionValues(groupCollection: any[]): any {
  if (!Array.isArray(groupCollection) || groupCollection.length === 0) {
    return undefined;
  }

  const values: Record<string, any> = {};

  for (const group of groupCollection) {
    if (group.children && Array.isArray(group.children)) {
      for (const child of group.children) {
        const childDefId = child.settingDefinitionId || '';
        const parts = childDefId.split('_');
        const settingName = parts[parts.length - 1];

        let childValue: any = undefined;
        if (child.choiceSettingValue) {
          childValue = child.choiceSettingValue.value;
        } else if (child.simpleSettingValue) {
          childValue = child.simpleSettingValue.value;
        } else if (child.simpleSettingCollectionValue) {
          childValue = child.simpleSettingCollectionValue.map((v: any) => v.value);
        }

        if (childValue !== undefined) {
          values[settingName] = childValue;
        }
      }
    }
  }

  return Object.keys(values).length > 0 ? values : undefined;
}

/**
 * Legacy function for backward compatibility
 * Search in Settings Catalog settingsDelta array (older format)
 */
function searchSettingsDelta(settingsDelta: any[], searchKey: string): any {
  if (!Array.isArray(settingsDelta)) return undefined;

  const normalizedKey = searchKey.toLowerCase();

  for (const item of settingsDelta) {
    // Check definitionId
    if (item['@odata.type'] === '#microsoft.graph.deviceManagementConfigurationSetting') {
      const definitionId = item.settingInstance?.settingDefinitionId || '';
      if (definitionId.toLowerCase().includes(normalizedKey)) {
        // Return the value based on setting type
        const instance = item.settingInstance;
        if (instance?.choiceSettingValue) {
          return instance.choiceSettingValue.value;
        }
        if (instance?.simpleSettingValue) {
          return instance.simpleSettingValue.value;
        }
        if (instance?.groupSettingCollectionValue) {
          return instance.groupSettingCollectionValue;
        }
      }
    }
  }

  return undefined;
}

// ===== EXTRACTION STRATEGIES =====

/**
 * Strategy 1: Exact Path Match
 * Try the path exactly as documented
 */
const exactPathStrategy: ExtractionStrategy = {
  name: 'exact-path',
  priority: 1,
  description: 'Try documented path exactly as specified',
  extract: (policyData, setting) => {
    const value = getNestedValue(policyData, setting.settingPath);

    if (value !== undefined && value !== null) {
      return {
        value,
        strategy: 'exact-path',
        confidence: 0.95,
        path: setting.settingPath
      };
    }

    return null;
  }
};

/**
 * Strategy 2: Strip Common Prefixes
 * Remove prefixes like "appProtectionPolicy." that docs add but APIs don't use
 */
const stripPrefixStrategy: ExtractionStrategy = {
  name: 'strip-prefix',
  priority: 2,
  description: 'Remove common prefixes from documented path',
  extract: (policyData, setting) => {
    const commonPrefixes = [
      'appProtectionPolicy.',
      'deviceConfiguration.',
      'deviceCompliancePolicy.',
      'windowsUpdateForBusinessConfiguration.',
      'conditionalAccessPolicy.',
      'settings.',
      'configuration.'
    ];

    for (const prefix of commonPrefixes) {
      if (setting.settingPath.startsWith(prefix)) {
        const shortPath = setting.settingPath.substring(prefix.length);
        const value = getNestedValue(policyData, shortPath);

        if (value !== undefined && value !== null) {
          return {
            value,
            strategy: 'strip-prefix',
            confidence: 0.85,
            path: shortPath
          };
        }
      }
    }

    return null;
  }
};

/**
 * Strategy 3: Direct Property
 * Just use the final property name (last part of path)
 */
const directPropertyStrategy: ExtractionStrategy = {
  name: 'direct-property',
  priority: 3,
  description: 'Use only the final property name from path',
  extract: (policyData, setting) => {
    const propertyName = setting.settingPath.split('.').pop();
    const value = policyData[propertyName];

    if (value !== undefined && value !== null) {
      return {
        value,
        strategy: 'direct-property',
        confidence: 0.75,
        path: propertyName
      };
    }

    return null;
  }
};

/**
 * Strategy 4: CamelCase Variants
 * Try different casing variations
 */
const camelCaseVariantsStrategy: ExtractionStrategy = {
  name: 'camelcase-variants',
  priority: 4,
  description: 'Try camelCase, PascalCase, and lowercase variants',
  extract: (policyData, setting) => {
    const propertyName = setting.settingPath.split('.').pop();
    const variants = [
      propertyName,
      toCamelCase(propertyName),
      toPascalCase(propertyName),
      propertyName.toLowerCase()
    ];

    for (const variant of variants) {
      const value = policyData[variant];
      if (value !== undefined && value !== null) {
        return {
          value,
          strategy: 'camelcase-variants',
          confidence: 0.60,
          path: variant
        };
      }
    }

    return null;
  }
};

/**
 * Strategy 5: Shallow Search
 * Search first 2 levels of nesting for matching key
 */
const shallowSearchStrategy: ExtractionStrategy = {
  name: 'shallow-search',
  priority: 5,
  description: 'Search first 2 levels deep for matching key',
  extract: (policyData, setting) => {
    const searchKey = setting.settingPath.split('.').pop();
    const value = shallowSearch(policyData, searchKey, 2);

    if (value !== undefined && value !== null) {
      return {
        value,
        strategy: 'shallow-search',
        confidence: 0.40,
        path: `[found via search: ${searchKey}]`
      };
    }

    return null;
  }
};

/**
 * Strategy 6: Settings Catalog Search
 * Search in settings array for Settings Catalog policies (primary format)
 */
const settingsCatalogStrategy: ExtractionStrategy = {
  name: 'settings-catalog',
  priority: 6,
  description: 'Search in Settings Catalog settings array',
  extract: (policyData, setting) => {
    // Try the new settings array format first (primary format)
    if (policyData.settings && Array.isArray(policyData.settings)) {
      const searchKey = setting.settingPath.split('.').pop();
      const result = searchSettingsCatalog(policyData.settings, searchKey);

      if (result) {
        return {
          value: result.value,
          strategy: 'settings-catalog',
          confidence: 0.80,
          path: `[settings: ${result.definitionId}]`
        };
      }
    }

    // Fallback to legacy settingsDelta format
    if (policyData.settingsDelta && Array.isArray(policyData.settingsDelta)) {
      const searchKey = setting.settingPath.split('.').pop();
      const value = searchSettingsDelta(policyData.settingsDelta, searchKey);

      if (value !== undefined && value !== null) {
        return {
          value,
          strategy: 'settings-catalog-legacy',
          confidence: 0.70,
          path: `[settingsDelta: ${searchKey}]`
        };
      }
    }

    return null;
  }
};

/**
 * Strategy 7: Settings Catalog Definition ID Search
 * More aggressive search using setting name variations in definitionId
 */
const settingsCatalogDeepStrategy: ExtractionStrategy = {
  name: 'settings-catalog-deep',
  priority: 7,
  description: 'Deep search in Settings Catalog using multiple name patterns',
  extract: (policyData, setting) => {
    if (!policyData.settings || !Array.isArray(policyData.settings)) {
      return null;
    }

    // Generate multiple search patterns from setting name
    const displayName = setting.displayName || '';
    const settingName = setting.settingName || '';

    // Extract key terms from display name
    const terms = displayName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((t: string) => t.length > 3);

    // Try each term
    for (const term of terms) {
      const result = searchSettingsCatalog(policyData.settings, term);
      if (result) {
        return {
          value: result.value,
          strategy: 'settings-catalog-deep',
          confidence: 0.50,
          path: `[settings-deep: ${term} -> ${result.definitionId}]`
        };
      }
    }

    // Try setting name
    if (settingName) {
      const result = searchSettingsCatalog(policyData.settings, settingName);
      if (result) {
        return {
          value: result.value,
          strategy: 'settings-catalog-deep',
          confidence: 0.55,
          path: `[settings-deep: ${settingName} -> ${result.definitionId}]`
        };
      }
    }

    return null;
  }
};

// ===== SMART EXTRACTOR CLASS =====

export class SmartExtractor {
  private strategies: ExtractionStrategy[] = [
    exactPathStrategy,
    stripPrefixStrategy,
    directPropertyStrategy,
    camelCaseVariantsStrategy,
    shallowSearchStrategy,
    settingsCatalogStrategy,
    settingsCatalogDeepStrategy
  ];

  /**
   * Extract value from policy using multiple strategies
   * CORRECTED: Uses policyData field and policy.odataType from database
   */
  async extractValue(
    policy: any, // M365Policy with policyData
    setting: any // M365Setting with settingPath
  ): Promise<ExtractionResult> {

    // Parse policy data - CORRECTED field name
    let policyData: any;
    try {
      policyData = typeof policy.policyData === 'string'
        ? JSON.parse(policy.policyData)
        : policy.policyData;
    } catch (error) {
      return {
        value: null,
        strategy: 'error',
        confidence: 0,
        error: 'Failed to parse policy policyData'
      };
    }

    // Check template mismatch using database odataType field
    // CORRECTED: Use policy.odataType from database, not raw data
    if (setting.policyTemplate && policy.odataType !== setting.policyTemplate) {
      // Also check for family match as fallback
      if (setting.templateFamily && policy.templateFamily !== setting.templateFamily) {
        return {
          value: null,
          strategy: 'template-mismatch',
          confidence: 0,
          error: `Setting expects ${setting.policyTemplate || setting.templateFamily}, policy is ${policy.odataType || policy.templateFamily}`
        };
      }
    }

    // Try each strategy in priority order
    for (const strategy of this.strategies) {
      try {
        const result = strategy.extract(policyData, setting);

        if (result !== null) {
          // Success! Record it
          await this.recordSuccess(setting, result);
          return result;
        }
      } catch (error) {
        // Strategy failed, continue to next
        console.debug(`Strategy ${strategy.name} failed for ${setting.displayName}:`, error);
      }
    }

    // All strategies failed
    await this.recordFailure(setting, policy);

    return {
      value: null,
      strategy: 'none',
      confidence: 0,
      error: 'No strategy successfully extracted value'
    };
  }

  /**
   * Batch extract values for multiple settings from one policy
   */
  async extractBatch(
    policy: any,
    settings: any[]
  ): Promise<Map<number, ExtractionResult>> {
    const results = new Map<number, ExtractionResult>();

    for (const setting of settings) {
      const result = await this.extractValue(policy, setting);
      results.set(setting.id, result);
    }

    return results;
  }

  /**
   * Record successful extraction for learning
   */
  private async recordSuccess(
    setting: any,
    result: ExtractionResult
  ): Promise<void> {
    try {
      await prisma.m365Setting.update({
        where: { id: setting.id },
        data: {
          successfulExtractions: { increment: 1 },
          lastExtractedValue: JSON.stringify(result.value),
          lastExtractedAt: new Date(),
          lastSuccessfulStrategy: result.strategy,
          // Update extraction hints with successful strategy
          extractionHints: JSON.stringify({
            ...this.parseExtractionHints(setting.extractionHints),
            lastSuccess: {
              strategy: result.strategy,
              confidence: result.confidence,
              path: result.path,
              timestamp: new Date().toISOString()
            }
          })
        }
      });
    } catch (error) {
      console.error('Failed to record extraction success:', error);
    }
  }

  /**
   * Record failed extraction attempt
   */
  private async recordFailure(
    setting: any,
    policy: any
  ): Promise<void> {
    try {
      const failedCount = setting.failedExtractions + 1;

      await prisma.m365Setting.update({
        where: { id: setting.id },
        data: {
          failedExtractions: { increment: 1 },
          extractionHints: JSON.stringify({
            ...this.parseExtractionHints(setting.extractionHints),
            lastFailure: {
              policyType: policy.odataType,
              timestamp: new Date().toISOString(),
              totalFailures: failedCount
            }
          })
        }
      });

      // Log settings that consistently fail
      if (failedCount === 10 || failedCount % 25 === 0) {
        console.warn(`Setting ${setting.displayName} has failed ${failedCount} times`);
        console.warn(`  Expected path: ${setting.settingPath}`);
        console.warn(`  Policy template: ${policy.odataType}`);
      }
    } catch (error) {
      console.error('Failed to record extraction failure:', error);
    }
  }

  /**
   * Parse extraction hints JSON safely
   */
  private parseExtractionHints(hints: string | null): any {
    if (!hints) return {};
    try {
      return JSON.parse(hints);
    } catch {
      return {};
    }
  }

  /**
   * Get extraction statistics for a setting
   */
  async getExtractionStats(settingId: number): Promise<{
    successRate: number;
    totalAttempts: number;
    lastSuccessfulStrategy: string | null;
    lastExtractedValue: any;
  }> {
    const setting = await prisma.m365Setting.findUnique({
      where: { id: settingId },
      select: {
        successfulExtractions: true,
        failedExtractions: true,
        lastSuccessfulStrategy: true,
        lastExtractedValue: true
      }
    });

    if (!setting) {
      throw new Error(`Setting ${settingId} not found`);
    }

    const totalAttempts = setting.successfulExtractions + setting.failedExtractions;
    const successRate = totalAttempts > 0
      ? setting.successfulExtractions / totalAttempts
      : 0;

    return {
      successRate,
      totalAttempts,
      lastSuccessfulStrategy: setting.lastSuccessfulStrategy,
      lastExtractedValue: setting.lastExtractedValue
        ? JSON.parse(setting.lastExtractedValue)
        : null
    };
  }
}

// Export singleton instance
export const smartExtractor = new SmartExtractor();
