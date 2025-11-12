# Phase 8.4.3: Backend APIs - Data Management Implementation

## Overview
This document covers all backend implementation for backup/restore, data export/import, and database management operations.

## Part 1: Settings Service Extensions

### File: server/src/services/settings.service.ts

Add these methods to the existing `SettingsService` class:

```typescript
/**
 * Get list of available backups
 */
async listBackups(): Promise<BackupFile[]> {
  const backupDir = path.join(__dirname, '../../backups');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    return [];
  }

  const files = fs.readdirSync(backupDir);
  const backupFiles: BackupFile[] = [];

  for (const file of files) {
    if (file.endsWith('.db')) {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      backupFiles.push({
        filename: file,
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
      });
    }
  }

  // Sort by date, newest first
  return backupFiles.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
```

## Part 2: Backup Service

### File: server/src/services/backup.service.ts

```typescript
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';

interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
}

interface BackupResult {
  success: boolean;
  filename: string;
  size: number;
  message: string;
}

class BackupService {
  private readonly backupDir = path.join(__dirname, '../../backups');
  private readonly dbPath = path.join(__dirname, '../../database/compliance.db');
  private readonly maxBackups = 10; // Keep only the 10 most recent backups

  constructor() {
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create a new database backup
   */
  async createBackup(): Promise<BackupResult> {
    try {
      // Generate backup filename with timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .slice(0, -5);
      const backupFilename = `backup_${timestamp}.db`;
      const backupPath = path.join(this.backupDir, backupFilename);

      // Ensure database file exists
      if (!fs.existsSync(this.dbPath)) {
        throw new Error('Database file not found');
      }

      // Copy database file
      fs.copyFileSync(this.dbPath, backupPath);

      // Get file size
      const stats = fs.statSync(backupPath);

      // Update last backup setting
      await prisma.setting.upsert({
        where: { key: 'system_last_backup' },
        update: { value: new Date().toISOString() },
        create: {
          key: 'system_last_backup',
          value: new Date().toISOString(),
          category: 'system',
        },
      });

      // Clean up old backups
      await this.cleanupOldBackups();

      return {
        success: true,
        filename: backupFilename,
        size: stats.size,
        message: 'Backup created successfully',
      };
    } catch (error) {
      console.error('Backup creation failed:', error);
      throw new Error('Failed to create backup');
    }
  }

  /**
   * Restore database from backup file
   */
  async restoreBackup(sourceFile: string): Promise<void> {
    try {
      // Validate backup file exists
      if (!fs.existsSync(sourceFile)) {
        throw new Error('Backup file not found');
      }

      // Validate it's a SQLite database
      const isValid = await this.validateBackupFile(sourceFile);
      if (!isValid) {
        throw new Error('Invalid backup file');
      }

      // Create a safety backup before restoring
      await this.createBackup();

      // Close all database connections
      await prisma.$disconnect();

      // Wait a moment for connections to close
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Replace database file
      fs.copyFileSync(sourceFile, this.dbPath);

      // Reconnect to database
      await prisma.$connect();

      console.log('Database restored successfully');
    } catch (error) {
      console.error('Restore failed:', error);
      await prisma.$connect(); // Ensure we reconnect
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
        if (file.endsWith('.db')) {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          backupFiles.push({
            filename: file,
            size: stats.size,
            createdAt: stats.birthtime.toISOString(),
          });
        }
      }

      // Sort by date, newest first
      return backupFiles.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Delete a specific backup file
   */
  async deleteBackup(filename: string): Promise<void> {
    try {
      const filePath = path.join(this.backupDir, filename);

      // Validate filename to prevent directory traversal
      if (!filename.endsWith('.db') || filename.includes('..')) {
        throw new Error('Invalid filename');
      }

      if (!fs.existsSync(filePath)) {
        throw new Error('Backup file not found');
      }

      fs.unlinkSync(filePath);
      console.log(`Deleted backup: ${filename}`);
    } catch (error) {
      console.error('Failed to delete backup:', error);
      throw new Error('Failed to delete backup');
    }
  }

  /**
   * Get path to backup file for download
   */
  getBackupPath(filename: string): string {
    // Validate filename
    if (!filename.endsWith('.db') || filename.includes('..')) {
      throw new Error('Invalid filename');
    }

    const filePath = path.join(this.backupDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new Error('Backup file not found');
    }

    return filePath;
  }

  /**
   * Validate backup file is a valid SQLite database
   */
  private async validateBackupFile(filePath: string): Promise<boolean> {
    try {
      // Read first 16 bytes to check SQLite header
      const buffer = Buffer.alloc(16);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, 16, 0);
      fs.closeSync(fd);

      // SQLite files start with "SQLite format 3\0"
      const header = buffer.toString('utf8', 0, 15);
      return header === 'SQLite format 3';
    } catch (error) {
      console.error('Backup validation failed:', error);
      return false;
    }
  }

  /**
   * Clean up old backups, keeping only the most recent ones
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups();

      if (backups.length > this.maxBackups) {
        const toDelete = backups.slice(this.maxBackups);

        for (const backup of toDelete) {
          const filePath = path.join(this.backupDir, backup.filename);
          fs.unlinkSync(filePath);
          console.log(`Cleaned up old backup: ${backup.filename}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }
}

