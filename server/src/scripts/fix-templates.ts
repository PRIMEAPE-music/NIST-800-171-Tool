import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Template Fix Mappings
 *
 * Based on Phase 5 audit results, these are the incorrect template assignments
 * that need to be corrected.
 */
const TEMPLATE_FIXES: Array<{
  settingIds?: number[];
  settingNamePattern?: string;
  currentTemplate?: string | null;
  correctTemplate: string;
  reason: string;
}> = [
  // ============================================================
  // FIX 1: Windows settings with iOS templates
  // ============================================================
  {
    settingIds: [197],
    correctTemplate: '#microsoft.graph.windows10EndpointProtectionConfiguration',
    reason: 'AppLocker is Windows-specific endpoint protection, not iOS',
  },

  // ============================================================
  // FIX 2: Defender settings with non-Defender templates
  // ============================================================
  {
    settingIds: [305], // Microsoft Defender alert policies with iOS template
    correctTemplate: '#microsoft.graph.windowsDefenderAdvancedThreatProtectionConfiguration',
    reason: 'Defender alert policies belong to Defender ATP configuration',
  },
  {
    settingIds: [187, 196, 260, 318, 533], // Defender settings with Windows compliance/config templates
    correctTemplate: '#microsoft.graph.windowsDefenderAdvancedThreatProtectionConfiguration',
    reason: 'Defender-related settings should use Defender ATP template',
  },
  {
    settingIds: [208, 416], // Defender settings with Conditional Access template
    correctTemplate: '#microsoft.graph.windowsDefenderAdvancedThreatProtectionConfiguration',
    reason: 'Defender threat level and identity alerts belong to Defender ATP',
  },
  {
    settingIds: [473], // DefenderAuditLogging with DLP template
    correctTemplate: '#microsoft.graph.windowsDefenderAdvancedThreatProtectionConfiguration',
    reason: 'Defender audit logging belongs to Defender ATP, not DLP',
  },
  {
    settingIds: [607], // Defender threat intelligence with Authorization Policy template
    correctTemplate: '#microsoft.graph.windowsDefenderAdvancedThreatProtectionConfiguration',
    reason: 'Defender threat intelligence integration belongs to Defender ATP',
  },
  // Note: IDs 487 and 632 with baseline templates are actually correct for security baselines

  // ============================================================
  // FIX 3: Mobile settings with Windows templates
  // ============================================================
  {
    settingIds: [99, 100, 105], // iOS lock screen/asset settings
    correctTemplate: '#microsoft.graph.iosGeneralDeviceConfiguration',
    reason: 'iOS device settings should use iOS configuration template',
  },
  {
    settingIds: [101, 106], // Android lock screen settings
    correctTemplate: '#microsoft.graph.androidGeneralDeviceConfiguration',
    reason: 'Android device settings should use Android configuration template',
  },
  {
    settingIds: [102], // Android support message
    correctTemplate: '#microsoft.graph.androidGeneralDeviceConfiguration',
    reason: 'Android support message should use Android configuration template',
  },
  {
    settingIds: [267, 428, 429], // iOS compliance settings
    correctTemplate: '#microsoft.graph.iosCompliancePolicy',
    reason: 'iOS compliance settings should use iOS compliance policy template',
  },
  {
    settingIds: [268, 430], // Android compliance settings
    correctTemplate: '#microsoft.graph.androidCompliancePolicy',
    reason: 'Android compliance settings should use Android compliance policy template',
  },
  {
    settingIds: [439], // Android app protection
    correctTemplate: '#microsoft.graph.androidManagedAppProtection',
    reason: 'Android app protection settings should use Android MAM template',
  },

  // ============================================================
  // FIX 4: NULL templates - UAC/OMA-URI settings
  // ============================================================
  {
    settingIds: [646, 647, 648, 649, 650, 651, 652], // UAC settings with OMA-URI paths
    currentTemplate: null,
    correctTemplate: '#microsoft.graph.windows10CustomConfiguration',
    reason: 'UAC settings via OMA-URI belong to Windows custom configuration',
  },

  // ============================================================
  // FIX 5: NULL templates - PowerShell settings
  // ============================================================
  {
    settingIds: [653, 654], // PowerShell logging settings
    currentTemplate: null,
    correctTemplate: '#microsoft.graph.windows10CustomConfiguration',
    reason: 'PowerShell logging settings are Windows GPO/custom configuration',
  },

  // ============================================================
  // FIX 6: NULL templates - Windows security settings
  // ============================================================
  {
    settingIds: [655, 656, 657, 658], // Interactive logon and RDP settings
    currentTemplate: null,
    correctTemplate: '#microsoft.graph.windows10CustomConfiguration',
    reason: 'Windows security policy settings belong to custom configuration',
  },

  // ============================================================
  // FIX 7: NULL templates - BitLocker/Encryption settings
  // ============================================================
  {
    settingIds: [661, 665, 666, 669, 670], // BitLocker encryption settings
    currentTemplate: null,
    correctTemplate: '#settingsCatalog.endpointSecurityDiskEncryption',
    reason: 'BitLocker settings belong to Disk Encryption policy',
  },

  // ============================================================
  // FIX 8: NULL templates - Firewall settings
  // ============================================================
  {
    settingIds: [668], // Windows Firewall
    currentTemplate: null,
    correctTemplate: '#settingsCatalog.endpointSecurityFirewall',
    reason: 'Firewall settings belong to Firewall policy',
  },

  // ============================================================
  // FIX 9: NULL templates - Defender/Security settings
  // ============================================================
  {
    settingIds: [136, 300, 302, 307, 601, 604, 606, 664], // Defender settings
    currentTemplate: null,
    correctTemplate: '#microsoft.graph.windowsDefenderAdvancedThreatProtectionConfiguration',
    reason: 'Defender settings belong to Defender ATP configuration',
  },
  {
    settingIds: [660, 671], // Security baseline settings
    currentTemplate: null,
    correctTemplate: '#settingsCatalog.baseline',
    reason: 'Security baseline settings belong to baseline template',
  },
  {
    settingIds: [672], // ASR rules
    currentTemplate: null,
    correctTemplate: '#settingsCatalog.endpointSecurityAttackSurfaceReduction',
    reason: 'Attack surface reduction rules belong to ASR policy',
  },

  // ============================================================
  // FIX 10: NULL templates - Device control
  // ============================================================
  {
    settingIds: [659, 667], // Removable storage/device installation
    currentTemplate: null,
    correctTemplate: '#microsoft.graph.windows10EndpointProtectionConfiguration',
    reason: 'Device control settings belong to endpoint protection',
  },

  // ============================================================
  // FIX 11: NULL templates - Conditional Access related
  // ============================================================
  {
    settingIds: [112, 113, 640], // IP ranges, countries, MFA controls
    currentTemplate: null,
    correctTemplate: '#microsoft.graph.conditionalAccessPolicy',
    reason: 'Access control settings belong to Conditional Access',
  },

  // ============================================================
  // FIX 12: NULL templates - Authorization Policy
  // ============================================================
  {
    settingIds: [334], // allowedToSignUpEmailBasedSubscriptions
    currentTemplate: null,
    correctTemplate: '#microsoft.graph.authorizationPolicy',
    reason: 'Tenant authorization settings belong to authorization policy',
  },

  // ============================================================
  // FIX 13: NULL templates - App Protection
  // ============================================================
  {
    settingIds: [641, 642, 643, 644, 645], // App protection/MAM settings
    currentTemplate: null,
    correctTemplate: '#microsoft.graph.iosManagedAppProtection',
    reason: 'App protection settings - using iOS template as default',
  },

  // ============================================================
  // FIX 14: NULL templates - Compliance/Password settings
  // ============================================================
  {
    settingIds: [637], // Windows password length
    currentTemplate: null,
    correctTemplate: '#microsoft.graph.windows10CompliancePolicy',
    reason: 'Windows password settings belong to compliance policy',
  },
  {
    settingIds: [638], // iOS password length
    currentTemplate: null,
    correctTemplate: '#microsoft.graph.iosCompliancePolicy',
    reason: 'iOS password settings belong to iOS compliance policy',
  },
  {
    settingIds: [639], // Android password length
    currentTemplate: null,
    correctTemplate: '#microsoft.graph.androidCompliancePolicy',
    reason: 'Android password settings belong to Android compliance policy',
  },

  // ============================================================
  // FIX 15: NULL templates - Intune management settings
  // ============================================================
  {
    settingIds: [183, 203, 253], // Version control, inventory, cleanup
    currentTemplate: null,
    correctTemplate: '#microsoft.graph.deviceManagement',
    reason: 'Intune management settings belong to device management',
  },

  // ============================================================
  // FIX 16: NULL templates - Update management
  // ============================================================
  {
    settingIds: [662, 663], // Update rings and reporting
    currentTemplate: null,
    correctTemplate: '#microsoft.graph.windowsUpdateForBusinessConfiguration',
    reason: 'Windows update settings belong to update for business',
  },

  // ============================================================
  // FIX 17: NULL templates - Cloud service settings
  // ============================================================
  {
    settingIds: [287], // Exchange TLS
    currentTemplate: null,
    correctTemplate: '#microsoft.graph.exchangeOnlineConfiguration',
    reason: 'Exchange Online settings',
  },
  {
    settingIds: [363, 365], // Teams settings
    currentTemplate: null,
    correctTemplate: '#microsoft.graph.teamsConfiguration',
    reason: 'Teams settings',
  },
  {
    settingIds: [368], // Subscription owner limits
    currentTemplate: null,
    correctTemplate: '#microsoft.graph.azureSubscriptionPolicy',
    reason: 'Azure subscription settings',
  },

  // ============================================================
  // FIX 18: NULL templates - Security center settings
  // ============================================================
  {
    settingIds: [517, 558, 563, 598], // Threat intel, Secure Score, vulnerability mgmt
    currentTemplate: null,
    correctTemplate: '#microsoft.graph.securityCenterConfiguration',
    reason: 'Security center and monitoring settings',
  },
];

