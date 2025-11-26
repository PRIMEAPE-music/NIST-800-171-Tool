/**
 * Settings Hierarchy Flattener Service
 *
 * Recursively extracts and flattens nested child settings from Settings Catalog policies
 * to enable extraction of detailed configuration values (encryption methods, PIN lengths, etc.)
 */

interface FlattenedSetting {
  settingDefinitionId: string;
  value: any;
  parentId?: string;
  depth: number;
  type: 'choice' | 'simple' | 'group';
}

class SettingsHierarchyFlattenerService {
  /**
   * Flatten all settings in a policy, including nested children
   */
  flattenPolicySettings(policySettings: any[]): FlattenedSetting[] {
    const flattened: FlattenedSetting[] = [];

    for (const setting of policySettings) {
      this.flattenSetting(setting, flattened, undefined, 0);
    }

    return flattened;
  }

  /**
   * Recursively flatten a single setting and its children
   */
  private flattenSetting(
    setting: any,
    accumulator: FlattenedSetting[],
    parentId?: string,
    depth: number = 0
  ): void {
    const settingInstance = setting.settingInstance || setting;

    if (!settingInstance.settingDefinitionId) {
      return; // Skip settings without definition ID
    }

    const defId = settingInstance.settingDefinitionId;

    // Extract value based on type
    let value: any = null;
    let type: 'choice' | 'simple' | 'group' = 'simple';
    let children: any[] = [];

    if (settingInstance.choiceSettingValue) {
      type = 'choice';
      value = settingInstance.choiceSettingValue.value;
      children = settingInstance.choiceSettingValue.children || [];
    } else if (settingInstance.simpleSettingValue) {
      type = 'simple';
      value = settingInstance.simpleSettingValue.value;
    } else if (settingInstance.groupSettingCollectionValue) {
      type = 'group';
      children = settingInstance.groupSettingCollectionValue;
      value = `[${children.length} items]`;
    }

    // Add this setting to the flattened list
    accumulator.push({
      settingDefinitionId: defId,
      value,
      parentId,
      depth,
      type,
    });

    // Recursively process children
    for (const child of children) {
      this.flattenSetting(child, accumulator, defId, depth + 1);
    }
  }

  /**
   * Create a lookup map for quick access to settings by definition ID
   */
  createSettingsLookup(flattenedSettings: FlattenedSetting[]): Map<string, FlattenedSetting> {
    const lookup = new Map<string, FlattenedSetting>();

    for (const setting of flattenedSettings) {
      // Store with lowercase key for case-insensitive lookup
      lookup.set(setting.settingDefinitionId.toLowerCase(), setting);
    }

    return lookup;
  }

  /**
   * Get child settings for a specific parent
   */
  getChildSettings(
    parentDefinitionId: string,
    flattenedSettings: FlattenedSetting[]
  ): FlattenedSetting[] {
    return flattenedSettings.filter((s) => s.parentId === parentDefinitionId);
  }

  /**
   * Create a hierarchical structure showing parent-child relationships
   */
  createHierarchy(flattenedSettings: FlattenedSetting[]): string {
    const lines: string[] = [];

    const rootSettings = flattenedSettings.filter((s) => !s.parentId);

    for (const rootSetting of rootSettings) {
      this.addSettingToHierarchy(rootSetting, flattenedSettings, lines, 0);
    }

    return lines.join('\n');
  }

  private addSettingToHierarchy(
    setting: FlattenedSetting,
    allSettings: FlattenedSetting[],
    lines: string[],
    depth: number
  ): void {
    const indent = '  '.repeat(depth);
    const shortId = setting.settingDefinitionId.split('_').pop() || setting.settingDefinitionId;

    lines.push(`${indent}├─ ${shortId} = ${setting.value} [${setting.type}]`);

    // Find and add children
    const children = allSettings.filter((s) => s.parentId === setting.settingDefinitionId);
    for (const child of children) {
      this.addSettingToHierarchy(child, allSettings, lines, depth + 1);
    }
  }
}

export const settingsHierarchyFlattenerService = new SettingsHierarchyFlattenerService();
