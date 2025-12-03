import { PrismaClient } from '@prisma/client';
import { settingValidationService } from '../services/settingValidation.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Deleting all compliance checks...');

  // Delete ALL compliance checks to start fresh
  const deleted = await prisma.settingComplianceCheck.deleteMany({});
  console.log(`   Deleted ${deleted.count} compliance checks`);

  console.log('\n🔄 Re-validating all policies...');

  // Get all active policies
  const policies = await prisma.m365Policy.findMany({
    where: { isActive: true },
    select: { id: true, policyName: true }
  });

  console.log(`   Found ${policies.length} active policies\n`);

  let totalValidated = 0;
  let totalStored = 0;

  for (const policy of policies) {
    try {
      const results = await settingValidationService.validatePolicySettings(policy.id);
      await settingValidationService.storeValidationResults(results, policy.id);

      const configuredCount = results.filter(r => r.validationResult.actualValue !== null).length;
      totalValidated += results.length;
      totalStored += configuredCount;

      console.log(`   ✓ ${policy.policyName}: ${configuredCount} configured of ${results.length} validated`);
    } catch (error) {
      console.error(`   ❌ ${policy.policyName}:`, error);
    }
  }

  console.log(`\n✅ Complete! Stored ${totalStored} compliance checks (validated ${totalValidated} total)`);

  await prisma.$disconnect();
}

main().catch(console.error);
