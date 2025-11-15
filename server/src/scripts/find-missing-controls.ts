import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Complete list of NIST 800-171 Rev 3 control IDs (110 total)
const NIST_800_171_R3_CONTROLS = [
  // AC - Access Control (14 controls)
  '03.01.01', '03.01.02', '03.01.03', '03.01.04', '03.01.05',
  '03.01.06', '03.01.07', '03.01.08', '03.01.09', '03.01.10',
  '03.01.11', '03.01.12', '03.01.16', '03.01.18',
  '03.01.19', '03.01.20', '03.01.21', '03.01.22',

  // AT - Awareness and Training (2 controls)
  '03.02.01', '03.02.02',

  // AU - Audit and Accountability (8 controls)
  '03.03.01', '03.03.02', '03.03.03', '03.03.04', '03.03.05',
  '03.03.06', '03.03.07', '03.03.08',

  // CA - Assessment, Authorization, and Monitoring (4 controls)
  '03.12.01', '03.12.02', '03.12.03', '03.12.04',

  // CM - Configuration Management (10 controls)
  '03.04.01', '03.04.02', '03.04.03', '03.04.04', '03.04.05',
  '03.04.06', '03.04.08', '03.04.10', '03.04.11', '03.04.12',

  // CP - Contingency Planning (1 control)
  '03.07.01',

  // IA - Identification and Authentication (7 controls)
  '03.05.01', '03.05.02', '03.05.03', '03.05.04', '03.05.05',
  '03.05.07', '03.05.11',

  // IR - Incident Response (5 controls)
  '03.06.01', '03.06.02', '03.06.03', '03.06.04', '03.06.05',

  // MA - Maintenance (3 controls)
  '03.07.02', '03.07.05', '03.07.06',

  // MP - Media Protection (6 controls)
  '03.08.01', '03.08.02', '03.08.03', '03.08.04', '03.08.05',
  '03.08.07',

  // PE - Physical and Environmental Protection (5 controls)
  '03.10.01', '03.10.02', '03.10.03', '03.10.04', '03.10.05',

  // PL - Planning (3 controls)
  '03.11.01', '03.11.02', '03.11.03',

  // PS - Personnel Security (2 controls)
  '03.09.01', '03.09.02',

  // RA - Risk Assessment (3 controls)
  '03.11.01', '03.11.02', '03.11.03',

  // SA - System and Services Acquisition (3 controls)
  '03.15.01', '03.15.02', '03.15.03',

  // SC - System and Communications Protection (10 controls)
  '03.13.01', '03.13.02', '03.13.03', '03.13.04', '03.13.05',
  '03.13.06', '03.13.07', '03.13.08', '03.13.09', '03.13.10',
  '03.13.11', '03.13.12', '03.13.13', '03.13.15',

  // SI - System and Information Integrity (5 controls)
  '03.14.01', '03.14.02', '03.14.03', '03.14.04', '03.14.05',
  '03.14.06',

  // SR - Supply Chain Risk Management (3 controls)
  '03.16.01', '03.16.02', '03.16.03',
];

async function findMissingControls() {
  console.log('🔍 Finding Missing NIST 800-171r3 Controls\n');
  console.log('='.repeat(70) + '\n');

  // Get all control IDs from database
  const dbControls = await prisma.control.findMany({
    select: { controlId: true, title: true, family: true },
    orderBy: { controlId: 'asc' },
  });

  const dbControlIds = new Set(dbControls.map(c => c.controlId));

  console.log(`Expected NIST 800-171r3 controls: ${NIST_800_171_R3_CONTROLS.length}`);
  console.log(`Controls in database: ${dbControls.length}`);
  console.log(`Missing: ${NIST_800_171_R3_CONTROLS.length - dbControls.length}\n`);

  // Find missing controls
  const missingControls = NIST_800_171_R3_CONTROLS.filter(
    id => !dbControlIds.has(id)
  );

  if (missingControls.length === 0) {
    console.log('✅ No missing controls! Database has all 110 NIST 800-171r3 controls.');
    await prisma.$disconnect();
    return;
  }

  console.log('='.repeat(70));
  console.log('❌ MISSING CONTROLS REPORT');
  console.log('='.repeat(70) + '\n');

  // Group by family for better organization
  const familyMap: { [key: string]: string[] } = {};

  missingControls.forEach(controlId => {
    const family = controlId.substring(3, 5);
    if (!familyMap[family]) {
      familyMap[family] = [];
    }
    familyMap[family].push(controlId);
  });

  // Map family codes to names
  const familyNames: { [key: string]: string } = {
    '01': 'AC - Access Control',
    '02': 'AT - Awareness and Training',
    '03': 'AU - Audit and Accountability',
    '04': 'CM - Configuration Management',
    '05': 'IA - Identification and Authentication',
    '06': 'IR - Incident Response',
    '07': 'MA/CP - Maintenance/Contingency Planning',
    '08': 'MP - Media Protection',
    '09': 'PS - Personnel Security',
    '10': 'PE - Physical and Environmental Protection',
    '11': 'PL/RA - Planning/Risk Assessment',
    '12': 'CA - Assessment, Authorization, and Monitoring',
    '13': 'SC - System and Communications Protection',
    '14': 'SI - System and Information Integrity',
    '15': 'SA - System and Services Acquisition',
    '16': 'SR - Supply Chain Risk Management',
  };

  console.log(`Total Missing Controls: ${missingControls.length}\n`);

  Object.keys(familyMap).sort().forEach(familyCode => {
    const familyName = familyNames[familyCode] || `Family ${familyCode}`;
    const controls = familyMap[familyCode];

    console.log(`${familyName}:`);
    controls.forEach(controlId => {
      console.log(`  ❌ ${controlId}`);
    });
    console.log('');
  });

  console.log('='.repeat(70));
  console.log('📋 DETAILED MISSING CONTROLS LIST');
  console.log('='.repeat(70) + '\n');

  missingControls.forEach((controlId, index) => {
    console.log(`${index + 1}. ${controlId}`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('💡 RECOMMENDATIONS');
  console.log('='.repeat(70) + '\n');

  console.log('To fix this issue, you need to:');
  console.log('1. Add the missing controls to the database');
  console.log('2. Ensure each control has the correct:');
  console.log('   - Control ID');
  console.log('   - Title');
  console.log('   - Family assignment');
  console.log('   - Description');
  console.log('   - Priority level\n');

  console.log('You can either:');
  console.log('A) Add them manually through the UI');
  console.log('B) Create a seed script with the missing controls');
  console.log('C) Import from the official NIST 800-171r3 JSON file\n');

  console.log('='.repeat(70) + '\n');

  await prisma.$disconnect();
}

findMissingControls().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
