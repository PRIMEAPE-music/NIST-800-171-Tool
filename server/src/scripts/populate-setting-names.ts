/**
 * Populate settingName Field with Normalized Paths
 *
 * Pre-populates the settingName field in M365Setting records with likely
 * Settings Catalog definition IDs based on path normalization.
 *
 * This dramatically improves matching rates by having the correct definition
 * IDs stored in the database before extraction runs.
 *
 * Run with: npx tsx server/src/scripts/populate-setting-names.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client';
import { normalizePathToSettingsCatalog } from '../services/settings-catalog-extractor.service';

const prisma = new PrismaClient();

interface SettingUpdate {
  id: number;
  displayName: string;
  currentPath: string;
  currentSettingName: string | null;
  suggestedSettingName: string;
  confidence: 'high' | 'medium' | 'low';
}

async function populateSettingNames(dryRun: boolean = true) {
  console.log('\n' + '='.repeat(80));
  console.log('POPULATE SETTING NAMES WITH NORMALIZED PATHS');
  console.log('='.repeat(80));
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE MODE'}`);
  console.log('='.repeat(80) + '\n');

  // Get all active settings
  console.log('Step 1: Loading settings...');
  const settings = await prisma.m365Setting.findMany({
    where: {
      isActive: true,
      OR: [
        { policyTemplate: { startsWith: '#settingsCatalog' } },
        { templateFamily: { in: ['DiskEncryption', 'Antivirus', 'Firewall', 'AttackSurfaceReduction'] } },
        { settingPath: { contains: 'BitLocker' } },
        { settingPath: { contains: 'Defender' } },
        { settingPath: { contains: 'Firewall' } },
      ],
    },
    orderBy: { displayName: 'asc' },
  });

  console.log(`Found ${settings.length} settings to analyze\n`);

  // Analyze and generate suggestions
  console.log('Step 2: Generating settingName suggestions...');
  const updates: SettingUpdate[] = [];

  for (const setting of settings) {
    // Skip if settingName is already populated with a valid definition ID
    if (setting.settingName && setting.settingName.startsWith('device_vendor_msft_')) {
      continue;
    }

    // Get normalized variants
    const variants = normalizePathToSettingsCatalog(setting.settingPath);

    // Use the first (most likely) variant as the suggestion
    if (variants.length > 0 && variants[0] !== setting.settingPath.toLowerCase()) {
      const suggestedName = variants[0];

      // Determine confidence level
      let confidence: 'high' | 'medium' | 'low' = 'medium';

      // High confidence: Known patterns with specific prefixes
      if (
        suggestedName.includes('bitlocker') ||
        suggestedName.includes('defender') ||
        suggestedName.includes('firewall')
      ) {
        confidence = 'high';
      }

      // Low confidence: Generic normalization
      if (suggestedName === `device_vendor_msft_${setting.settingPath.toLowerCase().replace(/\./g, '_')}`) {
        confidence = 'low';
      }

      updates.push({
        id: setting.id,
        displayName: setting.displayName,
        currentPath: setting.settingPath,
        currentSettingName: setting.settingName,
        suggestedSettingName: suggestedName,
        confidence,
      });
    }
  }

  console.log(`Generated ${updates.length} suggestions\n`);

  // Display summary
  const highConfidence = updates.filter((u) => u.confidence === 'high');
  const mediumConfidence = updates.filter((u) => u.confidence === 'medium');
  const lowConfidence = updates.filter((u) => u.confidence === 'low');

  console.log('='.repeat(80));
  console.log('ANALYSIS SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total settings analyzed: ${settings.length}`);
  console.log(`Settings with suggestions: ${updates.length}`);
  console.log(`  - High confidence: ${highConfidence.length}`);
  console.log(`  - Medium confidence: ${mediumConfidence.length}`);
  console.log(`  - Low confidence: ${lowConfidence.length}`);
  console.log('='.repeat(80) + '\n');

  // Display samples from each confidence level
  if (highConfidence.length > 0) {
    console.log('HIGH CONFIDENCE SAMPLES (showing first 10):');
    console.log('-'.repeat(80));
    for (let i = 0; i < Math.min(10, highConfidence.length); i++) {
      const u = highConfidence[i];
      console.log(`\n${i + 1}. ${u.displayName}`);
      console.log(`   Current Path: ${u.currentPath}`);
      console.log(`   Current Name: ${u.currentSettingName || '(null)'}`);
      console.log(`   Suggested Name: ${u.suggestedSettingName}`);
    }
    console.log('\n');
  }

  if (mediumConfidence.length > 0) {
    console.log('MEDIUM CONFIDENCE SAMPLES (showing first 5):');
    console.log('-'.repeat(80));
    for (let i = 0; i < Math.min(5, mediumConfidence.length); i++) {
      const u = mediumConfidence[i];
      console.log(`\n${i + 1}. ${u.displayName}`);
      console.log(`   Suggested Name: ${u.suggestedSettingName}`);
    }
    console.log('\n');
  }

  // Apply updates if not dry run
  if (!dryRun) {
    console.log('='.repeat(80));
    console.log('APPLYING UPDATES');
    console.log('='.repeat(80) + '\n');

    let successCount = 0;
    let failCount = 0;

    // Only apply high and medium confidence updates in non-dry-run mode
    const updatesToApply = [...highConfidence, ...mediumConfidence];

    for (const update of updatesToApply) {
      try {
        await prisma.m365Setting.update({
          where: { id: update.id },
          data: { settingName: update.suggestedSettingName },
        });

        successCount++;
        if (successCount % 10 === 0) {
          process.stdout.write(`\rUpdated: ${successCount}/${updatesToApply.length}`);
        }
      } catch (error: any) {
        console.error(`\n❌ Failed to update ${update.displayName}: ${error.message}`);
        failCount++;
      }
    }

    console.log(`\n\nResults: ${successCount} successful, ${failCount} failed`);
    console.log('\n✅ settingName population complete!\n');
  } else {
    console.log('='.repeat(80));
    console.log('DRY RUN - No changes made');
    console.log('Run without --dry-run to apply high and medium confidence updates');
    console.log('='.repeat(80) + '\n');
  }

  await prisma.$disconnect();
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--apply'); // Dry run unless --apply is specified

// Run the population
populateSettingNames(dryRun).catch((error) => {
  console.error('Population failed:', error);
  process.exit(1);
});
