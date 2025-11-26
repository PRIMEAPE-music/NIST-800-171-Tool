import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSettingsByType() {
  try {
    console.log('🔍 Analyzing policy settings by source type...\n');

    // Get all setting compliance checks (actual extracted settings from policies)
    const allSettings = await prisma.settingComplianceCheck.findMany({
      include: {
        policy: {
          select: {
            id: true,
            policyName: true,
            policyType: true,
            isTenantSetting: true,
          }
        },
        setting: {
          select: {
            id: true,
            displayName: true,
            settingName: true,
            policyType: true,
          }
        }
      }
    });

    // Count settings by policy type
    const fromTenantSettings = allSettings.filter(s => s.policy.isTenantSetting);
    const fromRegularPolicies = allSettings.filter(s => !s.policy.isTenantSetting);

    console.log('📊 Settings Count by Source:\n');
    console.log(`   Total Settings: ${allSettings.length}`);
    console.log(`   From Tenant Settings: ${fromTenantSettings.length}`);
    console.log(`   From Regular Policies: ${fromRegularPolicies.length}\n`);

    // Breakdown by policy
    const settingsByPolicy = allSettings.reduce((acc, setting) => {
      const policyId = setting.policy.id;
      if (!acc[policyId]) {
        acc[policyId] = {
          policyName: setting.policy.policyName,
          policyType: setting.policy.policyType,
          isTenantSetting: setting.policy.isTenantSetting,
          count: 0,
          compliant: 0,
          nonCompliant: 0,
        };
      }
      acc[policyId].count++;
      if (setting.isCompliant) {
        acc[policyId].compliant++;
      } else {
        acc[policyId].nonCompliant++;
      }
      return acc;
    }, {} as Record<number, any>);

    // Show tenant setting policies and their setting counts
    if (fromTenantSettings.length > 0) {
      console.log('📋 Settings from Tenant Setting Policies:\n');
      Object.values(settingsByPolicy)
        .filter((p: any) => p.isTenantSetting)
        .forEach((policy: any) => {
          console.log(`   ${policy.policyName} (${policy.policyType})`);
          console.log(`   └─ ${policy.count} settings (${policy.compliant} compliant, ${policy.nonCompliant} non-compliant)\n`);
        });
    } else {
      console.log('⚠️  No settings found from Tenant Setting policies\n');
    }

    // Show top regular policies for comparison
    console.log('📋 Top 5 Regular Policies by Setting Count:\n');
    Object.values(settingsByPolicy)
      .filter((p: any) => !p.isTenantSetting)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5)
      .forEach((policy: any) => {
        console.log(`   ${policy.policyName} (${policy.policyType})`);
        console.log(`   └─ ${policy.count} settings (${policy.compliant} compliant, ${policy.nonCompliant} non-compliant)\n`);
      });

    // Summary
    console.log('\n📈 Summary:');
    if (allSettings.length > 0) {
      console.log(`   ${((fromTenantSettings.length / allSettings.length) * 100).toFixed(1)}% of all settings come from tenant setting policies`);
      console.log(`   ${((fromRegularPolicies.length / allSettings.length) * 100).toFixed(1)}% of all settings come from regular policies`);
    } else {
      console.log('   No settings found in database');
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run check if called directly
if (require.main === module) {
  checkSettingsByType()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default checkSettingsByType;
