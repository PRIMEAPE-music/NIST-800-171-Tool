const { PrismaClient } = require('@prisma/client');

const path = require('path');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:' + path.join(__dirname, 'server', 'database', 'compliance.db')
    }
  }
});

async function checkMappings() {
  try {
    console.log('Checking database...\n');

    // Check M365 settings
    const settingsCount = await prisma.m365Setting.count();
    console.log('M365 Settings:', settingsCount);

    // Check control-setting mappings
    const mappingsCount = await prisma.controlSettingMapping.count();
    console.log('Control Setting Mappings:', mappingsCount);

    // Check M365 policies
    const policiesCount = await prisma.m365Policy.count();
    console.log('M365 Policies:', policiesCount);

    // Sample mapping with details
    if (mappingsCount > 0) {
      console.log('\nSample mappings (first 5):');
      const sampleMappings = await prisma.controlSettingMapping.findMany({
        take: 5,
        include: {
          control: {
            select: {
              controlId: true,
              title: true
            }
          },
          setting: {
            select: {
              displayName: true,
              policyType: true,
              platform: true
            }
          }
        }
      });

      sampleMappings.forEach((mapping, index) => {
        console.log(`\n${index + 1}. Control: ${mapping.control.controlId}`);
        console.log(`   Setting: ${mapping.setting.displayName}`);
        console.log(`   Type: ${mapping.setting.policyType} | Platform: ${mapping.setting.platform}`);
        console.log(`   Confidence: ${mapping.confidence}`);
      });
    } else {
      console.log('\n** NO MAPPINGS FOUND IN DATABASE! **');
      console.log('This is the issue - you have settings but no mappings to controls.');
    }

    // Check controls
    const controlsCount = await prisma.control.count();
    console.log(`\nTotal Controls: ${controlsCount}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMappings();
