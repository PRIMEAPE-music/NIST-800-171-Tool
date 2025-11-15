import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Phase 2 Controls: AU (Audit and Accountability) and CM (Configuration Management)
const phase2Controls = [
  // Audit and Accountability Family (8 controls)
  {
    controlId: "03.03.01",
    family: "AU",
    title: "Event Logging",
    requirementText: "a. Identify the types of events that the system is capable of logging in support of the audit logging function: [Assignment: organization-defined event types that the system is capable of logging].\nb. Coordinate the event logging function with other organizational entities requiring audit-related information to guide and inform the selection criteria for events to be logged.\nc. Specify the following event types from which to select for logging as events that require logging to support the audit logging function: [Assignment: organization-defined event types selected for logging].\nd. Provide a rationale for why the event types selected for logging are deemed to be adequate to support after-the-fact investigations of incidents.\ne. Review and update the event types selected for logging [Assignment: organization-defined frequency].",
    priority: "High"
  },
  {
    controlId: "03.03.02",
    family: "AU",
    title: "Audit Record Content",
    requirementText: "Ensure that audit records contain information that establishes the following: a. What type of event occurred; b. When the event occurred; c. Where the event occurred; d. Source of the event; e. Outcome of the event; and f. Identity of individuals, subjects, or objects/entities associated with the event.",
    priority: "High"
  },
  {
    controlId: "03.03.03",
    family: "AU",
    title: "Audit Record Generation",
    requirementText: "The system generates audit records for the event types defined in 03.03.01.c at [Assignment: organization-defined system components].",
    priority: "High"
  },
  {
    controlId: "03.03.04",
    family: "AU",
    title: "Response to Audit Logging Process Failures",
    requirementText: "a. Alert [Assignment: organization-defined personnel or roles] within [Assignment: organization-defined time period] in the event of an audit logging process failure.\nb. Take the following additional actions: [Assignment: organization-defined additional actions].",
    priority: "Medium"
  },
  {
    controlId: "03.03.05",
    family: "AU",
    title: "Audit Record Review, Analysis, and Reporting",
    requirementText: "a. Review and analyze system audit records [Assignment: organization-defined frequency] for indications of inappropriate or unusual activity.\nb. Report findings to [Assignment: organization-defined personnel or roles].\nc. Coordinate audit record review, analysis, and reporting processes with organizational incident response activities.",
    priority: "High"
  },
  {
    controlId: "03.03.06",
    family: "AU",
    title: "Audit Record Reduction and Report Generation",
    requirementText: "Provide and implement an audit record reduction and report generation capability that: a. Supports on-demand audit record review, analysis, and reporting requirements and after-the-fact investigations of incidents; and b. Does not alter the original content or time ordering of audit records.",
    priority: "Medium"
  },
  {
    controlId: "03.03.07",
    family: "AU",
    title: "Time Stamps",
    requirementText: "a. Use internal system clocks to generate time stamps for audit records.\nb. Record time stamps for audit records that meet [Assignment: organization-defined granularity of time measurement] and that use Coordinated Universal Time or Greenwich Mean Time.",
    priority: "Medium"
  },
  {
    controlId: "03.03.08",
    family: "AU",
    title: "Protection of Audit Information",
    requirementText: "Protect audit information and audit logging tools from unauthorized access, modification, and deletion.",
    priority: "High"
  },
  // Configuration Management Family (10 controls)
  {
    controlId: "03.04.01",
    family: "CM",
    title: "Baseline Configuration",
    requirementText: "a. Establish and document configuration baselines for the system.\nb. Review and update configuration baselines [Assignment: organization-defined frequency] or when required due to [Assignment: organization-defined circumstances].",
    priority: "High"
  },
  {
    controlId: "03.04.02",
    family: "CM",
    title: "Configuration Settings",
    requirementText: "a. Establish and document configuration settings for components employed within the system that reflect the most restrictive mode consistent with operational requirements using [Assignment: organization-defined common configuration checklists].\nb. Implement the configuration settings.\nc. Identify, document, and approve any deviations from established configuration settings for individual components based on [Assignment: organization-defined operational requirements].\nd. Monitor and control changes to the configuration settings.",
    priority: "High"
  },
  {
    controlId: "03.04.03",
    family: "CM",
    title: "Configuration Change Control",
    requirementText: "Establish and document changes to the system.",
    priority: "High"
  },
  {
    controlId: "03.04.04",
    family: "CM",
    title: "Impact Analyses",
    requirementText: "Analyze the potential impact of changes to the system.",
    priority: "Medium"
  },
  {
    controlId: "03.04.05",
    family: "CM",
    title: "Access Restrictions for Change",
    requirementText: "Define, document, approve, and enforce physical and logical access restrictions associated with changes to the system.",
    priority: "Medium"
  },
  {
    controlId: "03.04.06",
    family: "CM",
    title: "Least Functionality",
    requirementText: "a. Configure the system to provide only essential capabilities.\nb. Prohibit or restrict the use of the functions, ports, protocols, software, and/or services as defined in [Assignment: organization-defined functions, ports, protocols, software, and/or services].\nc. Review the system [Assignment: organization-defined frequency] to identify unnecessary and/or nonsecure functions, ports, protocols, software, and/or services; and disable or remove those identified.",
    priority: "High"
  },
  {
    controlId: "03.04.08",
    family: "CM",
    title: "Authorized Software – Allow by Exception",
    requirementText: "a. Identify [Assignment: organization-defined software programs] authorized to execute on the system.\nb. Employ a deny-all, permit-by-exception policy to allow the execution of authorized software programs on the system.\nc. Review and update the list of authorized software programs [Assignment: organization-defined frequency].",
    priority: "High"
  },
  {
    controlId: "03.04.10",
    family: "CM",
    title: "System Component Inventory",
    requirementText: "a. Develop and document an inventory of system components that: 1. Accurately reflects the system; 2. Includes all components within the system; 3. Does not include duplicate accounting of components or components assigned to any other system; 4. Is at the level of granularity deemed necessary for tracking and reporting; and 5. Includes the following information to achieve system component accountability: [Assignment: organization-defined information deemed necessary to achieve effective system component accountability].\nb. Review and update the system component inventory [Assignment: organization-defined frequency].",
    priority: "Medium"
  },
  {
    controlId: "03.04.11",
    family: "CM",
    title: "Information Location",
    requirementText: "Identify and document the location of CUI and the system components on which it is processed and stored.",
    priority: "Medium"
  },
  {
    controlId: "03.04.12",
    family: "CM",
    title: "System and Component Configuration for High-Risk Areas",
    requirementText: "Issue [Assignment: organization-defined system configurations] to individuals traveling to high-risk areas with safeguards to ensure that: a. The configurations provide adequate security; and b. The device is handled in accordance with [Assignment: organization-defined security requirements].",
    priority: "Low"
  }
];

