import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Phase 1 Controls: AC (Access Control) and AT (Awareness and Training)
const phase1Controls = [
  // Access Control Family (16 controls)
  {
    controlId: "03.01.01",
    family: "AC",
    title: "Account Management",
    requirementText: "a. Define the types of system accounts allowed and prohibited.\nb. Create, enable, modify, disable, and remove system accounts in accordance with policy, procedures, prerequisites, and criteria.\nc. Specify: 1. Authorized users of the system, 2. Group and role membership, and 3. Access authorizations (i.e., privileges) for each account.\nd. Authorize access to the system based on: 1. A valid access authorization and 2. Intended system usage.\ne. Monitor the use of system accounts.\nf. Disable system accounts when: 1. The accounts have expired, 2. The accounts have been inactive for [Assignment: organization-defined time period], 3. The accounts are no longer associated with a user or individual, 4. The accounts are in violation of organizational policy, or 5. Significant risks associated with individuals are discovered.\ng. Notify account managers and designated personnel or roles within: 1. [Assignment: organization-defined time period] when accounts are no longer required. 2. [Assignment: organization-defined time period] when users are terminated or transferred. 3. [Assignment: organization-defined time period] when system usage or the need-to-know changes for an individual.\nh. Require that users log out of the system after [Assignment: organization-defined time period] of expected inactivity or when [Assignment: organization-defined circumstances].",
    priority: "Critical"
  },
  {
    controlId: "03.01.02",
    family: "AC",
    title: "Access Enforcement",
    requirementText: "Enforce approved authorizations for logical access to CUI and system resources in accordance with applicable access control policies.",
    priority: "Critical"
  },
  {
    controlId: "03.01.03",
    family: "AC",
    title: "Information Flow Enforcement",
    requirementText: "Control information flows within the system and between connected systems based on approved authorizations.",
    priority: "High"
  },
  {
    controlId: "03.01.04",
    family: "AC",
    title: "Separation of Duties",
    requirementText: "Separate the duties of individuals to prevent malevolent activity without collusion.",
    priority: "High"
  },
  {
    controlId: "03.01.05",
    family: "AC",
    title: "Least Privilege",
    requirementText: "Authorize only the minimum access to CUI that is necessary to accomplish assigned tasks.",
    priority: "Critical"
  },
  {
    controlId: "03.01.06",
    family: "AC",
    title: "Least Privilege – Privileged Accounts",
    requirementText: "Authorize access to CUI for privileged accounts only when compelling operational needs require such access.",
    priority: "Critical"
  },
  {
    controlId: "03.01.07",
    family: "AC",
    title: "Least Privilege – Privileged Functions",
    requirementText: "a. Prevent non-privileged users from executing privileged functions.\nb. Audit the execution of privileged functions.",
    priority: "High"
  },
  {
    controlId: "03.01.08",
    family: "AC",
    title: "Unsuccessful Logon Attempts",
    requirementText: "Limit the number of consecutive invalid logon attempts by a user during a [Assignment: organization-defined time period] and automatically [Selection (one or more): lock the account or node for an [Assignment: organization-defined time period]; lock the account or node until released by an administrator; delay next logon prompt per [Assignment: organization-defined delay algorithm]; notify system administrator; take other [Assignment: organization-defined action]] when the maximum number of unsuccessful attempts is exceeded.",
    priority: "High"
  },
  {
    controlId: "03.01.09",
    family: "AC",
    title: "System Use Notification",
    requirementText: "Provide privacy and security notices consistent with applicable CUI rules before granting access to the system.",
    priority: "Medium"
  },
  {
    controlId: "03.01.10",
    family: "AC",
    title: "Device Lock",
    requirementText: "a. Prevent further access to the system by [Selection (one or more): initiating a device lock after [Assignment: organization-defined time period] of inactivity; requiring the user to initiate a device lock before leaving the system unattended].\nb. Retain the device lock until the user reestablishes access using established identification and authentication procedures.",
    priority: "Medium"
  },
  {
    controlId: "03.01.11",
    family: "AC",
    title: "Session Termination",
    requirementText: "Automatically terminate a user session after [Assignment: organization-defined conditions or trigger events requiring session disconnect].",
    priority: "Medium"
  },
  {
    controlId: "03.01.12",
    family: "AC",
    title: "Remote Access",
    requirementText: "a. Document allowed methods of remote access to the system.\nb. Establish usage restrictions, configuration/connection requirements, and implementation guidance for each type of remote access allowed.\nc. Authorize each type of remote access to the system prior to allowing such connections.\nd. Enforce requirements for remote connections to the system.\ne. Monitor remote access sessions.\nf. Control remote access sessions.",
    priority: "High"
  },
  {
    controlId: "03.01.16",
    family: "AC",
    title: "Wireless Access",
    requirementText: "a. Authorize wireless access to the system prior to allowing such connections.\nb. Protect wireless access to the system using encryption and authentication.",
    priority: "High"
  },
  {
    controlId: "03.01.18",
    family: "AC",
    title: "Access Control for Mobile Devices",
    requirementText: "a. Verify session and connection security when accessing the system using mobile devices.\nb. Control connection of mobile devices.",
    priority: "High"
  },
  {
    controlId: "03.01.20",
    family: "AC",
    title: "Use of External Systems",
    requirementText: "Verify the implementation of required controls on external systems, or establish [Selection (one or more): terms and conditions; [Assignment: organization-defined controls]] before allowing authorized individuals to: a. Access the system from external systems; or b. Process, store, or transmit CUI using external systems.",
    priority: "Medium"
  },
  {
    controlId: "03.01.22",
    family: "AC",
    title: "Publicly Accessible Content",
    requirementText: "a. Designate individuals authorized to make information publicly accessible.\nb. Train authorized individuals to verify that CUI is not contained in the publicly accessible information.\nc. Review the publicly accessible content for CUI before making it publicly accessible.\nd. Remove unauthorized CUI from the publicly accessible system.",
    priority: "Medium"
  },
  // Awareness and Training Family (2 controls)
  {
    controlId: "03.02.01",
    family: "AT",
    title: "Literacy Training and Awareness",
    requirementText: "a. Provide literacy training to system users (including managers, senior executives, and contractors): 1. As part of initial training for new users and [Assignment: organization-defined frequency] thereafter, and 2. When required by system changes.\nb. Provide literacy training on: 1. The acceptable use of the system and user responsibilities, and 2. How to recognize and report indicators of insider threat.",
    priority: "Low"
  },
  {
    controlId: "03.02.02",
    family: "AT",
    title: "Role-Based Training",
    requirementText: "a. Provide role-based training to personnel with the following roles and responsibilities: [Assignment: organization-defined roles and responsibilities]: 1. Before authorizing access to the system, CUI, or performing assigned duties, and 2. When required by system changes.\nb. Update role-based training content [Assignment: organization-defined frequency] and following [Assignment: organization-defined events].",
    priority: "Low"
  }
];

