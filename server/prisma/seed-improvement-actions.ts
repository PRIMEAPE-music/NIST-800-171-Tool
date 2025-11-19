import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ImprovementActionData {
  actionId: string;
  actionTitle: string;
  confidence: string;
  coverageLevel: string;
  isPrimary: boolean;
  mappingRationale: string;
  nistRequirement: string;
}

interface ControlMappingData {
  controlId: string;
  controlTitle: string;
  controlFamily: string;
  improvementActions: ImprovementActionData[];
}

async function seedMicrosoftActions() {
  console.log('\n🌱 Seeding Microsoft Improvement Actions (standalone)...\n');

  // Read the JSON file
  const filePath = path.join(__dirname, './data/nist-improvement-actions-mapped.json');

  if (!fs.existsSync(filePath)) {
    console.log('❌ Improvement actions file not found!');
    console.log(`   Expected path: ${filePath}`);
    return;
  }

  const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ControlMappingData[];

  // Extract unique actions
  const uniqueActions = new Map<string, string>();
  jsonData.forEach(control => {
    control.improvementActions.forEach(action => {
      uniqueActions.set(action.actionId, action.actionTitle);
    });
  });

  console.log(`📋 Found ${uniqueActions.size} unique improvement actions across ${jsonData.length} controls\n`);

  // Clear only improvement action data (not controls or other mappings!)
  console.log('🗑️  Clearing existing improvement action data...');
  await prisma.improvementActionMapping.deleteMany();
  await prisma.microsoftImprovementAction.deleteMany();
  console.log('✓ Existing improvement action data cleared\n');

  // Create improvement actions
  let actionCount = 0;
  for (const [actionId, actionTitle] of uniqueActions.entries()) {
    await prisma.microsoftImprovementAction.upsert({
      where: { actionId },
      update: { actionTitle },
      create: { actionId, actionTitle }
    });
    actionCount++;
  }
  console.log(`✓ Created/updated ${actionCount} improvement actions`);

  // Create mappings
  let mappingCount = 0;
  let skippedCount = 0;

  for (const controlData of jsonData) {
    // Find control by controlId (e.g., "03.01.01")
    const control = await prisma.control.findFirst({
      where: { controlId: controlData.controlId }
    });

    if (!control) {
      skippedCount++;
      continue;
    }

    for (const actionData of controlData.improvementActions) {
      // Find the action by actionId
      const action = await prisma.microsoftImprovementAction.findUnique({
        where: { actionId: actionData.actionId }
      });

      if (!action) {
        continue;
      }

      await prisma.improvementActionMapping.upsert({
        where: {
          controlId_actionId: {
            controlId: control.id,
            actionId: action.id
          }
        },
        update: {
          confidence: actionData.confidence,
          coverageLevel: actionData.coverageLevel,
          isPrimary: actionData.isPrimary,
          mappingRationale: actionData.mappingRationale,
          nistRequirement: actionData.nistRequirement
        },
        create: {
          controlId: control.id,
          actionId: action.id,
          confidence: actionData.confidence,
          coverageLevel: actionData.coverageLevel,
          isPrimary: actionData.isPrimary,
          mappingRationale: actionData.mappingRationale,
          nistRequirement: actionData.nistRequirement
        }
      });
      mappingCount++;
    }
  }

  console.log(`✓ Created/updated ${mappingCount} action mappings`);
  if (skippedCount > 0) {
    console.log(`⚠️  Skipped ${skippedCount} controls (not found in database)`);
  }
  console.log(`\n✅ Microsoft Improvement Actions seeding completed!\n`);
}

seedMicrosoftActions()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
