const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const controls = await prisma.control.findMany({
      select: { controlId: true, family: true, status: true }
    });

    console.log('Total controls in database:', controls.length);

    const byStatus = controls.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});
    console.log('By status:', byStatus);

    const families = [...new Set(controls.map(c => c.family))].sort();
    console.log('Families present:', families.join(', '));

    const plControls = controls.filter(c => c.family === 'PL');
    const saControls = controls.filter(c => c.family === 'SA');
    const srControls = controls.filter(c => c.family === 'SR');

    console.log('\nNew Rev 3 families:');
    console.log(' - PL (Planning):', plControls.length);
    console.log(' - SA (System & Services):', saControls.length);
    console.log(' - SR (Supply Chain):', srControls.length);

    // Check active vs withdrawn
    const activeControls = controls.filter(c => c.status === 'Active');
    const withdrawnControls = controls.filter(c => c.status === 'Withdrawn');

    console.log('\nActive controls:', activeControls.length);
    console.log('Withdrawn controls:', withdrawnControls.length);

  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
