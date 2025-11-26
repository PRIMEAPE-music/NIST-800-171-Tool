/**
 * Check Encryption Method Settings
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEncryptionSettings() {
  console.log('\n' + '='.repeat(80));
  console.log('ENCRYPTION METHOD SETTINGS CHECK');
  console.log('='.repeat(80) + '\n');

  const settings = await prisma.m365Setting.findMany({
    where: {
      OR: [
        { settingName: { contains: 'encryptionmethod' } },
        { displayName: { contains: 'Encryption Method' } },
        { displayName: { contains: 'XTS-AES' } },
        { displayName: { contains: 'AES-CBC' } },
      ],
    },
    orderBy: { displayName: 'asc' },
  });

  console.log(`Found ${settings.length} encryption method settings:\n`);

  settings.forEach((s, i) => {
    console.log(`[${i}] ${s.displayName}`);
    console.log(`    settingName: ${s.settingName || '(null)'}`);
    console.log(`    expectedValue: ${s.expectedValue}`);
    console.log(`    settingPath: ${s.settingPath}`);
    console.log('');
  });

  // Check for parent vs child setting names
  const parentSettings = settings.filter((s) =>
    s.settingName?.endsWith('encryptionmethodbydrivetype')
  );
  const childSettings = settings.filter((s) =>
    s.settingName?.includes('encryptionmethodwithxts')
  );

  console.log('='.repeat(80));
  console.log('ANALYSIS');
  console.log('='.repeat(80));
  console.log(`Settings using PARENT IDs (just "Enabled"): ${parentSettings.length}`);
  console.log(`Settings using CHILD IDs (detailed values): ${childSettings.length}`);
  console.log('='.repeat(80) + '\n');

  if (parentSettings.length > 0 && childSettings.length === 0) {
    console.log('⚠️  Settings are pointing to PARENT definition IDs');
    console.log('These will only extract "Enabled" not actual encryption methods\n');
    console.log('Solution: Update settingName to point to child definition IDs:');
    console.log('  - device_vendor_msft_bitlocker_encryptionmethodbydrivetype_encryptionmethodwithxtsosdropdown_name');
    console.log('  - device_vendor_msft_bitlocker_encryptionmethodbydrivetype_encryptionmethodwithxtsfdvdropdown_name');
    console.log('  - device_vendor_msft_bitlocker_encryptionmethodbydrivetype_encryptionmethodwithxtsrdvdropdown_name\n');
  } else if (childSettings.length > 0) {
    console.log('✅ Settings are already pointing to CHILD definition IDs');
    console.log('These will extract detailed encryption method values\n');
  }

  await prisma.$disconnect();
}

checkEncryptionSettings();
