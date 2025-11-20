import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseIntuneMatching() {
  console.log('\n' + '='.repeat(80));
  console.log('DETAILED INTUNE MATCHING DIAGNOSIS');
  console.log('='.repeat(80) + '\n');

  // Get all Intune policies
  const intunePolicies = await prisma.m365Policy.findMany({
    where: { policyType: 'Intune' },
    select: { id: true, policyName: true, odataType: true, templateFamily: true }
  });

  console.log(`Total Intune policies: ${intunePolicies.length}\n`);

  // Get all settings with their control mappings
  const allSettings = await prisma.m365Setting.findMany({
    where: { isActive: true },
    include: {
      controlMappings: {
        include: {
          control: {
            select: { controlId: true, title: true }
          }
        }
      }
    }
  });

  // Group settings by policyTemplate
  const settingsByTemplate = new Map<string, typeof allSettings>();
  for (const setting of allSettings) {
    const template = setting.policyTemplate || 'NULL';
    if (!settingsByTemplate.has(template)) {
      settingsByTemplate.set(template, []);
    }
    settingsByTemplate.get(template)!.push(setting);
  }

  // Analyze each Intune policy
  console.log('='.repeat(80));
  console.log('PER-POLICY ANALYSIS');
  console.log('='.repeat(80) + '\n');

  let totalIntuneControls = new Set<string>();

  for (const policy of intunePolicies) {
    const matchingSettings = settingsByTemplate.get(policy.odataType || '') || [];
    const settingsWithMappings = matchingSettings.filter(s => s.controlMappings.length > 0);

    const controls = new Set<string>();
    for (const setting of settingsWithMappings) {
      for (const mapping of setting.controlMappings) {
        controls.add(mapping.control.controlId);
        totalIntuneControls.add(mapping.control.controlId);
      }
    }

    console.log(`📋 ${policy.policyName}`);
    console.log(`   Template: ${policy.odataType || 'NONE'}`);
    console.log(`   Family: ${policy.templateFamily}`);
    console.log(`   Settings matched: ${matchingSettings.length}`);
    console.log(`   Settings with control mappings: ${settingsWithMappings.length}`);
    console.log(`   Controls: ${controls.size}`);

    if (controls.size > 0 && controls.size <= 10) {
      console.log(`   Control IDs: ${[...controls].join(', ')}`);
    }

    // Show sample settings with mappings
    if (settingsWithMappings.length > 0 && settingsWithMappings.length <= 5) {
      console.log(`   Sample settings:`);
      for (const s of settingsWithMappings.slice(0, 3)) {
        const controlIds = s.controlMappings.map(m => m.control.controlId).join(', ');
        console.log(`     - ${s.displayName.substring(0, 40)} → ${controlIds}`);
      }
    }
    console.log();
  }

  console.log('='.repeat(80));
  console.log('TEMPLATE DISTRIBUTION ANALYSIS');
  console.log('='.repeat(80) + '\n');

  // Show which templates have control mappings
  console.log('Templates with settings that have control mappings:\n');

  const templateStats: Array<{
    template: string;
    settings: number;
    withMappings: number;
    controls: number;
    hasPolicy: boolean;
  }> = [];

  const intuneTemplates = new Set(intunePolicies.map(p => p.odataType).filter(Boolean));

  for (const [template, settings] of settingsByTemplate) {
    const withMappings = settings.filter(s => s.controlMappings.length > 0);
    const controls = new Set<string>();
    withMappings.forEach(s => {
      s.controlMappings.forEach(m => controls.add(m.control.controlId));
    });

    if (withMappings.length > 0) {
      templateStats.push({
        template,
        settings: settings.length,
        withMappings: withMappings.length,
        controls: controls.size,
        hasPolicy: intuneTemplates.has(template)
      });
    }
  }

  // Sort by controls
  templateStats.sort((a, b) => b.controls - a.controls);

  for (const stat of templateStats) {
    const status = stat.hasPolicy ? '✓ INTUNE' : '✗ MISSING';
    console.log(`${status.padEnd(12)} ${stat.template}`);
    console.log(`             Settings: ${stat.settings} | With mappings: ${stat.withMappings} | Controls: ${stat.controls}`);
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');

  const intuneMatched = templateStats.filter(s => s.hasPolicy);
  const intuneMissing = templateStats.filter(s => !s.hasPolicy);

  const intuneControls = new Set<string>();
  const missingControls = new Set<string>();

  for (const stat of intuneMatched) {
    const settings = settingsByTemplate.get(stat.template) || [];
    settings.forEach(s => s.controlMappings.forEach(m => intuneControls.add(m.control.controlId)));
  }

  for (const stat of intuneMissing) {
    const settings = settingsByTemplate.get(stat.template) || [];
    settings.forEach(s => s.controlMappings.forEach(m => missingControls.add(m.control.controlId)));
  }

  console.log(`Intune policies with matching templates: ${intuneMatched.length}`);
  console.log(`  Total settings: ${intuneMatched.reduce((a, b) => a + b.withMappings, 0)}`);
  console.log(`  Controls covered: ${intuneControls.size}`);

  console.log(`\nMissing templates (no Intune policy): ${intuneMissing.length}`);
  console.log(`  Total settings: ${intuneMissing.reduce((a, b) => a + b.withMappings, 0)}`);
  console.log(`  Controls affected: ${missingControls.size}`);

  // Check overlap
  const overlap = [...intuneControls].filter(c => missingControls.has(c));
  console.log(`\nControl overlap: ${overlap.length} controls need both Intune and missing policies`);

  // The real issue - what percentage of controls are covered by Intune?
  const totalControls = await prisma.control.count();
  console.log(`\nTotal NIST controls: ${totalControls}`);
  console.log(`Controls with Intune coverage: ${intuneControls.size} (${((intuneControls.size/totalControls)*100).toFixed(1)}%)`);
  console.log(`Controls needing missing policies: ${missingControls.size} (${((missingControls.size/totalControls)*100).toFixed(1)}%)`);

  await prisma.$disconnect();
}

diagnoseIntuneMatching().catch(console.error);
