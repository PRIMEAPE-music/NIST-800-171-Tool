import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate evidence requirements...\n');

  try {
    const duplicates = await prisma.$queryRaw<Array<{ control_id: number; evidence_type: string; name: string; count: bigint }>>`
      SELECT control_id, evidence_type, name, COUNT(*) as count
      FROM evidence_requirements
      GROUP BY control_id, evidence_type, name
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `;

    if (duplicates.length === 0) {
      console.log('✅ No duplicates found!');
    } else {
      console.log(`❌ Found ${duplicates.length} sets of duplicates:\n`);

      let totalDuplicates = 0;
      for (const dup of duplicates) {
        const count = Number(dup.count);
        console.log(`  Control ID: ${dup.control_id}`);
        console.log(`  Type: ${dup.evidence_type}`);
        console.log(`  Name: ${dup.name}`);
        console.log(`  Occurrences: ${count}`);
        console.log('');
        totalDuplicates += (count - 1); // Subtract 1 because one is the original
      }

      console.log(`Total duplicate records to remove: ${totalDuplicates}\n`);
    }

    // Get total count
    const total = await prisma.evidenceRequirement.count();
    console.log(`Total evidence requirements in database: ${total}`);

  } catch (error) {
    console.error('Error checking duplicates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicates();
