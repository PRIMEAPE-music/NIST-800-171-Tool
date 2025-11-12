import { PrismaClient } from '@prisma/client';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const prisma = new PrismaClient();
const copyFile = promisify(fs.copyFile);
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

interface BackupMetadata {
  timestamp: string;
  version: string;
  controlCount: number;
  assessmentCount: number;
  poamCount: number;
  evidenceCount: number;
  databaseSize: number;
}

interface BackupFile {
  filename: string;
  filepath: string;
  size: number;
  createdAt: string;
  metadata?: BackupMetadata;
}

interface IntegrityCheckResult {
  passed: boolean;
  checks: {
    name: string;
    passed: boolean;
    message: string;
    details?: any;
  }[];
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
  };
}

class BackupService {
  private backupDir = path.join(process.cwd(), '../database/backups');
  private exportDir = path.join(process.cwd(), '../database/exports');
  private dbPath = path.join(process.cwd(), '../database/compliance.db');

  constructor() {
    // Ensure directories exist
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  /**
   * Create a full database backup
   */
  async createBackup(): Promise<BackupFile> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `backup_${timestamp}.zip`;
      const backupPath = path.join(this.backupDir, backupFilename);

      // Get metadata before backup
      const metadata = await this.getBackupMetadata();

      // Create ZIP archive
      const output = fs.createWriteStream(backupPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      return new Promise((resolve, reject) => {
        output.on('close', async () => {
          const stats = fs.statSync(backupPath);

          // Update last backup timestamp in settings
          await this.updateLastBackupTimestamp();

          resolve({
            filename: backupFilename,
            filepath: backupPath,
            size: stats.size,
            createdAt: new Date().toISOString(),
            metadata,
          });
        });

        archive.on('error', (err) => {
          reject(err);
        });

        archive.pipe(output);

        // Add database file
        archive.file(this.dbPath, { name: 'compliance.db' });

        // Add metadata file
        const metadataJson = JSON.stringify(metadata, null, 2);
        archive.append(metadataJson, { name: 'metadata.json' });

        // Add uploads directory if it exists
        const uploadsDir = path.join(process.cwd(), '../uploads');
        if (fs.existsSync(uploadsDir)) {
          archive.directory(uploadsDir, 'uploads');
        }

        archive.finalize();
      });
    } catch (error) {
      console.error('Backup creation failed:', error);
      throw new Error('Failed to create backup');
    }
  }

  /**
   * Restore from backup file
   */
  async restoreBackup(backupFilename: string): Promise<void> {
    try {
      const backupPath = path.join(this.backupDir, backupFilename);

      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file not found');
      }

      // Create temporary directory for extraction
      const tempDir = path.join(this.backupDir, 'temp_restore');
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }
      fs.mkdirSync(tempDir, { recursive: true });

      // Extract backup
      await this.extractZip(backupPath, tempDir);

      // Validate extracted database
      const extractedDbPath = path.join(tempDir, 'compliance.db');
      if (!fs.existsSync(extractedDbPath)) {
        throw new Error('Database file not found in backup');
      }

      // Create a backup of current database before restore
      const currentBackupPath = path.join(
        this.backupDir,
        `pre_restore_${new Date().toISOString().replace(/[:.]/g, '-')}.db`
      );
      await copyFile(this.dbPath, currentBackupPath);

      // Close Prisma connection
      await prisma.$disconnect();

      // Replace current database with backup
      await copyFile(extractedDbPath, this.dbPath);

      // Restore uploads if they exist
      const extractedUploadsDir = path.join(tempDir, 'uploads');
      const uploadsDir = path.join(process.cwd(), '../uploads');
      if (fs.existsSync(extractedUploadsDir)) {
        if (fs.existsSync(uploadsDir)) {
          // Backup current uploads
          const uploadsBackupDir = path.join(
            this.backupDir,
            `pre_restore_uploads_${new Date().toISOString().replace(/[:.]/g, '-')}`
          );
          fs.renameSync(uploadsDir, uploadsBackupDir);
        }
        // Copy uploads from backup
        this.copyDirectory(extractedUploadsDir, uploadsDir);
      }

      // Clean up temp directory
      fs.rmSync(tempDir, { recursive: true });

      // Reconnect Prisma
      await prisma.$connect();

