import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyPhase2() {
  console.log('='.repeat(80));
  console.log('NIST 800-171 Rev 3 - Phase 1 & 2 Cumulative Verification');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Get counts by family
    const familyCounts = await prisma.control.groupBy({
      by: ['family'],
      _count: {
        id: true
      },
      orderBy: {
        family: 'asc'
      }
    });

    const totalCount = await prisma.control.count();

    console.log('📊 Control Counts by Family:');
    console.log('');
    familyCounts.forEach(fc => {
      let phase = '';
      if (fc.family === 'AC' || fc.family === 'AT') phase = '(Phase 1)';
      if (fc.family === 'AU' || fc.family === 'CM') phase = '(Phase 2)';
      console.log(`   ${fc.family}: ${fc._count.id} controls ${phase}`);
    });
    console.log('');
    console.log(`   TOTAL: ${totalCount} controls`);
    console.log('');

    // Get AU and CM controls specifically
    const auControls = await prisma.control.findMany({
      where: { family: 'AU' },
      select: { controlId: true, title: true, priority: true },
      orderBy: { controlId: 'asc' }
    });

    const cmControls = await prisma.control.findMany({
      where: { family: 'CM' },
      select: { controlId: true, title: true, priority: true },
      orderBy: { controlId: 'asc' }
    });

    console.log('📋 Phase 2 Controls:');
    console.log('');
    console.log('AU (Audit and Accountability) - 8 controls:');
    auControls.forEach(c => {
      console.log(`   ${c.controlId} - ${c.title} [${c.priority}]`);
    });
    console.log('');
    console.log('CM (Configuration Management) - 10 controls:');
    cmControls.forEach(c => {
      console.log(`   ${c.controlId} - ${c.title} [${c.priority}]`);
    });
    console.log('');

    // Verification checks
    const acCount = await prisma.control.count({ where: { family: 'AC' } });
    const atCount = await prisma.control.count({ where: { family: 'AT' } });
    const auCount = auControls.length;
    const cmCount = cmControls.length;

    console.log('='.repeat(80));
    console.log('✅ Verification Results:');
    console.log('='.repeat(80));
    console.log('');
    console.log('Phase 1 (Completed):');
    console.log(`   AC: ${acCount} controls (expected: 16) ${acCount === 16 ? '✅' : '❌'}`);
    console.log(`   AT: ${atCount} controls (expected: 2) ${atCount === 2 ? '✅' : '❌'}`);
    console.log('');
    console.log('Phase 2 (Completed):');
    console.log(`   AU: ${auCount} controls (expected: 8) ${auCount === 8 ? '✅' : '❌'}`);
    console.log(`   CM: ${cmCount} controls (expected: 10) ${cmCount === 10 ? '✅' : '❌'}`);
    console.log('');
    console.log(`Total: ${totalCount} controls (expected: 36) ${totalCount === 36 ? '✅' : '❌'}`);
    console.log('');

    // Check for proper Rev 3 format
    const allControls = await prisma.control.findMany({
      select: { controlId: true, revision: true, publicationDate: true }
    });

    const invalidFormat = allControls.filter(c => !c.controlId.startsWith('03.'));
    const wrongRevision = allControls.filter(c => c.revision !== '3');
    const wrongDate = allControls.filter(c => c.publicationDate !== 'May 2024');

    if (invalidFormat.length === 0 && wrongRevision.length === 0 && wrongDate.length === 0) {
      console.log('✅ All controls properly formatted for Rev 3');
      console.log('   - Control ID format: 03.XX.YY');
      console.log('   - Revision: 3');
      console.log('   - Publication: May 2024');
    } else {
      if (invalidFormat.length > 0) {
        console.log('⚠️  Controls with invalid format:', invalidFormat.length);
      }
      if (wrongRevision.length > 0) {
        console.log('⚠️  Controls with wrong revision:', wrongRevision.length);
      }
      if (wrongDate.length > 0) {
        console.log('⚠️  Controls with wrong date:', wrongDate.length);
      }
    }

    console.log('');

    const expectedTotal = 36;
    const phase1Expected = 18;
    const phase2Expected = 18;

    if (totalCount === expectedTotal &&
        acCount === 16 && atCount === 2 &&
        auCount === 8 && cmCount === 10) {
      console.log('='.repeat(80));
      console.log('🎉 SUCCESS: Phase 1 & 2 verification passed!');
      console.log('='.repeat(80));
      console.log('');
      console.log('Summary:');
      console.log(`   ✅ Phase 1: ${phase1Expected} controls (AC: 16, AT: 2)`);
      console.log(`   ✅ Phase 2: ${phase2Expected} controls (AU: 8, CM: 10)`);
      console.log(`   ✅ Total: ${expectedTotal} controls`);
      console.log('');
      console.log('Progress: 36/97 controls (37.1%)');
      console.log('Remaining: 61 controls across 6 phases');
    } else {
      console.log('❌ FAILED: Control counts do not match expected values');
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

verifyPhase2()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
