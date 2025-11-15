import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Phase 8 FINAL Controls: PL (Planning), SA (System and Services Acquisition), SR (Supply Chain Risk Management)
// These are the NEW families introduced in NIST 800-171 Revision 3
const phase8Controls = [
  // Planning Family (3 controls) - NEW IN REVISION 3
  {
    controlId: "03.15.01",
    family: "PL",
    title: "Policy and Procedures",
    requirementText: "a. Develop, document, and disseminate to [Assignment: organization-defined personnel or roles]: 1. System security and privacy policy that: a. Addresses purpose, scope, roles, responsibilities, management commitment, coordination among organizational entities, and compliance; and b. Is consistent with applicable laws, executive orders, directives, regulations, policies, standards, and guidelines; and 2. Procedures to facilitate the implementation of the system security and privacy policy and the associated system security and privacy requirements.\nb. Designate an [Assignment: organization-defined official] to manage the development, documentation, and dissemination of the system security and privacy policy and procedures.\nc. Review and update the current system: 1. Security and privacy policy [Assignment: organization-defined frequency] and following [Assignment: organization-defined events]; and 2. Security and privacy procedures [Assignment: organization-defined frequency] and following [Assignment: organization-defined events].",
    priority: "Medium"
  },
  {
    controlId: "03.15.02",
    family: "PL",
    title: "System Security Plan",
    requirementText: "a. Develop a system security plan for the system that: 1. Is consistent with the organization's enterprise architecture; 2. Explicitly defines the authorization boundary for the system; 3. Identifies the information types processed, stored, and transmitted by the system; 4. Describes the operational context of the system in terms of missions and business processes; 5. Identifies the individuals that fulfill system roles and responsibilities; 6. Identifies the connections to and trust relationships with external systems; 7. Provides the security categorization of the system, including supporting rationale; 8. Describes any specific threats to the system that are of concern to the organization; 9. Provides the results of a risk assessment for the system; 10. Describes the operational environment for the system and any dependencies on or connections to other systems or system components; 11. Provides an overview of the security and privacy requirements for the system; 12. Identifies the controls in place or planned for meeting the security and privacy requirements; 13. Identifies any approved deviations from established security and privacy requirements; and 14. Describes the plan for assessing controls and monitoring their effectiveness.\nb. Distribute copies of the system security plan and communicate subsequent changes to the plan to [Assignment: organization-defined personnel or roles].\nc. Review the system security plan [Assignment: organization-defined frequency].\nd. Update the system security plan to address changes to the system and environment of operation or problems identified during plan implementation or control assessments.\ne. Protect the system security plan from unauthorized disclosure and modification.",
    priority: "High"
  },
  {
    controlId: "03.15.03",
    family: "PL",
    title: "Rules of Behavior",
    requirementText: "a. Establish and provide to individuals requiring access to the system, the rules that describe their responsibilities and expected behavior for information and system usage.\nb. Receive a documented acknowledgment from such individuals, indicating that they have read, understand, and agree to abide by the rules of behavior, before authorizing access to information and the system.\nc. Review and update the rules of behavior [Assignment: organization-defined frequency].\nd. Require individuals who have acknowledged a previous version of the rules of behavior to read and re-acknowledge receipt of changes.",
    priority: "Low"
  },
  // System and Services Acquisition Family (3 controls) - NEW IN REVISION 3
  {
    controlId: "03.16.01",
    family: "SA",
    title: "Security Engineering Principles",
    requirementText: "Apply the following systems security engineering principles in the specification, design, development, implementation, and modification of the system and system components: [Assignment: organization-defined systems security engineering principles].",
    priority: "Medium"
  },
  {
    controlId: "03.16.02",
    family: "SA",
    title: "Unsupported System Components",
    requirementText: "a. Replace system components when support for the components is no longer available from the developer, vendor, or manufacturer.\nb. Provide the following options for alternative sources for continued support for unsupported components [Selection (one or more): in-house support; [Assignment: organization-defined support from external providers]].",
    priority: "High"
  },
  {
    controlId: "03.16.03",
    family: "SA",
    title: "External System Services",
    requirementText: "a. Require that providers of external system services comply with organizational security and privacy requirements and employ the following controls: [Assignment: organization-defined security requirements].\nb. Define and document organizational oversight and user roles and responsibilities with regard to external system services.\nc. Employ the following processes, methods, and techniques to monitor control compliance by external service providers on an ongoing basis: [Assignment: organization-defined processes, methods, and techniques].",
    priority: "Medium"
  },
  // Supply Chain Risk Management Family (3 controls) - NEW IN REVISION 3
  {
    controlId: "03.17.01",
    family: "SR",
    title: "Supply Chain Risk Management Plan",
    requirementText: "a. Develop a plan for managing supply chain risks associated with the organizational use of systems, system components, and system services.\nb. Review and update the supply chain risk management plan [Assignment: organization-defined frequency].\nc. Protect the supply chain risk management plan from unauthorized disclosure and modification.",
    priority: "Medium"
  },
  {
    controlId: "03.17.02",
    family: "SR",
    title: "Acquisition Strategies, Tools, and Methods",
    requirementText: "Establish a set of acquisition strategies, contract tools, and procurement methods to protect the interests of the organization when acquiring systems, system components, or system services.",
    priority: "Medium"
  },
  {
    controlId: "03.17.03",
    family: "SR",
    title: "Supply Chain Requirements and Processes",
    requirementText: "a. Establish a process or processes for addressing weaknesses or deficiencies in the supply chain elements and processes of [Assignment: organization-defined system or system component].\nb. Employ the following security requirements to protect against supply chain risks to the system, system component, or system service: [Assignment: organization-defined security requirements].\nc. Document the processes.",
    priority: "Medium"
  }
];

