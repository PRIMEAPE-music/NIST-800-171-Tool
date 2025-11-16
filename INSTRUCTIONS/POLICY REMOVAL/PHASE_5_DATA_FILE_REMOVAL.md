# Phase 5: Data File Removal

**Objective:** Remove mapping data files and update any code that references them.

**Estimated Time:** 10-15 minutes

**Prerequisites:**
- Phase 4 completed successfully
- Frontend components cleaned up
- No applications currently running

---

## Step 1: Locate Data Files

List all mapping-related data files:

```bash
cd /home/claude/data

echo "=== Mapping Data Files ==="
ls -lh control-settings-mappings.json 2>/dev/null || echo "control-settings-mappings.json not found"
ls -lh control-m365-mappings.json 2>/dev/null || echo "control-m365-mappings.json not found"

echo ""
echo "=== All M365-Related Data Files ==="
ls -lh *m365* *M365* 2>/dev/null || echo "No M365 data files found"
```

---

## Step 2: Check for File References in Backend

Search for code that loads these data files:

```bash
cd /home/claude

echo "=== Backend References ==="
grep -r "control-settings-mappings.json" server/src --include="*.ts"
grep -r "control-m365-mappings.json" server/src --include="*.ts"

echo ""
echo "=== Frontend References ==="
grep -r "control-settings-mappings.json" client/src --include="*.ts" --include="*.tsx"
grep -r "control-m365-mappings.json" client/src --include="*.ts" --include="*.tsx"
```

**Note:** Any files found will need to be updated

---

## Step 3: Update Backend Code - Remove Data File Loading

**If settingsMapper.service.ts still has references (though it should be deleted):**

Search for any remaining services that load these files:

```bash
cd /home/claude/server/src
grep -r "readFileSync.*control-.*-mappings" . --include="*.ts"
```

**For each file found:**

📁 **File:** `server/src/services/[service-name].ts`

🔍 **FIND:**
```typescript
import * as fs from 'fs';
import * as path from 'path';

// Load settings mappings
const mappingsPath = path.join(__dirname, '../../../data/control-settings-mappings.json');
const mappingsData = fs.readFileSync(mappingsPath, 'utf-8');
const settingsMappings = JSON.parse(mappingsData);
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: Settings mappings data file loading - no longer mapping policies to controls
```

---

## Step 4: Update Data Loading Scripts (if they exist)

Check for any data import/seed scripts:

```bash
cd /home/claude
find . -name "seed.ts" -o -name "import*.ts" -o -name "load*.ts" | xargs grep -l "control-.*-mappings"
```

**For each script found:**

📁 **File:** `server/src/scripts/[script-name].ts`

Remove or comment out sections that load mapping data files:

```typescript
// REMOVED: Control-policy mapping data import
```

---

## Step 5: Update Data Directory README (if exists)

Check if there's documentation about data files:

```bash
cd /home/claude/data
ls -l README.md 2>/dev/null || echo "No README found"
```

**If exists:**

📁 **File:** `data/README.md`

Remove or update sections describing:
- `control-settings-mappings.json`
- `control-m365-mappings.json`
- Policy mapping data structures
- Auto-mapping configuration

---

## Step 6: Backup Data Files (Optional)

Before deletion, optionally move to backup directory:

```bash
cd /home/claude
mkdir -p .backups/mapping-data

# Move files to backup
mv data/control-settings-mappings.json .backups/mapping-data/ 2>/dev/null || echo "control-settings-mappings.json not found"
mv data/control-m365-mappings.json .backups/mapping-data/ 2>/dev/null || echo "control-m365-mappings.json not found"

echo "✓ Data files backed up to .backups/mapping-data/"
```

**Skip to Step 8 if you backed up**

---

## Step 7: Delete Data Files (Alternative to Backup)

If not backing up, delete the files:

```bash
cd /home/claude/data
rm -f control-settings-mappings.json
rm -f control-m365-mappings.json
```

**Verification:**
```bash
ls -l control-settings-mappings.json 2>&1 | grep -q "No such file" && echo "✓ control-settings-mappings.json deleted" || echo "✗ File still exists"
ls -l control-m365-mappings.json 2>&1 | grep -q "No such file" && echo "✓ control-m365-mappings.json deleted" || echo "✗ File still exists"
```

---

## Step 8: Verify No File References Remain

```bash
cd /home/claude

# Check all TypeScript files
grep -r "control-settings-mappings\|control-m365-mappings" . \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=.backups \
  && echo "✗ Found references to deleted files" \
  || echo "✓ No references found"
```

**Expected:** "✓ No references found"

---

## Step 9: Update .gitignore (if needed)

Check if data files were tracked in git:

```bash
cd /home/claude
git ls-files | grep -E "control-.*-mappings.json"
```

