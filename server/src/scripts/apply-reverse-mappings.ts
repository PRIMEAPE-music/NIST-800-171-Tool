/**
 * Apply Reverse Mappings Script
 *
 * Applies the high-confidence mapping suggestions to the database
 *
 * IMPORTANT: Review the mappings array carefully before running!
 *
 * Run with: npx tsx server/src/scripts/apply-reverse-mappings.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Manual mappings to apply
 * ADD YOUR HIGH-CONFIDENCE SUGGESTIONS HERE
 */
const mappings: Array<{
  settingId: number;
  settingName: string;
  displayName: string; // For verification only
}> = [
  // EXAMPLE - Replace with your actual suggestions:
  // { settingId: 123, settingName: 'passwordMinimumLength', displayName: 'Password Minimum Length' },
  // { settingId: 456, settingName: 'passwordRequired', displayName: 'Require Password' },

  // ADD YOUR MAPPINGS HERE FROM generate-reverse-mappings.ts OUTPUT

];

async function applyMappings() {
  console.log('\n' + '='.repeat(80));
  console.log('APPLYING REVERSE MAPPINGS');
  console.log('='.repeat(80) + '\n');

  console.log(`Applying ${mappings.length} mappings...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const mapping of mappings) {
    try {
      // Verify setting exists
      const setting = await prisma.m365Setting.findUnique({
        where: { id: mapping.settingId },
        select: { id: true, displayName: true, settingName: true }
      });

      if (!setting) {
        console.log(`❌ Setting ${mapping.settingId} not found`);
        errorCount++;
        continue;
      }

      // Verify display name matches (safety check)
      if (setting.displayName !== mapping.displayName) {
        console.log(`⚠️  Display name mismatch for setting ${mapping.settingId}:`);
        console.log(`   Expected: ${mapping.displayName}`);
        console.log(`   Found: ${setting.displayName}`);
        console.log(`   Skipping for safety...`);
        errorCount++;
        continue;
      }

      // Apply update
      await prisma.m365Setting.update({
        where: { id: mapping.settingId },
        data: { settingName: mapping.settingName }
      });

      console.log(`✓ ${setting.displayName}`);
      console.log(`  ${setting.settingName || 'NULL'} → ${mapping.settingName}`);
      successCount++;

    } catch (error) {
      console.error(`❌ Failed to update setting ${mapping.settingId}:`, error);
      errorCount++;
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('RESULTS');
  console.log(`${'='.repeat(80)}`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Total: ${mappings.length}`);
  console.log('');

  if (successCount > 0) {
    console.log('✓ Mappings applied successfully!');
    console.log('\nNext steps:');
    console.log('  1. Rebuild compliance checks: npx tsx src/scripts/rebuild-compliance-checks.ts');
    console.log('  2. Measure results: npx tsx src/scripts/final-coverage-analysis.ts');
  }

  await prisma.$disconnect();
}

applyMappings().catch(console.error);
