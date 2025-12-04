import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface ConsolidatedData {
  schemaVersion: string;
  generatedDate: string;
  nistRevision: string;
  totalControls: number;
  consolidationNotes: string;
  masterPolicyList: Array<{
    policyId: string;
    standardizedName: string;
    description: string;
    category: string;
    family: string;
    sharedAcrossControls: string[];
    controlCount: number;
    frequency: string;
    freshnessThreshold: number;
  }>;
  masterProcedureList: Array<{
    procedureId: string;
    standardizedName: string;
    description: string;
    category: string;
    family: string;
    sharedAcrossControls: string[];
    controlCount: number;
    frequency?: string;
    freshnessThreshold?: number;
  }>;
  controlEvidenceRequirements: Array<{
    controlId: string;
    controlTitle: string;
    controlFamily: string;
    evidenceRequirements: {
      policies: Array<{
        policyId: string;
        standardizedName: string;
        description: string;
        rationale: string;
        frequency?: string;
        freshnessThreshold?: number;
      }>;
      procedures: Array<{
        procedureId: string;
        standardizedName: string;
        description: string;
        rationale: string;
        frequency?: string;
        freshnessThreshold?: number;
      }>;
      executionEvidence: Array<{
        name: string;
        description: string;
        frequency: string;
        freshnessThreshold: string;
        rationale: string;
      }>;
      physicalEvidence: Array<{
        name: string;
        description: string;
        rationale: string;
      }>;
      operationalActivities?: string[];
    };
  }>;
}

