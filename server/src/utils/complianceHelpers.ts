import { ComplianceStatus, DevicePlatform } from '../types/compliance.types';

/**
 * Compliance Helper Utilities
 */

/**
 * Get color code for compliance status (for UI)
 */
export function getComplianceStatusColor(status: ComplianceStatus): string {
  switch (status) {
    case ComplianceStatus.COMPLIANT:
      return 'success'; // green
    case ComplianceStatus.NON_COMPLIANT:
      return 'error'; // red
    case ComplianceStatus.NOT_CONFIGURED:
      return 'warning'; // orange
    case ComplianceStatus.ERROR:
      return 'error'; // red
    default:
      return 'default'; // gray
  }
}

/**
 * Get human-readable status label
 */
export function getComplianceStatusLabel(status: ComplianceStatus): string {
  switch (status) {
    case ComplianceStatus.COMPLIANT:
      return 'Compliant';
    case ComplianceStatus.NON_COMPLIANT:
      return 'Non-Compliant';
    case ComplianceStatus.NOT_CONFIGURED:
      return 'Not Configured';
    case ComplianceStatus.ERROR:
      return 'Error';
    default:
      return 'Unknown';
  }
}

/**
 * Get compliance grade (A, B, C, D, F)
 */
export function getComplianceGrade(percentage: number): string {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}

/**
 * Get platform display name
 */
export function getPlatformDisplayName(platform: DevicePlatform): string {
  switch (platform) {
    case DevicePlatform.WINDOWS:
      return 'Windows';
    case DevicePlatform.IOS:
      return 'iOS';
    case DevicePlatform.ANDROID:
      return 'Android';
    case DevicePlatform.MACOS:
      return 'macOS';
    case DevicePlatform.ALL:
      return 'All Platforms';
    default:
      return platform;
  }
}

/**
 * Get platform icon name (for Material-UI icons)
 */
export function getPlatformIcon(platform: DevicePlatform): string {
  switch (platform) {
    case DevicePlatform.WINDOWS:
      return 'Computer';
    case DevicePlatform.IOS:
      return 'Apple';
    case DevicePlatform.ANDROID:
      return 'Android';
    case DevicePlatform.MACOS:
      return 'Laptop';
    case DevicePlatform.ALL:
      return 'Devices';
    default:
      return 'DeviceUnknown';
  }
}

/**
 * Format compliance percentage with symbol
 */
export function formatCompliancePercentage(percentage: number): string {
  return `${percentage.toFixed(0)}%`;
}

/**
 * Determine if compliance is acceptable (>= 80%)
 */
export function isComplianceAcceptable(percentage: number): boolean {
  return percentage >= 80;
}

/**
 * Get risk level based on compliance percentage
 */
export function getComplianceRiskLevel(percentage: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (percentage >= 90) return 'LOW';
  if (percentage >= 75) return 'MEDIUM';
  if (percentage >= 50) return 'HIGH';
  return 'CRITICAL';
}

/**
 * Calculate days since last check
 */
export function getDaysSinceLastCheck(lastChecked: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - lastChecked.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determine if compliance data is stale (> 7 days)
 */
export function isComplianceDataStale(lastCalculated: Date): boolean {
  return getDaysSinceLastCheck(lastCalculated) > 7;
}
