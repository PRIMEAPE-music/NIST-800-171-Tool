import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeDuplicates() {
  console.log('🧹 Starting duplicate removal process...\n');

  try {
    // Find all duplicate groups
    const duplicates = await prisma.$queryRaw<Array<{ control_id: number; evidence_type: string; name: string; count: bigint }>>`
      SELECT control_id, evidence_type, name, COUNT(*) as count
      FROM evidence_requirements
      GROUP BY control_id, evidence_type, name
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `;

    if (duplicates.length === 0) {
      console.log('✅ No duplicates found!');
      await prisma.$disconnect();
      return;
    }

    console.log(`Found ${duplicates.length} sets of duplicates\n`);

    let totalDeleted = 0;
    let processedGroups = 0;

    // Process each duplicate group
    for (const dup of duplicates) {
      // Get all records for this duplicate group, ordered by ID (oldest first)
      const records = await prisma.evidenceRequirement.findMany({
        where: {
          controlId: dup.control_id,
          evidenceType: dup.evidence_type,
          name: dup.name,
        },
        orderBy: {
          id: 'asc',
        },
      });

      // Keep the first (oldest) record, delete the rest
      const toDelete = records.slice(1);

      if (toDelete.length > 0) {
        // Delete duplicates
        const deleteResult = await prisma.evidenceRequirement.deleteMany({
          where: {
            id: {
              in: toDelete.map(r => r.id),
            },
          },
        });

        totalDeleted += deleteResult.count;
        processedGroups++;

        if (processedGroups % 100 === 0) {
          console.log(`  Processed ${processedGroups}/${duplicates.length} groups...`);
        }
      }
    }

    console.log('\n✅ Duplicate removal complete!\n');
    console.log(`Groups processed: ${processedGroups}`);
    console.log(`Total duplicate records deleted: ${totalDeleted}\n`);

    // Verify
    const remainingDuplicates = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM evidence_requirements
      GROUP BY control_id, evidence_type, name
      HAVING COUNT(*) > 1
    `;

    if (remainingDuplicates.length === 0) {
      console.log('✅ Verification passed: No duplicates remaining!');
    } else {
      console.log(`⚠️  Warning: ${remainingDuplicates.length} duplicate groups still exist`);
    }

    const totalRemaining = await prisma.evidenceRequirement.count();
    console.log(`\nTotal evidence requirements remaining: ${totalRemaining}`);

  } catch (error) {
    console.error('❌ Error removing duplicates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

removeDuplicates();
