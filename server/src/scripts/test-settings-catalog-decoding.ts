/**
 * Test Settings Catalog Decoding
 *
 * Tests the enhanced Settings Catalog extractor with automatic
 * value decoding against real BitLocker and other Settings Catalog policies
 *
 * Run with: npx tsx server/src/scripts/test-settings-catalog-decoding.ts
 */

import { PrismaClient } from '@prisma/client';
import { settingsCatalogDefinitionService } from '../services/settings-catalog-definition.service';
import { smartExtractor } from '../services/smart-extractor.service';

const prisma = new PrismaClient();

async function testDecoding() {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING SETTINGS CATALOG DECODING');
  console.log('='.repeat(80) + '\n');

  // Test 1: Direct definition lookup
  console.log('TEST 1: Direct Definition Lookup');
  console.log('-'.repeat(80));

  const testDefinitionId = 'device_vendor_msft_bitlocker_requiredeviceencryption';
  console.log(`Fetching definition: ${testDefinitionId}`);

  try {
    const definition = await settingsCatalogDefinitionService.getDefinition(testDefinitionId);
    if (definition) {
      console.log('✅ Definition retrieved successfully');
      console.log(`   Display Name: ${definition.displayName}`);
      console.log(`   Description: ${definition.description}`);
      console.log(`   Options: ${definition.options?.length || 0}`);
    } else {
      console.log('⚠️  Definition not found (this is okay if setting doesnt exist)');
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log('');

  // Test 2: Value decoding
  console.log('TEST 2: Reference Value Decoding');
  console.log('-'.repeat(80));

  const testValues = [
    {
      definitionId: 'device_vendor_msft_bitlocker_requiredeviceencryption',
      value: 'device_vendor_msft_bitlocker_requiredeviceencryption_1',
    },
    {
      definitionId: 'device_vendor_msft_bitlocker_systemdrivesencryptiontype',
      value: 'device_vendor_msft_bitlocker_systemdrivesencryptiontype_1',
    },
    {
      definitionId: 'device_vendor_msft_bitlocker_fixeddrivesencryptiontype',
      value: 'device_vendor_msft_bitlocker_fixeddrivesencryptiontype_1',
    },
  ];

  for (const test of testValues) {
    console.log(`\nDecoding: ${test.value}`);
    const decoded = await settingsCatalogDefinitionService.decodeValue(test.definitionId, test.value);

    if (decoded) {
      console.log(`  ✅ Decoded Value: ${JSON.stringify(decoded.value)}`);
      console.log(`     Display Name: ${decoded.displayName || 'N/A'}`);
      console.log(`     Description: ${decoded.description || 'N/A'}`);
    } else {
      console.log(`  ❌ Failed to decode`);
    }
  }

  console.log('\n');

  // Test 3: Full policy extraction
  console.log('TEST 3: Full Policy Extraction with Decoding');
  console.log('-'.repeat(80));

  const bitlockerPolicy = await prisma.m365Policy.findFirst({
    where: {
      policyName: { contains: 'BitLocker' },
    },
  });

  if (bitlockerPolicy) {
    console.log(`\nTesting policy: ${bitlockerPolicy.policyName}`);
    console.log(`Policy ID: ${bitlockerPolicy.id}`);

    // Get relevant settings
    const settings = await prisma.m365Setting.findMany({
      where: {
        policyTemplate: bitlockerPolicy.odataType,
        isActive: true,
      },
      take: 10,
    });

    console.log(`\nExtracting ${settings.length} settings...`);

    const results = await smartExtractor.extractBatch(bitlockerPolicy, settings);

    let decodedCount = 0;
    let successCount = 0;

    for (const [settingId, extraction] of results.entries()) {
      const setting = settings.find((s) => s.id === settingId);
      if (!setting) continue;

      const wasExtracted = extraction.value !== null && extraction.strategy !== 'none';

      if (wasExtracted) {
        successCount++;

        // Check if it was decoded
        if (extraction.path?.includes('decoded')) {
          decodedCount++;
        }

        console.log(`\n  ✅ ${setting.displayName}`);
        console.log(`     Strategy: ${extraction.strategy}`);
        console.log(`     Confidence: ${(extraction.confidence * 100).toFixed(0)}%`);
        console.log(`     Value: ${JSON.stringify(extraction.value)}`);
        if (extraction.path?.includes('decoded')) {
          console.log(`     🔓 DECODED from reference`);
        }
      }
    }

    console.log('\n' + '-'.repeat(80));
    console.log(`RESULTS: ${successCount}/${settings.length} extracted`);
    console.log(`DECODED: ${decodedCount} values decoded from references`);
  } else {
    console.log('⚠️  No BitLocker policy found in database');
  }

  // Test 4: Cache statistics
  console.log('\n' + '='.repeat(80));
  console.log('CACHE STATISTICS');
  console.log('='.repeat(80));

  const cacheStats = settingsCatalogDefinitionService.getCacheStats();
  console.log(`Cache size: ${cacheStats.size} definitions`);
  console.log(`Cache age: ${Math.round(cacheStats.age / 1000)}s`);
  console.log(`Cache expired: ${cacheStats.expired ? 'Yes' : 'No'}`);

  console.log('\n' + '='.repeat(80));
  console.log('TESTS COMPLETE');
  console.log('='.repeat(80) + '\n');

  await prisma.$disconnect();
}

testDecoding().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
