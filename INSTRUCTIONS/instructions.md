
## Phase 1: Backend API Updates

### Step 1.1: Add Manual Review Data to Control Mappings Response

📁 **File:** `server/src/services/policyViewer.service.ts`

🔍 **FIND:** The `getPolicyControlMappings` method (around line 150-200)

✏️ **UPDATE:** Add manual review data to the response. After the existing mapping logic, add:

```typescript
// After getting mapped controls, fetch manual reviews for all settings
const settingIds = mappedControls.flatMap(control => 
  control.mappedSettings?.map(s => s.settingId) || []
);

const manualReviews = await prisma.manualSettingReview.findMany({
  where: {
    settingId: { in: settingIds },
    policyId: policyId,
  },
  include: {
    evidenceFiles: true,
  },
});

const reviewMap = new Map(
  manualReviews.map(r => [
    r.settingId,
    {
      id: r.id,
      manualComplianceStatus: r.manualComplianceStatus,
      rationale: r.rationale,
      reviewedAt: r.reviewedAt,
      reviewedBy: r.reviewedBy,
      evidenceCount: r.evidenceFiles.length,
    },
  ])
);

// Attach manual reviews to settings
mappedControls.forEach(control => {
  if (control.mappedSettings) {
    control.mappedSettings = control.mappedSettings.map(setting => ({
      ...setting,
      manualReview: reviewMap.get(setting.settingId) || null,
    }));
  }
});
```

---

## Phase 2: Frontend Type Updates

### Step 2.1: Update TypeScript Types

📁 **File:** `client/src/types/policyViewer.types.ts`

➕ **ADD AFTER:** existing interfaces

```typescript
export interface ManualReviewSummary {
  id: number;
  manualComplianceStatus: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | null;
  rationale: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  evidenceCount: number;
}

export interface MappedSettingWithReview extends MappedSetting {
  manualReview?: ManualReviewSummary | null;
}
```

🔍 **FIND:** `export interface MappedControl`

✏️ **UPDATE:** Change `mappedSettings` type:

```typescript
export interface MappedControl {
  controlId: string;
  controlTitle: string;
  mappingConfidence: 'High' | 'Medium' | 'Low';
  mappingNotes?: string;
  mappedSettings?: MappedSettingWithReview[]; // UPDATED
}
```

---

## Phase 3: Control Mappings Tab Component Update

### Step 3.1: Update ControlMappingsTab Component

📁 **File:** `client/src/components/policy-viewer/ControlMappingsTab.tsx`

🔍 **FIND:** Import statements at the top

✏️ **ADD:** New imports:

```typescript
import ManualComplianceDialog from './ManualComplianceDialog';
import { 
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
```

🔍 **FIND:** The component state declarations

✏️ **ADD:** New state for dialog:

```typescript
const [complianceDialogOpen, setComplianceDialogOpen] = useState(false);
const [selectedSetting, setSelectedSetting] = useState<any>(null);
```

🔍 **FIND:** The Card component that displays each control (around the mapping confidence chips)

✏️ **UPDATE:** Add manual review badge in the card header:

```typescript
<CardContent>
  <Box 
    display="flex" 
    justifyContent="space-between" 
    alignItems="center"
    onClick={() => setExpandedControl(expandedControl === control.controlId ? null : control.controlId)}
    sx={{ cursor: 'pointer' }}
  >
    <Box>
      <Typography variant="h6">{control.controlTitle}</Typography>
      <Typography variant="caption" color="text.secondary">
        {control.controlId}
      </Typography>
    </Box>
    
    <Box display="flex" alignItems="center" gap={1}>
      {/* Show reviewed badge if any settings are manually reviewed */}
      {control.mappedSettings?.some(s => s.manualReview?.manualComplianceStatus) && (
        <Chip
          icon={<VerifiedIcon />}
          label="Reviewed"
          size="small"
          color="primary"
          variant="outlined"
        />
      )}
      
      <IconButton size="small">
        {expandedControl === control.controlId ? <ExpandLess /> : <ExpandMore />}
      </IconButton>
    </Box>
  </Box>
</CardContent>
```

🔍 **FIND:** Inside the Collapse section where settings are displayed (the expanded details)

✏️ **UPDATE:** Add manual review info and mark compliance button after Actual Value:

