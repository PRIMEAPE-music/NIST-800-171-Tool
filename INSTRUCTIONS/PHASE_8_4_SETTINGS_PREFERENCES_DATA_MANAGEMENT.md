# Phase 8.4: Settings Page - Preferences & Data Management Tabs

## Overview
Complete the Settings page by implementing the Preferences and Data Management tabs. This builds on the existing M365 and Organization tabs completed in earlier phases.

## Current State Analysis
- ✅ Settings page structure with 4 tabs implemented
- ✅ M365 Settings tab completed (Tab 0)
- ✅ Organization Settings tab completed (Tab 1)
- ⏳ Preferences tab showing placeholder (Tab 2) - **THIS PHASE**
- ⏳ Data Management tab showing placeholder (Tab 3) - **THIS PHASE**
- ✅ Backend settings service and APIs functional
- ✅ Settings types defined on both frontend and backend

## Phase Objectives
1. Implement Preferences Settings Tab (user preferences)
2. Implement Data Management Tab (backup/restore/import/export)
3. Add corresponding backend API endpoints
4. Implement backup/restore functionality
5. Add data export/import capabilities
6. Create confirmation dialogs for destructive actions

## Part 1: Preferences Settings Tab

### Features to Implement
- **Date Format Selection**: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
- **Items Per Page**: Dropdown for table pagination (10, 25, 50, 100)
- **Default View**: Toggle between table and grid view
- **Notifications**: Enable/disable email notifications
- **Auto-save**: Toggle for automatic form saving
- **Theme**: Toggle between dark/light mode (extend existing theme)

### Component Structure
```
client/src/components/settings/
├── PreferencesSettingsTab.tsx  (NEW)
└── DateFormatSelector.tsx      (NEW - optional sub-component)
```

### Implementation Steps

#### Step 1.1: Create PreferencesSettingsTab Component
**File**: `client/src/components/settings/PreferencesSettingsTab.tsx`

**Requirements**:
- Accept `settings: UserPreferences` and `onUpdate: () => void` props
- Use local state for form data
- Implement save button with loading state
- Show success/error messages
- Use MUI components matching existing dark theme
- Include form validation
- Group related settings with section headers

**UI Layout**:
```
┌─────────────────────────────────────┐
│ User Preferences                     │
├─────────────────────────────────────┤
│ Display Settings                     │
│   Date Format: [Dropdown]            │
│   Items Per Page: [Dropdown]         │
│   Default View: [Radio: Table/Grid]  │
│                                      │
│ Notification Settings                │
│   [X] Enable email notifications     │
│   [X] Show toast notifications       │
│                                      │
│ General Settings                     │
│   [X] Auto-save form changes         │
│   [X] Confirm before deleting items  │
│                                      │
│ [Reset to Defaults] [Save Changes]   │
└─────────────────────────────────────┘
```

#### Step 1.2: Update Settings Page
**File**: `client/src/pages/Settings.tsx`

**Changes**:
- Replace Tab 2 placeholder with PreferencesSettingsTab component
- Pass settings.preferences and refetch function

#### Step 1.3: Extend UserPreferences Type
**File**: `client/src/types/settings.types.ts`

**Add fields**:
```typescript
export interface UserPreferences {
  dateFormat: string;
  itemsPerPage: number;
  defaultView: 'table' | 'grid';
  notificationsEnabled: boolean;
  showToastNotifications: boolean;
  autoSaveEnabled: boolean;
  confirmBeforeDelete: boolean;
}
```

#### Step 1.4: Update Backend Types
**File**: `server/src/types/settings.types.ts`

**Add same fields to UserPreferences interface**

#### Step 1.5: Update Database Seed
**File**: `server/prisma/seed.ts`

**Add new preference keys**:
- `pref_show_toast_notifications`
- `pref_auto_save_enabled`
- `pref_confirm_before_delete`

## Part 2: Data Management Tab

### Features to Implement
- **Database Backup**: Create backup file (.db copy)
- **Database Restore**: Upload and restore from backup
- **Export Data**: Export all data to JSON
- **Import Data**: Import from JSON file
- **Reset Database**: Clear all data except controls
- **Clear Specific Data**: Clear assessments, POAMs, or evidence individually
- **Download System Logs**: Export application logs

### Component Structure
```
client/src/components/settings/
├── DataManagementTab.tsx         (NEW)
├── BackupRestoreSection.tsx      (NEW)
├── DataExportSection.tsx         (NEW)
├── DataImportSection.tsx         (NEW)
└── DangerZoneSection.tsx         (NEW)
```

