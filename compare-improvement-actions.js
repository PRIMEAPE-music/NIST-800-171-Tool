const fs = require('fs');
const path = require('path');

// Read all three files
const fullListPath = path.join(__dirname, 'INSTRUCTIONS', 'Microsoft Improvement Actions', 'microsoft improvement actions.md');
const nistListPath = path.join(__dirname, 'INSTRUCTIONS', 'NIST 800-171 assessment improvement actions.md');
const jsonMappingsPath = path.join(__dirname, 'data', 'microsoft-improvement-actions.json');

// Parse markdown list (one action per line)
function parseMarkdownList(content) {
  const lines = content.split('\n');
  const actions = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and lines that look like headers or markdown formatting
    if (trimmed.length > 0 &&
        !trimmed.startsWith('#') &&
        !trimmed.startsWith('=') &&
        !trimmed.startsWith('-') &&
        trimmed.length > 5) { // Skip very short lines that might be formatting
      actions.push(trimmed);
    }
  }

  return actions;
}

// Extract actions from JSON mappings
function extractActionsFromJson(jsonData) {
  const actions = new Set();

  for (const controlId in jsonData.mappings) {
    const control = jsonData.mappings[controlId];
    if (control.improvementActions) {
      control.improvementActions.forEach(action => {
        actions.add(action.title);
      });
    }
  }

  return Array.from(actions).sort();
}

// Normalize action names for comparison (handle minor variations)
function normalizeActionName(name) {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Find close matches (for fuzzy matching)
function findCloseMatches(action, actionsList) {
  const normalized = normalizeActionName(action);
  const matches = [];

  for (const item of actionsList) {
    const itemNormalized = normalizeActionName(item);
    if (itemNormalized === normalized) {
      matches.push({ action: item, type: 'exact' });
    } else if (itemNormalized.includes(normalized) || normalized.includes(itemNormalized)) {
      matches.push({ action: item, type: 'partial' });
    }
  }

  return matches;
}

console.log('='.repeat(80));
console.log('MICROSOFT 365 IMPROVEMENT ACTIONS COMPARISON ANALYSIS');
console.log('='.repeat(80));
console.log();

// Read files
console.log('Reading files...');
console.log('Full list path:', fullListPath);
console.log('NIST list path:', nistListPath);
console.log('JSON path:', jsonMappingsPath);
console.log();

const fullListContent = fs.readFileSync(fullListPath, 'utf-8');
const nistListContent = fs.readFileSync(nistListPath, 'utf-8');
const jsonMappings = JSON.parse(fs.readFileSync(jsonMappingsPath, 'utf-8'));

console.log('File contents lengths:');
console.log(`Full list: ${fullListContent.length} characters`);
console.log(`NIST list: ${nistListContent.length} characters`);
console.log();

// Debug: show first few lines
console.log('First 5 lines of NIST list:');
nistListContent.split('\n').slice(0, 5).forEach((line, i) => {
  console.log(`  Line ${i}: "${line}" (length: ${line.length})`);
  // Show character codes for first line to debug
  if (i === 0 && line.length > 0) {
    console.log(`    Char codes: ${[...line].slice(0, 20).map(c => c.charCodeAt(0)).join(', ')}`);
  }
});
console.log();

// Parse all lists
const fullList = parseMarkdownList(fullListContent);
const nistList = parseMarkdownList(nistListContent);
const jsonActions = extractActionsFromJson(jsonMappings);

console.log('📊 LIST SIZES:');
console.log(`   Full Compliance Manager List:        ${fullList.length} actions`);
console.log(`   NIST 800-171 Specific List:          ${nistList.length} actions`);
console.log(`   Current JSON Mappings:                ${jsonActions.length} actions`);
console.log();

// Analysis 1: NIST list vs JSON mappings
console.log('=' .repeat(80));
console.log('1️⃣  NIST 800-171 ACTIONS vs. CURRENT JSON MAPPINGS');
console.log('='.repeat(80));

const nistInJson = [];
const nistNotInJson = [];

for (const action of nistList) {
  const matches = findCloseMatches(action, jsonActions);
  if (matches.some(m => m.type === 'exact')) {
    nistInJson.push(action);
  } else {
    nistNotInJson.push({ action, partialMatches: matches });
  }
}

console.log(`✅ Actions in BOTH NIST list and JSON: ${nistInJson.length}/${nistList.length}`);
console.log(`❌ Actions in NIST list but NOT in JSON: ${nistNotInJson.length}/${nistList.length}`);
console.log();

if (nistNotInJson.length > 0) {
  console.log('Missing from JSON (first 10):');
  nistNotInJson.slice(0, 10).forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.action}`);
    if (item.partialMatches.length > 0) {
      console.log(`      └─ Partial match: ${item.partialMatches[0].action}`);
    }
  });
  if (nistNotInJson.length > 10) {
    console.log(`   ... and ${nistNotInJson.length - 10} more`);
  }
  console.log();
}

// Analysis 2: JSON mappings vs NIST list
console.log('='.repeat(80));
console.log('2️⃣  CURRENT JSON MAPPINGS vs. NIST 800-171 LIST');
console.log('='.repeat(80));

const jsonInNist = [];
const jsonNotInNist = [];

for (const action of jsonActions) {
  const matches = findCloseMatches(action, nistList);
  if (matches.some(m => m.type === 'exact')) {
    jsonInNist.push(action);
  } else {
    jsonNotInNist.push({ action, partialMatches: matches });
  }
}

console.log(`✅ JSON actions in NIST list: ${jsonInNist.length}/${jsonActions.length}`);
console.log(`⚠️  JSON actions NOT in NIST list: ${jsonNotInNist.length}/${jsonActions.length}`);
console.log();

if (jsonNotInNist.length > 0) {
  console.log('JSON actions not in NIST list (might not be NIST 800-171 specific):');
  console.log('(First 15 shown)');
  jsonNotInNist.slice(0, 15).forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.action}`);
  });
  if (jsonNotInNist.length > 15) {
    console.log(`   ... and ${jsonNotInNist.length - 15} more`);
  }
  console.log();
}

