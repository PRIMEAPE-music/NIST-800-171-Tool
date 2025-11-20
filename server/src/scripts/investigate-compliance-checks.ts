import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function investigate() {
  // Get the Android App Protection policy that should only have 1 control (03.01.18)
  const policy = await prisma.m365Policy.findFirst({
    where: { policyName: { contains: 'App Protection - Android' } }
  });

  if (!policy) {
    console.log('Policy not found');
    return;
  }

  console.log('Policy:', policy.policyName);
  console.log('Policy ID:', policy.id);
  console.log('Policy Template:', policy.odataType);
  console.log();

  // Get compliance checks for this policy
  const checks = await prisma.settingComplianceCheck.findMany({
    where: { policyId: policy.id },
    include: {
      setting: {
        select: {
          displayName: true,
          policyTemplate: true,
          controlMappings: {
            include: {
              control: { select: { controlId: true } }
            }
          }
        }
      }
    },
    take: 10
  });

  console.log(`Total compliance checks: ${checks.length}`);
  console.log();
  console.log('First 10 checks:');
  for (const check of checks) {
    const controls = check.setting.controlMappings.map(m => m.control.controlId).join(', ');
    console.log(`- ${check.setting.displayName}`);
    console.log(`  Template: ${check.setting.policyTemplate}`);
    console.log(`  Controls: ${controls || 'NONE'}`);
    console.log();
  }

  // Now check: how many of these checks have settings that match the policy template?
  const matchingTemplateCount = checks.filter(c => c.setting.policyTemplate === policy.odataType).length;
  console.log(`Checks where setting.policyTemplate matches policy.odataType: ${matchingTemplateCount}`);

  // Show the matching ones
  const matchingChecks = checks.filter(c => c.setting.policyTemplate === policy.odataType);
  if (matchingChecks.length > 0) {
    console.log('\nSettings that match this policy template:');
    for (const check of matchingChecks) {
      const controls = check.setting.controlMappings.map(m => m.control.controlId).join(', ');
      console.log(`- ${check.setting.displayName} → ${controls}`);
    }
  }

  await prisma.$disconnect();
}

investigate().catch(console.error);
