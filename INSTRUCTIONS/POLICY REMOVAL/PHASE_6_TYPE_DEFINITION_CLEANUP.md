# Phase 6: Type Definition Cleanup

**Objective:** Remove or update TypeScript type definitions related to policy mappings.

**Estimated Time:** 15-20 minutes

**Prerequisites:**
- Phase 5 completed successfully
- Data files removed or backed up
- No applications currently running

---

## Step 1: Identify Type Files

List all type definition files that may need cleanup:

```bash
cd /home/claude

echo "=== Server Type Files ==="
find server/src/types -name "*.ts" | sort

echo ""
echo "=== Shared Type Files ==="
find shared/types -name "*.ts" 2>/dev/null | sort || echo "No shared types directory"

echo ""
echo "=== Client Type Files ==="
find client/src/types -name "*.ts" 2>/dev/null | sort || echo "No client types directory"
```

---

## Step 2: Check Type File References

Search for imports of mapping-related type files:

```bash
cd /home/claude

echo "=== settingsMapper.types imports ==="
grep -r "from.*settingsMapper.types" . --include="*.ts" --include="*.tsx" --exclude-dir=node_modules

echo ""
echo "=== Mapping-related type imports from m365.types ==="
grep -r "ControlPolicyMapping\|MappingConfidence\|SettingMapping\|GapAnalysis" . --include="*.ts" --include="*.tsx" --exclude-dir=node_modules
```

**Note:** All files found will need updates

---

## Step 3: Delete settingsMapper.types.ts

```bash
cd /home/claude/server/src/types
rm -f settingsMapper.types.ts
```

**Verification:**
```bash
ls -l settingsMapper.types.ts 2>&1 | grep -q "No such file" && echo "✓ settingsMapper.types.ts deleted" || echo "✗ File still exists"
```

---

## Step 4: Clean Up m365.types.ts - Remove Mapping Types

📁 **File:** `shared/types/m365.types.ts` (or `server/src/types/m365.types.ts`)

🔍 **FIND:**
```typescript
export type MappingConfidence = 'High' | 'Medium' | 'Low';
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: MappingConfidence type - no longer mapping policies to controls
```

---

🔍 **FIND:**
```typescript
export interface ControlPolicyMappingDTO {
  id: number;
  controlId: string;
  controlTitle: string;
  policyId: number;
  policyName: string;
  policyType: PolicyType;
  mappingConfidence: MappingConfidence;
  mappingNotes?: string;
  mappedSettings?: MappedSetting[];
}
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: ControlPolicyMappingDTO interface - no longer mapping policies to controls
```

---

🔍 **FIND:**
```typescript
export interface MappedSetting {
  settingName: string;
  settingValue: any;
  meetsRequirement: boolean;
  requiredValue?: any;
  validationType?: string;
  validationMessage?: string;
}
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: MappedSetting interface - no longer mapping policies to controls
```

---

🔍 **FIND:**
```typescript
export interface GapAnalysisResult {
  totalControls: number;
  controlsFullyCovered: number;
  controlsPartiallyCovered: number;
  controlsNotCovered: number;
  coveragePercentage: number;
  gaps: GapDetail[];
}
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: GapAnalysisResult interface - no longer mapping policies to controls
```

---

🔍 **FIND:**
```typescript
export interface GapDetail {
  id: number;
  controlId: string;
  controlTitle: string;
  family: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  gapType: 'NoSettings' | 'NonCompliantSettings';
  affectedPolicies: AffectedPolicy[];
  recommendedActions: string[];
}
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: GapDetail interface - no longer mapping policies to controls
```

---

🔍 **FIND:**
```typescript
export interface AffectedPolicy {
  policyId: number;
  policyName: string;
  nonCompliantSettings: MappedSetting[];
}
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: AffectedPolicy interface - no longer mapping policies to controls
```

---

🔍 **FIND:**
```typescript
export interface SettingsMappingStats {
  totalPolicies: number;
  totalMappingsCreated: number;
  mappingsByConfidence: {
    High: number;
    Medium: number;
    Low: number;
  };
  controlsCovered: number;
  settingsMatched: number;
  duration: number;
}
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: SettingsMappingStats interface - no longer mapping policies to controls
```

---

## Step 5: Clean Up m365.types.ts - Remove Recommendation Types

📁 **File:** `shared/types/m365.types.ts`

🔍 **FIND:**
```typescript
export interface M365Recommendation {
  settingNames: string[];
  settingDisplayName: string;
  validationType: string;
  requiredValue: any;
  policyTypes: string[];
  policySubType: string;
  description: string;
  contextualHelp?: string;
  isSatisfied: boolean;
  satisfiedBy?: {
    settingName: string;
    settingValue: any;
    policyName: string;
    policyType: string;
  };
}
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: M365Recommendation interface - no longer providing policy recommendations
```

