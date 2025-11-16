/**
 * NIST SP 800-171 Rev 3 Control Parser - Version 2
 * Improved parsing logic to capture all control information
 */

const fs = require('fs');
const path = require('path');

// Read the source file
const sourceFile = path.join(__dirname, 'INSTRUCTIONS', 'ALL NIST REV 3 CONTROLS.md');
const content = fs.readFileSync(sourceFile, 'utf-8');

// Control family mapping based on section numbers
const familyMap = {
  '01': 'AC',   // 3.1 - Access Control
  '02': 'AT',   // 3.2 - Awareness and Training
  '03': 'AU',   // 3.3 - Audit and Accountability
  '04': 'CM',   // 3.4 - Configuration Management
  '05': 'IA',   // 3.5 - Identification and Authentication
  '06': 'CP',   // 3.6 - Contingency Planning
  '07': 'MA',   // 3.7 - Maintenance
  '08': 'MP',   // 3.8 - Media Protection
  '09': 'PS',   // 3.9 - Personnel Security
  '10': 'PE',   // 3.10 - Physical Protection
  '11': 'RA',   // 3.11 - Risk Assessment
  '12': 'CA',   // 3.12 - Assessment, Authorization, and Monitoring
  '13': 'SC',   // 3.13 - System and Communications Protection
  '14': 'SI',   // 3.14 - System and Information Integrity
  '15': 'PL',   // 3.15 - Planning
  '16': 'SA',   // 3.16 - System and Services Acquisition
  '17': 'SR',   // 3.17 - Supply Chain Risk Management
  // Note: IR (Incident Response) appears to be combined with CP in Rev 3
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
};

function getFamilyFromControlId(controlId) {
  // Extract middle two digits from format 03.XX.YY
  const match = controlId.match(/^03\.(\d{2})\.\d{2}$/);
  if (match) {
    return familyMap[match[1]];
  }
  return null;
}

// Priority assignment based on control content and type
function assignPriority(control) {
  const criticalKeywords = ['encrypt', 'authentication', 'multi-factor', 'mfa', 'access control'];
  const highKeywords = ['audit', 'log', 'monitor', 'incident', 'backup'];

  const text = (control.title + ' ' + control.requirementText).toLowerCase();

  // Check for critical controls
  if (criticalKeywords.some(keyword => text.includes(keyword)) ||
      ['03.01.01', '03.01.02', '03.05.01', '03.05.02', '03.05.03', '03.13.08', '03.13.11'].includes(control.controlId)) {
    return 'Critical';
  }

  // Check for high priority controls
  if (highKeywords.some(keyword => text.includes(keyword)) ||
      ['03.03.01', '03.03.02', '03.04.01', '03.06.01', '03.06.02', '03.06.03'].includes(control.controlId)) {
    return 'High';
  }

  // Low priority families
  if (control.family === 'AT' || control.family === 'PL') {
    return 'Low';
  }

  return 'Medium';
}

