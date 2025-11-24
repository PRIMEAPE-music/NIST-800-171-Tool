/**
 * Verify Android vs iOS Parity
 * Check that both MAM policies have equal control coverage
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyParity() {
  console.log('\n' + '='.repeat(80));
  console.log('ANDROID vs iOS MAM POLICY PARITY CHECK');
  console.log('='.repeat(80) + '\n');

  // Get Android policy
  const androidPolicy = await prisma.m365Policy.findFirst({
    where: {
      policyName: { contains: 'Android' },
      odataType: { contains: 'androidManagedAppProtection' }
    },
    include: {
      complianceChecks: {
        include: {
          setting: {
            include: {
              controlMappings: {
                include: {
                  control: true
                }
              }
            }
          }
        }
      }
    }
  });

  // Get iOS policy
  const iosPolicy = await prisma.m365Policy.findFirst({
    where: {
      policyName: { contains: 'iOS' },
      odataType: { contains: 'iosManagedAppProtection' }
    },
    include: {
      complianceChecks: {
        include: {
          setting: {
            include: {
              controlMappings: {
                include: {
                  control: true
                }
              }
            }
          }
        }
      }
    }
  });

  // Get unique controls for Android
  const androidControls = new Set<string>();
  if (androidPolicy) {
    for (const check of androidPolicy.complianceChecks) {
      for (const mapping of check.setting.controlMappings) {
        androidControls.add(mapping.control.controlId);
      }
    }
  }

  // Get unique controls for iOS
  const iosControls = new Set<string>();
  if (iosPolicy) {
    for (const check of iosPolicy.complianceChecks) {
      for (const mapping of check.setting.controlMappings) {
        iosControls.add(mapping.control.controlId);
      }
    }
  }

  console.log('ANDROID APP PROTECTION POLICY');
  console.log('-'.repeat(80));
  console.log(`  Policy Name: ${androidPolicy?.policyName || 'Not found'}`);
  console.log(`  Total Compliance Checks: ${androidPolicy?.complianceChecks.length || 0}`);
  console.log(`  Unique Controls Mapped: ${androidControls.size}`);
  console.log(`  Controls: ${Array.from(androidControls).sort().join(', ')}`);
  console.log('');

  console.log('iOS APP PROTECTION POLICY');
  console.log('-'.repeat(80));
  console.log(`  Policy Name: ${iosPolicy?.policyName || 'Not found'}`);
  console.log(`  Total Compliance Checks: ${iosPolicy?.complianceChecks.length || 0}`);
  console.log(`  Unique Controls Mapped: ${iosControls.size}`);
  console.log(`  Controls: ${Array.from(iosControls).sort().join(', ')}`);
  console.log('');

  console.log('=' .repeat(80));
  console.log('PARITY CHECK');
  console.log('='.repeat(80));
  console.log('');

  const hasEqualControls = androidControls.size === iosControls.size;
  const hasEqualChecks = androidPolicy?.complianceChecks.length === iosPolicy?.complianceChecks.length;

  if (hasEqualControls && hasEqualChecks) {
    console.log('✅ PARITY ACHIEVED!');
    console.log('');
    console.log(`Both Android and iOS now have:`);
    console.log(`  - ${androidControls.size} unique controls`);
    console.log(`  - ${androidPolicy?.complianceChecks.length || 0} compliance checks`);
    console.log('');
    console.log('Your UI should now show equal control mappings for both platforms!');
  } else {
    console.log('⚠️  PARITY NOT COMPLETE');
    console.log('');
    console.log(`Android: ${androidControls.size} controls, ${androidPolicy?.complianceChecks.length || 0} checks`);
    console.log(`iOS: ${iosControls.size} controls, ${iosPolicy?.complianceChecks.length || 0} checks`);
    console.log('');

    // Find differences
    const androidOnly = Array.from(androidControls).filter(c => !iosControls.has(c));
    const iosOnly = Array.from(iosControls).filter(c => !androidControls.has(c));

    if (androidOnly.length > 0) {
      console.log(`Controls only in Android: ${androidOnly.join(', ')}`);
    }
    if (iosOnly.length > 0) {
      console.log(`Controls only in iOS: ${iosOnly.join(', ')}`);
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');

  await prisma.$disconnect();
}

verifyParity().catch(console.error);
