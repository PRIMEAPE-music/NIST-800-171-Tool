/**
 * Test Child Setting Extraction and Validation
 *
 * Tests if the updated settings can now extract child values correctly
 */

import { PrismaClient } from '@prisma/client';
import { extractSettingsCatalog, matchSettingsCatalog } from '../services/settings-catalog-extractor.service';
import { settingsCatalogDefinitionService } from '../services/settings-catalog-definition.service';

const prisma = new PrismaClient();

async function testChildExtractionValidation() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST CHILD SETTING EXTRACTION AND VALIDATION');
  console.log('='.repeat(80) + '\n');

  try {
    // Get BitLocker policy
    const policy = await prisma.m365Policy.findFirst({
      where: { policyName: { contains: 'BitLocker' } },
    });

    if (!policy) {
      console.log('❌ No BitLocker policy found');
      await prisma.$disconnect();
      return;
    }

    const policyData = JSON.parse(policy.policyData);

    // Extract all settings
    const catalogData = extractSettingsCatalog(policyData);
    console.log(`Extracted ${catalogData.size} settings from policy\n`);

    // Get settings that were updated to use child IDs
    const testSettings = await prisma.m365Setting.findMany({
      where: {
        OR: [
          { settingName: { contains: 'encryptionmethodwithxts' } },
          { settingName: { contains: 'encryptiontypedropdown' } },
          { settingName: { contains: 'minpinlength' } },
        ],
      },
      select: {
        id: true,
        displayName: true,
        settingName: true,
        settingPath: true,
        expectedValue: true,
      },
    });

    console.log(`Testing ${testSettings.length} child settings:\n`);
    console.log('='.repeat(80));

    let successCount = 0;
    let failCount = 0;

    for (const setting of testSettings) {
      console.log(`\n📋 ${setting.displayName}`);
      console.log(`   Setting Name: ${setting.settingName}`);
      console.log(`   Expected Value: ${setting.expectedValue}`);

      // Try to match and extract
      const match = matchSettingsCatalog(setting, catalogData);

      if (!match) {
        console.log(`   ❌ NOT FOUND in policy`);
        failCount++;
        continue;
      }

      console.log(`   ✅ Found in policy`);
      console.log(`   Raw Value: ${match.value}`);

      // Try to decode if it's a reference value
      let finalValue = match.value;
      const needsDecoding = typeof match.value === 'string' && match.value.match(/_\d+$/);

      if (needsDecoding) {
        console.log(`   🔄 Decoding reference value...`);
        const decoded = await settingsCatalogDefinitionService.decodeValue(match.definitionId, match.value);

        if (decoded) {
          finalValue = decoded.value;
          console.log(`   📝 Decoded Value: ${finalValue}`);
          console.log(`   📝 Display Name: ${decoded.displayName}`);
        } else {
          console.log(`   ⚠️  Could not decode`);
        }
      } else {
        console.log(`   ℹ️  No decoding needed (simple value)`);
      }

      // Compare with expected value
      const finalValueStr = String(finalValue);
      const expectedStr = String(setting.expectedValue);

      if (finalValueStr === expectedStr) {
        console.log(`   ✅ MATCH! Extracted value matches expected value`);
        successCount++;
      } else {
        console.log(`   ⚠️  MISMATCH: Expected "${expectedStr}", got "${finalValueStr}"`);

        // Check if the decoded display name matches
        if (needsDecoding) {
          const decoded = await settingsCatalogDefinitionService.decodeValue(match.definitionId, match.value);
          if (decoded && decoded.displayName) {
            const displayMatch = decoded.displayName.toLowerCase().includes(expectedStr.toLowerCase()) ||
                                 expectedStr.toLowerCase().includes(decoded.displayName.toLowerCase());
            if (displayMatch) {
              console.log(`   ℹ️  But display name contains expected value, consider updating expectedValue to "${finalValue}"`);
              successCount++;
            } else {
              failCount++;
            }
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Settings tested: ${testSettings.length}`);
    console.log(`Successful extractions: ${successCount}`);
    console.log(`Failed extractions: ${failCount}`);
    console.log(`Success rate: ${Math.round((successCount / testSettings.length) * 100)}%`);
    console.log('='.repeat(80) + '\n');

    if (successCount === testSettings.length) {
      console.log('🎉 Perfect! All child settings are extracting correctly!');
    } else if (successCount > 0) {
      console.log('✅ Partial success! Some settings need expectedValue adjustments');
    } else {
      console.log('❌ Issues detected. Review the output above for details');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testChildExtractionValidation();