async function updatePhase8FinalControls() {
  console.log('='.repeat(80));
  console.log('🎉 NIST 800-171 Rev 3 - Phase 8 FINAL Control Update 🎉');
  console.log('Phase 8: Planning (PL), System and Services Acquisition (SA),');
  console.log('         and Supply Chain Risk Management (SR)');
  console.log('         ⭐ NEW FAMILIES IN REVISION 3 ⭐');
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

    // Step 2: Insert Phase 8 FINAL controls
    console.log('📥 Inserting Phase 8 FINAL controls (NEW families in Rev 3)...');
    console.log('');

    let insertedCount = 0;
    let plCount = 0;
    let saCount = 0;
    let srCount = 0;

    for (const control of phase8Controls) {
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
      if (control.family === 'PL') {
        plCount++;
        console.log(`  ⭐ PL-${String(plCount).padStart(2, '0')}: ${control.controlId} - ${control.title}`);
      } else if (control.family === 'SA') {
        saCount++;
        console.log(`  ⭐ SA-${String(saCount).padStart(2, '0')}: ${control.controlId} - ${control.title}`);
      } else if (control.family === 'SR') {
        srCount++;
        console.log(`  ⭐ SR-${String(srCount).padStart(2, '0')}: ${control.controlId} - ${control.title}`);
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('📈 Phase 8 FINAL Update Summary');
    console.log('='.repeat(80));
    console.log(`✅ Phase 8 controls inserted: ${insertedCount}`);
    console.log(`   - PL (Planning): ${plCount} controls ⭐ NEW`);
    console.log(`   - SA (System and Services Acquisition): ${saCount} controls ⭐ NEW`);
    console.log(`   - SR (Supply Chain Risk Management): ${srCount} controls ⭐ NEW`);
    console.log('');

    // Step 3: Final Verification
    const finalCount = await prisma.control.count();
    const plVerify = await prisma.control.count({ where: { family: 'PL' } });
    const saVerify = await prisma.control.count({ where: { family: 'SA' } });
    const srVerify = await prisma.control.count({ where: { family: 'SR' } });

    console.log('🔍 Verification:');
    console.log(`   Total controls in database: ${finalCount}`);
    console.log(`   - PL controls: ${plVerify} (Phase 8)`);
    console.log(`   - SA controls: ${saVerify} (Phase 8)`);
    console.log(`   - SR controls: ${srVerify} (Phase 8)`);
    console.log('');

    const expectedTotal = 97; // 88 from Phases 1-7 + 9 from Phase 8
    if (finalCount === expectedTotal && insertedCount === 9 && plCount === 3 && saCount === 3 && srCount === 3) {
      console.log('🎊 🎉 🎊 SUCCESS: Phase 8 FINAL implementation complete! 🎊 🎉 🎊');
      console.log('');
      console.log('='.repeat(80));
      console.log('🏆 NIST 800-171 REVISION 3 MIGRATION COMPLETE! 🏆');
      console.log('='.repeat(80));
      console.log('');
      console.log(`✅ ALL 97 ACTIVE CONTROLS SUCCESSFULLY MIGRATED!`);
      console.log(`   - Phase 1: 18 controls (AC: 16, AT: 2)`);
      console.log(`   - Phase 2: 18 controls (AU: 8, CM: 10)`);
      console.log(`   - Phase 3: 13 controls (IA: 8, IR: 5)`);
      console.log(`   - Phase 4: 10 controls (MA: 3, MP: 7)`);
      console.log(`   - Phase 5: 7 controls (PS: 2, PE: 5)`);
      console.log(`   - Phase 6: 7 controls (RA: 3, CA: 4)`);
      console.log(`   - Phase 7: 15 controls (SC: 10, SI: 5)`);
      console.log(`   - Phase 8: 9 controls (PL: 3, SA: 3, SR: 3) ⭐ NEW FAMILIES`);
      console.log('');
      console.log('📊 17 Control Families | Rev 3 Format (03.XX.YY) | May 2024');
    } else {
      console.log('⚠️  WARNING: Control count mismatch!');
      console.log(`   Expected total: ${expectedTotal} controls`);
      console.log(`   Actual total: ${finalCount} controls`);
      console.log(`   Phase 8 expected: 9 controls (3 PL + 3 SA + 3 SR)`);
      console.log(`   Phase 8 inserted: ${insertedCount} controls (${plCount} PL + ${saCount} SA + ${srCount} SR)`);
    }

    console.log('');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error during Phase 8 FINAL control update:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the update
updatePhase8FinalControls()
  .then(() => {
    console.log('\n🎊 Phase 8 FINAL update script completed successfully! 🎊');
    console.log('🏆 NIST 800-171 Rev 3 Migration: COMPLETE! 🏆\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Phase 8 FINAL update script failed:', error);
    process.exit(1);
  });
