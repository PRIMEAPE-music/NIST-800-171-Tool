import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

const prisma = new PrismaClient();

interface BackupResult {
  success: boolean;
  timestamp: string;
  backupPath: string;
  tables: Record<string, number>;
  errors?: string[];
}

async function createMigrationBackup(): Promise<BackupResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), '..', 'database', 'backups', `rev3-migration-${timestamp}`);

  console.log('🔄 Starting migration backup...');
  console.log(`📁 Backup location: ${backupDir}\n`);

  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const result: BackupResult = {
    success: true,
    timestamp,
    backupPath: backupDir,
    tables: {},
    errors: [],
  };

  try {
    // Backup 1: Copy the entire database file
    console.log('📦 Creating database file copy...');
    const dbPath = path.join(process.cwd(), '..', 'database', 'compliance.db');
    const dbBackupPath = path.join(backupDir, 'compliance-backup.db');

    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, dbBackupPath);
      const stats = fs.statSync(dbBackupPath);
      console.log(`✅ Database copied (${(stats.size / 1024 / 1024).toFixed(2)} MB)\n`);
    } else {
      throw new Error('Database file not found at: ' + dbPath);
    }

    // Backup 2: Export all controls to CSV
    console.log('📊 Exporting controls to CSV...');
    const controls = await prisma.control.findMany({
      orderBy: { controlId: 'asc' },
    });

    if (controls.length > 0) {
      const controlsCsvWriter = createObjectCsvWriter({
        path: path.join(backupDir, 'controls.csv'),
        header: [
          { id: 'id', title: 'ID' },
          { id: 'controlId', title: 'Control ID' },
          { id: 'family', title: 'Family' },
          { id: 'title', title: 'Title' },
          { id: 'requirementText', title: 'Requirement' },
          { id: 'discussionText', title: 'Discussion' },
          { id: 'priority', title: 'Priority' },
        ],
      });
      await controlsCsvWriter.writeRecords(controls);
      result.tables.controls = controls.length;
      console.log(`✅ Exported ${controls.length} controls\n`);
    }

    // Backup 3: Export control status
    console.log('📊 Exporting control status...');
    const controlStatuses = await prisma.controlStatus.findMany({
      include: { control: true },
    });

    if (controlStatuses.length > 0) {
      const statusCsvWriter = createObjectCsvWriter({
        path: path.join(backupDir, 'control_status.csv'),
        header: [
          { id: 'id', title: 'ID' },
          { id: 'controlId', title: 'Control ID (FK)' },
          { id: 'status', title: 'Status' },
          { id: 'implementationDate', title: 'Implementation Date' },
          { id: 'lastReviewedDate', title: 'Last Reviewed' },
          { id: 'assignedTo', title: 'Assigned To' },
          { id: 'implementationNotes', title: 'Notes' },
        ],
      });

      const statusRecords = controlStatuses.map(s => ({
        id: s.id,
        controlId: s.controlId,
        status: s.status,
        implementationDate: s.implementationDate?.toISOString() || '',
        lastReviewedDate: s.lastReviewedDate?.toISOString() || '',
        assignedTo: s.assignedTo || '',
        implementationNotes: s.implementationNotes || '',
      }));

      await statusCsvWriter.writeRecords(statusRecords);
      result.tables.controlStatus = statusRecords.length;
      console.log(`✅ Exported ${statusRecords.length} control statuses\n`);
    }

    // Backup 4: Export assessments
    console.log('📊 Exporting assessments...');
    const assessments = await prisma.assessment.findMany({
      include: { control: true },
    });

    if (assessments.length > 0) {
      const assessmentCsvWriter = createObjectCsvWriter({
        path: path.join(backupDir, 'assessments.csv'),
        header: [
          { id: 'id', title: 'ID' },
          { id: 'controlId', title: 'Control ID (FK)' },
          { id: 'assessmentDate', title: 'Assessment Date' },
          { id: 'isImplemented', title: 'Is Implemented' },
          { id: 'hasEvidence', title: 'Has Evidence' },
          { id: 'riskScore', title: 'Risk Score' },
          { id: 'assessorNotes', title: 'Notes' },
        ],
      });

      const assessmentRecords = assessments.map(a => ({
        id: a.id,
        controlId: a.controlId,
        assessmentDate: a.assessmentDate?.toISOString() || '',
        isImplemented: a.isImplemented,
        hasEvidence: a.hasEvidence,
        riskScore: a.riskScore || 0,
        assessorNotes: a.assessorNotes || '',
      }));

      await assessmentCsvWriter.writeRecords(assessmentRecords);
      result.tables.assessments = assessmentRecords.length;
      console.log(`✅ Exported ${assessmentRecords.length} assessments\n`);
    }

    // Backup 5: Export evidence
    console.log('📊 Exporting evidence...');
    const evidence = await prisma.evidence.findMany({
      include: { control: true },
    });

    if (evidence.length > 0) {
      const evidenceCsvWriter = createObjectCsvWriter({
        path: path.join(backupDir, 'evidence.csv'),
        header: [
          { id: 'id', title: 'ID' },
          { id: 'controlId', title: 'Control ID (FK)' },
          { id: 'fileName', title: 'File Name' },
          { id: 'filePath', title: 'File Path' },
          { id: 'fileType', title: 'File Type' },
          { id: 'description', title: 'Description' },
        ],
      });

      await evidenceCsvWriter.writeRecords(evidence);
      result.tables.evidence = evidence.length;
      console.log(`✅ Exported ${evidence.length} evidence files\n`);
    }

    // Backup 6: Export POAMs
    console.log('📊 Exporting POAMs...');
    const poams = await prisma.poam.findMany({
      include: {
        control: true,
        milestones: true,
      },
    });

    if (poams.length > 0) {
      const poamCsvWriter = createObjectCsvWriter({
        path: path.join(backupDir, 'poams.csv'),
        header: [
          { id: 'id', title: 'ID' },
          { id: 'controlId', title: 'Control ID (FK)' },
          { id: 'gapDescription', title: 'Gap Description' },
          { id: 'remediationPlan', title: 'Remediation Plan' },
          { id: 'status', title: 'Status' },
          { id: 'priority', title: 'Priority' },
          { id: 'assignedTo', title: 'Assigned To' },
          { id: 'targetCompletionDate', title: 'Target Completion Date' },
        ],
      });

      const poamRecords = poams.map(p => ({
        id: p.id,
        controlId: p.controlId,
        gapDescription: p.gapDescription || '',
        remediationPlan: p.remediationPlan || '',
        status: p.status,
        priority: p.priority || '',
        assignedTo: p.assignedTo || '',
        targetCompletionDate: p.targetCompletionDate?.toISOString() || '',
      }));

      await poamCsvWriter.writeRecords(poamRecords);
      result.tables.poams = poamRecords.length;
      console.log(`✅ Exported ${poamRecords.length} POAMs\n`);
    }

    // Backup 7: Export M365 policy mappings
    console.log('📊 Exporting M365 policy mappings...');
    const mappings = await prisma.controlPolicyMapping.findMany({
      include: {
        control: true,
        policy: true,
      },
    });

    if (mappings.length > 0) {
      const mappingCsvWriter = createObjectCsvWriter({
        path: path.join(backupDir, 'control_policy_mappings.csv'),
        header: [
          { id: 'id', title: 'ID' },
          { id: 'controlId', title: 'Control ID (FK)' },
          { id: 'policyId', title: 'Policy ID (FK)' },
          { id: 'mappingConfidence', title: 'Confidence' },
          { id: 'notes', title: 'Notes' },
        ],
      });

      await mappingCsvWriter.writeRecords(mappings);
      result.tables.mappings = mappings.length;
      console.log(`✅ Exported ${mappings.length} policy mappings\n`);
    }

    // Create backup metadata
    const metadata = {
      timestamp,
      databaseVersion: 'Rev 2 (pre-migration)',
      targetVersion: 'Rev 3',
      tables: result.tables,
      notes: 'Backup created before NIST 800-171 Rev 3 migration',
    };

    fs.writeFileSync(
      path.join(backupDir, 'backup-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log('═══════════════════════════════════════');
    console.log('✅ BACKUP COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════');
    console.log(`📁 Backup location: ${backupDir}`);
    console.log(`📊 Total tables backed up: ${Object.keys(result.tables).length}`);
    console.log('\nTable Summary:');
    Object.entries(result.tables).forEach(([table, count]) => {
      console.log(`  • ${table}: ${count} records`);
    });
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    result.success = false;
    result.errors = [(error as Error).message];
    console.error('❌ Backup failed:', error);
  } finally {
    await prisma.$disconnect();
  }

  return result;
}

// Run backup
createMigrationBackup()
  .then((result) => {
    if (result.success) {
      console.log('✅ You can now proceed with migration.');
      process.exit(0);
    } else {
      console.error('❌ Backup failed. Do not proceed with migration.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Fatal error during backup:', error);
    process.exit(1);
  });
