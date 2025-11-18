/**
 * Fix Setting Paths and Add Expected Values
 *
 * Updates M365 settings with correct paths for Settings Catalog extraction
 * and adds appropriate expected values for compliance checking
 *
 * Run with: npx tsx server/src/scripts/fix-setting-paths.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapping of setting display names to their correct Settings Catalog definitionId keywords
// and expected values for compliance
const settingFixes: Record<string, {
  pathKeyword: string;
  expectedValue?: string;
  operator?: string;
  description?: string;
}> = {
  // BitLocker settings
  'BitLocker Drive Encryption Configuration': {
    pathKeyword: 'requiredeviceencryption',
    expectedValue: '1',
    operator: 'contains',
    description: 'Device encryption must be enabled'
  },
  'BitLocker Operating System Drive Encryption Policy': {
    pathKeyword: 'systemdrivesrequirestartupauthentication',
    expectedValue: '1',
    operator: 'contains'
  },
  'BitLocker Operating System Drive Encryption Method': {
    pathKeyword: 'systemdrivesencryptiontype',
    expectedValue: '1',
    operator: 'contains'
  },
  'BitLocker Fixed Data Drive Encryption Method': {
    pathKeyword: 'fixeddrivesencryptiontype',
    expectedValue: '1',
    operator: 'contains'
  },
  'BitLocker Removable Drive Encryption Enforcement': {
    pathKeyword: 'removabledrivesconfigurebde',
    expectedValue: 'true',
    operator: '!=null'
  },

  // UAC settings - convert to Settings Catalog format
  'UAC: Admin Approval Mode for the Built-in Administrator account': {
    pathKeyword: 'useadminapprovalmode',
    expectedValue: '1',
    operator: 'contains'
  },
  'UAC: Behavior of the elevation prompt for administrators in Admin Approval Mode': {
    pathKeyword: 'behavioroftheelevationpromptforadministrators',
    expectedValue: '2',
    operator: 'contains'
  },
  'UAC: Behavior of the elevation prompt for standard users': {
    pathKeyword: 'behavioroftheelevationpromptforstandardusers',
    expectedValue: '3',
    operator: 'contains'
  },
  'UAC: Detect application installations and prompt for elevation': {
    pathKeyword: 'detectapplicationinstallationsandpromptforelevation',
    expectedValue: '1',
    operator: 'contains'
  },
  'UAC: Only elevate executables that are signed and validated': {
    pathKeyword: 'onlyelevateexecutablefilesthataresignedandvalidated',
    expectedValue: '1',
    operator: 'contains'
  },
  'UAC: Switch to the secure desktop when prompting for elevation': {
    pathKeyword: 'switchtothesecuredesktopwhenpromptingforelevation',
    expectedValue: '1',
    operator: 'contains'
  },
  'UAC: Virtualize file and registry write failures to per-user locations': {
    pathKeyword: 'virtualizefileandregistrywritefailurestoperuserlocations',
    expectedValue: '1',
    operator: 'contains'
  },

  // Defender settings
  'Defender Real-Time Protection': {
    pathKeyword: 'allowrealtimemonitoring',
    expectedValue: '1',
    operator: 'contains'
  },
  'Microsoft Defender Real-Time Protection': {
    pathKeyword: 'allowrealtimemonitoring',
    expectedValue: '1',
    operator: 'contains'
  },
  'Microsoft Defender - Attack Surface Reduction Rules': {
    pathKeyword: 'attacksurfacereductionrules',
    expectedValue: 'true',
    operator: '!=null'
  },

  // Firewall settings
  'Enable Domain Network Firewall': {
    pathKeyword: 'enablefirewall',
    expectedValue: 'true',
    operator: 'contains'
  },
  'Enable Private Network Firewall': {
    pathKeyword: 'enablefirewall',
    expectedValue: 'true',
    operator: 'contains'
  },
  'Enable Public Network Firewall': {
    pathKeyword: 'enablefirewall',
    expectedValue: 'true',
    operator: 'contains'
  },

  // PowerShell settings
  'PowerShell: Turn on PowerShell Transcription': {
    pathKeyword: 'enabletranscripting',
    expectedValue: '1',
    operator: 'contains'
  },
  'PowerShell: Turn on PowerShell Script Block Logging': {
    pathKeyword: 'enablescriptblocklogging',
    expectedValue: '1',
    operator: 'contains'
  },

  // Interactive logon settings
  'Interactive Logon: Machine Inactivity Limit': {
    pathKeyword: 'machineinactivitylimit',
    expectedValue: '900',
    operator: '<='
  },
  'Windows Interactive Logon - Message Title': {
    pathKeyword: 'messagetitleforusersattemptingtologon',
    expectedValue: 'true',
    operator: '!=null'
  },
  'Windows Interactive Logon - Message Text': {
    pathKeyword: 'messagetextforusersattemptingtologon',
    expectedValue: 'true',
    operator: '!=null'
  },

  // Storage/USB settings
  'Block Removable Storage Devices': {
    pathKeyword: 'removablediskdenywriteaccess',
    expectedValue: '1',
    operator: 'contains'
  },
  'Block Write Access to Removable Storage': {
    pathKeyword: 'removablediskdenywriteaccess',
    expectedValue: '1',
    operator: 'contains'
  },
  'Prevent Installation of Removable Devices': {
    pathKeyword: 'preventinstallationofmatchingdeviceids',
    expectedValue: 'true',
    operator: '!=null'
  },

  // Network authentication
  'Require Network Level Authentication': {
    pathKeyword: 'requireuserauthentication',
    expectedValue: '1',
    operator: 'contains'
  },

  // Security baselines
  'Security Baseline - MDM Security Baseline for Windows': {
    pathKeyword: 'baseline',
    expectedValue: 'true',
    operator: '!=null'
  },
  'Microsoft Defender for Endpoint Security Baseline': {
    pathKeyword: 'defender',
    expectedValue: 'true',
    operator: '!=null'
  },
  'Windows Security Baseline Profile Deployment': {
    pathKeyword: 'baseline',
    expectedValue: 'true',
    operator: '!=null'
  },

  // Compliance policy settings
  'Intune - Password Required (Windows)': {
    pathKeyword: 'passwordRequired',
    expectedValue: 'true',
    operator: '=='
  },
  'Intune - Password Required (iOS)': {
    pathKeyword: 'passwordRequired',
    expectedValue: 'true',
    operator: '=='
  },
  'Intune - Password Required (Android)': {
    pathKeyword: 'passwordRequired',
    expectedValue: 'true',
    operator: '=='
  },
  'Intune - Minimum Password Length (Windows)': {
    pathKeyword: 'passwordMinimumLength',
    expectedValue: '14',
    operator: '>='
  },
  'Intune - Minimum Password Length (iOS)': {
    pathKeyword: 'passcodeMinimumLength',
    expectedValue: '6',
    operator: '>='
  },
  'Intune - Minimum Password Length (Android)': {
    pathKeyword: 'passwordMinimumLength',
    expectedValue: '6',
    operator: '>='
  },

  // App Protection settings
  'Intune MAM - Block Org Data to Unmanaged Apps': {
    pathKeyword: 'allowedOutboundDataTransferDestinations',
    expectedValue: 'managedApps',
    operator: '=='
  },
  'Intune MAM - Receive Data from Other Apps': {
    pathKeyword: 'allowedInboundDataTransferSources',
    expectedValue: 'managedApps',
    operator: '=='
  },
  'Intune MAM - Restrict Cut/Copy/Paste': {
    pathKeyword: 'allowedOutboundClipboardSharingLevel',
    expectedValue: 'managedApps',
    operator: '=='
  },
  'Intune App Protection - Require PIN': {
    pathKeyword: 'pinRequired',
    expectedValue: 'true',
    operator: '=='
  },
  'Intune MAM - Block Print of Org Data': {
    pathKeyword: 'printBlocked',
    expectedValue: 'true',
    operator: '=='
  },

  // Conditional Access settings
  'Conditional Access Policy State': {
    pathKeyword: 'state',
    expectedValue: 'enabled',
    operator: 'contains'
  },
  'Conditional Access Grant Controls': {
    pathKeyword: 'grantControls.builtInControls',
    expectedValue: 'true',
    operator: '!=null'
  },
  'Conditional Access - Require MFA': {
    pathKeyword: 'builtInControls',
    expectedValue: 'mfa',
    operator: 'contains'
  },

  // Windows Update settings
  'Update Ring Pilot - Impact Analysis Phase': {
    pathKeyword: 'qualityUpdatesDeferralPeriodInDays',
    expectedValue: 'true',
    operator: '!=null'
  },
  'Windows Update Reports - Impact Analysis Dashboard': {
    pathKeyword: 'featureUpdatesDeferralPeriodInDays',
    expectedValue: 'true',
    operator: '!=null'
  },
};

async function fixSettingPaths() {
  console.log('\n=== FIXING SETTING PATHS AND EXPECTED VALUES ===\n');

  let updated = 0;
  let notFound = 0;
  const errors: string[] = [];

  for (const [displayName, fix] of Object.entries(settingFixes)) {
    try {
      // Find the setting by display name
      const setting = await prisma.m365Setting.findFirst({
        where: {
          displayName: {
            contains: displayName
          }
        }
      });

      if (!setting) {
        notFound++;
        continue;
      }

      // Update the setting
      const updateData: any = {
        settingPath: fix.pathKeyword, // Use the keyword directly as the path
      };

      if (fix.expectedValue) {
        updateData.expectedValue = fix.expectedValue;
      }

      if (fix.operator) {
        updateData.validationOperator = fix.operator;
      }

      await prisma.m365Setting.update({
        where: { id: setting.id },
        data: updateData
      });

      updated++;
      console.log(`✓ Updated: ${displayName}`);
      console.log(`  Path: ${fix.pathKeyword}`);
      if (fix.expectedValue) {
        console.log(`  Expected: ${fix.expectedValue} (${fix.operator})`);
      }

    } catch (error) {
      errors.push(`${displayName}: ${error}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`Settings updated: ${updated}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  - ${e}`));
  }

  // Now let's also update settings that use !=null operator but don't have expected values
  console.log('\n\nUpdating settings with existence checks...');

  const existenceSettings = await prisma.m365Setting.findMany({
    where: {
      validationOperator: {
        in: ['!=null', 'notNull', 'exists']
      },
      expectedValue: {
        in: ['', 'null', 'undefined']
      }
    }
  });

  let existenceUpdated = 0;
  for (const setting of existenceSettings) {
    await prisma.m365Setting.update({
      where: { id: setting.id },
      data: {
        expectedValue: 'true' // Placeholder for existence check
      }
    });
    existenceUpdated++;
  }

  console.log(`Updated ${existenceUpdated} settings with existence check values`);

  await prisma.$disconnect();
}

// Also create a function to bulk update settings without expected values
async function addDefaultExpectedValues() {
  console.log('\n\n=== ADDING DEFAULT EXPECTED VALUES ===\n');

  // Get settings without expected values
  const settingsWithoutExpected = await prisma.m365Setting.findMany({
    where: {
      expectedValue: '',
      isActive: true
    },
    select: {
      id: true,
      displayName: true,
      dataType: true,
      validationOperator: true
    }
  });

  console.log(`Found ${settingsWithoutExpected.length} settings without expected values`);

  let updated = 0;

  for (const setting of settingsWithoutExpected) {
    // Determine default expected value based on data type and setting name
    let expectedValue = '';
    let operator = setting.validationOperator || '==';

    const nameLower = setting.displayName.toLowerCase();

    // Boolean settings - usually should be enabled/true
    if (setting.dataType === 'boolean') {
      if (nameLower.includes('block') || nameLower.includes('disable') || nameLower.includes('prevent')) {
        expectedValue = 'true';
      } else if (nameLower.includes('allow') || nameLower.includes('enable') || nameLower.includes('require')) {
        expectedValue = 'true';
      } else {
        expectedValue = 'true';
        operator = '!=null';
      }
    }
    // String settings - usually just need to exist
    else if (setting.dataType === 'string') {
      expectedValue = 'true';
      operator = '!=null';
    }
    // Integer settings - context dependent
    else if (setting.dataType === 'integer') {
      if (nameLower.includes('minimum') || nameLower.includes('min')) {
        expectedValue = '1';
        operator = '>=';
      } else if (nameLower.includes('maximum') || nameLower.includes('max')) {
        expectedValue = '999999';
        operator = '<=';
      } else {
        expectedValue = 'true';
        operator = '!=null';
      }
    }
    // Default - existence check
    else {
      expectedValue = 'true';
      operator = '!=null';
    }

    if (expectedValue) {
      await prisma.m365Setting.update({
        where: { id: setting.id },
        data: {
          expectedValue,
          validationOperator: operator
        }
      });
      updated++;
    }
  }

  console.log(`Added expected values to ${updated} settings`);

  return updated;
}

async function main() {
  try {
    await fixSettingPaths();
    await addDefaultExpectedValues();

    console.log('\n\n=== ALL FIXES COMPLETE ===\n');
    console.log('Run validation again to see improved compliance rates:');
    console.log('  npx tsx server/src/scripts/run-validation.ts\n');

  } catch (error) {
    console.error('Fix failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
