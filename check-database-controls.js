/**
 * Check which controls exist in the database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkControls() {
  console.log('\n📊 Checking Database Controls\n');
  console.log('='.repeat(70));

  // Get all controls
  const controls = await prisma.control.findMany({
    select: {
      controlId: true,
      title: true,
      family: true,
    },
    orderBy: {
      controlId: 'asc',
    },
  });

  console.log(`\nTotal controls in database: ${controls.length}\n`);

  // Check which revision
  const sampleControlIds = controls.slice(0, 5).map(c => c.controlId);
  console.log('Sample control IDs:', sampleControlIds.join(', '));

  const isRev3 = sampleControlIds.some(id => id.startsWith('03.'));
  const isRev2 = sampleControlIds.some(id => id.match(/^\d{1,2}\.\d{1,2}\.\d{1,2}$/) && !id.startsWith('03.'));

  console.log(`\nRevision: ${isRev3 ? 'Rev 3' : isRev2 ? 'Rev 2' : 'Unknown'}\n`);

  // Check for specific controls from the mappings file
  const mappingsControls = [
    '03.01.01', '03.01.02', '03.01.03', '03.01.05', '03.01.06',
    '03.01.09', '03.01.10', '03.01.12', '03.01.13', '03.01.14',
    '03.01.17', '03.01.18', '03.01.19', '03.01.20', '03.01.21',
    '03.01.22', '03.03.01', '03.03.08', '03.05.01', '03.05.07',
    '03.05.11', '03.07.01', '03.07.02', '03.07.03', '03.07.04',
    '03.07.11', '03.10.03', '03.10.07', '03.13.08', '03.13.11',
    '03.14.02', '03.14.03', '03.16.01', '03.16.02', '03.17.01',
    '03.17.03',
  ];

  console.log('Checking controls from keyword mappings file:\n');

  let found = 0;
  let missing = 0;

  for (const controlId of mappingsControls) {
    const exists = controls.some(c => c.controlId === controlId);
    if (exists) {
      found++;
      console.log(`  ✅ ${controlId}`);
    } else {
      missing++;
      console.log(`  ❌ ${controlId} - MISSING`);
    }
  }

  console.log(`\nSummary:`);
  console.log(`  Found: ${found}/${mappingsControls.length}`);
  console.log(`  Missing: ${missing}/${mappingsControls.length}`);

  if (missing > 0) {
    console.log(`\n⚠️  ${missing} controls from mappings file are missing from database!`);
    console.log(`   This is why the sync only mapped ${found} controls.`);
    console.log(`\n💡 Solution: Run the NIST 800-171 Rev 3 migration to add missing controls.`);
  }

  console.log('\n' + '='.repeat(70) + '\n');

  await prisma.$disconnect();
}

checkControls().catch(console.error);
