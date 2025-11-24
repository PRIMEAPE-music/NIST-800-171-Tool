/**
 * Analyze MAM Template Mappings
 * Compare iOS vs Android App Protection policy settings
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeMamTemplates() {
  console.log('\n='.repeat(80));
  console.log('iOS vs ANDROID MAM POLICY ANALYSIS');
  console.log('='.repeat(80) + '\n');

  // Get both policies
  const iosMamPolicy = await prisma.m365Policy.findFirst({
    where: {
      OR: [
        { policyName: { contains: 'iOS' } },
        { policyName: { contains: 'ios' } }
      ],
      odataType: { contains: 'iosManagedAppProtection' }
    },
    include: {
      complianceChecks: {
        include: {
          setting: {
            include: {
              controlMappings: true
            }
          }
        }
      }
    }
  });

  const androidMamPolicy = await prisma.m365Policy.findFirst({
    where: {
      OR: [
        { policyName: { contains: 'Android' } },
        { policyName: { contains: 'android' } }
      ],
      odataType: { contains: 'androidManagedAppProtection' }
    },
    include: {
      complianceChecks: {
        include: {
          setting: {
            include: {
              controlMappings: true
            }
          }
        }
      }
    }
  });

  console.log('POLICIES FOUND:\n');
  console.log('iOS MAM Policy:');
  console.log('  Name:', iosMamPolicy?.policyName || 'NOT FOUND');
  console.log('  Template:', iosMamPolicy?.odataType || 'N/A');
  console.log('  Compliance Checks:', iosMamPolicy?.complianceChecks.length || 0);

  console.log('\nAndroid MAM Policy:');
  console.log('  Name:', androidMamPolicy?.policyName || 'NOT FOUND');
  console.log('  Template:', androidMamPolicy?.odataType || 'N/A');
  console.log('  Compliance Checks:', androidMamPolicy?.complianceChecks.length || 0);

  // Count settings mapped to each template
  const iosTemplateString = iosMamPolicy?.odataType || '#microsoft.graph.iosManagedAppProtection';
  const androidTemplateString = androidMamPolicy?.odataType || '#microsoft.graph.androidManagedAppProtection';

  const iosSettings = await prisma.m365Setting.findMany({
    where: {
      policyTemplate: iosTemplateString,
      isActive: true
    },
    select: {
      id: true,
      displayName: true,
      settingName: true,
      controlMappings: true
    }
  });

  const androidSettings = await prisma.m365Setting.findMany({
    where: {
      policyTemplate: androidTemplateString,
      isActive: true
    },
    select: {
      id: true,
      displayName: true,
      settingName: true,
      controlMappings: true
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('SETTINGS IN DATABASE');
  console.log('='.repeat(80) + '\n');
  console.log(`iOS MAM template (${iosTemplateString}): ${iosSettings.length} settings`);
  console.log(`Android MAM template (${androidTemplateString}): ${androidSettings.length} settings`);

  // Show iOS settings
  console.log('\n' + '-'.repeat(80));
  console.log('iOS SETTINGS:');
  console.log('-'.repeat(80) + '\n');
  for (const s of iosSettings.slice(0, 10)) {
    console.log(`  ${s.displayName}`);
    console.log(`    Controls: ${s.controlMappings.length}`);
  }
  if (iosSettings.length > 10) {
    console.log(`  ... and ${iosSettings.length - 10} more`);
  }

  // Show Android settings
  console.log('\n' + '-'.repeat(80));
  console.log('ANDROID SETTINGS:');
  console.log('-'.repeat(80) + '\n');
  if (androidSettings.length === 0) {
    console.log('  (None found)');
  } else {
    for (const s of androidSettings) {
      console.log(`  ${s.displayName}`);
      console.log(`    Controls: ${s.controlMappings.length}`);
    }
  }

  // Check if there are settings that mention Android but are mapped to iOS template
  console.log('\n' + '='.repeat(80));
  console.log('MISMATCHED SETTINGS (Android name but iOS template)');
  console.log('='.repeat(80) + '\n');

  const mismatchedSettings = await prisma.m365Setting.findMany({
    where: {
      AND: [
        {
          OR: [
            { displayName: { contains: 'Android' } },
            { displayName: { contains: 'android' } }
          ]
        },
        { policyTemplate: iosTemplateString },
        { isActive: true }
      ]
    },
    select: {
      id: true,
      displayName: true,
      policyTemplate: true,
      controlMappings: true
    }
  });

  if (mismatchedSettings.length === 0) {
    console.log('  (None found)');
  } else {
    for (const s of mismatchedSettings) {
      console.log(`  ID ${s.id}: ${s.displayName}`);
      console.log(`    Template: ${s.policyTemplate}`);
      console.log(`    Controls: ${s.controlMappings.length}`);
      console.log('');
    }
  }

  // Check for settings that should apply to both platforms
  console.log('\n' + '='.repeat(80));
  console.log('PLATFORM-AGNOSTIC SETTINGS');
  console.log('='.repeat(80) + '\n');
  console.log('Settings that mention neither iOS nor Android (could apply to both):');

  const genericSettings = await prisma.m365Setting.findMany({
    where: {
      AND: [
        {
          policyTemplate: {
            in: [iosTemplateString, androidTemplateString]
          }
        },
        {
          displayName: {
            not: { contains: 'iOS' }
          }
        },
        {
          displayName: {
            not: { contains: 'Android' }
          }
        },
        { isActive: true }
      ]
    },
    select: {
      id: true,
      displayName: true,
      policyTemplate: true
    }
  });

  console.log(`Found ${genericSettings.length} platform-agnostic settings\n`);
  for (const s of genericSettings.slice(0, 10)) {
    const platform = s.policyTemplate?.includes('ios') ? 'iOS' : 'Android';
    console.log(`  [${platform}] ${s.displayName}`);
  }
  if (genericSettings.length > 10) {
    console.log(`  ... and ${genericSettings.length - 10} more`);
  }

  // Recommendation
  console.log('\n' + '='.repeat(80));
  console.log('RECOMMENDATION');
  console.log('='.repeat(80) + '\n');

  if (androidSettings.length === 0 || androidSettings.length < iosSettings.length / 2) {
    console.log('⚠️  ISSUE DETECTED: Android has significantly fewer settings than iOS');
    console.log('');
    console.log('Possible causes:');
    console.log('  1. Settings were only created for iOS and not duplicated for Android');
    console.log('  2. Settings have incorrect policyTemplate assignments');
    console.log('  3. Android-specific settings were not imported');
    console.log('');
    console.log('Suggested action:');
    console.log('  1. Review the iOS settings - many should apply to Android too');
    console.log('  2. Create duplicate settings for Android with androidManagedAppProtection template');
    console.log('  3. Update settingName properties if Android uses different property names');
    console.log('');
  } else {
    console.log('✅ iOS and Android have comparable numbers of settings');
  }

  await prisma.$disconnect();
}

analyzeMamTemplates().catch(console.error);