export const backupService = new BackupService();
```

### Type Definitions

Add to `server/src/types/settings.types.ts`:

```typescript
export interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
}

export interface BackupResult {
  success: boolean;
  filename: string;
  size: number;
  message: string;
}
```

## Part 3: Export Service

### File: server/src/services/export.service.ts

```typescript
import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';
import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';

interface ExportOptions {
  format: 'json' | 'csv' | 'excel';
  includeControls: boolean;
  includeAssessments: boolean;
  includePoams: boolean;
  includeEvidence: boolean;
}

interface ExportResult {
  filename: string;
  path: string;
  size: number;
}

class ExportService {
  private readonly exportDir = path.join(__dirname, '../../exports');

  constructor() {
    // Ensure export directory exists
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  /**
   * Export data based on options
   */
  async exportData(options: ExportOptions): Promise<ExportResult> {
    try {
      // Collect data based on options
      const data = await this.collectData(options);

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `export_${timestamp}`;

      // Export based on format
      let result: ExportResult;

      switch (options.format) {
        case 'json':
          result = await this.exportToJSON(data, filename);
          break;
        case 'csv':
          result = await this.exportToCSV(data, filename);
          break;
        case 'excel':
          result = await this.exportToExcel(data, filename);
          break;
        default:
          throw new Error('Invalid export format');
      }

      // Clean up old exports (keep only last 5)
      await this.cleanupOldExports();

      return result;
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error('Failed to export data');
    }
  }

  /**
   * Collect data from database based on options
   */
  private async collectData(options: ExportOptions): Promise<any> {
    const data: any = {};

    if (options.includeControls) {
      data.controls = await prisma.control.findMany({
        include: {
          status: true,
        },
      });
    }

    if (options.includeAssessments) {
      data.assessments = await prisma.assessment.findMany({
        include: {
          control: {
            select: {
              controlId: true,
              title: true,
            },
          },
        },
      });
    }

    if (options.includePoams) {
      data.poams = await prisma.poam.findMany({
        include: {
          control: {
            select: {
              controlId: true,
              title: true,
            },
          },
          milestones: true,
        },
      });
    }

    if (options.includeEvidence) {
      data.evidence = await prisma.evidence.findMany({
        include: {
          control: {
            select: {
              controlId: true,
              title: true,
            },
          },
        },
      });
    }

    return data;
  }

  /**
   * Export to JSON format
   */
  private async exportToJSON(data: any, filename: string): Promise<ExportResult> {
    const filepath = path.join(this.exportDir, `${filename}.json`);

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      data,
    };

    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));

    const stats = fs.statSync(filepath);

    return {
      filename: `${filename}.json`,
      path: filepath,
      size: stats.size,
    };
  }

  /**
   * Export to CSV format (multiple files, one per data type)
   */
  private async exportToCSV(data: any, filename: string): Promise<ExportResult> {
    const files: string[] = [];

    // Export each data type to separate CSV
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length > 0) {
        const csvFilename = `${filename}_${key}.csv`;
        const csvPath = path.join(this.exportDir, csvFilename);

        // Flatten nested objects for CSV
        const flatData = value.map((item: any) => this.flattenObject(item));

        const parser = new Parser();
        const csv = parser.parse(flatData);

        fs.writeFileSync(csvPath, csv);
        files.push(csvFilename);
      }
    }

    // Return info about first file (or create a zip in production)
    const firstFile = files[0] || `${filename}.csv`;
    const filepath = path.join(this.exportDir, firstFile);
    const stats = fs.existsSync(filepath) ? fs.statSync(filepath) : { size: 0 };

    return {
      filename: firstFile,
      path: filepath,
      size: stats.size,
    };
  }

  /**
   * Export to Excel format (single file, multiple sheets)
   */
  private async exportToExcel(data: any, filename: string): Promise<ExportResult> {
    const filepath = path.join(this.exportDir, `${filename}.xlsx`);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NIST 800-171 Tracker';
    workbook.created = new Date();

    // Create a sheet for each data type
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length > 0) {
        const worksheet = workbook.addWorksheet(key);

        // Flatten and get headers
        const flatData = value.map((item: any) => this.flattenObject(item));
        const headers = Object.keys(flatData[0]);

        // Add headers
        worksheet.addRow(headers);

        // Add data rows
        flatData.forEach((item: any) => {
          worksheet.addRow(Object.values(item));
        });

        // Style headers
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' },
        };

        // Auto-fit columns
        worksheet.columns.forEach((column: any) => {
          let maxLength = 0;
          column.eachCell?.({ includeEmpty: true }, (cell: any) => {
            const length = cell.value ? cell.value.toString().length : 10;
            if (length > maxLength) {
              maxLength = length;
            }
          });
          column.width = Math.min(maxLength + 2, 50);
        });
      }
    }

    await workbook.xlsx.writeFile(filepath);

    const stats = fs.statSync(filepath);

    return {
      filename: `${filename}.xlsx`,
      path: filepath,
      size: stats.size,
    };
  }

  /**
   * Flatten nested objects for CSV/Excel export
   */
  private flattenObject(obj: any, prefix = ''): any {
    const flattened: any = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}_${key}` : key;

      if (value === null || value === undefined) {
        flattened[newKey] = '';
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        flattened[newKey] = JSON.stringify(value);
      } else {
        flattened[newKey] = value;
      }
    }

    return flattened;
  }

  /**
   * Get export file path for download
   */
  getExportPath(filename: string): string {
    const filepath = path.join(this.exportDir, filename);

    if (!fs.existsSync(filepath)) {
      throw new Error('Export file not found');
    }

    return filepath;
  }

  /**
   * Clean up old export files
   */
  private async cleanupOldExports(): Promise<void> {
    try {
      const files = fs.readdirSync(this.exportDir);
      const exportFiles = files
        .filter((f) => f.startsWith('export_'))
        .map((f) => ({
          name: f,
          path: path.join(this.exportDir, f),
          stats: fs.statSync(path.join(this.exportDir, f)),
        }))
        .sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs);

      // Keep only the 5 most recent
      if (exportFiles.length > 5) {
        const toDelete = exportFiles.slice(5);
        toDelete.forEach((file) => {
          fs.unlinkSync(file.path);
          console.log(`Cleaned up old export: ${file.name}`);
        });
      }
    } catch (error) {
      console.error('Failed to cleanup old exports:', error);
    }
  }
}

export const exportService = new ExportService();
```

