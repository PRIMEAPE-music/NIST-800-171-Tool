/**
 * Check BitLocker Policy Mappings
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBitLockerMappings() {
  console.log('\n' + '='.repeat(80));
  console.log('BITLOCKER POLICY MAPPINGS CHECK');
  console.log('='.repeat(80) + '\n');

  try {
    // Get BitLocker policy
    const policy = await prisma.m365Policy.findFirst({
      where: { policyName: { contains: 'BitLocker' } },
    });

    if (!policy) {
      console.log('❌ No BitLocker policy found');
      await prisma.$disconnect();
      return;
    }

    console.log(`Policy: ${policy.policyName}`);
    console.log(`Policy ID: ${policy.id}\n`);

    // Get all compliance checks for this policy (shows which settings are linked)
    const complianceChecks = await prisma.settingComplianceCheck.findMany({
      where: { policyId: policy.id },
      include: {
        setting: {
          include: {
            controlMappings: true,
          },
        },
      },
    });

    console.log(`Total compliance checks (settings linked) for this policy: ${complianceChecks.length}\n`);

    // Count mappings for these settings
    let totalMappings = 0;
    const mappedSettings: any[] = [];
    const uniqueSettings = new Map<number, any>();

    for (const check of complianceChecks) {
      if (!uniqueSettings.has(check.setting.id)) {
        uniqueSettings.set(check.setting.id, check.setting);

        if (check.setting.controlMappings.length > 0) {
          totalMappings += check.setting.controlMappings.length;
          mappedSettings.push({
            displayName: check.setting.displayName,
            settingName: check.setting.settingName,
            mappingCount: check.setting.controlMappings.length,
          });
        }
      }
    }

    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Unique settings linked to policy: ${uniqueSettings.size}`);
    console.log(`Settings with mappings: ${mappedSettings.length}`);
    console.log(`Total control mappings: ${totalMappings}`);
    console.log('='.repeat(80) + '\n');

    if (mappedSettings.length > 0) {
      console.log('Mapped settings:\n');
      mappedSettings.forEach((s, i) => {
        console.log(`[${i}] ${s.displayName}`);
        console.log(`    Setting Name: ${s.settingName || '(null)'}`);
        console.log(`    Mappings: ${s.mappingCount}`);
      });
    } else {
      console.log('⚠️  No settings are currently mapped to NIST controls!');
      console.log('\nPossible reasons:');
      console.log('1. Auto-mapping needs to be re-run after sync');
      console.log('2. Policy-setting links were broken during sync');
      console.log('3. Settings were recreated with new IDs\n');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkBitLockerMappings();
