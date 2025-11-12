# Phase 8.3: Data Management & Backup

## Overview
Implement comprehensive data management capabilities including database backup/restore, data export/import, data validation, and system health checks. This phase ensures data integrity and provides disaster recovery capabilities.

## Objectives
- Create database backup system with ZIP compression
- Implement restore from backup functionality
- Add data export (full database and selective)
- Implement data validation and integrity checks
- Create system health check dashboard
- Add audit logging for data operations
- Implement automated backup scheduling (optional)

## Prerequisites
- Phase 8.1 (Settings Foundation) must be complete
- Settings database table and API must be functional
- File system permissions for backup directory

---

## Step 1: Install Required Dependencies

### 1.1 Install Backend Dependencies

```bash
cd server
npm install archiver@^6.0.1
npm install @types/archiver --save-dev
# Optional for scheduled backups:
npm install node-cron@^3.0.3
npm install @types/node-cron --save-dev
```

### 1.2 Create Backup Directory

```bash
# From project root
mkdir -p database/backups
mkdir -p database/exports
```

---

## Step 2: Create Backup Service

### 2.1 Create Backup Service

📁 `server/src/services/backup.service.ts`

🔄 COMPLETE FILE:

```typescript
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
```

### 2.2 Install adm-zip for Extraction

```bash
cd server
npm install adm-zip@^0.5.10
npm install @types/adm-zip --save-dev
```

---

## Step 3: Create Backup Controller

### 3.1 Create Backup Controller

📁 `server/src/controllers/backup.controller.ts`

🔄 COMPLETE FILE:

```typescript
import { Request, Response } from 'express';
import { backupService } from '../services/backup.service';

/**
 * POST /api/backup/create
 * Create a new database backup
 */
export const createBackup = async (req: Request, res: Response) => {
  try {
    const backup = await backupService.createBackup();

    res.json({
      success: true,
      message: 'Backup created successfully',
      backup: {
        filename: backup.filename,
        size: backup.size,
        createdAt: backup.createdAt,
        metadata: backup.metadata,
      },
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create backup',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * GET /api/backup/list
 * List all available backups
 */
export const listBackups = async (req: Request, res: Response) => {
  try {
    const backups = await backupService.listBackups();

    res.json({
      success: true,
      backups,
    });
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list backups',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * POST /api/backup/restore
 * Restore from a backup file
 */
export const restoreBackup = async (req: Request, res: Response) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Backup filename is required',
      });
    }

    await backupService.restoreBackup(filename);

    res.json({
      success: true,
      message: 'Database restored successfully',
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore backup',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * DELETE /api/backup/:filename
 * Delete a backup file
 */
export const deleteBackup = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;

    await backupService.deleteBackup(filename);

    res.json({
      success: true,
      message: 'Backup deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete backup',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * POST /api/backup/export
 * Export all data as JSON
 */
export const exportData = async (req: Request, res: Response) => {
  try {
    const exportPath = await backupService.exportData();

    res.download(exportPath, (err) => {
      if (err) {
        console.error('Error downloading export:', err);
      }
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * GET /api/backup/integrity
 * Run integrity checks
 */
export const checkIntegrity = async (req: Request, res: Response) => {
  try {
    const result = await backupService.checkIntegrity();

    res.json({
      success: true,
      integrity: result,
    });
  } catch (error) {
    console.error('Error checking integrity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check integrity',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * GET /api/backup/health
 * Get system health status
 */
export const getSystemHealth = async (req: Request, res: Response) => {
  try {
    const health = await backupService.getSystemHealth();

    res.json({
      success: true,
      health,
    });
  } catch (error) {
    console.error('Error getting system health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system health',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * POST /api/backup/clear-assessments
 * Clear all assessment history
 */
export const clearAssessmentHistory = async (req: Request, res: Response) => {
  try {
    const count = await backupService.clearAssessmentHistory();

    res.json({
      success: true,
      message: `Cleared ${count} assessment records`,
      deletedCount: count,
    });
  } catch (error) {
    console.error('Error clearing assessment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear assessment history',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * POST /api/backup/clear-history
 * Clear all change history
 */
export const clearChangeHistory = async (req: Request, res: Response) => {
  try {
    const count = await backupService.clearChangeHistory();

    res.json({
      success: true,
      message: `Cleared ${count} change history records`,
      deletedCount: count,
    });
  } catch (error) {
    console.error('Error clearing change history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear change history',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
```

