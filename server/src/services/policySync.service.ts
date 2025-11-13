import { PrismaClient } from '@prisma/client';
import { intuneService } from './intune.service';
import { purviewService } from './purview.service';
import { azureADService } from './azureAD.service';
import settingsMapperService from './settingsMapper.service';
import { PolicyType, SyncResult } from '../types/m365.types';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

class PolicySyncService {
  private mappingTemplates: any[] = [];

  constructor() {
    this.loadMappingTemplates();
  }

  /**
   * Load predefined control-to-policy mapping templates
   */
  private loadMappingTemplates(): void {
    try {
      const mappingFile = path.join(__dirname, '../../../data/control-m365-mappings.json');
      const data = fs.readFileSync(mappingFile, 'utf-8');
      const parsed = JSON.parse(data);
      this.mappingTemplates = parsed.mappings || [];
      console.log(`✅ Loaded ${this.mappingTemplates.length} mapping templates`);
    } catch (error) {
      console.error('Error loading mapping templates:', error);
      this.mappingTemplates = [];
    }
  }

  /**
   * Calculate match confidence score for a policy-control pair
   */
  private calculateMatchScore(
    policy: { policyName: string; policyDescription: string | null },
    template: any
  ): { score: number; matchedKeywords: string[] } {
    const searchText = `${policy.policyName} ${policy.policyDescription || ''}`.toLowerCase();
    const matchedKeywords: string[] = [];
    let score = 0;

    // Check each keyword
    for (const keyword of template.searchCriteria.keywords) {
      const keywordLower = keyword.toLowerCase();

      // Check policy name (higher weight)
      if (policy.policyName.toLowerCase().includes(keywordLower)) {
        matchedKeywords.push(keyword);
        score += 2; // Name matches are worth more
      }
      // Check policy description (lower weight)
      else if (policy.policyDescription?.toLowerCase().includes(keywordLower)) {
        matchedKeywords.push(keyword);
        score += 1;
      }
    }

    // Calculate percentage of keywords matched
    const matchPercentage = matchedKeywords.length / template.searchCriteria.keywords.length;

    // Apply template confidence weight
    const templateWeight: Record<string, number> = {
      'High': 1.0,
      'Medium': 0.75,
      'Low': 0.5,
    };
    const weight = templateWeight[template.mappingConfidence] || 0.75;

    const finalScore = (matchPercentage * score * weight) / template.searchCriteria.keywords.length;

    return {
      score: Math.min(1.0, finalScore), // Cap at 1.0
      matchedKeywords,
    };
  }

  /**
   * Convert numeric score to confidence level
   */
  private scoreToConfidence(score: number): 'High' | 'Medium' | 'Low' {
    if (score >= 0.7) return 'High';
    if (score >= 0.4) return 'Medium';
    return 'Low';
  }

  /**
   * Sync all M365 policies to database
   */
  async syncAllPolicies(forceRefresh: boolean = false): Promise<SyncResult> {
    const startTime = Date.now();
    let policiesUpdated = 0;
    let controlsUpdated = 0;
    const errors: string[] = [];

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
        const intuneCount = await this.syncIntunePolicies(intuneData);
        policiesUpdated += intuneCount;
      }

      // Sync Purview policies
      if (purviewData) {
        const purviewCount = await this.syncPurviewPolicies(purviewData);
        policiesUpdated += purviewCount;
      }

      // Sync Azure AD policies
      if (azureADData) {
        const azureADCount = await this.syncAzureADPolicies(azureADData);
        policiesUpdated += azureADCount;
      }

      // Auto-map policies to controls using settings-based mapper
      console.log('🎯 Running settings-based auto-mapper...');
      const mappingStats = await settingsMapperService.mapAllPolicies();
      controlsUpdated = mappingStats.totalMappingsCreated;

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
      await prisma.m365SyncLog.create({
        data: {
          syncType: forceRefresh ? 'Manual' : 'Automatic',
          policiesUpdated,
          controlsUpdated,
          status: errors.length > 0 ? 'Partial' : 'Success',
          errorMessage: errors.length > 0 ? errors.join('; ') : null,
          syncDuration: duration,
        },
      });

