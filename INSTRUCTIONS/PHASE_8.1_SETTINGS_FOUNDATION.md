# Phase 8.1: Settings Foundation

## Overview
Build the comprehensive Settings page with M365 configuration, connection testing, organization settings, and basic preferences. This phase establishes the foundation for user customization and system configuration.

## Objectives
- Create Settings page with tabbed navigation
- Implement M365 credential management (tenant ID, client ID, secret)
- Add connection testing functionality with real-time feedback
- Create organization settings section
- Implement settings persistence to database
- Add validation and error handling

## Prerequisites
- Phase 6 (M365 Integration) must be complete with working Graph API authentication
- Database schema must include settings table
- Backend M365 auth service must be functional

---

## Step 1: Update Database Schema

### 1.1 Add Settings Table to Prisma Schema

📁 `server/prisma/schema.prisma`

➕ ADD AFTER the last model:

```prisma
// ============================================================================
// Application Settings
// ============================================================================

model Setting {
  id        Int      @id @default(autoincrement())
  key       String   @unique
  value     String   // JSON-encoded value for flexibility
  category  String   // m365, organization, preferences, system
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([category])
  @@map("settings")
}
```

### 1.2 Create Migration

```bash
cd server
npx prisma migrate dev --name add_settings_table
npx prisma generate
```

### 1.3 Seed Default Settings

📁 `server/prisma/seed.ts`

➕ ADD at the end of the seed function (before the final console.log):

```typescript
  // Seed default settings
  console.log('Seeding default settings...');
  
  const defaultSettings = [
    // M365 Configuration (encrypted values stored, these are placeholders)
    { key: 'm365_tenant_id', value: '', category: 'm365' },
    { key: 'm365_client_id', value: '', category: 'm365' },
    { key: 'm365_client_secret', value: '', category: 'm365' },
    { key: 'm365_redirect_uri', value: 'http://localhost:3000/auth/callback', category: 'm365' },
    { key: 'm365_last_sync', value: '', category: 'm365' },
    { key: 'm365_auto_sync_enabled', value: 'false', category: 'm365' },
    { key: 'm365_sync_interval_hours', value: '24', category: 'm365' },
    
    // Organization Settings
    { key: 'org_name', value: '', category: 'organization' },
    { key: 'org_compliance_officer_name', value: '', category: 'organization' },
    { key: 'org_compliance_officer_email', value: '', category: 'organization' },
    { key: 'org_assessment_frequency_days', value: '90', category: 'organization' },
    
    // User Preferences
    { key: 'pref_date_format', value: 'MM/DD/YYYY', category: 'preferences' },
    { key: 'pref_items_per_page', value: '50', category: 'preferences' },
    { key: 'pref_default_view', value: 'table', category: 'preferences' },
    { key: 'pref_notifications_enabled', value: 'true', category: 'preferences' },
    
    // System Settings
    { key: 'system_last_backup', value: '', category: 'system' },
    { key: 'system_auto_backup_enabled', value: 'false', category: 'system' },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log('Default settings seeded successfully');
```

Run seed:
```bash
npm run prisma:seed
```

---

## Step 2: Backend - Settings API

### 2.1 Create Settings Types

📁 `server/src/types/settings.types.ts`

🔄 COMPLETE FILE:

```typescript
/**
 * Settings Types
 * Type definitions for application settings
 */

export interface Setting {
  id: number;
  key: string;
  value: string;
  category: 'm365' | 'organization' | 'preferences' | 'system';
  createdAt: Date;
  updatedAt: Date;
}

export interface M365Settings {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  lastSync?: string;
  autoSyncEnabled: boolean;
  syncIntervalHours: number;
}

export interface OrganizationSettings {
  name: string;
  complianceOfficerName: string;
  complianceOfficerEmail: string;
  assessmentFrequencyDays: number;
}

export interface UserPreferences {
  dateFormat: string;
  itemsPerPage: number;
  defaultView: 'table' | 'grid';
  notificationsEnabled: boolean;
}

export interface SystemSettings {
  lastBackup?: string;
  autoBackupEnabled: boolean;
}

export interface SettingsResponse {
  m365: M365Settings;
  organization: OrganizationSettings;
  preferences: UserPreferences;
  system: SystemSettings;
}

export interface UpdateSettingRequest {
  key: string;
  value: string;
}

export interface UpdateSettingsCategoryRequest {
  settings: Record<string, string>;
}

export interface ConnectionTestResult {
  connected: boolean;
  message: string;
  timestamp: string;
  details?: {
    tenantId?: string;
    organizationName?: string;
    error?: string;
  };
}
```

