import { PrismaClient } from '@prisma/client';
import { intuneService } from './intune.service';
import { purviewService } from './purview.service';
import { azureADService } from './azureAD.service';
// REMOVED: settingsMapper import - no longer mapping policies to controls
import { PolicyType, SyncResult } from '../types/m365.types';
import {
  checkComplianceAfterSync,
  updateSyncLogWithCompliance,
  PolicyComplianceContext,
} from './policySyncCompliance.service';

const prisma = new PrismaClient();

class PolicySyncService {
  // REMOVED: Mapping templates - no longer mapping policies to controls

  constructor() {
    // REMOVED: loadMappingTemplates() call
  }

  /**
   * Derive templateFamily from odataType
   */
  private getTemplateFamilyFromOdataType(odataType: string): string {
    if (!odataType) return 'Unknown';

    // Compliance policies
    if (odataType.includes('CompliancePolicy')) return 'Compliance';

    // Update policies
    if (odataType.includes('windowsUpdateForBusiness') || odataType.includes('Update')) return 'Update';

    // App Protection
    if (odataType.includes('ManagedAppProtection') || odataType.includes('AppProtection')) return 'AppProtection';

    // Conditional Access
    if (odataType.includes('conditionalAccess')) return 'ConditionalAccess';

    // Defender/Security
    if (odataType.includes('windowsDefenderAdvancedThreatProtection')) return 'DefenderSecurity';
    if (odataType.includes('endpointSecurityEndpointDetectionAndResponse')) return 'EndpointDetection';
    if (odataType.includes('endpointSecurityAttackSurfaceReduction')) return 'AttackSurfaceReduction';
    if (odataType.includes('endpointSecurityDiskEncryption')) return 'DiskEncryption';
    if (odataType.includes('baseline')) return 'SecurityBaseline';

    // Configuration
    if (odataType.includes('Configuration') || odataType.includes('customProfile')) return 'Configuration';

    return 'Configuration'; // Default
  }

  /**
   * Load predefined control-to-policy mapping templates
   * REMOVED: No longer loading mapping data files
   */
  // private loadMappingTemplates(): void { }

  /**
   * Calculate match confidence score for a policy-control pair
   * NOTE: Currently unused - kept for potential future use
   */
  // private calculateMatchScore(
  //   policy: { policyName: string; policyDescription: string | null },
  //   template: any
  // ): { score: number; matchedKeywords: string[] } {
  //   const matchedKeywords: string[] = [];
  //   let score = 0;

  //   // Check each keyword
  //   for (const keyword of template.searchCriteria.keywords) {
  //     const keywordLower = keyword.toLowerCase();

  //     // Check policy name (higher weight)
  //     if (policy.policyName.toLowerCase().includes(keywordLower)) {
  //       matchedKeywords.push(keyword);
  //       score += 2; // Name matches are worth more
  //     }
  //     // Check policy description (lower weight)
  //     else if (policy.policyDescription?.toLowerCase().includes(keywordLower)) {
  //       matchedKeywords.push(keyword);
  //       score += 1;
  //     }
  //   }

  //   // Calculate percentage of keywords matched
  //   const matchPercentage = matchedKeywords.length / template.searchCriteria.keywords.length;

  //   // Apply template confidence weight
  //   const templateWeight: Record<string, number> = {
  //     'High': 1.0,
  //     'Medium': 0.75,
  //     'Low': 0.5,
  //   };
  //   const weight = templateWeight[template.mappingConfidence] || 0.75;

  //   const finalScore = (matchPercentage * score * weight) / template.searchCriteria.keywords.length;

  //   return {
  //     score: Math.min(1.0, finalScore), // Cap at 1.0
  //     matchedKeywords,
  //   };
  // }

  /**
   * Convert numeric score to confidence level
   * NOTE: Currently unused - kept for potential future use
   */
  // private scoreToConfidence(score: number): 'High' | 'Medium' | 'Low' {
  //   if (score >= 0.7) return 'High';
  //   if (score >= 0.4) return 'Medium';
  //   return 'Low';
  // }

