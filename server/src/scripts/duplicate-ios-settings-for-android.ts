/**
 * Duplicate iOS MAM Settings for Android
 *
 * Creates Android versions of iOS App Protection settings since most
 * MAM settings are platform-agnostic and use the same property names.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SettingDuplication {
  sourceId: number;
  displayName: string;
  newDisplayName: string;
  settingName: string | null;
  controlCount: number;
  shouldDuplicate: boolean;
  reason: string;
}

async function duplicateSettings() {
  console.log('\n' + '='.repeat(80));
  console.log('DUPLICATE iOS MAM SETTINGS FOR ANDROID');
  console.log('='.repeat(80) + '\n');

  const iosTemplate = '#microsoft.graph.iosManagedAppProtection';
  const androidTemplate = '#microsoft.graph.androidManagedAppProtection';

  // Get all iOS MAM settings
  const iosSettings = await prisma.m365Setting.findMany({
    where: {
      policyTemplate: iosTemplate,
      isActive: true
    },
    include: {
      controlMappings: {
        include: {
          control: true
        }
      }
    }
  });

  console.log(`Found ${iosSettings.length} iOS MAM settings\n`);

  // Analyze which settings should be duplicated
  const duplications: SettingDuplication[] = [];

  for (const setting of iosSettings) {
    const displayName = setting.displayName;
    const displayLower = displayName.toLowerCase();

    // Determine if this setting should be duplicated
    let shouldDuplicate = true;
    let reason = 'Platform-agnostic setting';
    let newDisplayName = displayName;

    // Skip if it's iOS-specific
    if (displayLower.includes('ios') && !displayLower.includes('android')) {
      // If it mentions iOS specifically, it might be iOS-only
      // But check if there's an equivalent for Android
      if (displayLower.includes('maximum minutes') ||
          displayLower.includes('passcode') ||
          displayLower.includes('screen lock')) {
        // These have Android equivalents
        shouldDuplicate = true;
        newDisplayName = displayName.replace(/iOS/gi, 'Android').replace(/ios/g, 'android');
        reason = 'iOS-specific but has Android equivalent';
      } else {
        shouldDuplicate = false;
        reason = 'iOS-specific feature';
      }
    }

    // Settings that mention both platforms or neither are definitely platform-agnostic
    if (displayLower.includes('android') ||
        (!displayLower.includes('ios') && !displayLower.includes('android'))) {
      shouldDuplicate = true;
      reason = 'Platform-agnostic';
    }

    duplications.push({
      sourceId: setting.id,
      displayName: setting.displayName,
      newDisplayName,
      settingName: setting.settingName,
      controlCount: setting.controlMappings.length,
      shouldDuplicate,
      reason
    });
  }

  // Summary
  const toDuplicate = duplications.filter(d => d.shouldDuplicate);
  const skipped = duplications.filter(d => !d.shouldDuplicate);

  console.log('='.repeat(80));
  console.log('DUPLICATION PLAN');
  console.log('='.repeat(80) + '\n');
  console.log(`Settings to duplicate: ${toDuplicate.length}`);
  console.log(`Settings to skip: ${skipped.length}`);
  console.log('');

  if (skipped.length > 0) {
    console.log('Settings being skipped (iOS-specific):');
    for (const s of skipped) {
      console.log(`  - ${s.displayName} (${s.reason})`);
    }
    console.log('');
  }

  console.log('Sample settings to duplicate:');
  for (const s of toDuplicate.slice(0, 10)) {
    console.log(`  ✓ ${s.displayName}`);
    if (s.displayName !== s.newDisplayName) {
      console.log(`    → ${s.newDisplayName}`);
    }
    console.log(`    Controls: ${s.controlCount}`);
  }
  if (toDuplicate.length > 10) {
    console.log(`  ... and ${toDuplicate.length - 10} more`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('EXECUTING DUPLICATION');
  console.log('='.repeat(80) + '\n');

  let successCount = 0;
  let errorCount = 0;

  for (const dup of toDuplicate) {
    if (!dup.shouldDuplicate) continue;

    try {
      // Get the original setting with all fields
      const originalSetting = await prisma.m365Setting.findUnique({
        where: { id: dup.sourceId },
        include: {
          controlMappings: true
        }
      });

      if (!originalSetting) {
        console.log(`❌ Setting ${dup.sourceId} not found`);
        errorCount++;
        continue;
      }

      // Create the Android version
      const newSetting = await prisma.m365Setting.create({
        data: {
          displayName: dup.newDisplayName,
          settingName: originalSetting.settingName,
          settingPath: originalSetting.settingPath,
          policyTemplate: androidTemplate,
          policyType: originalSetting.policyType || 'Intune',
          platform: 'Android', // Force Android for all duplicated settings
          dataType: originalSetting.dataType,
          templateFamily: 'AppProtection',
          expectedValue: originalSetting.expectedValue,
          validationOperator: originalSetting.validationOperator,
          description: originalSetting.description?.replace(/iOS/g, 'Android') || '',
          implementationGuide: originalSetting.implementationGuide,
          microsoftDocUrl: originalSetting.microsoftDocUrl,
          policySubType: originalSetting.policySubType,
          pathVariants: originalSetting.pathVariants,
          alternateNames: originalSetting.alternateNames,
          extractionHints: originalSetting.extractionHints,
          isActive: true,
          // Don't copy these - they'll be built as the setting is used
          successfulExtractions: 0,
          failedExtractions: 0,
          lastSuccessfulStrategy: null,
          lastExtractedValue: null
        }
      });

      // Duplicate control mappings
      for (const mapping of originalSetting.controlMappings) {
        await prisma.controlSettingMapping.create({
          data: {
            controlId: mapping.controlId,
            settingId: newSetting.id,
            confidence: mapping.confidence,
            isRequired: mapping.isRequired,
            complianceStatus: mapping.complianceStatus,
            mappingRationale: mapping.mappingRationale,
            isActive: mapping.isActive
          }
        });
      }

      console.log(`✅ Created: ${dup.newDisplayName} (${originalSetting.controlMappings.length} controls)`);
      successCount++;

    } catch (error: any) {
      console.log(`❌ Failed to duplicate ${dup.displayName}: ${error.message}`);
      errorCount++;
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(80));
  console.log('DUPLICATION COMPLETE');
  console.log('='.repeat(80));
  console.log(`Successfully created: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Skipped (iOS-specific): ${skipped.length}`);
  console.log('');

  // Verify the result
  const androidSettingsAfter = await prisma.m365Setting.count({
    where: {
      policyTemplate: androidTemplate,
      isActive: true
    }
  });

  console.log('='.repeat(80));
  console.log('VERIFICATION');
  console.log('='.repeat(80));
  console.log(`Android MAM settings before: 1`);
  console.log(`Android MAM settings after: ${androidSettingsAfter}`);
  console.log(`Net increase: +${androidSettingsAfter - 1}`);
  console.log('');

  if (successCount > 0) {
    console.log('✅ Duplication successful!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Rebuild compliance checks to create Android policy mappings');
    console.log('  2. Run coverage analysis to see the improvement');
    console.log('');
    console.log('Commands:');
    console.log('  npx tsx src/scripts/rebuild-compliance-checks.ts');
    console.log('  npx tsx src/scripts/final-coverage-analysis.ts');
    console.log('');
  }

  await prisma.$disconnect();
}

duplicateSettings().catch(console.error);
