import { prisma } from '../config/database';
import { gapDataParser } from '../utils/gapDataParser';

async function seedGapData() {
  console.log('🌱 Seeding gap data from verification checklist...');

  try {
    // Parse checklist
    const allControlGaps = gapDataParser.parseChecklist();
    console.log(`📋 Parsed ${allControlGaps.length} controls from checklist`);

    let totalGapsCreated = 0;
    let totalCoverageCreated = 0;

    for (const controlGaps of allControlGaps) {
      // Find control in database
      const control = await prisma.control.findUnique({
        where: { controlId: controlGaps.controlId },
      });

      if (!control) {
        console.warn(`⚠️  Control ${controlGaps.controlId} not found in database`);
        continue;
      }

      // Delete existing gaps for this control (clean slate)
      await prisma.controlGap.deleteMany({
        where: { controlId: control.id },
      });

      // Create gaps
      for (const gap of controlGaps.gaps) {
        await prisma.controlGap.create({
          data: {
            controlId: control.id,
            gapType: gap.gapType,
            gapTitle: gap.gapTitle,
            gapDescription: gap.gapDescription,
            nistRequirement: gap.nistRequirement,
            severity: gap.severity,
            status: 'open',
            remediationGuidance: gap.remediationGuidance,
            source: 'checklist',
          },
        });
        totalGapsCreated++;
      }

      // Calculate coverage percentages
      const policyGaps = controlGaps.gaps.filter(g => g.gapType === 'policy');
      const procedureGaps = controlGaps.gaps.filter(g => g.gapType === 'procedure');
      const evidenceGaps = controlGaps.gaps.filter(g => g.gapType === 'evidence');

      // Base technical coverage on Microsoft coverage
      let technicalCoverage = controlGaps.coveragePercentage;

      // Policy/procedure/evidence coverage is 0 if gaps exist, 100 if no gaps
      const policyCoverage = policyGaps.length === 0 ? 100 : 0;
      const proceduralCoverage = procedureGaps.length === 0 ? 100 : 0;
      const evidenceCoverage = evidenceGaps.length === 0 ? 100 : 0;

      // Weighted average (technical 40%, policy 30%, procedure 20%, evidence 10%)
      const overallCoverage = Math.round(
        technicalCoverage * 0.4 +
        policyCoverage * 0.3 +
        proceduralCoverage * 0.2 +
        evidenceCoverage * 0.1
      );

      // Determine compliance status
      let complianceStatus = 'unknown';
      if (overallCoverage >= 95) complianceStatus = 'compliant';
      else if (overallCoverage >= 50) complianceStatus = 'partial';
      else if (overallCoverage > 0) complianceStatus = 'non_compliant';

      // Create or update coverage record
      await prisma.controlCoverage.upsert({
        where: { controlId: control.id },
        create: {
          controlId: control.id,
          technicalCoverage,
          policyCoverage,
          proceduralCoverage,
          evidenceCoverage,
          overallCoverage,
          totalGaps: controlGaps.gaps.length,
          criticalGaps: controlGaps.gaps.filter(g => g.severity === 'critical').length,
          highGaps: controlGaps.gaps.filter(g => g.severity === 'high').length,
          mediumGaps: controlGaps.gaps.filter(g => g.severity === 'medium').length,
          lowGaps: controlGaps.gaps.filter(g => g.severity === 'low').length,
          complianceStatus,
        },
        update: {
          technicalCoverage,
          policyCoverage,
          proceduralCoverage,
          evidenceCoverage,
          overallCoverage,
          totalGaps: controlGaps.gaps.length,
          criticalGaps: controlGaps.gaps.filter(g => g.severity === 'critical').length,
          highGaps: controlGaps.gaps.filter(g => g.severity === 'high').length,
          mediumGaps: controlGaps.gaps.filter(g => g.severity === 'medium').length,
          lowGaps: controlGaps.gaps.filter(g => g.severity === 'low').length,
          complianceStatus,
          lastAssessed: new Date(),
        },
      });
      totalCoverageCreated++;

      console.log(
        `✅ ${controlGaps.controlId}: ` +
        `${controlGaps.gaps.length} gaps, ` +
        `${overallCoverage}% overall coverage`
      );
    }

    console.log(`\n📊 Gap Data Seeding Complete:`);
    console.log(`   ├─ Controls processed: ${allControlGaps.length}`);
    console.log(`   ├─ Gaps created: ${totalGapsCreated}`);
    console.log(`   └─ Coverage records created: ${totalCoverageCreated}`);

  } catch (error) {
    console.error('❌ Error seeding gap data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedGapData();
}

export { seedGapData };
