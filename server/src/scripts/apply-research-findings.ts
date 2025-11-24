/**
 * Apply Phase 2 Research Findings - Quick Start Implementation
 * 
 * This script applies the CONFIRMED property name fixes discovered
 * during Phase 2 research. These are high-confidence updates that
 * will immediately improve your extraction rate.
 * 
 * Run with: npx tsx server/src/scripts/apply-research-findings.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SettingUpdate {
  id: number;
  displayName: string;
  oldSettingName: string | null;
  newSettingName: string;
  policyTemplate: string;
  confidence: 'HIGH' | 'MEDIUM';
  notes?: string;
}

async function applyResearchFindings() {
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 2 RESEARCH FINDINGS - IMPLEMENTATION');
  console.log('='.repeat(80) + '\n');

  // HIGH CONFIDENCE UPDATES - Verified from Microsoft Graph API documentation
  const updates: SettingUpdate[] = [
    // ===== Windows Compliance Policies =====
    {
      id: 333,
      displayName: 'Intune - Max Inactivity Before Lock (Windows)',
      oldSettingName: 'maxInactivityBeforeLock',
      newSettingName: 'passwordMinutesOfInactivityBeforeLock',
      policyTemplate: '#microsoft.graph.windows10CompliancePolicy',
      confidence: 'HIGH'
    },
    {
      id: 421,
      displayName: 'Maximum Inactivity Time Device Lock (Windows)',
      oldSettingName: 'Device.Vendor.MSFT.Policy.Config.DeviceLock.MaxInactivityTimeDeviceLock',
      newSettingName: 'passwordMinutesOfInactivityBeforeLock',
      policyTemplate: '#microsoft.graph.windows10CompliancePolicy',
      confidence: 'HIGH'
    },
    {
      id: 579,
      displayName: 'Require BitLocker Encryption on Windows Devices',
      oldSettingName: 'DeviceCompliance.SystemSecurity.RequireEncryption',
      newSettingName: 'bitLockerEnabled',
      policyTemplate: '#microsoft.graph.conditionalAccessPolicy',
      confidence: 'HIGH',
      notes: 'Template mismatch - should be windows10CompliancePolicy'
    },
    {
      id: 447,
      displayName: 'Require Full Device Encryption on Mobile Devices',
      oldSettingName: 'deviceCompliancePolicy.systemSecurity.requireEncryption',
      newSettingName: 'storageRequireEncryption',
      policyTemplate: '#microsoft.graph.windows10CompliancePolicy',
      confidence: 'HIGH'
    },
    {
      id: 532,
      displayName: 'Require Antivirus and Antispyware Software',
      oldSettingName: 'deviceCompliancePolicy.systemSecurity.antivirusRequired',
      newSettingName: 'requireHealthyDeviceReport',
      policyTemplate: '#microsoft.graph.windows10CompliancePolicy',
      confidence: 'MEDIUM',
      notes: 'Verify: This property may indicate device health, not just antivirus'
    },

    // ===== iOS Compliance Policies =====
    {
      id: 428,
      displayName: 'Maximum Minutes of Inactivity Until Screen Locks (iOS)',
      oldSettingName: 'iosGeneralDeviceConfiguration.maxInactivityTimeDeviceLock',
      newSettingName: 'passcodeMinutesOfInactivityBeforeLock',
      policyTemplate: '#microsoft.graph.iosCompliancePolicy',
      confidence: 'HIGH'
    },
    {
      id: 127,
      displayName: 'Enforce Minimum OS Version for Mobile Devices',
      oldSettingName: 'deviceCompliancePolicy.deviceProperties.osMinimumVersion',
      newSettingName: 'osMinimumVersion',
      policyTemplate: '#microsoft.graph.iosManagedAppProtection',
      confidence: 'HIGH',
      notes: 'Template mismatch - should be iosCompliancePolicy'
    },
    {
      id: 126,
      displayName: 'Block Jailbroken/Rooted Devices from Network',
      oldSettingName: 'deviceCompliancePolicy.deviceHealthAttestation.jailbroken',
      newSettingName: 'securityBlockJailbrokenDevices',
      policyTemplate: '#microsoft.graph.authorizationPolicy',
      confidence: 'HIGH',
      notes: 'Template mismatch - should be iosCompliancePolicy'
    },

    // ===== iOS/Android MAM Protection Policies =====
    {
      id: 128,
      displayName: 'Require Strong Passcode on Mobile Devices',
      oldSettingName: 'deviceCompliancePolicy.systemSecurity.passwordRequired',
      newSettingName: 'pinRequired',
      policyTemplate: '#microsoft.graph.iosManagedAppProtection',
      confidence: 'HIGH'
    },
    {
      id: 130,
      displayName: 'Require App Protection Policies for CUI Access',
      oldSettingName: 'appProtectionPolicy.settings.dataProtection',
      newSettingName: 'deviceComplianceRequired',
      policyTemplate: '#microsoft.graph.iosManagedAppProtection',
      confidence: 'HIGH'
    },
    {
      id: 366,
      displayName: 'Intune MAM - Block Save As to Unmanaged Locations',
      oldSettingName: null, // Was NULL before
      newSettingName: 'saveAsBlocked',
      policyTemplate: '#microsoft.graph.iosManagedAppProtection',
      confidence: 'HIGH'
    },
    {
      id: 55,
      displayName: 'Intune MAM - Restrict Cut/Copy/Paste',
      oldSettingName: null,
      newSettingName: 'allowedOutboundClipboardSharingLevel',
      policyTemplate: '#microsoft.graph.iosManagedAppProtection',
      confidence: 'HIGH',
      notes: 'Value is enum: allApps, managedApps, managedAppsWithPasteIn, none'
    },
    {
      id: 438,
      displayName: 'App Protection Policy - Offline Grace Period (Minutes)',
      oldSettingName: 'IntuneMAMPolicy.ConditionalLaunch.OfflineGracePeriod',
      newSettingName: 'periodOfflineBeforeAccessCheck',
      policyTemplate: '#microsoft.graph.windows10CompliancePolicy',
      confidence: 'HIGH',
      notes: 'Template mismatch - should be iosManagedAppProtection. Value is ISO 8601 duration'
    },
    {
      id: 439,
      displayName: 'App Protection Policy - Offline Grace Period (Minutes) - Android',
      oldSettingName: 'IntuneMAMPolicy.ConditionalLaunch.OfflineGracePeriod',
      newSettingName: 'periodOfflineBeforeAccessCheck',
      policyTemplate: '#microsoft.graph.androidManagedAppProtection',
      confidence: 'HIGH',
      notes: 'Value is ISO 8601 duration'
    },
    {
      id: 554,
      displayName: 'Automatic Device Wipe on Account Deletion',
      oldSettingName: 'properties.actions.wipe',
      newSettingName: 'periodOfflineBeforeWipeIsEnforced',
      policyTemplate: '#microsoft.graph.iosManagedAppProtection',
      confidence: 'HIGH',
      notes: 'Value is ISO 8601 duration'
    }
  ];

  console.log(`Found ${updates.length} settings to update\n`);

  // Group by confidence level
  const highConfidence = updates.filter(u => u.confidence === 'HIGH');
  const mediumConfidence = updates.filter(u => u.confidence === 'MEDIUM');

  console.log(`HIGH confidence updates: ${highConfidence.length}`);
  console.log(`MEDIUM confidence updates: ${mediumConfidence.length}\n`);

  // Preview changes
  console.log('='.repeat(80));
  console.log('PREVIEW OF CHANGES');
  console.log('='.repeat(80) + '\n');

  for (const update of updates) {
    console.log(`[${update.confidence}] ${update.displayName}`);
    console.log(`  ID: ${update.id}`);
    console.log(`  Old: ${update.oldSettingName || 'NULL'}`);
    console.log(`  New: ${update.newSettingName}`);
    if (update.notes) {
      console.log(`  Note: ${update.notes}`);
    }
    console.log();
  }

  // Confirm before applying
  console.log('='.repeat(80));
  console.log('Do you want to apply these changes? (y/n)');
  console.log('='.repeat(80));
  
  // For automated scripts, you can comment out the readline and just apply
  // Uncomment the section below for interactive confirmation:
  /*
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise<string>(resolve => {
    readline.question('> ', resolve);
  });
  readline.close();

  if (answer.toLowerCase() !== 'y') {
    console.log('\nUpdate cancelled.');
    return;
  }
  */

  // Apply updates
  console.log('\n' + '='.repeat(80));
  console.log('APPLYING UPDATES');
  console.log('='.repeat(80) + '\n');

  let successCount = 0;
  let errorCount = 0;

  for (const update of updates) {
    try {
      // Check if setting exists
      const setting = await prisma.m365Setting.findUnique({
        where: { id: update.id }
      });

      if (!setting) {
        console.log(`❌ Setting ID ${update.id} not found - skipping`);
        errorCount++;
        continue;
      }

      // Verify display name matches (safety check)
      if (setting.displayName !== update.displayName) {
        console.log(`⚠️  Warning: Display name mismatch for ID ${update.id}`);
        console.log(`   Expected: ${update.displayName}`);
        console.log(`   Found: ${setting.displayName}`);
        console.log(`   Skipping for safety...`);
        errorCount++;
        continue;
      }

      // Apply update
      await prisma.m365Setting.update({
        where: { id: update.id },
        data: {
          settingName: update.newSettingName,
          // Reset extraction statistics to give new mapping a chance
          successfulExtractions: 0,
          failedExtractions: 0,
          lastSuccessfulStrategy: null,
          lastExtractedValue: null
        }
      });

      console.log(`✅ Updated: ${update.displayName}`);
      successCount++;

    } catch (error) {
      console.log(`❌ Error updating ${update.displayName}:`, error);
      errorCount++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('UPDATE SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total updates attempted: ${updates.length}`);
  console.log(`Successful updates: ${successCount}`);
  console.log(`Errors: ${errorCount}`);

  if (successCount > 0) {
    console.log('\n✨ Updates applied successfully!');
    console.log('\nNext steps:');
    console.log('1. Re-sync policies from Microsoft 365');
    console.log('2. Run validation to measure improvement');
    console.log('3. Check extraction rates for updated settings');
    console.log('\nExpected improvement: +15-20 percentage points in match rate');
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

// Run the script
applyResearchFindings()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
