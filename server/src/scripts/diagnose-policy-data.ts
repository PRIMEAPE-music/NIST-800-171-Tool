/**
 * Diagnose Policy Data Script
 *
 * Checks what data is available in each policy to determine
 * the correct odataType and templateFamily
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnosePolicyData() {
  const policies = await prisma.m365Policy.findMany();

  console.log('='.repeat(70));
  console.log('POLICY DATA DIAGNOSIS');
  console.log('='.repeat(70));

  for (const policy of policies) {
    let policyData: any;
    try {
      policyData = typeof policy.policyData === 'string'
        ? JSON.parse(policy.policyData)
        : policy.policyData;
    } catch {
      console.log(`\n${policy.policyName}: INVALID JSON`);
      continue;
    }

    console.log(`\n${policy.policyName}`);
    console.log(`  DB odataType: ${policy.odataType}`);
    console.log(`  DB templateFamily: ${policy.templateFamily}`);
    console.log(`  Data @odata.type: ${policyData['@odata.type'] || 'NOT SET'}`);

    if (policyData.templateReference) {
      console.log(`  templateReference.templateId: ${policyData.templateReference.templateId}`);
      console.log(`  templateReference.templateFamily: ${policyData.templateReference.templateFamily}`);
      console.log(`  templateReference.templateDisplayName: ${policyData.templateReference.templateDisplayName}`);
    }

    // Check for key properties that indicate policy type
    const keys = Object.keys(policyData);
    if (keys.includes('conditions') && keys.includes('grantControls')) {
      console.log(`  Detected: Conditional Access Policy`);
    }
    if (keys.includes('settings') && Array.isArray(policyData.settings)) {
      console.log(`  Detected: Settings Catalog (${policyData.settings.length} settings)`);
    }
    if (keys.includes('minimumPinLength') || keys.includes('appDataEncryptionType')) {
      console.log(`  Detected: App Protection Policy`);
    }
  }

  await prisma.$disconnect();
}

diagnosePolicyData();
