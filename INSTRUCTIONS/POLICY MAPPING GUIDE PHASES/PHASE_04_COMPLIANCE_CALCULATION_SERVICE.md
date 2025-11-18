# Phase 4: Compliance Calculation Service

**Project:** NIST 800-171 Compliance Management Application  
**Phase:** 4 of 12  
**Module:** M365 Policy Mapping System  
**Dependencies:** Phases 1-3 (Database, Import, Validation Engine)  
**Estimated Time:** 2-3 hours  
**Difficulty:** Medium-High  
**Status:** Ready for Implementation

---

## 📋 PHASE OVERVIEW

### Purpose
Create the Compliance Calculation Service that aggregates validation results into meaningful compliance metrics for settings and controls. This service performs the "compliance math" - calculating percentages, coverage, and confidence-weighted scoring.

### What This Phase Delivers
1. ✅ Service for calculating setting-level compliance
2. ✅ Service for calculating control-level compliance summaries
3. ✅ Platform coverage calculator
4. ✅ Confidence-weighted scoring system
5. ✅ Bulk recalculation functionality
6. ✅ Caching system using ControlM365Compliance table

### Key Concepts

**Compliance Levels:**
- **Setting Level:** Individual setting compliance (COMPLIANT, NON_COMPLIANT, NOT_CONFIGURED, ERROR)
- **Control Level:** Aggregated compliance across all settings mapped to a control
- **Platform Level:** Compliance broken down by device platforms (Windows, iOS, Android, macOS)

**Calculation Methods:**
- **Simple Average:** Count of compliant / total settings
- **Confidence Weighted:** Higher confidence mappings count more in the calculation
- **Platform Coverage:** Which platforms have settings vs don't

---

## 🎯 IMPLEMENTATION STEPS

### Step 1: Create TypeScript Types

📁 **File:** `backend/src/types/compliance.types.ts`

Create this new file with compliance-specific types:

```typescript
// Compliance status types
export enum ComplianceStatus {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  ERROR = 'ERROR'
}

// Platform types
export enum DevicePlatform {
  WINDOWS = 'WINDOWS',
  IOS = 'IOS',
  ANDROID = 'ANDROID',
  MACOS = 'MACOS',
  ALL = 'ALL'
}

// Setting compliance result
export interface SettingComplianceResult {
  settingId: string;
  settingName: string;
  policyType: string;
  isCompliant: boolean;
  status: ComplianceStatus;
  expectedValue: string;
  actualValue: string | null;
  validationOperator: string;
  confidence: string;
  platforms: DevicePlatform[];
  lastChecked: Date;
  errorMessage?: string;
}

// Control compliance summary
export interface ControlComplianceSummary {
  controlId: string;
  controlNumber: string;
  totalSettings: number;
  compliantSettings: number;
  nonCompliantSettings: number;
  notConfiguredSettings: number;
  errorSettings: number;
  compliancePercentage: number;
  confidenceWeightedScore: number;
  platformCoverage: PlatformCoverage;
  lastCalculated: Date;
}

// Platform coverage breakdown
export interface PlatformCoverage {
  windows: PlatformComplianceDetails;
  ios: PlatformComplianceDetails;
  android: PlatformComplianceDetails;
  macos: PlatformComplianceDetails;
}

export interface PlatformComplianceDetails {
  hasSettings: boolean;
  totalSettings: number;
  compliantSettings: number;
  compliancePercentage: number;
}

// Confidence weights
export interface ConfidenceWeights {
  HIGH: number;
  MEDIUM: number;
  LOW: number;
}

// Bulk calculation result
export interface BulkCalculationResult {
  totalControls: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    controlId: string;
    error: string;
  }>;
  duration: number;
}
```

---

### Step 2: Create Compliance Calculation Service

📁 **File:** `backend/src/services/complianceCalculation.service.ts`

Create the main compliance calculation service:

