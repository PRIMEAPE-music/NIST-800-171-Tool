/**
 * OMA-URI Extractor Service
 *
 * Handles windows10CustomConfiguration policies which store settings
 * in an omaSettings array instead of direct properties.
 *
 * Structure:
 * {
 *   "@odata.type": "#microsoft.graph.windows10CustomConfiguration",
 *   "displayName": "Policy Name",
 *   "omaSettings": [
 *     {
 *       "@odata.type": "microsoft.graph.omaSettingBase64",
 *       "displayName": "Setting Name",
 *       "omaUri": "./Device/Vendor/MSFT/Policy/Config/...",
 *       "value": "base64EncodedValue" or plain value
 *     }
 *   ]
 * }
 */

export interface OmaSettingResult {
  omaUri: string;
  value: any;
  displayName?: string;
  odataType?: string;
  decodedValue?: any; // For base64 values
}

/**
 * Extract all OMA-URI settings from a windows10CustomConfiguration policy
 * Returns a Map keyed by normalized OMA-URI path
 */
export function extractOmaSettings(policyData: any): Map<string, OmaSettingResult> {
  const results = new Map<string, OmaSettingResult>();

  if (!policyData.omaSettings || !Array.isArray(policyData.omaSettings)) {
    return results;
  }

  for (const omaSetting of policyData.omaSettings) {
    const omaUri = omaSetting.omaUri || '';
    if (!omaUri) continue;

    let value = omaSetting.value;
    let decodedValue: any = undefined;

    // Check if value is base64 encoded
    const odataType = omaSetting['@odata.type'] || '';
    if (odataType.includes('Base64') && typeof value === 'string') {
      try {
        // Decode base64 value
        const buffer = Buffer.from(value, 'base64');
        decodedValue = buffer.toString('utf-8');

        // Try to parse as XML if it looks like XML
        if (decodedValue.trim().startsWith('<')) {
          // Keep as XML string for now
          // Could add XML parsing here if needed
        } else if (decodedValue.trim().startsWith('{') || decodedValue.trim().startsWith('[')) {
          // Try to parse as JSON
          try {
            decodedValue = JSON.parse(decodedValue);
          } catch {
            // Keep as string
          }
        }
      } catch (error) {
        // If decoding fails, keep original value
        decodedValue = value;
      }
    }

    // Normalize the OMA-URI path for easier matching
    const normalizedUri = normalizeOmaUri(omaUri);

    results.set(normalizedUri, {
      omaUri,
      value,
      displayName: omaSetting.displayName,
      odataType,
      decodedValue
    });

    // Also store by the original URI
    if (normalizedUri !== omaUri.toLowerCase()) {
      results.set(omaUri.toLowerCase(), {
        omaUri,
        value,
        displayName: omaSetting.displayName,
        odataType,
        decodedValue
      });
    }
  }

  return results;
}

/**
 * Normalize OMA-URI paths for easier matching
 * Converts paths to a consistent format
 */
