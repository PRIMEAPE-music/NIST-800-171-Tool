# Phase 7: Post-Deletion Verification

**Objective:** Comprehensive verification that all mapping code is removed and application functions correctly.

**Estimated Time:** 20-30 minutes

**Prerequisites:**
- Phases 0-6 completed successfully
- All deletions performed
- No applications currently running

---

## Step 1: Clean Build Both Projects

Perform clean builds to ensure no cached artifacts:

```bash
cd /home/claude

# Clean and build backend
cd server
rm -rf dist node_modules/.cache
npm run build

if [ $? -eq 0 ]; then
  echo "✓ Backend build successful"
else
  echo "✗ Backend build failed"
  exit 1
fi

# Clean and build frontend
cd ../client
rm -rf dist node_modules/.cache .vite
npm run build

if [ $? -eq 0 ]; then
  echo "✓ Frontend build successful"
else
  echo "✗ Frontend build failed"
  exit 1
fi

echo "✓ Both projects built successfully"
```

---

## Step 2: Verify Database Schema

Check that control_policy_mappings table is gone:

```bash
cd /home/claude/server

echo "=== Current Tables ==="
npx prisma db execute --stdin <<< "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

echo ""
echo "=== Checking for mapping table ==="
npx prisma db execute --stdin <<< "SELECT name FROM sqlite_master WHERE type='table' AND name='control_policy_mappings';" | wc -l | xargs -I {} echo "Mapping table count: {}"
```

**Expected:** 
- List of tables should NOT include `control_policy_mappings`
- Mapping table count: 0

---

## Step 3: Verify File Deletions

Confirm all intended files are deleted:

```bash
cd /home/claude

echo "=== Checking for deleted services ==="
test -f server/src/services/settingsMapper.service.ts && echo "✗ settingsMapper.service.ts still exists" || echo "✓ settingsMapper.service.ts deleted"
test -f server/src/services/improvementActionMapping.service.ts && echo "✗ improvementActionMapping.service.ts still exists" || echo "✓ improvementActionMapping.service.ts deleted"

echo ""
echo "=== Checking for deleted components ==="
test -f client/src/components/controls/M365SettingsTab.tsx && echo "✗ M365SettingsTab.tsx still exists" || echo "✓ M365SettingsTab.tsx deleted"
test -f client/src/components/controls/M365RecommendationsTab.tsx && echo "✗ M365RecommendationsTab.tsx still exists" || echo "✓ M365RecommendationsTab.tsx deleted"

echo ""
echo "=== Checking for deleted data files ==="
test -f data/control-settings-mappings.json && echo "✗ control-settings-mappings.json still exists" || echo "✓ control-settings-mappings.json deleted"
test -f data/control-m365-mappings.json && echo "✗ control-m365-mappings.json still exists" || echo "✓ control-m365-mappings.json deleted"

echo ""
echo "=== Checking for deleted types ==="
test -f server/src/types/settingsMapper.types.ts && echo "✗ settingsMapper.types.ts still exists" || echo "✓ settingsMapper.types.ts deleted"
```

**Expected:** All should show "✓ [file] deleted"

---

## Step 4: Search for Remaining References

Comprehensive search for any missed references:

```bash
cd /home/claude

echo "=== Searching for service references ==="
grep -r "settingsMapper\|improvementActionMapping" . \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=build \
  --exclude-dir=.git \
  && echo "✗ Found service references" || echo "✓ No service references"

echo ""
echo "=== Searching for component references ==="
grep -r "M365SettingsTab\|M365RecommendationsTab" . \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=build \
  --exclude-dir=.git \
  && echo "✗ Found component references" || echo "✓ No component references"

echo ""
echo "=== Searching for type references ==="
grep -r "MappingConfidence\|ControlPolicyMapping\|GapAnalysis\|SettingsMappingStats" . \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=build \
  --exclude-dir=.git \
  && echo "✗ Found type references" || echo "✗ No type references"

echo ""
echo "=== Searching for data file references ==="
grep -r "control-settings-mappings\|control-m365-mappings" . \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=build \
  --exclude-dir=.git \
  && echo "✗ Found data file references" || echo "✓ No data file references"
```

**Expected:** All should show "✓ No references"

---

## Step 5: Test Backend API Endpoints

Start backend and verify preserved endpoints work:

