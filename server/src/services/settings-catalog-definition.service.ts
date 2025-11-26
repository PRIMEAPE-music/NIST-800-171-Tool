/**
 * Settings Catalog Definition Service
 *
 * Fetches and caches setting definitions from Microsoft Graph API
 * to decode Settings Catalog reference values (_0, _1, _2, etc.)
 *
 * Settings Catalog policies store values as references:
 *   "device_vendor_msft_bitlocker_requiredeviceencryption_1"
 *
 * This service resolves these to actual values:
 *   _0 = Disabled
 *   _1 = Enabled
 */

import { graphClientService } from './graphClient.service';

interface SettingOption {
  itemId: string;
  name: string;
  displayName: string;
  description?: string;
  dependentOn?: any[];
  dependedOnBy?: any[];
}

interface SettingDefinition {
  id: string;
  displayName: string;
  description?: string;
  helpText?: string;
  name: string;
  applicability?: any;
  keywords?: string[];
  infoUrls?: string[];
  baseUri?: string;
  offsetUri?: string;
  options?: SettingOption[];
  // For simple settings (integer, string, etc.)
  defaultValue?: any;
  minimumValue?: number;
  maximumValue?: number;
}

interface CatalogSettings {
  value: SettingDefinition[];
}

class SettingsCatalogDefinitionService {
  // In-memory cache to avoid repeated API calls
  private definitionCache: Map<string, SettingDefinition> = new Map();
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 3600000; // 1 hour in milliseconds

  /**
   * Get setting definition from Graph API (with caching)
   */
  async getDefinition(settingDefinitionId: string): Promise<SettingDefinition | null> {
    try {
      // Check cache first
      if (this.definitionCache.has(settingDefinitionId) && !this.isCacheExpired()) {
        console.log(`[Settings Catalog Definition] Cache hit: ${settingDefinitionId}`);
        return this.definitionCache.get(settingDefinitionId)!;
      }

      console.log(`[Settings Catalog Definition] Fetching from API: ${settingDefinitionId}`);

      // Fetch from Graph API
      const definition = await graphClientService.getBeta<SettingDefinition>(
        `/deviceManagement/configurationSettings/${settingDefinitionId}`
      );

      // Cache the result
      this.definitionCache.set(settingDefinitionId, definition);
      this.updateCacheTimestamp();

      return definition;
    } catch (error: any) {
      console.error(`[Settings Catalog Definition] Error fetching ${settingDefinitionId}:`, error.message);
      return null;
    }
  }

  /**
   * Decode a Settings Catalog reference value to its actual meaning
   *
   * Example:
   *   Input:  "device_vendor_msft_bitlocker_requiredeviceencryption_1"
   *   Output: { value: true, displayName: "Enable", description: "Require device encryption" }
   */
  async decodeValue(
    settingDefinitionId: string,
    referenceValue: string
  ): Promise<{
    value: any;
    displayName?: string;
    description?: string;
    definitionId: string;
  } | null> {
    // Get the definition
    const definition = await this.getDefinition(settingDefinitionId);

    if (!definition) {
      console.warn(`[Settings Catalog Definition] No definition found for: ${settingDefinitionId}`);
      return this.fallbackDecode(referenceValue);
    }

    // Extract the suffix (_0, _1, _2, etc.)
    const suffixMatch = referenceValue.match(/_(\d+)$/);

    if (!suffixMatch) {
      // No suffix - might be a simple value or already decoded
      console.log(`[Settings Catalog Definition] No suffix found in: ${referenceValue}`);
      return {
        value: referenceValue,
        definitionId: settingDefinitionId,
      };
    }

    const suffix = suffixMatch[1];

    // If definition has options, find the matching option
    if (definition.options && Array.isArray(definition.options)) {
      const option = definition.options.find((opt) => {
        // Match by itemId suffix
        const optionSuffix = opt.itemId.match(/_(\d+)$/)?.[1];
        return optionSuffix === suffix;
      });

      if (option) {
        console.log(`[Settings Catalog Definition] Decoded ${referenceValue} -> ${option.displayName}`);
        return {
          value: this.parseOptionValue(option, suffix),
          displayName: option.displayName,
          description: option.description,
          definitionId: settingDefinitionId,
        };
      }
    }

    // Fallback to suffix-based decoding
    console.log(`[Settings Catalog Definition] Using fallback decode for: ${referenceValue}`);
    return this.fallbackDecode(referenceValue);
  }

