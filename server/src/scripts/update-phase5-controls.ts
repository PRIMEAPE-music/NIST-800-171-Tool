import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Phase 5 Controls: PS (Personnel Security) and PE (Physical Protection)
const phase5Controls = [
  // Personnel Security Family (2 controls)
  {
    controlId: "03.09.01",
    family: "PS",
    title: "Personnel Screening",
    requirementText: "a. Screen individuals prior to authorizing access to the system.\nb. Rescreen individuals in accordance with [Assignment: organization-defined conditions requiring rescreening and where rescreening is so indicated, the frequency of rescreening].",
    priority: "Medium"
  },
  {
    controlId: "03.09.02",
    family: "PS",
    title: "Personnel Termination and Transfer",
    requirementText: "a. When individuals are terminated or transferred, terminate system access within [Assignment: organization-defined time period], retrieve all security-related organizational system-related property, retain access to organizational information and systems formerly controlled by the terminated or transferred individual, and provide notification to [Assignment: organization-defined personnel or roles] within [Assignment: organization-defined time period].\nb. Conduct exit interviews that include a discussion of [Assignment: organization-defined information security topics].\nc. Ensure that individuals that have been terminated or transferred cannot access CUI.",
    priority: "High"
  },
  // Physical Protection Family (5 controls)
  {
    controlId: "03.10.01",
    family: "PE",
    title: "Physical Access Authorizations",
    requirementText: "a. Develop, approve, and maintain a list of individuals with authorized access to the facility where the system resides.\nb. Issue authorization credentials for facility access.\nc. Review the access list detailing authorized facility access by individuals [Assignment: organization-defined frequency].\nd. Remove individuals from the facility access list when access is no longer required.",
    priority: "Medium"
  },
  {
    controlId: "03.10.02",
    family: "PE",
    title: "Monitoring Physical Access",
    requirementText: "a. Monitor physical access to the facility where the system resides to detect and respond to physical security incidents.\nb. Review physical access logs [Assignment: organization-defined frequency] and upon occurrence of [Assignment: organization-defined events or potential indications of events].\nc. Coordinate results of reviews and investigations with the organizational incident response capability.",
    priority: "Medium"
  },
  {
    controlId: "03.10.06",
    family: "PE",
    title: "Alternate Work Site",
    requirementText: "a. Determine and document the [Assignment: organization-defined alternate work sites] allowed for use by employees.\nb. Employ the following controls at alternate work sites: [Assignment: organization-defined security and privacy controls].\nc. Assess the effectiveness of controls at alternate work sites.\nd. Provide a means for employees to communicate with security and privacy personnel in case of incidents.",
    priority: "Low"
  },
  {
    controlId: "03.10.07",
    family: "PE",
    title: "Physical Access Control",
    requirementText: "a. Verify individual access authorizations before granting access to the facility where the system resides.\nb. Control ingress and egress to the facility where the system resides using [Selection (one or more): [Assignment: organization-defined physical access control systems or devices]; guards].\nc. Control access to areas within the facility designated as publicly accessible.\nd. Secure keys, combinations, and other physical access devices.\ne. Inventory physical access devices every [Assignment: organization-defined frequency].\nf. Change combinations and keys [Assignment: organization-defined frequency] and/or when keys are lost, combinations are compromised, or when individuals possessing the keys or combinations are transferred or terminated.",
    priority: "High"
  },
  {
    controlId: "03.10.08",
    family: "PE",
    title: "Access Control for Transmission",
    requirementText: "Control physical access to system distribution and transmission lines within organizational facilities using [Assignment: organization-defined physical controls].",
    priority: "Medium"
  }
];

async function updatePhase5Controls() {
  console.log('='.repeat(80));
  console.log('NIST 800-171 Rev 3 - Phase 5 Control Update');
  console.log('Phase 5: Personnel Security (PS) and Physical Protection (PE)');
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

    // Step 2: Insert Phase 5 controls
    console.log('📥 Inserting Phase 5 controls...');
    console.log('');

    let insertedCount = 0;
    let psCount = 0;
    let peCount = 0;

    for (const control of phase5Controls) {
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
      if (control.family === 'PS') {
        psCount++;
        console.log(`  ✓ PS-${String(psCount).padStart(2, '0')}: ${control.controlId} - ${control.title}`);
      } else if (control.family === 'PE') {
        peCount++;
        console.log(`  ✓ PE-${String(peCount).padStart(2, '0')}: ${control.controlId} - ${control.title}`);
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('📈 Phase 5 Update Summary');
    console.log('='.repeat(80));
    console.log(`✅ Phase 5 controls inserted: ${insertedCount}`);
    console.log(`   - PS (Personnel Security): ${psCount} controls`);
    console.log(`   - PE (Physical Protection): ${peCount} controls`);
    console.log('');

    // Step 3: Verification
    const finalCount = await prisma.control.count();
    const psVerify = await prisma.control.count({ where: { family: 'PS' } });
    const peVerify = await prisma.control.count({ where: { family: 'PE' } });

    console.log('🔍 Verification:');
    console.log(`   Total controls in database: ${finalCount}`);
    console.log(`   - PS controls: ${psVerify} (Phase 5)`);
    console.log(`   - PE controls: ${peVerify} (Phase 5)`);
    console.log('');

    const expectedTotal = 66; // 59 from Phases 1-4 + 7 from Phase 5
    if (finalCount === expectedTotal && insertedCount === 7 && psCount === 2 && peCount === 5) {
      console.log('✅ SUCCESS: Phase 5 implementation complete!');
      console.log(`   Expected total: ${expectedTotal} controls (Phases 1-4: 59, Phase 5: 7)`);
      console.log(`   Actual total: ${finalCount} controls`);
      console.log(`   Phase 5 inserted: 7 controls (2 PS + 5 PE)`);
    } else {
      console.log('⚠️  WARNING: Control count mismatch!');
      console.log(`   Expected total: ${expectedTotal} controls`);
      console.log(`   Actual total: ${finalCount} controls`);
      console.log(`   Phase 5 expected: 7 controls (2 PS + 5 PE)`);
      console.log(`   Phase 5 inserted: ${insertedCount} controls (${psCount} PS + ${peCount} PE)`);
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('📝 Next Steps:');
    console.log('   1. Proceed with Phase 6 (RA, CA families - 7 controls)');
    console.log('   2. Progress: 66/97 controls (68.0%)');
    console.log('   3. Remaining: 31 controls across 3 phases');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error during Phase 5 control update:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the update
updatePhase5Controls()
  .then(() => {
    console.log('\n✅ Phase 5 update script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Phase 5 update script failed:', error);
    process.exit(1);
  });