---

## Step 4: Create Backup Routes

### 4.1 Create Backup Routes

📁 `server/src/routes/backup.routes.ts`

🔄 COMPLETE FILE:

```typescript
import { Router } from 'express';
import {
  createBackup,
  listBackups,
  restoreBackup,
  deleteBackup,
  exportData,
  checkIntegrity,
  getSystemHealth,
  clearAssessmentHistory,
  clearChangeHistory,
} from '../controllers/backup.controller';

const router = Router();

// Backup operations
router.post('/create', createBackup);
router.get('/list', listBackups);
router.post('/restore', restoreBackup);
router.delete('/:filename', deleteBackup);

// Data operations
router.post('/export', exportData);
router.get('/integrity', checkIntegrity);
router.get('/health', getSystemHealth);

// Cleanup operations (require confirmation)
router.post('/clear-assessments', clearAssessmentHistory);
router.post('/clear-history', clearChangeHistory);

export default router;
```

### 4.2 Register Backup Routes in Main App

📁 `server/src/index.ts`

🔍 FIND:
```typescript
import settingsRoutes from './routes/settings.routes';
```

✏️ ADD AFTER:
```typescript
import backupRoutes from './routes/backup.routes';
```

🔍 FIND:
```typescript
app.use('/api/settings', settingsRoutes);
```

✏️ ADD AFTER:
```typescript
app.use('/api/backup', backupRoutes);
```

---

## Step 5: Create Frontend Backup Service

### 5.1 Create Backup Service

📁 `client/src/services/backup.service.ts`

🔄 COMPLETE FILE:

```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
  metadata?: {
    timestamp: string;
    version: string;
    controlCount: number;
    assessmentCount: number;
    poamCount: number;
    evidenceCount: number;
    databaseSize: number;
  };
}

interface IntegrityCheck {
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

interface SystemHealth {
  database: {
    size: number;
    sizeFormatted: string;
    path: string;
  };
  records: {
    controls: number;
    assessments: number;
    poams: number;
    evidence: number;
  };
  backups: {
    count: number;
    lastBackup: {
      filename: string;
      createdAt: string;
      size: string;
    } | null;
  };
  integrity: IntegrityCheck;
}

class BackupService {
  /**
   * Create a new backup
   */
  async createBackup(): Promise<BackupFile> {
    const response = await axios.post(`${API_URL}/backup/create`);
    return response.data.backup;
  }

  /**
   * List all backups
   */
  async listBackups(): Promise<BackupFile[]> {
    const response = await axios.get(`${API_URL}/backup/list`);
    return response.data.backups;
  }

  /**
   * Restore from backup
   */
  async restoreBackup(filename: string): Promise<void> {
    await axios.post(`${API_URL}/backup/restore`, { filename });
  }

  /**
   * Delete a backup
   */
  async deleteBackup(filename: string): Promise<void> {
    await axios.delete(`${API_URL}/backup/${filename}`);
  }

  /**
   * Export all data as JSON
   */
  async exportData(): Promise<void> {
    const response = await axios.post(`${API_URL}/backup/export`, null, {
      responseType: 'blob',
    });

    // Trigger download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `export_${new Date().toISOString()}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Run integrity checks
   */
  async checkIntegrity(): Promise<IntegrityCheck> {
    const response = await axios.get(`${API_URL}/backup/integrity`);
    return response.data.integrity;
  }

  /**
   * Get system health
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const response = await axios.get(`${API_URL}/backup/health`);
    return response.data.health;
  }

  /**
   * Clear assessment history
   */
  async clearAssessmentHistory(): Promise<number> {
    const response = await axios.post(`${API_URL}/backup/clear-assessments`);
    return response.data.deletedCount;
  }

  /**
   * Clear change history
   */
  async clearChangeHistory(): Promise<number> {
    const response = await axios.post(`${API_URL}/backup/clear-history`);
    return response.data.deletedCount;
  }
}

