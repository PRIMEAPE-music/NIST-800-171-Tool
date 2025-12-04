import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface DoDControl {
  controlId: string;
  title: string;
  family: string;
  dodPoints: number;
  requirementType: string;
  rev2Mapping: string | string[] | null;
  mappingType: string;
  rationale: string;
  specialScoring?: boolean;
  naAllowed?: boolean;
  notApplicableAllowed?: boolean;
}

interface DoDScoringData {
  metadata: {
    rev3MaxScore: number;
    rev3TotalWeightedPoints: number;
    rev3MinimumPossibleScore: number;
  };
  controls: DoDControl[];
}

async function seedDodScoring(): Promise<void> {
  console.log('🎯 Starting DoD Assessment Scoring seed...');

  // Load the DoD scoring data
  const dataPath = path.join(__dirname, 'data', 'dod-assessment-scoring-rev3.json');

  if (!fs.existsSync(dataPath)) {
    console.error('❌ DoD scoring data file not found at:', dataPath);
    console.log('📁 Please copy dod-assessment-scoring-rev3.json to server/prisma/data/');
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const scoringData: DoDScoringData = JSON.parse(rawData);

  console.log(`📊 Loaded ${scoringData.controls.length} controls from DoD scoring data`);
  console.log(`   Max Score: ${scoringData.metadata.rev3MaxScore}`);
  console.log(`   Total Weighted Points: ${scoringData.metadata.rev3TotalWeightedPoints}`);

  let updated = 0;
  let notFound = 0;
  const notFoundControls: string[] = [];

  for (const control of scoringData.controls) {
    // Format rev2Mapping as string
    let rev2MappingStr: string | null = null;
    if (control.rev2Mapping) {
      if (Array.isArray(control.rev2Mapping)) {
        rev2MappingStr = control.rev2Mapping.join(', ');
      } else {
        rev2MappingStr = control.rev2Mapping;
      }
    }

    // Determine if N/A is allowed (check both fields)
    const naAllowed = control.naAllowed || control.notApplicableAllowed || false;

    try {
      await prisma.control.update({
        where: { controlId: control.controlId },
        data: {
          dodPoints: control.dodPoints,
          dodSpecialScoring: control.specialScoring || false,
          dodNaAllowed: naAllowed,
          dodRev2Mapping: rev2MappingStr,
          dodMappingType: control.mappingType,
        },
      });
      updated++;
      console.log(`   ✓ ${control.controlId}: ${control.dodPoints} pts (${control.mappingType})`);
    } catch (error) {
      notFound++;
      notFoundControls.push(control.controlId);
      console.log(`   ✗ ${control.controlId}: Not found in database`);
    }
  }

  console.log('\n📈 DoD Scoring Seed Summary:');
  console.log(`   Updated: ${updated} controls`);
  console.log(`   Not Found: ${notFound} controls`);

  if (notFoundControls.length > 0) {
    console.log(`   Missing Controls: ${notFoundControls.join(', ')}`);
  }

  // Verify point distribution
  const pointCounts = await prisma.control.groupBy({
    by: ['dodPoints'],
    _count: { dodPoints: true },
    orderBy: { dodPoints: 'desc' },
  });

  console.log('\n📊 Point Distribution Verification:');
  let totalPoints = 0;
  for (const pc of pointCounts) {
    const count = pc._count.dodPoints;
    const points = pc.dodPoints * count;
    totalPoints += points;
    console.log(`   ${pc.dodPoints} pts: ${count} controls (${points} total points)`);
  }
  console.log(`   Total Weighted Points: ${totalPoints}`);

  if (totalPoints === 292) {
    console.log('   ✅ Point distribution verified correctly!');
  } else {
    console.log(`   ⚠️  Expected 292 total points, got ${totalPoints}`);
  }
}

seedDodScoring()
  .then(() => {
    console.log('\n✅ DoD scoring seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ DoD scoring seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
