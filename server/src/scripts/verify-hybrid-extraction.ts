/**
 * Hybrid Extraction Phase 1 Verification Script
 *
 * Verifies that the database schema changes were applied correctly.
 *
 * Run with: npx tsx server/src/scripts/verify-hybrid-extraction.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyHybridExtraction() {
  console.log('Hybrid Extraction - Phase 1 Verification\n');
  console.log('='.repeat(60));

  try {
    // Check M365Policy fields
    console.log('\n1. M365Policy - Template Data:');
    console.log('-'.repeat(60));

    const policiesWithTemplate = await prisma.m365Policy.findMany({
      where: { odataType: { not: null } },
      select: {
        id: true,
        policyName: true,
        odataType: true,
        templateFamily: true
      }
    });

    const totalPolicies = await prisma.m365Policy.count();

    console.log(`Total policies: ${totalPolicies}`);
    console.log(`Policies with template data: ${policiesWithTemplate.length}`);
    console.log(`Policies without template data: ${totalPolicies - policiesWithTemplate.length}\n`);

    console.log('Policies with template data:');
    for (const policy of policiesWithTemplate) {
      console.log(`  ${policy.id} | ${policy.policyName}`);
      console.log(`      Type: ${policy.odataType}`);
      console.log(`      Family: ${policy.templateFamily}\n`);
    }

    // Check M365Setting fields
    console.log('\n2. M365Setting - New Fields:');
    console.log('-'.repeat(60));

    const totalSettings = await prisma.m365Setting.count();
    console.log(`Total settings: ${totalSettings}`);

    // Check if new fields exist (they should all be null/0)
    const settingsSample = await prisma.m365Setting.findFirst({
      select: {
        id: true,
        displayName: true,
        policyTemplate: true,
        templateFamily: true,
        successfulExtractions: true,
        failedExtractions: true
      }
    });

    if (settingsSample) {
      console.log('\nSample setting with new fields:');
      console.log(`  ID: ${settingsSample.id}`);
      console.log(`  Name: ${settingsSample.displayName}`);
      console.log(`  Policy Template: ${settingsSample.policyTemplate || '(null)'}`);
      console.log(`  Template Family: ${settingsSample.templateFamily || '(null)'}`);
      console.log(`  Successful Extractions: ${settingsSample.successfulExtractions}`);
      console.log(`  Failed Extractions: ${settingsSample.failedExtractions}`);
    } else {
      console.log('No settings found in database.');
    }

    // Family distribution
    console.log('\n3. Family Distribution:');
    console.log('-'.repeat(60));

    const familyGroups = await prisma.m365Policy.groupBy({
      by: ['templateFamily'],
      _count: true,
      where: { templateFamily: { not: null } }
    });

    for (const group of familyGroups) {
      console.log(`  ${group._count} x ${group.templateFamily}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Phase 1 verification complete!');
    console.log('='.repeat(60));

    return {
      success: true,
      totalPolicies,
      policiesWithTemplate: policiesWithTemplate.length,
      totalSettings,
      familyDistribution: familyGroups
    };

  } catch (error) {
    console.error('Verification failed:', error);
    return { success: false, error };
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyHybridExtraction()
  .then(result => {
    if (!result.success) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
