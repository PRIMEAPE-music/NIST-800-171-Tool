/**
 * Validate Research Improvements
 *
 * Checks if the 15 settings updated in Phase 2 research are now extracting successfully
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The 15 settings we just updated
const updatedSettingIds = [333, 421, 579, 447, 532, 428, 127, 126, 128, 130, 366, 55, 438, 439, 554];

async function validateImprovements() {
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 2 RESEARCH IMPROVEMENTS VALIDATION');
  console.log('='.repeat(80) + '\n');

  const settings = await prisma.m365Setting.findMany({
    where: {
      id: { in: updatedSettingIds }
    },
    include: {
      complianceChecks: {
        select: {
          id: true,
          actualValue: true,
          isCompliant: true,
          policy: {
            select: {
              id: true,
              policyName: true
            }
          }
        }
      },
      controlMappings: {
        include: {
          control: {
            select: {
              controlId: true,
              title: true,
              priority: true
            }
          }
        }
      }
    },
    orderBy: {
      id: 'asc'
    }
  });

  console.log(`Analyzing ${settings.length} updated settings...\n`);
  console.log('='.repeat(80));
  console.log('EXTRACTION STATUS');
  console.log('='.repeat(80) + '\n');

  let totalSettings = 0;
  let workingSettings = 0;
  let totalChecks = 0;
  let successfulExtractions = 0;

  for (const setting of settings) {
    const checks = setting.complianceChecks.length;
    const successful = setting.complianceChecks.filter(
      c => c.actualValue !== null && c.actualValue !== 'null'
    ).length;

    const extractionRate = checks > 0 ? (successful / checks) * 100 : 0;
    const isWorking = extractionRate >= 50;

    totalSettings++;
    totalChecks += checks;
    successfulExtractions += successful;
    if (isWorking) workingSettings++;

    // Status indicator
    const status = extractionRate >= 80 ? '✅ Excellent' :
                   extractionRate >= 50 ? '✓ Good' :
                   extractionRate > 0 ? '⚠️ Partial' :
                   checks > 0 ? '❌ Failed' :
                   '⏭️ No Checks';

    // Priority
    const hasCritical = setting.controlMappings.some(m => m.control.priority === 'Critical');
    const hasHigh = setting.controlMappings.some(m => m.control.priority === 'High');
    const priority = hasCritical ? '[CRITICAL]' : hasHigh ? '[HIGH]' : '[MEDIUM]';

    console.log(`${status} ${priority} ${setting.displayName}`);
    console.log(`   ID: ${setting.id}`);
    console.log(`   Property: ${setting.settingName}`);
    console.log(`   Extraction: ${successful}/${checks} (${extractionRate.toFixed(0)}%)`);
    console.log(`   Controls: ${setting.controlMappings.length} (${setting.controlMappings.map(m => m.control.controlId).slice(0, 5).join(', ')})`);

    // Show sample values
    if (successful > 0) {
      const sampleValues = setting.complianceChecks
        .filter(c => c.actualValue !== null && c.actualValue !== 'null')
        .slice(0, 2)
        .map(c => `${c.policy.policyName}: ${c.actualValue}`)
        .join(', ');
      console.log(`   Sample values: ${sampleValues}`);
    }
    console.log();
  }

  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');

  const overallExtraction = totalChecks > 0 ? (successfulExtractions / totalChecks) * 100 : 0;

  console.log(`Total settings updated: ${totalSettings}`);
  console.log(`Settings with >50% extraction: ${workingSettings} (${((workingSettings / totalSettings) * 100).toFixed(0)}%)`);
  console.log(`Total compliance checks: ${totalChecks}`);
  console.log(`Successful extractions: ${successfulExtractions}/${totalChecks} (${overallExtraction.toFixed(1)}%)`);
  console.log();

  // Control coverage
  const allControls = new Set<string>();
  const workingControls = new Set<string>();

  for (const setting of settings) {
    const rate = setting.complianceChecks.length > 0
      ? setting.complianceChecks.filter(c => c.actualValue !== null && c.actualValue !== 'null').length / setting.complianceChecks.length
      : 0;

    for (const mapping of setting.controlMappings) {
      allControls.add(mapping.control.controlId);
      if (rate >= 0.5) {
        workingControls.add(mapping.control.controlId);
      }
    }
  }

  console.log('='.repeat(80));
  console.log('CONTROL COVERAGE');
  console.log('='.repeat(80) + '\n');

  console.log(`Total unique controls in updated settings: ${allControls.size}`);
  console.log(`Controls with working extractions (>50%): ${workingControls.size}`);
  console.log(`Control coverage rate: ${((workingControls.size / allControls.size) * 100).toFixed(0)}%`);
  console.log();

  if (workingControls.size > 0) {
    console.log(`Working controls: ${Array.from(workingControls).sort().join(', ')}`);
    console.log();
  }

  // Recommendations
  console.log('='.repeat(80));
  console.log('NEXT STEPS');
  console.log('='.repeat(80) + '\n');

  const failing = settings.filter(s => {
    const rate = s.complianceChecks.length > 0
      ? s.complianceChecks.filter(c => c.actualValue !== null && c.actualValue !== 'null').length / s.complianceChecks.length
      : 0;
    return s.complianceChecks.length > 0 && rate < 0.5;
  });

  if (failing.length > 0) {
    console.log(`⚠️  ${failing.length} settings still have low extraction rates:\n`);
    failing.forEach(s => {
      const rate = s.complianceChecks.filter(c => c.actualValue !== null && c.actualValue !== 'null').length / s.complianceChecks.length;
      console.log(`  • ${s.displayName}`);
      console.log(`    Current property: ${s.settingName}`);
      console.log(`    Extraction rate: ${(rate * 100).toFixed(0)}%`);
      console.log(`    Policy checks: ${s.complianceChecks.length}`);
    });
    console.log('\nPossible reasons:');
    console.log('  1. Property name is correct but policies don\'t have this setting configured');
    console.log('  2. Property name needs additional validation');
    console.log('  3. Template mismatch - setting assigned to wrong policy type');
    console.log('  4. Special extraction logic needed (Settings Catalog, OMA-URI, etc.)');
  } else {
    console.log('✅ All updated settings are working well!');
  }

  console.log('\n' + '='.repeat(80) + '\n');

  await prisma.$disconnect();
}

validateImprovements().catch(console.error);