async function importEvidenceRequirements() {
  console.log('🔄 Starting evidence requirements import...\n');

  // Read consolidated JSON
  const jsonPath = path.join(__dirname, '../../data/nist_control_evidence_requirements.json');

  if (!fs.existsSync(jsonPath)) {
    console.error('❌ File not found:', jsonPath);
    console.log('Please ensure nist_control_evidence_requirements.json is in server/data/');
    process.exit(1);
  }

  const data: ConsolidatedData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  console.log('📊 Import Summary:');
  console.log(`  Controls: ${data.totalControls}`);
  console.log(`  Policies: ${data.masterPolicyList.length}`);
  console.log(`  Procedures: ${data.masterProcedureList.length}`);
  console.log('');

  try {
    // Step 1: Import master policy documents
    console.log('📄 Importing master policy documents...');
    const policyMap = new Map<string, number>(); // policyId -> dbId

    for (const policy of data.masterPolicyList) {
      const existing = await prisma.policyDocument.findUnique({
        where: { name: policy.standardizedName }
      });

      if (existing) {
        policyMap.set(policy.policyId, existing.id);
        console.log(`  ✓ Policy exists: ${policy.standardizedName}`);
      } else {
        const created = await prisma.policyDocument.create({
          data: {
            name: policy.standardizedName,
            description: policy.description,
          }
        });
        policyMap.set(policy.policyId, created.id);
        console.log(`  ✓ Created: ${policy.standardizedName}`);
      }
    }
    console.log(`✅ Imported ${policyMap.size} policies\n`);

    // Step 2: Import master procedure documents
    console.log('📋 Importing master procedure documents...');
    const procedureMap = new Map<string, number>(); // procedureId -> dbId

    for (const procedure of data.masterProcedureList) {
      const existing = await prisma.procedureDocument.findUnique({
        where: { name: procedure.standardizedName }
      });

      if (existing) {
        procedureMap.set(procedure.procedureId, existing.id);
        console.log(`  ✓ Procedure exists: ${procedure.standardizedName}`);
      } else {
        const created = await prisma.procedureDocument.create({
          data: {
            name: procedure.standardizedName,
            description: procedure.description,
          }
        });
        procedureMap.set(procedure.procedureId, created.id);
        console.log(`  ✓ Created: ${procedure.standardizedName}`);
      }
    }
    console.log(`✅ Imported ${procedureMap.size} procedures\n`);

    // Step 3: Import evidence requirements per control
    console.log('📦 Importing control evidence requirements...');
    let totalRequirements = 0;
    let processedControls = 0;

    for (const control of data.controlEvidenceRequirements) {
      // Check if control exists
      const existingControl = await prisma.control.findUnique({
        where: { controlId: control.controlId }
      });

      if (!existingControl) {
        console.log(`  ⚠️  Skipping ${control.controlId} - control not found in database`);
        continue;
      }

      console.log(`  Processing ${control.controlId}...`);

      // Import policy requirements
      for (const policy of control.evidenceRequirements.policies) {
        const dbPolicyId = policyMap.get(policy.policyId);

        await prisma.evidenceRequirement.create({
          data: {
            controlId: existingControl.id,
            evidenceType: 'policy',
            name: policy.standardizedName,
            description: policy.description,
            rationale: policy.rationale,
            policyId: dbPolicyId,
          }
        });
        totalRequirements++;
      }

      // Import procedure requirements
      for (const procedure of control.evidenceRequirements.procedures) {
        const dbProcedureId = procedureMap.get(procedure.procedureId);

        await prisma.evidenceRequirement.create({
          data: {
            controlId: existingControl.id,
            evidenceType: 'procedure',
            name: procedure.standardizedName,
            description: procedure.description,
            rationale: procedure.rationale,
            procedureId: dbProcedureId,
          }
        });
        totalRequirements++;
      }

      // Import execution evidence requirements
      for (const execution of control.evidenceRequirements.executionEvidence) {
        // Parse freshness threshold (e.g., "30 days" -> 30)
        const thresholdMatch = execution.freshnessThreshold.match(/(\d+)/);
        const thresholdDays = thresholdMatch ? parseInt(thresholdMatch[1]) : null;

        await prisma.evidenceRequirement.create({
          data: {
            controlId: existingControl.id,
            evidenceType: 'execution',
            name: execution.name,
            description: execution.description,
            rationale: execution.rationale,
            frequency: execution.frequency,
            freshnessThreshold: thresholdDays,
          }
        });
        totalRequirements++;
      }

      // Import physical evidence requirements
      for (const physical of control.evidenceRequirements.physicalEvidence) {
        await prisma.evidenceRequirement.create({
          data: {
            controlId: existingControl.id,
            evidenceType: 'physical',
            name: physical.name,
            description: physical.description,
            rationale: physical.rationale,
          }
        });
        totalRequirements++;
      }

      // Update control with operational activities
      if (control.evidenceRequirements.operationalActivities && control.evidenceRequirements.operationalActivities.length > 0) {
        await prisma.control.update({
          where: { id: existingControl.id },
          data: {
            operationalActivities: JSON.stringify(control.evidenceRequirements.operationalActivities)
          }
        });
        console.log(`    ✓ Imported ${control.evidenceRequirements.operationalActivities.length} operational activities`);
      }

      processedControls++;
      console.log(`    ✓ ${control.controlId} complete`);
    }

    console.log(`\n✅ Imported ${totalRequirements} evidence requirements for ${processedControls} controls\n`);

    // Step 4: Create default deployment config
    console.log('⚙️  Creating default deployment configuration...');
    const existingConfig = await prisma.deploymentConfig.findFirst();

    if (!existingConfig) {
      await prisma.deploymentConfig.create({
        data: {
          deploymentModel: 'hybrid',
          description: 'Default hybrid deployment (requires physical evidence)',
          physicalEvidence: true,
        }
      });
      console.log('✅ Created default deployment config\n');
    } else {
      console.log('✅ Deployment config already exists\n');
    }

    // Summary
    console.log('═'.repeat(70));
    console.log('🎉 IMPORT COMPLETE!');
    console.log('═'.repeat(70));
    console.log(`✓ ${policyMap.size} policy documents`);
    console.log(`✓ ${procedureMap.size} procedure documents`);
    console.log(`✓ ${totalRequirements} evidence requirements`);
    console.log(`✓ ${processedControls} controls processed`);
    console.log(`✓ Deployment configuration set`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Run verification: npx ts-node src/scripts/verify-evidence-import.ts');
    console.log('2. If verification passes, proceed to Phase 2');
    console.log('');

  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importEvidenceRequirements();