---

🔍 **FIND:**
```typescript
export interface ImprovementAction {
  title: string;
  category: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  status: 'Completed' | 'InProgress' | 'NotStarted';
  requiredPlatforms: string[];
  platformsRequired: number;
  platformsCompleted: number;
  totalPolicies: number;
  compliantPolicies: number;
  platformCoverage: PlatformCoverage[];
  satisfiedBy: PolicyImplementation[];
}
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: ImprovementAction interface - no longer tracking improvement actions
```

---

🔍 **FIND:**
```typescript
export interface PlatformCoverage {
  platform: string;
  platformStatus: 'Completed' | 'InProgress' | 'NotStarted';
  hasPolicies: boolean;
  totalPoliciesCount: number;
  compliantPoliciesCount: number;
}
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: PlatformCoverage interface - no longer tracking platform coverage
```

---

🔍 **FIND:**
```typescript
export interface PolicyImplementation {
  policyId: string;
  policyName: string;
  policyType: string;
  platform: string;
  overallCompliance: number;
  settings: ImplementationSetting[];
}
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: PolicyImplementation interface - no longer mapping policy implementations
```

---

🔍 **FIND:**
```typescript
export interface ImplementationSetting {
  settingName: string;
  currentValue: any;
  requiredValue: any;
  meetsRequirement: boolean;
}
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: ImplementationSetting interface - no longer validating settings
```

---

## Step 6: Keep Essential Types

Verify that essential types are preserved:

📁 **File:** `shared/types/m365.types.ts`

**Types to KEEP:**
```typescript
// Core policy types (KEEP THESE)
export type PolicyType = 'Intune' | 'Purview' | 'AzureAD';

export interface M365Policy {
  id: number;
  externalId: string;
  name: string;
  description?: string;
  policyType: PolicyType;
  policySubType?: string;
  platform?: string;
  isActive: boolean;
  policyData: string; // JSON string
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface M365SyncLog {
  id: number;
  syncType: 'Manual' | 'Scheduled';
  status: 'Success' | 'Failed' | 'Partial';
  policiesSynced: number;
  errorMessage?: string;
  syncedAt: Date;
}

// Policy viewer types (KEEP THESE)
export interface PolicySearchParams {
  policyType?: PolicyType;
  searchTerm?: string;
  isActive?: boolean;
  controlId?: string;
  sortBy?: 'name' | 'type' | 'lastSynced';
  sortOrder?: 'asc' | 'desc';
}
```

---

## Step 7: Remove Import Statements from Other Files

Find and update files that import deleted types:

```bash
cd /home/claude

# Find files importing from settingsMapper.types
grep -rn "from.*settingsMapper.types" server/src --include="*.ts"

# Find files importing deleted types from m365.types
grep -rn "MappingConfidence\|ControlPolicyMapping\|GapAnalysis\|M365Recommendation\|ImprovementAction" server/src --include="*.ts"
```

**For each file found:**

📁 **File:** `[path-to-file].ts`

🔍 **FIND:**
```typescript
import { 
  MappingConfidence, 
  ControlPolicyMappingDTO,
  MappedSetting,
  GapAnalysisResult
} from '../types/m365.types';
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: Mapping-related type imports - no longer mapping policies to controls
```

**OR if only some types are removed:**

🔍 **FIND:**
```typescript
import { 
  PolicyType,
  M365Policy,
  MappingConfidence, 
  ControlPolicyMappingDTO
} from '../types/m365.types';
```

✏️ **REPLACE WITH:**
```typescript
import { 
  PolicyType,
  M365Policy
} from '../types/m365.types';
```

---

## Step 8: Compile Backend

```bash
cd /home/claude/server
npm run build 2>&1 | tee /tmp/types-build.log

if grep -q "error TS" /tmp/types-build.log; then
  echo "✗ TypeScript compilation errors"
  grep "error TS" /tmp/types-build.log | head -20
else
  echo "✓ Backend compiled successfully"
fi
```

---

## Step 9: Compile Frontend

```bash
cd /home/claude/client
npm run build 2>&1 | tee /tmp/frontend-types-build.log

if grep -q "error TS" /tmp/frontend-types-build.log; then
  echo "✗ Frontend TypeScript compilation errors"
  grep "error TS" /tmp/frontend-types-build.log | head -20
else
  echo "✓ Frontend compiled successfully"
fi
```

---

