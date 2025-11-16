# Phase 4: Frontend Component Cleanup

**Objective:** Remove M365 mapping-related frontend components and update parent components.

**Estimated Time:** 15-20 minutes

**Prerequisites:**
- Phase 3 completed successfully
- API routes cleaned up
- No applications currently running

---

## Step 1: Identify Component Dependencies

Find all components that use the tabs to be deleted:

```bash
cd /home/claude/client/src

echo "=== Files importing M365SettingsTab ==="
grep -r "M365SettingsTab" . --include="*.tsx" --include="*.ts"

echo ""
echo "=== Files importing M365RecommendationsTab ==="
grep -r "M365RecommendationsTab" . --include="*.tsx" --include="*.ts"
```

**Expected:** Should find ControlDetail.tsx or similar parent component

---

## Step 2: Update ControlDetail Component - Remove Imports

📁 **File:** `client/src/components/controls/ControlDetail.tsx` (or wherever control details are displayed)

🔍 **FIND:**
```typescript
import { M365SettingsTab } from './M365SettingsTab';
import { M365RecommendationsTab } from './M365RecommendationsTab';
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: M365 mapping tab imports - no longer mapping policies to controls
```

---

## Step 3: Update Tab Configuration

📁 **File:** `client/src/components/controls/ControlDetail.tsx`

🔍 **FIND:**
```typescript
const tabs = [
  { label: 'Overview', value: 'overview' },
  { label: 'Assessment', value: 'assessment' },
  { label: 'Evidence', value: 'evidence' },
  { label: 'M365 Settings', value: 'm365-settings' },
  { label: 'M365 Recommendations', value: 'm365-recommendations' },
  { label: 'Related Controls', value: 'related' },
];
```

✏️ **REPLACE WITH:**
```typescript
const tabs = [
  { label: 'Overview', value: 'overview' },
  { label: 'Assessment', value: 'assessment' },
  { label: 'Evidence', value: 'evidence' },
  { label: 'Related Controls', value: 'related' },
];
```

---

## Step 4: Remove Tab Content Rendering

📁 **File:** `client/src/components/controls/ControlDetail.tsx`

🔍 **FIND:**
```typescript
{activeTab === 'm365-settings' && (
  <M365SettingsTab controlId={control.id} />
)}

{activeTab === 'm365-recommendations' && (
  <M365RecommendationsTab controlId={control.id} />
)}
```

✏️ **REPLACE WITH:**
```typescript
{/* REMOVED: M365 mapping tabs - no longer mapping policies to controls */}
```

**OR if using a switch/case statement:**

🔍 **FIND:**
```typescript
case 'm365-settings':
  return <M365SettingsTab controlId={control.id} />;
case 'm365-recommendations':
  return <M365RecommendationsTab controlId={control.id} />;
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: M365 mapping tab cases
```

---

## Step 5: Update Default Tab Logic (if needed)

If the default tab was set to a deleted tab, update it:

📁 **File:** `client/src/components/controls/ControlDetail.tsx`

🔍 **FIND:**
```typescript
const [activeTab, setActiveTab] = useState('m365-settings');
```

✏️ **REPLACE WITH:**
```typescript
const [activeTab, setActiveTab] = useState('overview');
```

**OR**

🔍 **FIND:**
```typescript
const [activeTab, setActiveTab] = useState('m365-recommendations');
```

✏️ **REPLACE WITH:**
```typescript
const [activeTab, setActiveTab] = useState('overview');
```

---

## Step 6: Delete M365SettingsTab Component

```bash
cd /home/claude/client/src/components/controls
rm -f M365SettingsTab.tsx
```

**Verification:**
```bash
ls -l M365SettingsTab.tsx 2>&1 | grep -q "No such file" && echo "✓ M365SettingsTab.tsx deleted" || echo "✗ File still exists"
```

---

## Step 7: Delete M365RecommendationsTab Component

```bash
cd /home/claude/client/src/components/controls
rm -f M365RecommendationsTab.tsx
```

**Verification:**
```bash
ls -l M365RecommendationsTab.tsx 2>&1 | grep -q "No such file" && echo "✓ M365RecommendationsTab.tsx deleted" || echo "✗ File still exists"
```

---

## Step 8: Check for Other Component References

Search for any other references to deleted components:

```bash
cd /home/claude/client/src

# Check all TypeScript/TSX files
grep -r "M365SettingsTab\|M365RecommendationsTab" . --include="*.tsx" --include="*.ts" && echo "✗ Found references" || echo "✓ No references found"
```

**Expected:** "✓ No references found"

---

## Step 9: Update Navigation/Route Configuration (if applicable)

Check if there are route configurations that need updating:

```bash
cd /home/claude/client/src
find . -name "*routes*" -o -name "*router*" -o -name "App.tsx" | xargs grep -l "m365"
```

**If found, remove routes related to:**
- M365 settings pages
- M365 recommendations pages
- Gap analysis pages
- Policy mapping pages

---