**If files were tracked:**

```bash
# Remove from git tracking
git rm --cached data/control-settings-mappings.json 2>/dev/null || true
git rm --cached data/control-m365-mappings.json 2>/dev/null || true

# Commit the removal
git add -A
git commit -m "Remove policy mapping data files"
```

---

## Step 10: Update Data Directory Structure Documentation

If you have project documentation that describes the data directory:

```bash
cd /home/claude
find . -name "ARCHITECTURE.md" -o -name "DATA_STRUCTURE.md" -o -name "PROJECT_STRUCTURE.md" | xargs grep -l "control-.*-mappings"
```

**For each documentation file found:**

📁 **File:** `docs/[doc-name].md`

Remove or update sections describing the deleted data files.

---

## Step 11: Check Package.json Scripts

Verify no npm scripts reference the deleted files:

```bash
cd /home/claude

echo "=== Server package.json scripts ==="
cat server/package.json | jq '.scripts' | grep -i "mapping\|import\|seed"

echo ""
echo "=== Client package.json scripts ==="
cat client/package.json | jq '.scripts' | grep -i "mapping\|import\|seed"
```

**If any scripts reference deleted files, update or remove them**

---

## Step 12: Compile and Test

Build both frontend and backend to ensure no issues:

```bash
# Backend
cd /home/claude/server
npm run build

# Frontend
cd /home/claude/client
npm run build

echo "✓ Both frontend and backend compiled successfully"
```

---

## Step 13: Run Application Smoke Test

Quick test to ensure application still runs:

```bash
cd /home/claude

# Start backend
cd server
npm run dev &
SERVER_PID=$!
sleep 5

# Test API
curl -s http://localhost:3001/api/health && echo "✓ Backend running" || echo "✗ Backend failed"

# Start frontend
cd ../client
npm run dev &
CLIENT_PID=$!
sleep 5

echo "✓ Application running - verify in browser"
echo "URL: http://localhost:5173"

# Cleanup
read -p "Press enter after verification..."
kill $SERVER_PID $CLIENT_PID 2>/dev/null
```

---

## Phase 5 Verification Checklist

Before proceeding to Phase 6, verify:

- [ ] Data files located and identified
- [ ] No backend code references to deleted files
- [ ] No frontend code references to deleted files
- [ ] Data loading scripts updated (if existed)
- [ ] Data directory README updated (if existed)
- [ ] Files backed up (optional) OR deleted
- [ ] No remaining file references in codebase
- [ ] Git tracking removed (if files were tracked)
- [ ] Project documentation updated (if needed)
- [ ] Package.json scripts updated (if needed)
- [ ] Both frontend and backend compile successfully
- [ ] Application smoke test passed

**If any checks fail, review file references and resolve**

---

## Troubleshooting

### Issue: Code Still References Deleted Files

**Solution:**
```bash
cd /home/claude

# Find all references
grep -rn "control-settings-mappings\|control-m365-mappings" . \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude-dir=node_modules

# Manually update each file to remove the reference
```

### Issue: Build Fails After File Removal

**Solution:**
```bash
cd /home/claude

# Clear all caches
rm -rf server/dist
rm -rf server/node_modules/.cache
rm -rf client/dist
rm -rf client/node_modules/.cache

# Rebuild
cd server && npm run build
cd ../client && npm run build
```

### Issue: Runtime Error Loading Files

**Solution:**
1. Check browser console / server logs for error
2. Search for the error message in code:
```bash
grep -rn "ERROR_TEXT" server/src client/src
```
3. Remove or update the problematic code
4. Rebuild and test

---

## Files Modified/Deleted in This Phase

✅ **Modified (possibly):**
- `server/src/scripts/seed.ts` (if existed)
- `data/README.md` (if existed)
- Project documentation files

❌ **Deleted:**
- `data/control-settings-mappings.json`
- `data/control-m365-mappings.json`

📦 **Backed Up (optional):**
- `.backups/mapping-data/control-settings-mappings.json`
- `.backups/mapping-data/control-m365-mappings.json`

---

## Data Files Status

After this phase:

**DELETED:**
- ❌ `control-settings-mappings.json` - Keyword-based settings mappings
- ❌ `control-m365-mappings.json` - Policy type mappings

**PRESERVED:**
- ✅ `controls.json` - NIST control definitions
- ✅ Any other non-mapping data files

---

## Next Steps

Once all verifications pass, proceed to:
- **Phase 6: Type Definition Cleanup**

---

## Rollback Instructions

If issues occur:

```bash
cd /home/claude

# Restore from backup (if backed up)
cp .backups/mapping-data/control-settings-mappings.json data/
cp .backups/mapping-data/control-m365-mappings.json data/

# OR restore from git
git checkout backup-before-mapping-deletion data/
```