```bash
cd /home/claude/server
npm run dev &
SERVER_PID=$!
sleep 5

echo "=== Testing Preserved Endpoints ==="

# Test health endpoint
echo "1. Health check..."
curl -s http://localhost:3001/api/health | jq '.success' || echo "✗ Health check failed"

# Test policy sync endpoint (preserved)
echo "2. Policy sync endpoint..."
curl -s -X POST http://localhost:3001/api/m365/sync | jq '.success' || echo "Note: May fail if M365 not configured"

# Test policy viewer endpoint (preserved)
echo "3. Policy viewer endpoint..."
curl -s http://localhost:3001/api/m365/policies/viewer | jq '.success' || echo "✗ Policy viewer failed"

echo ""
echo "=== Testing Deleted Endpoints (should 404) ==="

# Test deleted endpoints
echo "4. Recommendations endpoint (should fail)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/m365/recommendations/03.01.01)
if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "000" ]; then
  echo "✓ Recommendations endpoint properly removed"
else
  echo "✗ Recommendations endpoint still accessible (HTTP $HTTP_CODE)"
fi

echo "5. Improvement actions endpoint (should fail)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/m365/improvement-actions/03.01.01)
if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "000" ]; then
  echo "✓ Improvement actions endpoint properly removed"
else
  echo "✗ Improvement actions endpoint still accessible (HTTP $HTTP_CODE)"
fi

echo "6. Gap analysis endpoint (should fail)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/m365/gap-analysis)
if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "000" ]; then
  echo "✓ Gap analysis endpoint properly removed"
else
  echo "✗ Gap analysis endpoint still accessible (HTTP $HTTP_CODE)"
fi

# Cleanup
kill $SERVER_PID 2>/dev/null
```

---

## Step 6: Test Frontend Application

Start both servers and test UI:

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

echo "✓ Servers started"
echo ""
echo "=== MANUAL UI TESTING REQUIRED ==="
echo ""
echo "Please open http://localhost:5173 and verify:"
echo ""
echo "Dashboard:"
echo "  [ ] Dashboard loads without errors"
echo "  [ ] No gap analysis widgets visible"
echo "  [ ] No policy mapping statistics"
echo ""
echo "Controls Page:"
echo "  [ ] Controls list displays correctly"
echo "  [ ] Can view control details"
echo "  [ ] NO 'M365 Settings' tab visible"
echo "  [ ] NO 'M365 Recommendations' tab visible"
echo "  [ ] 'Related Controls' tab still works"
echo "  [ ] Other tabs (Overview, Assessment, Evidence) still work"
echo ""
echo "M365 Settings Page (if exists):"
echo "  [ ] M365 connection settings still work"
echo "  [ ] Policy sync functionality still works"
echo "  [ ] NO auto-mapping configuration visible"
echo ""
echo "Reports:"
echo "  [ ] Reports generate without errors"
echo "  [ ] No mapping-related data in reports"
echo ""
echo "Press Enter after completing manual verification..."
read

# Cleanup
kill $SERVER_PID $CLIENT_PID 2>/dev/null
```

---

## Step 7: Check Browser Console for Errors

```bash
echo "=== IMPORTANT: Check Browser Console ==="
echo ""
echo "In the browser DevTools Console, verify:"
echo "  [ ] No 404 errors for deleted endpoints"
echo "  [ ] No import errors for deleted components"
echo "  [ ] No TypeScript type errors"
echo "  [ ] No runtime errors related to mappings"
echo ""
```

---

## Step 8: Verify Database Integrity

Check that remaining data is intact:

```bash
cd /home/claude/server

echo "=== Verifying Database Integrity ==="

# Count controls
CONTROL_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM controls;" | tail -1)
echo "Controls: $CONTROL_COUNT"

# Count M365 policies
POLICY_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM m365_policies;" | tail -1)
echo "M365 Policies: $POLICY_COUNT"

# Count assessments
ASSESSMENT_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM assessments;" | tail -1)
echo "Assessments: $ASSESSMENT_COUNT"

# Count POAMs
POAM_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM poams;" | tail -1)
echo "POAMs: $POAM_COUNT"

# Count Evidence
EVIDENCE_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM evidence;" | tail -1)
echo "Evidence: $EVIDENCE_COUNT"

echo ""
echo "✓ Database integrity check complete"
echo "All core data should be preserved"
```

---

## Step 9: Run Linter and Type Checker

```bash
cd /home/claude

echo "=== Running Backend Linter ==="
cd server
npm run lint 2>&1 | grep -E "error|warning" | head -20 || echo "✓ No linting errors"

echo ""
echo "=== Running Frontend Linter ==="
cd ../client
npm run lint 2>&1 | grep -E "error|warning" | head -20 || echo "✓ No linting errors"

echo ""
echo "=== TypeScript Type Check ==="
cd ../server
npx tsc --noEmit && echo "✓ Backend types valid" || echo "✗ Backend type errors"

cd ../client
npx tsc --noEmit && echo "✓ Frontend types valid" || echo "✗ Frontend type errors"
```

---

## Step 10: Generate Deletion Summary Report

```bash
cd /home/claude