export function normalizeOmaUri(omaUri: string): string {
  let normalized = omaUri.toLowerCase();

  // Remove leading ./Device or ./User
  normalized = normalized.replace(/^\.?\/?device\//i, '');
  normalized = normalized.replace(/^\.?\/?user\//i, '');

  // Remove Vendor/MSFT prefix (common pattern)
  normalized = normalized.replace(/^vendor\/msft\//i, '');

  // Remove Policy/Config prefix
  normalized = normalized.replace(/^policy\/config\//i, '');

  return normalized;
}

/**
 * Extract key terms from an OMA-URI path
 * Example: "./Device/Vendor/MSFT/Policy/Config/DeviceLock/MaxInactivityTimeDeviceLock"
 * Returns: ["devicelock", "maxinactivitytimedevicelock"]
 */
export function extractOmaUriTerms(omaUri: string): string[] {
  const normalized = normalizeOmaUri(omaUri);
  const parts = normalized.split('/').filter(p => p.length > 0);

  // Also split camelCase parts
  const allTerms: string[] = [];
  for (const part of parts) {
    allTerms.push(part);

    // Split camelCase
    const camelParts = part.split(/(?=[A-Z])/).map(p => p.toLowerCase());
    allTerms.push(...camelParts);
  }

  return Array.from(new Set(allTerms.filter(t => t.length > 2)));
}

/**
 * Match a setting to OMA-URI data using multiple strategies
 */
export function matchOmaSetting(
  setting: { displayName: string; settingName: string | null; settingPath: string },
  omaData: Map<string, OmaSettingResult>
): OmaSettingResult | null {

  // Strategy 1: Exact match on settingPath (normalized)
  if (setting.settingPath) {
    const normalizedPath = normalizeOmaUri(setting.settingPath);
    const match = omaData.get(normalizedPath);
    if (match) return match;
  }

  // Strategy 2: Exact match on settingName (normalized)
  if (setting.settingName) {
    const normalizedName = normalizeOmaUri(setting.settingName);
    const match = omaData.get(normalizedName);
    if (match) return match;
  }

  // Strategy 3: Partial match - check if settingPath is contained in any OMA-URI
  if (setting.settingPath) {
    const pathLower = setting.settingPath.toLowerCase();
    for (const [normalizedUri, result] of Array.from(omaData.entries())) {
      if (normalizedUri.includes(pathLower) || pathLower.includes(normalizedUri)) {
        return result;
      }

      // Also check original URI
      if (result.omaUri.toLowerCase().includes(pathLower)) {
        return result;
      }
    }
  }

  // Strategy 4: Term matching - find OMA-URI with most matching terms
  const displayTerms = setting.displayName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 3);

  const pathTerms = setting.settingPath
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 3);

  const searchTerms = Array.from(new Set([...displayTerms, ...pathTerms]));

  const candidates: Array<{ result: OmaSettingResult; score: number }> = [];

  for (const [normalizedUri, result] of Array.from(omaData.entries())) {
    const uriTerms = extractOmaUriTerms(result.omaUri);
    let matchScore = 0;

    // Count matching terms
    for (const term of searchTerms) {
      if (uriTerms.some(uriTerm => uriTerm.includes(term) || term.includes(uriTerm))) {
        matchScore++;
      }

      // Also check display name if available
      if (result.displayName) {
        const displayLower = result.displayName.toLowerCase();
        if (displayLower.includes(term)) {
          matchScore += 0.5;
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

    // Require at least 50% of terms to match or at least 2 term matches
    const minScore = Math.max(searchTerms.length * 0.5, 2);
    if (best.score >= minScore) {
      return best.result;
    }
  }

  return null;
}

/**
 * Create an extraction strategy for OMA-URI policies
 * This can be integrated into the SmartExtractor
 */
export function createOmaUriStrategy() {
  return {
    name: 'oma-uri-specialized',
    priority: 9, // High priority, just below Settings Catalog
    description: 'Specialized extractor for windows10CustomConfiguration OMA-URI settings',
    extract: (policyData: any, setting: any) => {
      // Only run on windows10CustomConfiguration policies
      const isCustomConfiguration =
        policyData['@odata.type'] === '#microsoft.graph.windows10CustomConfiguration' ||
        policyData.omaSettings;

      if (!isCustomConfiguration) {
        return null;
      }

      const omaData = extractOmaSettings(policyData);

      // Debug logging
      if (omaData.size > 0) {
        console.log(`[OMA-URI] Found ${omaData.size} OMA settings in policy`);
        console.log(`[OMA-URI] Attempting to match: ${setting.displayName}`);
        console.log(`[OMA-URI] Using settingName: ${setting.settingName || 'NULL'}`);
        console.log(`[OMA-URI] Using settingPath: ${setting.settingPath}`);
      }

      const match = matchOmaSetting(setting, omaData);

      if (match) {
        // Use decoded value if available, otherwise use original value
        const extractedValue = match.decodedValue !== undefined ? match.decodedValue : match.value;

        console.log(`[OMA-URI] ✅ Matched! URI: ${match.omaUri}, Value: ${JSON.stringify(extractedValue).substring(0, 100)}`);

        return {
          value: extractedValue,
          strategy: 'oma-uri-specialized',
          confidence: 0.85,
          path: `[oma-uri: ${match.omaUri}]`
        };
      } else {
        console.log(`[OMA-URI] ❌ No match found`);
        // Show available URIs for debugging
        if (omaData.size > 0 && omaData.size < 20) {
          const uris = Array.from(omaData.values()).map(r => r.omaUri).slice(0, 10);
          console.log(`[OMA-URI] Available URIs:`, uris);
        }
      }

      return null;
    }
  };
}

/**
 * Helper function to extract a specific OMA-URI setting
 */
export function extractOmaUriSetting(
  policyData: any,
  omaUriPath: string
): any | null {
  const omaData = extractOmaSettings(policyData);
  const normalizedPath = normalizeOmaUri(omaUriPath);

  const match = omaData.get(normalizedPath);
  if (match) {
    return match.decodedValue !== undefined ? match.decodedValue : match.value;
  }

  return null;
}
