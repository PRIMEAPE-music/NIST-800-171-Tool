# Phase 3: API Route Removal

**Objective:** Remove mapping-related API routes while preserving policy viewer and sync functionality.

**Estimated Time:** 15-20 minutes

**Prerequisites:**
- Phase 2 completed successfully
- Backend services deleted
- No applications currently running

---

## Step 1: Backup Current Routes File

```bash
cd /home/claude/server/src/routes
cp m365.routes.ts m365.routes.ts.backup
```

---

## Step 2: Identify Routes to Remove

List all routes that will be deleted:

```bash
cd /home/claude/server/src/routes
grep -n "router\.\(get\|post\|put\|delete\)" m365.routes.ts | grep -E "(recommendations|improvement-actions|gap-analysis|mappings)"
```

**Routes to Remove:**
- `GET /api/m365/recommendations/:controlId`
- `GET /api/m365/improvement-actions/:controlId`
- `GET /api/m365/gap-analysis`
- Any routes related to control-policy mappings

**Routes to Keep:**
- `POST /api/m365/sync`
- `GET /api/m365/policies/viewer`
- `GET /api/m365/policies/:id`
- `GET /api/m365/sync-logs`

---

## Step 3: Update m365.routes.ts - Remove Service Imports

📁 **File:** `server/src/routes/m365.routes.ts`

🔍 **FIND:**
```typescript
import { settingsMapperService } from '../services/settingsMapper.service';
import { improvementActionMappingService } from '../services/improvementActionMapping.service';
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: Mapping service imports - no longer mapping policies to controls
```

---

## Step 4: Remove Recommendations Route

📁 **File:** `server/src/routes/m365.routes.ts`

🔍 **FIND:**
```typescript
// Get M365 implementation recommendations for a control
router.get('/recommendations/:controlId', async (req, res) => {
  try {
    const { controlId } = req.params;
    const recommendations = await settingsMapperService.getRecommendations(controlId);
    res.json({ success: true, recommendations });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch recommendations' 
    });
  }
});
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: Recommendations route - no longer mapping policies to controls
```

---

## Step 5: Remove Improvement Actions Route

📁 **File:** `server/src/routes/m365.routes.ts`

🔍 **FIND:**
```typescript
// Get improvement actions with policy mappings for a control
router.get('/improvement-actions/:controlId', async (req, res) => {
  try {
    const { controlId } = req.params;
    const actions = await improvementActionMappingService.getImprovementActionsWithPolicies(controlId);
    res.json({ 
      success: true, 
      controlId,
      count: actions.length,
      actions 
    });
  } catch (error) {
    console.error('Error fetching improvement actions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch improvement actions' 
    });
  }
});
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: Improvement actions route - no longer mapping policies to controls
```

---

## Step 6: Remove Gap Analysis Route

📁 **File:** `server/src/routes/m365.routes.ts`

🔍 **FIND:**
```typescript
// Get gap analysis
router.get('/gap-analysis', async (req, res) => {
  try {
    const analysis = await settingsMapperService.getGapAnalysis();
    res.json({ success: true, analysis });
  } catch (error) {
    console.error('Error generating gap analysis:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate gap analysis' 
    });
  }
});
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: Gap analysis route - no longer mapping policies to controls
```

---

## Step 7: Remove Manual Mapping Routes (if they exist)

Search for any manual mapping routes:

```bash
cd /home/claude/server/src/routes
grep -n "/mappings" m365.routes.ts
```

**If found, remove them:**

📁 **File:** `server/src/routes/m365.routes.ts`

Remove any routes matching:
- `POST /api/m365/mappings`
- `DELETE /api/m365/mappings/:id`
- `PUT /api/m365/mappings/:id`
- `POST /api/m365/mappings/bulk-approve`
- `POST /api/m365/mappings/bulk-reject`
- `GET /api/m365/mappings/:id`

Replace with:
```typescript
// REMOVED: Manual mapping routes - no longer mapping policies to controls
```

---

## Step 8: Remove Control-Specific Policy Routes

📁 **File:** `server/src/routes/controls.routes.ts` (if it exists)

Check for routes that fetch policies for controls:

```bash
cd /home/claude/server/src/routes
grep -n "policies" controls.routes.ts 2>/dev/null || echo "No controls.routes.ts found"
```

**If found:**

