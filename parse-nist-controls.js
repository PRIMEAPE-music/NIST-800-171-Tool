/**
 * NIST SP 800-171 Rev 3 Control Parser
 * Extracts ALL control information from the markdown file including:
 * - Control ID and title
 * - Full requirement text (including sub-requirements a, b, c, etc.)
 * - Discussion text
 * - References (Source Controls and Supporting Publications)
 */

const fs = require('fs');
const path = require('path');

// Read the source file
const sourceFile = path.join(__dirname, 'INSTRUCTIONS', 'ALL NIST REV 3 CONTROLS.md');
const content = fs.readFileSync(sourceFile, 'utf-8');

// Control family mapping
const familyMap = {
  '3.1': 'AC',   // Access Control
  '3.2': 'AT',   // Awareness and Training
  '3.3': 'AU',   // Audit and Accountability
  '3.4': 'CM',   // Configuration Management
  '3.5': 'IA',   // Identification and Authentication
  '3.6': 'CP',   // Contingency Planning
  '3.7': 'MA',   // Maintenance
  '3.8': 'MP',   // Media Protection
  '3.9': 'PS',   // Personnel Security
  '3.10': 'PE',  // Physical Protection
  '3.11': 'RA',  // Risk Assessment
  '3.12': 'CA',  // Assessment, Authorization, and Monitoring
  '3.13': 'SC',  // System and Communications Protection
  '3.14': 'SI',  // System and Information Integrity
  '3.15': 'PL',  // Planning
  '3.16': 'SA',  // System and Services Acquisition
  '3.17': 'SR',  // Supply Chain Risk Management
};

const familyNames = {
  'AC': 'Access Control',
  'AT': 'Awareness and Training',
  'AU': 'Audit and Accountability',
  'CM': 'Configuration Management',
  'IA': 'Identification and Authentication',
  'CP': 'Contingency Planning',
  'MA': 'Maintenance',
  'MP': 'Media Protection',
  'PS': 'Personnel Security',
  'PE': 'Physical Protection',
  'RA': 'Risk Assessment',
  'CA': 'Assessment, Authorization, and Monitoring',
  'SC': 'System and Communications Protection',
  'SI': 'System and Information Integrity',
  'PL': 'Planning',
  'SA': 'System and Services Acquisition',
  'SR': 'Supply Chain Risk Management',
  'IR': 'Incident Response',
};

function parseControls(content) {
  const controls = [];

  // Split content into lines
  const lines = content.split('\n');

  let currentControl = null;
  let currentSection = null; // 'requirement', 'discussion', 'references'
  let inRequirement = false;
  let inDiscussion = false;
  let inReferences = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match control ID pattern: 03.01.01, 03.02.01, etc.
    const controlIdMatch = line.match(/^(03\.\d{2}\.\d{2})\s+(.+)/);

    if (controlIdMatch) {
      // Check if this is a withdrawn control
      const title = controlIdMatch[2];
      if (title.toLowerCase() === 'withdrawn') {
        console.log(`⏭️  Skipping withdrawn control: ${controlIdMatch[1]}`);
        currentControl = null; // Don't save this control
        inRequirement = false;
        inDiscussion = false;
        inReferences = false;
        continue;
      }

      // Save previous control if exists
      if (currentControl) {
        // Clean up the texts
        currentControl.requirementText = currentControl.requirementText.trim();
        currentControl.discussionText = currentControl.discussionText?.trim() || null;
        currentControl.references = currentControl.references?.trim() || null;
        controls.push(currentControl);
      }

      // Start new control
      const controlId = controlIdMatch[1];

      // Get family code from control ID
      const familyPrefix = controlId.substring(0, 4); // "03.01", "03.02", etc.
      const familyCode = familyMap[familyPrefix.replace('0', '')]; // "3.1" -> "AC"

      currentControl = {
        controlId: controlId,
        family: familyCode,
        familyName: familyNames[familyCode],
        title: title,
        requirementText: '',
        discussionText: '',
        references: '',
        sourceControls: [],
        supportingPublications: []
      };

      inRequirement = true;
      inDiscussion = false;
      inReferences = false;
      currentSection = 'requirement';
      continue;
    }

    // Skip empty lines at the start of sections
    if (!line && !currentControl) continue;

    // Detect section transitions
    if (line === 'DISCUSSION') {
      inRequirement = false;
      inDiscussion = true;
      inReferences = false;
      currentSection = 'discussion';
      continue;
    }

    if (line === 'REFERENCES') {
      inRequirement = false;
      inDiscussion = false;
      inReferences = true;
      currentSection = 'references';
      continue;
    }

    // Check for Source Controls line
    if (line.startsWith('Source Control')) {
      const sourceMatch = line.match(/Source Controls?:\s*(.+)/);
      if (sourceMatch && currentControl) {
        currentControl.sourceControls = sourceMatch[1].split(',').map(s => s.trim());
      }
      continue;
    }

    // Check for Supporting Publications line
    if (line.startsWith('Supporting Publications:')) {
      const pubMatch = line.match(/Supporting Publications:\s*(.+)/);
      if (pubMatch && currentControl) {
        currentControl.supportingPublications = pubMatch[1].split(',').map(s => s.trim());
      }
      continue;
    }

    // Skip horizontal rules and page numbers
    if (line.match(/^-+$/) || line.match(/^\d+$/) || line.match(/^NIST SP 800-171/)) {
      continue;
    }

    // Skip section headers
    if (line.startsWith('3.') && line.includes('.') && line.split(' ').length > 2 && !line.match(/^03\.\d{2}\.\d{2}/)) {
      continue;
    }

    // Add content to appropriate section
    if (currentControl && line) {
      if (inRequirement) {
        currentControl.requirementText += (currentControl.requirementText ? '\n' : '') + line;
      } else if (inDiscussion) {
        currentControl.discussionText += (currentControl.discussionText ? '\n' : '') + line;
      } else if (inReferences) {
        currentControl.references += (currentControl.references ? '\n' : '') + line;
      }
    }
  }

  // Don't forget the last control
  if (currentControl) {
    currentControl.requirementText = currentControl.requirementText.trim();
    currentControl.discussionText = currentControl.discussionText?.trim() || null;
    currentControl.references = currentControl.references?.trim() || null;
    controls.push(currentControl);
  }

  return controls;
}