async function updatePhase1Controls() {
  console.log('='.repeat(80));
  console.log('NIST 800-171 Rev 3 - Phase 1 Control Update');
  console.log('Phase 1: Access Control (AC) and Awareness Training (AT) Families');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Step 1: Get count of existing controls
    const existingCount = await prisma.control.count();
    console.log(`📊 Current controls in database: ${existingCount}`);
    console.log('');

    // Step 2: Clear existing controls
    console.log('🗑️  Clearing existing controls...');
    const deleted = await prisma.control.deleteMany({});
    console.log(`✅ Deleted ${deleted.count} existing controls`);
    console.log('');

    // Step 3: Insert Phase 1 controls
    console.log('📥 Inserting Phase 1 controls...');
    console.log('');

    let insertedCount = 0;
    let acCount = 0;
    let atCount = 0;

    for (const control of phase1Controls) {
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
      if (control.family === 'AC') {
        acCount++;
        console.log(`  ✓ AC-${String(acCount).padStart(2, '0')}: ${control.controlId} - ${control.title}`);
      } else if (control.family === 'AT') {
        atCount++;
        console.log(`  ✓ AT-${String(atCount).padStart(2, '0')}: ${control.controlId} - ${control.title}`);
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('📈 Phase 1 Update Summary');
    console.log('='.repeat(80));
    console.log(`✅ Total controls inserted: ${insertedCount}`);
    console.log(`   - AC (Access Control): ${acCount} controls`);
    console.log(`   - AT (Awareness and Training): ${atCount} controls`);
    console.log('');

    // Step 4: Verification
    const finalCount = await prisma.control.count();
    const acVerify = await prisma.control.count({ where: { family: 'AC' } });
    const atVerify = await prisma.control.count({ where: { family: 'AT' } });

    console.log('🔍 Verification:');
    console.log(`   - Total controls in database: ${finalCount}`);
    console.log(`   - AC controls: ${acVerify}`);
    console.log(`   - AT controls: ${atVerify}`);
    console.log('');

    if (insertedCount === 18 && acCount === 16 && atCount === 2) {
      console.log('✅ SUCCESS: Phase 1 implementation complete!');
      console.log('   Expected: 18 controls (16 AC + 2 AT)');
      console.log('   Inserted: 18 controls (16 AC + 2 AT)');
    } else {
      console.log('⚠️  WARNING: Control count mismatch!');
      console.log(`   Expected: 18 controls (16 AC + 2 AT)`);
      console.log(`   Inserted: ${insertedCount} controls (${acCount} AC + ${atCount} AT)`);
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('📝 Next Steps:');
    console.log('   1. Proceed with Phase 2 (AU, CM families)');
    console.log('   2. Test application functionality with new controls');
    console.log('   3. Update related tables if needed (control_status, assessments, etc.)');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error during Phase 1 control update:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the update
updatePhase1Controls()
  .then(() => {
    console.log('\n✅ Phase 1 update script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Phase 1 update script failed:', error);
    process.exit(1);
  });
