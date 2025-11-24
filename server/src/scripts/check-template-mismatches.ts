/**
 * Check Template Mismatches
 * Identifies settings that may have incorrect policyTemplate assignments
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TemplateFix {
  id: number;
  displayName: string;
  currentTemplate: string | null;
  correctTemplate: string;
  reason: string;
}

const templateFixes: TemplateFix[] = [
  {
    id: 579,
    displayName: 'Require BitLocker Encryption on Windows Devices',
    currentTemplate: '#microsoft.graph.conditionalAccessPolicy',
    correctTemplate: '#microsoft.graph.windows10CompliancePolicy',
    reason: 'BitLocker is a Windows compliance setting, not Conditional Access'
  },
  {
    id: 127,
    displayName: 'Enforce Minimum OS Version for Mobile Devices',
    currentTemplate: '#microsoft.graph.iosManagedAppProtection',
    correctTemplate: '#microsoft.graph.iosCompliancePolicy',
    reason: 'OS version is a compliance setting, not MAM protection'
  },
  {
    id: 126,
    displayName: 'Block Jailbroken/Rooted Devices from Network',
    currentTemplate: '#microsoft.graph.authorizationPolicy',
    correctTemplate: '#microsoft.graph.iosCompliancePolicy',
    reason: 'Jailbreak detection is iOS compliance, not authorization'
  },
  {
    id: 438,
    displayName: 'App Protection Policy - Offline Grace Period (Minutes)',
    currentTemplate: '#microsoft.graph.windows10CompliancePolicy',
    correctTemplate: '#microsoft.graph.iosManagedAppProtection',
    reason: 'Offline grace period is MAM policy, not Windows compliance'
  }
];

async function checkAndFixTemplates() {
  console.log('\n' + '='.repeat(80));
  console.log('TEMPLATE MISMATCH CHECK AND FIX');
  console.log('='.repeat(80) + '\n');

  console.log('Checking settings with potential template mismatches...\n');

  for (const fix of templateFixes) {
    const setting = await prisma.m365Setting.findUnique({
      where: { id: fix.id },
      select: {
        id: true,
        displayName: true,
        policyTemplate: true,
        settingName: true,
        complianceChecks: {
          select: {
            policy: {
              select: {
                odataType: true
              }
            }
          }
        }
      }
    });

    if (!setting) {
      console.log(`❌ Setting ${fix.id} not found\n`);
      continue;
    }

    console.log(`Setting: ${setting.displayName}`);
    console.log(`  ID: ${setting.id}`);
    console.log(`  Current template: ${setting.policyTemplate}`);
    console.log(`  Suggested template: ${fix.correctTemplate}`);
    console.log(`  Reason: ${fix.reason}`);

    // Check what templates the actual policies have
    const actualPolicyTemplates = new Set(
      setting.complianceChecks.map(c => c.policy.odataType)
    );

    if (actualPolicyTemplates.size > 0) {
      console.log(`  Actual policy templates found: ${Array.from(actualPolicyTemplates).join(', ')}`);
    }

    console.log('');
  }

  console.log('='.repeat(80));
  console.log('APPLY FIXES? (y/n)');
  console.log('='.repeat(80));
  console.log('\nNote: Template fixes will help the smart extractor match settings to the correct policies\n');

  // For now, let's just apply them automatically
  console.log('Applying template fixes...\n');

  let fixCount = 0;

  for (const fix of templateFixes) {
    try {
      await prisma.m365Setting.update({
        where: { id: fix.id },
        data: {
          policyTemplate: fix.correctTemplate
        }
      });

      console.log(`✅ Updated template for: ${fix.displayName}`);
      fixCount++;
    } catch (error) {
      console.log(`❌ Failed to update ${fix.displayName}:`, error);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Templates fixed: ${fixCount}/${templateFixes.length}`);
  console.log('\nNext step: Rebuild compliance checks to apply the template fixes\n');

  await prisma.$disconnect();
}

checkAndFixTemplates().catch(console.error);