// Priority assignment based on control families and types
function assignPriority(control) {
  const criticalControls = [
    '03.01.01', '03.01.02', '03.05.01', '03.05.02', '03.05.03', // Access & Auth
    '03.13.08', '03.13.11', '03.13.16', // Encryption
  ];

  const highControls = [
    '03.03.01', '03.03.02', '03.03.03', // Audit
    '03.04.01', '03.04.02', // Configuration
    '03.06.01', '03.06.02', '03.06.03', // Incident Response
  ];

  if (criticalControls.includes(control.controlId)) {
    return 'Critical';
  } else if (highControls.includes(control.controlId)) {
    return 'High';
  } else if (control.family === 'AT' || control.family === 'PL') {
    return 'Low';
  } else {
    return 'Medium';
  }
}

// Parse the controls
console.log('📖 Parsing NIST SP 800-171 Rev 3 controls from markdown...\n');
const controls = parseControls(content);

// Assign priorities
controls.forEach(control => {
  control.priority = assignPriority(control);
});

// Count by family
const familyCounts = {};
controls.forEach(control => {
  familyCounts[control.family] = (familyCounts[control.family] || 0) + 1;
});

// Build the output structure
const output = {
  version: 'NIST SP 800-171 Revision 3',
  publicationDate: 'May 2024',
  totalControls: controls.length,
  description: 'Complete NIST SP 800-171 Revision 3 controls with full requirement text, discussion, and references',
  families: {},
  controls: controls
};

// Add family metadata
Object.keys(familyNames).forEach(code => {
  if (familyCounts[code]) {
    output.families[code] = {
      code: code,
      name: familyNames[code],
      controlCount: familyCounts[code]
    };
  }
});

// Write to output file
const outputPath = path.join(__dirname, 'data', 'nist-800-171-controls.json');

// Backup existing file
if (fs.existsSync(outputPath)) {
  const backupPath = path.join(__dirname, 'data', 'backups', `nist-800-171-controls-backup-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(outputPath, backupPath);
  console.log(`✅ Backed up existing file to: ${backupPath}\n`);
}

// Write new file
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log('✅ Successfully parsed controls!\n');
console.log('📊 Summary:');
console.log(`   Total Controls: ${controls.length}`);
console.log(`\n📁 Control Families:`);
Object.entries(familyCounts).sort().forEach(([family, count]) => {
  console.log(`   ${family}: ${count} controls - ${familyNames[family]}`);
});

console.log(`\n💾 Output saved to: ${outputPath}`);

// Show sample of first control
console.log('\n📄 Sample Control:');
console.log(JSON.stringify(controls[0], null, 2));

// Check for any controls without discussion or references
const missingDiscussion = controls.filter(c => !c.discussionText || c.discussionText.length < 10);
const missingReferences = controls.filter(c => !c.references || c.references.length < 10);

if (missingDiscussion.length > 0) {
  console.log(`\n⚠️  Warning: ${missingDiscussion.length} controls have minimal or no discussion text`);
  console.log('   IDs:', missingDiscussion.map(c => c.controlId).join(', '));
}

if (missingReferences.length > 0) {
  console.log(`\n⚠️  Warning: ${missingReferences.length} controls have minimal or no references`);
  console.log('   IDs:', missingReferences.map(c => c.controlId).join(', '));
}

console.log('\n✨ Done!\n');
