/**
 * Phase 1 - Step 3: Populate Policy Template Data (Enhanced)
 *
 * This script extracts type information from ALL M365Policy formats:
 * - Classic policies with @odata.type
 * - Settings Catalog with templateReference.templateFamily
 * - App Protection policies
 * - Conditional Access policies
 *
 * Run with: npx tsx server/src/scripts/populate-policy-templates.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapping from Settings Catalog templateFamily to our normalized families
const SETTINGS_CATALOG_FAMILY_MAP: Record<string, string> = {
  // Security baselines
  'baseline': 'SecurityBaseline',

  // Endpoint Security
  'endpointSecurityDiskEncryption': 'DiskEncryption',
  'endpointSecurityEndpointDetectionAndResponse': 'EndpointDetection',
  'endpointSecurityAttackSurfaceReduction': 'AttackSurfaceReduction',
  'endpointSecurityFirewall': 'Firewall',
  'endpointSecurityAntivirus': 'Antivirus',
  'endpointSecurityAccountProtection': 'AccountProtection',

  // Device configuration
  'none': 'Configuration', // Custom settings catalog profiles

  // App configuration
  'appConfiguration': 'AppConfiguration',
};

// Mapping from @odata.type to family
const ODATA_TYPE_FAMILY_MAP: Record<string, string> = {
  // Windows Update
  '#microsoft.graph.windowsUpdateForBusinessConfiguration': 'Update',

  // Compliance
  '#microsoft.graph.windows10CompliancePolicy': 'Compliance',
  '#microsoft.graph.androidCompliancePolicy': 'Compliance',
  '#microsoft.graph.iosCompliancePolicy': 'Compliance',
  '#microsoft.graph.macOSCompliancePolicy': 'Compliance',

  // App Protection
  '#microsoft.graph.iosManagedAppProtection': 'AppProtection',
  '#microsoft.graph.androidManagedAppProtection': 'AppProtection',
  '#microsoft.graph.windowsManagedAppProtection': 'AppProtection',
  '#microsoft.graph.mdmWindowsInformationProtectionPolicy': 'AppProtection',

  // Device Configuration
  '#microsoft.graph.windows10CustomConfiguration': 'Configuration',
  '#microsoft.graph.windows10EndpointProtectionConfiguration': 'Configuration',
  '#microsoft.graph.windows10GeneralConfiguration': 'Configuration',
  '#microsoft.graph.iosGeneralDeviceConfiguration': 'Configuration',
  '#microsoft.graph.androidGeneralDeviceConfiguration': 'Configuration',

  // Conditional Access
  '#microsoft.graph.conditionalAccessPolicy': 'ConditionalAccess',

  // Purview
  '#microsoft.graph.dataLossPreventionPolicy': 'Purview',
  '#microsoft.graph.sensitivityLabel': 'Purview',
  '#microsoft.graph.retentionPolicy': 'Purview',
};

interface ExtractionResult {
  odataType: string | null;
  templateFamily: string;
  source: string; // Where we got the type from
}

/**
 * Extract type information from any policy format
 */
function extractPolicyType(policyData: any, policyName: string, policyType: string): ExtractionResult {
  // Strategy 1: Classic @odata.type
  if (policyData['@odata.type']) {
    const odataType = policyData['@odata.type'];
    const family = ODATA_TYPE_FAMILY_MAP[odataType] || 'Unknown';
    return { odataType, templateFamily: family, source: '@odata.type' };
  }

  // Strategy 2: Settings Catalog with templateReference
  if (policyData.templateReference) {
    const templateFamily = policyData.templateReference.templateFamily;
    const templateDisplayName = policyData.templateReference.templateDisplayName || '';

    if (templateFamily && templateFamily !== 'none') {
      const family = SETTINGS_CATALOG_FAMILY_MAP[templateFamily] || templateFamily;
      // Use the templateFamily as a pseudo odataType for tracking
      const odataType = `#settingsCatalog.${templateFamily}`;
      return { odataType, templateFamily: family, source: 'templateReference.templateFamily' };
    }

    // Settings Catalog with no template (custom profile)
    if (policyData.technologies || policyData.platforms) {
      // Try to infer from name
      const family = inferFamilyFromName(policyName, policyData);
      return {
        odataType: '#settingsCatalog.customProfile',
        templateFamily: family,
        source: 'settingsCatalog (inferred)'
      };
    }
  }

  // Strategy 3: Conditional Access (AzureAD)
  if (policyType === 'AzureAD' || policyData.conditions || policyData.grantControls) {
    return {
      odataType: '#microsoft.graph.conditionalAccessPolicy',
      templateFamily: 'ConditionalAccess',
      source: 'structure (CA)'
    };
  }

  // Strategy 4: App Protection (detect by characteristic fields)
  if (policyData.periodOfflineBeforeAccessCheck ||
      policyData.allowedInboundDataTransferSources ||
      policyData.allowedOutboundDataTransferDestinations) {
    // Determine iOS vs Android from name
    const isIOS = policyName.toLowerCase().includes('ios');
    const isAndroid = policyName.toLowerCase().includes('android');

    let odataType = '#microsoft.graph.managedAppProtection';
    if (isIOS) odataType = '#microsoft.graph.iosManagedAppProtection';
    if (isAndroid) odataType = '#microsoft.graph.androidManagedAppProtection';

    return { odataType, templateFamily: 'AppProtection', source: 'structure (MAM)' };
  }

  // Strategy 5: Infer from name as last resort
  const family = inferFamilyFromName(policyName, policyData);
  return {
    odataType: null,
    templateFamily: family,
    source: 'name inference'
  };
}

