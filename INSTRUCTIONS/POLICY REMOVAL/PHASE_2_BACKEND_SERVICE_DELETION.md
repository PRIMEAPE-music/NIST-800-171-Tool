# Phase 2: Backend Service Deletion

**Objective:** Remove mapping-related backend services and update dependent files.

**Estimated Time:** 15-20 minutes

**Prerequisites:**
- Phase 1 completed successfully
- Prisma schema updated and migrated
- No applications currently running

---

## Step 1: Identify Service Dependencies

List all files that import the services to be deleted:

```bash
cd /home/claude/server/src

echo "=== Files importing settingsMapper.service ==="
grep -r "settingsMapper" . --include="*.ts" --exclude-dir=node_modules

echo ""
echo "=== Files importing improvementActionMapping.service ==="
grep -r "improvementActionMapping" . --include="*.ts" --exclude-dir=node_modules
```

**Note:** Record these files - they will need updates

---

## Step 2: Update policySync.service.ts

Remove references to settingsMapper service:

📁 **File:** `server/src/services/policySync.service.ts`

🔍 **FIND:**
```typescript
import { settingsMapperService } from './settingsMapper.service';
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: settingsMapper import - no longer mapping policies to controls
```

---

🔍 **FIND:**
```typescript
    // Step 3: Trigger auto-mapping
    console.log('📊 Running auto-mapping...');
    const mappingResult = await settingsMapperService.mapAllPolicies();
    
    console.log(`✓ Created ${mappingResult.totalMappingsCreated} control-policy mappings`);
    console.log(`  High confidence: ${mappingResult.mappingsByConfidence.High || 0}`);
    console.log(`  Medium confidence: ${mappingResult.mappingsByConfidence.Medium || 0}`);
    console.log(`  Low confidence: ${mappingResult.mappingsByConfidence.Low || 0}`);
```

✏️ **REPLACE WITH:**
```typescript
    // REMOVED: Auto-mapping step - no longer mapping policies to controls
    console.log('✓ Policy sync completed (auto-mapping disabled)');
```

---

🔍 **FIND:**
```typescript
      totalPolicies: policies.length,
      totalMappingsCreated: mappingResult.totalMappingsCreated,
      mappingsByConfidence: mappingResult.mappingsByConfidence,
      controlsCovered: mappingResult.controlsCovered || 0,
      settingsMatched: mappingResult.settingsMatched || 0,
      duration: Date.now() - startTime,
```

✏️ **REPLACE WITH:**
```typescript
      totalPolicies: policies.length,
      duration: Date.now() - startTime,
```

---

## Step 3: Update Return Type in policySync.service.ts

📁 **File:** `server/src/services/policySync.service.ts`

🔍 **FIND:**
```typescript
interface SyncResult {
  totalPolicies: number;
  totalMappingsCreated: number;
  mappingsByConfidence: {
    High?: number;
    Medium?: number;
    Low?: number;
  };
  controlsCovered?: number;
  settingsMatched?: number;
  duration: number;
}
```

✏️ **REPLACE WITH:**
```typescript
interface SyncResult {
  totalPolicies: number;
  duration: number;
}
```

---

## Step 4: Delete settingsMapper.service.ts

```bash
cd /home/claude/server/src/services
rm -f settingsMapper.service.ts
```

**Verification:**
```bash
ls -l settingsMapper.service.ts 2>&1 | grep -q "No such file" && echo "✓ settingsMapper.service.ts deleted" || echo "✗ File still exists"
```

---

## Step 5: Delete improvementActionMapping.service.ts

```bash
cd /home/claude/server/src/services
rm -f improvementActionMapping.service.ts
```

**Verification:**
```bash
ls -l improvementActionMapping.service.ts 2>&1 | grep -q "No such file" && echo "✓ improvementActionMapping.service.ts deleted" || echo "✗ File still exists"
```

---

## Step 6: Verify No Broken Imports in Services Directory

```bash
cd /home/claude/server/src/services

# Check for any remaining references to deleted services
grep -r "settingsMapper" . --include="*.ts" && echo "✗ Found settingsMapper references" || echo "✓ No settingsMapper references"
grep -r "improvementActionMapping" . --include="*.ts" && echo "✗ Found improvementActionMapping references" || echo "✓ No improvementActionMapping references"
```

**Expected:** Both should show "✓ No references"

---

## Step 7: Check TypeScript Compilation

Verify backend compiles without errors:

```bash
cd /home/claude/server
npm run build 2>&1 | tee /tmp/build-output.log

# Check for compilation errors
if grep -q "error TS" /tmp/build-output.log; then
  echo "✗ TypeScript compilation errors found"
  grep "error TS" /tmp/build-output.log
else
  echo "✓ TypeScript compilation successful"
fi
```

**Expected:** No TypeScript errors related to deleted services

---

## Step 8: Update M365 Controller (if exists)

Check if there's an M365 controller that needs updating:

```bash
cd /home/claude/server/src/controllers
ls -l m365.controller.ts 2>/dev/null || echo "No m365.controller.ts found"
```

**If file exists:**

📁 **File:** `server/src/controllers/m365.controller.ts`

🔍 **FIND:**
```typescript
import { settingsMapperService } from '../services/settingsMapper.service';
import { improvementActionMappingService } from '../services/improvementActionMapping.service';
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: Mapping service imports - no longer mapping policies to controls
```

**Remove any controller methods that reference these services**

---

## Step 9: Clean Build Artifacts

Remove old build artifacts that may reference deleted services:

```bash
cd /home/claude/server
rm -rf dist/
rm -rf node_modules/.cache/
```

---

## Step 10: Test Backend Compilation

Perform a clean build:

```bash
cd /home/claude/server
npm run build
```

**Expected:** Build completes successfully with no errors

---

## Phase 2 Verification Checklist

Before proceeding to Phase 3, verify:

- [ ] policySync.service.ts updated (settingsMapper references removed)
- [ ] SyncResult interface updated (mapping-related fields removed)
- [ ] settingsMapper.service.ts deleted
- [ ] improvementActionMapping.service.ts deleted
- [ ] No broken imports in services directory
- [ ] TypeScript compilation successful
- [ ] Controller updated (if exists)
- [ ] Clean build completes without errors

**If any checks fail, review file modifications and ensure all imports are removed**

---

## Troubleshooting

### Issue: TypeScript Errors After Deletion

**Solution:**
```bash
cd /home/claude/server
# Clear TypeScript cache
rm -rf node_modules/.cache
rm -rf dist/

# Reinstall dependencies
npm install

# Rebuild
npm run build
```

### Issue: Imports Still Found

**Solution:**
```bash
# Find all remaining references
cd /home/claude/server/src
grep -rn "settingsMapper\|improvementActionMapping" . --include="*.ts"

# Manually remove each reference
```

### Issue: Build Fails

**Solution:**
1. Check error message for specific missing import
2. Update that file to remove the import
3. Rebuild:
```bash
npm run build
```

---

## Files Modified in This Phase

✅ **Modified:**
- `server/src/services/policySync.service.ts`
- `server/src/controllers/m365.controller.ts` (if exists)

❌ **Deleted:**
- `server/src/services/settingsMapper.service.ts`
- `server/src/services/improvementActionMapping.service.ts`

---

## Next Steps

Once all verifications pass, proceed to:
- **Phase 3: API Route Removal**

---

## Rollback Instructions

If issues occur:

```bash
cd /home/claude
git checkout backup-before-mapping-deletion server/src/services/
cd server
npm install
npm run build
```
