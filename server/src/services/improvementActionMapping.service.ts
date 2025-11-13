/**
 * Improvement Action Mapping Service
 * Maps improvement actions to the actual policies/settings that satisfy them
 * Now with platform-specific tracking (Windows, iOS, Android, macOS)
 */

import { prisma } from '@/config/database';
import * as fs from 'fs';
import * as path from 'path';
import {
  extractPlatformFromPolicy,
  DevicePlatform,
  getPlatformIcon,
} from '../utils/platformHelpers';

export interface PlatformCoverage {
  platform: DevicePlatform;
  isRequired: boolean;
  hasPolicies: boolean;
  policies: {
    policyName: string;
    policyType: string;
    settings: {
      settingName: string;
      currentValue: any;
      requiredValue: any;
      meetsRequirement: boolean;
    }[];
    overallCompliance: number;
  }[];
  compliantPoliciesCount: number;
  totalPoliciesCount: number;
  platformStatus: 'Completed' | 'InProgress' | 'NotStarted' | 'NotRequired';
}

export interface ImprovementActionWithPolicies {
  title: string;
  category: string;
  priority: string;
  complianceManagerUrl: string;
  status: 'Completed' | 'InProgress' | 'NotStarted' | 'Unknown';
  requiredPlatforms: DevicePlatform[];
  platformCoverage: PlatformCoverage[];
  satisfiedBy: {
    policyName: string;
    policyType: string;
    platform: DevicePlatform;
    settings: {
      settingName: string;
      currentValue: any;
      requiredValue: any;
      meetsRequirement: boolean;
    }[];
    overallCompliance: number;
  }[];
  totalPolicies: number;
  compliantPolicies: number;
  platformsCompleted: number;
  platformsRequired: number;
}

class ImprovementActionMappingService {
  private improvementActionsPath = path.join(
    __dirname,
    '../../..',
    'data',
    'nist-improvement-actions.json'
  );

