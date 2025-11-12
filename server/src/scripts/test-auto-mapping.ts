import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function testAutoMapping() {
  console.log('🔍 Testing Auto-Mapping Functionality\n');

  try {
    // 1. Load mapping templates
    const mappingsPath = path.join(__dirname, '../../../data/control-m365-mappings.json');
    const mappingsData = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
    console.log(`✅ Loaded ${mappingsData.mappings.length} mapping templates\n`);

    // 2. Check controls exist
    const controlCount = await prisma.control.count();
    console.log(`✅ Database contains ${controlCount} NIST controls\n`);

    // 3. Check for M365 policies
    const policyCount = await prisma.m365Policy.count();
    console.log(`📋 Currently synced M365 policies: ${policyCount}`);

    if (policyCount === 0) {
      console.log('⚠️  No M365 policies found. Run a sync first.');
      console.log('   You can do this via the UI or by calling the sync API endpoint.\n');
    }

    // 4. Check existing mappings
    const existingMappings = await prisma.controlPolicyMapping.count();
    console.log(`🔗 Current policy-to-control mappings: ${existingMappings}\n`);

    // 5. Sample some mappings
    const sampleMappings = await prisma.controlPolicyMapping.findMany({
      take: 5,
      include: {
        control: { select: { controlId: true, title: true } },
        policy: { select: { policyName: true, policyType: true } },
      },
    });

    if (sampleMappings.length > 0) {
      console.log('📊 Sample Mappings:');
      sampleMappings.forEach((mapping, idx) => {
        console.log(`\n${idx + 1}. Control ${mapping.control.controlId}: ${mapping.control.title}`);
        console.log(`   ↳ Policy: ${mapping.policy.policyName} (${mapping.policy.policyType})`);
        console.log(`   ↳ Confidence: ${mapping.mappingConfidence}`);
        console.log(`   ↳ Notes: ${mapping.mappingNotes}`);
      });
    } else {
      console.log('⚠️  No mappings found. Auto-mapping may not have run yet.\n');
    }

    // 6. Mapping confidence breakdown
    const confidenceBreakdown = await prisma.controlPolicyMapping.groupBy({
      by: ['mappingConfidence'],
      _count: true,
    });

    console.log('\n\n📈 Mapping Confidence Breakdown:');
    confidenceBreakdown.forEach(item => {
      console.log(`   ${item.mappingConfidence}: ${item._count} mappings`);
    });

    // 7. Test a specific mapping template
    console.log('\n\n🧪 Testing Specific Mapping (MFA Control 3.5.3):');

    const mfaControl = await prisma.control.findFirst({
      where: { controlId: '03.05.03' },
    });

    if (mfaControl) {
      console.log(`✅ Found control: ${mfaControl.controlId} - ${mfaControl.title}`);

      // Find policies that should match MFA keywords
      const mfaPolicies = await prisma.m365Policy.findMany({
        where: {
          policyType: 'AzureAD',
          isActive: true,
          OR: [
            { policyName: { contains: 'mfa' } },
            { policyName: { contains: 'multifactor' } },
            { policyName: { contains: 'multi-factor' } },
            { policyDescription: { contains: 'mfa' } },
            { policyDescription: { contains: 'multifactor' } },
            { policyDescription: { contains: 'multi-factor' } },
          ],
        },
      });

      console.log(`   Found ${mfaPolicies.length} policies matching MFA keywords`);

      if (mfaPolicies.length > 0) {
        console.log('   Policies:');
        mfaPolicies.forEach(policy => {
          console.log(`   - ${policy.policyName}`);
        });
      }

      // Check if mappings exist
      const mfaMappings = await prisma.controlPolicyMapping.findMany({
        where: { controlId: mfaControl.id },
        include: { policy: true },
      });

      console.log(`   Mapped to ${mfaMappings.length} policies`);

      if (mfaMappings.length > 0) {
        console.log('\n   Existing mappings:');
        mfaMappings.forEach(mapping => {
          console.log(`   - ${mapping.policy.policyName} (${mapping.mappingConfidence})`);
        });
      }
    } else {
      console.log('❌ Control 03.05.03 not found in database');
    }

    // 8. Check sync logs
    console.log('\n\n📜 Recent Sync History:');
    const recentLogs = await prisma.m365SyncLog.findMany({
      take: 5,
      orderBy: { syncDate: 'desc' },
    });

    if (recentLogs.length > 0) {
      recentLogs.forEach((log, idx) => {
        console.log(`\n${idx + 1}. Sync Date: ${log.syncDate.toISOString()}`);
        console.log(`   Type: ${log.syncType}`);
        console.log(`   Status: ${log.status}`);
        console.log(`   Policies Updated: ${log.policiesUpdated}`);
        console.log(`   Controls Updated: ${log.controlsUpdated}`);
        if (log.errorMessage) {
          console.log(`   Errors: ${log.errorMessage}`);
        }
        if (log.syncDuration) {
          console.log(`   Duration: ${log.syncDuration}ms`);
        }
      });
    } else {
      console.log('   No sync logs found.');
    }

    console.log('\n\n✅ Auto-Mapping Test Complete!\n');
  } catch (error) {
    console.error('\n❌ Error during testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAutoMapping().catch(console.error);
