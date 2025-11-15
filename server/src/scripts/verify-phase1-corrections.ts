import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXPECTED_CONTROL_COUNT = 110;

const CRITICAL_CONTROLS = [
  { id: '03.05.02', expectedTitle: 'Device Authentication', expectedFamily: 'IA' },
  { id: '03.05.07', expectedTitle: 'Password Management', expectedFamily: 'IA' },
  { id: '03.04.01', expectedTitle: 'Baseline Configuration', expectedFamily: 'CM' },
  { id: '03.04.02', expectedTitle: 'Configuration Settings', expectedFamily: 'CM' },
  { id: '03.05.01', expectedTitle: 'Identification and Authentication', expectedFamily: 'IA' },
  { id: '03.05.05', expectedTitle: 'Identifier Management', expectedFamily: 'IA' },
  { id: '03.08.03', expectedTitle: 'Media Sanitization', expectedFamily: 'MP' },
  { id: '03.04.03', expectedTitle: 'Configuration Change Control', expectedFamily: 'CM' },
];

const WITHDRAWN_CONTROLS = [
  '03.01.13', '03.01.14', '03.01.15', '03.01.17',
  '03.02.03', '03.03.09', '03.04.07', '03.04.09',
  '03.05.06', '03.05.08', '03.05.09', '03.05.10',
  '03.08.06', '03.08.08', '03.13.14', '03.13.16',
  '03.14.07',
];

async function verifyPhase1Corrections() {
  console.log('🔍 NIST 800-171r3 Phase 1 Corrections Verification\n');
  console.log('='.repeat(70) + '\n');

  let allTestsPassed = true;

  // Test 1: Total Control Count
  console.log('Test 1: Verify Total Control Count');
  const totalControls = await prisma.control.count();

  if (totalControls === EXPECTED_CONTROL_COUNT) {
    console.log(`✅ PASS: Database has exactly ${EXPECTED_CONTROL_COUNT} controls`);
  } else {
    console.log(`❌ FAIL: Expected ${EXPECTED_CONTROL_COUNT} controls, found ${totalControls}`);
    allTestsPassed = false;
  }

  // Test 2: Withdrawn Controls Removed
  console.log('\nTest 2: Verify Withdrawn Controls Removed');
  const withdrawnStillPresent = await prisma.control.findMany({
    where: { controlId: { in: WITHDRAWN_CONTROLS } },
    select: { controlId: true, title: true },
  });

  if (withdrawnStillPresent.length === 0) {
    console.log('✅ PASS: All withdrawn controls have been removed');
  } else {
    console.log(`❌ FAIL: Found ${withdrawnStillPresent.length} withdrawn controls still in database:`);
    withdrawnStillPresent.forEach((c) => {
      console.log(`   - ${c.controlId}: ${c.title}`);
    });
    allTestsPassed = false;
  }

  // Test 3: Critical Control Titles Correct
  console.log('\nTest 3: Verify Critical Control Titles and Families');
  let criticalTestsPassed = 0;

  for (const expected of CRITICAL_CONTROLS) {
    const control = await prisma.control.findUnique({
      where: { controlId: expected.id },
    });

    if (!control) {
      console.log(`❌ FAIL: Control ${expected.id} not found in database`);
      allTestsPassed = false;
      continue;
    }

    const titleMatch = control.title === expected.expectedTitle;
    const familyMatch = control.family === expected.expectedFamily;

    if (titleMatch && familyMatch) {
      console.log(`✅ ${expected.id}: Correct`);
      criticalTestsPassed++;
    } else {
      console.log(`❌ ${expected.id}: INCORRECT`);
      if (!titleMatch) {
        console.log(`   Expected: "${expected.expectedTitle}"`);
        console.log(`   Found: "${control.title}"`);
      }
      if (!familyMatch) {
        console.log(`   Expected Family: ${expected.expectedFamily}`);
        console.log(`   Found Family: ${control.family}`);
      }
      allTestsPassed = false;
    }
  }

  console.log(`\n   Passed: ${criticalTestsPassed}/${CRITICAL_CONTROLS.length} critical controls`);

  // Test 4: Family Distribution
  console.log('\nTest 4: Control Family Distribution');
  const familyCounts = await prisma.control.groupBy({
    by: ['family'],
    _count: { family: true },
  });

  const familyMap = new Map(
    familyCounts.map((f) => [f.family, f._count.family])
  );

  const expectedFamilies = {
    AC: 14, AT: 2, AU: 8, CA: 4, CM: 10,
    IA: 7, IR: 5, MA: 3, MP: 6, PE: 5,
    PL: 3, PS: 2, RA: 3, SA: 3, SC: 10,
    SI: 5, SR: 3, CP: 1,
  };

  console.log('Family | Expected | Actual | Status');
  console.log('-------|----------|--------|--------');

  Object.entries(expectedFamilies).forEach(([family, expected]) => {
    const actual = familyMap.get(family) || 0;
    const status = actual === expected ? '✅' : '❌';
    console.log(`${family.padEnd(6)} | ${String(expected).padEnd(8)} | ${String(actual).padEnd(6)} | ${status}`);

    if (actual !== expected) {
      allTestsPassed = false;
    }
  });

  // Final Summary
  console.log('\n' + '='.repeat(70));
  if (allTestsPassed) {
    console.log('✅ ALL TESTS PASSED - Phase 1 corrections completed successfully!');
    console.log('\nYour database now has:');
    console.log(`  - Exactly ${EXPECTED_CONTROL_COUNT} NIST 800-171r3 controls`);
    console.log('  - No withdrawn controls');
    console.log('  - Correct titles and family assignments');
    console.log('\n✨ Ready to proceed to Phase 2!');
  } else {
    console.log('❌ SOME TESTS FAILED - Review errors above');
    console.log('\nRecommended actions:');
    console.log('  1. Review failed tests');
    console.log('  2. Re-run correction scripts if needed');
    console.log('  3. Check database backup if major issues');
  }
  console.log('='.repeat(70) + '\n');

  await prisma.$disconnect();
  process.exit(allTestsPassed ? 0 : 1);
}

verifyPhase1Corrections().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
