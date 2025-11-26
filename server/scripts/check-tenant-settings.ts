import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTenantSettings() {
  try {
    console.log('🔍 Checking for policies that should be tenant settings...\n');

    // Find policies that look like tenant settings but aren't marked as such
    const potentialTenantSettings = await prisma.m365Policy.findMany({
      where: {
        isTenantSetting: false, // Currently NOT marked as tenant setting
        OR: [
          // Authorization Policy patterns
          { policyId: { contains: 'authorizationPolicy' } },
          { odataType: '#microsoft.graph.authorizationPolicy' },
          { policyName: { contains: 'Authorization' } },

          // Security Defaults patterns
          { policyId: { contains: 'securityDefaults' } },
          { odataType: '#microsoft.graph.identitySecurityDefaultsEnforcementPolicy' },
          { policyName: { contains: 'Security Defaults' } },

          // Other potential tenant-wide settings
          { odataType: { contains: 'tenantAppManagementPolicy' } },
          { odataType: { contains: 'organizationSettings' } },
          { policyName: { contains: 'Tenant-wide' } },
          { policyName: { contains: 'Organization Settings' } },
        ]
      }
    });

    console.log(`📊 Results:`);
    console.log(`   Total policies that should be tenant settings: ${potentialTenantSettings.length}\n`);

    if (potentialTenantSettings.length > 0) {
      console.log('📋 Details:\n');
      potentialTenantSettings.forEach((policy, index) => {
        console.log(`${index + 1}. ${policy.policyName}`);
        console.log(`   Policy ID: ${policy.policyId}`);
        console.log(`   Policy Type: ${policy.policyType}`);
        console.log(`   OData Type: ${policy.odataType}`);
        console.log(`   Currently Tenant Setting: ${policy.isTenantSetting}`);
        console.log('');
      });
    } else {
      console.log('✅ All tenant settings are properly labeled!\n');
    }

    // Also check current tenant settings for verification
    console.log('🔍 Currently marked as tenant settings:\n');
    const currentTenantSettings = await prisma.m365Policy.findMany({
      where: { isTenantSetting: true },
      select: {
        policyName: true,
        policyId: true,
        policyType: true,
        odataType: true,
      }
    });

    console.log(`   Total: ${currentTenantSettings.length}\n`);
    currentTenantSettings.forEach((policy, index) => {
      console.log(`${index + 1}. ${policy.policyName}`);
      console.log(`   Policy ID: ${policy.policyId}`);
      console.log(`   Policy Type: ${policy.policyType}`);
      console.log('');
    });

    // Summary
    console.log('📈 Summary:');
    console.log(`   Policies needing migration: ${potentialTenantSettings.length}`);
    console.log(`   Already migrated: ${currentTenantSettings.length}`);
    console.log(`   Total tenant settings expected: ${potentialTenantSettings.length + currentTenantSettings.length}`);

  } catch (error) {
    console.error('❌ Check failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run check if called directly
if (require.main === module) {
  checkTenantSettings()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default checkTenantSettings;
