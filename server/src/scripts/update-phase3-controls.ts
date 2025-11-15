import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Phase 3 Controls: IA (Identification and Authentication) and IR (Incident Response)
const phase3Controls = [
  // Identification and Authentication Family (8 controls)
  {
    controlId: "03.05.01",
    family: "IA",
    title: "User Identification and Authentication",
    requirementText: "a. Uniquely identify and authenticate organizational users and associate that unique identification with processes acting on behalf of those users.\nb. Uniquely identify and authenticate organizational users and processes acting on behalf of those users under the following circumstances: [Assignment: organization-defined circumstances or situations requiring re-authentication].",
    priority: "Critical"
  },
  {
    controlId: "03.05.02",
    family: "IA",
    title: "Device Identification and Authentication",
    requirementText: "Uniquely identify and authenticate [Assignment: organization-defined devices or types of devices] before establishing a connection.",
    priority: "High"
  },
  {
    controlId: "03.05.03",
    family: "IA",
    title: "Multi-Factor Authentication",
    requirementText: "Use multi-factor authentication for local and network access to privileged accounts and for network access to non-privileged accounts.",
    priority: "Critical"
  },
  {
    controlId: "03.05.04",
    family: "IA",
    title: "Replay-Resistant Authentication",
    requirementText: "Use replay-resistant authentication mechanisms for access to privileged accounts and network access.",
    priority: "High"
  },
  {
    controlId: "03.05.05",
    family: "IA",
    title: "Identifier Management",
    requirementText: "Manage system identifiers by: a. Receiving authorization from [Assignment: organization-defined personnel or roles] to assign an individual, group, role, service, or device identifier; b. Selecting an identifier that identifies an individual, group, role, service, or device; c. Assigning the identifier to the intended individual, group, role, service, or device; d. Preventing reuse of identifiers for [Assignment: organization-defined time period]; e. Disabling the identifier after [Assignment: organization-defined time period] of inactivity; and f. Archiving user identifiers to support accountability when individuals that possess those identifiers [Assignment: organization-defined characteristic identifying individual status] are no longer associated with the organization.",
    priority: "Medium"
  },
  {
    controlId: "03.05.07",
    family: "IA",
    title: "Password Management",
    requirementText: "a. Protect authenticators commensurate with the security category of the system to which access is being granted.\nb. Establish initial authenticator content.\nc. Ensure that authenticators have sufficient strength of mechanism for their intended use.\nd. Establish and implement administrative procedures for initial authenticator distribution, lost, compromised, damaged, and revoked authenticators, and changing or refreshing authenticators [Assignment: organization-defined frequency].\ne. Change or refresh default authenticators prior to first use.\nf. Establish minimum and maximum lifetime restrictions and reuse conditions for authenticators.\ng. Protect authenticator content from unauthorized disclosure and modification.\nh. Require individuals to take specific controls to protect authenticators.\ni. Change authenticators for group or role accounts when membership to those accounts changes.\nj. Enforce password complexity by requiring passwords to contain [Assignment: organization-defined composition and complexity rules].",
    priority: "High"
  },
  {
    controlId: "03.05.11",
    family: "IA",
    title: "Authentication Feedback",
    requirementText: "Obscure feedback of authentication information during the authentication process to protect the information from possible exploitation and use by unauthorized individuals.",
    priority: "Medium"
  },
  {
    controlId: "03.05.12",
    family: "IA",
    title: "Authenticator Management",
    requirementText: "Manage system authenticators by: a. Verifying, as part of the initial authenticator distribution, the identity of the individual, group, role, service, or device receiving the authenticator; b. Establishing initial authenticator content for any authenticators issued by the organization; c. Ensuring that authenticators have sufficient strength of mechanism for their intended use; d. Establishing and implementing administrative procedures for initial authenticator distribution, for lost, compromised, or damaged authenticators, and for revoking authenticators; e. Changing or refreshing authenticators [Assignment: organization-defined frequency] or when [Assignment: organization-defined events] occur; f. Changing default authenticators prior to first use; g. Protecting authenticator content from unauthorized disclosure and modification; h. Requiring individuals to take specific actions to safeguard authenticators; and i. Changing authenticators for group or role accounts when membership to those accounts changes.",
    priority: "High"
  },
  // Incident Response Family (5 controls)
  {
    controlId: "03.06.01",
    family: "IR",
    title: "Incident Handling",
    requirementText: "a. Implement an incident handling capability for incidents that is consistent with the incident response plan and includes preparation, detection and analysis, containment, eradication, and recovery.\nb. Coordinate incident handling activities with contingency planning activities.\nc. Incorporate lessons learned from ongoing incident handling activities into incident response procedures, training, and testing, and implement the resulting changes accordingly.",
    priority: "High"
  },
  {
    controlId: "03.06.02",
    family: "IR",
    title: "Incident Monitoring, Reporting, and Response Assistance",
    requirementText: "a. Track and document incidents.\nb. Report incident information to [Assignment: organization-defined authorities] within [Assignment: organization-defined time period] and to [Assignment: organization-defined external organizations].\nc. Provide an incident response support resource that offers advice and assistance to users of the system for the handling and reporting of incidents.",
    priority: "High"
  },
  {
    controlId: "03.06.03",
    family: "IR",
    title: "Incident Response Testing",
    requirementText: "Test the effectiveness of the incident response capability [Assignment: organization-defined frequency] using the following tests: [Assignment: organization-defined tests].",
    priority: "Medium"
  },
  {
    controlId: "03.06.04",
    family: "IR",
    title: "Incident Response Training",
    requirementText: "a. Train personnel in their incident response roles and responsibilities with respect to the system: 1. Within [Assignment: organization-defined time period] of assuming an incident response role or responsibility or acquiring system access; 2. When required by system changes; and 3. [Assignment: organization-defined frequency] thereafter.\nb. Review and update incident response training content [Assignment: organization-defined frequency] and following [Assignment: organization-defined events].",
    priority: "Medium"
  },
  {
    controlId: "03.06.05",
    family: "IR",
    title: "Incident Response Plan",
    requirementText: "a. Develop an incident response plan that: 1. Provides the organization with a roadmap for implementing its incident response capability; 2. Describes the structure and organization of the incident response capability; 3. Provides a high-level approach for how the incident response capability fits into the overall organization; 4. Meets the unique requirements of the organization, which relate to mission, size, structure, and functions; 5. Defines reportable incidents; 6. Provides metrics for measuring the incident response capability within the organization; 7. Defines the resources and management support needed to effectively maintain and mature an incident response capability; 8. Addresses the sharing of incident information; 9. Is reviewed and approved by [Assignment: organization-defined personnel or roles] [Assignment: organization-defined frequency]; and 10. Explicitly designates responsibility for incident response to [Assignment: organization-defined entities, personnel, or roles].\nb. Distribute copies of the incident response plan to [Assignment: organization-defined incident response personnel (identified by name and/or by role) and organizational elements].\nc. Update the incident response plan to address system and organizational changes or problems encountered during plan implementation, execution, or testing.\nd. Communicate incident response plan changes to [Assignment: organization-defined incident response personnel (identified by name and/or by role) and organizational elements].\ne. Protect the incident response plan from unauthorized disclosure and modification.",
    priority: "High"
  }
];