      console.log('Database restored successfully');
    } catch (error) {
      console.error('Restore failed:', error);
      throw new Error('Failed to restore backup');
    }
  }

  /**
   * List all available backups
   */
  async listBackups(): Promise<BackupFile[]> {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backupFiles: BackupFile[] = [];

      for (const file of files) {
        if (file.endsWith('.zip')) {
          const filepath = path.join(this.backupDir, file);
          const stats = fs.statSync(filepath);

          backupFiles.push({
            filename: file,
            filepath,
            size: stats.size,
            createdAt: stats.birthtime.toISOString(),
          });
        }
      }

      // Sort by creation date, newest first
      return backupFiles.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Failed to list backups:', error);
      throw new Error('Failed to list backups');
    }
  }

  /**
   * Delete a backup file
   */
  async deleteBackup(backupFilename: string): Promise<void> {
    try {
      const backupPath = path.join(this.backupDir, backupFilename);

      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file not found');
      }

      await unlink(backupPath);
      console.log(`Deleted backup: ${backupFilename}`);
    } catch (error) {
      console.error('Failed to delete backup:', error);
      throw new Error('Failed to delete backup');
    }
  }

  /**
   * Export all data as JSON
   */
  async exportData(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportFilename = `export_${timestamp}.json`;
      const exportPath = path.join(this.exportDir, exportFilename);

      // Fetch all data
      const [
        controls,
        controlStatuses,
        assessments,
        evidence,
        poams,
        poamMilestones,
        m365Policies,
        controlPolicyMappings,
        changeHistory,
        settings,
      ] = await Promise.all([
        prisma.control.findMany(),
        prisma.controlStatus.findMany(),
        prisma.assessment.findMany(),
        prisma.evidence.findMany(),
        prisma.poam.findMany(),
        prisma.poamMilestone.findMany(),
        prisma.m365Policy.findMany(),
        prisma.controlPolicyMapping.findMany(),
        prisma.changeHistory.findMany(),
        prisma.setting.findMany(),
      ]);

      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0',
          application: 'NIST 800-171 Compliance Tracker',
        },
        data: {
          controls,
          controlStatuses,
          assessments,
          evidence,
          poams,
          poamMilestones,
          m365Policies,
          controlPolicyMappings,
          changeHistory,
          settings,
        },
      };

      await writeFile(exportPath, JSON.stringify(exportData, null, 2));

      return exportPath;
    } catch (error) {
      console.error('Data export failed:', error);
      throw new Error('Failed to export data');
    }
  }

  /**
   * Run integrity checks on the database
   */
  async checkIntegrity(): Promise<IntegrityCheckResult> {
    const checks = [];

    try {
      // Check 1: All controls have status records
      const controlCount = await prisma.control.count();
      const statusCount = await prisma.controlStatus.count();
      checks.push({
        name: 'Control Status Integrity',
        passed: controlCount === statusCount,
        message: `${statusCount}/${controlCount} controls have status records`,
        details: { controlCount, statusCount },
      });

      // Check 2: All evidence files exist
      const evidenceRecords = await prisma.evidence.findMany();
      let missingFiles = 0;
      for (const evidence of evidenceRecords) {
        const filePath = path.join(process.cwd(), '../uploads', evidence.filePath);
        if (!fs.existsSync(filePath)) {
          missingFiles++;
        }
      }
      checks.push({
        name: 'Evidence File Integrity',
        passed: missingFiles === 0,
        message: `${evidenceRecords.length - missingFiles}/${evidenceRecords.length} evidence files exist`,
        details: { total: evidenceRecords.length, missing: missingFiles },
      });

      // Check 3: Orphaned assessments
      const assessments = await prisma.assessment.findMany();
      let orphanedAssessments = 0;
      for (const assessment of assessments) {
        const control = await prisma.control.findUnique({
          where: { id: assessment.controlId },
        });
        if (!control) {
          orphanedAssessments++;
        }
      }
      checks.push({
        name: 'Assessment References',
        passed: orphanedAssessments === 0,
        message: `${orphanedAssessments} orphaned assessments found`,
        details: { total: assessments.length, orphaned: orphanedAssessments },
      });

      // Check 4: Orphaned POAMs
      const poams = await prisma.poam.findMany();
      let orphanedPoams = 0;
      for (const poam of poams) {
        const control = await prisma.control.findUnique({
          where: { id: poam.controlId },
        });
        if (!control) {
          orphanedPoams++;
        }
      }
      checks.push({
        name: 'POAM References',
        passed: orphanedPoams === 0,
        message: `${orphanedPoams} orphaned POAMs found`,
        details: { total: poams.length, orphaned: orphanedPoams },
      });

      // Check 5: Database file integrity
      const dbStats = fs.statSync(this.dbPath);
      const dbSizeOk = dbStats.size > 1024; // At least 1KB
      checks.push({
        name: 'Database File',
        passed: dbSizeOk,
        message: `Database size: ${this.formatBytes(dbStats.size)}`,
        details: { size: dbStats.size },
      });

      // Check 6: Required settings exist
      const requiredSettings = [
        'm365_tenant_id',
        'org_name',
        'pref_date_format',
        'system_last_backup',
      ];
      const existingSettings = await prisma.setting.findMany({
        where: { key: { in: requiredSettings } },
      });
      const missingSettings = requiredSettings.filter(
        key => !existingSettings.find(s => s.key === key)
      );
      checks.push({
        name: 'Required Settings',
        passed: missingSettings.length === 0,
        message: `${existingSettings.length}/${requiredSettings.length} required settings exist`,
        details: { missing: missingSettings },
      });

      const passedChecks = checks.filter(c => c.passed).length;
      const failedChecks = checks.filter(c => !c.passed).length;

      return {
        passed: failedChecks === 0,
        checks,
        summary: {
          totalChecks: checks.length,
          passedChecks,
          failedChecks,
        },
      };
    } catch (error) {
      console.error('Integrity check failed:', error);
      throw new Error('Failed to run integrity checks');
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<any> {
    try {
      const [
        controlCount,
        assessmentCount,
        poamCount,
        evidenceCount,
        backups,
        integrityCheck,
      ] = await Promise.all([
        prisma.control.count(),
        prisma.assessment.count(),
        prisma.poam.count(),
        prisma.evidence.count(),
        this.listBackups(),
        this.checkIntegrity(),
      ]);

      const dbStats = fs.statSync(this.dbPath);
      const lastBackup = backups[0];

      return {
        database: {
          size: dbStats.size,
          sizeFormatted: this.formatBytes(dbStats.size),
          path: this.dbPath,
        },
        records: {
          controls: controlCount,
          assessments: assessmentCount,
          poams: poamCount,
          evidence: evidenceCount,
        },
        backups: {
          count: backups.length,
          lastBackup: lastBackup ? {
            filename: lastBackup.filename,
            createdAt: lastBackup.createdAt,
            size: this.formatBytes(lastBackup.size),
          } : null,
        },
        integrity: integrityCheck,
      };
    } catch (error) {
      console.error('Failed to get system health:', error);
      throw new Error('Failed to get system health');
    }
  }

  /**
   * Clear all assessment history (with safety checks)
   */
  async clearAssessmentHistory(): Promise<number> {
    try {
      const result = await prisma.assessment.deleteMany({});
      return result.count;
    } catch (error) {
      console.error('Failed to clear assessment history:', error);
      throw new Error('Failed to clear assessment history');
    }
  }

  /**
   * Clear all change history
   */
  async clearChangeHistory(): Promise<number> {
    try {
      const result = await prisma.changeHistory.deleteMany({});
      return result.count;
    } catch (error) {
      console.error('Failed to clear change history:', error);
      throw new Error('Failed to clear change history');
    }
  }

  // Helper methods

  private async getBackupMetadata(): Promise<BackupMetadata> {
    const [
      controlCount,
      assessmentCount,
      poamCount,
      evidenceCount,
    ] = await Promise.all([
      prisma.control.count(),
      prisma.assessment.count(),
      prisma.poam.count(),
      prisma.evidence.count(),
    ]);

    const dbStats = fs.statSync(this.dbPath);

    return {
      timestamp: new Date().toISOString(),
      version: '1.0',
      controlCount,
      assessmentCount,
      poamCount,
      evidenceCount,
      databaseSize: dbStats.size,
    };
  }

  private async updateLastBackupTimestamp(): Promise<void> {
    await prisma.setting.upsert({
      where: { key: 'system_last_backup' },
      update: { value: new Date().toISOString() },
      create: {
        key: 'system_last_backup',
        value: new Date().toISOString(),
        category: 'system',
      },
    });
  }

  private extractZip(zipPath: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const AdmZip = require('adm-zip');
      try {
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(destPath, true);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  private copyDirectory(src: string, dest: string): void {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export const backupService = new BackupService();
