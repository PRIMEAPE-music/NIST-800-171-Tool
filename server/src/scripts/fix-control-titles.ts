import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ControlFix {
  controlId: string;
  currentTitle: string;
  correctTitle: string;
  correctFamily: string;
  reason: string;
}

const CONTROL_FIXES: ControlFix[] = [
  {
    controlId: '03.05.02',
    currentTitle: 'Configuration Change Control',
    correctTitle: 'Device Authentication',
    correctFamily: 'IA',
    reason: 'Wrong family - This is IA (Authentication), not CM (Config Mgmt)',
  },
  {
    controlId: '03.05.07',
    currentTitle: 'User-Installed Software',
    correctTitle: 'Password Management',
    correctFamily: 'IA',
    reason: 'Wrong control - User-Installed Software is 03.04.08 (CM family)',
  },
  {
    controlId: '03.04.01',
    currentTitle: 'Security Assessments',
    correctTitle: 'Baseline Configuration',
    correctFamily: 'CM',
    reason: 'Wrong family - Security Assessments is 03.12.01 (CA family)',
  },
  {
    controlId: '03.04.02',
    currentTitle: 'Developer Testing and Evaluation',
    correctTitle: 'Configuration Settings',
    correctFamily: 'CM',
    reason: 'Wrong control - Developer Testing is SA-11 (not in 800-171)',
  },
  {
    controlId: '03.05.01',
    currentTitle: 'Baseline Configuration',
    correctTitle: 'Identification and Authentication',
    correctFamily: 'IA',
    reason: 'Wrong family - Baseline Configuration is 03.04.01 (CM family)',
  },
  {
    controlId: '03.05.05',
    currentTitle: 'Configuration Settings',
    correctTitle: 'Identifier Management',
    correctFamily: 'IA',
    reason: 'Wrong family - Configuration Settings is 03.04.02 (CM family)',
  },
  {
    controlId: '03.08.03',
    currentTitle: 'Incident Reporting',
    correctTitle: 'Media Sanitization',
    correctFamily: 'MP',
    reason: 'Wrong family - Incident Reporting is 03.06.02 (IR family)',
  },
  {
    controlId: '03.04.03',
    currentTitle: 'Access Restrictions for Change',
    correctTitle: 'Configuration Change Control',
    correctFamily: 'CM',
    reason: 'Wrong title - Access Restrictions for Change is 03.04.05',
  },
];

async function fixControlTitles() {
  console.log('🔧 Fixing Incorrect Control Titles\n');
  console.log('This script will correct 8 controls with wrong titles/families.\n');

  let fixedCount = 0;
  let notFoundCount = 0;

  for (const fix of CONTROL_FIXES) {
    console.log(`\n📝 Processing ${fix.controlId}...`);
    console.log(`   Reason: ${fix.reason}`);

    try {
      // Check if control exists
      const existing = await prisma.control.findUnique({
        where: { controlId: fix.controlId },
      });

      if (!existing) {
        console.log(`   ⚠️  Control ${fix.controlId} not found in database - skipping`);
        notFoundCount++;
        continue;
      }

      console.log(`   Current: "${existing.title}" (Family: ${existing.family})`);
      console.log(`   Correct: "${fix.correctTitle}" (Family: ${fix.correctFamily})`);

      // Update the control
      await prisma.control.update({
        where: { controlId: fix.controlId },
        data: {
          title: fix.correctTitle,
          family: fix.correctFamily,
        },
      });

      console.log(`   ✅ Fixed successfully!`);
      fixedCount++;
    } catch (error) {
      console.error(`   ❌ Error fixing ${fix.controlId}:`, error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   Fixed: ${fixedCount} controls`);
  console.log(`   Not Found: ${notFoundCount} controls`);
  console.log(`   Total Processed: ${CONTROL_FIXES.length} controls`);
  console.log('='.repeat(60) + '\n');

  await prisma.$disconnect();
}

fixControlTitles().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
