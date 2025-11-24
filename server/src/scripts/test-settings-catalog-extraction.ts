/**
 * Test Settings Catalog Extraction
 * Manually test the Settings Catalog extractor with the BitLocker policy
 */

import { PrismaClient } from '@prisma/client';
import { extractSettingsCatalog, matchSettingsCatalog } from '../services/settings-catalog-extractor.service.js';

const prisma = new PrismaClient();

async function testExtraction() {
  // Get the BitLocker policy
  const policy = await prisma.m365Policy.findFirst({
    where: {
      policyName: {
        contains: 'BitLocker'
      }
    }
  });

  if (!policy) {
    console.log('BitLocker policy not found');
    await prisma.$disconnect();
    return;
  }

  // Parse policy data
  let policyData: any;
  try {
    policyData = typeof policy.policyData === 'string'
      ? JSON.parse(policy.policyData)
      : policy.policyData;
  } catch (error) {
    console.log('Failed to parse policy data:', error);
    await prisma.$disconnect();
    return;
  }

  console.log('\n='.repeat(80));
  console.log('TESTING SETTINGS CATALOG EXTRACTION');
  console.log('='.repeat(80) + '\n');

  // Extract all settings from the catalog
  const catalogData = extractSettingsCatalog(policyData);

  console.log(`Extracted ${catalogData.size} settings from catalog:\n`);
  for (const [definitionId, result] of Array.from(catalogData.entries()).slice(0, 10)) {
    console.log(`  ${definitionId}`);
    console.log(`    Value: ${JSON.stringify(result.value).substring(0, 80)}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('TESTING MATCHING');
  console.log('='.repeat(80) + '\n');

  // Get some database settings for this template
  const dbSettings = await prisma.m365Setting.findMany({
    where: {
      policyTemplate: policy.odataType,
      isActive: true
    },
    select: {
      id: true,
      displayName: true,
      settingName: true,
      settingPath: true
    },
    take: 10
  });

  console.log(`Testing ${dbSettings.length} database settings:\n`);

  let matchCount = 0;
  for (const setting of dbSettings) {
    console.log(`Testing: ${setting.displayName}`);
    console.log(`  settingPath: ${setting.settingPath}`);
    console.log(`  settingName: ${setting.settingName || 'NULL'}`);

    const match = matchSettingsCatalog(setting, catalogData);

    if (match) {
      console.log(`  ✅ MATCHED: ${match.definitionId}`);
      console.log(`  Value: ${JSON.stringify(match.value)}`);
      matchCount++;
    } else {
      console.log(`  ❌ NO MATCH`);
    }
    console.log('');
  }

  console.log('='.repeat(80));
  console.log(`RESULTS: ${matchCount}/${dbSettings.length} matched`);
  console.log('='.repeat(80) + '\n');

  await prisma.$disconnect();
}

testExtraction().catch(console.error);
