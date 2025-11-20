import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface RemappingSuggestion {
  settingId: number;
  settingName: string;
  currentTemplate: string | null;
  suggestedTemplate: string;
  reason: string;
  confidence: 'High' | 'Medium' | 'Low';
}

async function applyRemapping() {
  console.log('\n' + '='.repeat(80));
  console.log('APPLY SETTINGS REMAPPING');
  console.log('='.repeat(80) + '\n');

  // Get available policies
  const policies = await prisma.m365Policy.findMany({
    select: { id: true, policyName: true, odataType: true, templateFamily: true }
  });

  const availableTemplates = new Set(policies.map(p => p.odataType).filter(Boolean));

  // Get all settings for backup
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

  // Create backup
  console.log('📦 Creating backup of current mappings...\n');

  const backup = {
    timestamp: new Date().toISOString(),
    totalSettings: allSettings.length,
    mappings: allSettings.map(s => ({
      id: s.id,
      displayName: s.displayName,
      policyTemplate: s.policyTemplate,
      templateFamily: s.templateFamily
    }))
  };

  const backupPath = `settings-backup-${Date.now()}.json`;
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`✅ Backup saved to: ${backupPath}\n`);

  // Get unmatched settings
  const unmatchedSettings = allSettings.filter(s => !availableTemplates.has(s.policyTemplate));

  const suggestions: RemappingSuggestion[] = [];

  // Analyze each unmatched setting for remapping potential
  for (const setting of unmatchedSettings) {
    const name = setting.displayName.toLowerCase();

    // Check for Windows Compliance matches
    if (availableTemplates.has('#microsoft.graph.windows10CompliancePolicy')) {
      if (
        name.includes('bitlocker') ||
        name.includes('encryption') ||
        name.includes('firewall') ||
        name.includes('antivirus') ||
        name.includes('defender') ||
        name.includes('secure boot') ||
        name.includes('code integrity') ||
        name.includes('password') ||
        name.includes('pin') ||
        (setting.settingPath && setting.settingPath.toLowerCase().includes('windows'))
      ) {
        if (!setting.policyTemplate?.includes('CompliancePolicy')) {
          suggestions.push({
            settingId: setting.id,
            settingName: setting.displayName,
            currentTemplate: setting.policyTemplate,
            suggestedTemplate: '#microsoft.graph.windows10CompliancePolicy',
            reason: 'Windows security setting that could be in compliance policy',
            confidence: 'Medium'
          });
        }
      }
    }

    // Check for Conditional Access matches
    if (availableTemplates.has('#microsoft.graph.conditionalAccessPolicy')) {
      if (
        name.includes('conditional access') ||
        name.includes('mfa') ||
        name.includes('multi-factor') ||
        name.includes('sign-in') ||
        name.includes('authentication') ||
        name.includes('session') ||
        name.includes('access control')
      ) {
        if (setting.policyTemplate !== '#microsoft.graph.conditionalAccessPolicy') {
          suggestions.push({
            settingId: setting.id,
            settingName: setting.displayName,
            currentTemplate: setting.policyTemplate,
            suggestedTemplate: '#microsoft.graph.conditionalAccessPolicy',
            reason: 'Access control setting that could be in Conditional Access',
            confidence: 'Medium'
          });
        }
      }
    }

    // Check for Security Baseline matches
    if (availableTemplates.has('#settingsCatalog.baseline')) {
      if (
        name.includes('baseline') ||
        name.includes('security setting') ||
        name.includes('windows security') ||
        name.includes('defender') ||
        name.includes('smartscreen') ||
        name.includes('uac') ||
        name.includes('credential guard')
      ) {
        if (!setting.policyTemplate?.includes('baseline')) {
          suggestions.push({
            settingId: setting.id,
            settingName: setting.displayName,
            currentTemplate: setting.policyTemplate,
            suggestedTemplate: '#settingsCatalog.baseline',
            reason: 'Security setting that could be in Security Baseline',
            confidence: 'Medium'
          });
        }
      }
    }

    // Check for BitLocker/Disk Encryption matches
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
            reason: 'Encryption setting that could be in BitLocker policy',
            confidence: 'High'
          });
        }
      }
    }

    // Check for ASR matches
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
            reason: 'ASR-related setting',
            confidence: 'High'
          });
        }
      }
    }

    // Check for EDR matches
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
            reason: 'EDR-related setting',
            confidence: 'High'
          });
        }
      }
    }

    // Check for Authorization Policy - these are tenant-wide settings
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
            reason: 'Tenant-wide authorization setting',
            confidence: 'High'
          });
        }
      }
    }
  }

  // Remove duplicates (keep highest confidence)
  const uniqueSuggestions = new Map<number, RemappingSuggestion>();
  for (const suggestion of suggestions) {
    const existing = uniqueSuggestions.get(suggestion.settingId);
    if (!existing ||
        (suggestion.confidence === 'High' && existing.confidence !== 'High') ||
        (suggestion.confidence === 'Medium' && existing.confidence === 'Low')) {
      uniqueSuggestions.set(suggestion.settingId, suggestion);
    }
  }

  console.log(`Found ${uniqueSuggestions.size} settings to remap\n`);

  // Apply remapping
  console.log('🔄 Applying remappings...\n');

  let successCount = 0;
  let errorCount = 0;

  // Group by target template for logging
  const byTemplate = new Map<string, RemappingSuggestion[]>();
  for (const suggestion of uniqueSuggestions.values()) {
    const list = byTemplate.get(suggestion.suggestedTemplate) || [];
    list.push(suggestion);
    byTemplate.set(suggestion.suggestedTemplate, list);
  }

  for (const [template, templateSuggestions] of byTemplate) {
    console.log(`\n${template} (${templateSuggestions.length} settings)`);
    console.log('-'.repeat(60));

    for (const suggestion of templateSuggestions) {
      try {
        // Determine the new templateFamily based on the template
        let newFamily = 'Configuration';
        if (template.includes('CompliancePolicy')) {
          newFamily = 'Compliance';
        } else if (template.includes('conditionalAccessPolicy')) {
          newFamily = 'ConditionalAccess';
        } else if (template.includes('authorizationPolicy')) {
          newFamily = 'AzureAD';
        } else if (template.includes('baseline')) {
          newFamily = 'SecurityBaseline';
        } else if (template.includes('DiskEncryption')) {
          newFamily = 'DiskEncryption';
        } else if (template.includes('AttackSurfaceReduction')) {
          newFamily = 'AttackSurfaceReduction';
        } else if (template.includes('EndpointDetectionAndResponse')) {
          newFamily = 'EndpointDetection';
        }

        await prisma.m365Setting.update({
          where: { id: suggestion.settingId },
          data: {
            policyTemplate: suggestion.suggestedTemplate,
            templateFamily: newFamily
          }
        });

        const conf = suggestion.confidence === 'High' ? '[HIGH]' : '[MED]';
        console.log(`  ✅ ${conf} ${suggestion.settingName.substring(0, 50)}`);
        successCount++;
      } catch (error) {
        console.log(`  ❌ Failed: ${suggestion.settingName.substring(0, 50)}`);
        errorCount++;
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('REMAPPING COMPLETE');
  console.log('='.repeat(80) + '\n');

  console.log(`✅ Successfully remapped: ${successCount} settings`);
  if (errorCount > 0) {
    console.log(`❌ Failed: ${errorCount} settings`);
  }
  console.log(`\n📦 Backup file: ${backupPath}`);
  console.log('\nTo restore from backup, run:');
  console.log(`  npx tsx src/scripts/restore-mapping.ts ${backupPath}\n`);

  // Show new match count
  const newMatchCount = await prisma.m365Setting.count({
    where: {
      policyTemplate: { in: Array.from(availableTemplates) as string[] },
      isActive: true
    }
  });

  const totalActive = await prisma.m365Setting.count({ where: { isActive: true } });

  console.log(`\n📊 New matching status:`);
  console.log(`   Settings with matching policies: ${newMatchCount}/${totalActive} (${((newMatchCount/totalActive)*100).toFixed(1)}%)`);

  await prisma.$disconnect();
}

applyRemapping().catch(console.error);
