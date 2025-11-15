import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const prisma = new PrismaClient();

const WITHDRAWN_CONTROL_IDS = [
  '03.01.13', '03.01.14', '03.01.15', '03.01.17',
  '03.02.03', '03.03.09', '03.04.07', '03.04.09',
  '03.05.06', '03.05.08', '03.05.09', '03.05.10',
  '03.08.06', '03.08.08', '03.13.14', '03.13.16',
  '03.14.07',
];

function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question + ' (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function deleteWithdrawnControls() {
  console.log('🗑️  NIST 800-171r3 Withdrawn Controls Deletion Script\n');

  // Check what exists
  const withdrawnControls = await prisma.control.findMany({
    where: {
      controlId: { in: WITHDRAWN_CONTROL_IDS },
    },
  });

  if (withdrawnControls.length === 0) {
    console.log('✅ No withdrawn controls found. Database is clean!');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${withdrawnControls.length} withdrawn controls to delete:\n`);
  withdrawnControls.forEach((c) => {
    console.log(`  - ${c.controlId}: ${c.title}`);
  });

  console.log('\n⚠️  This action will CASCADE DELETE all related:');
  console.log('  - Control status records');
  console.log('  - Assessments');
  console.log('  - Evidence');
  console.log('  - POAMs and milestones');
  console.log('  - Policy mappings');
  console.log('  - Change history\n');

  const confirmed = await askConfirmation('Are you sure you want to proceed?');

  if (!confirmed) {
    console.log('❌ Deletion cancelled.');
    await prisma.$disconnect();
    return;
  }

  console.log('\n🔄 Deleting withdrawn controls...\n');

  try {
    const result = await prisma.control.deleteMany({
      where: {
        controlId: { in: WITHDRAWN_CONTROL_IDS },
      },
    });

    console.log(`✅ Successfully deleted ${result.count} withdrawn controls!`);

    // Verify deletion
    const remaining = await prisma.control.count({
      where: {
        controlId: { in: WITHDRAWN_CONTROL_IDS },
      },
    });

    if (remaining === 0) {
      console.log('✅ Verification passed: All withdrawn controls removed.');
    } else {
      console.log(`⚠️  Warning: ${remaining} controls still remain!`);
    }

    // Show new total
    const totalControls = await prisma.control.count();
    console.log(`\n📊 Total controls in database: ${totalControls}`);
    console.log('   (Should be 110 for NIST 800-171r3)');
  } catch (error) {
    console.error('❌ Error deleting controls:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteWithdrawnControls().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