async function updatePhase2Controls() {
  console.log('='.repeat(80));
  console.log('NIST 800-171 Rev 3 - Phase 2 Control Update');
  console.log('Phase 2: Audit and Accountability (AU) and Configuration Management (CM)');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Step 1: Get current state
    const existingCount = await prisma.control.count();
    const existingAC = await prisma.control.count({ where: { family: 'AC' } });
    const existingAT = await prisma.control.count({ where: { family: 'AT' } });

    console.log(`📊 Current database state:`);
    console.log(`   Total controls: ${existingCount}`);
    console.log(`   - AC: ${existingAC}`);
    console.log(`   - AT: ${existingAT}`);
    console.log('');

    // Step 2: Insert Phase 2 controls
    console.log('📥 Inserting Phase 2 controls...');
    console.log('');

    let insertedCount = 0;
    let auCount = 0;
    let cmCount = 0;

    for (const control of phase2Controls) {
      await prisma.control.create({
        data: {
          controlId: control.controlId,
          family: control.family,
          title: control.title,
          requirementText: control.requirementText,
          priority: control.priority,
          revision: "3",
          publicationDate: "May 2024"
        }
      });

      insertedCount++;
      if (control.family === 'AU') {
        auCount++;
        console.log(`  ✓ AU-${String(auCount).padStart(2, '0')}: ${control.controlId} - ${control.title}`);
      } else if (control.family === 'CM') {
        cmCount++;
        console.log(`  ✓ CM-${String(cmCount).padStart(2, '0')}: ${control.controlId} - ${control.title}`);
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('📈 Phase 2 Update Summary');
    console.log('='.repeat(80));
    console.log(`✅ Phase 2 controls inserted: ${insertedCount}`);
    console.log(`   - AU (Audit and Accountability): ${auCount} controls`);
    console.log(`   - CM (Configuration Management): ${cmCount} controls`);
    console.log('');

    // Step 3: Verification
    const finalCount = await prisma.control.count();
    const acVerify = await prisma.control.count({ where: { family: 'AC' } });
    const atVerify = await prisma.control.count({ where: { family: 'AT' } });
    const auVerify = await prisma.control.count({ where: { family: 'AU' } });
    const cmVerify = await prisma.control.count({ where: { family: 'CM' } });

    console.log('🔍 Verification:');
    console.log(`   Total controls in database: ${finalCount}`);
    console.log(`   - AC controls: ${acVerify} (Phase 1)`);
    console.log(`   - AT controls: ${atVerify} (Phase 1)`);
    console.log(`   - AU controls: ${auVerify} (Phase 2)`);
    console.log(`   - CM controls: ${cmVerify} (Phase 2)`);
    console.log('');

    const expectedTotal = 36; // 18 from Phase 1 + 18 from Phase 2
    if (finalCount === expectedTotal && insertedCount === 18 && auCount === 8 && cmCount === 10) {
      console.log('✅ SUCCESS: Phase 2 implementation complete!');
      console.log(`   Expected total: ${expectedTotal} controls (Phase 1: 18, Phase 2: 18)`);
      console.log(`   Actual total: ${finalCount} controls`);
      console.log(`   Phase 2 inserted: 18 controls (8 AU + 10 CM)`);
    } else {
      console.log('⚠️  WARNING: Control count mismatch!');
      console.log(`   Expected total: ${expectedTotal} controls`);
      console.log(`   Actual total: ${finalCount} controls`);
      console.log(`   Phase 2 expected: 18 controls (8 AU + 10 CM)`);
      console.log(`   Phase 2 inserted: ${insertedCount} controls (${auCount} AU + ${cmCount} CM)`);
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('📝 Next Steps:');
    console.log('   1. Proceed with Phase 3 (IA, IR families - 13 controls)');
    console.log('   2. Test application functionality with new controls');
    console.log('   3. Verify dashboard and reports display correctly');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error during Phase 2 control update:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the update
updatePhase2Controls()
  .then(() => {
    console.log('\n✅ Phase 2 update script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Phase 2 update script failed:', error);
    process.exit(1);
  });
