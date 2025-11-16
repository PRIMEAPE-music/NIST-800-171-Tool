# Phase 0: Pre-Deletion Validation & Backup

**Objective:** Validate current system state and create backups before deletion begins.

**Estimated Time:** 10-15 minutes

**Prerequisites:**
- Application is running
- Database is accessible
- Git repository is clean

---

## Step 1: Create Backup Branch

Create a new Git branch to preserve current state:

```bash
cd /home/claude
git checkout -b backup-before-mapping-deletion
git add .
git commit -m "Backup: Pre-deletion state of M365 policy mapping system"
```

**Verification:**
```bash
git branch --list | grep backup-before-mapping-deletion
```
Expected: Should show the backup branch

---

## Step 2: Database Backup

Create a backup of the current database:

```bash
cd /home/claude/server
cp prisma/dev.db prisma/dev.db.backup-$(date +%Y%m%d-%H%M%S)
```

**Verification:**
```bash
ls -lh prisma/*.backup-*
```
Expected: Should show a backup file with timestamp

---

## Step 3: Identify Files for Deletion

Run the following to identify all files that will be modified or deleted:

```bash
cd /home/claude

echo "=== Backend Services to Delete ==="
ls -1 server/src/services/settingsMapper.service.ts 2>/dev/null
ls -1 server/src/services/improvementActionMapping.service.ts 2>/dev/null

echo ""
echo "=== Frontend Components to Delete ==="
ls -1 client/src/components/controls/M365SettingsTab.tsx 2>/dev/null
ls -1 client/src/components/controls/M365RecommendationsTab.tsx 2>/dev/null

echo ""
echo "=== Data Files to Delete ==="
ls -1 data/control-settings-mappings.json 2>/dev/null
ls -1 data/control-m365-mappings.json 2>/dev/null

echo ""
echo "=== Type Files to Modify ==="
ls -1 server/src/types/settingsMapper.types.ts 2>/dev/null
ls -1 shared/types/m365.types.ts 2>/dev/null
```

**Expected Output:** All files should exist and be listed

---

## Step 4: Document Current API Endpoints

List all M365-related API endpoints:

```bash
cd /home/claude/server/src/routes
grep -n "router\.\(get\|post\|put\|delete\)" m365.routes.ts | grep -E "(recommendations|improvement-actions|gap-analysis|mappings)"
```

**Expected Output:** Should show endpoints that will be removed

---

## Step 5: Document Current Database Schema

Check current control_policy_mappings table structure:

```bash
cd /home/claude/server
npx prisma db execute --stdin <<< "SELECT name FROM sqlite_master WHERE type='table' AND name='control_policy_mappings';"
```

**Expected Output:** Should return 'control_policy_mappings'

---

## Step 6: Check for Active Mappings

Count existing policy mappings:

```bash
cd /home/claude/server
npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM control_policy_mappings;"
```

**Note:** Record this number for verification later (should be 0 after deletion)

---

## Step 7: Test Application Before Deletion

Ensure application runs without errors:

```bash
cd /home/claude/server
npm run dev &
SERVER_PID=$!
sleep 5

# Test API health
curl -s http://localhost:3001/api/health || echo "Server not responding"

# Kill test server
kill $SERVER_PID 2>/dev/null
```

**Expected:** Server should start and respond to health check

---

## Step 8: Document Dependencies

List all files that import mapping-related modules:

```bash
cd /home/claude

echo "=== Files importing settingsMapper.service ==="
grep -r "from.*settingsMapper.service" server/src --include="*.ts"

echo ""
echo "=== Files importing improvementActionMapping.service ==="
grep -r "from.*improvementActionMapping.service" server/src --include="*.ts"

echo ""
echo "=== Frontend files using M365SettingsTab ==="
grep -r "M365SettingsTab" client/src --include="*.tsx" --include="*.ts"

echo ""
echo "=== Frontend files using M365RecommendationsTab ==="
grep -r "M365RecommendationsTab" client/src --include="*.tsx" --include="*.ts"
```

**Action Required:** Note all files that reference these components - they will need updates

---

## Pre-Deletion Checklist

Before proceeding to Phase 1, verify:

- [ ] Git backup branch created successfully
- [ ] Database backup file exists
- [ ] All target files identified and exist
- [ ] Current mapping count documented
- [ ] Application runs without errors
- [ ] Dependencies documented

**If any checks fail, resolve issues before proceeding to Phase 1**

---

## Next Steps

Once all verifications pass, proceed to:
- **Phase 1: Database Schema Cleanup**

---

## Rollback Instructions

If you need to rollback at any point:

```bash
# Restore database
cd /home/claude/server
cp prisma/dev.db.backup-YYYYMMDD-HHMMSS prisma/dev.db

# Restore code
cd /home/claude
git checkout backup-before-mapping-deletion
```

**WARNING:** Replace `YYYYMMDD-HHMMSS` with actual backup timestamp
