import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyPhase3() {
  console.log('='.repeat(80));
  console.log('NIST 800-171 Rev 3 - Phases 1-3 Cumulative Verification');
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
      if (fc.family === 'IA' || fc.family === 'IR') phase = '(Phase 3)';
      console.log(`   ${fc.family}: ${fc._count.id} controls ${phase}`);
    });
    console.log('');
    console.log(`   TOTAL: ${totalCount} controls`);
    console.log('');

    // Get Phase 3 controls specifically
    const iaControls = await prisma.control.findMany({
      where: { family: 'IA' },
      select: { controlId: true, title: true, priority: true },
      orderBy: { controlId: 'asc' }
    });

    const irControls = await prisma.control.findMany({
      where: { family: 'IR' },
      select: { controlId: true, title: true, priority: true },
      orderBy: { controlId: 'asc' }
    });

    console.log('📋 Phase 3 Controls:');
    console.log('');
    console.log('IA (Identification and Authentication) - 8 controls:');
    iaControls.forEach(c => {
      console.log(`   ${c.controlId} - ${c.title} [${c.priority}]`);
    });
    console.log('');
    console.log('IR (Incident Response) - 5 controls:');
    irControls.forEach(c => {
      console.log(`   ${c.controlId} - ${c.title} [${c.priority}]`);
    });
    console.log('');

    // Verification checks
    const acCount = await prisma.control.count({ where: { family: 'AC' } });
    const atCount = await prisma.control.count({ where: { family: 'AT' } });
    const auCount = await prisma.control.count({ where: { family: 'AU' } });
    const cmCount = await prisma.control.count({ where: { family: 'CM' } });
    const iaCount = iaControls.length;
    const irCount = irControls.length;

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
    console.log('Phase 3 (Completed):');
    console.log(`   IA: ${iaCount} controls (expected: 8) ${iaCount === 8 ? '✅' : '❌'}`);
    console.log(`   IR: ${irCount} controls (expected: 5) ${irCount === 5 ? '✅' : '❌'}`);
    console.log('');
    console.log(`Total: ${totalCount} controls (expected: 49) ${totalCount === 49 ? '✅' : '❌'}`);
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

    const expectedTotal = 49;
    const phase1Expected = 18;
    const phase2Expected = 18;
    const phase3Expected = 13;

    if (totalCount === expectedTotal &&
        acCount === 16 && atCount === 2 &&
        auCount === 8 && cmCount === 10 &&
        iaCount === 8 && irCount === 5) {
      console.log('='.repeat(80));
      console.log('🎉 SUCCESS: Phases 1-3 verification passed!');
      console.log('='.repeat(80));
      console.log('');
      console.log('Summary:');
      console.log(`   ✅ Phase 1: ${phase1Expected} controls (AC: 16, AT: 2)`);
      console.log(`   ✅ Phase 2: ${phase2Expected} controls (AU: 8, CM: 10)`);
      console.log(`   ✅ Phase 3: ${phase3Expected} controls (IA: 8, IR: 5)`);
      console.log(`   ✅ Total: ${expectedTotal} controls`);
      console.log('');
      console.log('🎯 Progress: 49/97 controls (50.5%) - HALFWAY THERE!');
      console.log('');
      console.log('Remaining: 48 controls across 5 phases');
      console.log('   - Phase 4: MA, MP (10 controls)');
      console.log('   - Phase 5: PS, PE (7 controls)');
      console.log('   - Phase 6: RA, CA (7 controls)');
      console.log('   - Phase 7: SC, SI (15 controls)');
      console.log('   - Phase 8: PL, SA, SR (9 controls)');
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

verifyPhase3()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
