import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseState() {
  try {
    // Check SettingComplianceCheck records
    const checkCount = await prisma.settingComplianceCheck.count();
    const compliantCount = await prisma.settingComplianceCheck.count({ where: { isCompliant: true } });
    const withActualValue = await prisma.settingComplianceCheck.count({ where: { actualValue: { not: null } } });

    // Check recent checks
    const recentCheck = await prisma.settingComplianceCheck.findFirst({
      orderBy: { lastChecked: 'desc' },
      select: { lastChecked: true }
    });

    // Check settings with template info
    const settingsWithTemplate = await prisma.m365Setting.count({ where: { policyTemplate: { not: null } } });
    const settingsWithFamily = await prisma.m365Setting.count({ where: { templateFamily: { not: null } } });
    const totalSettings = await prisma.m365Setting.count();

    // Check policies
    const policiesWithOdata = await prisma.m365Policy.count({ where: { odataType: { not: null } } });
    const policiesWithFamily = await prisma.m365Policy.count({ where: { templateFamily: { not: null } } });
    const totalPolicies = await prisma.m365Policy.count();

    // Check control mappings
    const totalMappings = await prisma.controlSettingMapping.count();
    const controlsWithMappings = await prisma.control.count({
      where: { settingMappings: { some: {} } }
    });

    console.log('='.repeat(60));
    console.log('DATABASE STATE DIAGNOSTIC');
    console.log('='.repeat(60));
    console.log('');
    console.log('SettingComplianceCheck records:');
    console.log(`  Total:             ${checkCount}`);
    console.log(`  Compliant:         ${compliantCount}`);
    console.log(`  With actual value: ${withActualValue}`);
    console.log(`  Last check:        ${recentCheck?.lastChecked || 'Never'}`);
    console.log('');
    console.log('M365Settings:');
    console.log(`  Total:              ${totalSettings}`);
    console.log(`  With policyTemplate: ${settingsWithTemplate}`);
    console.log(`  With templateFamily: ${settingsWithFamily}`);
    console.log('');
    console.log('M365Policies:');
    console.log(`  Total:             ${totalPolicies}`);
    console.log(`  With odataType:    ${policiesWithOdata}`);
    console.log(`  With templateFamily: ${policiesWithFamily}`);
    console.log('');
    console.log('Control Mappings:');
    console.log(`  Total mappings:       ${totalMappings}`);
    console.log(`  Controls with mappings: ${controlsWithMappings}`);
    console.log('');
    console.log('='.repeat(60));

    // Show some sample compliance checks
    if (checkCount > 0) {
      console.log('\nSample compliance checks:');
      const samples = await prisma.settingComplianceCheck.findMany({
        take: 5,
        include: {
          setting: { select: { displayName: true } },
          policy: { select: { policyName: true } }
        },
        orderBy: { lastChecked: 'desc' }
      });

      for (const sample of samples) {
        console.log(`  ${sample.setting.displayName}`);
        console.log(`    Policy: ${sample.policy.policyName}`);
        console.log(`    Compliant: ${sample.isCompliant}`);
        console.log(`    Actual: ${sample.actualValue?.substring(0, 50) || 'null'}`);
        console.log('');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseState();
