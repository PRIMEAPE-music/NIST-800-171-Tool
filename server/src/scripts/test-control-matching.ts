import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testControlMatching() {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING CONTROL MATCHING FOR POLICY VIEWER');
  console.log('='.repeat(80) + '\n');

  // Get all Intune policies
  const intunePolicies = await prisma.m365Policy.findMany({
    where: { policyType: 'Intune' },
    select: { id: true, policyName: true }
  });

  console.log(`Testing ${intunePolicies.length} Intune policies\n`);

  let totalControlsFound = 0;
  const allControls = new Set<string>();

  for (const policy of intunePolicies) {
    // This is the same query logic as in the policyViewer service
    // Only include settings that are actually configured (actualValue is not null)
    const complianceChecks = await prisma.settingComplianceCheck.findMany({
      where: {
        policyId: policy.id,
        NOT: {
          OR: [
            { actualValue: null },
            { actualValue: 'null' }
          ]
        }
      },
      include: {
        setting: {
          include: {
            controlMappings: {
              include: {
                control: {
                  select: {
                    controlId: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Extract unique controls
    const controlsMap = new Map<string, any>();
    for (const check of complianceChecks) {
      for (const mapping of check.setting.controlMappings) {
        if (!controlsMap.has(mapping.control.controlId)) {
          controlsMap.set(mapping.control.controlId, {
            controlId: mapping.control.controlId,
            controlTitle: mapping.control.title,
          });
          allControls.add(mapping.control.controlId);
        }
      }
    }

    const controlCount = controlsMap.size;
    totalControlsFound += controlCount;

    console.log(`📋 ${policy.policyName}`);
    console.log(`   Compliance Checks: ${complianceChecks.length}`);
    console.log(`   Controls Found: ${controlCount}`);

    if (controlCount > 0 && controlCount <= 10) {
      const controlIds = Array.from(controlsMap.keys()).join(', ');
      console.log(`   Control IDs: ${controlIds}`);
    }
    console.log();
  }

  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');
  console.log(`Total policies: ${intunePolicies.length}`);
  console.log(`Total control associations: ${totalControlsFound}`);
  console.log(`Unique controls across all policies: ${allControls.size}`);
  console.log(`Average controls per policy: ${(totalControlsFound / intunePolicies.length).toFixed(1)}`);

  await prisma.$disconnect();
}

testControlMatching().catch(console.error);
