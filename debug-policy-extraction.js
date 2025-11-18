const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:' + path.join(__dirname, 'server', 'database', 'compliance.db')
    }
  }
});

async function debugPolicyExtraction() {
  try {
    console.log('Debugging policy value extraction...\n');

    // Get a policy with few extracted values
    const policy = await prisma.m365Policy.findFirst({
      where: { id: 2 }, // The Windows Update Ring that showed 0 actual values
    });

    if (!policy) {
      console.log('Policy not found');
      return;
    }

    console.log(`Policy: ${policy.policyName}`);
    console.log(`Type: ${policy.policyType}\n`);

    // Parse the policy data to see its structure
    let policyData;
    try {
      policyData = JSON.parse(policy.policyData);
      console.log('Policy data keys:', Object.keys(policyData));
      console.log('\nFirst 50 chars of policy data:', JSON.stringify(policyData).substring(0, 200), '...\n');
    } catch (e) {
      console.log('Failed to parse policy data');
      return;
    }

    // Get some settings that were checked against this policy
    const complianceChecks = await prisma.settingComplianceCheck.findMany({
      where: { policyId: policy.id },
      include: {
        setting: {
          select: {
            id: true,
            displayName: true,
            settingPath: true,
            expectedValue: true,
            dataType: true
          }
        }
      },
      take: 5
    });

    console.log(`\nShowing 5 compliance checks for this policy:\n`);

    for (const check of complianceChecks) {
      console.log(`Setting: ${check.setting.displayName}`);
      console.log(`  Path: ${check.setting.settingPath}`);
      console.log(`  Expected: ${check.setting.expectedValue}`);
      console.log(`  Actual: ${check.actualValue}`);
      console.log(`  Data Type: ${check.setting.dataType}`);
      console.log(`  Compliant: ${check.isCompliant}`);

      // Try to manually extract the value
      const pathParts = check.setting.settingPath.split('.');
      let value = policyData;
      let pathValid = true;

      for (const part of pathParts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          pathValid = false;
          break;
        }
      }

      if (pathValid) {
        console.log(`  Manual extraction: ${JSON.stringify(value)}`);
      } else {
        console.log(`  Manual extraction: Path not found`);
      }
      console.log('');
    }

    // Show the actual structure of a few top-level fields
    console.log('\nSample of policy data structure:');
    const sampleKeys = Object.keys(policyData).slice(0, 10);
    for (const key of sampleKeys) {
      const value = policyData[key];
      const valueType = typeof value;
      const valuePreview = valueType === 'object'
        ? (Array.isArray(value) ? `Array(${value.length})` : `Object with keys: ${Object.keys(value).join(', ')}`)
        : JSON.stringify(value);
      console.log(`  ${key}: ${valueType} = ${valuePreview}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPolicyExtraction();
