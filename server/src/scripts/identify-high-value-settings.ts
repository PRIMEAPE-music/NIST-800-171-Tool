/**
 * Identify High-Value Settings Script
 *
 * Scores settings by:
 * - Number of NIST controls mapped
 * - Priority of controls (Critical/High weighted higher)
 * - Number of policy occurrences
 * - Extraction failure rate
 *
 * Run with: npx tsx server/src/scripts/identify-high-value-settings.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ScoredSetting {
  id: number;
  displayName: string;
  settingName: string | null;
  settingPath: string;
  policyTemplate: string | null;
  templateFamily: string | null;

  // Scoring factors
  controlCount: number;
  criticalControlCount: number;
  highControlCount: number;
  mediumControlCount: number;
  policyOccurrences: number;
  currentExtractionRate: number;

  // Derived
  score: number;
  priority: 'Critical' | 'High' | 'Medium';

  // Reference data
  controlIds: string[];
  samplePolicyId?: number;
  samplePolicyName?: string;
}

async function identifyHighValueSettings() {
  console.log('\n' + '='.repeat(80));
  console.log('HIGH-VALUE SETTINGS IDENTIFICATION');
  console.log('='.repeat(80) + '\n');

  // Get all settings with their control mappings
  const settings = await prisma.m365Setting.findMany({
    where: {
      isActive: true
    },
    include: {
      controlMappings: {
        include: {
          control: {
            select: {
              controlId: true,
              title: true,
              priority: true,
              family: true
            }
          }
        }
      },
      complianceChecks: {
        select: {
          id: true,
          actualValue: true,
          policyId: true,
          policy: {
            select: {
              id: true,
              policyName: true
            }
          }
        }
      }
    }
  });

  console.log(`Analyzing ${settings.length} settings...\n`);

  const scoredSettings: ScoredSetting[] = [];

  for (const setting of settings) {
    // Count controls by priority
    const controlCount = setting.controlMappings.length;
    const criticalControlCount = setting.controlMappings.filter(
      m => m.control.priority === 'Critical'
    ).length;
    const highControlCount = setting.controlMappings.filter(
      m => m.control.priority === 'High'
    ).length;
    const mediumControlCount = setting.controlMappings.filter(
      m => m.control.priority === 'Medium'
    ).length;

    // Skip settings with no control mappings
    if (controlCount === 0) continue;

    // Count policy occurrences
    const policyOccurrences = setting.complianceChecks.length;

    // Calculate current extraction rate
    const successfulExtractions = setting.complianceChecks.filter(
      c => c.actualValue !== null && c.actualValue !== 'null'
    ).length;
    const currentExtractionRate = policyOccurrences > 0
      ? successfulExtractions / policyOccurrences
      : 0;

    // Calculate score
    // Formula: (controls * 10) + (critical * 20) + (high * 10) + (medium * 5) + (occurrences * 3)
    // Penalty for already working: -50% if extraction rate > 80%
    let score =
      (controlCount * 10) +
      (criticalControlCount * 20) +
      (highControlCount * 10) +
      (mediumControlCount * 5) +
      (policyOccurrences * 3);

    // Apply penalty for settings that are already working well
    if (currentExtractionRate > 0.8) {
      score = score * 0.5;
    }

    // Boost for settings that fail completely (high potential)
    if (currentExtractionRate === 0 && policyOccurrences > 0) {
      score = score * 1.5;
    }

    // Determine priority
    let priority: 'Critical' | 'High' | 'Medium';
    if (criticalControlCount > 0 || score >= 150) {
      priority = 'Critical';
    } else if (highControlCount > 0 || score >= 80) {
      priority = 'High';
    } else {
      priority = 'Medium';
    }

    // Get sample policy for research
    const sampleCheck = setting.complianceChecks[0];

    scoredSettings.push({
      id: setting.id,
      displayName: setting.displayName,
      settingName: setting.settingName,
      settingPath: setting.settingPath,
      policyTemplate: setting.policyTemplate,
      templateFamily: setting.templateFamily,
      controlCount,
      criticalControlCount,
      highControlCount,
      mediumControlCount,
      policyOccurrences,
      currentExtractionRate,
      score,
      priority,
      controlIds: setting.controlMappings.map(m => m.control.controlId),
      samplePolicyId: sampleCheck?.policy.id,
      samplePolicyName: sampleCheck?.policy.policyName
    });
  }

  // Sort by score descending
  scoredSettings.sort((a, b) => b.score - a.score);

  // Output results
  console.log('='.repeat(80));
  console.log('TOP 50 HIGH-VALUE SETTINGS');
  console.log('='.repeat(80) + '\n');

  const top50 = scoredSettings.slice(0, 50);

  for (const [idx, setting] of top50.entries()) {
    console.log(`\n${idx + 1}. ${setting.displayName}`);
    console.log(`   Priority: ${setting.priority} | Score: ${setting.score.toFixed(0)}`);
    console.log(`   Template: ${setting.policyTemplate || 'NULL'}`);
    console.log(`   Family: ${setting.templateFamily || 'NULL'}`);
    console.log(`   Current settingName: ${setting.settingName || 'NULL'}`);
    console.log(`   Current settingPath: ${setting.settingPath}`);
    console.log(`   Controls: ${setting.controlCount} total (${setting.criticalControlCount} critical, ${setting.highControlCount} high)`);
    console.log(`   Control IDs: ${setting.controlIds.slice(0, 5).join(', ')}${setting.controlIds.length > 5 ? '...' : ''}`);
    console.log(`   Policy occurrences: ${setting.policyOccurrences}`);
    console.log(`   Current extraction rate: ${(setting.currentExtractionRate * 100).toFixed(0)}%`);

    if (setting.samplePolicyId) {
      console.log(`   Sample policy: ${setting.samplePolicyName} (ID: ${setting.samplePolicyId})`);
    }
  }

  // Generate research tracking CSV
  console.log('\n' + '='.repeat(80));
  console.log('RESEARCH TRACKING TEMPLATE');
  console.log('='.repeat(80) + '\n');

  console.log('Copy this to a spreadsheet for tracking your research:\n');
  console.log('ID,Display Name,Template,Current Path,Research Status,Actual Property,Verified,Notes');

  for (const setting of top50) {
    const template = setting.policyTemplate?.replace('#microsoft.graph.', '') || 'NULL';
    console.log(
      `${setting.id},"${setting.displayName}","${template}","${setting.settingPath}",TODO,,,`
    );
  }

  // Generate research guide
  console.log('\n' + '='.repeat(80));
  console.log('RESEARCH METHODOLOGY');
  console.log('='.repeat(80) + '\n');

  console.log('For each setting above:');
  console.log('');
  console.log('1. IDENTIFY THE POLICY TYPE');
  console.log('   - Check the Template field');
  console.log('   - Map to M365 admin portal location');
  console.log('');
  console.log('2. FIND A SAMPLE POLICY');
  console.log('   - Use the Sample Policy ID from output');
  console.log('   - Or create a test policy with this setting configured');
  console.log('');
  console.log('3. GET THE ACTUAL PROPERTY NAME');
  console.log('   Method A: Graph Explorer');
  console.log('     - Query: GET /deviceManagement/deviceConfigurations/{id}');
  console.log('     - Or: GET /deviceManagement/deviceCompliancePolicies/{id}');
  console.log('     - Look for property names in JSON response');
  console.log('');
  console.log('   Method B: Admin Portal + Browser DevTools');
  console.log('     - Open policy in Intune portal');
  console.log('     - Open browser DevTools (F12) > Network tab');
  console.log('     - Edit the policy and save');
  console.log('     - Find the PATCH request and inspect JSON payload');
  console.log('');
  console.log('4. VERIFY THE PROPERTY');
  console.log('   - Ensure property exists in policyData');
  console.log('   - Check value type matches expected');
  console.log('   - Test with multiple policies if possible');
  console.log('');
  console.log('5. UPDATE THE SPREADSHEET');
  console.log('   - Mark status as "Researched"');
  console.log('   - Record actual property name');
  console.log('   - Add verification notes');
  console.log('');

  // Statistics
  console.log('\n' + '='.repeat(80));
  console.log('STATISTICS');
  console.log('='.repeat(80) + '\n');

  const criticalCount = top50.filter(s => s.priority === 'Critical').length;
  const highCount = top50.filter(s => s.priority === 'High').length;
  const mediumCount = top50.filter(s => s.priority === 'Medium').length;

  const totalControls = top50.reduce((sum, s) => sum + s.controlCount, 0);
  const uniqueControls = new Set(top50.flatMap(s => s.controlIds)).size;

  const templateDistribution = new Map<string, number>();
  for (const setting of top50) {
    const template = setting.policyTemplate || 'NULL';
    templateDistribution.set(template, (templateDistribution.get(template) || 0) + 1);
  }

  console.log(`Priority distribution:`);
  console.log(`  Critical: ${criticalCount}`);
  console.log(`  High: ${highCount}`);
  console.log(`  Medium: ${mediumCount}`);
  console.log(``);
  console.log(`Control coverage:`);
  console.log(`  Total control mappings: ${totalControls}`);
  console.log(`  Unique controls: ${uniqueControls}`);
  console.log(``);
  console.log(`Template distribution:`);
  const sortedTemplates = Array.from(templateDistribution.entries())
    .sort((a, b) => b[1] - a[1]);
  for (const [template, count] of sortedTemplates.slice(0, 10)) {
    const shortName = template.replace('#microsoft.graph.', '');
    console.log(`  ${shortName.padEnd(40)} ${count}`);
  }

  // Expected impact
  console.log('\n' + '='.repeat(80));
  console.log('EXPECTED IMPACT');
  console.log('='.repeat(80) + '\n');

  const currentFailures = top50.filter(s => s.currentExtractionRate < 0.5).length;
  const potentialPolicyMatches = top50.reduce((sum, s) => sum + s.policyOccurrences, 0);

  console.log(`Settings with poor extraction (<50%): ${currentFailures}`);
  console.log(`Total policy-setting combinations: ${potentialPolicyMatches}`);
  console.log(`Estimated new successful extractions: ${(potentialPolicyMatches * 0.7).toFixed(0)}`);
  console.log(``);
  console.log(`If you successfully map these 50 settings:`);
  console.log(`  - Expected match rate improvement: +15-20%`);
  console.log(`  - Additional controls covered: ${uniqueControls}`);
  console.log(`  - Better compliance accuracy for high-priority controls`);

  await prisma.$disconnect();
}

identifyHighValueSettings().catch(console.error);
