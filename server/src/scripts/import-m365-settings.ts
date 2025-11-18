/**
 * M365 Settings Import Script
 *
 * Imports normalized M365 settings data into the database.
 * Usage: npm run import:m365-settings
 */

import { m365SettingsImportService } from '../services/m365SettingsImport.service';
import { logger } from '../utils/logger';

async function main() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 M365 SETTINGS IMPORT SCRIPT');
    console.log('='.repeat(80) + '\n');

    // Run import
    const stats = await m365SettingsImportService.importAll();

    // Verify results
    await m365SettingsImportService.verifyImport();

    // Exit with appropriate code
    if (stats.errors.length > 0) {
      logger.warn('Import completed with errors. Review logs above.');
      process.exit(1);
    } else {
      logger.info('✅ Import completed successfully!');
      process.exit(0);
    }
  } catch (error) {
    logger.error('❌ Import script failed:', error);
    console.error(error);
    process.exit(1);
  }
}

main();