### Implementation Steps

#### Step 2.1: Create DataManagementTab Component
**File**: `client/src/components/settings/DataManagementTab.tsx`

**Requirements**:
- Organize features into collapsible sections
- Show last backup date if available
- Display file size information
- Implement confirmation dialogs for destructive actions
- Show progress indicators for long operations
- Provide detailed feedback messages

**UI Layout**:
```
┌─────────────────────────────────────────┐
│ Data Management                          │
├─────────────────────────────────────────┤
│ Backup & Restore                         │
│   Last Backup: Nov 11, 2025 3:45 PM     │
│   [Create Backup] [Restore from File]   │
│                                          │
│ Data Export                              │
│   Export Format: [Dropdown: JSON/CSV]   │
│   Include: [X] Controls [X] Assessments │
│             [X] POAMs    [X] Evidence   │
│   [Export Data]                          │
│                                          │
│ Data Import                              │
│   [Drop zone or browse]                  │
│   [Import Data]                          │
│                                          │
│ ⚠️ Danger Zone                           │
│   [Clear Assessment Data]                │
│   [Clear POAM Data]                      │
│   [Reset to Factory Defaults]            │
└─────────────────────────────────────────┘
```

#### Step 2.2: Implement Backup/Restore Section
**File**: `client/src/components/settings/BackupRestoreSection.tsx`

**Features**:
- Button to create instant backup
- File upload for restore
- Show backup history (last 5 backups)
- Download backup file
- Validation before restore

#### Step 2.3: Implement Data Export Section
**File**: `client/src/components/settings/DataExportSection.tsx`

**Features**:
- Select data types to export (checkboxes)
- Choose export format (JSON, CSV, Excel)
- Date range filter for assessments
- Generate and download export file

#### Step 2.4: Implement Data Import Section
**File**: `client/src/components/settings/DataImportSection.tsx`

**Features**:
- Drag-and-drop file upload
- File validation (format, size)
- Preview import data
- Conflict resolution options
- Progress indicator during import

#### Step 2.5: Implement Danger Zone Section
**File**: `client/src/components/settings/DangerZoneSection.tsx`

**Features**:
- Red/warning styling
- Clear specific data types
- Reset to factory defaults
- Required confirmation dialogs
- Password/confirmation text input

## Part 3: Backend API Endpoints

### Add New Routes
**File**: `server/src/routes/settings.routes.ts`

**New endpoints**:
```typescript
// Backup & Restore
router.post('/backup/create', settingsController.createBackup);
router.post('/backup/restore', upload.single('file'), settingsController.restoreBackup);
router.get('/backup/list', settingsController.listBackups);
router.get('/backup/download/:filename', settingsController.downloadBackup);

// Data Export
router.post('/export', settingsController.exportData);

// Data Import
router.post('/import', upload.single('file'), settingsController.importData);

// Data Clearing (Danger Zone)
router.post('/clear/assessments', settingsController.clearAssessments);
router.post('/clear/poams', settingsController.clearPoams);
router.post('/clear/evidence', settingsController.clearEvidence);
router.post('/reset/factory', settingsController.factoryReset);
```

### Implementation Steps

#### Step 3.1: Update Settings Controller
**File**: `server/src/controllers/settings.controller.ts`

**Add methods**:
- `createBackup()`: Copy database file to backups directory
- `restoreBackup()`: Validate and restore database from upload
- `listBackups()`: List available backup files
- `downloadBackup()`: Stream backup file to client
- `exportData()`: Export selected data to JSON/CSV
- `importData()`: Import and merge data from file
- `clearAssessments()`: Delete all assessment records
- `clearPoams()`: Delete all POAM records
- `clearEvidence()`: Delete all evidence records and files
- `factoryReset()`: Reset database to seed state

#### Step 3.2: Create Backup Service
**File**: `server/src/services/backup.service.ts`

**Methods**:
```typescript
class BackupService {
  async createBackup(): Promise<string>
  async restoreBackup(filePath: string): Promise<void>
  async listBackups(): Promise<BackupFile[]>
  async deleteBackup(filename: string): Promise<void>
  async validateBackupFile(filePath: string): Promise<boolean>
}
```

#### Step 3.3: Create Export Service
**File**: `server/src/services/export.service.ts`

**Methods**:
```typescript
class ExportService {
  async exportToJSON(options: ExportOptions): Promise<string>
  async exportToCSV(options: ExportOptions): Promise<string>
  async exportToExcel(options: ExportOptions): Promise<string>
}

interface ExportOptions {
  includeControls: boolean;
  includeAssessments: boolean;
  includePoams: boolean;
  includeEvidence: boolean;
  dateRange?: { start: Date; end: Date };
}
```

