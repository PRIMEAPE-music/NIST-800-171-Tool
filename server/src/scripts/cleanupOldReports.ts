import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

/**
 * Delete reports older than specified days
 */
async function cleanupOldReports(daysToKeep: number = 30): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  console.log(`Cleaning up reports older than ${cutoffDate.toISOString()}`);

  // Find old reports
  const oldReports = await prisma.reportHistory.findMany({
    where: {
      generatedAt: {
        lt: cutoffDate,
      },
    },
  });

  console.log(`Found ${oldReports.length} old reports`);

  let deletedFiles = 0;
  let deletedRecords = 0;

  for (const report of oldReports) {
    // Delete file if it exists
    if (report.filePath && fs.existsSync(report.filePath)) {
      try {
        fs.unlinkSync(report.filePath);
        deletedFiles++;
        console.log(`Deleted file: ${report.filePath}`);
      } catch (error) {
        console.error(`Failed to delete file ${report.filePath}:`, error);
      }
    }

    // Delete database record
    try {
      await prisma.reportHistory.delete({
        where: { id: report.id },
      });
      deletedRecords++;
    } catch (error) {
      console.error(`Failed to delete record ${report.id}:`, error);
    }
  }

  console.log(`Cleanup complete:`);
  console.log(`  - Deleted ${deletedFiles} files`);
  console.log(`  - Deleted ${deletedRecords} database records`);
}

// Run if executed directly
if (require.main === module) {
  const daysToKeep = parseInt(process.argv[2]) || 30;
  cleanupOldReports(daysToKeep)
    .then(() => {
      console.log('Cleanup script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cleanup script failed:', error);
      process.exit(1);
    });
}

export { cleanupOldReports };
