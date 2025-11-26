import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateTenantSettings() {
  try {
    console.log('🔄 Starting tenant settings migration...');
    console.log('');

    // Step 1: Find Authorization Policy records
    console.log('📋 Step 1: Finding Authorization Policy records...');
    const authPolicies = await prisma.m365Policy.findMany({
      where: {
        OR: [
          { policyId: { contains: 'authorizationPolicy' } },
          { odataType: '#microsoft.graph.authorizationPolicy' },
          { policyName: { contains: 'Authorization' } }
        ]
      }
    });

    console.log(`   Found ${authPolicies.length} Authorization Policy record(s)`);
    authPolicies.forEach(policy => {
      console.log(`   - ${policy.policyName} (ID: ${policy.policyId}, Type: ${policy.policyType})`);
    });
    console.log('');

    // Step 2: Find Security Defaults records (if any exist)
    console.log('📋 Step 2: Finding Security Defaults records...');
    const securityDefaultsPolicies = await prisma.m365Policy.findMany({
      where: {
        OR: [
          { policyId: { contains: 'securityDefaults' } },
          { odataType: '#microsoft.graph.identitySecurityDefaultsEnforcementPolicy' },
          { policyName: { contains: 'Security Defaults' } }
        ]
      }
    });

    console.log(`   Found ${securityDefaultsPolicies.length} Security Defaults record(s)`);
    securityDefaultsPolicies.forEach(policy => {
      console.log(`   - ${policy.policyName} (ID: ${policy.policyId}, Type: ${policy.policyType})`);
    });
    console.log('');

    // Step 3: Update Authorization Policies
    if (authPolicies.length > 0) {
      console.log('🔧 Step 3: Updating Authorization Policy records...');
      for (const policy of authPolicies) {
        await prisma.m365Policy.update({
          where: { id: policy.id },
          data: {
            isTenantSetting: true,
            policyType: 'TenantConfig',
          },
        });
        console.log(`   ✓ Updated: ${policy.policyName}`);
      }
      console.log('');
    }

    // Step 4: Update Security Defaults Policies
    if (securityDefaultsPolicies.length > 0) {
      console.log('🔧 Step 4: Updating Security Defaults records...');
      for (const policy of securityDefaultsPolicies) {
        await prisma.m365Policy.update({
          where: { id: policy.id },
          data: {
            isTenantSetting: true,
            policyType: 'TenantConfig',
          },
        });
        console.log(`   ✓ Updated: ${policy.policyName}`);
      }
      console.log('');
    }

    // Step 5: Verify migration
    console.log('✅ Step 5: Verifying migration...');
    const tenantSettings = await prisma.m365Policy.findMany({
      where: { isTenantSetting: true },
      select: {
        id: true,
        policyName: true,
        policyType: true,
        isTenantSetting: true,
      }
    });

    console.log(`   Total tenant settings: ${tenantSettings.length}`);
    tenantSettings.forEach(policy => {
      console.log(`   - ${policy.policyName} (Type: ${policy.policyType}, isTenantSetting: ${policy.isTenantSetting})`);
    });
    console.log('');

    console.log('✅ Migration completed successfully!');
    console.log(`   Total records migrated: ${authPolicies.length + securityDefaultsPolicies.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateTenantSettings()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default migrateTenantSettings;
