import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyPhase1() {
  console.log('='.repeat(80));
  console.log('NIST 800-171 Rev 3 - Phase 1 Verification');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Get all controls
    const allControls = await prisma.control.findMany({
      select: {
        controlId: true,
        family: true,
        title: true,
        priority: true,
        revision: true,
        publicationDate: true
      },
      orderBy: {
        controlId: 'asc'
      }
    });

    // Get counts by family
    const familyCounts = await prisma.control.groupBy({
      by: ['family'],
      _count: {
        id: true
      }
    });

    // Display family counts
    console.log('📊 Control Counts by Family:');
    console.log('');
    familyCounts.forEach(fc => {
      console.log(`   ${fc.family}: ${fc._count.id} controls`);
    });
    console.log('');

    // Display all controls
    console.log('📋 All Controls in Database:');
    console.log('');
    allControls.forEach(control => {
      console.log(`   ${control.controlId} | ${control.family} | ${control.title}`);
      console.log(`      Priority: ${control.priority} | Rev: ${control.revision} | Published: ${control.publicationDate}`);
    });
    console.log('');

    // Verification checks
    const totalCount = allControls.length;
    const acCount = allControls.filter(c => c.family === 'AC').length;
    const atCount = allControls.filter(c => c.family === 'AT').length;

    console.log('='.repeat(80));
    console.log('✅ Verification Results:');
    console.log('='.repeat(80));
    console.log(`Total Controls: ${totalCount}`);
    console.log(`AC Controls: ${acCount}`);
    console.log(`AT Controls: ${atCount}`);
    console.log('');

    // Check if all controls have Rev 3 format
    const invalidFormat = allControls.filter(c => !c.controlId.startsWith('03.'));
    if (invalidFormat.length > 0) {
      console.log('⚠️  WARNING: Some controls do not have Rev 3 format (03.XX.YY):');
      invalidFormat.forEach(c => console.log(`   - ${c.controlId}`));
    } else {
      console.log('✅ All controls use Rev 3 format (03.XX.YY)');
    }

    // Check revision field
    const wrongRevision = allControls.filter(c => c.revision !== '3');
    if (wrongRevision.length > 0) {
      console.log('⚠️  WARNING: Some controls have incorrect revision:');
      wrongRevision.forEach(c => console.log(`   - ${c.controlId}: Rev ${c.revision}`));
    } else {
      console.log('✅ All controls have revision = "3"');
    }

    // Check publication date
    const wrongDate = allControls.filter(c => c.publicationDate !== 'May 2024');
    if (wrongDate.length > 0) {
      console.log('⚠️  WARNING: Some controls have incorrect publication date:');
      wrongDate.forEach(c => console.log(`   - ${c.controlId}: ${c.publicationDate}`));
    } else {
      console.log('✅ All controls have publication date = "May 2024"');
    }

    console.log('');

    if (totalCount === 18 && acCount === 16 && atCount === 2) {
      console.log('🎉 SUCCESS: Phase 1 verification passed!');
    } else {
      console.log('❌ FAILED: Control counts do not match expected values');
      console.log(`   Expected: 18 total (16 AC + 2 AT)`);
      console.log(`   Actual: ${totalCount} total (${acCount} AC + ${atCount} AT)`);
    }
    console.log('');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyPhase1()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