🔍 **FIND:**
```typescript
// Get all policies mapped to a control
router.get('/:controlId/policies', async (req, res) => {
  try {
    const { controlId } = req.params;
    const mappings = await prisma.controlPolicyMapping.findMany({
      where: { controlId },
      include: { policy: true }
    });
    res.json({ success: true, mappings });
  } catch (error) {
    console.error('Error fetching control policies:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch control policies' 
    });
  }
});
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: Control policies route - no longer mapping policies to controls
```

---

## Step 9: Verify Remaining Routes

Check that only desired routes remain:

```bash
cd /home/claude/server/src/routes
echo "=== Remaining M365 Routes ==="
grep -n "router\.\(get\|post\)" m365.routes.ts
```

**Expected Routes:**
- `POST /sync` (policy sync)
- `GET /policies/viewer` (policy viewer)
- `GET /policies/:id` (single policy)
- `GET /sync-logs` (sync history)

**Should NOT see:**
- `/recommendations`
- `/improvement-actions`
- `/gap-analysis`
- `/mappings`

---

## Step 10: Compile and Check for Errors

```bash
cd /home/claude/server
npm run build 2>&1 | tee /tmp/routes-build.log

if grep -q "error TS" /tmp/routes-build.log; then
  echo "✗ TypeScript compilation errors"
  grep "error TS" /tmp/routes-build.log
else
  echo "✓ Routes compiled successfully"
fi
```

---

## Step 11: Test Remaining Endpoints

Start the development server and test preserved routes:

```bash
cd /home/claude/server
npm run dev &
SERVER_PID=$!
sleep 5

# Test policy viewer (should work)
echo "Testing policy viewer..."
curl -s http://localhost:3001/api/m365/policies/viewer | jq '.success' || echo "✗ Policy viewer failed"

# Test removed routes (should 404)
echo "Testing removed recommendations route..."
curl -s http://localhost:3001/api/m365/recommendations/03.01.01 | grep -q "404\|Cannot GET" && echo "✓ Route properly removed" || echo "✗ Route still exists"

# Kill server
kill $SERVER_PID 2>/dev/null
```

---

## Step 12: Update API Documentation (if exists)

Check for API documentation files:

```bash
cd /home/claude
find . -name "API*.md" -o -name "api*.md" -o -name "routes*.md" 2>/dev/null
```

**If found, update to remove deleted routes**

---

## Phase 3 Verification Checklist

Before proceeding to Phase 4, verify:

- [ ] Service imports removed from m365.routes.ts
- [ ] Recommendations route removed
- [ ] Improvement actions route removed
- [ ] Gap analysis route removed
- [ ] Manual mapping routes removed (if existed)
- [ ] Control policies routes removed (if existed)
- [ ] Policy viewer routes preserved
- [ ] Policy sync routes preserved
- [ ] TypeScript compilation successful
- [ ] Removed routes return 404
- [ ] Preserved routes still work

**If any checks fail, review route modifications**

---

## Troubleshooting

### Issue: Compilation Errors After Route Removal

**Solution:**
```bash
cd /home/claude/server
# Check for any remaining service references
grep -rn "settingsMapper\|improvementActionMapping" src/routes/

# Remove any found references manually
# Then rebuild
npm run build
```

### Issue: Routes Still Accessible

**Solution:**
```bash
# Restart the server
pkill -f "node" 2>/dev/null
cd /home/claude/server
npm run dev
```

### Issue: Policy Viewer Broken

**Solution:**
Check that policyViewer service still exists:
```bash
ls -l server/src/services/policyViewer.service.ts
```

If missing, restore from backup:
```bash
git checkout backup-before-mapping-deletion server/src/services/policyViewer.service.ts
```

---

## Files Modified in This Phase

✅ **Modified:**
- `server/src/routes/m365.routes.ts`
- `server/src/routes/controls.routes.ts` (if exists)

❌ **Routes Removed:**
- `GET /api/m365/recommendations/:controlId`
- `GET /api/m365/improvement-actions/:controlId`
- `GET /api/m365/gap-analysis`
- Control-policy mapping routes

✅ **Routes Preserved:**
- `POST /api/m365/sync`
- `GET /api/m365/policies/viewer`
- `GET /api/m365/policies/:id`
- `GET /api/m365/sync-logs`

---

## Next Steps

Once all verifications pass, proceed to:
- **Phase 4: Frontend Component Cleanup**

---

## Rollback Instructions

If issues occur:

```bash
cd /home/claude
git checkout backup-before-mapping-deletion server/src/routes/
cd server
npm run build
```
