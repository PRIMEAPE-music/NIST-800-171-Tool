/**
 * Analyze Policy Structures
 *
 * Examines policies without @odata.type to understand their data structure.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzePolicyStructures() {
  console.log('Analyzing Policy Data Structures\n');
  console.log('='.repeat(60));

  try {
    const policies = await prisma.m365Policy.findMany({
      select: {
        id: true,
        policyName: true,
        policyType: true,
        policyData: true,
        odataType: true
      }
    });

    // Group by whether they have @odata.type
    const withOdata: typeof policies = [];
    const withoutOdata: typeof policies = [];

    for (const policy of policies) {
      try {
        const data = JSON.parse(policy.policyData);
        if (data['@odata.type']) {
          withOdata.push(policy);
        } else {
          withoutOdata.push(policy);
        }
      } catch {
        withoutOdata.push(policy);
      }
    }

    console.log(`\nPolicies WITH @odata.type: ${withOdata.length}`);
    console.log(`Policies WITHOUT @odata.type: ${withoutOdata.length}\n`);

    // Analyze policies without @odata.type
    console.log('Policies WITHOUT @odata.type - Data Structure Analysis:');
    console.log('-'.repeat(60));

    for (const policy of withoutOdata) {
      console.log(`\n[${policy.id}] ${policy.policyName}`);
      console.log(`    Policy Type: ${policy.policyType}`);

      try {
        const data = JSON.parse(policy.policyData);
        const topLevelKeys = Object.keys(data).slice(0, 10);
        console.log(`    Top-level keys: ${topLevelKeys.join(', ')}`);

        // Check for alternative type indicators
        if (data['@odata.context']) {
          console.log(`    @odata.context: ${data['@odata.context']}`);
        }
        if (data.templateReference) {
          console.log(`    templateReference: ${JSON.stringify(data.templateReference)}`);
        }
        if (data.settingsDelta) {
          console.log(`    Has settingsDelta array: ${data.settingsDelta?.length || 0} items`);
        }
        if (data.technologies) {
          console.log(`    technologies: ${data.technologies}`);
        }
        if (data.platforms) {
          console.log(`    platforms: ${data.platforms}`);
        }
      } catch (e) {
        console.log(`    Error parsing: ${e}`);
      }
    }

    // Summary by policy type
    console.log('\n\nSummary by Policy Type:');
    console.log('-'.repeat(60));

    const byType: Record<string, { with: number; without: number }> = {};

    for (const p of withOdata) {
      if (!byType[p.policyType]) byType[p.policyType] = { with: 0, without: 0 };
      byType[p.policyType].with++;
    }

    for (const p of withoutOdata) {
      if (!byType[p.policyType]) byType[p.policyType] = { with: 0, without: 0 };
      byType[p.policyType].without++;
    }

    for (const [type, counts] of Object.entries(byType)) {
      console.log(`${type}: ${counts.with} with @odata.type, ${counts.without} without`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzePolicyStructures();