```typescript
{/* After Actual Value section */}

{/* Manual Review Section */}
{setting.manualReview && (
  <Box mb={2}>
    <Typography variant="subtitle2" gutterBottom sx={{ color: '#B0B0B0' }}>
      Manual Review:
    </Typography>
    <Paper sx={{ p: 1.5, bgcolor: '#1a1a1a' }}>
      <Box display="flex" gap={1} mb={1} flexWrap="wrap" alignItems="center">
        <Chip
          label={
            setting.manualReview.manualComplianceStatus === 'COMPLIANT'
              ? 'Compliant'
              : setting.manualReview.manualComplianceStatus === 'PARTIAL'
              ? 'Partial'
              : 'Non-Compliant'
          }
          size="small"
          color={
            setting.manualReview.manualComplianceStatus === 'COMPLIANT'
              ? 'success'
              : setting.manualReview.manualComplianceStatus === 'PARTIAL'
              ? 'warning'
              : 'error'
          }
        />
        {setting.manualReview.reviewedAt && (
          <Chip
            label={`Reviewed ${new Date(setting.manualReview.reviewedAt).toLocaleDateString()}`}
            size="small"
            variant="outlined"
          />
        )}
        {setting.manualReview.evidenceCount > 0 && (
          <Chip
            label={`${setting.manualReview.evidenceCount} evidence file${
              setting.manualReview.evidenceCount > 1 ? 's' : ''
            }`}
            size="small"
            variant="outlined"
          />
        )}
      </Box>
      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
        <strong>Rationale:</strong> {setting.manualReview.rationale}
      </Typography>
    </Paper>
  </Box>
)}

{/* Mark Compliance Button */}
<Box mt={2}>
  <Button
    variant={setting.manualReview ? 'outlined' : 'contained'}
    size="small"
    startIcon={setting.manualReview ? <EditIcon /> : <CheckCircleIcon />}
    onClick={(e) => {
      e.stopPropagation();
      setSelectedSetting({
        id: setting.settingId,
        displayName: setting.settingName,
        manualReview: setting.manualReview,
      });
      setComplianceDialogOpen(true);
    }}
  >
    {setting.manualReview ? 'Update Review' : 'Mark Compliance'}
  </Button>
</Box>
```

🔍 **FIND:** End of the component (before the closing `</Box>` and `export`)

✏️ **ADD:** Dialog component:

```typescript
{/* Manual Compliance Dialog */}
{selectedSetting && (
  <ManualComplianceDialog
    open={complianceDialogOpen}
    onClose={() => {
      setComplianceDialogOpen(false);
      setSelectedSetting(null);
    }}
    settingId={selectedSetting.id}
    policyId={policyId}
    controlId={undefined}
    settingName={selectedSetting.displayName}
    currentStatus={selectedSetting.manualReview?.manualComplianceStatus || null}
    currentRationale={selectedSetting.manualReview?.rationale || ''}
    onSaved={() => {
      // Reload the control mappings to show updated status
      loadControlMappings();
    }}
  />
)}
```

🔍 **FIND:** The `loadControlMappings` function (or wherever data is fetched)

✏️ **ENSURE:** It's accessible for the dialog's `onSaved` callback. If it's not already defined, extract the data loading logic into a function.

---

## Phase 4: Create Manual Compliance Dialog Component

### Step 4.1: Create the Dialog Component

📁 **File:** `client/src/components/policy-viewer/ManualComplianceDialog.tsx`

🔄 **CREATE NEW FILE:** (Use the complete component code I provided earlier - it's ready to use as-is)

---

## Phase 5: Database Migration

### Step 5.1: Create and Run Migration

📁 **Terminal Commands:**

```bash
cd server

# Create migration
npx prisma migrate dev --name add_manual_review_evidence

# Generate Prisma client
npx prisma generate
```

📁 **File:** The migration will be auto-created, but verify it includes:

```sql
CREATE TABLE "manual_review_evidence" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "review_id" INTEGER NOT NULL,
    "evidence_id" INTEGER NOT NULL,
    "uploaded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "manual_review_evidence_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "manual_setting_reviews" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "manual_review_evidence_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "manual_review_evidence_review_id_evidence_id_key" ON "manual_review_evidence"("review_id", "evidence_id");
CREATE INDEX "manual_review_evidence_review_id_idx" ON "manual_review_evidence"("review_id");
CREATE INDEX "manual_review_evidence_evidence_id_idx" ON "manual_review_evidence"("evidence_id");
```

---

## Phase 6: Backend Service Files

### Step 6.1: Create Manual Review Evidence Service

📁 **File:** `server/src/services/manualReviewEvidence.service.ts`

🔄 **CREATE NEW FILE:** (Use the complete service code I provided earlier)

### Step 6.2: Update Manual Review Routes

📁 **File:** `server/src/routes/manualReview.routes.ts`

✏️ **ADD:** Evidence upload routes (code provided earlier)

### Step 6.3: Update Manual Review Controller

📁 **File:** `server/src/controllers/manualReview.controller.ts`

✏️ **ADD:** Evidence methods (code provided earlier)

---

## Testing Checklist

✅ **After Implementation:**

1. Navigate to Policy Viewer → Select any policy
2. Go to "Control Mappings" tab
3. Expand a control that has settings
4. Verify "Mark Compliance" button appears
5. Click button → Dialog opens
6. Select compliance status
7. Enter rationale
8. Upload an image
9. Save
10. Verify "Reviewed" badge appears next to control name
11. Expand control again → verify review info displays
12. Verify "Mark Compliance" changes to "Update Review"

---

**This implementation keeps everything in the Control Mappings tab and adds the visual badge you wanted!** The badge appears next to the expand/collapse arrow when any setting in that control has been manually reviewed.