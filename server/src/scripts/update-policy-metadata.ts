/**
 * Update Policy Metadata Script
 *
 * Updates existing policies with odataType and templateFamily
 * based on their policyData, without needing to re-sync from M365
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Derive templateFamily from odataType
 */
function getTemplateFamilyFromOdataType(odataType: string): string {
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

async function updatePolicyMetadata() {
  console.log('\n' + '='.repeat(70));
  console.log('UPDATING POLICY METADATA');
  console.log('='.repeat(70) + '\n');

  try {
    // Get all policies
    const policies = await prisma.m365Policy.findMany();

    console.log(`Found ${policies.length} policies to update\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const policy of policies) {
      // Parse policyData
      let policyData: any;
      try {
        policyData = typeof policy.policyData === 'string'
          ? JSON.parse(policy.policyData)
          : policy.policyData;
      } catch {
        console.log(`  Skipped ${policy.policyName} - invalid policyData`);
        skippedCount++;
        continue;
      }

      // Determine odataType - use existing if policyData doesn't have it
      let odataType = policyData['@odata.type'] || policy.odataType || '';
      let templateFamily = '';

      // Handle Settings Catalog policies (they use templateReference)
      if (policyData.templateReference) {
        const tmplFamily = policyData.templateReference.templateFamily || '';

        // Map templateFamily to our standard names and odataTypes
        if (tmplFamily === 'endpointSecurityEndpointDetectionAndResponse') {
          odataType = '#settingsCatalog.endpointSecurityEndpointDetectionAndResponse';
          templateFamily = 'EndpointDetection';
        } else if (tmplFamily === 'endpointSecurityDiskEncryption') {
          odataType = '#settingsCatalog.endpointSecurityDiskEncryption';
          templateFamily = 'DiskEncryption';
        } else if (tmplFamily === 'endpointSecurityAttackSurfaceReduction') {
          odataType = '#settingsCatalog.endpointSecurityAttackSurfaceReduction';
          templateFamily = 'AttackSurfaceReduction';
        } else if (tmplFamily === 'endpointSecurityAntivirus') {
          odataType = '#settingsCatalog.endpointSecurityAntivirus';
          templateFamily = 'EndpointSecurity';
        } else if (tmplFamily === 'endpointSecurityFirewall') {
          odataType = '#settingsCatalog.endpointSecurityFirewall';
          templateFamily = 'Firewall';
        } else if (tmplFamily === 'baseline') {
          odataType = '#settingsCatalog.baseline';
          templateFamily = 'SecurityBaseline';
        } else if (tmplFamily === 'deviceCompliance') {
          odataType = '#settingsCatalog.deviceCompliance';
          templateFamily = 'Compliance';
        } else {
          // Custom profiles or unknown
          odataType = '#settingsCatalog.customProfile';
          templateFamily = 'Configuration';
        }
      }

      // Handle Conditional Access policies
      if (!odataType && policyData.conditions && policyData.grantControls) {
        odataType = '#microsoft.graph.conditionalAccessPolicy';
        templateFamily = 'ConditionalAccess';
      }

      // Derive templateFamily if not already set
      if (!templateFamily) {
        templateFamily = getTemplateFamilyFromOdataType(odataType);
      }

      // Check if update needed
      if (policy.odataType === odataType && policy.templateFamily === templateFamily) {
        skippedCount++;
        continue;
      }

      // Update policy
      await prisma.m365Policy.update({
        where: { id: policy.id },
        data: {
          odataType: odataType || policy.odataType,
          templateFamily: templateFamily || policy.templateFamily
        }
      });

      console.log(`  Updated: ${policy.policyName}`);
      console.log(`    odataType: ${odataType}`);
      console.log(`    templateFamily: ${templateFamily}`);
      updatedCount++;
    }

    console.log('\n' + '='.repeat(70));
    console.log('UPDATE COMPLETE');
    console.log('='.repeat(70));
    console.log(`  Updated: ${updatedCount}`);
    console.log(`  Skipped: ${skippedCount}`);
    console.log('');

    // Show summary
    const policyTypes = await prisma.m365Policy.groupBy({
      by: ['odataType', 'templateFamily'],
      _count: true
    });

    console.log('Policy distribution:');
    for (const pt of policyTypes) {
      console.log(`  ${pt.templateFamily} (${pt.odataType}): ${pt._count}`);
    }

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updatePolicyMetadata();