async function fixTemplates() {
  console.log('\n' + '='.repeat(70));
  console.log('FIXING TEMPLATE ASSIGNMENTS');
  console.log('='.repeat(70) + '\n');

  let totalFixed = 0;

  try {
    for (const fix of TEMPLATE_FIXES) {
      console.log(`\n📝 Applying fix: ${fix.reason}`);
      if (fix.currentTemplate !== undefined) {
        console.log(`   From: ${fix.currentTemplate}`);
      }
      console.log(`   To:   ${fix.correctTemplate}`);

      const whereClause: any = {};

      if (fix.settingNamePattern) {
        whereClause.settingName = {
          contains: fix.settingNamePattern,
        };
      }

      if (fix.settingIds) {
        whereClause.id = {
          in: fix.settingIds,
        };
      }

      if (fix.currentTemplate !== undefined) {
        whereClause.policyTemplate = fix.currentTemplate;
      }

      const result = await prisma.m365Setting.updateMany({
        where: whereClause,
        data: {
          policyTemplate: fix.correctTemplate,
        },
      });

      console.log(`   ✅ Fixed ${result.count} settings`);
      totalFixed += result.count;
    }

    console.log('\n' + '='.repeat(70));
    console.log(`✅ FIXES COMPLETE: ${totalFixed} settings updated`);
    console.log('='.repeat(70));

    // Show remaining NULL templates
    const remainingNull = await prisma.m365Setting.count({
      where: { policyTemplate: null },
    });
    console.log(`\nRemaining NULL templates: ${remainingNull}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixTemplates();
