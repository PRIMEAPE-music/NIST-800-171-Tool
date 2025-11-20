import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RemappingSuggestion {
  settingId: number;
  settingName: string;
  currentTemplate: string | null;
  suggestedTemplate: string;
  reason: string;
  confidence: 'High' | 'Medium' | 'Low';
}

async function analyzeRemapping() {
  console.log('\n' + '='.repeat(80));
  console.log('SETTINGS REMAPPING ANALYSIS');
  console.log('='.repeat(80) + '\n');

  // Get available policies
  const policies = await prisma.m365Policy.findMany({
    select: { id: true, policyName: true, odataType: true, templateFamily: true }
  });

  const availableTemplates = new Set(policies.map(p => p.odataType).filter(Boolean));
  const availableFamilies = new Set(policies.map(p => p.templateFamily).filter(Boolean));

  console.log('Available policy templates:');
  availableTemplates.forEach(t => console.log(`  - ${t}`));
  console.log('\nAvailable families:');
  availableFamilies.forEach(f => console.log(`  - ${f}`));

  // Get unmatched settings
  const allSettings = await prisma.m365Setting.findMany({
    where: { isActive: true },
    select: {
      id: true,
      displayName: true,
      settingName: true,
      settingPath: true,
      policyTemplate: true,
      templateFamily: true,
      expectedValue: true
    }
  });

  const unmatchedSettings = allSettings.filter(s => !availableTemplates.has(s.policyTemplate));

  console.log(`\nTotal settings: ${allSettings.length}`);
  console.log(`Unmatched settings: ${unmatchedSettings.length}\n`);

  const suggestions: RemappingSuggestion[] = [];

  // Analyze each unmatched setting for remapping potential
  for (const setting of unmatchedSettings) {
    const name = setting.displayName.toLowerCase();
    const settingName = (setting.settingName || '').toLowerCase();

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
        // Check if it's not already a compliance setting
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

  // Group by suggested template
  const byTemplate = new Map<string, RemappingSuggestion[]>();
  for (const suggestion of uniqueSuggestions.values()) {
    const list = byTemplate.get(suggestion.suggestedTemplate) || [];
    list.push(suggestion);
    byTemplate.set(suggestion.suggestedTemplate, list);
  }

  // Print results
  console.log('='.repeat(80));
  console.log('REMAPPING SUGGESTIONS');
  console.log('='.repeat(80) + '\n');

  let totalSuggestions = 0;
  const highConfidence: RemappingSuggestion[] = [];
  const mediumConfidence: RemappingSuggestion[] = [];

  for (const [template, suggestions] of byTemplate) {
    console.log(`\n${template}`);
    console.log('-'.repeat(60));

    for (const s of suggestions) {
      const conf = s.confidence === 'High' ? '[HIGH]' : s.confidence === 'Medium' ? '[MED]' : '[LOW]';
      console.log(`  ${conf} ${s.settingName.substring(0, 50)}`);
      console.log(`        Current: ${s.currentTemplate || 'NULL'}`);
      console.log(`        Reason: ${s.reason}`);
      totalSuggestions++;

      if (s.confidence === 'High') highConfidence.push(s);
      else if (s.confidence === 'Medium') mediumConfidence.push(s);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');

  console.log(`Total remapping suggestions: ${totalSuggestions}`);
  console.log(`  High confidence: ${highConfidence.length}`);
  console.log(`  Medium confidence: ${mediumConfidence.length}`);
  console.log(`\nRemaining unmatched (no suggestion): ${unmatchedSettings.length - totalSuggestions}`);

  // Settings that cannot be remapped
  console.log('\n' + '='.repeat(80));
  console.log('SETTINGS THAT REQUIRE MISSING POLICIES');
  console.log('='.repeat(80) + '\n');

  const suggestedIds = new Set(uniqueSuggestions.keys());
  const cannotRemap = unmatchedSettings.filter(s => !suggestedIds.has(s.id));

  // Group by template
  const cannotRemapByTemplate = new Map<string, typeof cannotRemap>();
  for (const setting of cannotRemap) {
    const template = setting.policyTemplate || 'NULL';
    const list = cannotRemapByTemplate.get(template) || [];
    list.push(setting);
    cannotRemapByTemplate.set(template, list);
  }

  for (const [template, settings] of cannotRemapByTemplate) {
    console.log(`\n${template} (${settings.length} settings)`);
    settings.slice(0, 3).forEach(s => {
      console.log(`  - ${s.displayName.substring(0, 60)}`);
    });
    if (settings.length > 3) {
      console.log(`  ... and ${settings.length - 3} more`);
    }
  }

  await prisma.$disconnect();
}

analyzeRemapping().catch(console.error);