  /**
   * Parse option value based on common patterns
   */
  private parseOptionValue(option: SettingOption, suffix: string): any {
    const name = option.name.toLowerCase();

    // Boolean patterns
    if (name.includes('enable') || name.includes('allow') || name.includes('require')) {
      return suffix === '1'; // _1 = enabled, _0 = disabled
    }

    if (name.includes('disable') || name.includes('block')) {
      return suffix === '0'; // _0 = disabled, _1 = blocked (inverse logic)
    }

    // Numeric values
    if (option.name.match(/\d+/)) {
      const numMatch = option.name.match(/\d+/);
      return numMatch ? parseInt(numMatch[0], 10) : suffix;
    }

    // Default: return the display name as the value
    return option.displayName;
  }

  /**
   * Fallback decoder when definition lookup fails
   * Uses common patterns to infer meaning
   */
  private fallbackDecode(referenceValue: string): {
    value: any;
    displayName?: string;
    definitionId: string;
  } {
    const suffixMatch = referenceValue.match(/_(\d+)$/);

    if (!suffixMatch) {
      return { value: referenceValue, definitionId: 'unknown' };
    }

    const suffix = suffixMatch[1];
    const baseName = referenceValue.replace(/_\d+$/, '');

    // Common patterns
    if (baseName.includes('require') || baseName.includes('enable')) {
      return {
        value: suffix === '1',
        displayName: suffix === '1' ? 'Enabled' : 'Disabled',
        definitionId: baseName,
      };
    }

    if (baseName.includes('minimumpinlength') || baseName.includes('minlength')) {
      // PIN length: _0 = 4, _1 = 6, _2 = 8, etc.
      const lengthMap: Record<string, number> = { '0': 4, '1': 6, '2': 8, '3': 10, '4': 12 };
      return {
        value: lengthMap[suffix] || parseInt(suffix, 10),
        displayName: `${lengthMap[suffix] || suffix} characters`,
        definitionId: baseName,
      };
    }

    if (baseName.includes('encryptiontype') || baseName.includes('encryptionmethod')) {
      // Encryption: _0 = None, _1 = Full, _2 = Used Space Only
      const encryptionMap: Record<string, string> = {
        '0': 'Not Configured',
        '1': 'Full Encryption',
        '2': 'Used Space Only',
      };
      return {
        value: encryptionMap[suffix] || suffix,
        displayName: encryptionMap[suffix],
        definitionId: baseName,
      };
    }

    // Generic fallback: _0 = false, _1 = true
    if (suffix === '0' || suffix === '1') {
      return {
        value: suffix === '1',
        displayName: suffix === '1' ? 'Enabled' : 'Disabled',
        definitionId: baseName,
      };
    }

    // Unknown pattern - return as-is
    return {
      value: referenceValue,
      displayName: `Option ${suffix}`,
      definitionId: baseName,
    };
  }

  /**
   * Batch decode multiple values (optimized for performance)
   */
  async decodeBatch(
    values: Array<{ settingDefinitionId: string; referenceValue: string }>
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    // Fetch all unique definitions in parallel
    const uniqueDefinitionIds = [...new Set(values.map((v) => v.settingDefinitionId))];
    await Promise.all(uniqueDefinitionIds.map((id) => this.getDefinition(id)));

    // Decode all values (now using cached definitions)
    for (const { settingDefinitionId, referenceValue } of values) {
      const decoded = await this.decodeValue(settingDefinitionId, referenceValue);
      if (decoded) {
        results.set(referenceValue, decoded);
      }
    }

    return results;
  }

  /**
   * Clear the cache (useful for testing or forcing refresh)
   */
  clearCache(): void {
    this.definitionCache.clear();
    this.cacheTimestamp = 0;
    console.log('[Settings Catalog Definition] Cache cleared');
  }

  /**
   * Check if cache is expired
   */
  private isCacheExpired(): boolean {
    return Date.now() - this.cacheTimestamp > this.CACHE_TTL;
  }

  /**
   * Update cache timestamp
   */
  private updateCacheTimestamp(): void {
    this.cacheTimestamp = Date.now();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; age: number; expired: boolean } {
    return {
      size: this.definitionCache.size,
      age: Date.now() - this.cacheTimestamp,
      expired: this.isCacheExpired(),
    };
  }
}

// Export singleton instance
export const settingsCatalogDefinitionService = new SettingsCatalogDefinitionService();
