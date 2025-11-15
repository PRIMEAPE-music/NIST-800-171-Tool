import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Phase 6 Controls: RA (Risk Assessment) and CA (Security Assessment and Monitoring)
const phase6Controls = [
  // Risk Assessment Family (3 controls)
  {
    controlId: "03.11.01",
    family: "RA",
    title: "Risk Assessment",
    requirementText: "a. Conduct a risk assessment, including: 1. Identifying threats to and vulnerabilities in the system; 2. Determining the likelihood and magnitude of harm from unauthorized access, use, disclosure, disruption, modification, or destruction of the system, the information it processes, stores, or transmits, and any related information; and 3. Determining the likelihood and impact of adverse effects on individuals arising from the processing of personally identifiable information.\nb. Review risk assessment results [Assignment: organization-defined frequency].\nc. Disseminate risk assessment results to [Assignment: organization-defined personnel or roles].\nd. Update the risk assessment [Assignment: organization-defined frequency] or when there are significant changes to the system, its environment of operation, or other conditions that may impact the security or privacy state of the system.",
    priority: "High"
  },
  {
    controlId: "03.11.02",
    family: "RA",
    title: "Vulnerability Monitoring and Scanning",
    requirementText: "a. Monitor and scan for vulnerabilities in the system and hosted applications [Assignment: organization-defined frequency] and when new vulnerabilities potentially affecting the system are identified and reported.\nb. Employ vulnerability monitoring tools and techniques that facilitate interoperability among tools and automate parts of the vulnerability management process by using standards for: 1. Enumerating platforms, software flaws, and improper configurations; 2. Formatting checklists and test procedures; and 3. Measuring vulnerability impact.\nc. Analyze vulnerability scan reports and results from vulnerability monitoring.\nd. Remediate legitimate vulnerabilities [Assignment: organization-defined response times] in accordance with an organizational assessment of risk.\ne. Share information obtained from the vulnerability monitoring process and control assessments with [Assignment: organization-defined personnel or roles] to help eliminate similar vulnerabilities in other systems.\nf. Employ vulnerability monitoring tools that include the capability to readily update the vulnerabilities scanned.\ng. Update the system vulnerabilities scanned prior to a new scan and [Assignment: organization-defined frequency].",
    priority: "High"
  },
  {
    controlId: "03.11.04",
    family: "RA",
    title: "Risk Response",
    requirementText: "Respond to findings from security and privacy assessments, monitoring, and audits.",
    priority: "High"
  },
  // Security Assessment and Monitoring Family (4 controls)
  {
    controlId: "03.12.01",
    family: "CA",
    title: "Security Assessment",
    requirementText: "a. Assess the security requirements in the system [Assignment: organization-defined frequency] to determine the extent to which they are implemented correctly, operating as intended, and producing the desired outcome with respect to meeting the security requirements.\nb. Develop, document, and implement a security assessment plan that describes the scope of the assessment, including: 1. Security requirements to be assessed; 2. Assessment procedures to determine security requirement implementation effectiveness; and 3. Assessment environment, assessment team, and assessment roles and responsibilities.\nc. Produce a security assessment report that documents the results of the assessment.\nd. Provide the results of the security requirement assessment to [Assignment: organization-defined personnel or roles].",
    priority: "High"
  },
  {
    controlId: "03.12.02",
    family: "CA",
    title: "Plan of Action and Milestones",
    requirementText: "a. Develop a plan of action and milestones for the system to document the planned remediation actions to correct deficiencies noted during the assessment of the security requirements and to reduce or eliminate known vulnerabilities.\nb. Update existing plan of action and milestones [Assignment: organization-defined frequency] based on the findings from security requirement assessments, security impact analyses, and continuous monitoring activities.",
    priority: "High"
  },
  {
    controlId: "03.12.03",
    family: "CA",
    title: "Continuous Monitoring",
    requirementText: "Develop and implement a system-level continuous monitoring strategy that includes: a. Monitoring of security requirement implementation status; b. Monitoring of system vulnerabilities; c. Trend analyses; and d. Security requirement status reporting to [Assignment: organization-defined personnel or roles] [Assignment: organization-defined frequency].",
    priority: "High"
  },
  {
    controlId: "03.12.05",
    family: "CA",
    title: "Information Exchange",
    requirementText: "a. Assist organizations in establishing the terms and conditions for authorizing and conducting information exchanges across the boundary of the system through [Selection (one or more): interconnection security agreements; memoranda of understanding or agreement; contracts; service level agreements; user agreements; [Assignment: organization-defined agreement types]].\nb. Document, as part of each information exchange agreement, the interface characteristics, requirements, and protections, as well as any restrictions required for the exchange of information.\nc. Review and update the agreements [Assignment: organization-defined frequency].",
    priority: "Medium"
  }
];

