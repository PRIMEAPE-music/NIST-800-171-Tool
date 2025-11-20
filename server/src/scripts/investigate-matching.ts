import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function investigate() {
  console.log('\n=== MATCHING ANALYSIS ===\n');

  // Get all policy odataTypes
  const policies = await prisma.m365Policy.findMany({
    select: { id: true, policyName: true, odataType: true, templateFamily: true }
  });

  const policyOdataTypes = new Set(policies.map(p => p.odataType).filter(Boolean));

  // Get settings grouped by policyTemplate
  const settings = await prisma.m365Setting.findMany({
    where: { isActive: true },
    select: { id: true, displayName: true, policyTemplate: true, templateFamily: true }
  });

  // Find settings that should match
  console.log('=== TEMPLATE MATCHING STATUS ===\n');

  let matchedCount = 0;
  const unmatchedTemplates = new Map<string, number>();

  for (const setting of settings) {
    if (policyOdataTypes.has(setting.policyTemplate)) {
      matchedCount++;
    } else if (setting.policyTemplate) {
      unmatchedTemplates.set(
        setting.policyTemplate,
        (unmatchedTemplates.get(setting.policyTemplate) || 0) + 1
      );
    }
  }

  console.log(`Settings with matching policy template: ${matchedCount}/${settings.length}`);
  console.log(`Settings without matching policy: ${settings.length - matchedCount}\n`);

  // Check specific problem cases
  console.log('=== AUTHORIZATION POLICY ISSUE ===\n');

  const authPolicy = policies.find(p => p.odataType === '#microsoft.graph.authorizationPolicy');
  console.log(`Auth policy exists: ${authPolicy ? 'YES' : 'NO'}`);
  if (authPolicy) {
    console.log(`  Name: ${authPolicy.policyName}`);
    console.log(`  odataType: ${authPolicy.odataType}`);
  }

  const authSettings = settings.filter(s => s.policyTemplate === '#microsoft.graph.authorizationPolicy');
  console.log(`Settings expecting authorizationPolicy: ${authSettings.length}`);
  if (authSettings.length > 0) {
    console.log('  Sample settings:');
    authSettings.slice(0, 5).forEach(s => {
      console.log(`    - ${s.displayName}`);
    });
  }

  // Check if auth settings have compliance checks
  if (authPolicy && authSettings.length > 0) {
    const authChecks = await prisma.settingComplianceCheck.findMany({
      where: {
        policyId: authPolicy.id,
        settingId: { in: authSettings.map(s => s.id) }
      },
      select: {
        settingId: true,
        actualValue: true,
        isCompliant: true
      }
    });
    console.log(`\n  Compliance checks for auth settings: ${authChecks.length}`);
    console.log(`  Checks with actual value: ${authChecks.filter(c => c.actualValue).length}`);
  }

  console.log('\n=== ASR ISSUE ===\n');

  const asrPolicies = policies.filter(p => p.odataType && p.odataType.includes('AttackSurfaceReduction'));
  console.log(`ASR policies: ${asrPolicies.length}`);
  asrPolicies.forEach(p => console.log(`  - ${p.policyName} | ${p.odataType}`));

  const asrSettings = settings.filter(s => s.policyTemplate && s.policyTemplate.includes('AttackSurfaceReduction'));
  console.log(`ASR settings: ${asrSettings.length}`);
  asrSettings.forEach(s => console.log(`  - ${s.displayName} | ${s.policyTemplate}`));

  // Check Windows 10 Compliance - should have many matches
  console.log('\n=== WINDOWS 10 COMPLIANCE POLICIES ===\n');

  const win10Policies = policies.filter(p => p.odataType === '#microsoft.graph.windows10CompliancePolicy');
  console.log(`Windows 10 Compliance policies: ${win10Policies.length}`);
  win10Policies.forEach(p => console.log(`  - ${p.policyName}`));

  const win10Settings = settings.filter(s => s.policyTemplate === '#microsoft.graph.windows10CompliancePolicy');
  console.log(`Settings expecting windows10CompliancePolicy: ${win10Settings.length}`);

  if (win10Policies.length > 0 && win10Settings.length > 0) {
    const win10Checks = await prisma.settingComplianceCheck.findMany({
      where: {
        policyId: { in: win10Policies.map(p => p.id) }
      },
      select: {
        settingId: true,
        actualValue: true,
        isCompliant: true
      }
    });
    console.log(`Compliance checks: ${win10Checks.length}`);
    console.log(`Checks with actual value: ${win10Checks.filter(c => c.actualValue).length}`);
    console.log(`Compliant checks: ${win10Checks.filter(c => c.isCompliant).length}`);
  }

  // Overall compliance check status
  console.log('\n=== OVERALL COMPLIANCE CHECK STATUS ===\n');

  const checksWithActualValue = await prisma.settingComplianceCheck.count({
    where: { actualValue: { not: null } }
  });
  const totalChecks = await prisma.settingComplianceCheck.count();
  const compliantChecks = await prisma.settingComplianceCheck.count({
    where: { isCompliant: true }
  });

  console.log(`Total compliance checks: ${totalChecks}`);
  console.log(`Checks with actual values extracted: ${checksWithActualValue}`);
  console.log(`Checks with NULL values (extraction failed): ${totalChecks - checksWithActualValue}`);
  console.log(`Compliant checks: ${compliantChecks}`);

  // Check by policy type
  console.log('\n=== CHECKS BY POLICY TYPE ===\n');

  for (const policy of policies.filter(p => p.odataType)) {
    const policyChecks = await prisma.settingComplianceCheck.findMany({
      where: { policyId: policy.id },
      select: { actualValue: true, isCompliant: true }
    });

    if (policyChecks.length > 0) {
      const extracted = policyChecks.filter(c => c.actualValue).length;
      const compliant = policyChecks.filter(c => c.isCompliant).length;
      console.log(`${policy.policyName.substring(0, 40).padEnd(40)} | ${policyChecks.length} checks | ${extracted} extracted | ${compliant} compliant`);
    }
  }

  await prisma.$disconnect();
}

investigate().catch(console.error);
