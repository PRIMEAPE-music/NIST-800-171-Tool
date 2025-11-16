const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const controls = await prisma.control.findMany({
    select: {
      controlId: true,
      family: true
    },
    orderBy: {
      controlId: 'asc'
    }
  });

  console.log('TOTAL CONTROLS IN DATABASE:', controls.length);
  console.log('\nAll control IDs:');
  controls.forEach(c => {
    console.log(`${c.controlId} [${c.family}]`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
