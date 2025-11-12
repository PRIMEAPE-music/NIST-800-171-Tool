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