function parseControls(content) {
  const controls = [];
  const lines = content.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    // Match control ID and title: "03.01.01 Account Management"
    const controlMatch = line.match(/^(03\.\d{2}\.\d{2})\s+(.+)$/);

    if (controlMatch) {
      const controlId = controlMatch[1];
      const title = controlMatch[2];

      // Skip if this looks like a false match (lowercase first word = part of sentence, not a title)
      const firstWord = title.split(/\s+/)[0];
      if (firstWord && firstWord[0] === firstWord[0].toLowerCase() && firstWord !== title.toLowerCase()) {
        // This is likely a reference within discussion text, not an actual control
        i++;
        continue;
      }

      // Skip withdrawn controls
      if (title.toLowerCase() === 'withdrawn') {
        console.log(`⏭️  Skipping withdrawn control: ${controlId}`);
        i++;
        continue;
      }

      // Get family code
      const familyCode = getFamilyFromControlId(controlId);
      if (!familyCode) {
        console.warn(`⚠️  Warning: Could not determine family for ${controlId}`);
      }

      // Initialize control object
      const control = {
        controlId,
        family: familyCode,
        familyName: familyNames[familyCode],
        title,
        requirementText: '',
        discussionText: null,
        references: null,
        sourceControls: [],
        supportingPublications: []
      };

      i++; // Move to next line

      // Parse requirement text (everything until DISCUSSION or REFERENCES)
      let requirementLines = [];
      while (i < lines.length) {
        const currentLine = lines[i].trim();

        // Stop at section markers or next control
        if (currentLine === 'DISCUSSION' ||
            currentLine === 'REFERENCES' ||
            currentLine.match(/^03\.\d{2}\.\d{2}\s+/)) {
          break;
        }

        // Skip page markers and headers
        if (currentLine &&
            !currentLine.match(/^NIST SP 800-171/) &&
            !currentLine.match(/^May 2024$/) &&
            !currentLine.match(/^\d+$/) &&
            !currentLine.match(/^-+$/)) {
          requirementLines.push(currentLine);
        }

        i++;
      }

      control.requirementText = requirementLines.join('\n').trim();

      // Parse DISCUSSION section if present
      if (i < lines.length && lines[i].trim() === 'DISCUSSION') {
        i++; // Skip DISCUSSION header
        let discussionLines = [];

        while (i < lines.length) {
          const currentLine = lines[i].trim();

          // Stop at REFERENCES or next control
          if (currentLine === 'REFERENCES' ||
              currentLine.match(/^03\.\d{2}\.\d{2}\s+/)) {
            break;
          }

          // Skip page markers
          if (currentLine &&
              !currentLine.match(/^NIST SP 800-171/) &&
              !currentLine.match(/^May 2024$/) &&
              !currentLine.match(/^\d+$/) &&
              !currentLine.match(/^-+$/)) {
            discussionLines.push(currentLine);
          }

          i++;
        }

        control.discussionText = discussionLines.join('\n').trim() || null;
      }

      // Parse REFERENCES section if present
      if (i < lines.length && lines[i].trim() === 'REFERENCES') {
        i++; // Skip REFERENCES header
        let referencesLines = [];

        while (i < lines.length) {
          const currentLine = lines[i].trim();

          // Stop at next control
          if (currentLine.match(/^03\.\d{2}\.\d{2}\s+/)) {
            break;
          }

          // Capture Source Controls
          if (currentLine.match(/^Source Control/)) {
            const sourceMatch = currentLine.match(/Source Controls?:\s*(.+)/);
            if (sourceMatch) {
              control.sourceControls = sourceMatch[1].split(',').map(s => s.trim());
            }
            i++;
            continue;
          }

          // Capture Supporting Publications
          if (currentLine.match(/^Supporting Publications:/)) {
            const pubMatch = currentLine.match(/Supporting Publications:\s*(.+)/);
            if (pubMatch) {
              const pubs = pubMatch[1];
              if (pubs.toLowerCase() !== 'none') {
                control.supportingPublications = pubs.split(',').map(s => s.trim());
              }
            }
            i++;
            continue;
          }

          // Skip page markers
          if (currentLine &&
              !currentLine.match(/^NIST SP 800-171/) &&
              !currentLine.match(/^May 2024$/) &&
              !currentLine.match(/^\d+$/) &&
              !currentLine.match(/^-+$/)) {
            referencesLines.push(currentLine);
          }

          i++;
        }

        control.references = referencesLines.join('\n').trim() || null;
      }

      // Assign priority
      control.priority = assignPriority(control);

      // Add control to array
      controls.push(control);

      console.log(`✅ Parsed: ${controlId} - ${title}`);

    } else {
      i++;
    }
  }

  return controls;
}

// Parse the controls
console.log('📖 Parsing NIST SP 800-171 Rev 3 controls from markdown...\n');
const controls = parseControls(content);

// Count by family
const familyCounts = {};
controls.forEach(control => {
  if (control.family) {
    familyCounts[control.family] = (familyCounts[control.family] || 0) + 1;
  }
});

// Build the output structure
const output = {
  version: 'NIST SP 800-171 Revision 3',
  publicationDate: 'May 2024',
  totalControls: controls.length,
  description: 'Complete NIST SP 800-171 Revision 3 controls with full requirement text, discussion, and references. Withdrawn controls excluded.',
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
  console.log(`\n✅ Backed up existing file to: ${backupPath}\n`);
}

// Write new file
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log('\n✅ Successfully parsed controls!\n');
console.log('📊 Summary:');
console.log(`   Total Controls: ${controls.length}`);
console.log(`   Expected: ~97 (110 total - 13 withdrawn from parser log)`);
console.log(`\n📁 Control Families:`);
Object.entries(familyCounts).sort().forEach(([family, count]) => {
  console.log(`   ${family}: ${count} controls - ${familyNames[family]}`);
});

console.log(`\n💾 Output saved to: ${outputPath}`);

// Validation checks
const missingFamily = controls.filter(c => !c.family);
const missingDiscussion = controls.filter(c => !c.discussionText || c.discussionText.length < 20);
const missingReferences = controls.filter(c => !c.references);

if (missingFamily.length > 0) {
  console.log(`\n⚠️  Warning: ${missingFamily.length} controls have no family assigned`);
  console.log('   IDs:', missingFamily.map(c => c.controlId).join(', '));
}

if (missingDiscussion.length > 0) {
  console.log(`\n⚠️  Warning: ${missingDiscussion.length} controls have minimal or no discussion text`);
}

if (missingReferences.length > 0) {
  console.log(`\n⚠️  Warning: ${missingReferences.length} controls have no references`);
}

// Show sample of first control
console.log('\n📄 Sample Control (first one):');
console.log(JSON.stringify(controls[0], null, 2));

console.log('\n✨ Done!\n');
