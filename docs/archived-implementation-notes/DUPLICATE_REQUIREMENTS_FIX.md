# Duplicate Requirements Fix - Summary

## Issue Identified

The Gap Analysis tab pages were showing duplicate requirements (policies, procedures, etc.) for each control. Investigation revealed that **996 sets of duplicates** existed in the database, with some requirements appearing up to 9 times.

## Root Cause

The issue was caused by the evidence requirements import script ([import-evidence-requirements.ts](server/src/scripts/import-evidence-requirements.ts:166)) being run multiple times without proper duplicate detection:

1. **Missing Unique Constraint**: The `evidence_requirements` table had no unique constraint to prevent duplicate entries
2. **Import Script Used `.create()`**: The script used `prisma.evidenceRequirement.create()` without checking for existing records
3. **Multiple Executions**: The script was run 3-6 times (some up to 9 times), creating duplicates each time

## Solution Implemented

### 1. Removed Existing Duplicates ✅

Created and executed [remove-duplicate-requirements.ts](server/src/scripts/remove-duplicate-requirements.ts:1):
- Identified 996 duplicate groups
- Deleted **2,046 duplicate records**
- Kept the oldest record for each unique requirement
- Verified: **996 unique requirements** remain

### 2. Added Database Constraint ✅

Modified [schema.prisma](server/prisma/schema.prisma:909):
```prisma
model EvidenceRequirement {
  // ... fields ...

  @@unique([controlId, evidenceType, name])  // NEW: Prevents duplicates
  @@index([controlId])
  @@index([evidenceType])
  @@map("evidence_requirements")
}
```

This ensures the database will reject any attempt to insert duplicate requirements in the future.

### 3. Updated Import Script ✅

Modified [import-evidence-requirements.ts](server/src/scripts/import-evidence-requirements.ts:166) to use `upsert()` instead of `create()`:

**Before:**
```typescript
await prisma.evidenceRequirement.create({
  data: { ... }
});
```

**After:**
```typescript
await prisma.evidenceRequirement.upsert({
  where: {
    controlId_evidenceType_name: {
      controlId: existingControl.id,
      evidenceType: 'policy',
      name: policy.standardizedName,
    }
  },
  update: { /* update fields */ },
  create: { /* create fields */ }
});
```

Now if the script runs again, it will update existing requirements instead of creating duplicates.

## Files Modified

1. **server/prisma/schema.prisma** - Added unique constraint
2. **server/src/scripts/import-evidence-requirements.ts** - Changed all `.create()` to `.upsert()`
3. **server/src/scripts/remove-duplicate-requirements.ts** - NEW: Cleanup script
4. **server/src/scripts/check-duplicate-requirements.ts** - NEW: Verification script

## Verification

To verify the fix worked:

1. **Check for duplicates:**
   ```bash
   npx ts-node server/src/scripts/check-duplicate-requirements.ts
   ```
   Should show: "✅ No duplicates found!"

2. **Test the Gap Analysis tab** - Navigate to any control's Gap Analysis tab and verify requirements are no longer duplicated

## Prevention

The combination of:
- ✅ Unique database constraint
- ✅ Upsert-based import script

...ensures duplicates cannot occur in the future, even if the import script is run multiple times.

## Impact

- **User Experience**: Gap Analysis tabs now show clean, non-duplicated requirement lists
- **Data Integrity**: 996 unique requirements remain (down from 3,042 with duplicates)
- **Future-Proof**: Database constraints prevent future duplicates
- **Performance**: Reduced database size and faster queries

---

**Status**: ✅ **COMPLETE** - Duplicates removed, constraints added, import script fixed
**Date**: 2025-12-05
