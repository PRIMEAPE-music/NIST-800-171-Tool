/**
 * Settings Catalog Specialized Extractor
 *
 * Handles the complex nested structure of Settings Catalog policies
 * (configurationPolicies with settingInstance arrays)
 *
 * Settings Catalog policies have a unique structure:
 * - Settings are in a settings[] array
 * - Each setting has a settingInstance object
 * - Values are in choiceSettingValue, simpleSettingValue, groupSettingValue, or groupSettingCollectionValue
 * - Setting identification uses settingDefinitionId (lowercase with underscores)
 */

export interface SettingsCatalogResult {
  definitionId: string;
  value: any;
  type: 'choice' | 'simple' | 'group' | 'collection';
  displayName?: string;
}

/**
 * Extract all settings from a Settings Catalog policy
 * Returns a Map keyed by settingDefinitionId (lowercase)
 */
export function extractSettingsCatalog(policyData: any): Map<string, SettingsCatalogResult> {
  const results = new Map<string, SettingsCatalogResult>();

  if (!policyData.settings || !Array.isArray(policyData.settings)) {
    return results;
  }

  for (const setting of policyData.settings) {
    // Settings Catalog items might not have @odata.type at the setting level
    // Check if they have settingInstance (which is the key indicator)
    const instance = setting.settingInstance;
    if (!instance) continue;

    const definitionId = instance.settingDefinitionId?.toLowerCase() || '';
    if (!definitionId) continue;

    // Extract based on setting type
    let value: any;
    let type: SettingsCatalogResult['type'];

    if (instance.choiceSettingValue) {
      // Choice setting (enum-like values)
      value = instance.choiceSettingValue.value;
      type = 'choice';

      // Also extract children if present
      if (instance.choiceSettingValue.children && Array.isArray(instance.choiceSettingValue.children)) {
        for (const child of instance.choiceSettingValue.children) {
          if (child.settingDefinitionId) {
            const childId = child.settingDefinitionId.toLowerCase();
            let childValue: any;
            let childType: SettingsCatalogResult['type'];

            if (child.choiceSettingValue) {
              childValue = child.choiceSettingValue.value;
              childType = 'choice';
            } else if (child.simpleSettingValue) {
              childValue = child.simpleSettingValue.value;
              childType = 'simple';
            } else if (child.groupSettingCollectionValue) {
              childValue = child.groupSettingCollectionValue;
              childType = 'collection';
            } else if (child.groupSettingValue) {
              childValue = child.groupSettingValue;
              childType = 'group';
            } else {
              continue;
            }

            results.set(childId, { definitionId: childId, value: childValue, type: childType });
          }
        }
      }
    } else if (instance.simpleSettingValue) {
      // Simple setting (string, number, boolean)
      value = instance.simpleSettingValue.value;
      type = 'simple';
    } else if (instance.groupSettingCollectionValue) {
      // Collection of settings
      value = instance.groupSettingCollectionValue;
      type = 'collection';
    } else if (instance.groupSettingValue) {
      // Group of settings
      value = instance.groupSettingValue;
      type = 'group';
    } else {
      continue;
    }

    results.set(definitionId, {
      definitionId,
      value,
      type,
      displayName: setting.settingDefinition?.displayName || instance.settingDefinitionId
    });
  }

  return results;
}

/**
 * Match a setting to Settings Catalog data using multiple strategies
 */
