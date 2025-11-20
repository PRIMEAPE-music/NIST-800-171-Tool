import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RemappingSuggestion {
  settingId: number;
  settingName: string;
  currentTemplate: string | null;
  suggestedTemplate: string;
  reason: string;
}

async function applyHighConfidenceRemapping() {
  console.log('\n' + '='.repeat(80));
  console.log('APPLY HIGH CONFIDENCE REMAPPINGS ONLY');
  console.log('='.repeat(80) + '\n');

  // Get available policies
  const policies = await prisma.m365Policy.findMany({
    select: { id: true, policyName: true, odataType: true, templateFamily: true }
  });

  const availableTemplates = new Set(policies.map(p => p.odataType).filter(Boolean));

  // Get all settings
  const allSettings = await prisma.m365Setting.findMany({
    select: {
      id: true,
      displayName: true,
      settingName: true,
      settingPath: true,
      policyTemplate: true,
      templateFamily: true
    }
  });

  const unmatchedSettings = allSettings.filter(s => !availableTemplates.has(s.policyTemplate));

  const suggestions: RemappingSuggestion[] = [];

  // Only HIGH confidence remappings
  for (const setting of unmatchedSettings) {
    const name = setting.displayName.toLowerCase();

    // HIGH: Authorization Policy - guest/external settings
    if (availableTemplates.has('#microsoft.graph.authorizationPolicy')) {
      if (
        name.includes('guest') ||
        name.includes('external') ||
        name.includes('b2b') ||
        name.includes('invite') ||
        name.includes('msol') ||
        name.includes('user consent') ||
        name.includes('admin consent')
      ) {
        if (setting.policyTemplate !== '#microsoft.graph.authorizationPolicy') {
          suggestions.push({
            settingId: setting.id,
            settingName: setting.displayName,
            currentTemplate: setting.policyTemplate,
            suggestedTemplate: '#microsoft.graph.authorizationPolicy',
            reason: 'Tenant-wide authorization setting'
          });
        }
      }
    }

    // HIGH: BitLocker/Disk Encryption
    if (availableTemplates.has('#settingsCatalog.endpointSecurityDiskEncryption')) {
      if (
        name.includes('bitlocker') ||
        name.includes('disk encryption') ||
        name.includes('drive encryption') ||
        name.includes('recovery key') ||
        name.includes('tpm')
      ) {
        if (!setting.policyTemplate?.includes('DiskEncryption')) {
          suggestions.push({
            settingId: setting.id,
            settingName: setting.displayName,
            currentTemplate: setting.policyTemplate,
            suggestedTemplate: '#settingsCatalog.endpointSecurityDiskEncryption',
            reason: 'Encryption setting'
          });
        }
      }
    }

    // HIGH: ASR
    if (availableTemplates.has('#settingsCatalog.endpointSecurityAttackSurfaceReduction')) {
      if (
        name.includes('attack surface') ||
        name.includes('asr') ||
        name.includes('exploit protection') ||
        name.includes('controlled folder') ||
        name.includes('network protection')
      ) {
        if (!setting.policyTemplate?.includes('AttackSurfaceReduction')) {
          suggestions.push({
            settingId: setting.id,
            settingName: setting.displayName,
            currentTemplate: setting.policyTemplate,
            suggestedTemplate: '#settingsCatalog.endpointSecurityAttackSurfaceReduction',
            reason: 'ASR-related setting'
          });
        }
      }
    }

    // HIGH: EDR
    if (availableTemplates.has('#settingsCatalog.endpointSecurityEndpointDetectionAndResponse')) {
      if (
        name.includes('edr') ||
        name.includes('endpoint detection') ||
        name.includes('threat detection') ||
        name.includes('sample sharing') ||
        name.includes('telemetry')
      ) {
        if (!setting.policyTemplate?.includes('EndpointDetectionAndResponse')) {
          suggestions.push({
            settingId: setting.id,
            settingName: setting.displayName,
            currentTemplate: setting.policyTemplate,
            suggestedTemplate: '#settingsCatalog.endpointSecurityEndpointDetectionAndResponse',
            reason: 'EDR-related setting'
          });
        }
      }
    }
  }

  // Remove duplicates
  const uniqueSuggestions = new Map<number, RemappingSuggestion>();
  for (const suggestion of suggestions) {
    if (!uniqueSuggestions.has(suggestion.settingId)) {
      uniqueSuggestions.set(suggestion.settingId, suggestion);
    }
  }

  console.log(`Found ${uniqueSuggestions.size} HIGH confidence settings to remap\n`);

  // Apply remapping
  let successCount = 0;

  for (const suggestion of uniqueSuggestions.values()) {
    try {
      // Determine the new templateFamily
      let newFamily = 'Configuration';
      if (suggestion.suggestedTemplate.includes('authorizationPolicy')) {
        newFamily = 'AzureAD';
      } else if (suggestion.suggestedTemplate.includes('DiskEncryption')) {
        newFamily = 'DiskEncryption';
      } else if (suggestion.suggestedTemplate.includes('AttackSurfaceReduction')) {
        newFamily = 'AttackSurfaceReduction';
      } else if (suggestion.suggestedTemplate.includes('EndpointDetectionAndResponse')) {
        newFamily = 'EndpointDetection';
      }

      await prisma.m365Setting.update({
        where: { id: suggestion.settingId },
        data: {
          policyTemplate: suggestion.suggestedTemplate,
          templateFamily: newFamily
        }
      });

      console.log(`✅ ${suggestion.settingName.substring(0, 50)}`);
      console.log(`   → ${suggestion.suggestedTemplate}`);
      successCount++;
    } catch (error) {
      console.log(`❌ Failed: ${suggestion.settingName}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`✅ Remapped ${successCount} settings (HIGH confidence only)`);
  console.log('='.repeat(80) + '\n');

  await prisma.$disconnect();
}

applyHighConfidenceRemapping().catch(console.error);
