const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSearch() {
  console.log('🔍 Testing control search functionality...\n');

  // Test 1: Search by control ID
  console.log('Test 1: Search for "01.01" in controlId');
  const test1 = await prisma.control.findMany({
    where: {
      OR: [
        { controlId: { contains: '01.01' }},
        { title: { contains: '01.01' }},
        { requirementText: { contains: '01.01' }}
      ]
    },
    take: 5
  });
  console.log(`Found ${test1.length} controls`);
  test1.forEach(c => console.log(`  - ${c.controlId}: ${c.title}`));

  // Test 2: Search by title
  console.log('\nTest 2: Search for "Account" in title');
  const test2 = await prisma.control.findMany({
    where: {
      OR: [
        { controlId: { contains: 'Account' }},
        { title: { contains: 'Account' }},
        { requirementText: { contains: 'Account' }}
      ]
    },
    take: 5
  });
  console.log(`Found ${test2.length} controls`);
  test2.forEach(c => console.log(`  - ${c.controlId}: ${c.title}`));

  // Test 3: Search for "encrypt"
  console.log('\nTest 3: Search for "encrypt" in requirement');
  const test3 = await prisma.control.findMany({
    where: {
      OR: [
        { controlId: { contains: 'encrypt' }},
        { title: { contains: 'encrypt' }},
        { requirementText: { contains: 'encrypt' }}
      ]
    },
    take: 5
  });
  console.log(`Found ${test3.length} controls`);
  test3.forEach(c => console.log(`  - ${c.controlId}: ${c.title}`));

  // Test 4: Check if discussionText field exists
  console.log('\nTest 4: Check discussionText field');
  const test4 = await prisma.control.findFirst({
    where: { controlId: '03.01.01' }
  });
  console.log('Fields available:', Object.keys(test4));
  console.log('Has discussionText:', !!test4.discussionText);
  console.log('Has references:', !!test4.references);
  console.log('Has sourceControls:', !!test4.sourceControls);

  await prisma.$disconnect();
}

testSearch().catch(console.error);
