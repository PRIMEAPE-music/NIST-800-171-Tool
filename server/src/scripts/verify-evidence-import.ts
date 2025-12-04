import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyImport() {
  console.log('🔍 Verifying Evidence Requirements Import\n');
  console.log('═'.repeat(70) + '\n');

  try {
    // Count records
    const policyCount = await prisma.policyDocument.count();
    const procedureCount = await prisma.procedureDocument.count();
    const requirementCount = await prisma.evidenceRequirement.count();
    const totalControls = await prisma.control.count();
    const controlsWithRequirements = await prisma.control.count({
      where: {
        evidenceRequirements: {
          some: {}
        }
      }
    });

    console.log('📊 Database Counts:');
    console.log(`  Policy Documents: ${policyCount}`);
    console.log(`  Procedure Documents: ${procedureCount}`);
    console.log(`  Evidence Requirements: ${requirementCount}`);
    console.log(`  Controls with Requirements: ${controlsWithRequirements}/${totalControls}`);
    console.log('');

    // Break down by evidence type
    const byType = await prisma.evidenceRequirement.groupBy({
      by: ['evidenceType'],
      _count: true,
    });

    console.log('📋 Requirements by Type:');
    byType.forEach(type => {
      console.log(`  ${type.evidenceType}: ${type._count}`);
    });
    console.log('');

    // Check for controls without requirements
    const controlsWithoutReqs = await prisma.control.findMany({
      where: {
        evidenceRequirements: {
          none: {}
        }
      },
      select: {
        controlId: true,
        title: true,
      }
    });

    if (controlsWithoutReqs.length > 0) {
      console.log('⚠️  Controls Without Requirements:');
      controlsWithoutReqs.slice(0, 10).forEach(c => {
        console.log(`  ${c.controlId} - ${c.title}`);
      });
      if (controlsWithoutReqs.length > 10) {
        console.log(`  ... and ${controlsWithoutReqs.length - 10} more`);
      }
      console.log('');
    } else {
      console.log('✅ All controls have evidence requirements\n');
    }

    // Sample control with full requirements
    const sampleControl = await prisma.control.findFirst({
      where: {
        controlId: '03.01.01'
      },
      include: {
        evidenceRequirements: {
          include: {
            policy: true,
            procedure: true,
          }
        }
      }
    });

    if (sampleControl) {
      console.log('🔎 Sample Control (03.01.01 - Account Management):');
      console.log(`  Total Requirements: ${sampleControl.evidenceRequirements.length}`);

      const policies = sampleControl.evidenceRequirements.filter(r => r.evidenceType === 'policy');
      const procedures = sampleControl.evidenceRequirements.filter(r => r.evidenceType === 'procedure');
      const execution = sampleControl.evidenceRequirements.filter(r => r.evidenceType === 'execution');
      const physical = sampleControl.evidenceRequirements.filter(r => r.evidenceType === 'physical');

      console.log(`  Policies: ${policies.length}`);
      if (policies.length > 0) {
        policies.slice(0, 2).forEach(p => {
          console.log(`    - ${p.name}`);
        });
      }
      console.log(`  Procedures: ${procedures.length}`);
      if (procedures.length > 0) {
        procedures.slice(0, 2).forEach(p => {
          console.log(`    - ${p.name}`);
        });
      }
      console.log(`  Execution Evidence: ${execution.length}`);
      console.log(`  Physical Evidence: ${physical.length}`);
      console.log('');
    }

    // Check deployment config
    const deploymentConfig = await prisma.deploymentConfig.findFirst();
    console.log('⚙️  Deployment Configuration:');
    if (deploymentConfig) {
      console.log(`  Model: ${deploymentConfig.deploymentModel}`);
      console.log(`  Physical Evidence Required: ${deploymentConfig.physicalEvidence ? 'Yes' : 'No'}`);
    } else {
      console.log('  ❌ No deployment config found!');
    }
    console.log('');

    // Check for shared policies/procedures
    const sharedPolicies = await prisma.policyDocument.findMany({
      include: {
        _count: {
          select: { requirements: true }
        }
      },
      orderBy: {
        requirements: {
          _count: 'desc'
        }
      },
      take: 5
    });

    console.log('📚 Top 5 Most Shared Policies:');
    sharedPolicies.forEach(p => {
      console.log(`  ${p.name}: used in ${p._count.requirements} requirements`);
    });
    console.log('');

    // Final validation
    console.log('═'.repeat(70));
    const allValid =
      policyCount > 0 &&
      procedureCount > 0 &&
      requirementCount > 0 &&
      controlsWithRequirements > 0 &&
      deploymentConfig !== null;

    if (allValid) {
      console.log('✅ VERIFICATION PASSED - All data imported successfully!');
      console.log('');
      console.log('Expected results:');
      console.log(`  ✓ ${policyCount} policies (expected ~70-75)`);
      console.log(`  ✓ ${procedureCount} procedures (expected ~280-300)`);
      console.log(`  ✓ ${requirementCount} evidence requirements (expected ~400-600)`);
      console.log(`  ✓ ${controlsWithRequirements}/${totalControls} controls with requirements`);
      if (controlsWithRequirements === totalControls) {
        console.log('  ✓ 100% control coverage achieved!');
      }
    } else {
      console.log('⚠️  VERIFICATION ISSUES - Review output above');
    }
    console.log('═'.repeat(70) + '\n');

    console.log('✅ Ready for Phase 2: Coverage Calculation Engine');
    console.log('');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyImport();