## Part 4: Import Service

### File: server/src/services/import.service.ts

```typescript
import { prisma } from '../lib/prisma';
import fs from 'fs';

interface ImportOptions {
  mergeStrategy: 'overwrite' | 'skip' | 'merge';
}

interface ImportResult {
  success: boolean;
  imported: {
    controls: number;
    assessments: number;
    poams: number;
    evidence: number;
  };
  errors: string[];
}

class ImportService {
  /**
   * Import data from JSON file
   */
  async importData(filePath: string, options: ImportOptions): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: {
        controls: 0,
        assessments: 0,
        poams: 0,
        evidence: 0,
      },
      errors: [],
    };

    try {
      // Read and parse file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const importData = JSON.parse(fileContent);

      // Validate structure
      if (!importData.data) {
        throw new Error('Invalid import file structure');
      }

      const { data } = importData;

      // Import each data type
      if (data.assessments && Array.isArray(data.assessments)) {
        result.imported.assessments = await this.importAssessments(
          data.assessments,
          options
        );
      }

      if (data.poams && Array.isArray(data.poams)) {
        result.imported.poams = await this.importPoams(data.poams, options);
      }

      if (data.evidence && Array.isArray(data.evidence)) {
        result.imported.evidence = await this.importEvidence(data.evidence, options);
      }

      result.success = true;
    } catch (error) {
      console.error('Import failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Import assessments
   */
  private async importAssessments(
    assessments: any[],
    options: ImportOptions
  ): Promise<number> {
    let imported = 0;

    for (const assessment of assessments) {
      try {
        const existing = await prisma.assessment.findFirst({
          where: {
            controlId: assessment.controlId,
            assessmentDate: new Date(assessment.assessmentDate),
          },
        });

        if (existing) {
          if (options.mergeStrategy === 'skip') {
            continue;
          } else if (options.mergeStrategy === 'overwrite') {
            await prisma.assessment.delete({ where: { id: existing.id } });
          }
        }

        await prisma.assessment.create({
          data: {
            controlId: assessment.controlId,
            assessmentDate: new Date(assessment.assessmentDate),
            isImplemented: assessment.isImplemented,
            hasEvidence: assessment.hasEvidence,
            isTested: assessment.isTested,
            meetsRequirement: assessment.meetsRequirement,
            riskScore: assessment.riskScore,
            assessorNotes: assessment.assessorNotes,
          },
        });

        imported++;
      } catch (error) {
        console.error('Failed to import assessment:', error);
      }
    }

    return imported;
  }

  /**
   * Import POAMs
   */
  private async importPoams(poams: any[], options: ImportOptions): Promise<number> {
    let imported = 0;

    for (const poam of poams) {
      try {
        const existing = await prisma.poam.findFirst({
          where: {
            controlId: poam.controlId,
            gapDescription: poam.gapDescription,
          },
        });

        if (existing) {
          if (options.mergeStrategy === 'skip') {
            continue;
          } else if (options.mergeStrategy === 'overwrite') {
            await prisma.poam.delete({ where: { id: existing.id } });
          }
        }

        await prisma.poam.create({
          data: {
            controlId: poam.controlId,
            gapDescription: poam.gapDescription,
            remediationPlan: poam.remediationPlan,
            assignedOwner: poam.assignedOwner,
            startDate: poam.startDate ? new Date(poam.startDate) : null,
            targetDate: poam.targetDate ? new Date(poam.targetDate) : null,
            completionDate: poam.completionDate
              ? new Date(poam.completionDate)
              : null,
            status: poam.status,
            priority: poam.priority,
            budgetEstimate: poam.budgetEstimate,
          },
        });

        imported++;
      } catch (error) {
        console.error('Failed to import POAM:', error);
      }
    }

    return imported;
  }

  /**
   * Import evidence metadata (files themselves must be uploaded separately)
   */
  private async importEvidence(
    evidence: any[],
    options: ImportOptions
  ): Promise<number> {
    let imported = 0;

    for (const item of evidence) {
      try {
        const existing = await prisma.evidence.findFirst({
          where: {
            controlId: item.controlId,
            fileName: item.fileName,
          },
        });

        if (existing) {
          if (options.mergeStrategy === 'skip') {
            continue;
          } else if (options.mergeStrategy === 'overwrite') {
            await prisma.evidence.delete({ where: { id: existing.id } });
          }
        }

        await prisma.evidence.create({
          data: {
            controlId: item.controlId,
            fileName: item.fileName,
            filePath: item.filePath,
            fileType: item.fileType,
            fileSize: item.fileSize,
            description: item.description,
            uploadedDate: new Date(item.uploadedDate),
            version: item.version,
          },
        });

        imported++;
      } catch (error) {
        console.error('Failed to import evidence:', error);
      }
    }

    return imported;
  }
}

export const importService = new ImportService();
```

