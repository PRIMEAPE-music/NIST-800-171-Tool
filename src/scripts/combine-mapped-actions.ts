import * as fs from 'fs';
import * as path from 'path';

interface ImprovementAction {
  actionId: string;
  actionTitle: string;
  confidence: string;
  coverageLevel: string;
  isPrimary: boolean;
  mappingRationale: string;
  nistRequirement: string;
}

interface ControlMapping {
  controlId: string;
  controlTitle: string;
  controlFamily: string;
  improvementActions: ImprovementAction[];
}

async function combineMappedActions() {
  const inputDir = path.join(__dirname, '../../INSTRUCTIONS/ACTIONS MAPPED');
  const outputPath = path.join(__dirname, '../../data/nist-improvement-actions-mapped.json');

  const files = ['actions1.json', 'actions2.json', 'actions3.json', 'actions4.json'];
  const allControls: ControlMapping[] = [];

  console.log('Combining mapped improvement action files...\n');

  for (const file of files) {
    const filePath = path.join(inputDir, file);

    try {
      let content = fs.readFileSync(filePath, 'utf-8').trim();

      // Handle malformed JSON - these files have control objects but with stray ]\r\n} at the end
      // Structure is: {obj}, {obj}, ... ]\r\n} where the trailing ]\r\n} is extra after the last control
      // Check if it ends with } and has a stray ] before it
      const hasStrayEnding = content.endsWith('}') && /\]\s*\}\s*$/.test(content);

      if (hasStrayEnding) {
        // Find the last proper closing brace of a control object (before the stray ])
        const lastStrayBracket = content.lastIndexOf(']');
        const lastProperClose = content.lastIndexOf('}', lastStrayBracket - 1);
        if (lastProperClose > 0) {
          content = '[' + content.substring(0, lastProperClose + 1) + ']';
        }
      } else if (!content.startsWith('[')) {
        content = '[' + content + ']';
      }

      const controls: ControlMapping[] = JSON.parse(content);

      console.log(`${file}: ${controls.length} controls`);
      allControls.push(...controls);
    } catch (error) {
      console.error(`Error reading ${file}:`, error);
      process.exit(1);
    }
  }

  // Sort by controlId for consistent ordering
  allControls.sort((a, b) => a.controlId.localeCompare(b.controlId));

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write combined file
  fs.writeFileSync(outputPath, JSON.stringify(allControls, null, 2));

  // Calculate statistics
  const totalActions = allControls.reduce((sum, c) => sum + c.improvementActions.length, 0);
  const controlsWithActions = allControls.filter(c => c.improvementActions.length > 0).length;

  // Get family breakdown
  const familyCount: Record<string, number> = {};
  for (const control of allControls) {
    familyCount[control.controlFamily] = (familyCount[control.controlFamily] || 0) + 1;
  }

  console.log('\n--- Summary ---');
  console.log(`Total controls: ${allControls.length}`);
  console.log(`Controls with actions: ${controlsWithActions}`);
  console.log(`Total improvement actions: ${totalActions}`);

  console.log('\nControls by family:');
  for (const [family, count] of Object.entries(familyCount).sort()) {
    console.log(`  ${family}: ${count}`);
  }

  console.log(`\nOutput written to: ${outputPath}`);
}

combineMappedActions().catch(console.error);
