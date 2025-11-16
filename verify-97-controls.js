const data = require('./data/nist-improvement-actions.json');

// Official NIST 800-171 Rev 3 Active Controls (97 total)
// Based on NIST SP 800-171r3 May 2024
const officialControls = {
  AC: ['03.01.01', '03.01.02', '03.01.03', '03.01.04', '03.01.05', '03.01.06', '03.01.07',
       '03.01.08', '03.01.09', '03.01.10', '03.01.11', '03.01.12', '03.01.16', '03.01.18',
       '03.01.19', '03.01.20', '03.01.21', '03.01.22'], // 18 controls (03.01.13-15, 17 were withdrawn)
  AT: ['03.02.01', '03.02.02'], // 2 controls
  AU: ['03.03.01', '03.03.02', '03.03.03', '03.03.04', '03.03.05', '03.03.06', '03.03.07',
       '03.03.08'], // 8 controls
  CM: ['03.04.01', '03.04.02', '03.04.03', '03.04.04', '03.04.05', '03.04.06', '03.04.08',
       '03.04.10', '03.04.11', '03.04.12'], // 10 controls (03.04.07, 09 withdrawn)
  CP: ['03.06.01', '03.06.02', '03.06.03'], // 3 controls
  IA: ['03.05.01', '03.05.02', '03.05.03', '03.05.04', '03.05.05', '03.05.07', '03.05.11'], // 7 controls (03.05.06, 08-10 withdrawn)
  IR: ['03.06.04', '03.06.05'], // 2 controls (under 03.06 family but IR)
  MA: ['03.07.02', '03.07.05', '03.07.06'], // 3 controls (03.07.01, 03-04 withdrawn)
  MP: ['03.08.01', '03.08.02', '03.08.03', '03.08.04', '03.08.05', '03.08.07'], // 6 controls (03.08.06 withdrawn)
  PE: ['03.10.01', '03.10.02', '03.10.03', '03.10.04', '03.10.05'], // 5 controls
  PL: ['03.11.01', '03.11.02', '03.11.03'], // 3 controls (NEW in Rev 3, renumbered from 03.15.x)
  PS: ['03.09.01', '03.09.02'], // 2 controls
  RA: ['03.12.01', '03.12.02', '03.12.03', '03.12.04'], // 4 controls
  SA: ['03.15.01', '03.15.02', '03.15.03'], // 3 controls (NEW numbering in Rev 3, renumbered from 03.16.x)
  SC: ['03.13.01', '03.13.02', '03.13.03', '03.13.04', '03.13.05', '03.13.06', '03.13.07',
       '03.13.08', '03.13.09', '03.13.10', '03.13.11', '03.13.12', '03.13.13', '03.13.15'], // 14 controls (03.13.14, 16 withdrawn)
  SI: ['03.14.01', '03.14.02', '03.14.03', '03.14.04', '03.14.05', '03.14.06'], // 6 controls (03.14.07, 08 withdrawn or moved)
  SR: ['03.17.01', '03.17.02', '03.17.03'] // 3 controls (NEW in Rev 3)
};

// Flatten to single array
const officialControlList = Object.values(officialControls).flat().sort();
const totalOfficial = officialControlList.length;

// Get controls from current implementation
const implementedControls = Object.keys(data.mappings).sort();
const totalImplemented = implementedControls.length;

console.log('=== NIST 800-171 Rev 3 Control Verification ===\n');
console.log(`Official NIST Rev 3 Controls: ${totalOfficial}`);
console.log(`Implemented in your code:     ${totalImplemented}`);
console.log(`Difference:                   ${totalImplemented - totalOfficial}\n`);

// Find missing controls
const missing = officialControlList.filter(id => !implementedControls.includes(id));
if (missing.length > 0) {
  console.log('❌ MISSING CONTROLS (in official list but not in your code):');
  missing.forEach(id => {
    console.log(`   ${id}`);
  });
  console.log();
}

// Find extra controls
const extra = implementedControls.filter(id => !officialControlList.includes(id));
if (extra.length > 0) {
  console.log('⚠️  EXTRA CONTROLS (in your code but not in official list):');
  extra.forEach(id => {
    const ctrl = data.mappings[id];
    console.log(`   ${id} - ${ctrl.controlTitle} (Family: ${ctrl.family})`);
  });
  console.log();
}

// Verify counts by family
console.log('=== Control Count by Family ===');
const familyCounts = {};
implementedControls.forEach(id => {
  const family = data.mappings[id].family;
  familyCounts[family] = (familyCounts[family] || 0) + 1;
});

const officialCounts = {};
Object.entries(officialControls).forEach(([family, controls]) => {
  officialCounts[family] = controls.length;
});

const allFamilies = [...new Set([...Object.keys(familyCounts), ...Object.keys(officialCounts)])].sort();
allFamilies.forEach(family => {
  const implemented = familyCounts[family] || 0;
  const official = officialCounts[family] || 0;
  const status = implemented === official ? '✓' : '✗';
  console.log(`${status} ${family}: ${implemented}/${official}`);
});

console.log('\n=== Summary ===');
if (missing.length === 0 && extra.length === 0) {
  console.log('✅ Perfect match! All 97 controls are correctly implemented.');
} else {
  console.log(`Need to fix: ${extra.length} extra control(s), ${missing.length} missing control(s)`);
  console.log('\nTo fix:');
  if (extra.length > 0) {
    console.log(`1. Remove these ${extra.length} extra control(s): ${extra.join(', ')}`);
  }
  if (missing.length > 0) {
    console.log(`2. Add these ${missing.length} missing control(s): ${missing.join(', ')}`);
  }
}