## Part 5: Data Management Service

### File: server/src/services/dataManagement.service.ts

```typescript
import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

class DataManagementService {
  /**
   * Clear all assessments
   */
  async clearAssessments(): Promise<number> {
    try {
      const result = await prisma.assessment.deleteMany({});
      return result.count;
    } catch (error) {
      console.error('Failed to clear assessments:', error);
      throw new Error('Failed to clear assessments');
    }
  }

  /**
   * Clear all POAMs
   */
  async clearPoams(): Promise<number> {
    try {
      // Delete milestones first (foreign key constraint)
      await prisma.poamMilestone.deleteMany({});

      const result = await prisma.poam.deleteMany({});
      return result.count;
    } catch (error) {
      console.error('Failed to clear POAMs:', error);
      throw new Error('Failed to clear POAMs');
    }
  }

  /**
   * Clear all evidence records and files
   */
  async clearEvidence(): Promise<number> {
    try {
      const evidence = await prisma.evidence.findMany();

      // Delete physical files
      for (const item of evidence) {
        try {
          const filePath = path.join(__dirname, '../../', item.filePath);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (error) {
          console.error(`Failed to delete file: ${item.filePath}`, error);
        }
      }

      // Delete database records
      const result = await prisma.evidence.deleteMany({});
      return result.count;
    } catch (error) {
      console.error('Failed to clear evidence:', error);
      throw new Error('Failed to clear evidence');
    }
  }

  /**
   * Factory reset - clear all data except controls
   */
  async factoryReset(): Promise<void> {
    try {
      // Use transaction to ensure all-or-nothing
      await prisma.$transaction(async (tx) => {
        // Clear in order to respect foreign key constraints
        await tx.poamMilestone.deleteMany({});
        await tx.poam.deleteMany({});
        await tx.assessment.deleteMany({});
        await tx.evidence.deleteMany({});
        await tx.m365PolicyMapping.deleteMany({});
        await tx.m365Policy.deleteMany({});

        // Reset control status
        await tx.controlStatus.deleteMany({});

        // Reset settings to defaults
        await tx.setting.deleteMany({});

        // Clear M365 sync tokens
        await tx.m365SyncToken.deleteMany({});
      });

      // Delete all uploaded files
      const uploadsDir = path.join(__dirname, '../../uploads');
      if (fs.existsSync(uploadsDir)) {
        this.deleteDirectoryContents(uploadsDir);
      }

      console.log('Factory reset completed successfully');
    } catch (error) {
      console.error('Factory reset failed:', error);
      throw new Error('Failed to reset database');
    }
  }

  /**
   * Delete all files in a directory but keep the directory
   */
  private deleteDirectoryContents(dirPath: string): void {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          this.deleteDirectoryContents(filePath);
          fs.rmdirSync(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
      }
    }
  }
}

export const dataManagementService = new DataManagementService();
```

