import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Phase 7 Controls: SC (System and Communications Protection) and SI (System and Information Integrity)
const phase7Controls = [
  // System and Communications Protection Family (10 controls)
  {
    controlId: "03.13.01",
    family: "SC",
    title: "Boundary Protection",
    requirementText: "a. Monitor and control communications at the external managed interfaces to the system and at key internal managed interfaces within the system.\nb. Implement subnetworks for publicly accessible system components that are [Selection: physically; logically] separated from internal organizational networks.\nc. Connect to external networks or systems only through managed interfaces consisting of boundary protection devices arranged in accordance with an organizational security and privacy architecture.",
    priority: "High"
  },
  {
    controlId: "03.13.04",
    family: "SC",
    title: "Information in Shared System Resources",
    requirementText: "Prevent unauthorized and unintended information transfer via shared system resources.",
    priority: "Medium"
  },
  {
    controlId: "03.13.06",
    family: "SC",
    title: "Network Communications – Deny by Default – Allow by Exception",
    requirementText: "Deny network communications traffic by default and allow network communications traffic by exception.",
    priority: "High"
  },
  {
    controlId: "03.13.08",
    family: "SC",
    title: "Transmission and Storage Confidentiality",
    requirementText: "a. Protect the confidentiality of transmitted information.\nb. Protect the confidentiality of information at rest.\nc. Implement cryptographic mechanisms to prevent unauthorized disclosure of CUI during transmission and while at rest unless otherwise protected by [Assignment: organization-defined alternative physical controls].",
    priority: "Critical"
  },
  {
    controlId: "03.13.09",
    family: "SC",
    title: "Network Disconnect",
    requirementText: "Terminate the network connection associated with a communications session at the end of the session or after [Assignment: organization-defined time period] of inactivity.",
    priority: "Low"
  },
  {
    controlId: "03.13.10",
    family: "SC",
    title: "Cryptographic Key Establishment and Management",
    requirementText: "Establish and manage cryptographic keys when cryptography is employed within the system in accordance with the following requirements: [Assignment: organization-defined requirements for key establishment and management].",
    priority: "High"
  },
  {
    controlId: "03.13.11",
    family: "SC",
    title: "Cryptographic Protection",
    requirementText: "Implement the following [Assignment: organization-defined types of cryptography] to: [Assignment: organization-defined uses for which the use of cryptography is required].",
    priority: "Critical"
  },
  {
    controlId: "03.13.12",
    family: "SC",
    title: "Collaborative Computing Devices and Applications",
    requirementText: "a. Prohibit remote activation of collaborative computing devices and applications with the following exceptions: [Assignment: organization-defined exceptions where remote activation is to be allowed].\nb. Provide an explicit indication of use to users physically present at the devices.",
    priority: "Low"
  },
  {
    controlId: "03.13.13",
    family: "SC",
    title: "Mobile Code",
    requirementText: "a. Establish and document usage restrictions and implementation guidance for mobile code technologies based on the potential to cause damage to the system if used maliciously.\nb. Authorize, monitor, and control the use of mobile code within the system.",
    priority: "Medium"
  },
  {
    controlId: "03.13.15",
    family: "SC",
    title: "Session Authenticity",
    requirementText: "Protect the authenticity of communications sessions.",
    priority: "Medium"
  },
  // System and Information Integrity Family (5 controls)
  {
    controlId: "03.14.01",
    family: "SI",
    title: "Flaw Remediation",
    requirementText: "a. Identify, report, and correct system flaws.\nb. Test software and firmware updates related to flaw remediation for effectiveness and potential side effects before installation.\nc. Install security-relevant software and firmware updates within [Assignment: organization-defined time period] of the release of the updates.\nd. Incorporate flaw remediation into the organizational configuration management process.",
    priority: "High"
  },
  {
    controlId: "03.14.02",
    family: "SI",
    title: "Malicious Code Protection",
    requirementText: "a. Implement the following [Selection (one or more): signature-based; non-signature-based] malicious code protection mechanisms at system entry and exit points to detect and eradicate malicious code.\nb. Automatically update malicious code protection mechanisms as new releases are available.\nc. Configure malicious code protection mechanisms to: 1. Perform scans of the system [Assignment: organization-defined frequency] and real-time scans of files from external sources at [Selection (one or more): endpoint; network entry and exit points] as the files are downloaded, opened, or executed; and 2. [Selection (one or more): block malicious code; quarantine malicious code; alert administrator; [Assignment: organization-defined action]] in response to malicious code detection.\nd. Address the receipt of false positives during malicious code detection and eradication and the resulting potential impact on the availability of the system.",
    priority: "High"
  },
  {
    controlId: "03.14.03",
    family: "SI",
    title: "Security Alerts, Advisories, and Directives",
    requirementText: "a. Receive system security alerts, advisories, and directives from [Assignment: organization-defined external organizations] on an ongoing basis.\nb. Generate internal security alerts, advisories, and directives as deemed necessary.\nc. Disseminate security alerts, advisories, and directives to: [Selection (one or more): [Assignment: organization-defined personnel or roles]; [Assignment: organization-defined elements within the organization]; [Assignment: organization-defined external organizations]].\nd. Implement security directives in accordance with established time frames, or notify the issuing organization of the degree of noncompliance.",
    priority: "Medium"
  },
  {
    controlId: "03.14.06",
    family: "SI",
    title: "System Monitoring",
    requirementText: "a. Monitor the system to detect: 1. Attacks and indicators of potential attacks in accordance with the following monitoring objectives: [Assignment: organization-defined monitoring objectives]; and 2. Unauthorized local, network, and remote connections.\nb. Identify unauthorized use of the system through [Assignment: organization-defined techniques and methods].\nc. Invoke internal monitoring capabilities or deploy monitoring devices: 1. Strategically within the system to collect organization-determined essential information; and 2. At ad hoc locations within the system to track specific types of transactions of interest to the organization.\nd. Analyze detected events and anomalies.\ne. Adjust the level of system monitoring activity when there is a change in risk to organizational operations and assets, individuals, other organizations, or the Nation.\nf. Obtain legal opinion regarding system monitoring activities.\ng. Provide [Assignment: organization-defined system monitoring information] to [Assignment: organization-defined personnel or roles] [Selection (one or more): as needed; [Assignment: organization-defined frequency]].",
    priority: "High"
  },
  {
    controlId: "03.14.08",
    family: "SI",
    title: "Information Management and Retention",
    requirementText: "Manage and retain information within the system and information output from the system in accordance with applicable laws, executive orders, directives, regulations, policies, standards, guidelines, and operational requirements.",
    priority: "Medium"
  }
];