      console.log(`✅ Sync complete: ${policiesUpdated} policies, ${controlsUpdated} controls updated`);

      return {
        success: errors.length === 0,
        policiesUpdated,
        controlsUpdated,
        duration,
        errors: errors.length > 0 ? errors : undefined,
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
  private async syncIntunePolicies(data: any): Promise<number> {
    let count = 0;

    // Sync compliance policies
    for (const policy of data.compliancePolicies || []) {
      await prisma.m365Policy.upsert({
        where: { policyId: policy.id },
        update: {
          policyName: policy.displayName,
          policyDescription: policy.description || '',
          policyData: JSON.stringify(policy),
          lastSynced: new Date(),
          isActive: true,
        },
        create: {
          policyType: 'Intune',
          policyId: policy.id,
          policyName: policy.displayName,
          policyDescription: policy.description || '',
          policyData: JSON.stringify(policy),
        },
      });
      count++;
    }

    // Sync legacy configuration policies
    for (const policy of data.configurationPolicies || []) {
      await prisma.m365Policy.upsert({
        where: { policyId: policy.id },
        update: {
          policyName: policy.displayName,
          policyDescription: policy.description || '',
          policyData: JSON.stringify(policy),
          lastSynced: new Date(),
          isActive: true,
        },
        create: {
          policyType: 'Intune',
          policyId: policy.id,
          policyName: policy.displayName,
          policyDescription: policy.description || '',
          policyData: JSON.stringify(policy),
        },
      });
      count++;
    }

    // Sync Settings Catalog policies
    for (const policy of data.settingsCatalogPolicies || []) {
      await prisma.m365Policy.upsert({
        where: { policyId: policy.id },
        update: {
          policyName: policy.name || policy.displayName,
          policyDescription: policy.description || '',
          policyData: JSON.stringify(policy),
          lastSynced: new Date(),
          isActive: true,
        },
        create: {
          policyType: 'Intune',
          policyId: policy.id,
          policyName: policy.name || policy.displayName,
          policyDescription: policy.description || '',
          policyData: JSON.stringify(policy),
        },
      });
      count++;
    }

    // Sync Endpoint Security policies
    for (const policy of data.endpointSecurityPolicies || []) {
      await prisma.m365Policy.upsert({
        where: { policyId: policy.id },
        update: {
          policyName: policy.displayName || policy.name,
          policyDescription: policy.description || `Template: ${(policy as any).templateId || 'Unknown'}`,
          policyData: JSON.stringify(policy),
          lastSynced: new Date(),
          isActive: true,
        },
        create: {
          policyType: 'Intune',
          policyId: policy.id,
          policyName: policy.displayName || policy.name,
          policyDescription: policy.description || `Template: ${(policy as any).templateId || 'Unknown'}`,
          policyData: JSON.stringify(policy),
        },
      });
      count++;
    }

    // Sync App Protection policies
    for (const policy of data.appProtectionPolicies || []) {
      await prisma.m365Policy.upsert({
        where: { policyId: policy.id },
        update: {
          policyName: policy.displayName || policy.name,
          policyDescription: policy.description || `Platform: ${policy['@odata.type'] || 'Unknown'}`,
          policyData: JSON.stringify(policy),
          lastSynced: new Date(),
          isActive: true,
        },
        create: {
          policyType: 'Intune',
          policyId: policy.id,
          policyName: policy.displayName || policy.name,
          policyDescription: policy.description || `Platform: ${policy['@odata.type'] || 'Unknown'}`,
          policyData: JSON.stringify(policy),
        },
      });
      count++;
    }

    return count;
  }

  /**
   * Sync Purview policies to database
   */
  private async syncPurviewPolicies(data: any): Promise<number> {
    let count = 0;

    for (const label of data.labels) {
      await prisma.m365Policy.upsert({
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
      count++;
    }

    return count;
  }

  /**
   * Sync Azure AD policies to database
   */
  private async syncAzureADPolicies(data: any): Promise<number> {
    let count = 0;

    for (const policy of data.conditionalAccessPolicies) {
      await prisma.m365Policy.upsert({
        where: { policyId: policy.id },
        update: {
          policyName: policy.displayName,
          policyDescription: `State: ${policy.state}`,
          policyData: JSON.stringify(policy),
          lastSynced: new Date(),
          isActive: policy.state === 'enabled',
        },
        create: {
          policyType: 'AzureAD',
          policyId: policy.id,
          policyName: policy.displayName,
          policyDescription: `State: ${policy.state}`,
          policyData: JSON.stringify(policy),
        },
      });
      count++;
    }

    return count;
  }

  /**
   * Automatically map policies to controls based on templates
   */
  private async autoMapPolicies(): Promise<number> {
    let count = 0;

    for (const template of this.mappingTemplates) {
      // Find control by controlId (e.g., "03.01.01")
      const control = await prisma.control.findFirst({
        where: { controlId: template.controlId },
      });

      if (!control) {
        console.warn(`Control ${template.controlId} not found in database`);
        continue;
      }

      // Find matching policies based on criteria
      // Search both policy names AND descriptions for better matching
      const policies = await prisma.m365Policy.findMany({
        where: {
          policyType: {
            in: template.policyTypes,
          },
          isActive: true,
          OR: template.searchCriteria.keywords.flatMap((keyword: string) => [
            {
              policyName: {
                contains: keyword,
              },
            },
            {
              policyDescription: {
                contains: keyword,
              },
            },
          ]),
        },
      });

      // Create mappings with calculated confidence
      for (const policy of policies) {
        const existing = await prisma.controlPolicyMapping.findFirst({
          where: {
            controlId: control.id,
            policyId: policy.id,
          },
        });

        if (!existing) {
          // Calculate match score
          const { score, matchedKeywords } = this.calculateMatchScore(policy, template);
          const calculatedConfidence = this.scoreToConfidence(score);

          // Only create mapping if score meets minimum threshold (0.3 = 30%)
          if (score >= 0.3) {
            const mappingNotes = `${template.mappingReason}\nMatched keywords: ${matchedKeywords.join(', ')}\nScore: ${(score * 100).toFixed(0)}%`;

            await prisma.controlPolicyMapping.create({
              data: {
                controlId: control.id,
                policyId: policy.id,
                mappingConfidence: calculatedConfidence,
                mappingNotes,
              },
            });
            count++;

            console.log(`✓ Mapped ${policy.policyName} → ${control.controlId} (${calculatedConfidence} confidence, ${(score * 100).toFixed(0)}% score)`);
          } else {
            console.log(`✗ Skipped ${policy.policyName} → ${control.controlId} (score ${(score * 100).toFixed(0)}% below threshold)`);
          }
        }
      }
    }

    return count;
  }

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
   */
  async getPolicyMappingsForControl(controlId: number): Promise<any[]> {
    return prisma.controlPolicyMapping.findMany({
      where: { controlId },
      include: {
        policy: true,
      },
    });
  }

  /**
   * Get statistics about M365 integration
   */
  async getIntegrationStats(): Promise<{
    totalPolicies: number;
    activePolicies: number;
    mappedControls: number;
    policyBreakdown: Record<PolicyType, number>;
  }> {
    const [totalPolicies, activePolicies, policyBreakdown, mappedControls] = await Promise.all([
      prisma.m365Policy.count(),
      prisma.m365Policy.count({ where: { isActive: true } }),
      prisma.m365Policy.groupBy({
        by: ['policyType'],
        _count: true,
      }),
      prisma.controlPolicyMapping.findMany({
        distinct: ['controlId'],
      }),
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
      mappedControls: mappedControls.length,
      policyBreakdown: breakdown as Record<PolicyType, number>,
    };
  }
}

export const policySyncService = new PolicySyncService();
