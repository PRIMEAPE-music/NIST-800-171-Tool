import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Phase 4 Controls: MA (Maintenance) and MP (Media Protection)
const phase4Controls = [
  // Maintenance Family (3 controls)
  {
    controlId: "03.07.04",
    family: "MA",
    title: "Maintenance Tools",
    requirementText: "a. Approve, control, and monitor the use of system maintenance tools.\nb. Review previously approved system maintenance tools to ensure they are appropriate for the system.",
    priority: "Medium"
  },
  {
    controlId: "03.07.05",
    family: "MA",
    title: "Nonlocal Maintenance",
    requirementText: "a. Approve and monitor nonlocal maintenance and diagnostic activities.\nb. Allow the use of nonlocal maintenance and diagnostic tools only as consistent with organizational policy and documented in the security plan for the system.\nc. Employ strong authentication in the establishment of nonlocal maintenance and diagnostic sessions.\nd. Maintain records for nonlocal maintenance and diagnostic activities.\ne. Terminate session and network connections when nonlocal maintenance is completed.",
    priority: "Medium"
  },
  {
    controlId: "03.07.06",
    family: "MA",
    title: "Maintenance Personnel",
    requirementText: "a. Establish a process for maintenance personnel authorization and maintain a list of authorized maintenance organizations or personnel.\nb. Verify that non-escorted personnel performing maintenance on the system possess the required access authorizations.\nc. Designate organizational personnel with required access authorizations and technical competence to supervise the maintenance activities of personnel who do not possess the required access authorizations.",
    priority: "Medium"
  },
  // Media Protection Family (7 controls)
  {
    controlId: "03.08.01",
    family: "MP",
    title: "Media Storage",
    requirementText: "a. Physically control and securely store system media within [Assignment: organization-defined controlled areas].\nb. Protect system media types defined in 03.08.07 until the media are destroyed or sanitized using approved equipment, techniques, and procedures.",
    priority: "Medium"
  },
  {
    controlId: "03.08.02",
    family: "MP",
    title: "Media Access",
    requirementText: "Restrict access to system media types defined in 03.08.07 to [Assignment: organization-defined personnel or roles].",
    priority: "Medium"
  },
  {
    controlId: "03.08.03",
    family: "MP",
    title: "Media Sanitization",
    requirementText: "a. Sanitize system media types defined in 03.08.07 prior to disposal, release out of organizational control, or release for reuse using [Assignment: organization-defined sanitization techniques and procedures].\nb. Employ sanitization mechanisms with the strength and integrity commensurate with the security category of the information.",
    priority: "High"
  },
  {
    controlId: "03.08.04",
    family: "MP",
    title: "Media Marking",
    requirementText: "a. Mark system media indicating the distribution limitations, handling caveats, and applicable security markings (if any) of the information.\nb. Exempt [Assignment: organization-defined types of system media] from marking as long as the exempted items remain within [Assignment: organization-defined controlled areas].",
    priority: "Low"
  },
  {
    controlId: "03.08.05",
    family: "MP",
    title: "Media Transport",
    requirementText: "a. Protect and control system media types defined in 03.08.07 during transport outside of controlled areas using [Assignment: organization-defined controls].\nb. Maintain accountability for system media during transport outside of controlled areas.\nc. Document activities associated with the transport of system media.\nd. Restrict the activities associated with the transport of system media to authorized personnel.",
    priority: "Medium"
  },
  {
    controlId: "03.08.07",
    family: "MP",
    title: "Media Use",
    requirementText: "a. [Selection: restrict; prohibit] the use of [Assignment: organization-defined types of system media] on [Assignment: organization-defined systems or system components] using [Assignment: organization-defined controls].\nb. Prohibit the use of portable storage devices when such devices have no identifiable owner.",
    priority: "Medium"
  },
  {
    controlId: "03.08.09",
    family: "MP",
    title: "System Backup – Cryptographic Protection",
    requirementText: "Implement cryptographic mechanisms to protect the confidentiality of backup information.",
    priority: "High"
  }
];

async function updatePhase4Controls() {
  console.log('='.repeat(80));
  console.log('NIST 800-171 Rev 3 - Phase 4 Control Update');
  console.log('Phase 4: Maintenance (MA) and Media Protection (MP)');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Step 1: Get current state
    const existingCount = await prisma.control.count();
    const existingFamilies = await prisma.control.groupBy({
      by: ['family'],
      _count: { id: true }
    });

    console.log(`📊 Current database state:`);
    console.log(`   Total controls: ${existingCount}`);
    existingFamilies.forEach(f => {
      console.log(`   - ${f.family}: ${f._count.id}`);
    });
    console.log('');

    // Step 2: Insert Phase 4 controls
    console.log('📥 Inserting Phase 4 controls...');
    console.log('');

    let insertedCount = 0;
    let maCount = 0;
    let mpCount = 0;

    for (const control of phase4Controls) {
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
      if (control.family === 'MA') {
        maCount++;
        console.log(`  ✓ MA-${String(maCount).padStart(2, '0')}: ${control.controlId} - ${control.title}`);
      } else if (control.family === 'MP') {
        mpCount++;
        console.log(`  ✓ MP-${String(mpCount).padStart(2, '0')}: ${control.controlId} - ${control.title}`);
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('📈 Phase 4 Update Summary');
    console.log('='.repeat(80));
    console.log(`✅ Phase 4 controls inserted: ${insertedCount}`);
    console.log(`   - MA (Maintenance): ${maCount} controls`);
    console.log(`   - MP (Media Protection): ${mpCount} controls`);
    console.log('');

    // Step 3: Verification
    const finalCount = await prisma.control.count();
    const maVerify = await prisma.control.count({ where: { family: 'MA' } });
    const mpVerify = await prisma.control.count({ where: { family: 'MP' } });

    console.log('🔍 Verification:');
    console.log(`   Total controls in database: ${finalCount}`);
    console.log(`   - MA controls: ${maVerify} (Phase 4)`);
    console.log(`   - MP controls: ${mpVerify} (Phase 4)`);
    console.log('');

    const expectedTotal = 59; // 49 from Phases 1-3 + 10 from Phase 4
    if (finalCount === expectedTotal && insertedCount === 10 && maCount === 3 && mpCount === 7) {
      console.log('✅ SUCCESS: Phase 4 implementation complete!');
      console.log(`   Expected total: ${expectedTotal} controls (Phases 1-3: 49, Phase 4: 10)`);
      console.log(`   Actual total: ${finalCount} controls`);
      console.log(`   Phase 4 inserted: 10 controls (3 MA + 7 MP)`);
    } else {
      console.log('⚠️  WARNING: Control count mismatch!');
      console.log(`   Expected total: ${expectedTotal} controls`);
      console.log(`   Actual total: ${finalCount} controls`);
      console.log(`   Phase 4 expected: 10 controls (3 MA + 7 MP)`);
      console.log(`   Phase 4 inserted: ${insertedCount} controls (${maCount} MA + ${mpCount} MP)`);
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('📝 Next Steps:');
    console.log('   1. Proceed with Phase 5 (PS, PE families - 7 controls)');
    console.log('   2. Progress: 59/97 controls (60.8%)');
    console.log('   3. Remaining: 38 controls across 4 phases');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error during Phase 4 control update:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the update
updatePhase4Controls()
  .then(() => {
    console.log('\n✅ Phase 4 update script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Phase 4 update script failed:', error);
    process.exit(1);
  });
