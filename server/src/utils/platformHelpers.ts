/**
 * Platform Helper Utilities
 * Extracts and normalizes platform information from M365 policies
 */

export type DevicePlatform = 'Windows' | 'iOS' | 'Android' | 'macOS' | 'Unknown';

/**
 * Extract platform from Intune policy's @odata.type field
 *
 * Examples:
 * Device Compliance:
 * - #microsoft.graph.windows10CompliancePolicy -> Windows
 * - #microsoft.graph.iosCompliancePolicy -> iOS
 * - #microsoft.graph.androidCompliancePolicy -> Android
 * - #microsoft.graph.macOSCompliancePolicy -> macOS
 *
 * App Protection:
 * - #microsoft.graph.iosManagedAppProtection -> iOS
 * - #microsoft.graph.androidManagedAppProtection -> Android
 * - #microsoft.graph.windowsInformationProtectionPolicy -> Windows
 *
 * Device Configuration:
 * - #microsoft.graph.iosGeneralDeviceConfiguration -> iOS
 * - #microsoft.graph.androidGeneralDeviceConfiguration -> Android
 * - #microsoft.graph.windows10GeneralConfiguration -> Windows
 */
export function extractPlatformFromODataType(odataType: string): DevicePlatform {
  if (!odataType) return 'Unknown';

  const type = odataType.toLowerCase();

  // Windows detection
  if (type.includes('windows')) {
    return 'Windows';
  }

  // iOS detection (includes iPad)
  if (type.includes('ios') || type.includes('ipad')) {
    return 'iOS';
  }

  // Android detection
  if (type.includes('android')) {
    return 'Android';
  }

  // macOS detection
  if (type.includes('macos') || type.includes('mac')) {
    return 'macOS';
  }

  return 'Unknown';
}

/**
 * Extract platform from policy data (handles various policy structures)
 */
export function extractPlatformFromPolicy(policyData: any): DevicePlatform {
  // Try @odata.type first (Intune policies)
  if (policyData['@odata.type']) {
    const platform = extractPlatformFromODataType(policyData['@odata.type']);
    if (platform !== 'Unknown') {
      return platform;
    }
  }

  // Try platformType field (if explicitly set)
  if (policyData.platformType) {
    const platform = policyData.platformType.toLowerCase();
    if (platform.includes('windows')) return 'Windows';
    if (platform.includes('ios')) return 'iOS';
    if (platform.includes('android')) return 'Android';
    if (platform.includes('macos') || platform.includes('mac')) return 'macOS';
  }

  // Try displayName or name as fallback (look for platform keywords)
  const name = (policyData.displayName || policyData.name || '').toLowerCase();
  if (name.includes('windows') || name.includes('win10')) return 'Windows';
  if (name.includes('ios') || name.includes('ipad') || name.includes('iphone')) return 'iOS';
  if (name.includes('android')) return 'Android';
  if (name.includes('macos') || name.includes('mac os')) return 'macOS';

  // Azure AD and Purview policies typically apply to all platforms
  // We'll mark them as 'Unknown' and handle them separately
  return 'Unknown';
}

/**
 * Get icon/emoji for platform
 */
export function getPlatformIcon(platform: DevicePlatform): string {
  switch (platform) {
    case 'Windows':
      return '🪟';
    case 'iOS':
      return '📱';
    case 'Android':
      return '🤖';
    case 'macOS':
      return '🍎';
    default:
      return '❓';
  }
}

/**
 * Get display name for platform
 */
export function getPlatformDisplayName(platform: DevicePlatform): string {
  return platform;
}

/**
 * Check if platform is required for device-level controls
 * Some controls (like device compliance) need platform-specific policies
 * Others (like Azure AD conditional access) apply globally
 */
export function isPlatformSpecificControl(category: string): boolean {
  const deviceCategories = ['Device', 'Endpoint', 'Mobile'];
  return deviceCategories.some(cat =>
    category.toLowerCase().includes(cat.toLowerCase())
  );
}

/**
 * Get all standard mobile/desktop platforms
 */
export function getStandardPlatforms(): DevicePlatform[] {
  return ['Windows', 'iOS', 'Android'];
}

/**
 * Get all platforms including macOS
 */
export function getAllPlatforms(): DevicePlatform[] {
  return ['Windows', 'iOS', 'Android', 'macOS'];
}
