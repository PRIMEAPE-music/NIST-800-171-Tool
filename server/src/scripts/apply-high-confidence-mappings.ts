/**
 * Apply High-Confidence Reverse Mappings
 *
 * Applies the 31 high-confidence mapping suggestions from reverse mapping analysis
 *
 * Run with: npx tsx server/src/scripts/apply-high-confidence-mappings.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const mappings = [
  { id: 340, settingName: 'passwordMinimumLength', displayName: 'Intune - Minimum Password Length (iOS)' },
  { id: 637, settingName: 'passwordMinimumLength', displayName: 'Intune - Minimum Password Length (Windows)' },
  { id: 548, settingName: 'disableAppEncryptionIfDeviceEncryptionIsEnabled', displayName: 'Enable Office Message Encryption (OME)' },
  { id: 334, settingName: 'allowedToSignUpEmailBasedSubscriptions', displayName: 'Allow Email-Based Subscriptions' },
  { id: 82, settingName: 'conditions.userRiskLevels', displayName: 'User Risk Policy - Require Password Change on High Risk' },
  { id: 298, settingName: 'qualityUpdatesDeferralPeriodInDays', displayName: 'Windows Update for Business - Automatic Quality Updates' },
  { id: 81, settingName: 'conditions.signInRiskLevels', displayName: 'Sign-In Risk Policy - Require MFA on Medium/High Risk' },
  { id: 293, settingName: 'osMinimumVersion', displayName: 'Minimum TLS Version 1.2' },
  { id: 331, settingName: 'passwordPreviousPasswordBlockCount', displayName: 'Intune - Password History Count (Windows)' },
  { id: 16, settingName: 'passwordBlockSimple', displayName: 'Intune - Block Simple Passwords (iOS)' },
  { id: 566, settingName: 'userWindowsUpdateScanAccess', displayName: 'Windows Update Automatic Updates Enabled' },
  { id: 294, settingName: 'minimumRequiredPatchVersion', displayName: 'Microsoft Edge Minimum SSL Version' },
  { id: 127, settingName: 'minimumRequiredPatchVersion', displayName: 'Enforce Minimum OS Version for Mobile Devices' },
  { id: 336, settingName: 'blockMsolPowerShell', displayName: 'Block MSOL PowerShell' },
  { id: 427, settingName: 'passwordMinimumLength', displayName: 'Windows Hello - Minimum PIN Length' },
  { id: 602, settingName: 'userWindowsUpdateScanAccess', displayName: 'Windows Autopatch - Automated Update Management' },
  { id: 317, settingName: 'userWindowsUpdateScanAccess', displayName: 'Configure Automatic Windows Updates' },
  { id: 125, settingName: 'deviceComplianceRequired', displayName: 'Require Compliant Device for Wi-Fi Network Access' },
  { id: 320, settingName: 'defaultUserRolePermissions.permissionGrantPoliciesAssigned', displayName: 'Create OAuth App Permission Policies' },
  { id: 645, settingName: 'fingerprintBlocked', displayName: 'Intune MAM - Block Print of Org Data' },
  { id: 184, settingName: 'featureUpdatesPauseExpiryDateTime', displayName: 'Windows Update Pause - Emergency Change Control' },
  { id: 663, settingName: 'userWindowsUpdateScanAccess', displayName: 'Windows Update Reports - Impact Analysis Dashboard' },
  { id: 350, settingName: 'periodOfflineBeforeWipeIsEnforced', displayName: 'Intune App Protection - Offline Grace Period' },
  { id: 329, settingName: 'passwordExpirationDays', displayName: 'Intune - Password Complexity (Windows)' },
  { id: 362, settingName: 'appDataEncryptionType', displayName: 'Mail Flow Rule Encryption Action' },
  { id: 428, settingName: 'passwordMinutesOfInactivityBeforeLock', displayName: 'Maximum Minutes of Inactivity Until Screen Locks (iOS)' },
  { id: 430, settingName: 'passwordMinutesOfInactivityBeforeLock', displayName: 'Maximum Minutes of Inactivity Until Screen Locks (Android)' },
  { id: 148, settingName: 'passwordPreviousPasswordBlockCount', displayName: 'Windows LAPS (Local Administrator Password Solution)' },
  { id: 511, settingName: 'appDataEncryptionType', displayName: 'TLS Encryption for Password Transmission' },
  { id: 178, settingName: 'passwordMinimumCharacterSetCount', displayName: 'Windows Hello for Business Password Complexity' },
  { id: 144, settingName: 'userWindowsUpdateScanAccess', displayName: 'Windows Autopilot Standard User Provisioning' }
];

async function applyMappings() {
  console.log('\n' + '='.repeat(80));
  console.log('APPLYING HIGH-CONFIDENCE REVERSE MAPPINGS');
  console.log('='.repeat(80) + '\n');

  console.log(`Applying ${mappings.length} high-confidence (>70%) mappings...\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const mapping of mappings) {
    try {
      // Get current setting
      const setting = await prisma.m365Setting.findUnique({
        where: { id: mapping.id },
        select: { id: true, displayName: true, settingName: true }
      });

      if (!setting) {
        console.log(`⚠️  Setting ${mapping.id} not found - skipping`);
        skipCount++;
        continue;
      }

      // Apply update
      await prisma.m365Setting.update({
        where: { id: mapping.id },
        data: { settingName: mapping.settingName }
      });

      console.log(`✓ [${mapping.id}] ${setting.displayName}`);
      console.log(`  ${setting.settingName || 'NULL'} → ${mapping.settingName}`);
      successCount++;

    } catch (error) {
      console.error(`❌ Failed to update setting ${mapping.id}:`, error);
      errorCount++;
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('RESULTS');
  console.log(`${'='.repeat(80)}`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Skipped: ${skipCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Total: ${mappings.length}`);
  console.log('');

  if (successCount > 0) {
    console.log('✓ Mappings applied successfully!');
    console.log('\nNext steps:');
    console.log('  1. Rebuild compliance checks: npx tsx src/scripts/rebuild-compliance-checks.ts');
    console.log('  2. Measure results: npx tsx src/scripts/final-coverage-analysis.ts');
    console.log('  3. Compare with baseline (5.5% match rate, 25 settings matched)');
  }

  await prisma.$disconnect();
}

applyMappings().catch(console.error);