  /**
   * Sync all M365 policies to database
   */
  async syncAllPolicies(forceRefresh: boolean = false): Promise<SyncResult> {
    const startTime = Date.now();
    let policiesUpdated = 0;
    const errors: string[] = [];
    const addedPolicyIds: number[] = [];
    const updatedPolicyIds: number[] = [];

    console.log('🔄 Starting M365 policy sync...');

    try {
      // Fetch policies from each service
      const [intuneData, purviewData, azureADData] = await Promise.all([
        intuneService.getAllPolicies().catch(err => {
          errors.push(`Intune: ${err.message}`);
          return null;
        }),
        purviewService.getInformationProtectionSummary().catch(err => {
          errors.push(`Purview: ${err.message}`);
          return null;
        }),
        azureADService.getSecuritySummary().catch(err => {
          errors.push(`Azure AD: ${err.message}`);
          return null;
        }),
      ]);

      // Sync Intune policies
      if (intuneData) {
        const intuneCount = await this.syncIntunePolicies(intuneData, addedPolicyIds, updatedPolicyIds);
        policiesUpdated += intuneCount;
      }

      // Sync Purview policies
      if (purviewData) {
        const purviewCount = await this.syncPurviewPolicies(purviewData, addedPolicyIds, updatedPolicyIds);
        policiesUpdated += purviewCount;
      }

      // Sync Azure AD policies
      if (azureADData) {
        const azureADCount = await this.syncAzureADPolicies(azureADData, addedPolicyIds, updatedPolicyIds);
        policiesUpdated += azureADCount;
      }

      // REMOVED: Auto-mapping step - no longer mapping policies to controls
      console.log('✓ Policy sync completed (auto-mapping disabled)');

      // Update sync settings
      await prisma.m365Settings.upsert({
        where: { id: 1 },
        update: {
          lastSyncDate: new Date(),
        },
        create: {
          id: 1,
          lastSyncDate: new Date(),
          syncEnabled: true,
        },
      });

      // Log sync result
      const duration = Date.now() - startTime;
      const syncLog = await prisma.m365SyncLog.create({
        data: {
          syncType: forceRefresh ? 'Manual' : 'Automatic',
          policiesUpdated,
          controlsUpdated: 0, // No longer creating control mappings
          status: errors.length > 0 ? 'Partial' : 'Success',
          errorMessage: errors.length > 0 ? errors.join('; ') : null,
          syncDuration: duration,
        },
      });

      console.log(`✅ Sync complete: ${policiesUpdated} policies synced`);

      // Trigger compliance checking for changed policies
      console.log('\n🔍 Starting automatic compliance check...');
      try {
        const complianceContext: PolicyComplianceContext = {
          changedPolicyIds: addedPolicyIds.concat(updatedPolicyIds),
          syncLogId: syncLog.id,
        };

        if (complianceContext.changedPolicyIds.length > 0) {
          const complianceResult = await checkComplianceAfterSync(complianceContext);
          await updateSyncLogWithCompliance(syncLog.id, complianceResult);

          console.log('✅ Compliance check completed');
          console.log(`   • ${complianceResult.controlsAffected} controls checked`);
          console.log(`   • ${complianceResult.complianceImproved} improved`);
          console.log(`   • ${complianceResult.complianceDeclined} declined`);
        } else {
          console.log('ℹ️  No policy changes detected, skipping compliance check');
        }
      } catch (error) {
        console.error('⚠️  Compliance check failed (sync still successful):', error);
        // Don't fail the entire sync if compliance check fails
        await prisma.m365SyncLog.update({
          where: { id: syncLog.id },
          data: {
            complianceErrors: JSON.stringify([
              error instanceof Error ? error.message : 'Compliance check failed',
            ]),
          },
        });
      }

      return {
        success: errors.length === 0,
        policiesUpdated,
        duration,
        errors: errors.length > 0 ? errors : undefined,
        addedPolicyIds,
        updatedPolicyIds,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await prisma.m365SyncLog.create({
        data: {
          syncType: forceRefresh ? 'Manual' : 'Automatic',
          policiesUpdated: 0,
          controlsUpdated: 0,
          status: 'Failed',
          errorMessage,
          syncDuration: duration,
        },
      });

      throw error;
    }
  }

  /**
   * Sync Intune policies to database
   */
  private async syncIntunePolicies(
    data: any,
    addedPolicyIds: number[],
    updatedPolicyIds: number[]
  ): Promise<number> {
    let count = 0;

    // Sync compliance policies
    for (const policy of data.compliancePolicies || []) {
      const existing = await prisma.m365Policy.findUnique({
        where: { policyId: policy.id },
      });

      const odataType = policy['@odata.type'] || '';
      const templateFamily = this.getTemplateFamilyFromOdataType(odataType);

      const result = await prisma.m365Policy.upsert({
        where: { policyId: policy.id },
        update: {
          policyName: policy.displayName,
          policyDescription: policy.description || '',
          policyData: JSON.stringify(policy),
          odataType,
          templateFamily,
          lastSynced: new Date(),
          isActive: true,
        },
        create: {
          policyType: 'Intune',
          policyId: policy.id,
          policyName: policy.displayName,
          policyDescription: policy.description || '',
          policyData: JSON.stringify(policy),
          odataType,
          templateFamily,
        },
      });

      if (existing) {
        updatedPolicyIds.push(result.id);
      } else {
        addedPolicyIds.push(result.id);
      }
      count++;
    }

    // Sync legacy configuration policies
    for (const policy of data.configurationPolicies || []) {
      const existing = await prisma.m365Policy.findUnique({
        where: { policyId: policy.id },
      });

      const odataType = policy['@odata.type'] || '';
      const templateFamily = this.getTemplateFamilyFromOdataType(odataType);

      const result = await prisma.m365Policy.upsert({
        where: { policyId: policy.id },
        update: {
          policyName: policy.displayName,
          policyDescription: policy.description || '',
          policyData: JSON.stringify(policy),
          odataType,
          templateFamily,
          lastSynced: new Date(),
          isActive: true,
        },
        create: {
          policyType: 'Intune',
          policyId: policy.id,
          policyName: policy.displayName,
          policyDescription: policy.description || '',
          policyData: JSON.stringify(policy),
          odataType,
          templateFamily,
        },
      });

      if (existing) {
        updatedPolicyIds.push(result.id);
      } else {
        addedPolicyIds.push(result.id);
      }
      count++;
    }

    // Sync Settings Catalog policies
    for (const policy of data.settingsCatalogPolicies || []) {
      const existing = await prisma.m365Policy.findUnique({
        where: { policyId: policy.id },
      });

      // Settings Catalog uses templateReference for type info
      const templateId = policy.templateReference?.templateId || '';
      let odataType = '#settingsCatalog.customProfile';
      let templateFamily = 'Configuration';

      // Determine type from templateId
      if (templateId.includes('endpointSecurityAntivirus')) {
        odataType = '#settingsCatalog.endpointSecurityAntivirus';
        templateFamily = 'EndpointSecurity';
      } else if (templateId.includes('endpointSecurityDiskEncryption')) {
        odataType = '#settingsCatalog.endpointSecurityDiskEncryption';
        templateFamily = 'DiskEncryption';
      } else if (templateId.includes('endpointSecurityEndpointDetectionAndResponse')) {
        odataType = '#settingsCatalog.endpointSecurityEndpointDetectionAndResponse';
        templateFamily = 'EndpointDetection';
      } else if (templateId.includes('endpointSecurityAttackSurfaceReduction')) {
        odataType = '#settingsCatalog.endpointSecurityAttackSurfaceReduction';
        templateFamily = 'AttackSurfaceReduction';
      } else if (templateId.includes('endpointSecurityFirewall')) {
        odataType = '#settingsCatalog.endpointSecurityFirewall';
        templateFamily = 'Firewall';
      } else if (templateId.includes('baseline')) {
        odataType = '#settingsCatalog.baseline';
        templateFamily = 'SecurityBaseline';
      } else if (templateId.includes('deviceCompliance')) {
        odataType = '#settingsCatalog.deviceCompliance';
        templateFamily = 'Compliance';
      }

      const result = await prisma.m365Policy.upsert({
        where: { policyId: policy.id },
        update: {
          policyName: policy.name || policy.displayName,
          policyDescription: policy.description || '',
          policyData: JSON.stringify(policy),
          odataType,
          templateFamily,
          lastSynced: new Date(),
          isActive: true,
        },
        create: {
          policyType: 'Intune',
          policyId: policy.id,
          policyName: policy.name || policy.displayName,
          policyDescription: policy.description || '',
          policyData: JSON.stringify(policy),
          odataType,
          templateFamily,
        },
      });

      if (existing) {
        updatedPolicyIds.push(result.id);
      } else {
        addedPolicyIds.push(result.id);
      }
      count++;
    }

    // Sync Endpoint Security policies
    for (const policy of data.endpointSecurityPolicies || []) {
      const existing = await prisma.m365Policy.findUnique({
        where: { policyId: policy.id },
      });

      // Endpoint Security intents use templateId to determine type
      const templateId = (policy as any).templateId || '';
      let odataType = '#microsoft.graph.deviceManagementIntent';
      let templateFamily = 'EndpointSecurity';

      if (templateId.includes('antivirus')) {
        templateFamily = 'Antivirus';
      } else if (templateId.includes('diskEncryption')) {
        templateFamily = 'DiskEncryption';
      } else if (templateId.includes('firewall')) {
        templateFamily = 'Firewall';
      } else if (templateId.includes('attackSurfaceReduction')) {
        templateFamily = 'AttackSurfaceReduction';
      } else if (templateId.includes('endpointDetection')) {
        templateFamily = 'EndpointDetection';
      }

      const result = await prisma.m365Policy.upsert({
        where: { policyId: policy.id },
        update: {
          policyName: policy.displayName || policy.name,
          policyDescription: policy.description || `Template: ${templateId || 'Unknown'}`,
          policyData: JSON.stringify(policy),
          odataType,
          templateFamily,
          lastSynced: new Date(),
          isActive: true,
        },
        create: {
          policyType: 'Intune',
          policyId: policy.id,
          policyName: policy.displayName || policy.name,
          policyDescription: policy.description || `Template: ${templateId || 'Unknown'}`,
          policyData: JSON.stringify(policy),
          odataType,
          templateFamily,
        },
      });

      if (existing) {
        updatedPolicyIds.push(result.id);
      } else {
        addedPolicyIds.push(result.id);
      }
      count++;
    }

    // Sync App Protection policies
    for (const policy of data.appProtectionPolicies || []) {
      const existing = await prisma.m365Policy.findUnique({
        where: { policyId: policy.id },
      });

      const odataType = policy['@odata.type'] || '';
      const templateFamily = 'AppProtection';

      const result = await prisma.m365Policy.upsert({
        where: { policyId: policy.id },
        update: {
          policyName: policy.displayName || policy.name,
          policyDescription: policy.description || `Platform: ${odataType || 'Unknown'}`,
          policyData: JSON.stringify(policy),
          odataType,
          templateFamily,
          lastSynced: new Date(),
          isActive: true,
        },
        create: {
          policyType: 'Intune',
          policyId: policy.id,
          policyName: policy.displayName || policy.name,
          policyDescription: policy.description || `Platform: ${odataType || 'Unknown'}`,
          policyData: JSON.stringify(policy),
          odataType,
          templateFamily,
        },
      });

      if (existing) {
        updatedPolicyIds.push(result.id);
      } else {
        addedPolicyIds.push(result.id);
      }
      count++;
    }

    return count;
  }

  /**
   * Sync Purview policies to database
   */
  private async syncPurviewPolicies(
    data: any,
    addedPolicyIds: number[],
    updatedPolicyIds: number[]
  ): Promise<number> {
    let count = 0;

    for (const label of data.labels) {
      const existing = await prisma.m365Policy.findUnique({
        where: { policyId: label.id },
      });

      const result = await prisma.m365Policy.upsert({
        where: { policyId: label.id },
        update: {
          policyName: label.name,
          policyDescription: label.description || '',
          policyData: JSON.stringify(label),
          lastSynced: new Date(),
          isActive: label.isActive !== false,
        },
        create: {
          policyType: 'Purview',
          policyId: label.id,
          policyName: label.name,
          policyDescription: label.description || '',
          policyData: JSON.stringify(label),
        },
      });

      if (existing) {
        updatedPolicyIds.push(result.id);
      } else {
        addedPolicyIds.push(result.id);
      }
      count++;
    }

    return count;
  }

  /**
   * Sync Azure AD policies to database
   */
  private async syncAzureADPolicies(
    data: any,
    addedPolicyIds: number[],
    updatedPolicyIds: number[]
  ): Promise<number> {
    let count = 0;

    for (const policy of data.conditionalAccessPolicies || []) {
      const existing = await prisma.m365Policy.findUnique({
        where: { policyId: policy.id },
      });

      const odataType = '#microsoft.graph.conditionalAccessPolicy';
      const templateFamily = 'ConditionalAccess';

      const result = await prisma.m365Policy.upsert({
        where: { policyId: policy.id },
        update: {
          policyName: policy.displayName,
          policyDescription: `State: ${policy.state}`,
          policyData: JSON.stringify(policy),
          odataType,
          templateFamily,
          lastSynced: new Date(),
          isActive: policy.state === 'enabled',
        },
        create: {
          policyType: 'AzureAD',
          policyId: policy.id,
          policyName: policy.displayName,
          policyDescription: `State: ${policy.state}`,
          policyData: JSON.stringify(policy),
          odataType,
          templateFamily,
        },
      });

      if (existing) {
        updatedPolicyIds.push(result.id);
      } else {
        addedPolicyIds.push(result.id);
      }
      count++;
    }

    return count;
  }

  /**
   * Automatically map policies to controls based on templates
   * NOTE: Currently unused - kept for potential future use
   */
  // private async autoMapPolicies(): Promise<number> {
  //   let count = 0;

  //   for (const template of this.mappingTemplates) {
  //     // Find control by controlId (e.g., "03.01.01")
  //     const control = await prisma.control.findFirst({
  //       where: { controlId: template.controlId },
  //     });

  //     if (!control) {
  //       console.warn(`Control ${template.controlId} not found in database`);
  //       continue;
  //     }

  //     // Find matching policies based on criteria
  //     // Search both policy names AND descriptions for better matching
  //     const policies = await prisma.m365Policy.findMany({
  //       where: {
  //         policyType: {
  //           in: template.policyTypes,
  //         },
  //         isActive: true,
  //         OR: template.searchCriteria.keywords.flatMap((keyword: string) => [
  //           {
  //             policyName: {
  //               contains: keyword,
  //             },
  //           },
  //           {
  //             policyDescription: {
  //               contains: keyword,
  //             },
  //           },
  //         ]),
  //       },
  //     });

  //     // Create mappings with calculated confidence
  //     for (const policy of policies) {
  //       const existing = await prisma.controlPolicyMapping.findFirst({
  //         where: {
  //           controlId: control.id,
  //           policyId: policy.id,
  //         },
  //       });

  //       if (!existing) {
  //         // Calculate match score
  //         const { score, matchedKeywords } = this.calculateMatchScore(policy, template);
  //         const calculatedConfidence = this.scoreToConfidence(score);

  //         // Only create mapping if score meets minimum threshold (0.3 = 30%)
  //         if (score >= 0.3) {
  //           const mappingNotes = `${template.mappingReason}\nMatched keywords: ${matchedKeywords.join(', ')}\nScore: ${(score * 100).toFixed(0)}%`;

  //           await prisma.controlPolicyMapping.create({
  //             data: {
  //               controlId: control.id,
  //               policyId: policy.id,
  //               mappingConfidence: calculatedConfidence,
  //               mappingNotes,
  //             },
  //           });
  //           count++;

  //           console.log(`✓ Mapped ${policy.policyName} → ${control.controlId} (${calculatedConfidence} confidence, ${(score * 100).toFixed(0)}% score)`);
  //         } else {
  //           console.log(`✗ Skipped ${policy.policyName} → ${control.controlId} (score ${(score * 100).toFixed(0)}% below threshold)`);
  //         }
  //       }
  //     }
  //   }

  //   return count;
  // }

  /**
   * Get sync status and history
   */
  async getSyncStatus(): Promise<{
    lastSyncDate?: Date;
    syncEnabled: boolean;
    recentLogs: any[];
  }> {
    const settings = await prisma.m365Settings.findFirst({
      where: { id: 1 },
    });

    const recentLogs = await prisma.m365SyncLog.findMany({
      take: 10,
      orderBy: { syncDate: 'desc' },
    });

    return {
      lastSyncDate: settings?.lastSyncDate || undefined,
      syncEnabled: settings?.syncEnabled || false,
      recentLogs,
    };
  }

  /**
   * Get all policy mappings for a specific control
   * REMOVED: Policy mapping functionality has been disabled
   */
  // async getPolicyMappingsForControl(controlId: number): Promise<any[]> {
  //   return [];
  // }

  /**
   * Get statistics about M365 integration
   */
  async getIntegrationStats(): Promise<{
    totalPolicies: number;
    activePolicies: number;
    policyBreakdown: Record<PolicyType, number>;
    mappedControls: number;
    totalControls: number;
  }> {
    // Count controls that have M365 settings mapped
    const controlsWithSettings = await prisma.control.findMany({
      where: {
        settingMappings: {
          some: {}
        }
      },
      select: { id: true }
    });

    const [totalPolicies, activePolicies, policyBreakdown, totalControls] = await Promise.all([
      prisma.m365Policy.count(),
      prisma.m365Policy.count({ where: { isActive: true } }),
      prisma.m365Policy.groupBy({
        by: ['policyType'],
        _count: true,
      }),
      prisma.control.count(),
    ]);

    const breakdown: Record<string, number> = {
      Intune: 0,
      Purview: 0,
      AzureAD: 0,
    };

    for (const item of policyBreakdown) {
      breakdown[item.policyType] = item._count;
    }

    return {
      totalPolicies,
      activePolicies,
      policyBreakdown: breakdown as Record<PolicyType, number>,
      mappedControls: controlsWithSettings.length,
      totalControls,
    };
  }
}

export const policySyncService = new PolicySyncService();