#### Step 3.4: Create Import Service
**File**: `server/src/services/import.service.ts`

**Methods**:
```typescript
class ImportService {
  async importFromJSON(filePath: string, options: ImportOptions): Promise<ImportResult>
  async validateImportFile(filePath: string): Promise<ValidationResult>
  async previewImport(filePath: string): Promise<ImportPreview>
}

interface ImportOptions {
  mergeStrategy: 'overwrite' | 'skip' | 'merge';
  validateReferences: boolean;
}
```

## Part 4: Confirmation Dialogs

### Create Reusable Confirmation Dialog
**File**: `client/src/components/common/ConfirmationDialog.tsx`

**Features**:
- Title, message, and action buttons
- Optional text input for confirmation
- Danger variant with red styling
- Async action support with loading state

**Usage**:
```typescript
<ConfirmationDialog
  open={showDialog}
  title="Reset to Factory Defaults"
  message="This will delete all assessments, POAMs, and evidence. This action cannot be undone."
  confirmText="DELETE"
  onConfirm={handleFactoryReset}
  onCancel={() => setShowDialog(false)}
  severity="error"
  requireTextConfirmation
/>
```

## Part 5: File Storage Structure

### Create Directories
```
project-root/
├── backups/           (Database backups)
├── exports/           (Generated export files)
└── uploads/
    └── imports/       (Uploaded import files)
```

### Backup File Naming Convention
```
backup_YYYY-MM-DD_HHmmss.db
Example: backup_2025-11-11_154530.db
```

## Technical Requirements

### Frontend
- Use React Hook Form for form handling
- Implement proper loading states
- Show progress for long operations
- Use MUI Snackbar for notifications
- Handle errors gracefully
- Validate file uploads (size, type)
- Implement optimistic UI updates

### Backend
- Use multer for file uploads
- Validate all inputs
- Use transactions for data operations
- Implement proper error handling
- Add rate limiting for backup/restore
- Log all data management actions
- Create automatic backups before destructive operations

### Security
- Validate backup file integrity
- Sanitize import data
- Require confirmation for destructive actions
- Log all data management operations
- Implement backup retention policy

## Testing Checklist

### Preferences Tab
- [ ] Save preferences successfully
- [ ] Reset to defaults works
- [ ] Form validation works
- [ ] Changes reflect in UI immediately
- [ ] Error handling works

### Data Management Tab
- [ ] Create backup successfully
- [ ] Restore from backup works
- [ ] Export data in all formats
- [ ] Import data successfully
- [ ] Confirmation dialogs appear
- [ ] Destructive actions work correctly
- [ ] Progress indicators show
- [ ] Error messages are clear

### Backend APIs
- [ ] All endpoints return correct responses
- [ ] File uploads work
- [ ] Backups are valid SQLite files
- [ ] Exports contain correct data
- [ ] Imports validate data
- [ ] Transactions rollback on error

## Code Standards
- Follow existing TypeScript patterns
- Use dark theme colors consistently
- Match existing component styling
- Implement proper error boundaries
- Add JSDoc comments for complex functions
- Use meaningful variable names
- Keep components under 300 lines
- Extract reusable logic to hooks

## Success Criteria
1. ✅ Preferences tab fully functional with save/reset
2. ✅ Data Management tab with all features working
3. ✅ Backup and restore working correctly
4. ✅ Export/import in multiple formats
5. ✅ Confirmation dialogs for destructive actions
6. ✅ Proper error handling and user feedback
7. ✅ All APIs tested and working
8. ✅ No TypeScript errors
9. ✅ Dark theme consistent throughout
10. ✅ Production-ready code quality

## Dependencies
- Existing settings infrastructure (Phase 8.1-8.3)
- MUI components and theme
- Settings service and APIs
- File upload middleware (multer)
- Excel export library (if not already installed)

## Estimated Completion Time
- Part 1 (Preferences): 2-3 hours
- Part 2 (Data Management UI): 3-4 hours
- Part 3 (Backend APIs): 3-4 hours
- Part 4 (Testing & Polish): 2 hours
- **Total**: 10-13 hours

## Next Steps After Completion
After Phase 8.4 is complete, the Settings page will be fully functional. Next phases will focus on:
- Phase 8.5: UI/UX improvements (loading states, error handling)
- Phase 8.6: Advanced features (bulk operations, keyboard shortcuts)
- Phase 8.7: Documentation and user guide
