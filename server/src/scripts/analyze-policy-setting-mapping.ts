import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Analyze how policy data maps to M365Settings
 * This helps us understand the data structure before rebuilding compliance checks
 */

async function analyzePolicySettingMapping() {
  console.log('\n' + '='.repeat(80));
  console.log('ANALYZING POLICY DATA TO SETTING MAPPING');
  console.log('='.repeat(80) + '\n');

  // Pick a sample policy with settings
  const policy = await prisma.m365Policy.findFirst({
    where: {
      policyType: 'Intune',
      policyName: { contains: 'Windows Device Compliance' }
    }
  });

  if (!policy) {
    console.log('No suitable policy found');
    return;
  }

  console.log(`Policy: ${policy.policyName}`);
  console.log(`Template: ${policy.odataType}\n`);

  // Get settings for this template
  const settings = await prisma.m365Setting.findMany({
    where: {
      policyTemplate: policy.odataType,
      isActive: true,
    },
    include: {
      controlMappings: {
        include: {
          control: {
            select: { controlId: true }
          }
        }
      }
    }
  });

  console.log(`Found ${settings.length} settings for this template\n`);

  // Parse policy data
  let policyData: any = {};
  try {
    policyData = JSON.parse(policy.policyData);
  } catch (error) {
    console.log('Failed to parse policy data');
    return;
  }

  console.log('Policy Data Structure:');
  console.log('='.repeat(40));
  console.log('Top-level keys:', Object.keys(policyData).join(', '));
  console.log('\nSample values:');

  const sampleKeys = Object.keys(policyData).slice(0, 10);
  for (const key of sampleKeys) {
    const value = policyData[key];
    const valueStr = typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : String(value);
    console.log(`  ${key}: ${valueStr}`);
  }

  console.log('\n' + '='.repeat(40));
  console.log('Sample Settings from M365Setting catalog:');
  console.log('='.repeat(40));

  const settingsWithControls = settings.filter(s => s.controlMappings.length > 0).slice(0, 5);

  for (const setting of settingsWithControls) {
    console.log(`\n📝 ${setting.displayName}`);
    console.log(`   Setting Name: ${setting.settingName || 'NULL'}`);
    console.log(`   Setting Path: ${setting.settingPath || 'NULL'}`);
    console.log(`   Expected Value: ${setting.expectedValue}`);
    console.log(`   Validation Operator: ${setting.validationOperator || 'NULL'}`);
    console.log(`   Controls: ${setting.controlMappings.map(m => m.control.controlId).join(', ')}`);

    // Try to find matching value in policy data
    let actualValue = null;

    // Try direct property match
    if (setting.settingName && policyData[setting.settingName] !== undefined) {
      actualValue = policyData[setting.settingName];
      console.log(`   ✅ Found by settingName: ${actualValue}`);
    }
    // Try case-insensitive match
    else if (setting.settingName) {
      const lowerSettingName = setting.settingName.toLowerCase();
      for (const key of Object.keys(policyData)) {
        if (key.toLowerCase() === lowerSettingName) {
          actualValue = policyData[key];
          console.log(`   ✅ Found by case-insensitive match (${key}): ${actualValue}`);
          break;
        }
      }
    }

    if (actualValue === null) {
      console.log(`   ❌ No matching value found in policy data`);
    }
  }

  // Check what the CURRENT SettingComplianceCheck records look like
  console.log('\n' + '='.repeat(80));
  console.log('CURRENT COMPLIANCE CHECKS');
  console.log('='.repeat(80));

  const currentChecks = await prisma.settingComplianceCheck.findMany({
    where: { policyId: policy.id },
    include: {
      setting: {
        select: {
          displayName: true,
          policyTemplate: true,
          settingName: true,
          controlMappings: {
            include: {
              control: { select: { controlId: true } }
            }
          }
        }
      }
    },
    take: 10
  });

  console.log(`\nFound ${currentChecks.length} existing compliance checks for this policy`);
  console.log('Sample checks:');

  for (const check of currentChecks.slice(0, 5)) {
    const controls = check.setting.controlMappings.map(m => m.control.controlId).join(', ') || 'NONE';
    console.log(`\n  ${check.setting.displayName}`);
    console.log(`    Template: ${check.setting.policyTemplate}`);
    console.log(`    Setting Name: ${check.setting.settingName || 'NULL'}`);
    console.log(`    Actual Value: ${check.actualValue}`);
    console.log(`    Controls: ${controls}`);
    console.log(`    Template Match: ${check.setting.policyTemplate === policy.odataType ? '✅' : '❌'}`);
  }

  await prisma.$disconnect();
}

analyzePolicySettingMapping().catch(console.error);
