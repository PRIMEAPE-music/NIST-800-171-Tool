const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const improveData = require('../data/nist-improvement-actions.json');

async function main() {
  const dbControls = await prisma.control.findMany({
    select: { controlId: true },
    orderBy: { controlId: 'asc' }
  });

  const dbControlIds = new Set(dbControls.map(c => c.controlId));
  const fileControlIds = new Set(Object.keys(improveData.mappings));

  console.log('Database controls:', dbControlIds.size);
  console.log('File controls:', fileControlIds.size);

  // Find controls in file but not in database
  const inFileNotDb = [...fileControlIds].filter(id => !dbControlIds.has(id));
  console.log('\nIn file but NOT in database:', inFileNotDb.length);
  if (inFileNotDb.length > 0) {
    console.log('  ', inFileNotDb.join(', '));
  }

  // Find controls in database but not in file  
  const inDbNotFile = [...dbControlIds].filter(id => !fileControlIds.has(id));
  console.log('\nIn database but NOT in file:', inDbNotFile.length);
  if (inDbNotFile.length > 0) {
    console.log('  ', inDbNotFile.join(', '));
  }

  await prisma.$disconnect();
}

main().catch(console.error);
