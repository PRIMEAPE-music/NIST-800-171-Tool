/**
 * Template Helper Service
 *
 * Utilities for working with policy templates and families
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TemplateFamilyInfo {
  family: string;
  templates: string[];
  description: string;
  settingCount?: number;
  policyCount?: number;
}

export const TEMPLATE_FAMILIES: Record<string, TemplateFamilyInfo> = {
  Update: {
    family: 'Update',
    templates: [
      '#microsoft.graph.windowsUpdateForBusinessConfiguration'
    ],
    description: 'Windows Update and servicing policies'
  },
  Compliance: {
    family: 'Compliance',
    templates: [
      '#microsoft.graph.windows10CompliancePolicy',
      '#microsoft.graph.androidCompliancePolicy',
      '#microsoft.graph.iosCompliancePolicy',
      '#microsoft.graph.macOSCompliancePolicy'
    ],
    description: 'Device compliance policies for various platforms'
  },
  AppProtection: {
    family: 'AppProtection',
    templates: [
      '#microsoft.graph.iosManagedAppProtection',
      '#microsoft.graph.androidManagedAppProtection',
      '#microsoft.graph.windowsManagedAppProtection',
      '#microsoft.graph.mdmWindowsInformationProtectionPolicy'
    ],
    description: 'Mobile Application Management (MAM) and data protection'
  },
  Configuration: {
    family: 'Configuration',
    templates: [
      '#microsoft.graph.windows10CustomConfiguration',
      '#microsoft.graph.windows10EndpointProtectionConfiguration',
      '#microsoft.graph.windows10GeneralConfiguration',
      '#microsoft.graph.iosGeneralDeviceConfiguration',
      '#microsoft.graph.androidGeneralDeviceConfiguration'
    ],
    description: 'Device configuration profiles'
  },
  ConditionalAccess: {
    family: 'ConditionalAccess',
    templates: [
      '#microsoft.graph.conditionalAccessPolicy'
    ],
    description: 'Azure AD Conditional Access policies'
  },
  Purview: {
    family: 'Purview',
    templates: [
      '#microsoft.graph.dataLossPreventionPolicy',
      '#microsoft.graph.sensitivityLabel',
      '#microsoft.graph.retentionPolicy'
    ],
    description: 'Microsoft Purview compliance policies'
  }
};

/**
 * Get template family for a given @odata.type
 */
export function getTemplateFamilyForType(odataType: string): string {
  for (const [family, info] of Object.entries(TEMPLATE_FAMILIES)) {
    if (info.templates.includes(odataType)) {
      return family;
    }
  }
  return 'Unknown';
}

/**
 * Get all templates for a family
 */
export function getTemplatesForFamily(family: string): string[] {
  return TEMPLATE_FAMILIES[family]?.templates || [];
}

/**
 * Get statistics about template distribution
 */
export async function getTemplateStatistics() {
  const stats = await prisma.$queryRaw<Array<{
    templateFamily: string;
    policy_count: number;
    setting_count: number;
  }>>`
    SELECT
      COALESCE(p.template_family, 'Unknown') as templateFamily,
      COUNT(DISTINCT p.id) as policy_count,
      COUNT(DISTINCT s.id) as setting_count
    FROM m365_policies p
    LEFT JOIN m365_setting_catalog s ON s.template_family = p.template_family
    GROUP BY p.template_family
    ORDER BY policy_count DESC
  `;

  return stats;
}

/**
 * Get policies by template family
 */
export async function getPoliciesByFamily(family: string) {
  return prisma.m365Policy.findMany({
    where: { templateFamily: family },
    select: {
      id: true,
      policyName: true,
      odataType: true,
      policyType: true,
      lastSynced: true
    }
  });
}

/**
 * Check if a policy template is supported
 */
export function isTemplateSupported(odataType: string): boolean {
  return Object.values(TEMPLATE_FAMILIES)
    .some(info => info.templates.includes(odataType));
}

/**
 * Get all available template families with descriptions
 */
export function getAllTemplateFamilies(): TemplateFamilyInfo[] {
  return Object.values(TEMPLATE_FAMILIES);
}

/**
 * Get policies grouped by template family
 */
export async function getPoliciesGroupedByFamily() {
  const policies = await prisma.m365Policy.findMany({
    where: {
      templateFamily: { not: null }
    },
    select: {
      id: true,
      policyName: true,
      odataType: true,
      templateFamily: true,
      policyType: true
    },
    orderBy: {
      templateFamily: 'asc'
    }
  });

  // Group by family
  const grouped: Record<string, typeof policies> = {};
  for (const policy of policies) {
    const family = policy.templateFamily || 'Unknown';
    if (!grouped[family]) {
      grouped[family] = [];
    }
    grouped[family].push(policy);
  }

  return grouped;
}

export default {
  TEMPLATE_FAMILIES,
  getTemplateFamilyForType,
  getTemplatesForFamily,
  getTemplateStatistics,
  getPoliciesByFamily,
  isTemplateSupported,
  getAllTemplateFamilies,
  getPoliciesGroupedByFamily
};
