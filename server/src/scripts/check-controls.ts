import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkControls() {
  const controlsToCheck = ['03.05.10', '03.13.16', '03.14.04'];

  console.log('\n🔍 Checking for controls in database...\n');

  for (const controlId of controlsToCheck) {
    const control = await prisma.control.findFirst({
      where: { controlId },
    });

    if (control) {
      console.log(`✅ ${controlId} - ${control.title}`);
    } else {
      console.log(`❌ ${controlId} - NOT FOUND`);
    }
  }

  // Check total count
  const totalCount = await prisma.control.count();
  console.log(`\n📊 Total controls in database: ${totalCount}`);

  // List all control IDs in 03.05, 03.13, and 03.14 families
  const families = ['03.05', '03.13', '03.14'];

  for (const family of families) {
    const controls = await prisma.control.findMany({
      where: {
        controlId: {
          startsWith: family,
        },
      },
      select: {
        controlId: true,
        title: true,
      },
      orderBy: {
        controlId: 'asc',
      },
    });

    console.log(`\n📋 Controls in ${family} family:`);
    controls.forEach(c => {
      console.log(`   ${c.controlId} - ${c.title}`);
    });
  }

  await prisma.$disconnect();
}

checkControls();