async function updatePhase6Controls() {
  console.log('='.repeat(80));
  console.log('NIST 800-171 Rev 3 - Phase 6 Control Update');
  console.log('Phase 6: Risk Assessment (RA) and Security Assessment and Monitoring (CA)');
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

    // Step 2: Insert Phase 6 controls
    console.log('📥 Inserting Phase 6 controls...');
    console.log('');

    let insertedCount = 0;
    let raCount = 0;
    let caCount = 0;

    for (const control of phase6Controls) {
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
      if (control.family === 'RA') {
        raCount++;
        console.log(`  ✓ RA-${String(raCount).padStart(2, '0')}: ${control.controlId} - ${control.title}`);
      } else if (control.family === 'CA') {
        caCount++;
        console.log(`  ✓ CA-${String(caCount).padStart(2, '0')}: ${control.controlId} - ${control.title}`);
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('📈 Phase 6 Update Summary');
    console.log('='.repeat(80));
    console.log(`✅ Phase 6 controls inserted: ${insertedCount}`);
    console.log(`   - RA (Risk Assessment): ${raCount} controls`);
    console.log(`   - CA (Security Assessment and Monitoring): ${caCount} controls`);
    console.log('');

    // Step 3: Verification
    const finalCount = await prisma.control.count();
    const raVerify = await prisma.control.count({ where: { family: 'RA' } });
    const caVerify = await prisma.control.count({ where: { family: 'CA' } });

    console.log('🔍 Verification:');
    console.log(`   Total controls in database: ${finalCount}`);
    console.log(`   - RA controls: ${raVerify} (Phase 6)`);
    console.log(`   - CA controls: ${caVerify} (Phase 6)`);
    console.log('');

    const expectedTotal = 73; // 66 from Phases 1-5 + 7 from Phase 6
    if (finalCount === expectedTotal && insertedCount === 7 && raCount === 3 && caCount === 4) {
      console.log('✅ SUCCESS: Phase 6 implementation complete!');
      console.log(`   Expected total: ${expectedTotal} controls (Phases 1-5: 66, Phase 6: 7)`);
      console.log(`   Actual total: ${finalCount} controls`);
      console.log(`   Phase 6 inserted: 7 controls (3 RA + 4 CA)`);
    } else {
      console.log('⚠️  WARNING: Control count mismatch!');
      console.log(`   Expected total: ${expectedTotal} controls`);
      console.log(`   Actual total: ${finalCount} controls`);
      console.log(`   Phase 6 expected: 7 controls (3 RA + 4 CA)`);
      console.log(`   Phase 6 inserted: ${insertedCount} controls (${raCount} RA + ${caCount} CA)`);
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('📝 Next Steps:');
    console.log('   1. Proceed with Phase 7 (SC, SI families - 15 controls)');
    console.log('   2. Progress: 73/97 controls (75.3%)');
    console.log('   3. Remaining: 24 controls across 2 phases');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error during Phase 6 control update:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the update
updatePhase6Controls()
  .then(() => {
    console.log('\n✅ Phase 6 update script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Phase 6 update script failed:', error);
    process.exit(1);
  });