  private loadImprovementActions(): any {
    try {
      const fileContent = fs.readFileSync(this.improvementActionsPath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error('❌ Error loading improvement actions:', error);
      return { mappings: {} };
    }
  }

  /**
   * Get improvement actions with policy mappings for a control
   * Now with platform-specific tracking
   */
  async getImprovementActionsWithPolicies(
    controlId: string
  ): Promise<ImprovementActionWithPolicies[]> {
    try {
      // Load improvement actions for this control
      const improvementActionsData = this.loadImprovementActions();
      const controlMappings = improvementActionsData.mappings[controlId];

      if (!controlMappings || !controlMappings.improvementActions) {
        return [];
      }

      // Get control with policy mappings
      const control = await prisma.control.findUnique({
        where: { controlId },
        include: {
          policyMappings: {
            where: { isAutoMapped: true },
            include: {
              policy: true,
            },
          },
        },
      });

      if (!control) {
        return [];
      }

      const results: ImprovementActionWithPolicies[] = [];

      // For each improvement action, find which policies satisfy it
      for (const action of controlMappings.improvementActions) {
        // Get required platforms
        // Only default to platform-specific tracking for Device/Endpoint categories
        // Identity/Apps/Data categories are often platform-agnostic (e.g., Azure AD, Purview)
        const isPlatformSpecific = ['Device', 'Endpoint', 'Mobile'].some(cat =>
          action.category.toLowerCase().includes(cat.toLowerCase())
        );

        const requiredPlatforms: DevicePlatform[] = action.requiredPlatforms ||
          (isPlatformSpecific ? ['Windows', 'iOS', 'Android'] : []);

        // Group policies by platform
        const policiesByPlatform: Map<
          DevicePlatform,
          ImprovementActionWithPolicies['satisfiedBy']
        > = new Map();

        const allSatisfiedBy: ImprovementActionWithPolicies['satisfiedBy'] = [];
        let totalCompliantPolicies = 0;

        // Initialize platform maps
        requiredPlatforms.forEach(platform => {
          policiesByPlatform.set(platform, []);
        });

        // Check each mapped policy
        for (const mapping of control.policyMappings) {
          if (!mapping.mappedSettings) continue;

          // Parse policy data to extract platform
          const policyData = JSON.parse(mapping.policy.policyData);
          const platform = extractPlatformFromPolicy(policyData);

          const settings = JSON.parse(mapping.mappedSettings);
          const relevantSettings = settings.filter((s: any) => s.meetsRequirement);

          if (settings.length > 0) {
            const compliancePercentage =
              (relevantSettings.length / settings.length) * 100;

            const policyInfo = {
              policyName: mapping.policy.policyName,
              policyType: mapping.policy.policyType,
              platform,
              settings: settings.map((s: any) => ({
                settingName: s.settingName,
                currentValue: s.settingValue,
                requiredValue: s.requiredValue,
                meetsRequirement: s.meetsRequirement,
              })),
              overallCompliance: Math.round(compliancePercentage),
            };

            allSatisfiedBy.push(policyInfo);

            // Add to platform-specific list
            if (requiredPlatforms.includes(platform)) {
              const platformPolicies = policiesByPlatform.get(platform) || [];
              platformPolicies.push(policyInfo);
              policiesByPlatform.set(platform, platformPolicies);
            }

            if (compliancePercentage === 100) {
              totalCompliantPolicies++;
            }
          }
        }

        // Calculate platform coverage
        const platformCoverage: PlatformCoverage[] = requiredPlatforms.map(platform => {
          const policies = policiesByPlatform.get(platform) || [];
          const compliantCount = policies.filter(p => p.overallCompliance === 100).length;

          let platformStatus: PlatformCoverage['platformStatus'];
          if (policies.length === 0) {
            platformStatus = 'NotStarted';
          } else if (compliantCount === policies.length) {
            platformStatus = 'Completed';
          } else if (compliantCount > 0) {
            platformStatus = 'InProgress';
          } else {
            platformStatus = 'NotStarted';
          }

          return {
            platform,
            isRequired: true,
            hasPolicies: policies.length > 0,
            policies: policies.map(p => ({
              policyName: p.policyName,
              policyType: p.policyType,
              settings: p.settings,
              overallCompliance: p.overallCompliance,
            })),
            compliantPoliciesCount: compliantCount,
            totalPoliciesCount: policies.length,
            platformStatus,
          };
        });

        // Calculate overall status based on platform completion
        const platformsCompleted = platformCoverage.filter(
          pc => pc.platformStatus === 'Completed'
        ).length;
        const platformsInProgress = platformCoverage.filter(
          pc => pc.platformStatus === 'InProgress'
        ).length;
        const platformsNotStarted = platformCoverage.filter(
          pc => pc.platformStatus === 'NotStarted'
        ).length;

        let overallStatus: 'Completed' | 'InProgress' | 'NotStarted' | 'Unknown';

        // If no platforms required (platform-agnostic actions like Azure AD/Purview)
        // Use traditional compliance percentage logic
        if (requiredPlatforms.length === 0) {
          if (allSatisfiedBy.length === 0) {
            overallStatus = 'Unknown';
          } else if (totalCompliantPolicies === allSatisfiedBy.length) {
            overallStatus = 'Completed';
          } else if (totalCompliantPolicies > 0) {
            overallStatus = 'InProgress';
          } else {
            overallStatus = 'NotStarted';
          }
        } else {
          // Platform-specific logic
          if (platformsCompleted === requiredPlatforms.length) {
            overallStatus = 'Completed';
          } else if (platformsCompleted > 0 || platformsInProgress > 0) {
            overallStatus = 'InProgress';
          } else if (platformsNotStarted === requiredPlatforms.length) {
            overallStatus = 'NotStarted';
          } else {
            overallStatus = 'Unknown';
          }
        }

        results.push({
          title: action.title,
          category: action.category,
          priority: action.priority,
          complianceManagerUrl: action.complianceManagerUrl,
          status: overallStatus,
          requiredPlatforms,
          platformCoverage,
          satisfiedBy: allSatisfiedBy,
          totalPolicies: allSatisfiedBy.length,
          compliantPolicies: totalCompliantPolicies,
          platformsCompleted,
          platformsRequired: requiredPlatforms.length,
        });
      }

      return results;
    } catch (error) {
      console.error(`Error mapping improvement actions for ${controlId}:`, error);
      return [];
    }
  }
}

export const improvementActionMappingService = new ImprovementActionMappingService();
