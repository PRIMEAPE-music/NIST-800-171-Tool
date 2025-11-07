import { controlService } from './services/controlService';
import { prisma } from './config/database';

async function test() {
  console.log('Testing seeded data...\n');

  // Get stats
  const stats = await controlService.getComplianceStats();
  console.log('📊 Compliance Stats:');
  console.log('   Total Controls:', stats.total);
  console.log('   By Status:', stats.byStatus);
  console.log('   Compliance Percentage:', stats.compliancePercentage + '%');
  console.log('   Family Count:', stats.byFamily.length);
  console.log('\n📋 Controls by Family:');
  stats.byFamily.forEach(f => {
    console.log(`   ${f.family}: ${f._count} controls`);
  });

  // Get first control (Rev 3 format)
  const control = await controlService.getControlByControlId('03.01.01');
  console.log('\n📄 Sample Control (03.01.01):');
  console.log('   ID:', control?.controlId);
  console.log('   Title:', control?.title);
  console.log('   Family:', control?.family);
  console.log('   Revision:', control?.revision);
  console.log('   Publication Date:', control?.publicationDate);
  console.log('   Status:', control?.status?.status);

  await prisma.$disconnect();
  console.log('\n✅ Testing complete!');
}

test().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
