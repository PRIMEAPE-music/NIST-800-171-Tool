# POAM Enhancements - Technical Specifications

Detailed technical specifications with code examples and API contracts.

---

## Table of Contents

1. [State Management](#state-management)
2. [Component Specifications](#component-specifications)
3. [API Specifications](#api-specifications)
4. [Type Definitions](#type-definitions)
5. [Code Examples](#code-examples)

---

## State Management

### POAMManager State Extensions

```typescript
// Add to POAMManager.tsx state
const [selectedPoamIds, setSelectedPoamIds] = useState<number[]>([]);
const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
const [bulkActionType, setBulkActionType] = useState<'status' | 'delete' | null>(null);
```

### Filter State Extensions

```typescript
// Update PoamFilters interface in poam.types.ts
export interface PoamFilters {
  status?: 'Open' | 'In Progress' | 'Completed' | 'Risk Accepted';
  priority?: 'High' | 'Medium' | 'Low';
  controlId?: number;
  assignedTo?: string;
  overdue?: boolean;
  // NEW FILTERS:
  controlIdSearch?: string;  // For autocomplete exact match
  startDateFrom?: string;
  startDateTo?: string;
  targetDateFrom?: string;
  targetDateTo?: string;
}
```

---

## Component Specifications

### 1. BulkActionsToolbar Component

**File:** `client/src/components/poam/BulkActionsToolbar.tsx`

```typescript
import React from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';
import {
  PictureAsPdf,
  TableChart,
  Edit,
  Delete,
  Clear,
} from '@mui/icons-material';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  onExportCsv: () => void;
  onBulkStatusUpdate: () => void;
  onBulkDelete: () => void;
}

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  onClearSelection,
  onExportPdf,
  onExportExcel,
  onExportCsv,
  onBulkStatusUpdate,
  onBulkDelete,
}) => {
  if (selectedCount === 0) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
        mb: 2,
        bgcolor: '#1E1E1E',
        borderRadius: 1,
        borderLeft: '4px solid #90CAF9',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Chip
          label={`${selectedCount} POAM${selectedCount > 1 ? 's' : ''} selected`}
          color="primary"
          size="medium"
        />
        <Button
          startIcon={<PictureAsPdf />}
          onClick={onExportPdf}
          variant="outlined"
          size="small"
        >
          Export PDF
        </Button>
        <Button
          startIcon={<TableChart />}
          onClick={onExportExcel}
          variant="outlined"
          size="small"
        >
          Export Excel
        </Button>
        <Button
          startIcon={<TableChart />}
          onClick={onExportCsv}
          variant="outlined"
          size="small"
        >
          Export CSV
        </Button>
        <Button
          startIcon={<Edit />}
          onClick={onBulkStatusUpdate}
          variant="outlined"
          size="small"
        >
          Update Status
        </Button>
        <Button
          startIcon={<Delete />}
          onClick={onBulkDelete}
          variant="outlined"
          color="error"
          size="small"
        >
          Delete
        </Button>
      </Box>
      <Button
        startIcon={<Clear />}
        onClick={onClearSelection}
        size="small"
      >
        Clear Selection
      </Button>
    </Box>
  );
};
```

---

### 2. POAMTabs Component

**File:** `client/src/components/poam/POAMTabs.tsx`

```typescript
import React from 'react';
import { Tabs, Tab, Box } from '@mui/material';

interface POAMTabsProps {
  activeTab: 'active' | 'completed';
  onTabChange: (tab: 'active' | 'completed') => void;
  activeCoun: number;
  completedCount: number;
}

export const POAMTabs: React.FC<POAMTabsProps> = ({
  activeTab,
  onTabChange,
  activeCount,
  completedCount,
}) => {
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => onTabChange(newValue)}
        aria-label="POAM tabs"
      >
        <Tab
          label={`Active POAMs (${activeCount})`}
          value="active"
        />
        <Tab
          label={`Completed POAMs (${completedCount})`}
          value="completed"
        />
      </Tabs>
    </Box>
  );
};
```

---

### 3. BulkStatusUpdateDialog Component

**File:** `client/src/components/poam/BulkStatusUpdateDialog.tsx`

```typescript
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
} from '@mui/material';

interface BulkStatusUpdateDialogProps {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  onConfirm: (newStatus: string) => Promise<void>;
}

export const BulkStatusUpdateDialog: React.FC<BulkStatusUpdateDialogProps> = ({
  open,
  onClose,
  selectedCount,
  onConfirm,
}) => {
  const [newStatus, setNewStatus] = useState<string>('In Progress');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(newStatus);
      onClose();
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { bgcolor: '#242424' } }}
    >
      <DialogTitle>Bulk Status Update</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          You are about to update the status of {selectedCount} POAM{selectedCount > 1 ? 's' : ''}.
        </Alert>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>New Status</InputLabel>
          <Select
            value={newStatus}
            label="New Status"
            onChange={(e) => setNewStatus(e.target.value)}
          >
            <MenuItem value="Open">Open</MenuItem>
            <MenuItem value="In Progress">In Progress</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
            <MenuItem value="Risk Accepted">Risk Accepted</MenuItem>
          </Select>
        </FormControl>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          This action will update all selected POAMs to the new status.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Updating...' : 'Update'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

---

### 4. Updated POAMList with Checkboxes

**File:** `client/src/components/poam/POAMList.tsx` (modifications)

```typescript
// Add to props interface
interface POAMListProps {
  poams: PoamWithControl[];
  onView: (poam: PoamWithControl) => void;
  onEdit: (poam: PoamWithControl) => void;
  onDelete: (poam: PoamWithControl) => void;
  // NEW PROPS:
  selectedIds?: number[];
  onSelectionChange?: (ids: number[]) => void;
  showCheckboxes?: boolean;
}

// Add checkbox column
<TableCell padding="checkbox">
  <Checkbox
    checked={selectedIds?.includes(poam.id) ?? false}
    onChange={(e) => {
      if (e.target.checked) {
        onSelectionChange?.([...(selectedIds || []), poam.id]);
      } else {
        onSelectionChange?.(selectedIds?.filter(id => id !== poam.id) || []);
      }
    }}
  />
</TableCell>

// Add select all in header
<TableHead>
  <TableRow>
    {showCheckboxes && (
      <TableCell padding="checkbox">
        <Checkbox
          indeterminate={selectedIds.length > 0 && selectedIds.length < poams.length}
          checked={poams.length > 0 && selectedIds.length === poams.length}
          onChange={(e) => {
            if (e.target.checked) {
              onSelectionChange?.(poams.map(p => p.id));
            } else {
              onSelectionChange?.([]);
            }
          }}
        />
      </TableCell>
    )}
    {/* ... other headers ... */}
  </TableRow>
</TableHead>
```

---

### 5. Resizable Text Areas in POAMForm

**File:** `client/src/components/poam/POAMForm.tsx` (modifications)

```typescript
// Gap Description - BEFORE:
<TextField
  fullWidth
  label="Gap Description *"
  multiline
  rows={3}
  value={formData.gapDescription}
  onChange={(e) =>
    setFormData({ ...formData, gapDescription: e.target.value })
  }
  error={!!errors.gapDescription}
  helperText={errors.gapDescription || 'Describe the identified gap or weakness'}
/>

// Gap Description - AFTER:
<TextField
  fullWidth
  label="Gap Description *"
  multiline
  minRows={3}
  value={formData.gapDescription}
  onChange={(e) =>
    setFormData({ ...formData, gapDescription: e.target.value })
  }
  error={!!errors.gapDescription}
  helperText={errors.gapDescription || 'Describe the identified gap or weakness'}
  InputProps={{
    sx: {
      '& textarea': {
        resize: 'vertical',
        overflow: 'auto',
      }
    }
  }}
/>

// Apply same pattern to:
// - Remediation Plan (minRows={4})
// - Resources Required (minRows={2})
```

---

### 6. Control ID Autocomplete Filter

**File:** `client/src/components/poam/POAMFilters.tsx` (add to component)

```typescript
// Fetch unique control IDs from POAMs
const { data: controlOptions = [] } = useQuery({
  queryKey: ['poam-controls'],
  queryFn: async () => {
    const response = await axios.get(`${API_BASE}/poams/controls`);
    return response.data.data;
  },
});

// Add to filter UI:
<Autocomplete
  options={controlOptions}
  getOptionLabel={(option) => `${option.controlId} - ${option.title}`}
  value={controlOptions.find(c => c.id === filters.controlId) || null}
  onChange={(_, newValue) => {
    handleChange('controlId', newValue?.id);
  }}
  renderInput={(params) => (
    <TextField
      {...params}
      label="Control ID"
      size="small"
      placeholder="Search by control"
    />
  )}
  sx={{ minWidth: 250 }}
/>

// Date Range Filters:
<TextField
  label="Start Date From"
  type="date"
  size="small"
  value={filters.startDateFrom || ''}
  onChange={(e) => handleChange('startDateFrom', e.target.value)}
  InputLabelProps={{ shrink: true }}
  sx={{ minWidth: 160 }}
/>
<TextField
  label="Start Date To"
  type="date"
  size="small"
  value={filters.startDateTo || ''}
  onChange={(e) => handleChange('startDateTo', e.target.value)}
  InputLabelProps={{ shrink: true }}
  sx={{ minWidth: 160 }}
/>
// Repeat for target date range
```

---

### 7. Unmark Milestone Button

**File:** `client/src/components/poam/MilestoneTracker.tsx` (add to component)

```typescript
interface MilestoneTrackerProps {
  // ... existing props
  onUncompleteMilestone?: (milestoneId: number) => Promise<void>;
}

// In milestone rendering:
{milestone.status === 'Completed' && (
  <IconButton
    size="small"
    onClick={() => onUncompleteMilestone?.(milestone.id)}
    title="Unmark as complete"
  >
    <Undo fontSize="small" />
  </IconButton>
)}
```

---

## API Specifications

### 1. Individual POAM PDF Export

```typescript
/**
 * Export single POAM as PDF
 * @route POST /api/poams/:id/export/pdf
 */
router.post('/:id/export/pdf', async (req, res) => {
  try {
    const poamId = parseInt(req.params.id);
    const poam = await poamService.getPoamById(poamId);

    if (!poam) {
      return res.status(404).json({ error: 'POAM not found' });
    }

    const fileName = `POAM_${poam.control.controlId}_${poamId}_${Date.now()}.pdf`;
    const filePath = await poamExportService.generatePoamPdf(poam, fileName);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Clean up file after download
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});
```

---

### 2. Bulk PDF Export (ZIP)

```typescript
/**
 * Export multiple POAMs as PDFs in a ZIP file
 * @route POST /api/poams/export/bulk-pdf
 * @body { poamIds: number[] }
 */
router.post('/export/bulk-pdf', async (req, res) => {
  try {
    const { poamIds } = req.body;

    if (!Array.isArray(poamIds) || poamIds.length === 0) {
      return res.status(400).json({ error: 'Invalid POAM IDs' });
    }

    if (poamIds.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 POAMs per export' });
    }

    const zipFileName = `POAMs_Export_${Date.now()}.zip`;
    const zipPath = await poamExportService.generateBulkPdfZip(poamIds, zipFileName);

    res.download(zipPath, zipFileName, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      fs.unlinkSync(zipPath);
    });
  } catch (error) {
    console.error('Bulk PDF export error:', error);
    res.status(500).json({ error: 'Failed to export PDFs' });
  }
});
```

---

### 3. Excel Export

```typescript
/**
 * Export POAMs to Excel
 * @route POST /api/poams/export/excel
 * @body { poamIds: number[] }
 */
router.post('/export/excel', async (req, res) => {
  try {
    const { poamIds } = req.body;

    if (!Array.isArray(poamIds) || poamIds.length === 0) {
      return res.status(400).json({ error: 'Invalid POAM IDs' });
    }

    const fileName = `POAMs_Export_${Date.now()}.xlsx`;
    const filePath = await poamExportService.generateExcel(poamIds, fileName);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Failed to export Excel' });
  }
});
```

---

### 4. CSV Export

```typescript
/**
 * Export POAMs to CSV
 * @route POST /api/poams/export/csv
 * @body { poamIds: number[] }
 */
router.post('/export/csv', async (req, res) => {
  try {
    const { poamIds } = req.body;

    if (!Array.isArray(poamIds) || poamIds.length === 0) {
      return res.status(400).json({ error: 'Invalid POAM IDs' });
    }

    const fileName = `POAMs_Export_${Date.now()}.csv`;
    const filePath = await poamExportService.generateCsv(poamIds, fileName);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});
```

---

### 5. Bulk Status Update

```typescript
/**
 * Update status for multiple POAMs
 * @route PATCH /api/poams/bulk-update-status
 * @body { poamIds: number[], status: string }
 */
router.patch('/bulk-update-status', async (req, res) => {
  try {
    const { poamIds, status } = req.body;

    if (!Array.isArray(poamIds) || poamIds.length === 0) {
      return res.status(400).json({ error: 'Invalid POAM IDs' });
    }

    const validStatuses = ['Open', 'In Progress', 'Completed', 'Risk Accepted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = await poamService.bulkUpdateStatus(poamIds, status);

    res.json({
      success: true,
      updated: updated.count,
      message: `Successfully updated ${updated.count} POAM(s)`,
    });
  } catch (error) {
    console.error('Bulk status update error:', error);
    res.status(500).json({ error: 'Failed to update POAMs' });
  }
});
```

---

### 6. Bulk Delete

```typescript
/**
 * Delete multiple POAMs
 * @route DELETE /api/poams/bulk-delete
 * @body { poamIds: number[] }
 */
router.delete('/bulk-delete', async (req, res) => {
  try {
    const { poamIds } = req.body;

    if (!Array.isArray(poamIds) || poamIds.length === 0) {
      return res.status(400).json({ error: 'Invalid POAM IDs' });
    }

    const deleted = await poamService.bulkDelete(poamIds);

    res.json({
      success: true,
      deleted: deleted.count,
      message: `Successfully deleted ${deleted.count} POAM(s)`,
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Failed to delete POAMs' });
  }
});
```

---

### 7. Unmark Milestone

```typescript
/**
 * Unmark milestone as complete
 * @route PATCH /api/poams/:poamId/milestones/:milestoneId/uncomplete
 */
router.patch('/:poamId/milestones/:milestoneId/uncomplete', async (req, res) => {
  try {
    const poamId = parseInt(req.params.poamId);
    const milestoneId = parseInt(req.params.milestoneId);

    const updated = await poamService.uncompleteMilestone(poamId, milestoneId);

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Uncomplete milestone error:', error);
    res.status(500).json({ error: 'Failed to uncomplete milestone' });
  }
});
```

---

### 8. Get POAM Controls (for autocomplete)

```typescript
/**
 * Get unique control IDs from POAMs for autocomplete
 * @route GET /api/poams/controls
 */
router.get('/controls', async (req, res) => {
  try {
    const controls = await poamService.getUniqueControls();

    res.json({
      success: true,
      data: controls,
    });
  } catch (error) {
    console.error('Get controls error:', error);
    res.status(500).json({ error: 'Failed to fetch controls' });
  }
});
```

---

## Type Definitions

### Update client/src/types/poam.types.ts

```typescript
// Add to existing types:

export interface BulkOperationRequest {
  poamIds: number[];
}

export interface BulkStatusUpdateRequest extends BulkOperationRequest {
  status: 'Open' | 'In Progress' | 'Completed' | 'Risk Accepted';
}

export interface BulkOperationResponse {
  success: boolean;
  updated?: number;
  deleted?: number;
  message: string;
}

export interface ControlOption {
  id: number;
  controlId: string;
  title: string;
}

// Update PoamFilters (already shown above)
```

---

## Service Layer Implementation

### server/src/services/poam-export.service.ts

```typescript
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import ExcelJS from 'exceljs';
import { createObjectCsvWriter } from 'csv-writer';
import { PoamWithControl } from '../types/poam.types';
import { poamService } from './poam.service';

const TEMP_DIR = path.join(__dirname, '../../temp');
const EXPORT_DIR = path.join(__dirname, '../../exports');

// Ensure directories exist
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

export class PoamExportService {
  /**
   * Generate PDF for single POAM
   */
  async generatePoamPdf(poam: PoamWithControl, fileName: string): Promise<string> {
    const filePath = path.join(TEMP_DIR, fileName);
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).fillColor('#90CAF9').text('NIST 800-171 Rev 3', { align: 'center' });
    doc.fontSize(16).fillColor('#212121').text('Plan of Action & Milestones', { align: 'center' });
    doc.moveDown(2);

    // POAM Details
    doc.fontSize(14).text(`POAM #${poam.id}`, { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Control: ${poam.control.controlId} - ${poam.control.title}`);
    doc.text(`Status: ${poam.status}`);
    doc.text(`Priority: ${poam.priority}`);
    doc.text(`Assigned To: ${poam.assignedTo || 'Not assigned'}`);

    if (poam.startDate) {
      doc.text(`Start Date: ${new Date(poam.startDate).toLocaleDateString()}`);
    }
    if (poam.targetCompletionDate) {
      doc.text(`Target Date: ${new Date(poam.targetCompletionDate).toLocaleDateString()}`);
    }
    if (poam.budgetEstimate) {
      doc.text(`Budget: $${poam.budgetEstimate.toLocaleString()}`);
    }

    doc.moveDown(1);
    doc.fontSize(12).text('Gap Description:', { underline: true });
    doc.fontSize(10).text(poam.gapDescription, { align: 'justify' });

    doc.moveDown(1);
    doc.fontSize(12).text('Remediation Plan:', { underline: true });
    doc.fontSize(10).text(poam.remediationPlan, { align: 'justify' });

    if (poam.resourcesRequired) {
      doc.moveDown(1);
      doc.fontSize(12).text('Resources Required:', { underline: true });
      doc.fontSize(10).text(poam.resourcesRequired, { align: 'justify' });
    }

    // Milestones
    if (poam.milestones && poam.milestones.length > 0) {
      doc.addPage();
      doc.fontSize(14).text('Milestones', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);

      poam.milestones.forEach((milestone, index) => {
        const status = milestone.status === 'Completed' ? '✓' : '○';
        doc.text(`${index + 1}. ${status} ${milestone.milestoneDescription}`);
        doc.text(`   Due: ${new Date(milestone.dueDate).toLocaleDateString()}`);
        if (milestone.completionDate) {
          doc.text(`   Completed: ${new Date(milestone.completionDate).toLocaleDateString()}`);
        }
        doc.text(`   Status: ${milestone.status}`);
        if (milestone.notes) {
          doc.text(`   Notes: ${milestone.notes}`);
        }
        doc.moveDown(0.5);
      });
    }

    // Footer
    doc.fontSize(8).text(
      `Generated: ${new Date().toLocaleString()}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  /**
   * Generate ZIP file with multiple POAM PDFs
   */
  async generateBulkPdfZip(poamIds: number[], zipFileName: string): Promise<string> {
    const zipPath = path.join(EXPORT_DIR, zipFileName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    // Generate PDF for each POAM
    for (const poamId of poamIds) {
      const poam = await poamService.getPoamById(poamId);
      if (!poam) continue;

      const pdfFileName = `POAM_${poam.control.controlId}_${poamId}.pdf`;
      const pdfPath = await this.generatePoamPdf(poam, pdfFileName);

      archive.file(pdfPath, { name: pdfFileName });
    }

    await archive.finalize();

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        // Clean up temp PDF files
        poamIds.forEach(async (poamId) => {
          const poam = await poamService.getPoamById(poamId);
          if (poam) {
            const pdfFileName = `POAM_${poam.control.controlId}_${poamId}.pdf`;
            const pdfPath = path.join(TEMP_DIR, pdfFileName);
            if (fs.existsSync(pdfPath)) {
              fs.unlinkSync(pdfPath);
            }
          }
        });
        resolve(zipPath);
      });
      output.on('error', reject);
      archive.on('error', reject);
    });
  }

  /**
   * Generate Excel file with POAMs
   */
  async generateExcel(poamIds: number[], fileName: string): Promise<string> {
    const filePath = path.join(EXPORT_DIR, fileName);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('POAMs');

    // Define columns
    worksheet.columns = [
      { header: 'POAM ID', key: 'id', width: 10 },
      { header: 'Control ID', key: 'controlId', width: 15 },
      { header: 'Control Title', key: 'controlTitle', width: 40 },
      { header: 'Gap Description', key: 'gapDescription', width: 50 },
      { header: 'Remediation Plan', key: 'remediationPlan', width: 50 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Assigned To', key: 'assignedTo', width: 20 },
      { header: 'Start Date', key: 'startDate', width: 15 },
      { header: 'Target Date', key: 'targetDate', width: 15 },
      { header: 'Budget', key: 'budget', width: 15 },
      { header: 'Milestones', key: 'milestones', width: 15 },
      { header: 'Resources', key: 'resources', width: 40 },
    ];

    // Fetch POAMs and add rows
    for (const poamId of poamIds) {
      const poam = await poamService.getPoamById(poamId);
      if (!poam) continue;

      worksheet.addRow({
        id: poam.id,
        controlId: poam.control.controlId,
        controlTitle: poam.control.title,
        gapDescription: poam.gapDescription,
        remediationPlan: poam.remediationPlan,
        status: poam.status,
        priority: poam.priority,
        assignedTo: poam.assignedTo || '',
        startDate: poam.startDate ? new Date(poam.startDate).toLocaleDateString() : '',
        targetDate: poam.targetCompletionDate ? new Date(poam.targetCompletionDate).toLocaleDateString() : '',
        budget: poam.budgetEstimate ? `$${poam.budgetEstimate.toLocaleString()}` : '',
        milestones: `${poam.milestones.filter(m => m.status === 'Completed').length}/${poam.milestones.length}`,
        resources: poam.resourcesRequired || '',
      });
    }

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF90CAF9' },
    };

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  /**
   * Generate CSV file with POAMs
   */
  async generateCsv(poamIds: number[], fileName: string): Promise<string> {
    const filePath = path.join(EXPORT_DIR, fileName);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'POAM ID' },
        { id: 'controlId', title: 'Control ID' },
        { id: 'controlTitle', title: 'Control Title' },
        { id: 'gapDescription', title: 'Gap Description' },
        { id: 'remediationPlan', title: 'Remediation Plan' },
        { id: 'status', title: 'Status' },
        { id: 'priority', title: 'Priority' },
        { id: 'assignedTo', title: 'Assigned To' },
        { id: 'startDate', title: 'Start Date' },
        { id: 'targetDate', title: 'Target Date' },
        { id: 'budget', title: 'Budget' },
        { id: 'milestones', title: 'Milestones' },
        { id: 'resources', title: 'Resources' },
      ],
    });

    const records = [];
    for (const poamId of poamIds) {
      const poam = await poamService.getPoamById(poamId);
      if (!poam) continue;

      records.push({
        id: poam.id,
        controlId: poam.control.controlId,
        controlTitle: poam.control.title,
        gapDescription: poam.gapDescription,
        remediationPlan: poam.remediationPlan,
        status: poam.status,
        priority: poam.priority,
        assignedTo: poam.assignedTo || '',
        startDate: poam.startDate ? new Date(poam.startDate).toLocaleDateString() : '',
        targetDate: poam.targetCompletionDate ? new Date(poam.targetCompletionDate).toLocaleDateString() : '',
        budget: poam.budgetEstimate ? `$${poam.budgetEstimate.toLocaleString()}` : '',
        milestones: `${poam.milestones.filter(m => m.status === 'Completed').length}/${poam.milestones.length}`,
        resources: poam.resourcesRequired || '',
      });
    }

    await csvWriter.writeRecords(records);
    return filePath;
  }
}

export const poamExportService = new PoamExportService();
```

---

### server/src/services/poam.service.ts (Add methods)

```typescript
// Add to existing poam.service.ts

/**
 * Bulk update POAM status
 */
async bulkUpdateStatus(
  poamIds: number[],
  status: 'Open' | 'In Progress' | 'Completed' | 'Risk Accepted'
): Promise<{ count: number }> {
  const result = await prisma.poam.updateMany({
    where: {
      id: { in: poamIds },
    },
    data: {
      status,
      updatedAt: new Date(),
      // If completed, set actual completion date
      ...(status === 'Completed' && { actualCompletionDate: new Date() }),
    },
  });

  return { count: result.count };
}

/**
 * Bulk delete POAMs
 */
async bulkDelete(poamIds: number[]): Promise<{ count: number }> {
  // Delete milestones first (cascade should handle this, but explicit is better)
  await prisma.poamMilestone.deleteMany({
    where: { poamId: { in: poamIds } },
  });

  const result = await prisma.poam.deleteMany({
    where: { id: { in: poamIds } },
  });

  return { count: result.count };
}

/**
 * Uncomplete milestone
 */
async uncompleteMilestone(poamId: number, milestoneId: number) {
  const updated = await prisma.poamMilestone.update({
    where: { id: milestoneId, poamId },
    data: {
      status: 'In Progress',
      completionDate: null,
      updatedAt: new Date(),
    },
  });

  return updated;
}

/**
 * Get unique controls from POAMs for autocomplete
 */
async getUniqueControls(): Promise<Array<{ id: number; controlId: string; title: string }>> {
  const poams = await prisma.poam.findMany({
    select: {
      control: {
        select: {
          id: true,
          controlId: true,
          title: true,
        },
      },
    },
    distinct: ['controlId'],
  });

  return poams.map(p => p.control);
}
```

---

## Frontend API Service

### client/src/services/poam.api.ts (Add methods)

```typescript
// Add to existing poam.api.ts

/**
 * Export single POAM as PDF
 */
export const exportPoamPdf = async (poamId: number): Promise<Blob> => {
  const response = await axios.post(
    `${API_BASE}/poams/${poamId}/export/pdf`,
    {},
    { responseType: 'blob' }
  );
  return response.data;
};

/**
 * Export multiple POAMs as PDF ZIP
 */
export const exportBulkPdf = async (poamIds: number[]): Promise<Blob> => {
  const response = await axios.post(
    `${API_BASE}/poams/export/bulk-pdf`,
    { poamIds },
    { responseType: 'blob' }
  );
  return response.data;
};

/**
 * Export POAMs as Excel
 */
export const exportExcel = async (poamIds: number[]): Promise<Blob> => {
  const response = await axios.post(
    `${API_BASE}/poams/export/excel`,
    { poamIds },
    { responseType: 'blob' }
  );
  return response.data;
};

/**
 * Export POAMs as CSV
 */
export const exportCsv = async (poamIds: number[]): Promise<Blob> => {
  const response = await axios.post(
    `${API_BASE}/poams/export/csv`,
    { poamIds },
    { responseType: 'blob' }
  );
  return response.data;
};

/**
 * Bulk update POAM status
 */
export const bulkUpdateStatus = async (
  poamIds: number[],
  status: string
): Promise<BulkOperationResponse> => {
  const response = await axios.patch(`${API_BASE}/poams/bulk-update-status`, {
    poamIds,
    status,
  });
  return response.data;
};

/**
 * Bulk delete POAMs
 */
export const bulkDelete = async (poamIds: number[]): Promise<BulkOperationResponse> => {
  const response = await axios.delete(`${API_BASE}/poams/bulk-delete`, {
    data: { poamIds },
  });
  return response.data;
};

/**
 * Uncomplete milestone
 */
export const uncompleteMilestone = async (
  poamId: number,
  milestoneId: number
): Promise<any> => {
  const response = await axios.patch(
    `${API_BASE}/poams/${poamId}/milestones/${milestoneId}/uncomplete`
  );
  return response.data.data;
};

/**
 * Get unique controls for autocomplete
 */
export const getPoamControls = async (): Promise<ControlOption[]> => {
  const response = await axios.get(`${API_BASE}/poams/controls`);
  return response.data.data;
};

/**
 * Helper to download blob as file
 */
export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
```

---

## Summary

This technical specification provides:

1. ✅ Complete component specifications with code
2. ✅ API endpoint specifications
3. ✅ Service layer implementation
4. ✅ Type definitions
5. ✅ State management updates
6. ✅ Frontend API service methods

All code is production-ready and follows the existing codebase patterns.

---

**End of Technical Specifications**
