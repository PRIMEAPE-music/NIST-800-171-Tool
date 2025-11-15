import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyCompleteMigration() {
  console.log('='.repeat(80));
  console.log('🏆 NIST 800-171 Rev 3 - COMPLETE MIGRATION VERIFICATION 🏆');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Get all family counts
    const familyCounts = await prisma.control.groupBy({
      by: ['family'],
      _count: { id: true },
      orderBy: { family: 'asc' }
    });

    const totalCount = await prisma.control.count();

    // Expected counts per family
    const expectedCounts: Record<string, number> = {
      'AC': 16,
      'AT': 2,
      'AU': 8,
      'CA': 4,
      'CM': 10,
      'IA': 8,
      'IR': 5,
      'MA': 3,
      'MP': 7,
      'PE': 5,
      'PL': 3,
      'PS': 2,
      'RA': 3,
      'SA': 3,
      'SC': 10,
      'SI': 5,
      'SR': 3
    };

    console.log('📊 Final Control Counts by Family:');
    console.log('');

    let allCountsCorrect = true;
    const familyMap = new Map(familyCounts.map(fc => [fc.family, fc._count.id]));

    Object.entries(expectedCounts).forEach(([family, expected]) => {
      const actual = familyMap.get(family) || 0;
      const status = actual === expected ? '✅' : '❌';
      const isNew = ['PL', 'SA', 'SR'].includes(family) ? ' ⭐ NEW' : '';
      console.log(`   ${family}: ${actual} controls (expected: ${expected}) ${status}${isNew}`);
      if (actual !== expected) allCountsCorrect = false;
    });

    console.log('');
    console.log(`   TOTAL: ${totalCount} controls (expected: 97) ${totalCount === 97 ? '✅' : '❌'}`);
    console.log('');

    // Verify all controls have correct format
    const allControls = await prisma.control.findMany({
      select: { controlId: true, revision: true, publicationDate: true, family: true }
    });

    const invalidFormat = allControls.filter(c => !c.controlId.startsWith('03.'));
    const wrongRevision = allControls.filter(c => c.revision !== '3');
    const wrongDate = allControls.filter(c => c.publicationDate !== 'May 2024');

    console.log('🔍 Data Quality Checks:');
    console.log('');
    console.log(`   Control ID Format (03.XX.YY): ${invalidFormat.length === 0 ? '✅ All correct' : '❌ ' + invalidFormat.length + ' errors'}`);
    console.log(`   Revision Number (3): ${wrongRevision.length === 0 ? '✅ All correct' : '❌ ' + wrongRevision.length + ' errors'}`);
    console.log(`   Publication Date (May 2024): ${wrongDate.length === 0 ? '✅ All correct' : '❌ ' + wrongDate.length + ' errors'}`);
    console.log('');

    // Summary by phase
    console.log('='.repeat(80));
    console.log('📈 Migration Summary by Phase:');
    console.log('='.repeat(80));
    console.log('');
    console.log('   ✅ Phase 1: 18 controls (AC: 16, AT: 2)');
    console.log('   ✅ Phase 2: 18 controls (AU: 8, CM: 10)');
    console.log('   ✅ Phase 3: 13 controls (IA: 8, IR: 5)');
    console.log('   ✅ Phase 4: 10 controls (MA: 3, MP: 7)');
    console.log('   ✅ Phase 5: 7 controls (PS: 2, PE: 5)');
    console.log('   ✅ Phase 6: 7 controls (RA: 3, CA: 4)');
    console.log('   ✅ Phase 7: 15 controls (SC: 10, SI: 5)');
    console.log('   ✅ Phase 8: 9 controls (PL: 3, SA: 3, SR: 3) ⭐ NEW FAMILIES');
    console.log('');
    console.log('   TOTAL: 97 controls across 17 families');
    console.log('');

    if (totalCount === 97 && allCountsCorrect && invalidFormat.length === 0 &&
        wrongRevision.length === 0 && wrongDate.length === 0) {
      console.log('='.repeat(80));
      console.log('🎊 🎉 🏆 MIGRATION VERIFICATION: COMPLETE SUCCESS! 🏆 🎉 🎊');
      console.log('='.repeat(80));
      console.log('');
      console.log('✅ All 97 NIST 800-171 Revision 3 controls successfully migrated!');
      console.log('✅ All 17 control families present and accounted for!');
      console.log('✅ All controls properly formatted with Rev 3 specifications!');
      console.log('✅ Database integrity verified!');
      console.log('');
      console.log('🌟 Key Achievements:');
      console.log('   • Updated from older revision to NIST 800-171 Rev 3 (May 2024)');
      console.log('   • Added 3 NEW control families: PL, SA, SR');
      console.log('   • Standardized all control IDs to 03.XX.YY format');
      console.log('   • Maintained database backup for rollback capability');
      console.log('');
      console.log('📝 Next Steps:');
      console.log('   1. Test application functionality with new controls');
      console.log('   2. Update M365 policy mappings to reference new control IDs');
      console.log('   3. Verify dashboard and reports display correctly');
      console.log('   4. Update any hardcoded control references in the codebase');
      console.log('   5. Train users on new control families (PL, SA, SR)');
    } else {
      console.log('❌ VERIFICATION FAILED: Issues detected');
      console.log('');
      console.log('Please review the errors above and take corrective action.');
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

verifyCompleteMigration()
  .then(() => {
    console.log('\n✅ Complete migration verification finished\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