## Step 10: Verify No Type References Remain

```bash
cd /home/claude

echo "=== Checking for deleted type references ==="
grep -r "MappingConfidence\|ControlPolicyMapping\|GapAnalysis\|M365Recommendation\|ImprovementAction\|SettingsMappingStats" . \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=build \
  && echo "✗ Found references to deleted types" \
  || echo "✓ No references to deleted types found"
```

**Expected:** "✓ No references to deleted types found"

---

## Step 11: Update Type Export Index (if exists)

Check for type index files:

```bash
cd /home/claude
find . -path "*/types/index.ts" | grep -v node_modules
```

**If found:**

📁 **File:** `server/src/types/index.ts` (or `shared/types/index.ts`)

🔍 **FIND:**
```typescript
export * from './settingsMapper.types';
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: settingsMapper.types export - file deleted
```

**AND remove any mapping-related exports:**

🔍 **FIND:**
```typescript
export type { 
  MappingConfidence,
  ControlPolicyMappingDTO,
  GapAnalysisResult 
} from './m365.types';
```

✏️ **REPLACE WITH:**
```typescript
// REMOVED: Mapping-related type exports
```

---

## Step 12: Verify Prisma Generated Types

Ensure Prisma Client doesn't expose ControlPolicyMapping:

```bash
cd /home/claude/server

# Search in generated Prisma types
grep -n "ControlPolicyMapping" node_modules/.prisma/client/index.d.ts \
  && echo "✗ ControlPolicyMapping still in Prisma types" \
  || echo "✓ ControlPolicyMapping removed from Prisma types"
```

**Expected:** "✓ ControlPolicyMapping removed from Prisma types"

**If not removed:**
```bash
cd /home/claude/server
npx prisma generate
```

---

## Phase 6 Verification Checklist

Before proceeding to Phase 7, verify:

- [ ] Type files identified
- [ ] settingsMapper.types.ts deleted
- [ ] Mapping-related types removed from m365.types.ts
- [ ] Recommendation types removed from m365.types.ts
- [ ] Essential types preserved (PolicyType, M365Policy, etc.)
- [ ] Import statements updated in all files
- [ ] Backend compiles successfully
- [ ] Frontend compiles successfully
- [ ] No references to deleted types remain
- [ ] Type export index updated (if existed)
- [ ] Prisma generated types clean

**If any checks fail, review type modifications and fix compilation errors**

---

## Troubleshooting

### Issue: TypeScript Compilation Errors

**Solution:**
```bash
cd /home/claude

# Find all type errors
cd server && npm run build 2>&1 | grep "error TS" > /tmp/type-errors.log
cd ../client && npm run build 2>&1 | grep "error TS" >> /tmp/type-errors.log

cat /tmp/type-errors.log

# For each error, search for the problematic import
grep -rn "PROBLEM_TYPE_NAME" server/src client/src
```

### Issue: Cannot Find Type Errors

**Solution:**
```bash
cd /home/claude/server
# Clear all caches
rm -rf node_modules/.cache
rm -rf dist
rm -rf node_modules/.prisma

# Regenerate Prisma Client
npx prisma generate

# Rebuild
npm run build
```

### Issue: Type Still Referenced Somewhere

**Solution:**
```bash
cd /home/claude

# Find all remaining references
grep -rn "MappingConfidence\|ControlPolicyMapping" . \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude-dir=node_modules \
  --exclude-dir=.git

# Remove each reference manually
# Then rebuild both projects
```

---

## Files Modified/Deleted in This Phase

✅ **Modified:**
- `shared/types/m365.types.ts` (mapping types removed)
- `server/src/types/index.ts` (if existed - exports removed)
- Various files with type imports

❌ **Deleted:**
- `server/src/types/settingsMapper.types.ts`

✅ **Preserved Types in m365.types.ts:**
- `PolicyType`
- `M365Policy`
- `M365SyncLog`
- `PolicySearchParams`

❌ **Removed Types:**
- `MappingConfidence`
- `ControlPolicyMappingDTO`
- `MappedSetting`
- `GapAnalysisResult`
- `GapDetail`
- `AffectedPolicy`
- `SettingsMappingStats`
- `M365Recommendation`
- `ImprovementAction`
- `PlatformCoverage`
- `PolicyImplementation`
- `ImplementationSetting`

---

## Next Steps

Once all verifications pass, proceed to:
- **Phase 7: Post-Deletion Verification**

---

## Rollback Instructions

If issues occur:

```bash
cd /home/claude
git checkout backup-before-mapping-deletion server/src/types/ shared/types/
cd server
npx prisma generate
npm run build
```
