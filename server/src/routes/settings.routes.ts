import { Router } from 'express';
import {
  getAllSettings,
  getSettingsByCategory,
  updateSettingsCategory,
  updateSetting,
  testM365Connection,
  resetSettingsCategory,
} from '../controllers/settings.controller';

const router = Router();

// Get all settings
router.get('/', getAllSettings);

// Get settings by category
router.get('/:category', getSettingsByCategory);

// Update settings category
router.put('/:category', updateSettingsCategory);

// Update single setting
router.patch('/:key', updateSetting);

// Test M365 connection
router.post('/m365/test-connection', testM365Connection);

// Reset category to defaults
router.delete('/:category/reset', resetSettingsCategory);

export default router;
