import { PrismaClient } from '@prisma/client';
import {
  ComplianceStatus,
  SettingComplianceResult,
  ControlComplianceSummary,
  BulkCalculationResult
} from '../types/compliance.types';

const prisma = new PrismaClient();

/**
 * Compliance Calculation Service
 * Handles all compliance calculations, aggregations, and caching
 */
class ComplianceCalculationService {

  /**
   * Calculate compliance for a single setting
   * Looks up the latest validation check and formats result
   */
  async calculateSettingCompliance(settingId: number, mappingData?: { confidence: string }): Promise<SettingComplianceResult | null> {
    try {
      // Get the setting with its latest compliance check
      const setting = await prisma.m365Setting.findUnique({
        where: { id: settingId },
        include: {
          complianceChecks: {
            orderBy: { lastChecked: 'desc' },
            take: 1
          }
        }
      });

      if (!setting) {
        console.warn(`Setting not found: ${settingId}`);
        return null;
      }

      const latestCheck = setting.complianceChecks[0];

      // Get confidence from mapping data if provided, otherwise default to 'LOW'
      const confidence = mappingData?.confidence || 'LOW';

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
          confidence: confidence,
          platform: setting.platform,
          lastChecked: new Date(),
          complianceMessage: 'No policy data found'
        };
      }