/**
 * Try to infer family from policy name
 */
function inferFamilyFromName(name: string, data: any): string {
  const lowerName = name.toLowerCase();

  if (lowerName.includes('compliance')) return 'Compliance';
  if (lowerName.includes('update') || lowerName.includes('ring')) return 'Update';
  if (lowerName.includes('baseline') || lowerName.includes('security baseline')) return 'SecurityBaseline';
  if (lowerName.includes('bitlocker') || lowerName.includes('encryption')) return 'DiskEncryption';
  if (lowerName.includes('edr') || lowerName.includes('endpoint detection')) return 'EndpointDetection';
  if (lowerName.includes('asr') || lowerName.includes('attack surface')) return 'AttackSurfaceReduction';
  if (lowerName.includes('defender') || lowerName.includes('antivirus')) return 'Antivirus';
  if (lowerName.includes('firewall')) return 'Firewall';
  if (lowerName.includes('conditional access')) return 'ConditionalAccess';
  if (lowerName.includes('app protection') || lowerName.includes('mam')) return 'AppProtection';
  if (lowerName.includes('purview') || lowerName.includes('dlp')) return 'Purview';

  // Check technologies field
  if (data.technologies) {
    if (data.technologies.includes('microsoftSense')) return 'EndpointDetection';
  }

  return 'Configuration'; // Default fallback
}

async function populatePolicyTemplates() {
  console.log('Starting policy template population (Enhanced)...\n');
  console.log('This version handles ALL policy formats:\n');
  console.log('  - Classic policies with @odata.type');
  console.log('  - Settings Catalog with templateReference');
  console.log('  - App Protection policies');
  console.log('  - Conditional Access policies\n');

  try {
    // Get all policies
    const policies = await prisma.m365Policy.findMany();
    console.log(`Found ${policies.length} policies to process\n`);

    let updated = 0;
    let errors = 0;

    const templateStats: Record<string, number> = {};
    const familyStats: Record<string, number> = {};
    const sourceStats: Record<string, number> = {};

    for (const policy of policies) {
      try {
        const policyData = JSON.parse(policy.policyData);

        // Extract type using multi-strategy approach
        const result = extractPolicyType(policyData, policy.policyName, policy.policyType);

        // Update policy with extracted data
        await prisma.m365Policy.update({
          where: { id: policy.id },
          data: {
            odataType: result.odataType,
            templateFamily: result.templateFamily
          }
        });

        // Track stats
        if (result.odataType) {
          templateStats[result.odataType] = (templateStats[result.odataType] || 0) + 1;
        }
        familyStats[result.templateFamily] = (familyStats[result.templateFamily] || 0) + 1;
        sourceStats[result.source] = (sourceStats[result.source] || 0) + 1;

        console.log(`[OK] Updated: ${policy.policyName}`);
        console.log(`     Type: ${result.odataType || '(none)'}`);
        console.log(`     Family: ${result.templateFamily}`);
        console.log(`     Source: ${result.source}\n`);

        updated++;

      } catch (error) {
        console.error(`[ERROR] Error processing policy ${policy.policyName}:`, error);
        errors++;
      }
    }

    // Summary Report
    console.log('\n' + '='.repeat(60));
    console.log('POPULATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Successfully updated: ${updated}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total processed: ${policies.length}\n`);

    // Extraction Source Distribution
    console.log('EXTRACTION SOURCE:');
    console.log('-'.repeat(60));
    for (const [source, count] of Object.entries(sourceStats).sort((a, b) => b[1] - a[1])) {
      console.log(`${count.toString().padStart(3)} x ${source}`);
    }

    // Template Distribution
    console.log('\nTEMPLATE DISTRIBUTION:');
    console.log('-'.repeat(60));
    for (const [template, count] of Object.entries(templateStats).sort((a, b) => b[1] - a[1])) {
      console.log(`${count.toString().padStart(3)} x ${template}`);
    }

    console.log('\nFAMILY DISTRIBUTION:');
    console.log('-'.repeat(60));
    for (const [family, count] of Object.entries(familyStats).sort((a, b) => b[1] - a[1])) {
      console.log(`${count.toString().padStart(3)} x ${family}`);
    }

    console.log('\nPolicy template population complete!\n');

  } catch (error) {
    console.error('Fatal error during population:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
populatePolicyTemplates()
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
