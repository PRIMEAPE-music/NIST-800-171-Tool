import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const WITHDRAWN_CONTROL_IDS = [
  '03.01.13', // Withdrawn - Addressed by 03.13.08
  '03.01.14', // Withdrawn - Incorporated into 03.01.12
  '03.01.15', // Withdrawn - Incorporated into 03.01.12
  '03.01.17', // Withdrawn - Incorporated into 03.01.16
  '03.02.03', // Withdrawn - Incorporated into 03.02.01
  '03.03.09', // Withdrawn - Incorporated into 03.03.08
  '03.04.07', // Withdrawn in Rev 3
  '03.04.09', // Withdrawn - Addressed by multiple controls
  '03.05.06', // Withdrawn - Consistency with SP 800-53
  '03.05.08', // Withdrawn - Consistency with SP 800-53
  '03.05.09', // Withdrawn - Consistency with SP 800-53
  '03.05.10', // Withdrawn - Incorporated into 03.05.07
  '03.08.06', // Withdrawn in Rev 3
  '03.08.08', // Withdrawn - Incorporated into 03.08.07
  '03.13.14', // Withdrawn - Technology-specific
  '03.13.16', // Withdrawn - Incorporated into 03.13.08
  '03.14.07', // Withdrawn - Incorporated into 03.14.06
];

async function checkWithdrawnControls() {
  console.log('🔍 Checking for withdrawn controls in database...\n');

  const withdrawnControls = await prisma.control.findMany({
    where: {
      controlId: {
        in: WITHDRAWN_CONTROL_IDS,
      },
    },
    include: {
      _count: {
        select: {
          assessments: true,
          evidence: true,
          poams: true,
          policyMappings: true,
        },
      },
    },
  });

  if (withdrawnControls.length === 0) {
    console.log('✅ No withdrawn controls found in database!');
    await prisma.$disconnect();
    return;
  }

  console.log(`⚠️  Found ${withdrawnControls.length} withdrawn controls:\n`);

  withdrawnControls.forEach((control) => {
    console.log(`Control ID: ${control.controlId}`);
    console.log(`  Title: ${control.title}`);
    console.log(`  Family: ${control.family}`);
    console.log(`  Assessments: ${control._count.assessments}`);
    console.log(`  Evidence: ${control._count.evidence}`);
    console.log(`  POAMs: ${control._count.poams}`);
    console.log(`  Policy Mappings: ${control._count.policyMappings}`);
    console.log('');
  });

  console.log('\n📊 Summary:');
  console.log(`Total withdrawn controls: ${withdrawnControls.length}`);

  const totalDependencies = withdrawnControls.reduce(
    (acc, control) =>
      acc +
      control._count.assessments +
      control._count.evidence +
      control._count.poams +
      control._count.policyMappings,
    0
  );

  console.log(`Total related records: ${totalDependencies}`);

  if (totalDependencies > 0) {
    console.log('\n⚠️  WARNING: These controls have related data!');
    console.log('Consider migrating data before deletion.');
  }

  await prisma.$disconnect();
}

checkWithdrawnControls().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