## Part 6: Settings Controller Updates

### File: server/src/controllers/settings.controller.ts

Add these methods to the existing controller:

```typescript
import { backupService } from '../services/backup.service';
import { exportService } from '../services/export.service';
import { importService } from '../services/import.service';
import { dataManagementService } from '../services/dataManagement.service';

/**
 * Create database backup
 */
async createBackup(req: Request, res: Response): Promise<void> {
  try {
    const result = await backupService.createBackup();
    res.json(result);
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({
      error: 'Failed to create backup',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Restore database from backup
 */
async restoreBackup(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No backup file uploaded' });
      return;
    }

    await backupService.restoreBackup(req.file.path);

    res.json({
      success: true,
      message: 'Database restored successfully',
    });
  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({
      error: 'Failed to restore backup',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * List available backups
 */
async listBackups(req: Request, res: Response): Promise<void> {
  try {
    const backups = await backupService.listBackups();
    res.json(backups);
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({
      error: 'Failed to list backups',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Download backup file
 */
async downloadBackup(req: Request, res: Response): Promise<void> {
  try {
    const { filename } = req.params;
    const filepath = backupService.getBackupPath(filename);

    res.download(filepath, filename);
  } catch (error) {
    console.error('Download backup error:', error);
    res.status(500).json({
      error: 'Failed to download backup',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Delete backup file
 */
async deleteBackup(req: Request, res: Response): Promise<void> {
  try {
    const { filename } = req.params;
    await backupService.deleteBackup(filename);

    res.json({
      success: true,
      message: 'Backup deleted successfully',
    });
  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({
      error: 'Failed to delete backup',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Export data
 */
async exportData(req: Request, res: Response): Promise<void> {
  try {
    const options = req.body;
    const result = await exportService.exportData(options);

    // Send file
    res.download(result.path, result.filename);
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({
      error: 'Failed to export data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Import data
 */
async importData(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No import file uploaded' });
      return;
    }

    const options = {
      mergeStrategy: req.body.mergeStrategy || 'merge',
    };

    const result = await importService.importData(req.file.path, options);

    res.json(result);
  } catch (error) {
    console.error('Import data error:', error);
    res.status(500).json({
      error: 'Failed to import data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Clear assessments
 */
async clearAssessments(req: Request, res: Response): Promise<void> {
  try {
    const count = await dataManagementService.clearAssessments();

    res.json({
      success: true,
      message: `Cleared ${count} assessment(s)`,
      count,
    });
  } catch (error) {
    console.error('Clear assessments error:', error);
    res.status(500).json({
      error: 'Failed to clear assessments',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Clear POAMs
 */
async clearPoams(req: Request, res: Response): Promise<void> {
  try {
    const count = await dataManagementService.clearPoams();

    res.json({
      success: true,
      message: `Cleared ${count} POAM(s)`,
      count,
    });
  } catch (error) {
    console.error('Clear POAMs error:', error);
    res.status(500).json({
      error: 'Failed to clear POAMs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Clear evidence
 */
async clearEvidence(req: Request, res: Response): Promise<void> {
  try {
    const count = await dataManagementService.clearEvidence();

    res.json({
      success: true,
      message: `Cleared ${count} evidence record(s)`,
      count,
    });
  } catch (error) {
    console.error('Clear evidence error:', error);
    res.status(500).json({
      error: 'Failed to clear evidence',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Factory reset
 */
async factoryReset(req: Request, res: Response): Promise<void> {
  try {
    await dataManagementService.factoryReset();

    res.json({
      success: true,
      message: 'Database reset to factory defaults',
    });
  } catch (error) {
    console.error('Factory reset error:', error);
    res.status(500).json({
      error: 'Failed to reset database',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
```

