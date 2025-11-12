import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function verifyKeywords() {
  console.log('\n🔍 Analyzing Why Auto-Mapping Isn\'t Creating Mappings\n');

  // Load templates
  const mappingsPath = path.join(__dirname, '../../../data/control-m365-mappings.json');
  const mappingsData = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));

  // Get all policies
  const policies = await prisma.m365Policy.findMany();

  console.log('📋 Your Current Policies:\n');
  policies.forEach(p => {
    console.log(`- [${p.policyType}] ${p.policyName}`);
    console.log(`  Description: ${p.policyDescription || 'N/A'}`);
  });

  console.log('\n\n🎯 Testing Each Mapping Template:\n');

  for (const template of mappingsData.mappings.slice(0, 5)) {
    console.log(`\nTemplate: ${template.controlId} - ${template.controlTitle}`);
    console.log(`  Looking for keywords: [${template.searchCriteria.keywords.join(', ')}]`);
    console.log(`  In policy types: [${template.policyTypes.join(', ')}]`);

    // Check which policies might match
    let matchFound = false;
    for (const policy of policies) {
      if (!template.policyTypes.includes(policy.policyType)) continue;

      const searchText = `${policy.policyName} ${policy.policyDescription || ''}`.toLowerCase();
      const matches = template.searchCriteria.keywords.filter((k: string) =>
        searchText.includes(k.toLowerCase())
      );

      if (matches.length > 0) {
        matchFound = true;
        console.log(`  ✓ MATCH: "${policy.policyName}"`);
        console.log(`    Matched keywords: [${matches.join(', ')}]`);
      }
    }

    if (!matchFound) {
      console.log(`  ✗ No policies match these keywords`);
    }
  }

  await prisma.$disconnect();
}

verifyKeywords();