async function updatePhase7Controls() {
  console.log('='.repeat(80));
  console.log('NIST 800-171 Rev 3 - Phase 7 Control Update');
  console.log('Phase 7: System and Communications Protection (SC) and System and Information');
  console.log('         Integrity (SI)');
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

    // Step 2: Insert Phase 7 controls
    console.log('📥 Inserting Phase 7 controls...');
    console.log('');

    let insertedCount = 0;
    let scCount = 0;
    let siCount = 0;

    for (const control of phase7Controls) {
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
      if (control.family === 'SC') {
        scCount++;
        console.log(`  ✓ SC-${String(scCount).padStart(2, '0')}: ${control.controlId} - ${control.title}`);
      } else if (control.family === 'SI') {
        siCount++;
        console.log(`  ✓ SI-${String(siCount).padStart(2, '0')}: ${control.controlId} - ${control.title}`);
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('📈 Phase 7 Update Summary');
    console.log('='.repeat(80));
    console.log(`✅ Phase 7 controls inserted: ${insertedCount}`);
    console.log(`   - SC (System and Communications Protection): ${scCount} controls`);
    console.log(`   - SI (System and Information Integrity): ${siCount} controls`);
    console.log('');

    // Step 3: Verification
    const finalCount = await prisma.control.count();
    const scVerify = await prisma.control.count({ where: { family: 'SC' } });
    const siVerify = await prisma.control.count({ where: { family: 'SI' } });

    console.log('🔍 Verification:');
    console.log(`   Total controls in database: ${finalCount}`);
    console.log(`   - SC controls: ${scVerify} (Phase 7)`);
    console.log(`   - SI controls: ${siVerify} (Phase 7)`);
    console.log('');

    const expectedTotal = 88; // 73 from Phases 1-6 + 15 from Phase 7
    if (finalCount === expectedTotal && insertedCount === 15 && scCount === 10 && siCount === 5) {
      console.log('✅ SUCCESS: Phase 7 implementation complete!');
      console.log(`   Expected total: ${expectedTotal} controls (Phases 1-6: 73, Phase 7: 15)`);
      console.log(`   Actual total: ${finalCount} controls`);
      console.log(`   Phase 7 inserted: 15 controls (10 SC + 5 SI)`);
    } else {
      console.log('⚠️  WARNING: Control count mismatch!');
      console.log(`   Expected total: ${expectedTotal} controls`);
      console.log(`   Actual total: ${finalCount} controls`);
      console.log(`   Phase 7 expected: 15 controls (10 SC + 5 SI)`);
      console.log(`   Phase 7 inserted: ${insertedCount} controls (${scCount} SC + ${siCount} SI)`);
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('📝 Next Steps:');
    console.log('   1. Proceed with Phase 8 FINAL (PL, SA, SR families - 9 controls)');
    console.log('   2. Progress: 88/97 controls (90.7%)');
    console.log('   3. Remaining: 9 controls in 1 final phase!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error during Phase 7 control update:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the update
updatePhase7Controls()
  .then(() => {
    console.log('\n✅ Phase 7 update script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Phase 7 update script failed:', error);
    process.exit(1);
  });
