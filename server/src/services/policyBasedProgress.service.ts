/**
 * Policy-Based Progress Service
 * Calculates control implementation progress based on mapped M365 policies
 * instead of trying to match Microsoft Secure Score titles
 */

import { prisma } from '@/config/database';
import * as fs from 'fs';
import * as path from 'path';

export interface PolicyBasedProgress {
  controlId: string;
  totalPolicies: number;
  compliantPolicies: number;
  partiallyCompliantPolicies: number;
  nonCompliantPolicies: number;
  progressPercentage: number;
  status: 'Completed' | 'InProgress' | 'NotStarted' | 'NotApplicable';
}

class PolicyBasedProgressService {
  /**
   * Calculate progress for a single control based on mapped policies
   */
  async calculateControlProgress(controlId: string): Promise<PolicyBasedProgress | null> {
    try {
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

      if (!control || control.policyMappings.length === 0) {
        return null;
      }

      let compliantCount = 0;
      let partiallyCompliantCount = 0;
      let nonCompliantCount = 0;

      // Analyze each mapped policy
      for (const mapping of control.policyMappings) {
        if (!mapping.mappedSettings) continue;

        const settings = JSON.parse(mapping.mappedSettings);
        const totalSettings = settings.length;
        const compliantSettings = settings.filter((s: any) => s.meetsRequirement).length;

        if (compliantSettings === totalSettings) {
          compliantCount++;
        } else if (compliantSettings > 0) {
          partiallyCompliantCount++;
        } else {
          nonCompliantCount++;
        }
      }

      const totalPolicies = control.policyMappings.length;
      const progressPercentage = Math.round((compliantCount / totalPolicies) * 100);

      // Determine status
      let status: 'Completed' | 'InProgress' | 'NotStarted' | 'NotApplicable' = 'NotStarted';
      if (compliantCount === totalPolicies) {
        status = 'Completed';
      } else if (compliantCount > 0 || partiallyCompliantCount > 0) {
        status = 'InProgress';
      }

      return {
        controlId,
        totalPolicies,
        compliantPolicies: compliantCount,
        partiallyCompliantPolicies: partiallyCompliantCount,
        nonCompliantPolicies: nonCompliantCount,
        progressPercentage,
        status,
      };
    } catch (error) {
      console.error(`Error calculating policy-based progress for ${controlId}:`, error);
      return null;
    }
  }

  /**
   * Calculate progress for all controls based on policies
   */
  async calculateAllControlsProgress(): Promise<Map<string, PolicyBasedProgress>> {
    try {
      console.log('📊 Calculating policy-based progress for all controls...');

      const controls = await prisma.control.findMany({
        include: {
          policyMappings: {
            where: { isAutoMapped: true },
            include: {
              policy: true,
            },
          },
        },
      });

      const progressMap = new Map<string, PolicyBasedProgress>();
      let controlsWithPolicies = 0;
      let totalPoliciesMapped = 0;

      for (const control of controls) {
        if (control.policyMappings.length === 0) {
          continue;
        }

        controlsWithPolicies++;
        totalPoliciesMapped += control.policyMappings.length;

        let compliantCount = 0;
        let partiallyCompliantCount = 0;
        let nonCompliantCount = 0;

        // Analyze each mapped policy
        for (const mapping of control.policyMappings) {
          if (!mapping.mappedSettings) continue;

          const settings = JSON.parse(mapping.mappedSettings);
          const totalSettings = settings.length;
          const compliantSettings = settings.filter((s: any) => s.meetsRequirement).length;

          if (compliantSettings === totalSettings) {
            compliantCount++;
          } else if (compliantSettings > 0) {
            partiallyCompliantCount++;
          } else {
            nonCompliantCount++;
          }
        }

        const totalPolicies = control.policyMappings.length;
        const progressPercentage = Math.round((compliantCount / totalPolicies) * 100);

        // Determine status
        let status: 'Completed' | 'InProgress' | 'NotStarted' | 'NotApplicable' = 'NotStarted';
        if (compliantCount === totalPolicies) {
          status = 'Completed';
        } else if (compliantCount > 0 || partiallyCompliantCount > 0) {
          status = 'InProgress';
        }

        progressMap.set(control.controlId, {
          controlId: control.controlId,
          totalPolicies,
          compliantPolicies: compliantCount,
          partiallyCompliantPolicies: partiallyCompliantCount,
          nonCompliantPolicies: nonCompliantCount,
          progressPercentage,
          status,
        });
      }

      console.log(`✅ Policy-based progress calculated`);
      console.log(`   Controls with policies: ${controlsWithPolicies}`);
      console.log(`   Total policies mapped: ${totalPoliciesMapped}`);
      console.log(`   Controls with progress: ${progressMap.size}`);

      return progressMap;
    } catch (error) {
      console.error('Error calculating policy-based progress:', error);
      return new Map();
    }
  }

  /**
   * Get summary statistics
   */
  async getProgressSummary(): Promise<{
    totalControls: number;
    completedControls: number;
    inProgressControls: number;
    notStartedControls: number;
    overallProgress: number;
    totalPolicies: number;
    compliantPolicies: number;
  }> {
    const progressMap = await this.calculateAllControlsProgress();

    let completedControls = 0;
    let inProgressControls = 0;
    let notStartedControls = 0;
    let totalPolicies = 0;
    let compliantPolicies = 0;

    for (const progress of progressMap.values()) {
      totalPolicies += progress.totalPolicies;
      compliantPolicies += progress.compliantPolicies;

      switch (progress.status) {
        case 'Completed':
          completedControls++;
          break;
        case 'InProgress':
          inProgressControls++;
          break;
        case 'NotStarted':
          notStartedControls++;
          break;
      }
    }

    const overallProgress =
      totalPolicies > 0 ? Math.round((compliantPolicies / totalPolicies) * 100) : 0;

    return {
      totalControls: progressMap.size,
      completedControls,
      inProgressControls,
      notStartedControls,
      overallProgress,
      totalPolicies,
      compliantPolicies,
    };
  }
}

export const policyBasedProgressService = new PolicyBasedProgressService();