export const backupService = new BackupService();
```

---

## Step 6: Create Data Management Component

### 6.1 Create DataManagement Component

📁 `client/src/components/settings/DataManagement.tsx`

🔄 COMPLETE FILE (Part 1 - Component structure):

```typescript
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Button,
  Typography,
  Alert,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  HealthAndSafety as HealthIcon,
  CleaningServices as CleanIcon,
} from '@mui/icons-material';
import { backupService } from '../../services/backup.service';

interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
  metadata?: any;
}

interface SystemHealth {
  database: {
    size: number;
    sizeFormatted: string;
    path: string;
  };
  records: {
    controls: number;
    assessments: number;
    poams: number;
    evidence: number;
  };
  backups: {
    count: number;
    lastBackup: {
      filename: string;
      createdAt: string;
      size: string;
    } | null;
  };
  integrity: {
    passed: boolean;
    checks: Array<{
      name: string;
      passed: boolean;
      message: string;
      details?: any;
    }>;
    summary: {
      totalChecks: number;
      passedChecks: number;
      failedChecks: number;
    };
  };
}

export const DataManagement: React.FC = () => {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  
  // Dialog states
  const [restoreDialog, setRestoreDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [clearAssessmentsDialog, setClearAssessmentsDialog] = useState(false);
  const [clearHistoryDialog, setClearHistoryDialog] = useState(false);
  const [integrityDialog, setIntegrityDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [backupList, health] = await Promise.all([
        backupService.listBackups(),
        backupService.getSystemHealth(),
      ]);
      setBackups(backupList);
      setSystemHealth(health);
    } catch (error) {
      console.error('Failed to load data:', error);
      showMessage('error', 'Failed to load data management information');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setStatus(type);
    setMessage(text);
    setTimeout(() => setStatus('idle'), 5000);
  };

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      await backupService.createBackup();
      showMessage('success', 'Backup created successfully');
      await loadData();
    } catch (error) {
      showMessage('error', 'Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;

    try {
      setLoading(true);
      setRestoreDialog(false);
      await backupService.restoreBackup(selectedBackup);
      showMessage('success', 'Database restored successfully. Page will reload...');
      
      // Reload page after 2 seconds
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      showMessage('error', 'Failed to restore backup');
      setLoading(false);
    }
  };

  const handleDeleteBackup = async () => {
    if (!selectedBackup) return;

    try {
      setLoading(true);
      setDeleteDialog(false);
      await backupService.deleteBackup(selectedBackup);
      showMessage('success', 'Backup deleted successfully');
      await loadData();
    } catch (error) {
      showMessage('error', 'Failed to delete backup');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      await backupService.exportData();
      showMessage('success', 'Data exported successfully');
    } catch (error) {
      showMessage('error', 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIntegrity = async () => {
    try {
      setLoading(true);
      await backupService.checkIntegrity();
      await loadData();
      setIntegrityDialog(true);
    } catch (error) {
      showMessage('error', 'Failed to check integrity');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAssessments = async () => {
    try {
      setLoading(true);
      setClearAssessmentsDialog(false);
      const count = await backupService.clearAssessmentHistory();
      showMessage('success', `Cleared ${count} assessment records`);
      await loadData();
    } catch (error) {
      showMessage('error', 'Failed to clear assessment history');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      setLoading(true);
      setClearHistoryDialog(false);
      const count = await backupService.clearChangeHistory();
      showMessage('success', `Cleared ${count} change history records`);
      await loadData();
    } catch (error) {
      showMessage('error', 'Failed to clear change history');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Box>
      {/* Status Messages */}
      {status !== 'idle' && (
        <Alert severity={status === 'error' ? 'error' : 'success'} sx={{ mb: 3 }}>
          {message}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* System Health Section */}
      {systemHealth && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#2C2C2C' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">System Health</Typography>
            <Button
              startIcon={<RefreshIcon />}
              onClick={loadData}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            {/* Database Info */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Database
              </Typography>
              <Typography variant="body2">
                Size: {systemHealth.database.sizeFormatted}
              </Typography>
              <Typography variant="body2" color="text.secondary" fontSize="0.75rem">
                {systemHealth.database.path}
              </Typography>
            </Grid>

            {/* Record Counts */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Records
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="body2">Controls: {systemHealth.records.controls}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Assessments: {systemHealth.records.assessments}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">POAMs: {systemHealth.records.poams}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Evidence: {systemHealth.records.evidence}</Typography>
                </Grid>
              </Grid>
            </Grid>

            {/* Last Backup */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Backups
              </Typography>
              {systemHealth.backups.lastBackup ? (
                <>
                  <Typography variant="body2">
                    Last Backup: {formatDate(systemHealth.backups.lastBackup.createdAt)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Size: {systemHealth.backups.lastBackup.size}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No backups available
                </Typography>
              )}
            </Grid>

            {/* Integrity Status */}
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Integrity
                  </Typography>
                  <Chip
                    icon={systemHealth.integrity.passed ? <CheckCircleIcon /> : <ErrorIcon />}
                    label={systemHealth.integrity.passed ? 'All Checks Passed' : 'Issues Found'}
                    color={systemHealth.integrity.passed ? 'success' : 'error'}
                    size="small"
                  />
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                    {systemHealth.integrity.summary.passedChecks}/{systemHealth.integrity.summary.totalChecks} checks passed
                  </Typography>
                </Box>
                <Button
                  size="small"
                  onClick={handleCheckIntegrity}
                  startIcon={<AssessmentIcon />}
                  disabled={loading}
                >
                  Run Checks
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Backup Operations */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#2C2C2C' }}>
        <Typography variant="h6" gutterBottom>
          Backup & Restore
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<BackupIcon />}
            onClick={handleCreateBackup}
            disabled={loading}
            sx={{ mr: 2, mb: 1 }}
          >
            Create Backup
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportData}
            disabled={loading}
            sx={{ mb: 1 }}
          >
            Export Data (JSON)
          </Button>
        </Box>

        {/* Backups Table */}
        {backups.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Filename</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.filename}>
                    <TableCell>{backup.filename}</TableCell>
                    <TableCell>{formatDate(backup.createdAt)}</TableCell>
                    <TableCell>{formatBytes(backup.size)}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedBackup(backup.filename);
                          setRestoreDialog(true);
                        }}
                        disabled={loading}
                        title="Restore"
                      >
                        <RestoreIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedBackup(backup.filename);
                          setDeleteDialog(true);
                        }}
                        disabled={loading}
                        title="Delete"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info">
            No backups available. Create your first backup to enable restore functionality.
          </Alert>
        )}
      </Paper>

      {/* Data Cleanup */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#2C2C2C' }}>
        <Typography variant="h6" gutterBottom>
          Data Cleanup
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Alert severity="warning" sx={{ mb: 2 }}>
          These operations cannot be undone. Create a backup before proceeding.
        </Alert>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<CleanIcon />}
              onClick={() => setClearAssessmentsDialog(true)}
              disabled={loading}
              fullWidth
            >
              Clear Assessment History
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<CleanIcon />}
              onClick={() => setClearHistoryDialog(true)}
              disabled={loading}
              fullWidth
            >
              Clear Change History
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialog} onClose={() => setRestoreDialog(false)}>
        <DialogTitle>Restore Database?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will replace your current database with the backup. The application will reload after restore.
            <br /><br />
            <strong>Backup to restore: {selectedBackup}</strong>
            <br /><br />
            A backup of your current database will be created before restoring.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialog(false)}>Cancel</Button>
          <Button onClick={handleRestoreBackup} color="primary" variant="contained">
            Restore
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Backup?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this backup? This action cannot be undone.
            <br /><br />
            <strong>Backup: {selectedBackup}</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteBackup} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear Assessments Dialog */}
      <Dialog open={clearAssessmentsDialog} onClose={() => setClearAssessmentsDialog(false)}>
        <DialogTitle>Clear Assessment History?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete all assessment records. Control status and other data will not be affected.
            <br /><br />
            <strong>This action cannot be undone.</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearAssessmentsDialog(false)}>Cancel</Button>
          <Button onClick={handleClearAssessments} color="error" variant="contained">
            Clear Assessments
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear History Dialog */}
      <Dialog open={clearHistoryDialog} onClose={() => setClearHistoryDialog(false)}>
        <DialogTitle>Clear Change History?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete all change history records. Current data will not be affected.
            <br /><br />
            <strong>This action cannot be undone.</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearHistoryDialog(false)}>Cancel</Button>
          <Button onClick={handleClearHistory} color="error" variant="contained">
            Clear History
          </Button>
        </DialogActions>
      </Dialog>

      {/* Integrity Check Dialog */}
      {systemHealth && (
        <Dialog 
          open={integrityDialog} 
          onClose={() => setIntegrityDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HealthIcon />
              Integrity Check Results
            </Box>
          </DialogTitle>
          <DialogContent>
            <List>
              {systemHealth.integrity.checks.map((check, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    {check.passed ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={check.name}
                    secondary={check.message}
                  />
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Summary: {systemHealth.integrity.summary.passedChecks} of {systemHealth.integrity.summary.totalChecks} checks passed
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIntegrityDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};
```

---

## Step 7: Integrate Data Management into Settings Page

### 7.1 Update Settings Page

📁 `client/src/pages/Settings.tsx`

🔍 FIND:
```typescript
const tabs = [
  { label: 'Microsoft 365', value: 'm365' },
  { label: 'Organization', value: 'organization' },
  { label: 'User Preferences', value: 'preferences' },
];
```

✏️ REPLACE WITH:
```typescript
const tabs = [
  { label: 'Microsoft 365', value: 'm365' },
  { label: 'Organization', value: 'organization' },
  { label: 'User Preferences', value: 'preferences' },
  { label: 'Data Management', value: 'data' },
];
```

🔍 FIND (tab panel rendering):
```typescript
{/* User Preferences Tab */}
{currentTab === 'preferences' && (
  <UserPreferences
    onSave={handleSaveUserPreferences}
    onReset={handleResetUserPreferences}
    initialPreferences={userPreferences}
  />
)}
```

✏️ ADD AFTER:
```typescript
{/* Data Management Tab */}
{currentTab === 'data' && <DataManagement />}
```

🔍 FIND (imports):
```typescript
import { UserPreferences } from '../components/settings/UserPreferences';
```

✏️ ADD AFTER:
```typescript
import { DataManagement } from '../components/settings/DataManagement';
```

---

## Step 8: Testing & Verification

### 8.1 Manual Testing Checklist

**Backup Operations:**
- [ ] Create backup successfully
- [ ] Backup file appears in list
- [ ] Backup contains database and metadata
- [ ] Multiple backups can be created
- [ ] Backups are sorted newest first

**Restore Operations:**
- [ ] Restore dialog shows warning
- [ ] Pre-restore backup is created
- [ ] Database restores correctly
- [ ] Application reloads after restore
- [ ] All data present after restore

**Export Operations:**
- [ ] Export generates JSON file
- [ ] JSON contains all data
- [ ] File downloads correctly
- [ ] JSON is valid and parseable

**Integrity Checks:**
- [ ] All checks run successfully
- [ ] Failed checks show details
- [ ] Summary accurate
- [ ] Dialog displays results clearly

**System Health:**
- [ ] Database size shown correctly
- [ ] Record counts accurate
- [ ] Last backup info displayed
- [ ] Integrity status correct
- [ ] Refresh updates all values

**Cleanup Operations:**
- [ ] Clear assessments requires confirmation
- [ ] Assessment clear works correctly
- [ ] Clear history requires confirmation
- [ ] History clear works correctly
- [ ] Counts shown in success message

**Error Handling:**
- [ ] Invalid backup file shows error
- [ ] Missing backup shows error
- [ ] Failed restore shows error
- [ ] Network errors handled
- [ ] User-friendly error messages

### 8.2 Backend API Testing

Test using cURL or REST client:

```bash
# Create backup
curl -X POST http://localhost:3001/api/backup/create

# List backups
curl http://localhost:3001/api/backup/list

# Get system health
curl http://localhost:3001/api/backup/health

# Check integrity
curl http://localhost:3001/api/backup/integrity

# Restore backup
curl -X POST http://localhost:3001/api/backup/restore \
  -H "Content-Type: application/json" \
  -d '{"filename":"backup_2025-11-11T12-00-00.zip"}'

# Delete backup
curl -X DELETE http://localhost:3001/api/backup/backup_2025-11-11T12-00-00.zip

# Export data
curl -X POST http://localhost:3001/api/backup/export --output export.json

# Clear assessments
curl -X POST http://localhost:3001/api/backup/clear-assessments

# Clear history
curl -X POST http://localhost:3001/api/backup/clear-history
```

---

## Step 9: Optional - Automated Backup Scheduling

### 9.1 Add Scheduled Backup Service (Optional)

📁 `server/src/services/scheduledBackup.service.ts`

🔄 COMPLETE FILE:

```typescript
import cron from 'node-cron';
import { backupService } from './backup.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class ScheduledBackupService {
  private task: cron.ScheduledTask | null = null;

  /**
   * Start automated backups
   */
  async start(): Promise<void> {
    try {
      // Check if auto-backup is enabled
      const setting = await prisma.setting.findUnique({
        where: { key: 'system_auto_backup_enabled' },
      });

      if (setting?.value !== 'true') {
        console.log('Automated backups are disabled');
        return;
      }

      // Schedule daily backup at 2 AM
      this.task = cron.schedule('0 2 * * *', async () => {
        console.log('Running scheduled backup...');
        try {
          await backupService.createBackup();
          console.log('Scheduled backup completed successfully');
        } catch (error) {
          console.error('Scheduled backup failed:', error);
        }
      });

      console.log('Automated backups started (daily at 2 AM)');
    } catch (error) {
      console.error('Failed to start automated backups:', error);
    }
  }

  /**
   * Stop automated backups
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('Automated backups stopped');
    }
  }
}

export const scheduledBackupService = new ScheduledBackupService();
```

### 9.2 Start Scheduled Backups in Server

📁 `server/src/index.ts`

🔍 FIND:
```typescript
const PORT = process.env.PORT || 3001;
```

✏️ ADD BEFORE:
```typescript
import { scheduledBackupService } from './services/scheduledBackup.service';
```

🔍 FIND:
```typescript
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

✏️ REPLACE WITH:
```typescript
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start automated backups if enabled
  await scheduledBackupService.start();
});
```

---

## Common Issues & Solutions

### Issue 1: Backup file too large
**Solution**: Implement compression level adjustment or exclude certain data types (like change history) from backups.

### Issue 2: Restore fails with "database is locked"
**Solution**: Ensure Prisma disconnects properly before file replacement. Add retry logic.

### Issue 3: Backup directory not writable
**Solution**: Check file permissions on `/database/backups` directory. Run `chmod 755` if needed.

### Issue 4: ZIP extraction fails
**Solution**: Verify archiver and adm-zip packages are installed correctly. Check for corrupted backup files.

### Issue 5: Integrity checks take too long
**Solution**: Add pagination or caching for large datasets. Consider running checks in background worker.

---

## Success Criteria

- [ ] Backup creation works without errors
- [ ] Backups list all available files
- [ ] Restore successfully replaces database
- [ ] Pre-restore backup created automatically
- [ ] Data export generates valid JSON
- [ ] Integrity checks identify issues
- [ ] System health displays accurate info
- [ ] Clear operations require confirmation
- [ ] All error cases handled gracefully
- [ ] Loading states show during operations
- [ ] Success/error messages clear
- [ ] Data Management tab integrated in Settings
- [ ] All API endpoints tested
- [ ] Backup files compressed efficiently
- [ ] Optional: Automated backups working

---

## Next Steps

After completing Phase 8.3, proceed to:
**Phase 8.4: UX Polish - Loading & Error States** - Implement skeleton loaders, error boundaries, empty states, and retry mechanisms throughout the application.
