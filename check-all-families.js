const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get all controls grouped by family
  const controls = await prisma.control.findMany({
    select: {
      controlId: true,
      title: true,
      family: true
    },
    orderBy: {
      controlId: 'asc'
    }
  });

  const byFamily = {};
  controls.forEach(c => {
    if (!byFamily[c.family]) {
      byFamily[c.family] = [];
    }
    byFamily[c.family].push(c.controlId);
  });

  console.log('Controls by family from DATABASE:');
  Object.keys(byFamily).sort().forEach(family => {
    console.log(`\n${family}: ${byFamily[family].length} controls`);
    console.log('  ' + byFamily[family].join(', '));
  });

  await prisma.$disconnect();
}

main().catch(console.error);
