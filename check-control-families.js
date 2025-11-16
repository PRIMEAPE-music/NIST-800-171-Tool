const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check the 03.09.XX controls
  const controls09 = await prisma.control.findMany({
    where: {
      controlId: {
        startsWith: '03.09'
      }
    },
    select: {
      controlId: true,
      title: true,
      family: true
    },
    orderBy: {
      controlId: 'asc'
    }
  });

  console.log('03.09.XX controls (should be IR or PS?):');
  controls09.forEach(c => {
    console.log(`  ${c.controlId} [${c.family}]: ${c.title}`);
  });

  // Check the 03.14.XX controls
  const controls14 = await prisma.control.findMany({
    where: {
      controlId: {
        startsWith: '03.14'
      }
    },
    select: {
      controlId: true,
      title: true,
      family: true
    },
    orderBy: {
      controlId: 'asc'
    }
  });

  console.log('\n03.14.XX controls (should be SA or SI?):');
  controls14.forEach(c => {
    console.log(`  ${c.controlId} [${c.family}]: ${c.title}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