async function updatePhase3Controls() {
  console.log('='.repeat(80));
  console.log('NIST 800-171 Rev 3 - Phase 3 Control Update');
  console.log('Phase 3: Identification and Authentication (IA) and Incident Response (IR)');
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

    // Step 2: Insert Phase 3 controls
    console.log('📥 Inserting Phase 3 controls...');
    console.log('');

    let insertedCount = 0;
    let iaCount = 0;
    let irCount = 0;

    for (const control of phase3Controls) {
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
      if (control.family === 'IA') {
        iaCount++;
        console.log(`  ✓ IA-${String(iaCount).padStart(2, '0')}: ${control.controlId} - ${control.title}`);
      } else if (control.family === 'IR') {
        irCount++;
        console.log(`  ✓ IR-${String(irCount).padStart(2, '0')}: ${control.controlId} - ${control.title}`);
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('📈 Phase 3 Update Summary');
    console.log('='.repeat(80));
    console.log(`✅ Phase 3 controls inserted: ${insertedCount}`);
    console.log(`   - IA (Identification and Authentication): ${iaCount} controls`);
    console.log(`   - IR (Incident Response): ${irCount} controls`);
    console.log('');

    // Step 3: Verification
    const finalCount = await prisma.control.count();
    const iaVerify = await prisma.control.count({ where: { family: 'IA' } });
    const irVerify = await prisma.control.count({ where: { family: 'IR' } });

    console.log('🔍 Verification:');
    console.log(`   Total controls in database: ${finalCount}`);
    console.log(`   - IA controls: ${iaVerify} (Phase 3)`);
    console.log(`   - IR controls: ${irVerify} (Phase 3)`);
    console.log('');

    const expectedTotal = 49; // 36 from Phases 1-2 + 13 from Phase 3
    if (finalCount === expectedTotal && insertedCount === 13 && iaCount === 8 && irCount === 5) {
      console.log('✅ SUCCESS: Phase 3 implementation complete!');
      console.log(`   Expected total: ${expectedTotal} controls (Phases 1-2: 36, Phase 3: 13)`);
      console.log(`   Actual total: ${finalCount} controls`);
      console.log(`   Phase 3 inserted: 13 controls (8 IA + 5 IR)`);
    } else {
      console.log('⚠️  WARNING: Control count mismatch!');
      console.log(`   Expected total: ${expectedTotal} controls`);
      console.log(`   Actual total: ${finalCount} controls`);
      console.log(`   Phase 3 expected: 13 controls (8 IA + 5 IR)`);
      console.log(`   Phase 3 inserted: ${insertedCount} controls (${iaCount} IA + ${irCount} IR)`);
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('📝 Next Steps:');
    console.log('   1. Proceed with Phase 4 (MA, MP families - 10 controls)');
    console.log('   2. Progress: 49/97 controls (50.5%)');
    console.log('   3. Remaining: 48 controls across 5 phases');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error during Phase 3 control update:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the update
updatePhase3Controls()
  .then(() => {
    console.log('\n✅ Phase 3 update script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Phase 3 update script failed:', error);
    process.exit(1);
  });