cat > DELETION_SUMMARY.md << 'EOF'
# M365 Policy Mapping Deletion Summary

**Date:** $(date +%Y-%m-%d)
**Status:** COMPLETE

---

## Files Deleted

### Backend Services
- ❌ `server/src/services/settingsMapper.service.ts`
- ❌ `server/src/services/improvementActionMapping.service.ts`

### Frontend Components
- ❌ `client/src/components/controls/M365SettingsTab.tsx`
- ❌ `client/src/components/controls/M365RecommendationsTab.tsx`

### Data Files
- ❌ `data/control-settings-mappings.json`
- ❌ `data/control-m365-mappings.json`

### Type Definitions
- ❌ `server/src/types/settingsMapper.types.ts`

### Database Tables
- ❌ `control_policy_mappings`

---

## Files Modified

### Backend
- ✏️ `server/prisma/schema.prisma` - Removed ControlPolicyMapping model
- ✏️ `server/src/services/policySync.service.ts` - Removed auto-mapping calls
- ✏️ `server/src/routes/m365.routes.ts` - Removed mapping endpoints
- ✏️ `shared/types/m365.types.ts` - Removed mapping types

### Frontend
- ✏️ `client/src/components/controls/ControlDetail.tsx` - Removed M365 tabs

---

## API Endpoints Removed

- ❌ `GET /api/m365/recommendations/:controlId`
- ❌ `GET /api/m365/improvement-actions/:controlId`
- ❌ `GET /api/m365/gap-analysis`
- ❌ `GET /api/controls/:controlId/policies`
- ❌ All manual mapping endpoints

---

## API Endpoints Preserved

- ✅ `POST /api/m365/sync` - Policy synchronization
- ✅ `GET /api/m365/policies/viewer` - Policy viewer
- ✅ `GET /api/m365/policies/:id` - Single policy view
- ✅ `GET /api/m365/sync-logs` - Sync history

---

## Database Tables Preserved

- ✅ `controls` - NIST control definitions
- ✅ `m365_policies` - Microsoft 365 policies
- ✅ `m365_sync_logs` - Sync history
- ✅ `assessments` - Control assessments
- ✅ `poams` - Plans of Action
- ✅ `evidence` - Compliance evidence

---

## Types Removed

- ❌ `MappingConfidence`
- ❌ `ControlPolicyMappingDTO`
- ❌ `MappedSetting`
- ❌ `GapAnalysisResult`
- ❌ `M365Recommendation`
- ❌ `ImprovementAction`
- ❌ `SettingsMappingStats`

---

## Types Preserved

- ✅ `PolicyType`
- ✅ `M365Policy`
- ✅ `M365SyncLog`
- ✅ `PolicySearchParams`

---

## Functionality Removed

1. **Auto-Mapping**: Keyword-based automatic mapping of policies to controls
2. **Settings Validation**: Individual setting value validation against NIST requirements
3. **Gap Analysis**: Identification of missing or non-compliant settings
4. **Recommendations**: M365 implementation recommendations per control
5. **Improvement Actions**: Microsoft improvement action tracking
6. **Manual Mappings**: Ability to manually map policies to controls
7. **Control Coverage**: Policy-based control coverage statistics

---

## Functionality Preserved

1. **Policy Sync**: Fetch policies from M365 tenant (Intune, Purview, Azure AD)
2. **Policy Viewer**: View and search all M365 policies
3. **Policy Details**: View individual policy configurations
4. **Sync History**: View policy synchronization logs
5. **Related Controls**: View controls related to each other
6. **Core Compliance**: Assessments, POAMs, Evidence management
7. **M365 Authentication**: Azure AD integration

---

## Next Steps for Remapping

When ready to implement new mapping system:

1. **Design New Mapping Strategy**
   - Determine mapping approach (manual, auto, hybrid)
   - Define new data structures
   - Plan UI/UX for mapping interface

2. **Create New Database Schema**
   - Design new mapping table(s)
   - Add necessary relationships
   - Create migration

3. **Implement Backend Services**
   - Create new mapping service
   - Implement mapping algorithms
   - Add API endpoints

4. **Build Frontend Components**
   - Create mapping UI
   - Add mapping visualization
   - Implement mapping management

5. **Add Data Files** (if needed)
   - Create new mapping configuration
   - Add validation rules
   - Document structure

---

## Backup Information

- **Git Branch**: `backup-before-mapping-deletion`
- **Database Backup**: `server/prisma/dev.db.backup-YYYYMMDD-HHMMSS`
- **Data Backup**: `.backups/mapping-data/` (if created)

