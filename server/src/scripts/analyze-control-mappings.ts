import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeControlMappings() {
  console.log('\n' + '='.repeat(80));
  console.log('CONTROL MAPPING ANALYSIS BY POLICY TYPE');
  console.log('='.repeat(80) + '\n');

  // Get policies by type
  const policies = await prisma.m365Policy.findMany({
    select: { id: true, policyName: true, policyType: true, odataType: true, templateFamily: true }
  });

  const intunePolicies = policies.filter(p => p.policyType === 'Intune');
  const azureADPolicies = policies.filter(p => p.policyType === 'AzureAD');
  const purviewPolicies = policies.filter(p => p.policyType === 'Purview');

  console.log(`Total policies: ${policies.length}`);
  console.log(`  Intune: ${intunePolicies.length}`);
  console.log(`  AzureAD: ${azureADPolicies.length}`);
  console.log(`  Purview: ${purviewPolicies.length}`);

  // Get settings with control mappings
  const settings = await prisma.m365Setting.findMany({
    where: { isActive: true },
    include: {
      controlMappings: {
        select: { controlId: true }
      }
    }
  });

  console.log(`\nTotal active settings: ${settings.length}`);
  console.log(`Settings with control mappings: ${settings.filter(s => s.controlMappings.length > 0).length}`);

  // Build template sets
  const intuneTemplates = new Set(intunePolicies.map(p => p.odataType).filter(Boolean));
  const azureADTemplates = new Set(azureADPolicies.map(p => p.odataType).filter(Boolean));
  const purviewTemplates = new Set(purviewPolicies.map(p => p.odataType).filter(Boolean));

  // Count by policy type
  let intuneSettings = 0;
  let intuneControls = new Set<number>();
  let azureADSettings = 0;
  let azureADControls = new Set<number>();
  let purviewSettings = 0;
  let purviewControls = new Set<number>();
  let unmatchedSettings = 0;
  let unmatchedControls = new Set<number>();

  for (const setting of settings) {
    const controlIds = setting.controlMappings.map(m => m.controlId);

    if (intuneTemplates.has(setting.policyTemplate)) {
      intuneSettings++;
      controlIds.forEach(id => intuneControls.add(id));
    } else if (azureADTemplates.has(setting.policyTemplate)) {
      azureADSettings++;
      controlIds.forEach(id => azureADControls.add(id));
    } else if (purviewTemplates.has(setting.policyTemplate)) {
      purviewSettings++;
      controlIds.forEach(id => purviewControls.add(id));
    } else {
      unmatchedSettings++;
      controlIds.forEach(id => unmatchedControls.add(id));
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SETTINGS & CONTROLS BY POLICY SOURCE');
  console.log('='.repeat(80) + '\n');

  console.log('Intune:');
  console.log(`  Settings matched: ${intuneSettings}`);
  console.log(`  Unique controls affected: ${intuneControls.size}`);

  console.log('\nAzureAD:');
  console.log(`  Settings matched: ${azureADSettings}`);
  console.log(`  Unique controls affected: ${azureADControls.size}`);

  console.log('\nPurview:');
  console.log(`  Settings matched: ${purviewSettings}`);
  console.log(`  Unique controls affected: ${purviewControls.size}`);

  console.log('\nUnmatched (no policy):');
  console.log(`  Settings: ${unmatchedSettings}`);
  console.log(`  Unique controls affected: ${unmatchedControls.size}`);

  // Detailed breakdown by Intune policy
  console.log('\n' + '='.repeat(80));
  console.log('INTUNE POLICIES - DETAILED BREAKDOWN');
  console.log('='.repeat(80) + '\n');

  for (const policy of intunePolicies) {
    const matchingSettings = settings.filter(s => s.policyTemplate === policy.odataType);
    const controlsForPolicy = new Set<number>();
    matchingSettings.forEach(s => {
      s.controlMappings.forEach(m => controlsForPolicy.add(m.controlId));
    });

    const settingsWithMappings = matchingSettings.filter(s => s.controlMappings.length > 0).length;

    console.log(`${policy.policyName}`);
    console.log(`  Template: ${policy.odataType || 'NONE'}`);
    console.log(`  Settings matched: ${matchingSettings.length}`);
    console.log(`  Settings with control mappings: ${settingsWithMappings}`);
    console.log(`  Unique controls: ${controlsForPolicy.size}`);
    console.log();
  }

  // Azure AD breakdown
  console.log('='.repeat(80));
  console.log('AZURE AD POLICIES - DETAILED BREAKDOWN');
  console.log('='.repeat(80) + '\n');

  for (const policy of azureADPolicies) {
    const matchingSettings = settings.filter(s => s.policyTemplate === policy.odataType);
    const controlsForPolicy = new Set<number>();
    matchingSettings.forEach(s => {
      s.controlMappings.forEach(m => controlsForPolicy.add(m.controlId));
    });

    const settingsWithMappings = matchingSettings.filter(s => s.controlMappings.length > 0).length;

    console.log(`${policy.policyName}`);
    console.log(`  Template: ${policy.odataType || 'NONE'}`);
    console.log(`  Settings matched: ${matchingSettings.length}`);
    console.log(`  Settings with control mappings: ${settingsWithMappings}`);
    console.log(`  Unique controls: ${controlsForPolicy.size}`);
    console.log();
  }

  // Check what templates have control mappings but no policies
  console.log('='.repeat(80));
  console.log('TEMPLATES WITH CONTROL MAPPINGS BUT NO POLICIES');
  console.log('='.repeat(80) + '\n');

  const allPolicyTemplates = new Set([...intuneTemplates, ...azureADTemplates, ...purviewTemplates]);
  const templateToControls = new Map<string, Set<number>>();

  for (const setting of settings) {
    if (!allPolicyTemplates.has(setting.policyTemplate) && setting.controlMappings.length > 0) {
      const template = setting.policyTemplate || 'NULL';
      if (!templateToControls.has(template)) {
        templateToControls.set(template, new Set());
      }
      setting.controlMappings.forEach(m => templateToControls.get(template)!.add(m.controlId));
    }
  }

  const sortedTemplates = [...templateToControls.entries()].sort((a, b) => b[1].size - a[1].size);

  for (const [template, controls] of sortedTemplates) {
    const settingCount = settings.filter(s => s.policyTemplate === template).length;
    console.log(`${template}`);
    console.log(`  Settings: ${settingCount}, Controls affected: ${controls.size}`);
  }

  await prisma.$disconnect();
}

analyzeControlMappings().catch(console.error);
