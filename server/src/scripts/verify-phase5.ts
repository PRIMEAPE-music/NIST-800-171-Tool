import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyPhase5() {
  console.log('='.repeat(80));
  console.log('NIST 800-171 Rev 3 - Phases 1-5 Cumulative Verification');
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
      if (fc.family === 'MA' || fc.family === 'MP') phase = '(Phase 4)';
      if (fc.family === 'PS' || fc.family === 'PE') phase = '(Phase 5)';
      console.log(`   ${fc.family}: ${fc._count.id} controls ${phase}`);
    });
    console.log('');
    console.log(`   TOTAL: ${totalCount} controls`);
    console.log('');

    // Get Phase 5 controls specifically
    const psControls = await prisma.control.findMany({
      where: { family: 'PS' },
      select: { controlId: true, title: true, priority: true },
      orderBy: { controlId: 'asc' }
    });

    const peControls = await prisma.control.findMany({
      where: { family: 'PE' },
      select: { controlId: true, title: true, priority: true },
      orderBy: { controlId: 'asc' }
    });

    console.log('📋 Phase 5 Controls:');
    console.log('');
    console.log('PS (Personnel Security) - 2 controls:');
    psControls.forEach(c => {
      console.log(`   ${c.controlId} - ${c.title} [${c.priority}]`);
    });
    console.log('');
    console.log('PE (Physical Protection) - 5 controls:');
    peControls.forEach(c => {
      console.log(`   ${c.controlId} - ${c.title} [${c.priority}]`);
    });
    console.log('');

    // Verification checks
    const acCount = await prisma.control.count({ where: { family: 'AC' } });
    const atCount = await prisma.control.count({ where: { family: 'AT' } });
    const auCount = await prisma.control.count({ where: { family: 'AU' } });
    const cmCount = await prisma.control.count({ where: { family: 'CM' } });
    const iaCount = await prisma.control.count({ where: { family: 'IA' } });
    const irCount = await prisma.control.count({ where: { family: 'IR' } });
    const maCount = await prisma.control.count({ where: { family: 'MA' } });
    const mpCount = await prisma.control.count({ where: { family: 'MP' } });
    const psCount = psControls.length;
    const peCount = peControls.length;

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
    console.log('Phase 4 (Completed):');
    console.log(`   MA: ${maCount} controls (expected: 3) ${maCount === 3 ? '✅' : '❌'}`);
    console.log(`   MP: ${mpCount} controls (expected: 7) ${mpCount === 7 ? '✅' : '❌'}`);
    console.log('');
    console.log('Phase 5 (Completed):');
    console.log(`   PS: ${psCount} controls (expected: 2) ${psCount === 2 ? '✅' : '❌'}`);
    console.log(`   PE: ${peCount} controls (expected: 5) ${peCount === 5 ? '✅' : '❌'}`);
    console.log('');
    console.log(`Total: ${totalCount} controls (expected: 66) ${totalCount === 66 ? '✅' : '❌'}`);
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

    const expectedTotal = 66;
    const phase1Expected = 18;
    const phase2Expected = 18;
    const phase3Expected = 13;
    const phase4Expected = 10;
    const phase5Expected = 7;

    if (totalCount === expectedTotal &&
        acCount === 16 && atCount === 2 &&
        auCount === 8 && cmCount === 10 &&
        iaCount === 8 && irCount === 5 &&
        maCount === 3 && mpCount === 7 &&
        psCount === 2 && peCount === 5) {
      console.log('='.repeat(80));
      console.log('🎉 SUCCESS: Phases 1-5 verification passed!');
      console.log('='.repeat(80));
      console.log('');
      console.log('Summary:');
      console.log(`   ✅ Phase 1: ${phase1Expected} controls (AC: 16, AT: 2)`);
      console.log(`   ✅ Phase 2: ${phase2Expected} controls (AU: 8, CM: 10)`);
      console.log(`   ✅ Phase 3: ${phase3Expected} controls (IA: 8, IR: 5)`);
      console.log(`   ✅ Phase 4: ${phase4Expected} controls (MA: 3, MP: 7)`);
      console.log(`   ✅ Phase 5: ${phase5Expected} controls (PS: 2, PE: 5)`);
      console.log(`   ✅ Total: ${expectedTotal} controls`);
      console.log('');
      console.log('🎯 Progress: 66/97 controls (68.0%)');
      console.log('');
      console.log('Remaining: 31 controls across 3 phases');
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

verifyPhase5()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