## Step 10: Remove Dashboard Gap Analysis Widgets (if exist)

Check dashboard for gap analysis widgets:

```bash
cd /home/claude/client/src
grep -r "gap.analysis\|gapAnalysis" . --include="*.tsx" --include="*.ts"
```

**If found in dashboard components, remove:**

📁 **File:** `client/src/components/Dashboard.tsx` (or similar)

Remove any components/sections related to:
- Gap analysis charts
- Policy mapping statistics
- Control coverage metrics based on mappings

Replace with:
```typescript
{/* REMOVED: Gap analysis widget - no longer mapping policies to controls */}
```

---

## Step 11: Update Settings Page (if it has M365 mapping settings)

Check if Settings page has mapping-related configurations:

```bash
cd /home/claude/client/src
grep -r "auto.map\|autoMap\|settingsMap" . --include="*.tsx" --include="*.ts"
```

**If found in Settings components, remove:**
- Auto-mapping configuration options
- Mapping confidence thresholds
- Mapping refresh buttons

---

## Step 12: Compile Frontend

```bash
cd /home/claude/client
npm run build 2>&1 | tee /tmp/frontend-build.log

if grep -q "error TS\|Error:" /tmp/frontend-build.log; then
  echo "✗ Frontend compilation errors"
  grep -E "error TS|Error:" /tmp/frontend-build.log | head -20
else
  echo "✓ Frontend compiled successfully"
fi
```

---

## Step 13: Test Frontend in Development Mode

Start the development server:

```bash
cd /home/claude

# Start backend
cd server
npm run dev &
SERVER_PID=$!

# Start frontend
cd ../client
npm run dev &
CLIENT_PID=$!

sleep 10

echo "✓ Servers started - check http://localhost:5173"
echo "Navigate to a control and verify M365 tabs are gone"

# Cleanup after manual verification
read -p "Press enter after manual verification..."
kill $SERVER_PID $CLIENT_PID 2>/dev/null
```

---

## Step 14: Remove API Service Methods (if they exist)

Check for API service files that call deleted endpoints:

```bash
cd /home/claude/client/src
find . -name "*api*" -o -name "*service*" | xargs grep -l "recommendations\|improvement-actions\|gap-analysis"
```

**If found, remove methods:**

📁 **File:** `client/src/services/m365.service.ts` (or similar)

Remove methods like:
- `getRecommendations(controlId)`
- `getImprovementActions(controlId)`
- `getGapAnalysis()`
- `approveMapping(id)`
- `rejectMapping(id)`

Replace with:
```typescript
// REMOVED: Mapping-related API methods
```

---

## Phase 4 Verification Checklist

Before proceeding to Phase 5, verify:

- [ ] M365SettingsTab import removed from parent components
- [ ] M365RecommendationsTab import removed from parent components
- [ ] Tab configuration updated (M365 tabs removed from list)
- [ ] Tab content rendering removed
- [ ] Default tab logic updated (if needed)
- [ ] M365SettingsTab.tsx deleted
- [ ] M365RecommendationsTab.tsx deleted
- [ ] No remaining component references
- [ ] Routes updated (if applicable)
- [ ] Dashboard gap analysis removed (if existed)
- [ ] Settings page updated (if needed)
- [ ] API service methods removed (if existed)
- [ ] Frontend compiles successfully
- [ ] Manual UI verification passed (tabs gone from control detail)

**If any checks fail, review component modifications**

---

## Troubleshooting

### Issue: TypeScript Compilation Errors

**Solution:**
```bash
cd /home/claude/client
# Clear cache
rm -rf node_modules/.cache
rm -rf .vite

# Find remaining references
grep -rn "M365SettingsTab\|M365RecommendationsTab" src/

# Remove each reference manually
# Rebuild
npm run build
```

### Issue: Runtime Errors in Browser

**Solution:**
1. Open browser DevTools console
2. Look for import errors
3. Search codebase for the error source:
```bash
cd /home/claude/client/src
grep -rn "ERROR_TEXT_FROM_CONSOLE" .
```
4. Remove the problematic import/reference
5. Restart dev server

### Issue: UI Still Shows M365 Tabs

**Solution:**
```bash
# Clear browser cache and restart
cd /home/claude/client
npm run dev -- --force
```

Then hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

---

## Files Modified in This Phase

✅ **Modified:**
- `client/src/components/controls/ControlDetail.tsx`
- `client/src/components/Dashboard.tsx` (if existed)
- `client/src/components/Settings.tsx` (if had mapping settings)
- `client/src/services/m365.service.ts` (if existed)

❌ **Deleted:**
- `client/src/components/controls/M365SettingsTab.tsx`
- `client/src/components/controls/M365RecommendationsTab.tsx`

---

## Next Steps

Once all verifications pass, proceed to:
- **Phase 5: Data File Removal**

---

## Rollback Instructions

If issues occur:

```bash
cd /home/claude
git checkout backup-before-mapping-deletion client/src/
cd client
npm install
npm run build
```
