/**
 * Decode BitLocker Child Settings
 *
 * Takes the child settings from flattenedSettings and decodes their values
 * to see the actual encryption methods, PIN configurations, etc.
 */

import { PrismaClient } from '@prisma/client';
import { settingsCatalogDefinitionService } from '../services/settings-catalog-definition.service';

const prisma = new PrismaClient();

async function decodeBitLockerChildSettings() {
  console.log('\n' + '='.repeat(80));
  console.log('DECODE BITLOCKER CHILD SETTINGS');
  console.log('='.repeat(80) + '\n');

  try {
    // Get BitLocker policy
    const policy = await prisma.m365Policy.findFirst({
      where: { policyName: { contains: 'BitLocker' } },
    });

    if (!policy) {
      console.log('❌ No BitLocker policy found in database');
      await prisma.$disconnect();
      return;
    }

    const policyData = JSON.parse(policy.policyData);

    if (!policyData.flattenedSettings) {
      console.log('❌ No flattened settings found');
      await prisma.$disconnect();
      return;
    }

    console.log(`Found ${policyData.flattenedSettings.length} flattened settings\n`);

    // Focus on child settings (those with parentId)
    const childSettings = policyData.flattenedSettings.filter((s: any) => s.parentId);

    console.log('='.repeat(80));
    console.log(`DECODING ${childSettings.length} CHILD SETTINGS`);
    console.log('='.repeat(80) + '\n');

    for (const setting of childSettings) {
      const shortId = setting.settingDefinitionId.split('_').slice(-2).join('_');

      console.log(`📋 ${shortId}`);
      console.log(`   Full ID: ${setting.settingDefinitionId}`);
      console.log(`   Raw Value: ${setting.value}`);
      console.log(`   Type: ${setting.type}`);
      console.log(`   Depth: ${setting.depth}`);

      // Try to decode the value
      if (setting.type === 'choice' && typeof setting.value === 'string') {
        try {
          const decoded = await settingsCatalogDefinitionService.decodeValue(
            setting.settingDefinitionId,
            setting.value
          );

          if (decoded) {
            console.log(`   ✅ Decoded: ${decoded.value}`);
            if (decoded.displayName) {
              console.log(`   📝 Display: ${decoded.displayName}`);
            }
            if (decoded.description) {
              console.log(`   ℹ️  Description: ${decoded.description}`);
            }
          } else {
            console.log(`   ⚠️  Could not decode (no match found)`);
          }
        } catch (error: any) {
          console.log(`   ❌ Decode error: ${error.message}`);
        }
      } else if (setting.type === 'simple') {
        console.log(`   ℹ️  Simple value (no decoding needed): ${setting.value}`);
      }

      console.log('');
    }

    // Highlight key findings
    console.log('='.repeat(80));
    console.log('KEY CONFIGURATION DETAILS');
    console.log('='.repeat(80) + '\n');

    // Find encryption method settings
    const encryptionSettings = childSettings.filter(
      (s: any) =>
        s.settingDefinitionId.includes('encryptionmethodwithxts') ||
        s.settingDefinitionId.includes('encryptiontype')
    );

    if (encryptionSettings.length > 0) {
      console.log('🔐 Encryption Method Settings:');
      for (const setting of encryptionSettings) {
        const decoded = await settingsCatalogDefinitionService.decodeValue(
          setting.settingDefinitionId,
          setting.value
        );
        console.log(`   ${setting.settingDefinitionId.split('_').pop()}: ${decoded?.value || setting.value}`);
      }
      console.log('');
    }

    // Find PIN settings
    const pinSettings = childSettings.filter(
      (s: any) =>
        s.settingDefinitionId.includes('pin') || s.settingDefinitionId.includes('minlength')
    );

    if (pinSettings.length > 0) {
      console.log('🔢 PIN Configuration:');
      for (const setting of pinSettings) {
        if (setting.type === 'simple') {
          console.log(`   ${setting.settingDefinitionId.split('_').pop()}: ${setting.value}`);
        } else {
          const decoded = await settingsCatalogDefinitionService.decodeValue(
            setting.settingDefinitionId,
            setting.value
          );
          console.log(
            `   ${setting.settingDefinitionId.split('_').pop()}: ${decoded?.value || setting.value}`
          );
        }
      }
      console.log('');
    }

    // Find TPM settings
    const tpmSettings = childSettings.filter((s: any) => s.settingDefinitionId.includes('tpm'));

    if (tpmSettings.length > 0) {
      console.log('🔒 TPM Configuration:');
      for (const setting of tpmSettings) {
        const decoded = await settingsCatalogDefinitionService.decodeValue(
          setting.settingDefinitionId,
          setting.value
        );
        console.log(`   ${setting.settingDefinitionId.split('_').pop()}: ${decoded?.value || setting.value}`);
      }
      console.log('');
    }

    // Find recovery settings
    const recoverySettings = childSettings.filter((s: any) => s.settingDefinitionId.includes('recovery'));

    if (recoverySettings.length > 0) {
      console.log('🔑 Recovery Options:');
      for (const setting of recoverySettings) {
        const decoded = await settingsCatalogDefinitionService.decodeValue(
          setting.settingDefinitionId,
          setting.value
        );
        console.log(`   ${setting.settingDefinitionId.split('_').pop()}: ${decoded?.value || setting.value}`);
      }
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log('\nThese child settings contain the DETAILED configuration values you need!');
    console.log('Next step: Update the extraction logic to search flattenedSettings array');
    console.log('instead of just top-level settings.\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

decodeBitLockerChildSettings();
