/**
 * Test: Fetch BitLocker Policy with Child Settings
 *
 * Re-fetches the BitLocker policy from Microsoft Graph API
 * and extracts all nested child settings to see what's available
 */

import { graphClientService } from '../services/graphClient.service';
import { settingsHierarchyFlattenerService } from '../services/settings-hierarchy-flattener.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFetchBitLockerWithChildren() {
  console.log('\n' + '='.repeat(80));
  console.log('FETCH BITLOCKER POLICY WITH CHILD SETTINGS FROM API');
  console.log('='.repeat(80) + '\n');

  try {
    // Step 1: Get the BitLocker policy ID from database
    const policy = await prisma.m365Policy.findFirst({
      where: { policyName: { contains: 'BitLocker' } },
    });

    if (!policy) {
      console.log('❌ No BitLocker policy found in database');
      await prisma.$disconnect();
      return;
    }

    console.log(`Found policy in database: ${policy.policyName}`);
    console.log(`Policy ID: ${policy.policyId}\n`);

    // Step 2: Fetch policy settings directly from Microsoft Graph API
    console.log('📥 Fetching policy settings from Microsoft Graph API...\n');

    const settingsResponse = await graphClientService.getBeta<{ value: any[] }>(
      `/deviceManagement/configurationPolicies/${policy.policyId}/settings`
    );

    console.log(`✅ Fetched ${settingsResponse.value.length} settings from API\n`);

    // Step 3: Flatten the settings hierarchy to extract children
    console.log('🔍 Flattening settings hierarchy (extracting children)...\n');

    const flattenedSettings = settingsHierarchyFlattenerService.flattenPolicySettings(
      settingsResponse.value
    );

    console.log(`✅ Extracted ${flattenedSettings.length} total settings (including children)\n`);

    // Step 4: Show the difference
    const originalCount = settingsResponse.value.length;
    const childCount = flattenedSettings.length - originalCount;

    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Top-level settings: ${originalCount}`);
    console.log(`Child settings found: ${childCount}`);
    console.log(`Total flattened settings: ${flattenedSettings.length}`);
    console.log('='.repeat(80) + '\n');

    if (childCount > 0) {
      console.log('✅ SUCCESS! Child settings exist and were extracted!\n');
      console.log('Hierarchical view of settings:\n');
      console.log(settingsHierarchyFlattenerService.createHierarchy(flattenedSettings));
      console.log('\n');

      // Show detailed breakdown
      console.log('='.repeat(80));
      console.log('DETAILED SETTINGS LIST');
      console.log('='.repeat(80) + '\n');

      flattenedSettings.forEach((setting, i) => {
        const indent = '  '.repeat(setting.depth);
        const shortId = setting.settingDefinitionId.split('_').slice(-2).join('_');

        console.log(`[${i}] ${indent}${shortId}`);
        console.log(`    ${indent}Full ID: ${setting.settingDefinitionId}`);
        console.log(`    ${indent}Value: ${setting.value}`);
        console.log(`    ${indent}Type: ${setting.type}`);
        console.log(`    ${indent}Depth: ${setting.depth}`);
        if (setting.parentId) {
          const parentShort = setting.parentId.split('_').slice(-2).join('_');
          console.log(`    ${indent}Parent: ${parentShort}`);
        }
        console.log('');
      });
    } else {
      console.log('⚠️  No child settings found in API response\n');
      console.log('This means either:');
      console.log('1. The policy truly has no detailed child settings configured');
      console.log('2. The settings are using default values (not explicitly set)');
      console.log('3. The API requires additional parameters/permissions to return children\n');

      console.log('Top-level settings:');
      flattenedSettings.forEach((setting, i) => {
        console.log(`\n[${i}] ${setting.settingDefinitionId}`);
        console.log(`    Value: ${setting.value}`);
        console.log(`    Type: ${setting.type}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('NEXT STEPS');
    console.log('='.repeat(80));

    if (childCount > 0) {
      console.log('✅ Child settings were found! Next steps:');
      console.log('1. Update the sync service to flatten settings during sync');
      console.log('2. Update extraction logic to search flattened settings');
      console.log('3. Create M365Setting records for child settings');
      console.log('4. Re-run validation to extract detailed values\n');
    } else {
      console.log('⚠️  No child settings found. Next steps:');
      console.log('1. Check Intune portal - verify encryption method, PIN length, etc. are explicitly set');
      console.log('2. Try different API endpoints or query parameters');
      console.log('3. Check if Endpoint Security policies use different structure than Settings Catalog\n');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testFetchBitLockerWithChildren();
