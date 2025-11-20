import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMatching() {
  try {
    // Check policy templates
    const policies = await prisma.m365Policy.findMany({
      select: { id: true, policyName: true, odataType: true, templateFamily: true }
    });

    console.log('='.repeat(60));
    console.log('POLICIES AND THEIR TEMPLATES');
    console.log('='.repeat(60));
    for (const p of policies) {
      console.log(`\n${p.policyName}`);
      console.log(`  odataType: ${p.odataType}`);
      console.log(`  family: ${p.templateFamily}`);
    }

    // Check setting template families distribution
    const settingFamilies = await prisma.m365Setting.groupBy({
      by: ['templateFamily'],
      _count: true
    });

    console.log('\n' + '='.repeat(60));
    console.log('SETTINGS BY TEMPLATE FAMILY');
    console.log('='.repeat(60));
    for (const sf of settingFamilies) {
      console.log(`  ${sf.templateFamily}: ${sf._count}`);
    }

    // Check template distribution
    const settingTemplates = await prisma.m365Setting.groupBy({
      by: ['policyTemplate'],
      _count: true,
      orderBy: { _count: { policyTemplate: 'desc' } }
    });

    console.log('\n' + '='.repeat(60));
    console.log('SETTINGS BY POLICY TEMPLATE (top 10)');
    console.log('='.repeat(60));
    for (const st of settingTemplates.slice(0, 10)) {
      console.log(`  ${st.policyTemplate || 'NULL'}: ${st._count}`);
    }

    // Test matching for each policy
    console.log('\n' + '='.repeat(60));
    console.log('TEMPLATE MATCHING PER POLICY');
    console.log('='.repeat(60));

    for (const policy of policies) {
      // Count settings that match by exact template
      const exactMatch = await prisma.m365Setting.count({
        where: { policyTemplate: policy.odataType }
      });

      // Count settings that match by family
      const familyMatch = await prisma.m365Setting.count({
        where: { templateFamily: policy.templateFamily }
      });

      console.log(`\n${policy.policyName}`);
      console.log(`  Exact template match: ${exactMatch}`);
      console.log(`  Family match: ${familyMatch}`);
    }

    // Check mismatched compliance checks
    console.log('\n' + '='.repeat(60));
    console.log('MISMATCHED COMPLIANCE CHECKS (samples)');
    console.log('='.repeat(60));

    // Get checks where setting family doesn't match policy family
    const checks = await prisma.settingComplianceCheck.findMany({
      take: 100,
      include: {
        setting: { select: { displayName: true, templateFamily: true, policyTemplate: true } },
        policy: { select: { policyName: true, templateFamily: true, odataType: true } }
      }
    });

    let mismatches = 0;
    for (const check of checks) {
      // Check if the setting's policyTemplate matches the policy's odataType
      const exactMatch = check.setting.policyTemplate === check.policy.odataType;
      const familyMatch = check.setting.templateFamily === check.policy.templateFamily;

      if (!exactMatch && check.setting.policyTemplate) {
        mismatches++;
        if (mismatches <= 5) {
          console.log(`\nMISMATCH: ${check.setting.displayName}`);
          console.log(`  Setting expects: ${check.setting.policyTemplate}`);
          console.log(`  Policy is: ${check.policy.odataType}`);
          console.log(`  Setting family: ${check.setting.templateFamily}`);
          console.log(`  Policy family: ${check.policy.templateFamily}`);
        }
      }
    }

    console.log(`\nTotal mismatches in sample: ${mismatches}/100`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMatching();