      // Determine compliance status
      let status: ComplianceStatus;
      if (latestCheck.isCompliant) {
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
        confidence: confidence,
        platform: setting.platform,
        lastChecked: latestCheck.lastChecked,
        complianceMessage: latestCheck.complianceMessage || undefined
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
  async calculateControlCompliance(controlId: number): Promise<ControlComplianceSummary | null> {
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
                    orderBy: { lastChecked: 'desc' },
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
        const result = await this.calculateSettingCompliance(
          mapping.setting.id,
          { confidence: mapping.confidence }
        );
        if (result) {
          settingResults.push(result);
        }
      }

      // Calculate basic counts
      const totalRequiredSettings = settingResults.length;
      const compliantSettings = settingResults.filter(s => s.status === ComplianceStatus.COMPLIANT).length;
      const nonCompliantSettings = settingResults.filter(s => s.status === ComplianceStatus.NON_COMPLIANT).length;
      const notConfiguredSettings = settingResults.filter(s => s.status === ComplianceStatus.NOT_CONFIGURED).length;

      // Calculate simple compliance percentage
      const compliancePercentage = totalRequiredSettings > 0
        ? (compliantSettings / totalRequiredSettings) * 100
        : 0;

      // Calculate confidence counts
      const highConfidenceCount = settingResults.filter(s => s.confidence.toUpperCase() === 'HIGH').length;
      const mediumConfidenceCount = settingResults.filter(s => s.confidence.toUpperCase() === 'MEDIUM').length;
      const lowConfidenceCount = settingResults.filter(s => s.confidence.toUpperCase() === 'LOW').length;

      // Calculate platform coverage percentages
      const windowsSettings = settingResults.filter(s =>
        s.platform === 'Windows' || s.platform === 'All'
      );
      const iosSettings = settingResults.filter(s =>
        s.platform === 'iOS' || s.platform === 'All'
      );
      const androidSettings = settingResults.filter(s =>
        s.platform === 'Android' || s.platform === 'All'
      );

      const windowsCoverage = windowsSettings.length > 0
        ? (windowsSettings.filter(s => s.status === ComplianceStatus.COMPLIANT).length / windowsSettings.length) * 100
        : 0;

      const iosCoverage = iosSettings.length > 0
        ? (iosSettings.filter(s => s.status === ComplianceStatus.COMPLIANT).length / iosSettings.length) * 100
        : 0;

      const androidCoverage = androidSettings.length > 0
        ? (androidSettings.filter(s => s.status === ComplianceStatus.COMPLIANT).length / androidSettings.length) * 100
        : 0;

      const summary: ControlComplianceSummary = {
        controlId: control.id,
        controlNumber: control.controlId, // Note: controlId field contains the control number string
        totalRequiredSettings,
        compliantSettings,
        nonCompliantSettings,
        notConfiguredSettings,
        compliancePercentage,
        highConfidenceCount,
        mediumConfidenceCount,
        lowConfidenceCount,
        windowsCoverage,
        iosCoverage,
        androidCoverage,
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
   * Cache control compliance summary in database
   * Stores in ControlM365Compliance table for fast retrieval
   */
  private async cacheControlSummary(summary: ControlComplianceSummary): Promise<void> {
    try {
      await prisma.controlM365Compliance.upsert({
        where: { controlId: summary.controlId },
        update: {
          totalRequiredSettings: summary.totalRequiredSettings,
          compliantSettings: summary.compliantSettings,
          nonCompliantSettings: summary.nonCompliantSettings,
          notConfiguredSettings: summary.notConfiguredSettings,
          compliancePercentage: summary.compliancePercentage,
          highConfidenceCount: summary.highConfidenceCount,
          mediumConfidenceCount: summary.mediumConfidenceCount,
          lowConfidenceCount: summary.lowConfidenceCount,
          windowsCoverage: summary.windowsCoverage,
          iosCoverage: summary.iosCoverage,
          androidCoverage: summary.androidCoverage,
          lastCalculated: summary.lastCalculated
        },
        create: {
          controlId: summary.controlId,
          totalRequiredSettings: summary.totalRequiredSettings,
          compliantSettings: summary.compliantSettings,
          nonCompliantSettings: summary.nonCompliantSettings,
          notConfiguredSettings: summary.notConfiguredSettings,
          compliancePercentage: summary.compliancePercentage,
          highConfidenceCount: summary.highConfidenceCount,
          mediumConfidenceCount: summary.mediumConfidenceCount,
          lowConfidenceCount: summary.lowConfidenceCount,
          windowsCoverage: summary.windowsCoverage,
          iosCoverage: summary.iosCoverage,
          androidCoverage: summary.androidCoverage,
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
  async getCachedControlCompliance(controlId: number, maxAgeMinutes: number = 60): Promise<ControlComplianceSummary | null> {
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
        controlNumber: cached.control.controlId,
        totalRequiredSettings: cached.totalRequiredSettings,
        compliantSettings: cached.compliantSettings,
        nonCompliantSettings: cached.nonCompliantSettings,
        notConfiguredSettings: cached.notConfiguredSettings,
        compliancePercentage: cached.compliancePercentage,
        highConfidenceCount: cached.highConfidenceCount,
        mediumConfidenceCount: cached.mediumConfidenceCount,
        lowConfidenceCount: cached.lowConfidenceCount,
        windowsCoverage: cached.windowsCoverage,
        iosCoverage: cached.iosCoverage,
        androidCoverage: cached.androidCoverage,
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
          controlId: true
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
            controlId: control.controlId,
            error: errorMessage
          });
          console.error(`Failed to calculate compliance for control ${control.controlId}:`, errorMessage);
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
  async recalculateControls(controlIds: number[]): Promise<BulkCalculationResult> {
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
        errors.push({ controlId: controlId.toString(), error: errorMessage });
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
              controlId: true,
              title: true,
              family: true
            }
          }
        }
      });

      const totalControls = allSummaries.length;
      const totalSettings = allSummaries.reduce((sum, s) => sum + s.totalRequiredSettings, 0);
      const compliantSettings = allSummaries.reduce((sum, s) => sum + s.compliantSettings, 0);
      const nonCompliantSettings = allSummaries.reduce((sum, s) => sum + s.nonCompliantSettings, 0);
      const notConfiguredSettings = allSummaries.reduce((sum, s) => sum + s.notConfiguredSettings, 0);

      const overallCompliance = totalSettings > 0
        ? Math.round((compliantSettings / totalSettings) * 100)
        : 0;

      // Calculate average compliance percentage
      const avgCompliancePercentage = totalControls > 0
        ? Math.round(allSummaries.reduce((sum, s) => sum + s.compliancePercentage, 0) / totalControls)
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
        acc[family].totalSettings += summary.totalRequiredSettings;
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
          avgCompliancePercentage
        },
        byFamily,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error('Error getting system compliance stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const complianceCalculationService = new ComplianceCalculationService();
export default complianceCalculationService;
