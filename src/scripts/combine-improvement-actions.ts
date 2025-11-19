import * as fs from 'fs';
import * as path from 'path';

interface ImprovementAction {
  actionId: string;
  actionTitle: string;
  actionDescription: string;
  category: string;
  implementationType: string;
  isManaged: boolean;
  implementationCost: string;
  userImpact: string;
  implementationUrl: string;
  documentationUrl: string;
}

interface ActionsFile {
  metadata: Record<string, any>;
  actions?: ImprovementAction[];
}

async function combineImprovementActions() {
  const folderPath = path.resolve(__dirname, '../..', 'INSTRUCTIONS/IMPROVEMENT ACTIONS');
  const outputPath = path.join(folderPath, 'NIST_IMPROVEMENT_ACTIONS_ALL.json');

  console.log('Looking for files in:', folderPath);

  // Define files in order
  const files = [
    'NIST_IMPROVEMENT_ACTIONS_1-20.json',
    'NIST_IMPROVEMENT_ACTIONS_21-40.json',
    'NIST_IMPROVEMENT_ACTIONS_41-60.json',
    'NIST_IMPROVEMENT_ACTIONS_61-80.json',
    'NIST_IMPROVEMENT_ACTIONS_81-100.json',
    'NIST_IMPROVEMENT_ACTIONS_101-120.json',
    'NIST_IMPROVEMENT_ACTIONS_121-141.json'
  ];

  const allActions: ImprovementAction[] = [];
  let finalMetadata: Record<string, any> = {};

  console.log('Combining NIST Improvement Actions files...\n');

  for (const file of files) {
    const filePath = path.join(folderPath, file);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data: ActionsFile = JSON.parse(content);

      // Get actions from this file
      if (data.actions && Array.isArray(data.actions)) {
        allActions.push(...data.actions);
        console.log(`  ${file}: ${data.actions.length} actions`);
      } else {
        console.log(`  ${file}: 0 actions (metadata only)`);
      }

      // Keep metadata from the first file that has it
      if (data.metadata && Object.keys(finalMetadata).length === 0) {
        finalMetadata = data.metadata;
      }
    } catch (error) {
      console.error(`Error reading ${file}:`, error);
    }
  }

  // Update metadata with actual count
  finalMetadata.totalActions = allActions.length;
  finalMetadata.lastUpdated = new Date().toISOString().split('T')[0];

  // Create combined output
  const combined = {
    metadata: finalMetadata,
    actions: allActions
  };

  // Write to output file
  fs.writeFileSync(outputPath, JSON.stringify(combined, null, 2));

  console.log('\n----------------------------------------');
  console.log(`Total actions combined: ${allActions.length}`);
  console.log(`Output file: ${outputPath}`);
  console.log('----------------------------------------');

  // Print category breakdown
  const categoryCount: Record<string, number> = {};
  for (const action of allActions) {
    categoryCount[action.category] = (categoryCount[action.category] || 0) + 1;
  }

  console.log('\nCategory breakdown:');
  for (const [category, count] of Object.entries(categoryCount).sort()) {
    console.log(`  ${category}: ${count}`);
  }
}

combineImprovementActions().catch(console.error);