// Analysis 3: Coverage percentages
console.log('='.repeat(80));
console.log('3️⃣  COVERAGE ANALYSIS');
console.log('='.repeat(80));

const nistCoverage = (nistInJson.length / nistList.length * 100).toFixed(1);
const jsonPurity = (jsonInNist.length / jsonActions.length * 100).toFixed(1);

console.log(`NIST 800-171 Coverage: ${nistCoverage}%`);
console.log(`   (How many NIST-specific actions are in your JSON)`);
console.log();
console.log(`JSON Purity: ${jsonPurity}%`);
console.log(`   (How many JSON actions are actually NIST 800-171 specific)`);
console.log();

// Recommendation
console.log('='.repeat(80));
console.log('💡 RECOMMENDATION');
console.log('='.repeat(80));

if (nistCoverage >= 95 && jsonPurity >= 95) {
  console.log('✅ Your current JSON mappings are well-aligned with NIST 800-171!');
  console.log('   No changes needed - keep your current mappings.');
} else if (nistCoverage < 80) {
  console.log('⚠️  Your JSON is missing significant NIST 800-171 actions.');
  console.log('   Recommendation: Add missing actions to your JSON.');
} else if (jsonPurity < 80) {
  console.log('⚠️  Your JSON contains many non-NIST 800-171 actions.');
  console.log('   Recommendation: Consider filtering to only NIST 800-171 actions.');
} else {
  console.log('📝 Your mappings are mostly aligned with some gaps.');
  console.log('   Recommendation: Review and add missing NIST 800-171 actions.');
}
console.log();

// Save detailed results to file
const results = {
  summary: {
    fullListCount: fullList.length,
    nistListCount: nistList.length,
    jsonActionsCount: jsonActions.length,
    nistInJsonCount: nistInJson.length,
    nistNotInJsonCount: nistNotInJson.length,
    jsonInNistCount: jsonInNist.length,
    jsonNotInNistCount: jsonNotInNist.length,
    nistCoverage: `${nistCoverage}%`,
    jsonPurity: `${jsonPurity}%`
  },
  nistActionsNotInJson: nistNotInJson.map(item => item.action),
  jsonActionsNotInNist: jsonNotInNist.map(item => item.action),
  nistActionsInJson: nistInJson,
  jsonActionsInNist: jsonInNist
};

const resultsPath = path.join(__dirname, 'comparison-results.json');
fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

console.log(`📄 Detailed results saved to: comparison-results.json`);
console.log('='.repeat(80));
