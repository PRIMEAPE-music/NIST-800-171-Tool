const fs = require('fs');
const path = require('path');

// Read the existing JSON and NIST list
const nistListPath = path.join(__dirname, 'INSTRUCTIONS', 'NIST 800-171 assessment improvement actions.md');
const currentJsonPath = path.join(__dirname, 'data', 'microsoft-improvement-actions.json');

console.log('📋 Generating NIST 800-171 Specific Improvement Actions JSON...\n');

// Parse markdown list
function parseMarkdownList(content) {
  const lines = content.split('\n');
  const actions = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 &&
        !trimmed.startsWith('#') &&
        !trimmed.startsWith('=') &&
        !trimmed.startsWith('-') &&
        trimmed.length > 5) {
      actions.push(trimmed);
    }
  }

  return actions;
}

// Create URL-safe slug from action title
function createActionSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Try to find existing mapping for an action
function findExistingMapping(actionTitle, currentMappings) {
  const normalizedTitle = actionTitle.toLowerCase().trim();

  for (const controlId in currentMappings.mappings) {
    const control = currentMappings.mappings[controlId];
    if (control.improvementActions) {
      const found = control.improvementActions.find(action =>
        action.title.toLowerCase().trim() === normalizedTitle
      );
      if (found) {
        return {
          controlId,
          category: found.category,
          priority: found.priority
        };
      }
    }
  }

  return null;
}

// Categorize action based on keywords
function categorizeAction(title) {
  const lower = title.toLowerCase();

  if (lower.includes('multi-factor') || lower.includes('mfa') || lower.includes('authentication') || lower.includes('password')) {
    return { category: 'Identity', priority: 'High' };
  }
  if (lower.includes('device') || lower.includes('mobile') || lower.includes('endpoint')) {
    return { category: 'Device', priority: 'Medium' };
  }
  if (lower.includes('data') || lower.includes('dlp') || lower.includes('encryption') || lower.includes('sensitivity')) {
    return { category: 'Data', priority: 'High' };
  }
  if (lower.includes('audit') || lower.includes('log') || lower.includes('monitoring')) {
    return { category: 'Infrastructure', priority: 'Medium' };
  }
  if (lower.includes('app') || lower.includes('application')) {
    return { category: 'Apps', priority: 'Medium' };
  }
  if (lower.includes('malware') || lower.includes('antivirus') || lower.includes('threat') || lower.includes('security')) {
    return { category: 'Device', priority: 'High' };
  }
  if (lower.includes('network') || lower.includes('firewall')) {
    return { category: 'Infrastructure', priority: 'High' };
  }

  return { category: 'General', priority: 'Medium' };
}

// Read files
const nistListContent = fs.readFileSync(nistListPath, 'utf-8');
const currentMappings = JSON.parse(fs.readFileSync(currentJsonPath, 'utf-8'));

// Parse NIST actions
const nistActions = parseMarkdownList(nistListContent);

console.log(`Found ${nistActions.length} NIST 800-171 specific improvement actions\n`);

// Build new mappings structure
const newMappings = {
  "$schema": "NIST 800-171 Rev 2 Improvement Actions",
  "version": "2.0.0",
  "lastUpdated": new Date().toISOString().split('T')[0],
  "description": "Microsoft 365 Secure Score improvement actions specifically mapped to NIST 800-171 Rev 2 controls",
  "source": "Microsoft Purview Compliance Manager - NIST 800-171 Assessment",
  "mappings": {}
};

// Group actions by control
const actionsByControl = {};
let mappedCount = 0;
let unmappedActions = [];

for (const action of nistActions) {
  const existing = findExistingMapping(action, currentMappings);

  if (existing) {
    if (!actionsByControl[existing.controlId]) {
      actionsByControl[existing.controlId] = [];
    }

    const slug = createActionSlug(action);

    actionsByControl[existing.controlId].push({
      title: action,
      category: existing.category,
      priority: existing.priority,
      complianceManagerUrl: `https://compliance.microsoft.com/compliancemanager?filter=${encodeURIComponent(action)}`,
      actionSlug: slug,
      documentationUrl: null // Can be updated with specific Microsoft Learn URLs
    });

    mappedCount++;
  } else {
    // Try to auto-categorize unmapped actions
    const categorization = categorizeAction(action);
    unmappedActions.push({
      action,
      ...categorization
    });
  }
}

// Build the final mappings structure
for (const controlId in actionsByControl) {
  // Find control details from existing mappings
  const existingControl = currentMappings.mappings[controlId];

  newMappings.mappings[controlId] = {
    controlId: controlId,
    controlTitle: existingControl ? existingControl.controlTitle : `Control ${controlId}`,
    improvementActions: actionsByControl[controlId]
  };
}

// Report statistics
console.log('📊 Mapping Statistics:');
console.log(`   ✅ Actions mapped to existing controls: ${mappedCount}`);
console.log(`   ⚠️  Actions needing manual control assignment: ${unmappedActions.length}`);
console.log(`   📦 Total controls with actions: ${Object.keys(actionsByControl).length}`);
console.log();

// Save the new JSON
const outputPath = path.join(__dirname, 'data', 'nist-improvement-actions.json');
fs.writeFileSync(outputPath, JSON.stringify(newMappings, null, 2));
console.log(`✅ New JSON saved to: ${outputPath}\n`);

// Save unmapped actions for manual review
if (unmappedActions.length > 0) {
  const unmappedPath = path.join(__dirname, 'data', 'unmapped-nist-actions.json');
  fs.writeFileSync(unmappedPath, JSON.stringify({
    description: "NIST 800-171 actions that need manual control assignment",
    count: unmappedActions.length,
    actions: unmappedActions
  }, null, 2));

  console.log(`📋 Unmapped actions saved to: ${unmappedPath}`);
  console.log('\nUnmapped Actions (need manual control assignment):');
  unmappedActions.slice(0, 10).forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.action}`);
    console.log(`      Category: ${item.category}, Priority: ${item.priority}`);
  });

  if (unmappedActions.length > 10) {
    console.log(`   ... and ${unmappedActions.length - 10} more\n`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('✅ Generation Complete!');
console.log('='.repeat(80));
console.log('\nNext steps:');
console.log('1. Review unmapped-nist-actions.json and assign them to proper controls');
console.log('2. Update complianceManagerUrl fields with actual Microsoft URLs if available');
console.log('3. Add documentationUrl links to Microsoft Learn articles where applicable');
console.log('4. Update your backend services to use nist-improvement-actions.json');