## Part 7: Update Routes

### File: server/src/routes/settings.routes.ts

Add these routes:

```typescript
import multer from 'multer';
import path from 'path';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/temp'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
});

// Backup & Restore routes
router.post('/backup/create', settingsController.createBackup);
router.post(
  '/backup/restore',
  upload.single('file'),
  settingsController.restoreBackup
);
router.get('/backup/list', settingsController.listBackups);
router.get('/backup/download/:filename', settingsController.downloadBackup);
router.delete('/backup/:filename', settingsController.deleteBackup);

// Data Export/Import routes
router.post('/export', settingsController.exportData);
router.post('/import', upload.single('file'), settingsController.importData);

// Data Clearing routes (Danger Zone)
router.post('/clear/assessments', settingsController.clearAssessments);
router.post('/clear/poams', settingsController.clearPoams);
router.post('/clear/evidence', settingsController.clearEvidence);
router.post('/reset/factory', settingsController.factoryReset);
```

## Part 8: Update Settings Service Interface

### File: client/src/services/settings.service.ts

Add these methods:

```typescript
/**
 * Create database backup
 */
async createBackup(): Promise<BackupResult> {
  const response = await axios.post('/api/settings/backup/create');
  return response.data;
}

/**
 * Restore database from backup file
 */
async restoreBackup(file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);

  await axios.post('/api/settings/backup/restore', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/**
 * List available backups
 */
async listBackups(): Promise<BackupFile[]> {
  const response = await axios.get('/api/settings/backup/list');
  return response.data;
}

/**
 * Download backup file
 */
async downloadBackup(filename: string): Promise<void> {
  const response = await axios.get(`/api/settings/backup/download/${filename}`, {
    responseType: 'blob',
  });

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Delete backup file
 */
async deleteBackup(filename: string): Promise<void> {
  await axios.delete(`/api/settings/backup/${filename}`);
}

/**
 * Export data
 */
async exportData(options: ExportOptions): Promise<void> {
  const response = await axios.post('/api/settings/export', options, {
    responseType: 'blob',
  });

  // Extract filename from content-disposition header
  const contentDisposition = response.headers['content-disposition'];
  const filename = contentDisposition
    ? contentDisposition.split('filename=')[1].replace(/"/g, '')
    : `export_${Date.now()}.${options.format === 'excel' ? 'xlsx' : options.format}`;

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Import data from file
 */
async importData(
  file: File,
  options: { mergeStrategy: 'overwrite' | 'skip' | 'merge' }
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mergeStrategy', options.mergeStrategy);

  const response = await axios.post('/api/settings/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
}

/**
 * Clear all assessments
 */
async clearAssessments(): Promise<void> {
  await axios.post('/api/settings/clear/assessments');
}

/**
 * Clear all POAMs
 */
async clearPoams(): Promise<void> {
  await axios.post('/api/settings/clear/poams');
}

/**
 * Clear all evidence
 */
async clearEvidence(): Promise<void> {
  await axios.post('/api/settings/clear/evidence');
}

/**
 * Factory reset database
 */
async factoryReset(): Promise<void> {
  await axios.post('/api/settings/reset/factory');
}
```

## Dependencies to Install

```bash
cd server
npm install --save json2csv exceljs
npm install --save-dev @types/json2csv
```

## Directory Structure to Create

```bash
mkdir -p server/backups
mkdir -p server/exports
mkdir -p server/uploads/temp
```

## Testing Checklist

### Backup & Restore
- [ ] Create backup successfully
- [ ] List backups shows all files
- [ ] Download backup works
- [ ] Restore backup works
- [ ] Delete backup works
- [ ] Old backups are cleaned up (10 max)

### Export
- [ ] Export to JSON works
- [ ] Export to CSV works
- [ ] Export to Excel works
- [ ] Selected data types are included
- [ ] File downloads automatically

### Import
- [ ] Import JSON file works
- [ ] Merge strategy respected
- [ ] Invalid files rejected
- [ ] Conflicts handled correctly

### Data Management
- [ ] Clear assessments works
- [ ] Clear POAMs works
- [ ] Clear evidence works (files deleted)
- [ ] Factory reset works
- [ ] All operations require confirmation

## Next Steps

After completing backend implementation:
1. Update Settings page to use DataManagementTab
2. Test all features thoroughly
3. Add error handling and user feedback
4. Create user documentation
