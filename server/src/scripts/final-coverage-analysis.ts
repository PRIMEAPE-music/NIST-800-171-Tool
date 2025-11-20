import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeFinalCoverage() {
  console.log('\n' + '='.repeat(80));
  console.log('FINAL HYBRID APPROACH COVERAGE ANALYSIS');
  console.log('='.repeat(80) + '\n');

  // Get all compliance checks with settings that have control mappings
  const checksWithControls = await prisma.settingComplianceCheck.findMany({
    where: {
      NOT: {
        OR: [
          { actualValue: null },
          { actualValue: 'null' }
        ]
      },
      setting: {
        controlMappings: {
          some: {}
        }
      }
    },
    include: {
      policy: {
        select: { policyName: true, policyType: true, odataType: true }
      },
      setting: {
        include: {
          controlMappings: {
            include: {
              control: { select: { controlId: true, title: true } }
            }
          }
        }
      }
    }
  });

  console.log(`Total compliance checks with controls: ${checksWithControls.length}\n`);

  // Count unique controls
  const uniqueControls = new Set<string>();
  for (const check of checksWithControls) {
    for (const mapping of check.setting.controlMappings) {
      uniqueControls.add(mapping.control.controlId);
    }
  }

  console.log(`Unique controls covered: ${uniqueControls.size}`);
  console.log(`Control IDs: ${Array.from(uniqueControls).sort().join(', ')}\n`);

  // Group by policy
  const byPolicy = new Map<string, typeof checksWithControls>();
  for (const check of checksWithControls) {
    if (!byPolicy.has(check.policy.policyName)) {
      byPolicy.set(check.policy.policyName, []);
    }
    byPolicy.get(check.policy.policyName)!.push(check);
  }

  console.log('Breakdown by policy:');
  console.log('='.repeat(80));

  for (const [policyName, checks] of byPolicy) {
    const controls = new Set<string>();
    for (const check of checks) {
      for (const mapping of check.setting.controlMappings) {
        controls.add(mapping.control.controlId);
      }
    }

    console.log(`\n${policyName}`);
    console.log(`  Checks: ${checks.length}`);
    console.log(`  Controls: ${controls.size}`);
    console.log(`  Control IDs: ${Array.from(controls).sort().join(', ')}`);

    // Show sample settings
    console.log(`  Sample settings:`);
    for (const check of checks.slice(0, 3)) {
      const ctrls = check.setting.controlMappings.map(m => m.control.controlId).join(', ');
      console.log(`    - ${check.setting.displayName} → ${ctrls}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('COMPARISON TO POTENTIAL');
  console.log('='.repeat(80) + '\n');

  // How many settings with controls exist vs how many we matched
  const totalSettingsWithControls = await prisma.m365Setting.count({
    where: {
      controlMappings: {
        some: {}
      },
      isActive: true
    }
  });

  console.log(`Total settings with control mappings: ${totalSettingsWithControls}`);
  console.log(`Settings successfully matched: ${checksWithControls.length}`);
  console.log(`Match rate: ${((checksWithControls.length / totalSettingsWithControls) * 100).toFixed(1)}%`);

  console.log(`\nPotential controls (if all settings matched): ~90-95`);
  console.log(`Current controls: ${uniqueControls.size}`);
  console.log(`Coverage: ${((uniqueControls.size / 95) * 100).toFixed(1)}%`);

  await prisma.$disconnect();
}

analyzeFinalCoverage().catch(console.error);