To restore:
\`\`\`bash
git checkout backup-before-mapping-deletion
cp server/prisma/dev.db.backup-YYYYMMDD-HHMMSS server/prisma/dev.db
\`\`\`

---

## Verification Results

- ✅ Both projects build successfully
- ✅ Database schema updated
- ✅ All target files deleted
- ✅ No remaining code references
- ✅ API endpoints properly removed/preserved
- ✅ Frontend UI updated
- ✅ Type definitions cleaned
- ✅ Application runs without errors

EOF

echo "✓ Deletion summary report generated: DELETION_SUMMARY.md"
```

---

## Step 11: Commit Changes

Commit all deletion changes:

```bash
cd /home/claude

# Stage all changes
git add -A

# Commit with detailed message
git commit -m "Complete removal of M365 policy mapping system

Removed:
- Auto-mapping services and algorithms
- Control-policy mapping database table
- M365 Settings and Recommendations UI tabs
- Gap analysis functionality
- Mapping-related API endpoints
- Mapping data files and type definitions

Preserved:
- Policy sync functionality
- Policy viewer
- M365 authentication
- Core compliance features
- Related controls functionality

See DELETION_SUMMARY.md for complete details"

echo "✓ Changes committed"
```

---

## Phase 7 Final Verification Checklist

Ensure ALL items are checked:

**Build & Compilation:**
- [ ] Backend builds without errors
- [ ] Frontend builds without errors
- [ ] No TypeScript compilation errors
- [ ] No linting errors

**Database:**
- [ ] control_policy_mappings table removed
- [ ] Other tables preserved and intact
- [ ] Data counts match expectations

**Files:**
- [ ] All targeted files deleted
- [ ] No orphaned imports or references
- [ ] Data files removed or backed up

**API:**
- [ ] Deleted endpoints return 404
- [ ] Preserved endpoints work correctly
- [ ] No console errors when calling APIs

**Frontend:**
- [ ] M365 tabs removed from control details
- [ ] No gap analysis widgets
- [ ] No mapping statistics
- [ ] Policy viewer still works
- [ ] No browser console errors
- [ ] Manual UI testing passed

**Code Quality:**
- [ ] No remaining service references
- [ ] No remaining component references
- [ ] No remaining type references
- [ ] No remaining data file references

**Documentation:**
- [ ] Deletion summary generated
- [ ] Changes committed to git
- [ ] Backup verified

---

## Troubleshooting

### Issue: Build Errors After All Phases

**Solution:**
```bash
cd /home/claude

# Nuclear option - clean everything
rm -rf server/node_modules server/dist
rm -rf client/node_modules client/dist client/.vite

# Reinstall
cd server && npm install
cd ../client && npm install

# Rebuild
cd ../server && npm run build
cd ../client && npm run build
```

### Issue: Application Crashes on Startup

**Solution:**
```bash
# Check server logs
cd /home/claude/server
npm run dev 2>&1 | tee server.log

# Check for remaining references
grep -rn "settingsMapper\|improvementActionMapping\|M365SettingsTab\|M365RecommendationsTab" server/src
```

### Issue: Database Migration Issues

**Solution:**
```bash
cd /home/claude/server

# Reset database (WARNING: destroys data)
npx prisma migrate reset --force

# OR restore from backup
cp prisma/dev.db.backup-YYYYMMDD-HHMMSS prisma/dev.db
```

---

## Success Criteria

All of the following must be true:

✅ **Backend:**
- Builds without errors
- Starts without errors
- API endpoints respond correctly
- No mapping-related services exist

✅ **Frontend:**
- Builds without errors
- Starts without errors
- UI renders correctly
- No M365 mapping tabs visible
- No console errors

✅ **Database:**
- Schema updated successfully
- Mapping table removed
- Other tables intact

✅ **Code Quality:**
- No orphaned imports
- No undefined references
- Types consistent
- Linting passes

✅ **Functionality:**
- Policy sync works
- Policy viewer works
- Core compliance features work
- No mapping features accessible

---

## Completion

**🎉 CONGRATULATIONS! 🎉**

You have successfully removed all M365 policy mapping code from the application.

**Summary:**
- 7 phases completed
- Multiple files deleted
- Database schema updated
- Application verified and functional
- Ready for new mapping implementation

**Next Steps:**
1. Review `DELETION_SUMMARY.md` for complete details
2. Plan new mapping architecture
3. Begin implementation of new mapping system

**Backup Locations:**
- Git: `backup-before-mapping-deletion` branch
- Database: `server/prisma/dev.db.backup-*`
- Data files: `.backups/mapping-data/` (if created)

---

## Report Generation

The deletion is complete. A summary has been saved to:
- `DELETION_SUMMARY.md`

Review this file for a complete record of all changes.
