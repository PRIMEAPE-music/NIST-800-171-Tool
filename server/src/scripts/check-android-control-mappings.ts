/**
 * Check Android Control Mappings
 * Verify if Android settings have control mappings
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMappings() {
  console.log('\n' + '='.repeat(80));
  console.log('ANDROID SETTINGS CONTROL MAPPINGS CHECK');
  console.log('='.repeat(80) + '\n');

  const androidSettings = await prisma.m365Setting.findMany({
    where: {
      policyTemplate: '#microsoft.graph.androidManagedAppProtection',
      isActive: true
    },
    include: {
      controlMappings: {
        include: {
          control: {
            select: {
              controlId: true
            }
          }
        }
      }
    },
    orderBy: {
      id: 'asc'
    }
  });

  console.log(`Found ${androidSettings.length} Android settings:\n`);

  let withMappings = 0;
  let withoutMappings = 0;

  for (const setting of androidSettings.slice(0, 20)) {
    const mappingCount = setting.controlMappings.length;
    const icon = mappingCount > 0 ? '✓' : '✗';

    console.log(`${icon} ${setting.displayName}`);
    console.log(`   ID: ${setting.id}, Mappings: ${mappingCount}`);

    if (mappingCount > 0) {
      const controlIds = setting.controlMappings.map(m => m.control.controlId).join(', ');
      console.log(`   Controls: ${controlIds}`);
      withMappings++;
    } else {
      withoutMappings++;
    }
    console.log('');
  }

  if (androidSettings.length > 20) {
    console.log(`... and ${androidSettings.length - 20} more\n`);
  }

  const totalWithMappings = androidSettings.filter(s => s.controlMappings.length > 0).length;
  const totalWithoutMappings = androidSettings.filter(s => s.controlMappings.length === 0).length;

  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Android settings: ${androidSettings.length}`);
  console.log(`With control mappings: ${totalWithMappings}`);
  console.log(`Without mappings: ${totalWithoutMappings}`);
  console.log('');

  if (totalWithoutMappings > 0) {
    console.log('⚠️  ISSUE: Many Android settings are missing control mappings!');
    console.log('');
    console.log('This explains why they\'re not appearing in the UI.');
    console.log('The control mappings duplication failed during the initial run.');
    console.log('');
    console.log('Solution: Re-run the duplication script or manually copy mappings from iOS.');
  } else {
    console.log('✅ All Android settings have control mappings!');
  }

  await prisma.$disconnect();
}

checkMappings().catch(console.error);