### 2.2 Create Settings Service

📁 `server/src/services/settings.service.ts`

🔄 COMPLETE FILE:

```typescript
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
      itemsPerPage: parseInt(this.findValue(prefs, 'pref_items_per_page') || '50'),
      defaultView: (this.findValue(prefs, 'pref_default_view') || 'table') as 'table' | 'grid',
      notificationsEnabled: this.findValue(prefs, 'pref_notifications_enabled') === 'true',
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
```

### 2.3 Create Settings Controller

📁 `server/src/controllers/settings.controller.ts`

🔄 COMPLETE FILE:

```typescript
import { Request, Response } from 'express';
import { settingsService } from '../services/settings.service';
import { authService } from '../services/auth.service';
import { graphClientService } from '../services/graphClient.service';

/**
 * GET /api/settings
 * Get all settings grouped by category
 */
export const getAllSettings = async (req: Request, res: Response) => {
  try {
    const settings = await settingsService.getAllSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      error: 'Failed to fetch settings',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * GET /api/settings/:category
 * Get settings for a specific category
 */
export const getSettingsByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const settings = await settingsService.getSettingsByCategory(category);
    res.json(settings);
  } catch (error) {
    console.error(`Error fetching ${req.params.category} settings:`, error);
    res.status(500).json({
      error: `Failed to fetch ${req.params.category} settings`,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * PUT /api/settings/:category
 * Update multiple settings in a category
 */
export const updateSettingsCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Settings object is required',
      });
    }

    await settingsService.updateSettingsCategory(category, settings);

    // If M365 settings were updated, clear the auth cache
    if (category === 'm365') {
      authService.clearTokenCache();
      graphClientService.resetClient();
    }

    res.json({
      message: `${category} settings updated successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error updating ${req.params.category} settings:`, error);
    res.status(500).json({
      error: `Failed to update ${req.params.category} settings`,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * PATCH /api/settings/:key
 * Update a single setting
 */
export const updateSetting = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Value is required',
      });
    }

    await settingsService.updateSetting(key, value);

    // If M365 setting was updated, clear the auth cache
    if (key.startsWith('m365_')) {
      authService.clearTokenCache();
      graphClientService.resetClient();
    }

    res.json({
      message: 'Setting updated successfully',
      key,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error updating setting ${req.params.key}:`, error);
    res.status(500).json({
      error: 'Failed to update setting',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * POST /api/settings/m365/test-connection
 * Test M365 connection with current or provided credentials
 */
export const testM365Connection = async (req: Request, res: Response) => {
  try {
    const { tenantId, clientId, clientSecret } = req.body;

    // If credentials provided, temporarily use them for test
    if (tenantId && clientId && clientSecret) {
      // Temporarily override env vars for this test
      const originalTenant = process.env.AZURE_TENANT_ID;
      const originalClient = process.env.AZURE_CLIENT_ID;
      const originalSecret = process.env.AZURE_CLIENT_SECRET;

      try {
        process.env.AZURE_TENANT_ID = tenantId;
        process.env.AZURE_CLIENT_ID = clientId;
        process.env.AZURE_CLIENT_SECRET = clientSecret;

        // Clear cache and reset client to use new credentials
        authService.clearTokenCache();
        graphClientService.resetClient();

        const isConnected = await graphClientService.testConnection();

        // Restore original values
        process.env.AZURE_TENANT_ID = originalTenant;
        process.env.AZURE_CLIENT_ID = originalClient;
        process.env.AZURE_CLIENT_SECRET = originalSecret;

        authService.clearTokenCache();
        graphClientService.resetClient();

        if (isConnected) {
          res.json({
            connected: true,
            message: 'Successfully connected to Microsoft Graph API',
            timestamp: new Date().toISOString(),
          });
        } else {
          res.status(503).json({
            connected: false,
            message: 'Failed to connect to Microsoft Graph API',
            timestamp: new Date().toISOString(),
          });
        }
      } catch (testError) {
        // Restore original values on error
        process.env.AZURE_TENANT_ID = originalTenant;
        process.env.AZURE_CLIENT_ID = originalClient;
        process.env.AZURE_CLIENT_SECRET = originalSecret;

        authService.clearTokenCache();
        graphClientService.resetClient();

        throw testError;
      }
    } else {
      // Use stored credentials
      const isConnected = await graphClientService.testConnection();

      if (isConnected) {
        res.json({
          connected: true,
          message: 'Successfully connected to Microsoft Graph API',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(503).json({
          connected: false,
          message: 'Failed to connect with stored credentials',
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error('Error testing M365 connection:', error);
    res.status(500).json({
      connected: false,
      message: 'Error testing connection',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * DELETE /api/settings/:category/reset
 * Reset settings category to defaults
 */
export const resetSettingsCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    await settingsService.resetCategory(category);

    res.json({
      message: `${category} settings reset to defaults`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error resetting ${req.params.category} settings:`, error);
    res.status(500).json({
      error: `Failed to reset ${req.params.category} settings`,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
```

### 2.4 Create Settings Routes

📁 `server/src/routes/settings.routes.ts`

🔄 COMPLETE FILE:

```typescript
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
```

### 2.5 Register Settings Routes in Main App

📁 `server/src/app.ts`

🔍 FIND:
```typescript
import authRoutes from './routes/auth.routes';
```

✏️ REPLACE WITH:
```typescript
import authRoutes from './routes/auth.routes';
import settingsRoutes from './routes/settings.routes';
```

🔍 FIND:
```typescript
app.use('/api/auth', authRoutes);
```

✏️ REPLACE WITH:
```typescript
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
```

---

## Step 3: Frontend - Settings Page

### 3.1 Create Settings Types

📁 `client/src/types/settings.types.ts`

🔄 COMPLETE FILE:

```typescript
/**
 * Settings Types
 * Frontend type definitions for application settings
 */

export interface M365Settings {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  lastSync?: string;
  autoSyncEnabled: boolean;
  syncIntervalHours: number;
}

export interface OrganizationSettings {
  name: string;
  complianceOfficerName: string;
  complianceOfficerEmail: string;
  assessmentFrequencyDays: number;
}

export interface UserPreferences {
  dateFormat: string;
  itemsPerPage: number;
  defaultView: 'table' | 'grid';
  notificationsEnabled: boolean;
}

export interface SystemSettings {
  lastBackup?: string;
  autoBackupEnabled: boolean;
}

export interface AllSettings {
  m365: M365Settings;
  organization: OrganizationSettings;
  preferences: UserPreferences;
  system: SystemSettings;
}

export interface ConnectionTestResult {
  connected: boolean;
  message: string;
  timestamp: string;
  details?: {
    tenantId?: string;
    organizationName?: string;
    error?: string;
  };
}
```

### 3.2 Create Settings Service

📁 `client/src/services/settings.service.ts`

🔄 COMPLETE FILE:

```typescript
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
```

### 3.3 Create Settings Page Component

📁 `client/src/pages/Settings.tsx`

🔄 COMPLETE FILE:

```typescript
import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { settingsService } from '../services/settings.service';
import M365SettingsTab from '../components/settings/M365SettingsTab';
import OrganizationSettingsTab from '../components/settings/OrganizationSettingsTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const { data: settings, isLoading, error, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsService.getAllSettings(),
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">
          Failed to load settings. Please try again.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ color: '#E0E0E0', mb: 3 }}>
        Settings
      </Typography>

      <Paper sx={{ backgroundColor: '#242424', borderRadius: 1 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              color: '#B0B0B0',
            },
            '& .Mui-selected': {
              color: '#90CAF9 !important',
            },
          }}
        >
          <Tab label="Microsoft 365" />
          <Tab label="Organization" />
          <Tab label="Preferences" />
          <Tab label="Data Management" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          {settings && (
            <M365SettingsTab settings={settings.m365} onUpdate={refetch} />
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {settings && (
            <OrganizationSettingsTab
              settings={settings.organization}
              onUpdate={refetch}
            />
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Box sx={{ p: 3 }}>
            <Alert severity="info">
              User preferences will be implemented in Phase 8.2
            </Alert>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <Box sx={{ p: 3 }}>
            <Alert severity="info">
              Data management features will be implemented in Phase 8.3
            </Alert>
          </Box>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default Settings;
```

### 3.4 Create M365 Settings Tab Component

📁 `client/src/components/settings/M365SettingsTab.tsx`

🔄 COMPLETE FILE:

```typescript
import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
  Paper,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CheckCircle,
  Error as ErrorIcon,
  CloudSync,
} from '@mui/icons-material';
import { settingsService } from '../../services/settings.service';
import { M365Settings } from '../../types/settings.types';

interface M365SettingsTabProps {
  settings: M365Settings;
  onUpdate: () => void;
}

const M365SettingsTab: React.FC<M365SettingsTabProps> = ({ settings, onUpdate }) => {
  const [formData, setFormData] = useState<M365Settings>(settings);
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [testResult, setTestResult] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleChange = (field: keyof M365Settings) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({ ...formData, [field]: event.target.value });
    setSaveMessage(null);
    setTestResult(null);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveMessage(null);

      await settingsService.updateSettingsCategory('m365', {
        tenant_id: formData.tenantId,
        client_id: formData.clientId,
        client_secret: formData.clientSecret,
        redirect_uri: formData.redirectUri,
        auto_sync_enabled: formData.autoSyncEnabled.toString(),
        sync_interval_hours: formData.syncIntervalHours.toString(),
      });

      setSaveMessage({
        type: 'success',
        text: 'M365 settings saved successfully!',
      });

      onUpdate();
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: 'Failed to save settings. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);

      const result = await settingsService.testM365Connection({
        tenantId: formData.tenantId,
        clientId: formData.clientId,
        clientSecret: formData.clientSecret,
      });

      if (result.connected) {
        setTestResult({
          type: 'success',
          text: result.message,
        });
      } else {
        setTestResult({
          type: 'error',
          text: result.message || 'Connection test failed',
        });
      }
    } catch (error: any) {
      setTestResult({
        type: 'error',
        text: error.response?.data?.message || 'Failed to test connection',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0', mb: 2 }}>
        Microsoft 365 Integration
      </Typography>

      <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 3 }}>
        Configure your Azure AD app registration credentials to enable automated compliance
        checking through Microsoft Graph API.
      </Typography>

      {saveMessage && (
        <Alert severity={saveMessage.type} sx={{ mb: 3 }} onClose={() => setSaveMessage(null)}>
          {saveMessage.text}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Tenant ID */}
        <TextField
          label="Tenant ID"
          value={formData.tenantId}
          onChange={handleChange('tenantId')}
          fullWidth
          helperText="Your Azure AD Tenant (Directory) ID"
          InputLabelProps={{ shrink: true }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#E0E0E0',
              '& fieldset': { borderColor: '#4A4A4A' },
            },
            '& .MuiInputLabel-root': { color: '#B0B0B0' },
            '& .MuiFormHelperText-root': { color: '#B0B0B0' },
          }}
        />

        {/* Client ID */}
        <TextField
          label="Client ID"
          value={formData.clientId}
          onChange={handleChange('clientId')}
          fullWidth
          helperText="Your Azure AD Application (Client) ID"
          InputLabelProps={{ shrink: true }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#E0E0E0',
              '& fieldset': { borderColor: '#4A4A4A' },
            },
            '& .MuiInputLabel-root': { color: '#B0B0B0' },
            '& .MuiFormHelperText-root': { color: '#B0B0B0' },
          }}
        />

        {/* Client Secret */}
        <TextField
          label="Client Secret"
          type={showSecret ? 'text' : 'password'}
          value={formData.clientSecret}
          onChange={handleChange('clientSecret')}
          fullWidth
          helperText="Your Azure AD Application Client Secret"
          InputLabelProps={{ shrink: true }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowSecret(!showSecret)}
                  edge="end"
                  sx={{ color: '#B0B0B0' }}
                >
                  {showSecret ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#E0E0E0',
              '& fieldset': { borderColor: '#4A4A4A' },
            },
            '& .MuiInputLabel-root': { color: '#B0B0B0' },
            '& .MuiFormHelperText-root': { color: '#B0B0B0' },
          }}
        />

        {/* Redirect URI */}
        <TextField
          label="Redirect URI"
          value={formData.redirectUri}
          onChange={handleChange('redirectUri')}
          fullWidth
          helperText="OAuth redirect URI (typically http://localhost:3000/auth/callback)"
          InputLabelProps={{ shrink: true }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#E0E0E0',
              '& fieldset': { borderColor: '#4A4A4A' },
            },
            '& .MuiInputLabel-root': { color: '#B0B0B0' },
            '& .MuiFormHelperText-root': { color: '#B0B0B0' },
          }}
        />
      </Box>

      <Divider sx={{ my: 3, borderColor: '#4A4A4A' }} />

      {/* Connection Status */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mb: 3,
          backgroundColor: '#1E1E1E',
          borderColor: '#4A4A4A',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="subtitle2" sx={{ color: '#E0E0E0', mb: 1 }}>
              Connection Status
            </Typography>
            {testResult ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {testResult.type === 'success' ? (
                  <CheckCircle sx={{ color: '#4CAF50', fontSize: 20 }} />
                ) : (
                  <ErrorIcon sx={{ color: '#F44336', fontSize: 20 }} />
                )}
                <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
                  {testResult.text}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
                {settings.lastSync
                  ? `Last synced: ${new Date(settings.lastSync).toLocaleString()}`
                  : 'Not connected yet'}
              </Typography>
            )}
          </Box>
          <Button
            variant="outlined"
            startIcon={isTesting ? <CircularProgress size={20} /> : <CloudSync />}
            onClick={handleTestConnection}
            disabled={isTesting || !formData.tenantId || !formData.clientId || !formData.clientSecret}
            sx={{
              borderColor: '#4A4A4A',
              color: '#90CAF9',
              '&:hover': {
                borderColor: '#90CAF9',
                backgroundColor: 'rgba(144, 202, 249, 0.05)',
              },
            }}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
        </Box>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
          sx={{
            backgroundColor: '#90CAF9',
            color: '#000',
            '&:hover': {
              backgroundColor: '#64B5F6',
            },
          }}
        >
          {isSaving ? <CircularProgress size={24} /> : 'Save Settings'}
        </Button>
        <Button
          variant="outlined"
          onClick={() => setFormData(settings)}
          disabled={isSaving}
          sx={{
            borderColor: '#4A4A4A',
            color: '#90CAF9',
            '&:hover': {
              borderColor: '#90CAF9',
              backgroundColor: 'rgba(144, 202, 249, 0.05)',
            },
          }}
        >
          Reset
        </Button>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
            Need help setting up Azure AD?
          </Typography>
          <Typography variant="body2">
            Follow the setup guide in the documentation to create an app registration and configure
            the required API permissions.
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default M365SettingsTab;
```

### 3.5 Create Organization Settings Tab Component

📁 `client/src/components/settings/OrganizationSettingsTab.tsx`

🔄 COMPLETE FILE:

```typescript
import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { settingsService } from '../../services/settings.service';
import { OrganizationSettings } from '../../types/settings.types';

interface OrganizationSettingsTabProps {
  settings: OrganizationSettings;
  onUpdate: () => void;
}

const OrganizationSettingsTab: React.FC<OrganizationSettingsTabProps> = ({
  settings,
  onUpdate,
}) => {
  const [formData, setFormData] = useState<OrganizationSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleChange = (field: keyof OrganizationSettings) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'assessmentFrequencyDays' 
      ? parseInt(event.target.value) || 0
      : event.target.value;
    
    setFormData({ ...formData, [field]: value });
    setSaveMessage(null);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveMessage(null);

      await settingsService.updateSettingsCategory('organization', {
        name: formData.name,
        compliance_officer_name: formData.complianceOfficerName,
        compliance_officer_email: formData.complianceOfficerEmail,
        assessment_frequency_days: formData.assessmentFrequencyDays.toString(),
      });

      setSaveMessage({
        type: 'success',
        text: 'Organization settings saved successfully!',
      });

      onUpdate();
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: 'Failed to save settings. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0', mb: 2 }}>
        Organization Information
      </Typography>

      <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 3 }}>
        Configure your organization details for reports and assessments.
      </Typography>

      {saveMessage && (
        <Alert severity={saveMessage.type} sx={{ mb: 3 }} onClose={() => setSaveMessage(null)}>
          {saveMessage.text}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Organization Name */}
        <TextField
          label="Organization Name"
          value={formData.name}
          onChange={handleChange('name')}
          fullWidth
          helperText="Your company or organization name"
          InputLabelProps={{ shrink: true }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#E0E0E0',
              '& fieldset': { borderColor: '#4A4A4A' },
            },
            '& .MuiInputLabel-root': { color: '#B0B0B0' },
            '& .MuiFormHelperText-root': { color: '#B0B0B0' },
          }}
        />

        {/* Compliance Officer Name */}
        <TextField
          label="Compliance Officer Name"
          value={formData.complianceOfficerName}
          onChange={handleChange('complianceOfficerName')}
          fullWidth
          helperText="Name of the person responsible for compliance"
          InputLabelProps={{ shrink: true }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#E0E0E0',
              '& fieldset': { borderColor: '#4A4A4A' },
            },
            '& .MuiInputLabel-root': { color: '#B0B0B0' },
            '& .MuiFormHelperText-root': { color: '#B0B0B0' },
          }}
        />

        {/* Compliance Officer Email */}
        <TextField
          label="Compliance Officer Email"
          type="email"
          value={formData.complianceOfficerEmail}
          onChange={handleChange('complianceOfficerEmail')}
          fullWidth
          helperText="Contact email for compliance matters"
          InputLabelProps={{ shrink: true }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#E0E0E0',
              '& fieldset': { borderColor: '#4A4A4A' },
            },
            '& .MuiInputLabel-root': { color: '#B0B0B0' },
            '& .MuiFormHelperText-root': { color: '#B0B0B0' },
          }}
        />

        {/* Assessment Frequency */}
        <TextField
          label="Assessment Frequency (Days)"
          type="number"
          value={formData.assessmentFrequencyDays}
          onChange={handleChange('assessmentFrequencyDays')}
          fullWidth
          helperText="How often to conduct compliance assessments (e.g., 90 days)"
          InputLabelProps={{ shrink: true }}
          inputProps={{ min: 1, max: 365 }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#E0E0E0',
              '& fieldset': { borderColor: '#4A4A4A' },
            },
            '& .MuiInputLabel-root': { color: '#B0B0B0' },
            '& .MuiFormHelperText-root': { color: '#B0B0B0' },
          }}
        />
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
          sx={{
            backgroundColor: '#90CAF9',
            color: '#000',
            '&:hover': {
              backgroundColor: '#64B5F6',
            },
          }}
        >
          {isSaving ? <CircularProgress size={24} /> : 'Save Settings'}
        </Button>
        <Button
          variant="outlined"
          onClick={() => setFormData(settings)}
          disabled={isSaving}
          sx={{
            borderColor: '#4A4A4A',
            color: '#90CAF9',
            '&:hover': {
              borderColor: '#90CAF9',
              backgroundColor: 'rgba(144, 202, 249, 0.05)',
            },
          }}
        >
          Reset
        </Button>
      </Box>
    </Box>
  );
};

export default OrganizationSettingsTab;
```

### 3.6 Add Settings Route

📁 `client/src/App.tsx`

🔍 FIND:
```typescript
import POAMDetail from './pages/POAMDetail';
```

✏️ REPLACE WITH:
```typescript
import POAMDetail from './pages/POAMDetail';
import Settings from './pages/Settings';
```

🔍 FIND the routes section and ADD this route:
```typescript
<Route path="/settings" element={<Settings />} />
```

### 3.7 Update Sidebar Navigation

📁 `client/src/components/layout/Sidebar.tsx`

🔍 FIND:
```typescript
import { Settings as SettingsIcon } from '@mui/icons-material';
```

If not present, add the import.

🔍 FIND the navigation items array and UPDATE the Settings item:
```typescript
{ text: 'Settings', icon: <SettingsIcon />, path: '/settings', disabled: false },
```

Change `disabled` from `true` to `false`.

---

## Step 4: Testing Phase 8.1

### 4.1 Start the Application

Terminal 1 (Backend):
```bash
cd server
npm run dev
```

Terminal 2 (Frontend):
```bash
cd client
npm run dev
```

### 4.2 Manual Testing Checklist

**M365 Settings:**
- [ ] Navigate to Settings page
- [ ] M365 tab is accessible
- [ ] All input fields render correctly
- [ ] Client secret is masked by default
- [ ] Toggle visibility button works for client secret
- [ ] Can enter tenant ID, client ID, and client secret
- [ ] "Test Connection" button is enabled when all fields filled
- [ ] "Test Connection" provides feedback (success or error)
- [ ] "Save Settings" saves credentials successfully
- [ ] Settings persist after page refresh
- [ ] Reset button restores original values

**Organization Settings:**
- [ ] Organization tab is accessible
- [ ] Can enter organization name
- [ ] Can enter compliance officer name and email
- [ ] Can set assessment frequency (numeric field)
- [ ] "Save Settings" saves successfully
- [ ] Settings persist after page refresh
- [ ] Reset button works

**Navigation:**
- [ ] Settings link in sidebar works
- [ ] Tab navigation works smoothly
- [ ] Can switch between tabs without losing data (before saving)

**Error Handling:**
- [ ] Invalid email format shows validation error
- [ ] Save errors display user-friendly message
- [ ] Connection test errors display detailed message
- [ ] Empty required fields handled gracefully

### 4.3 API Testing

Test with curl or Postman:

```bash
# Get all settings
curl http://localhost:3001/api/settings

# Get M365 settings
curl http://localhost:3001/api/settings/m365

# Update M365 settings
curl -X PUT http://localhost:3001/api/settings/m365 \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "tenant_id": "your-tenant-id",
      "client_id": "your-client-id",
      "client_secret": "your-secret"
    }
  }'

# Test connection
curl -X POST http://localhost:3001/api/settings/m365/test-connection \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "your-tenant-id",
    "clientId": "your-client-id",
    "clientSecret": "your-secret"
  }'

# Get organization settings
curl http://localhost:3001/api/settings/organization

# Update organization settings
curl -X PUT http://localhost:3001/api/settings/organization \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "name": "Acme Corp",
      "compliance_officer_name": "John Doe",
      "compliance_officer_email": "john@acme.com",
      "assessment_frequency_days": "90"
    }
  }'
```

---

## Verification Checklist

- [ ] Database migration created and applied successfully
- [ ] Default settings seeded in database
- [ ] Settings API endpoints return correct data
- [ ] Settings service properly masks client secret in responses
- [ ] Settings page renders without errors
- [ ] M365 settings tab functional
- [ ] Organization settings tab functional
- [ ] Connection test works with valid credentials
- [ ] Connection test fails gracefully with invalid credentials
- [ ] Settings persist to database correctly
- [ ] Settings load from database on page refresh
- [ ] Tab navigation works smoothly
- [ ] All form validations work correctly
- [ ] Success/error messages display appropriately
- [ ] Dark theme colors applied consistently
- [ ] No console errors
- [ ] TypeScript compiles without errors

---

## Common Issues & Solutions

### Issue: Settings not persisting
**Solution**: Check database connection, verify Prisma schema, ensure migrations ran successfully

### Issue: Connection test always fails
**Solution**: Verify Azure AD credentials are correct, check if client secret is actual secret value (not secret ID), ensure API permissions are granted

### Issue: Client secret not masked
**Solution**: Check settings service maskSecret function, verify response is passing through service correctly

### Issue: Tab switching loses unsaved data
**Solution**: This is expected behavior - user must save before switching tabs, or we can add a confirmation dialog (Phase 8.5)

### Issue: TypeScript errors
**Solution**: Ensure all new type definitions are exported/imported correctly, run `npm run type-check`

---

## Next Steps

After completing Phase 8.1:
- **Phase 8.2**: User Preferences & Customization
- **Phase 8.3**: Data Management & Backup
- **Phase 8.4**: UX Polish - Loading & Error States

---

## Notes for Claude Code

- All settings stored as key-value pairs in database for flexibility
- Client secret is masked in responses but stored in plain text (consider encryption for production)
- Settings service handles parsing and grouping by category
- React Query used for caching and automatic refetching
- Material-UI form components with consistent dark theme styling
- Error handling at both API and UI levels
- Connection testing uses temporary credential override without persisting
