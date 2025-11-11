import axios from 'axios';
import { AllSettings, ConnectionTestResult } from '../types/settings.types';

const API_URL = 'http://localhost:3001/api/settings';

class SettingsService {
  /**
   * Get all settings
   */
  async getAllSettings(): Promise<AllSettings> {
    const response = await axios.get(`${API_URL}`);
    return response.data;
  }

  /**
   * Get settings by category
   */
  async getSettingsByCategory(category: string): Promise<Record<string, string>> {
    const response = await axios.get(`${API_URL}/${category}`);
    return response.data;
  }

  /**
   * Update settings for a category
   */
  async updateSettingsCategory(
    category: string,
    settings: Record<string, string>
  ): Promise<void> {
    await axios.put(`${API_URL}/${category}`, { settings });
  }

  /**
   * Update single setting
   */
  async updateSetting(key: string, value: string): Promise<void> {
    await axios.patch(`${API_URL}/${key}`, { value });
  }

  /**
   * Test M365 connection
   */
  async testM365Connection(credentials?: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
  }): Promise<ConnectionTestResult> {
    const response = await axios.post(`${API_URL}/m365/test-connection`, credentials || {});
    return response.data;
  }

  /**
   * Reset category to defaults
   */
  async resetCategory(category: string): Promise<void> {
    await axios.delete(`${API_URL}/${category}/reset`);
  }
}

export const settingsService = new SettingsService();
