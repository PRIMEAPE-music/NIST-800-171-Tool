/**
 * Control Progress Service
 * Now uses POLICY-BASED tracking instead of Secure Score title matching
 * Tracks progress based on your actual configured M365 policies
 */

import { policyBasedProgressService } from './policyBasedProgress.service';
import * as fs from 'fs';
import * as path from 'path';

export interface ControlProgress {
  controlId: string;
  totalActions: number;
  completedActions: number;
  inProgressActions: number;
  notStartedActions: number;
  unknownActions: number;
  progressPercentage: number;
  status: 'Completed' | 'InProgress' | 'NotStarted' | 'NotApplicable';
}

export interface ControlProgressDetail extends ControlProgress {
  actionBreakdown: {
    title: string;
    status: 'Completed' | 'InProgress' | 'NotStarted' | 'Unknown';
    category: string;
    priority: string;
  }[];
}

class ControlProgressService {
  private improvementActionsPath = path.join(
    __dirname,
    '../../..',
    'data',
    'nist-improvement-actions.json'
  );

  /**
   * Load NIST improvement actions
   */
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
   * Calculate progress using policy-based approach
   */
  async calculateControlProgress(
    controlId: string,
    forceRefresh: boolean = false
  ): Promise<ControlProgressDetail | null> {
    try {
      // Get improvement actions for this control
      const improvementActionsData = this.loadImprovementActions();
      const controlMappings = improvementActionsData.mappings[controlId];

      if (!controlMappings || !controlMappings.improvementActions) {
        return null;
      }

      // Get policy-based progress
      const policyProgress = await policyBasedProgressService.calculateControlProgress(controlId);

      if (!policyProgress) {
        // No policies mapped - show actions but with Unknown status
        return {
          controlId,
          totalActions: controlMappings.improvementActions.length,
          completedActions: 0,
          inProgressActions: 0,
          notStartedActions: 0,
          unknownActions: controlMappings.improvementActions.length,
          progressPercentage: 0,
          status: 'NotStarted',
          actionBreakdown: controlMappings.improvementActions.map((action: any) => ({
            title: action.title,
            status: 'Unknown' as const,
            category: action.category,
            priority: action.priority,
          })),
        };
      }

      // Map policy progress to improvement action progress
      // Use policy completion as proxy for improvement action completion
      const totalActions = controlMappings.improvementActions.length;
      const completedActions = Math.round(
        (policyProgress.compliantPolicies / policyProgress.totalPolicies) * totalActions
      );
      const inProgressActions = Math.round(
        (policyProgress.partiallyCompliantPolicies / policyProgress.totalPolicies) * totalActions
      );
      const notStartedActions = totalActions - completedActions - inProgressActions;

      return {
        controlId,
        totalActions,
        completedActions,
        inProgressActions,
        notStartedActions,
        unknownActions: 0,
        progressPercentage: policyProgress.progressPercentage,
        status: policyProgress.status,
        actionBreakdown: controlMappings.improvementActions.map((action: any, index: number) => {
          // Distribute statuses proportionally
          let status: 'Completed' | 'InProgress' | 'NotStarted' | 'Unknown';
          if (index < completedActions) {
            status = 'Completed';
          } else if (index < completedActions + inProgressActions) {
            status = 'InProgress';
          } else {
            status = 'NotStarted';
          }

          return {
            title: action.title,
            status,
            category: action.category,
            priority: action.priority,
          };
        }),
      };
    } catch (error) {
      console.error(`Error calculating progress for control ${controlId}:`, error);
      return null;
    }
  }

  /**
   * Calculate progress for all controls using policy-based approach
   */
  async calculateAllControlsProgress(
    forceRefresh: boolean = false
  ): Promise<Map<string, ControlProgress>> {
    try {
      console.log('📊 Calculating policy-based progress for all controls...');
      const improvementActionsData = this.loadImprovementActions();
      const allControlIds = Object.keys(improvementActionsData.mappings);

      // Get policy-based progress for all controls
      const policyProgressMap = await policyBasedProgressService.calculateAllControlsProgress();

      const progressMap = new Map<string, ControlProgress>();
      let totalControls = 0;
      let controlsWithProgress = 0;

      for (const controlId of allControlIds) {
        const controlMappings = improvementActionsData.mappings[controlId];

        if (!controlMappings || !controlMappings.improvementActions) {
          continue;
        }

        totalControls++;
        const policyProgress = policyProgressMap.get(controlId);

        if (!policyProgress) {
          // No policies mapped - show as not started
          progressMap.set(controlId, {
            controlId,
            totalActions: controlMappings.improvementActions.length,
            completedActions: 0,
            inProgressActions: 0,
            notStartedActions: controlMappings.improvementActions.length,
            unknownActions: 0,
            progressPercentage: 0,
            status: 'NotStarted',
          });
          continue;
        }

        controlsWithProgress++;

        // Map policy progress to improvement action progress
        const totalActions = controlMappings.improvementActions.length;
        const completedActions = Math.round(
          (policyProgress.compliantPolicies / policyProgress.totalPolicies) * totalActions
        );
        const inProgressActions = Math.round(
          (policyProgress.partiallyCompliantPolicies / policyProgress.totalPolicies) * totalActions
        );
        const notStartedActions = totalActions - completedActions - inProgressActions;

        progressMap.set(controlId, {
          controlId,
          totalActions,
          completedActions,
          inProgressActions,
          notStartedActions,
          unknownActions: 0,
          progressPercentage: policyProgress.progressPercentage,
          status: policyProgress.status,
        });
      }

      console.log(`✅ Progress calculated for ${progressMap.size} controls`);
      console.log(`   Controls with policy mappings: ${controlsWithProgress}/${totalControls}`);
      console.log(`   📍 Progress now based on YOUR configured M365 policies`);

      return progressMap;
    } catch (error) {
      console.error('❌ Error calculating progress:', error);
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
    totalActions: number;
    completedActions: number;
  }> {
    const progressMap = await this.calculateAllControlsProgress();

    let completedControls = 0;
    let inProgressControls = 0;
    let notStartedControls = 0;
    let totalActions = 0;
    let completedActions = 0;

    for (const progress of progressMap.values()) {
      totalActions += progress.totalActions;
      completedActions += progress.completedActions;

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
      totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

    return {
      totalControls: progressMap.size,
      completedControls,
      inProgressControls,
      notStartedControls,
      overallProgress,
      totalActions,
      completedActions,
    };
  }
}

export const controlProgressService = new ControlProgressService();
