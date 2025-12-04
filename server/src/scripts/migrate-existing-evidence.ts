import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateExistingEvidence() {
  console.log('🔄 Starting evidence migration...\n');

  try {
    // Get all existing evidence with controlId
    const existingEvidence = await prisma.evidence.findMany({
      where: {
        controlId: { not: null },
      },
      include: {
        control: true,
      },
    });

    console.log(`📊 Found ${existingEvidence.length} evidence records to migrate\n`);

    let successCount = 0;
    let skipCount = 0;

    for (const evidence of existingEvidence) {
      if (!evidence.controlId) {
        skipCount++;
        continue;
      }

      // Check if mapping already exists
      const existingMapping = await prisma.evidenceControlMapping.findUnique({
        where: {
          evidenceId_controlId: {
            evidenceId: evidence.id,
            controlId: evidence.controlId,
          },
        },
      });

      if (existingMapping) {
        console.log(`  ⏭️  Skipping ${evidence.originalName} - mapping already exists`);
        skipCount++;
        continue;
      }

      // Create new mapping
      await prisma.evidenceControlMapping.create({
        data: {
          evidenceId: evidence.id,
          controlId: evidence.controlId,
          relationship: 'primary',
          notes: 'Migrated from legacy evidence structure',
          mappedBy: evidence.uploadedBy || 'system',
          mappedAt: evidence.uploadedDate,
          isVerified: true,
          verifiedBy: 'system',
          verifiedAt: evidence.uploadedDate,
        },
      });

      console.log(`  ✅ Migrated: ${evidence.originalName} → ${evidence.control?.controlId}`);
      successCount++;
    }

    console.log('\n📈 Migration Summary:');
    console.log(`  ✅ Successfully migrated: ${successCount}`);
    console.log(`  ⏭️  Skipped (already exists): ${skipCount}`);
    console.log(`  📊 Total processed: ${existingEvidence.length}\n`);

    console.log('✅ Evidence migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateExistingEvidence()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