export function matchSettingsCatalog(
  setting: { displayName: string; settingName: string | null; settingPath: string },
  catalogData: Map<string, SettingsCatalogResult>
): SettingsCatalogResult | null {

  // Strategy 1: Exact match on settingPath (normalized to lowercase)
  if (setting.settingPath) {
    const normalizedPath = setting.settingPath.toLowerCase().trim();
    const match = catalogData.get(normalizedPath);
    if (match) {
      return match;
    }
  }

  // Strategy 2: Exact match on settingName (normalized to lowercase)
  if (setting.settingName) {
    const normalizedName = setting.settingName.toLowerCase().trim();
    const match = catalogData.get(normalizedName);
    if (match) {
      return match;
    }
  }

  // Strategy 3: Partial match - check if settingPath/settingName is contained in any definitionId
  if (setting.settingPath) {
    const pathLower = setting.settingPath.toLowerCase();
    for (const [definitionId, result] of Array.from(catalogData.entries())) {
      if (definitionId.includes(pathLower) || pathLower.includes(definitionId)) {
        return result;
      }
    }
  }

  // Strategy 4: Fuzzy match on display name
  // Extract key terms from display name
  const displayLower = setting.displayName.toLowerCase();
  const terms = displayLower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 3);

  // Find definition IDs that contain multiple terms
  const candidates: Array<{ result: SettingsCatalogResult; score: number }> = [];

  for (const [definitionId, result] of Array.from(catalogData.entries())) {
    let matchScore = 0;

    // Check how many terms from display name appear in the definition ID
    for (const term of terms) {
      if (definitionId.includes(term)) {
        matchScore++;
      }
    }

    // Also check the display name if available
    if (result.displayName) {
      const resultDisplayLower = result.displayName.toLowerCase();
      for (const term of terms) {
        if (resultDisplayLower.includes(term)) {
          matchScore += 0.5; // Lower weight for display name matches
        }
      }
    }

    if (matchScore > 0) {
      candidates.push({ result, score: matchScore });
    }
  }

  // Sort by score and return best match if score is high enough
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    // Require at least 60% of terms to match or at least 3 term matches
    const minScore = Math.max(terms.length * 0.6, 2);
    if (best.score >= minScore) {
      return best.result;
    }
  }

  return null;
}

/**
 * Create an extraction strategy for Settings Catalog policies
 * This can be integrated into the SmartExtractor
 */
export function createSettingsCatalogStrategy() {
  return {
    name: 'settings-catalog-specialized',
    priority: 10, // High priority for Settings Catalog policies
    description: 'Specialized extractor for Settings Catalog deep matching',
    extract: (policyData: any, setting: any) => {
      // Only run on Settings Catalog policies
      // Settings Catalog policies have a settings[] array with settingInstance objects
      const isSettingsCatalog =
        policyData.settings &&
        Array.isArray(policyData.settings) &&
        policyData.settings.length > 0 &&
        policyData.settings.some((s: any) => s.settingInstance?.settingDefinitionId);

      if (!isSettingsCatalog) {
        return null;
      }

      const catalogData = extractSettingsCatalog(policyData);

      // Debug logging
      if (catalogData.size > 0) {
        console.log(`[Settings Catalog] Found ${catalogData.size} settings in policy`);
        console.log(`[Settings Catalog] Attempting to match: ${setting.displayName}`);
        console.log(`[Settings Catalog] Using settingName: ${setting.settingName || 'NULL'}`);
        console.log(`[Settings Catalog] Using settingPath: ${setting.settingPath}`);
      }

      const match = matchSettingsCatalog(setting, catalogData);

      if (match) {
        console.log(`[Settings Catalog] ✅ Matched! Definition: ${match.definitionId}, Value: ${JSON.stringify(match.value)}`);
        return {
          value: match.value,
          strategy: 'settings-catalog-specialized',
          confidence: 0.85,
          path: `[catalog: ${match.definitionId}]`
        };
      } else {
        console.log(`[Settings Catalog] ❌ No match found`);
        // Show available settings for debugging
        if (catalogData.size > 0 && catalogData.size < 20) {
          console.log(`[Settings Catalog] Available definition IDs:`, Array.from(catalogData.keys()).slice(0, 10));
        }
      }

      return null;
    }
  };
}

/**
 * Normalize BitLocker setting definition IDs
 * BitLocker settings use a specific naming pattern
 */
export function normalizeBitLockerSettingId(settingPath: string): string {
  // Common BitLocker setting path patterns
  const patterns = [
    { from: /Encryption\.BitLocker\./i, to: 'device_vendor_msft_bitlocker_' },
    { from: /Intune\.EndpointSecurity\.DiskEncryption\.BitLocker\./i, to: 'device_vendor_msft_bitlocker_' },
    { from: /BitLocker\./i, to: 'device_vendor_msft_bitlocker_' }
  ];

  let normalized = settingPath.toLowerCase();

  for (const pattern of patterns) {
    normalized = normalized.replace(pattern.from, pattern.to);
  }

  // Convert camelCase to snake_case
  normalized = normalized
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/__+/g, '_');

  return normalized;
}

/**
 * Helper to extract a specific BitLocker setting
 */
export function extractBitLockerSetting(
  policyData: any,
  settingKey: string
): any | null {
  const catalogData = extractSettingsCatalog(policyData);
  const normalizedKey = normalizeBitLockerSettingId(settingKey);

  return catalogData.get(normalizedKey)?.value || null;
}
