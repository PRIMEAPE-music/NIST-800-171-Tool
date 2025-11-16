/**
 * Verify controls were loaded correctly with all fields
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyControls() {
  console.log('🔍 Verifying control data...\n');

  // Count total controls
  const totalCount = await prisma.control.count();
  console.log(`✅ Total controls in database: ${totalCount}`);
  console.log(`   Expected: 97 controls\n`);

  // Count by family
  const byFamily = await prisma.control.groupBy({
    by: ['family'],
    _count: true,
  });

  console.log('📊 Controls by Family:');
  byFamily.sort((a, b) => a.family.localeCompare(b.family)).forEach(({ family, _count }) => {
    console.log(`   ${family}: ${_count}`);
  });

  // Check for controls with discussion text
  const withDiscussion = await prisma.control.count({
    where: {
      discussionText: {
        not: null
      }
    }
  });
  console.log(`\n📝 Controls with discussion text: ${withDiscussion}/97`);

  // Check for controls with references
  const withReferences = await prisma.control.count({
    where: {
      references: {
        not: null
      }
    }
  });
  console.log(`📚 Controls with references: ${withReferences}/97`);

  // Check for controls with source controls
  const withSourceControls = await prisma.control.count({
    where: {
      sourceControls: {
        not: null
      }
    }
  });
  console.log(`🔗 Controls with source controls: ${withSourceControls}/97`);

  // Sample a few controls to show full data
  console.log('\n📄 Sample Controls:\n');

  const samples = await prisma.control.findMany({
    where: {
      controlId: {
        in: ['03.01.01', '03.05.03', '03.13.11']
      }
    }
  });

  samples.forEach(control => {
    console.log(`Control: ${control.controlId} - ${control.title}`);
    console.log(`Family: ${control.family}`);
    console.log(`Priority: ${control.priority}`);
    console.log(`Has Discussion: ${!!control.discussionText}`);
    console.log(`Has References: ${!!control.references}`);
    if (control.sourceControls) {
      const sources = JSON.parse(control.sourceControls);
      console.log(`Source Controls: ${sources.join(', ')}`);
    }
    if (control.supportingPublications) {
      const pubs = JSON.parse(control.supportingPublications);
      console.log(`Publications: ${pubs.length} references`);
    }
    console.log(`Requirement length: ${control.requirementText.length} chars`);
    if (control.discussionText) {
      console.log(`Discussion length: ${control.discussionText.length} chars`);
    }
    console.log('---\n');
  });

  // Check for any withdrawn controls (should be 0)
  const withdrawnCheck = await prisma.control.findMany({
    where: {
      title: {
        contains: 'withdrawn',
        mode: 'insensitive'
      }
    }
  });

  if (withdrawnCheck.length > 0) {
    console.log(`⚠️  Warning: Found ${withdrawnCheck.length} controls with "withdrawn" in title:`);
    withdrawnCheck.forEach(c => console.log(`   - ${c.controlId}: ${c.title}`));
  } else {
    console.log('✅ No withdrawn controls found (correct!)\n');
  }

  // Verify all expected families are present
  const expectedFamilies = ['AC', 'AT', 'AU', 'CA', 'CM', 'CP', 'IA', 'MA', 'MP', 'PE', 'PL', 'PS', 'RA', 'SA', 'SC', 'SI', 'SR'];
  const presentFamilies = byFamily.map(f => f.family);
  const missingFamilies = expectedFamilies.filter(f => !presentFamilies.includes(f));

  if (missingFamilies.length > 0) {
    console.log(`⚠️  Warning: Missing families: ${missingFamilies.join(', ')}`);
  } else {
    console.log('✅ All 17 control families are present!\n');
  }

  console.log('✨ Verification complete!\n');
}

verifyControls()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