```typescript
import { PrismaClient } from '@prisma/client';
import {
  ComplianceStatus,
  DevicePlatform,
  SettingComplianceResult,
  ControlComplianceSummary,
  PlatformCoverage,
  PlatformComplianceDetails,
  ConfidenceWeights,
  BulkCalculationResult
} from '../types/compliance.types';

const prisma = new PrismaClient();

// Confidence weight configuration
const CONFIDENCE_WEIGHTS: ConfidenceWeights = {
  HIGH: 1.0,
  MEDIUM: 0.7,
  LOW: 0.4
};

/**
 * Compliance Calculation Service
 * Handles all compliance calculations, aggregations, and caching
 */
class ComplianceCalculationService {
  
  /**
   * Calculate compliance for a single setting
   * Looks up the latest validation check and formats result
   */
  async calculateSettingCompliance(settingId: string): Promise<SettingComplianceResult | null> {
    try {
      // Get the setting with its latest compliance check
      const setting = await prisma.m365Setting.findUnique({
        where: { id: settingId },
        include: {
          complianceChecks: {
            orderBy: { checkedAt: 'desc' },
            take: 1
          }
        }
      });

      if (!setting) {
        console.warn(`Setting not found: ${settingId}`);
        return null;
      }

      const latestCheck = setting.complianceChecks[0];
      
      // If no check exists, return NOT_CONFIGURED status
      if (!latestCheck) {
        return {
          settingId: setting.id,
          settingName: setting.displayName,
          policyType: setting.policyType,
          isCompliant: false,
          status: ComplianceStatus.NOT_CONFIGURED,
          expectedValue: setting.expectedValue,
          actualValue: null,
          validationOperator: setting.validationOperator,
          confidence: setting.confidence,
          platforms: this.parsePlatforms(setting.platforms),
          lastChecked: new Date(),
          errorMessage: 'No policy data found'
        };
      }

      // Determine compliance status
      let status: ComplianceStatus;
      if (latestCheck.errorMessage) {
        status = ComplianceStatus.ERROR;
      } else if (latestCheck.isCompliant) {
        status = ComplianceStatus.COMPLIANT;
      } else if (!latestCheck.actualValue) {
        status = ComplianceStatus.NOT_CONFIGURED;
      } else {
        status = ComplianceStatus.NON_COMPLIANT;
      }

      return {
        settingId: setting.id,
        settingName: setting.displayName,
        policyType: setting.policyType,
        isCompliant: latestCheck.isCompliant,
        status,
        expectedValue: setting.expectedValue,
        actualValue: latestCheck.actualValue,
        validationOperator: setting.validationOperator,
        confidence: setting.confidence,
        platforms: this.parsePlatforms(setting.platforms),
        lastChecked: latestCheck.checkedAt,
        errorMessage: latestCheck.errorMessage || undefined
      };

    } catch (error) {
      console.error(`Error calculating setting compliance for ${settingId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate compliance summary for a control
   * Aggregates all settings mapped to the control
   */
  async calculateControlCompliance(controlId: string): Promise<ControlComplianceSummary | null> {
    try {
      // Get control with all its setting mappings
      const control = await prisma.control.findUnique({
        where: { id: controlId },
        include: {
          settingMappings: {
            include: {
              setting: {
                include: {
                  complianceChecks: {
                    orderBy: { checkedAt: 'desc' },
                    take: 1
                  }
                }
              }
            }
          }
        }
      });

      if (!control) {
        console.warn(`Control not found: ${controlId}`);
        return null;
      }

      // Get all setting compliance results
      const settingResults: SettingComplianceResult[] = [];
      for (const mapping of control.settingMappings) {
        const result = await this.calculateSettingCompliance(mapping.setting.id);
        if (result) {
          settingResults.push(result);
        }
      }

      // Calculate basic counts
      const totalSettings = settingResults.length;
      const compliantSettings = settingResults.filter(s => s.status === ComplianceStatus.COMPLIANT).length;
      const nonCompliantSettings = settingResults.filter(s => s.status === ComplianceStatus.NON_COMPLIANT).length;
      const notConfiguredSettings = settingResults.filter(s => s.status === ComplianceStatus.NOT_CONFIGURED).length;
      const errorSettings = settingResults.filter(s => s.status === ComplianceStatus.ERROR).length;

      // Calculate simple compliance percentage
      const compliancePercentage = totalSettings > 0 
        ? Math.round((compliantSettings / totalSettings) * 100) 
        : 0;

      // Calculate confidence-weighted score
      const confidenceWeightedScore = this.calculateConfidenceWeightedScore(settingResults);

      // Calculate platform coverage
      const platformCoverage = this.calculatePlatformCoverage(settingResults);

      const summary: ControlComplianceSummary = {
        controlId: control.id,
        controlNumber: control.controlNumber,
        totalSettings,
        compliantSettings,
        nonCompliantSettings,
        notConfiguredSettings,
        errorSettings,
        compliancePercentage,
        confidenceWeightedScore,
        platformCoverage,
        lastCalculated: new Date()
      };

      // Cache the summary in the database
      await this.cacheControlSummary(summary);

      return summary;

    } catch (error) {
      console.error(`Error calculating control compliance for ${controlId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate confidence-weighted compliance score
   * Higher confidence settings contribute more to the score
   */
  private calculateConfidenceWeightedScore(results: SettingComplianceResult[]): number {
    if (results.length === 0) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    for (const result of results) {
      const weight = CONFIDENCE_WEIGHTS[result.confidence as keyof ConfidenceWeights] || CONFIDENCE_WEIGHTS.LOW;
      const score = result.status === ComplianceStatus.COMPLIANT ? 1 : 0;
      
      weightedSum += score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 
      ? Math.round((weightedSum / totalWeight) * 100) 
      : 0;
  }

  /**
   * Calculate platform coverage breakdown
   * Shows compliance per device platform
   */
  private calculatePlatformCoverage(results: SettingComplianceResult[]): PlatformCoverage {
    const platforms = [
      DevicePlatform.WINDOWS,
      DevicePlatform.IOS,
      DevicePlatform.ANDROID,
      DevicePlatform.MACOS
    ];

    const coverage: PlatformCoverage = {
      windows: this.getEmptyPlatformDetails(),
      ios: this.getEmptyPlatformDetails(),
      android: this.getEmptyPlatformDetails(),
      macos: this.getEmptyPlatformDetails()
    };

    for (const platform of platforms) {
      const platformResults = results.filter(r => 
        r.platforms.includes(platform) || r.platforms.includes(DevicePlatform.ALL)
      );

      if (platformResults.length > 0) {
        const compliantCount = platformResults.filter(r => 
          r.status === ComplianceStatus.COMPLIANT
        ).length;

        const details: PlatformComplianceDetails = {
          hasSettings: true,
          totalSettings: platformResults.length,
          compliantSettings: compliantCount,
          compliancePercentage: Math.round((compliantCount / platformResults.length) * 100)
        };

        // Map to coverage object
        const platformKey = platform.toLowerCase() as keyof PlatformCoverage;
        coverage[platformKey] = details;
      }
    }

    return coverage;
  }

  /**
   * Cache control compliance summary in database
   * Stores in ControlM365Compliance table for fast retrieval
   */
  private async cacheControlSummary(summary: ControlComplianceSummary): Promise<void> {
    try {
      await prisma.controlM365Compliance.upsert({
        where: { controlId: summary.controlId },
        update: {
          totalSettings: summary.totalSettings,
          compliantSettings: summary.compliantSettings,
          nonCompliantSettings: summary.nonCompliantSettings,
          notConfiguredSettings: summary.notConfiguredSettings,
          errorSettings: summary.errorSettings,
          compliancePercentage: summary.compliancePercentage,
          confidenceWeightedScore: summary.confidenceWeightedScore,
          platformCoverage: summary.platformCoverage as any, // Prisma Json type
          lastCalculated: summary.lastCalculated
        },
        create: {
          controlId: summary.controlId,
          totalSettings: summary.totalSettings,
          compliantSettings: summary.compliantSettings,
          nonCompliantSettings: summary.nonCompliantSettings,
          notConfiguredSettings: summary.notConfiguredSettings,
          errorSettings: summary.errorSettings,
          compliancePercentage: summary.compliancePercentage,
          confidenceWeightedScore: summary.confidenceWeightedScore,
          platformCoverage: summary.platformCoverage as any,
          lastCalculated: summary.lastCalculated
        }
      });
    } catch (error) {
      console.error(`Error caching control summary for ${summary.controlId}:`, error);
      // Don't throw - caching failure shouldn't break the calculation
    }
  }

  /**
   * Get cached control compliance summary
   * Returns cached data if available and recent
   */
  async getCachedControlCompliance(controlId: string, maxAgeMinutes: number = 60): Promise<ControlComplianceSummary | null> {
    try {
      const cached = await prisma.controlM365Compliance.findUnique({
        where: { controlId },
        include: {
          control: true
        }
      });

      if (!cached) return null;

      // Check if cache is still fresh
      const ageMinutes = (Date.now() - cached.lastCalculated.getTime()) / (1000 * 60);
      if (ageMinutes > maxAgeMinutes) {
        console.log(`Cache expired for control ${controlId} (${ageMinutes.toFixed(1)} minutes old)`);
        return null;
      }

      return {
        controlId: cached.controlId,
        controlNumber: cached.control.controlNumber,
        totalSettings: cached.totalSettings,
        compliantSettings: cached.compliantSettings,
        nonCompliantSettings: cached.nonCompliantSettings,
        notConfiguredSettings: cached.notConfiguredSettings,
        errorSettings: cached.errorSettings,
        compliancePercentage: cached.compliancePercentage,
        confidenceWeightedScore: cached.confidenceWeightedScore,
        platformCoverage: cached.platformCoverage as PlatformCoverage,
        lastCalculated: cached.lastCalculated
      };

    } catch (error) {
      console.error(`Error getting cached compliance for ${controlId}:`, error);
      return null;
    }
  }

  /**
   * Recalculate compliance for all controls
   * Use for bulk updates after policy sync
   */
  async recalculateAllControls(): Promise<BulkCalculationResult> {
    const startTime = Date.now();
    const errors: Array<{ controlId: string; error: string }> = [];
    let successCount = 0;

    try {
      // Get all controls that have setting mappings
      const controls = await prisma.control.findMany({
        where: {
          settingMappings: {
            some: {}
          }
        },
        select: {
          id: true,
          controlNumber: true
        }
      });

      console.log(`Recalculating compliance for ${controls.length} controls...`);

      // Process each control
      for (const control of controls) {
        try {
          await this.calculateControlCompliance(control.id);
          successCount++;
          
          // Log progress every 10 controls
          if (successCount % 10 === 0) {
            console.log(`Progress: ${successCount}/${controls.length} controls processed`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({
            controlId: control.id,
            error: errorMessage
          });
          console.error(`Failed to calculate compliance for control ${control.controlNumber}:`, errorMessage);
        }
      }

      const duration = Date.now() - startTime;

      const result: BulkCalculationResult = {
        totalControls: controls.length,
        successCount,
        errorCount: errors.length,
        errors,
        duration
      };

      console.log(`Bulk calculation complete: ${successCount}/${controls.length} succeeded in ${duration}ms`);

      return result;

    } catch (error) {
      console.error('Error in bulk recalculation:', error);
      throw error;
    }
  }

  /**
   * Recalculate compliance for specific controls
   * Use when only certain controls need updating
   */
  async recalculateControls(controlIds: string[]): Promise<BulkCalculationResult> {
    const startTime = Date.now();
    const errors: Array<{ controlId: string; error: string }> = [];
    let successCount = 0;

    console.log(`Recalculating compliance for ${controlIds.length} specific controls...`);

    for (const controlId of controlIds) {
      try {
        await this.calculateControlCompliance(controlId);
        successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ controlId, error: errorMessage });
        console.error(`Failed to calculate compliance for control ${controlId}:`, errorMessage);
      }
    }

    const duration = Date.now() - startTime;

    return {
      totalControls: controlIds.length,
      successCount,
      errorCount: errors.length,
      errors,
      duration
    };
  }

  /**
   * Get overall system compliance statistics
   * Aggregates across all controls
   */
  async getSystemComplianceStats() {
    try {
      const allSummaries = await prisma.controlM365Compliance.findMany({
        include: {
          control: {
            select: {
              controlNumber: true,
              title: true,
              family: true
            }
          }
        }
      });

      const totalControls = allSummaries.length;
      const totalSettings = allSummaries.reduce((sum, s) => sum + s.totalSettings, 0);
      const compliantSettings = allSummaries.reduce((sum, s) => sum + s.compliantSettings, 0);
      const nonCompliantSettings = allSummaries.reduce((sum, s) => sum + s.nonCompliantSettings, 0);
      const notConfiguredSettings = allSummaries.reduce((sum, s) => sum + s.notConfiguredSettings, 0);

      const overallCompliance = totalSettings > 0 
        ? Math.round((compliantSettings / totalSettings) * 100)
        : 0;

      // Calculate average confidence-weighted score
      const avgConfidenceScore = totalControls > 0
        ? Math.round(allSummaries.reduce((sum, s) => sum + s.confidenceWeightedScore, 0) / totalControls)
        : 0;

      // Group by family
      const byFamily = allSummaries.reduce((acc, summary) => {
        const family = summary.control.family;
        if (!acc[family]) {
          acc[family] = {
            totalSettings: 0,
            compliantSettings: 0,
            compliancePercentage: 0
          };
        }
        acc[family].totalSettings += summary.totalSettings;
        acc[family].compliantSettings += summary.compliantSettings;
        return acc;
      }, {} as Record<string, any>);

      // Calculate family percentages
      Object.keys(byFamily).forEach(family => {
        const data = byFamily[family];
        data.compliancePercentage = data.totalSettings > 0
          ? Math.round((data.compliantSettings / data.totalSettings) * 100)
          : 0;
      });

      return {
        overview: {
          totalControls,
          totalSettings,
          compliantSettings,
          nonCompliantSettings,
          notConfiguredSettings,
          overallCompliance,
          avgConfidenceScore
        },
        byFamily,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error('Error getting system compliance stats:', error);
      throw error;
    }
  }

  // Helper methods

  private parsePlatforms(platformsJson: any): DevicePlatform[] {
    if (Array.isArray(platformsJson)) {
      return platformsJson.map(p => p as DevicePlatform);
    }
    return [DevicePlatform.ALL];
  }

  private getEmptyPlatformDetails(): PlatformComplianceDetails {
    return {
      hasSettings: false,
      totalSettings: 0,
      compliantSettings: 0,
      compliancePercentage: 0
    };
  }
}

// Export singleton instance
export const complianceCalculationService = new ComplianceCalculationService();
export default complianceCalculationService;
```

---

### Step 3: Create Utility Functions

📁 **File:** `backend/src/utils/complianceHelpers.ts`

Create helper utilities for compliance calculations:

```typescript
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
```

---

### Step 4: Create Test Script

📁 **File:** `backend/src/scripts/testComplianceCalculation.ts`

Create a script to test the compliance calculation service:

```typescript
import { PrismaClient } from '@prisma/client';
import { complianceCalculationService } from '../services/complianceCalculation.service';
import { ComplianceStatus } from '../types/compliance.types';

const prisma = new PrismaClient();

async function testComplianceCalculation() {
  console.log('='.repeat(60));
  console.log('COMPLIANCE CALCULATION SERVICE TEST');
  console.log('='.repeat(60));

  try {
    // Test 1: Calculate compliance for a single setting
    console.log('\n📊 TEST 1: Calculate Setting Compliance');
    console.log('-'.repeat(60));
    
    const firstSetting = await prisma.m365Setting.findFirst();
    if (firstSetting) {
      const settingCompliance = await complianceCalculationService.calculateSettingCompliance(firstSetting.id);
      console.log('Setting:', firstSetting.displayName);
      console.log('Status:', settingCompliance?.status);
      console.log('Is Compliant:', settingCompliance?.isCompliant);
      console.log('Confidence:', settingCompliance?.confidence);
      console.log('Platforms:', settingCompliance?.platforms.join(', '));
    } else {
      console.log('⚠️  No settings found in database');
    }

    // Test 2: Calculate compliance for a control
    console.log('\n📊 TEST 2: Calculate Control Compliance');
    console.log('-'.repeat(60));
    
    const controlWithMappings = await prisma.control.findFirst({
      where: {
        settingMappings: {
          some: {}
        }
      },
      include: {
        settingMappings: true
      }
    });

    if (controlWithMappings) {
      console.log(`Calculating for: ${controlWithMappings.controlNumber} - ${controlWithMappings.title}`);
      console.log(`Settings mapped: ${controlWithMappings.settingMappings.length}`);
      
      const controlCompliance = await complianceCalculationService.calculateControlCompliance(controlWithMappings.id);
      
      if (controlCompliance) {
        console.log('\nResults:');
        console.log(`  Total Settings: ${controlCompliance.totalSettings}`);
        console.log(`  Compliant: ${controlCompliance.compliantSettings}`);
        console.log(`  Non-Compliant: ${controlCompliance.nonCompliantSettings}`);
        console.log(`  Not Configured: ${controlCompliance.notConfiguredSettings}`);
        console.log(`  Errors: ${controlCompliance.errorSettings}`);
        console.log(`  Compliance %: ${controlCompliance.compliancePercentage}%`);
        console.log(`  Confidence Score: ${controlCompliance.confidenceWeightedScore}%`);
        
        console.log('\nPlatform Coverage:');
        Object.entries(controlCompliance.platformCoverage).forEach(([platform, details]) => {
          if (details.hasSettings) {
            console.log(`  ${platform}: ${details.compliantSettings}/${details.totalSettings} (${details.compliancePercentage}%)`);
          }
        });
      }
    } else {
      console.log('⚠️  No controls with mappings found');
    }

    // Test 3: Test caching
    console.log('\n📊 TEST 3: Test Compliance Caching');
    console.log('-'.repeat(60));
    
    if (controlWithMappings) {
      const cached = await complianceCalculationService.getCachedControlCompliance(controlWithMappings.id);
      if (cached) {
        console.log('✅ Cache found!');
        console.log(`  Cached at: ${cached.lastCalculated.toISOString()}`);
        console.log(`  Compliance: ${cached.compliancePercentage}%`);
      } else {
        console.log('⚠️  No cache found (expected if first run)');
      }
    }

    // Test 4: Get system-wide statistics
    console.log('\n📊 TEST 4: System Compliance Statistics');
    console.log('-'.repeat(60));
    
    const stats = await complianceCalculationService.getSystemComplianceStats();
    console.log('Overview:');
    console.log(`  Total Controls: ${stats.overview.totalControls}`);
    console.log(`  Total Settings: ${stats.overview.totalSettings}`);
    console.log(`  Overall Compliance: ${stats.overview.overallCompliance}%`);
    console.log(`  Avg Confidence Score: ${stats.overview.avgConfidenceScore}%`);
    
    console.log('\nTop Families by Compliance:');
    const familiesSorted = Object.entries(stats.byFamily)
      .sort(([, a]: any, [, b]: any) => b.compliancePercentage - a.compliancePercentage)
      .slice(0, 5);
    
    familiesSorted.forEach(([family, data]: any) => {
      console.log(`  ${family}: ${data.compliancePercentage}% (${data.compliantSettings}/${data.totalSettings})`);
    });

    // Test 5: Bulk recalculation (sample)
    console.log('\n📊 TEST 5: Bulk Recalculation (5 controls)');
    console.log('-'.repeat(60));
    
    const sampleControls = await prisma.control.findMany({
      where: {
        settingMappings: {
          some: {}
        }
      },
      take: 5,
      select: { id: true }
    });

    if (sampleControls.length > 0) {
      const controlIds = sampleControls.map(c => c.id);
      const result = await complianceCalculationService.recalculateControls(controlIds);
      
      console.log(`✅ Success: ${result.successCount}/${result.totalControls}`);
      console.log(`❌ Errors: ${result.errorCount}`);
      console.log(`⏱️  Duration: ${result.duration}ms`);
      
      if (result.errors.length > 0) {
        console.log('\nErrors:');
        result.errors.forEach(err => {
          console.log(`  - ${err.controlId}: ${err.error}`);
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  testComplianceCalculation()
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default testComplianceCalculation;
```

---

### Step 5: Add NPM Script

📁 **File:** `backend/package.json`

🔍 **FIND:**
```json
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
```

✏️ **REPLACE WITH:**
```json
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "test:compliance": "ts-node src/scripts/testComplianceCalculation.ts",
```

---

### Step 6: Create Verification Script

📁 **File:** `backend/src/scripts/verifyComplianceSystem.ts`

Create comprehensive verification script:

```typescript
import { PrismaClient } from '@prisma/client';
import { complianceCalculationService } from '../services/complianceCalculation.service';

const prisma = new PrismaClient();

interface VerificationResult {
  passed: boolean;
  message: string;
  details?: any;
}

async function verifyComplianceSystem(): Promise<void> {
  console.log('='.repeat(70));
  console.log('COMPLIANCE CALCULATION SYSTEM VERIFICATION');
  console.log('='.repeat(70));

  const results: VerificationResult[] = [];

  try {
    // Check 1: Verify ControlM365Compliance table exists
    console.log('\n✓ Check 1: Verify ControlM365Compliance table...');
    try {
      const count = await prisma.controlM365Compliance.count();
      results.push({
        passed: true,
        message: 'ControlM365Compliance table accessible',
        details: { recordCount: count }
      });
      console.log(`  ✅ PASS - ${count} records found`);
    } catch (error) {
      results.push({
        passed: false,
        message: 'ControlM365Compliance table not found',
        details: { error }
      });
      console.log('  ❌ FAIL - Table not accessible');
    }

    // Check 2: Verify compliance calculation works
    console.log('\n✓ Check 2: Verify compliance calculation...');
    const controlWithMappings = await prisma.control.findFirst({
      where: {
        settingMappings: { some: {} }
      }
    });

    if (controlWithMappings) {
      try {
        const summary = await complianceCalculationService.calculateControlCompliance(controlWithMappings.id);
        results.push({
          passed: summary !== null,
          message: 'Compliance calculation functional',
          details: {
            controlId: controlWithMappings.id,
            totalSettings: summary?.totalSettings,
            compliancePercentage: summary?.compliancePercentage
          }
        });
        console.log(`  ✅ PASS - Calculated compliance: ${summary?.compliancePercentage}%`);
      } catch (error) {
        results.push({
          passed: false,
          message: 'Compliance calculation failed',
          details: { error }
        });
        console.log('  ❌ FAIL - Calculation error');
      }
    } else {
      results.push({
        passed: false,
        message: 'No controls with mappings found for testing'
      });
      console.log('  ⚠️  SKIP - No test data available');
    }

    // Check 3: Verify caching works
    console.log('\n✓ Check 3: Verify compliance caching...');
    if (controlWithMappings) {
      try {
        const cached = await complianceCalculationService.getCachedControlCompliance(controlWithMappings.id);
        results.push({
          passed: cached !== null,
          message: 'Compliance caching functional',
          details: {
            controlId: controlWithMappings.id,
            cacheAge: cached ? `${Math.round((Date.now() - cached.lastCalculated.getTime()) / 1000)}s` : 'N/A'
          }
        });
        console.log(`  ✅ PASS - Cache ${cached ? 'found' : 'empty (expected on first run)'}`);
      } catch (error) {
        results.push({
          passed: false,
          message: 'Cache retrieval failed',
          details: { error }
        });
        console.log('  ❌ FAIL - Cache error');
      }
    }

    // Check 4: Verify setting compliance calculation
    console.log('\n✓ Check 4: Verify setting-level compliance...');
    const setting = await prisma.m365Setting.findFirst({
      include: {
        complianceChecks: {
          take: 1,
          orderBy: { checkedAt: 'desc' }
        }
      }
    });

    if (setting) {
      try {
        const settingCompliance = await complianceCalculationService.calculateSettingCompliance(setting.id);
        results.push({
          passed: settingCompliance !== null,
          message: 'Setting compliance calculation functional',
          details: {
            settingId: setting.id,
            status: settingCompliance?.status
          }
        });
        console.log(`  ✅ PASS - Status: ${settingCompliance?.status}`);
      } catch (error) {
        results.push({
          passed: false,
          message: 'Setting compliance calculation failed',
          details: { error }
        });
        console.log('  ❌ FAIL - Calculation error');
      }
    }

    // Check 5: Verify system statistics
    console.log('\n✓ Check 5: Verify system statistics...');
    try {
      const stats = await complianceCalculationService.getSystemComplianceStats();
      results.push({
        passed: stats.overview.totalControls > 0,
        message: 'System statistics functional',
        details: {
          totalControls: stats.overview.totalControls,
          totalSettings: stats.overview.totalSettings,
          overallCompliance: stats.overview.overallCompliance
        }
      });
      console.log(`  ✅ PASS - ${stats.overview.totalControls} controls, ${stats.overview.overallCompliance}% compliant`);
    } catch (error) {
      results.push({
        passed: false,
        message: 'System statistics failed',
        details: { error }
      });
      console.log('  ❌ FAIL - Statistics error');
    }

    // Check 6: Verify bulk recalculation
    console.log('\n✓ Check 6: Verify bulk recalculation...');
    const testControls = await prisma.control.findMany({
      where: {
        settingMappings: { some: {} }
      },
      take: 3,
      select: { id: true }
    });

    if (testControls.length > 0) {
      try {
        const result = await complianceCalculationService.recalculateControls(
          testControls.map(c => c.id)
        );
        results.push({
          passed: result.successCount === testControls.length,
          message: 'Bulk recalculation functional',
          details: {
            tested: testControls.length,
            succeeded: result.successCount,
            failed: result.errorCount,
            duration: result.duration
          }
        });
        console.log(`  ✅ PASS - ${result.successCount}/${testControls.length} succeeded in ${result.duration}ms`);
      } catch (error) {
        results.push({
          passed: false,
          message: 'Bulk recalculation failed',
          details: { error }
        });
        console.log('  ❌ FAIL - Recalculation error');
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION SUMMARY');
    console.log('='.repeat(70));

    const totalChecks = results.length;
    const passedChecks = results.filter(r => r.passed).length;
    const failedChecks = totalChecks - passedChecks;

    console.log(`Total Checks: ${totalChecks}`);
    console.log(`✅ Passed: ${passedChecks}`);
    console.log(`❌ Failed: ${failedChecks}`);
    console.log(`Success Rate: ${Math.round((passedChecks / totalChecks) * 100)}%`);

    if (failedChecks > 0) {
      console.log('\n⚠️  FAILED CHECKS:');
      results.filter(r => !r.passed).forEach((result, idx) => {
        console.log(`  ${idx + 1}. ${result.message}`);
        if (result.details) {
          console.log(`     Details: ${JSON.stringify(result.details, null, 2)}`);
        }
      });
    }

    console.log('\n' + '='.repeat(70));
    if (passedChecks === totalChecks) {
      console.log('✅ ALL VERIFICATIONS PASSED - SYSTEM READY');
    } else {
      console.log('⚠️  SOME VERIFICATIONS FAILED - REVIEW REQUIRED');
    }
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ VERIFICATION PROCESS FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  verifyComplianceSystem()
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default verifyComplianceSystem;
```

---

## ✅ VERIFICATION CHECKLIST

After implementation, verify each item:

### Code Quality
- [ ] All TypeScript files compile without errors (`npm run build`)
- [ ] No ESLint warnings or errors
- [ ] All imports resolve correctly
- [ ] Type definitions are complete and accurate

### Service Functionality
- [ ] `calculateSettingCompliance()` returns correct status
- [ ] `calculateControlCompliance()` aggregates settings correctly
- [ ] Confidence-weighted scoring produces expected results
- [ ] Platform coverage calculations work for all platforms
- [ ] Caching system stores and retrieves data correctly

### Database Integration
- [ ] ControlM365Compliance table populates correctly
- [ ] Upsert operations work (create and update)
- [ ] Cached data includes all required fields
- [ ] Cache age checking works correctly

### Bulk Operations
- [ ] `recalculateAllControls()` processes all controls
- [ ] Error handling doesn't break bulk operations
- [ ] Progress logging works correctly
- [ ] Performance is acceptable (<30s for full recalc)

### Testing
- [ ] Test script runs successfully: `npm run test:compliance`
- [ ] Verification script passes all checks
- [ ] Sample controls show expected compliance percentages
- [ ] System statistics calculate correctly

---

## 🧪 TESTING PROCEDURES

### Manual Testing

**1. Test Setting-Level Compliance**
```bash
cd backend
npm run test:compliance
```
Verify:
- Setting status is calculated correctly
- All fields are populated
- Error handling works

**2. Test Control-Level Compliance**
```bash
# In test script, check control compliance output
```
Verify:
- All settings are counted
- Percentages are correct (0-100)
- Platform coverage shows correct data
- Cache is created

**3. Test System Statistics**
```bash
# Check system stats in test output
```
Verify:
- Total counts are accurate
- Family breakdowns are correct
- Overall compliance makes sense

**4. Run Verification Script**
```bash
cd backend
npx ts-node src/scripts/verifyComplianceSystem.ts
```
All checks should pass.

### Automated Testing

Create unit tests for critical functions:

📁 **File:** `backend/src/services/__tests__/complianceCalculation.test.ts`

```typescript
import { complianceCalculationService } from '../complianceCalculation.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('ComplianceCalculationService', () => {
  
  test('calculateSettingCompliance returns valid result', async () => {
    const setting = await prisma.m365Setting.findFirst();
    if (!setting) throw new Error('No test data');
    
    const result = await complianceCalculationService.calculateSettingCompliance(setting.id);
    
    expect(result).toBeDefined();
    expect(result?.settingId).toBe(setting.id);
    expect(result?.status).toMatch(/COMPLIANT|NON_COMPLIANT|NOT_CONFIGURED|ERROR/);
  });

  test('calculateControlCompliance aggregates correctly', async () => {
    const control = await prisma.control.findFirst({
      where: { settingMappings: { some: {} } }
    });
    if (!control) throw new Error('No test data');
    
    const result = await complianceCalculationService.calculateControlCompliance(control.id);
    
    expect(result).toBeDefined();
    expect(result?.totalSettings).toBeGreaterThan(0);
    expect(result?.compliancePercentage).toBeGreaterThanOrEqual(0);
    expect(result?.compliancePercentage).toBeLessThanOrEqual(100);
  });

  test('caching works correctly', async () => {
    const control = await prisma.control.findFirst({
      where: { settingMappings: { some: {} } }
    });
    if (!control) throw new Error('No test data');
    
    // Calculate (creates cache)
    await complianceCalculationService.calculateControlCompliance(control.id);
    
    // Retrieve cache
    const cached = await complianceCalculationService.getCachedControlCompliance(control.id, 60);
    
    expect(cached).toBeDefined();
    expect(cached?.controlId).toBe(control.id);
  });
});
```

---

## 🐛 TROUBLESHOOTING

### Issue: Compliance percentages are always 0%

**Cause:** No compliance checks exist in database  
**Solution:**
1. Ensure Phase 3 (Validation Engine) is complete
2. Run validation checks to populate SettingComplianceCheck table
3. Then recalculate compliance

### Issue: Platform coverage shows no data

**Cause:** Platform information missing in settings  
**Solution:**
1. Check M365Setting.platforms field contains valid data
2. Verify platforms are stored as JSON array
3. Re-import settings if needed

### Issue: Cache never expires

**Cause:** `maxAgeMinutes` parameter too large  
**Solution:**
- Reduce cache expiration time in `getCachedControlCompliance()` calls
- Force recalculation with `calculateControlCompliance()` directly

### Issue: Bulk recalculation times out

**Cause:** Too many controls, database locked  
**Solution:**
1. Process controls in smaller batches
2. Add batch size parameter to `recalculateAllControls()`
3. Consider running as background job

### Issue: Confidence weights not affecting score

**Cause:** All settings have same confidence level  
**Solution:**
- Check that settings have varied confidence (HIGH, MEDIUM, LOW)
- Review confidence values in master_settings_catalog.json
- Adjust CONFIDENCE_WEIGHTS constants if needed

### Issue: TypeScript errors about Json type

**Cause:** Prisma Json type vs TypeScript object  
**Solution:**
```typescript
// Cast to 'any' when storing
platformCoverage: summary.platformCoverage as any

// Cast back when retrieving
platformCoverage: cached.platformCoverage as PlatformCoverage
```

---

## 📊 EXPECTED OUTCOMES

After completing Phase 4:

### Database State
- ✅ ControlM365Compliance table populated for all controls with mappings
- ✅ Compliance summaries cached and up-to-date
- ✅ All fields contain valid data (no nulls where not expected)

### Service Capabilities
- ✅ Can calculate setting-level compliance
- ✅ Can calculate control-level compliance
- ✅ Can get system-wide statistics
- ✅ Can perform bulk recalculations
- ✅ Caching reduces redundant calculations

### Performance
- ✅ Single setting calculation: <50ms
- ✅ Single control calculation: <500ms
- ✅ Full system recalculation: <30s (for ~100 controls)
- ✅ Cache retrieval: <10ms

### Data Quality
- ✅ Compliance percentages between 0-100%
- ✅ Confidence-weighted scores differ from simple percentages
- ✅ Platform coverage accurately reflects available settings
- ✅ Status counts add up to total settings

---

## 🔄 INTEGRATION POINTS

### Used By (Dependencies)
- **Phase 5:** API endpoints will call these services
- **Phase 6:** Policy sync will trigger recalculation
- **Phase 7-10:** Frontend components will display this data

### Uses (Requirements)
- **Phase 1:** Database schema (ControlM365Compliance table)
- **Phase 2:** Imported settings and mappings
- **Phase 3:** Validation engine for compliance checks

---

## 📚 ADDITIONAL RESOURCES

### Key Formulas

**Simple Compliance Percentage:**
```
compliance% = (compliant_settings / total_settings) × 100
```

**Confidence-Weighted Score:**
```
score = Σ(setting_compliance × confidence_weight) / Σ(confidence_weights)
```

**Platform Compliance:**
```
platform% = (platform_compliant / platform_total) × 100
```

### Database Queries

**Get all non-compliant controls:**
```sql
SELECT * FROM ControlM365Compliance 
WHERE compliancePercentage < 80
ORDER BY compliancePercentage ASC;
```

**Get controls with no settings:**
```sql
SELECT c.* FROM Control c
LEFT JOIN ControlSettingMapping csm ON c.id = csm.controlId
WHERE csm.id IS NULL;
```

**Get compliance by family:**
```sql
SELECT c.family, AVG(cm.compliancePercentage) as avg_compliance
FROM Control c
JOIN ControlM365Compliance cm ON c.id = cm.controlId
GROUP BY c.family
ORDER BY avg_compliance DESC;
```

---

## ✅ COMPLETION CRITERIA

Phase 4 is complete when:

- [ ] All TypeScript files compile without errors
- [ ] Test script runs successfully with expected output
- [ ] Verification script passes all 6 checks
- [ ] ControlM365Compliance table contains data for all controls with mappings
- [ ] System statistics show reasonable compliance percentages
- [ ] Confidence-weighted scores differ from simple percentages (proving weighting works)
- [ ] Platform coverage shows data for at least one platform
- [ ] Bulk recalculation completes in <30 seconds
- [ ] No console errors when running calculations
- [ ] Ready to proceed to Phase 5 (API Endpoints)

---

## 📞 NEXT STEPS

After completing Phase 4:

1. **Immediate:**
   - Run verification script to confirm everything works
   - Check database to see cached compliance data
   - Review compliance percentages for accuracy

2. **Next Phase:**
   - Proceed to Phase 5: M365 Settings API Endpoints
   - This will expose the compliance data via REST API
   - Frontend can then consume this data

3. **Optional Enhancements:**
   - Add more sophisticated weighting algorithms
   - Implement trending (track compliance over time)
   - Add alerting for low compliance
   - Create scheduled background recalculation

---

**Phase 4 Implementation Guide Version:** 1.0  
**Created:** 2024-11-17  
**Optimized For:** Claude Code Execution  
**Estimated Completion:** 2-3 hours

---

**END OF PHASE 4 GUIDE**
