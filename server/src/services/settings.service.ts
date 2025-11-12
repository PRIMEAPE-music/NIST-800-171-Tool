import { PrismaClient } from '@prisma/client';
import {
  M365Settings,
  OrganizationSettings,
  UserPreferences,
  SystemSettings,
  SettingsResponse,
} from '../types/settings.types';

const prisma = new PrismaClient();

class SettingsService {
  /**
   * Get all settings grouped by category
   */
  async getAllSettings(): Promise<SettingsResponse> {
    const settings = await prisma.setting.findMany();

    return {
      m365: this.parseM365Settings(settings),
      organization: this.parseOrganizationSettings(settings),
      preferences: this.parseUserPreferences(settings),
      system: this.parseSystemSettings(settings),
    };
  }

  /**
   * Get settings by category
   */
  async getSettingsByCategory(category: string): Promise<Record<string, string>> {
    const settings = await prisma.setting.findMany({
      where: { category },
    });

    const result: Record<string, string> = {};
    settings.forEach((setting) => {
      // Remove category prefix from key for cleaner object
      const key = setting.key.replace(`${category}_`, '');
      result[key] = setting.value;
    });

    return result;
  }

  /**
   * Get single setting by key
   */
  async getSetting(key: string): Promise<string | null> {
    const setting = await prisma.setting.findUnique({
      where: { key },
    });
    return setting?.value || null;
  }

  /**
   * Update single setting
   */
  async updateSetting(key: string, value: string): Promise<void> {
    await prisma.setting.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: {
        key,
        value,
        category: this.getCategoryFromKey(key),
      },
    });
  }

  /**
   * Update multiple settings in a category
   */
  async updateSettingsCategory(
    category: string,
    settings: Record<string, string>
  ): Promise<void> {
    const updates = Object.entries(settings).map(([key, value]) => {
      const fullKey = key.startsWith(`${category}_`) ? key : `${category}_${key}`;
      return prisma.setting.upsert({
        where: { key: fullKey },
        update: { value, updatedAt: new Date() },
        create: {
          key: fullKey,
          value,
          category,
        },
      });
    });

    await prisma.$transaction(updates);
  }

  /**
   * Delete setting by key
   */
  async deleteSetting(key: string): Promise<void> {
    await prisma.setting.delete({
      where: { key },
    });
  }

  /**
   * Reset settings to defaults for a category
   */
  async resetCategory(category: string): Promise<void> {
    await prisma.setting.deleteMany({
      where: { category },
    });
    // Re-seed will happen automatically on next app start or can trigger seed function
  }

  // Helper methods to parse settings into typed objects

  private parseM365Settings(settings: any[]): M365Settings {
    const m365 = settings.filter((s) => s.category === 'm365');
    return {
      tenantId: this.findValue(m365, 'm365_tenant_id'),
      clientId: this.findValue(m365, 'm365_client_id'),
      clientSecret: this.maskSecret(this.findValue(m365, 'm365_client_secret')),
      redirectUri: this.findValue(m365, 'm365_redirect_uri'),
      lastSync: this.findValue(m365, 'm365_last_sync') || undefined,
      autoSyncEnabled: this.findValue(m365, 'm365_auto_sync_enabled') === 'true',
      syncIntervalHours: parseInt(this.findValue(m365, 'm365_sync_interval_hours') || '24'),
    };
  }

  private parseOrganizationSettings(settings: any[]): OrganizationSettings {
    const org = settings.filter((s) => s.category === 'organization');
    return {
      name: this.findValue(org, 'org_name'),
      complianceOfficerName: this.findValue(org, 'org_compliance_officer_name'),
      complianceOfficerEmail: this.findValue(org, 'org_compliance_officer_email'),
      assessmentFrequencyDays: parseInt(
        this.findValue(org, 'org_assessment_frequency_days') || '90'
      ),
    };
  }

  private parseUserPreferences(settings: any[]): UserPreferences {
    const prefs = settings.filter((s) => s.category === 'preferences');
    return {
      dateFormat: this.findValue(prefs, 'pref_date_format') || 'MM/DD/YYYY',
      timeFormat: this.findValue(prefs, 'pref_time_format') || '12h',
      itemsPerPage: parseInt(this.findValue(prefs, 'pref_items_per_page') || '50'),
      defaultView: (this.findValue(prefs, 'pref_default_view') || 'table') as 'table' | 'grid',
      notificationsEnabled: this.findValue(prefs, 'pref_notifications_enabled') === 'true',
      showCompletedControls: this.findValue(prefs, 'pref_show_completed_controls') === 'true',
      showNotStartedControls: this.findValue(prefs, 'pref_show_not_started_controls') === 'true',
      defaultControlFamily: this.findValue(prefs, 'pref_default_control_family') || 'all',
      defaultStatusFilter: this.findValue(prefs, 'pref_default_status_filter') || 'all',
      defaultPriorityFilter: this.findValue(prefs, 'pref_default_priority_filter') || 'all',
      assessmentReminderDays: parseInt(this.findValue(prefs, 'pref_assessment_reminder_days') || '7'),
      poamReminderDays: parseInt(this.findValue(prefs, 'pref_poam_reminder_days') || '7'),
      showFamilyDescriptions: this.findValue(prefs, 'pref_show_family_descriptions') === 'true',
      expandControlDetailsDefault: this.findValue(prefs, 'pref_expand_control_details_default') === 'true',
      customTags: this.findValue(prefs, 'pref_custom_tags') || '[]',
      dashboardRefreshSeconds: parseInt(this.findValue(prefs, 'pref_dashboard_refresh_seconds') || '60'),
    };
  }

  private parseSystemSettings(settings: any[]): SystemSettings {
    const system = settings.filter((s) => s.category === 'system');
    return {
      lastBackup: this.findValue(system, 'system_last_backup') || undefined,
      autoBackupEnabled: this.findValue(system, 'system_auto_backup_enabled') === 'true',
    };
  }

  private findValue(settings: any[], key: string): string {
    return settings.find((s) => s.key === key)?.value || '';
  }

  private maskSecret(secret: string): string {
    if (!secret || secret.length < 8) return '••••••••';
    return secret.substring(0, 4) + '••••••••' + secret.substring(secret.length - 4);
  }

  private getCategoryFromKey(key: string): string {
    if (key.startsWith('m365_')) return 'm365';
    if (key.startsWith('org_')) return 'organization';
    if (key.startsWith('pref_')) return 'preferences';
    if (key.startsWith('system_')) return 'system';
    return 'other';
  }

  /**
   * Get M365 credentials (unmasked) for internal use
   */
  async getM365Credentials(): Promise<{
    tenantId: string;
    clientId: string;
    clientSecret: string;
  }> {
    const tenantId = await this.getSetting('m365_tenant_id');
    const clientId = await this.getSetting('m365_client_id');
    const clientSecret = await this.getSetting('m365_client_secret');

    return {
      tenantId: tenantId || '',
      clientId: clientId || '',
      clientSecret: clientSecret || '',
    };
  }
}

export const settingsService = new SettingsService();
