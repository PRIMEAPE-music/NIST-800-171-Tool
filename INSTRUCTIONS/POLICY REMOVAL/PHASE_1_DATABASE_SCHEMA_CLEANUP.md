# Phase 1: Database Schema Cleanup

**Objective:** Remove control_policy_mappings table and clean up database schema.

**Estimated Time:** 10-15 minutes

**Prerequisites:**
- Phase 0 completed successfully
- Database backup exists
- No applications currently running

---

## Step 1: Stop Running Services

Ensure no services are accessing the database:

```bash
cd /home/claude

# Kill any running servers
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "node" 2>/dev/null || true

sleep 2
```

---

## Step 2: Update Prisma Schema

📁 **File:** `server/prisma/schema.prisma`

🔍 **FIND:**
```prisma
model ControlPolicyMapping {
  id                Int      @id @default(autoincrement())
  controlId         String
  policyId          Int
  mappingConfidence String   // High, Medium, Low
  mappingNotes      String?
  mappedSettings    String?  // JSON string of mapped settings with validation results
  isAutoMapped      Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  control Control      @relation(fields: [controlId], references: [id], onDelete: Cascade)
  policy  M365Policy   @relation(fields: [policyId], references: [id], onDelete: Cascade)

  @@unique([controlId, policyId])
  @@index([controlId])
  @@index([policyId])
  @@index([mappingConfidence])
  @@index([isAutoMapped])
  @@map("control_policy_mappings")
}
```

✏️ **REPLACE WITH:**
```prisma
// REMOVED: ControlPolicyMapping model
// This model mapped M365 policies to NIST controls
// Removed as part of policy mapping refactor
```

---

## Step 3: Remove ControlPolicyMapping Relations from Control Model

📁 **File:** `server/prisma/schema.prisma`

🔍 **FIND:**
```prisma
model Control {
  id                    String    @id
  family                String
  title                 String
  discussion            String?
  relatedControls       String?   // JSON array of related control IDs
  priority              String    @default("Medium")
  implementationStatus  String    @default("Not Started")
  complianceStatus      String    @default("Not Assessed")
  notes                 String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  assessments           Assessment[]
  poams                 POAM[]
  evidence              Evidence[]
  policyMappings        ControlPolicyMapping[]

  @@index([family])
  @@index([priority])
  @@index([implementationStatus])
  @@index([complianceStatus])
  @@map("controls")
}
```

✏️ **REPLACE WITH:**
```prisma
model Control {
  id                    String    @id
  family                String
  title                 String
  discussion            String?
  relatedControls       String?   // JSON array of related control IDs
  priority              String    @default("Medium")
  implementationStatus  String    @default("Not Started")
  complianceStatus      String    @default("Not Assessed")
  notes                 String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  assessments           Assessment[]
  poams                 POAM[]
  evidence              Evidence[]

  @@index([family])
  @@index([priority])
  @@index([implementationStatus])
  @@index([complianceStatus])
  @@map("controls")
}
```

---

## Step 4: Remove ControlPolicyMapping Relations from M365Policy Model

📁 **File:** `server/prisma/schema.prisma`

🔍 **FIND:**
```prisma
model M365Policy {
  id                Int      @id @default(autoincrement())
  externalId        String   @unique
  name              String
  description       String?
  policyType        String   // Intune, Purview, AzureAD
  policySubType     String?  // Device Configuration, Compliance, DLP, etc.
  platform          String?  // Windows, iOS, Android, macOS, All
  isActive          Boolean  @default(true)
  policyData        String   // JSON blob of full policy configuration
  lastSyncedAt      DateTime @default(now())
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  controlMappings   ControlPolicyMapping[]

  @@index([policyType])
  @@index([platform])
  @@index([isActive])
  @@index([lastSyncedAt])
  @@map("m365_policies")
}
```

✏️ **REPLACE WITH:**
```prisma
model M365Policy {
  id                Int      @id @default(autoincrement())
  externalId        String   @unique
  name              String
  description       String?
  policyType        String   // Intune, Purview, AzureAD
  policySubType     String?  // Device Configuration, Compliance, DLP, etc.
  platform          String?  // Windows, iOS, Android, macOS, All
  isActive          Boolean  @default(true)
  policyData        String   // JSON blob of full policy configuration
  lastSyncedAt      DateTime @default(now())
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([policyType])
  @@index([platform])
  @@index([isActive])
  @@index([lastSyncedAt])
  @@map("m365_policies")
}
```

---

## Step 5: Format Prisma Schema

```bash
cd /home/claude/server
npx prisma format
```

**Expected:** Schema should be formatted without errors

---

## Step 6: Create Migration

Create a migration to drop the control_policy_mappings table:

```bash
cd /home/claude/server
npx prisma migrate dev --name remove_control_policy_mappings
```

**Expected Output:**
- Migration file created in `prisma/migrations/`
- Migration applied successfully
- Prisma Client regenerated

---

## Step 7: Verify Table Removal

Confirm the table no longer exists:

```bash
cd /home/claude/server
npx prisma db execute --stdin <<< "SELECT name FROM sqlite_master WHERE type='table' AND name='control_policy_mappings';"
```

**Expected:** No results (empty output)

---

## Step 8: Verify Remaining Tables Intact

Ensure other tables are unaffected:

```bash
cd /home/claude/server
npx prisma db execute --stdin <<< "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

**Expected Tables Present:**
- controls
- m365_policies
- m365_sync_logs
- assessments
- poams
- evidence
- (other tables)

**Expected Tables ABSENT:**
- control_policy_mappings

---

## Step 9: Generate Updated Prisma Client

```bash
cd /home/claude/server
npx prisma generate
```

**Expected:** Client generated successfully with updated types

---

## Step 10: Verify TypeScript Types

Check that generated types no longer include ControlPolicyMapping:

```bash
cd /home/claude/server
grep -n "ControlPolicyMapping" node_modules/.prisma/client/index.d.ts || echo "✓ ControlPolicyMapping removed from generated types"
```

**Expected:** Should output "✓ ControlPolicyMapping removed from generated types"

---

## Phase 1 Verification Checklist

Before proceeding to Phase 2, verify:

- [ ] Prisma schema updated (ControlPolicyMapping model removed)
- [ ] Control model no longer references policyMappings
- [ ] M365Policy model no longer references controlMappings
- [ ] Migration created and applied successfully
- [ ] control_policy_mappings table dropped from database
- [ ] Other tables remain intact
- [ ] Prisma Client regenerated successfully
- [ ] TypeScript types updated (no ControlPolicyMapping references)

**If any checks fail, review migration and schema changes**

---

## Troubleshooting

### Issue: Migration Fails

**Solution:**
```bash
cd /home/claude/server
npx prisma migrate reset --force
npx prisma migrate dev --name remove_control_policy_mappings
```

### Issue: Prisma Client Generation Fails

**Solution:**
```bash
cd /home/claude/server
rm -rf node_modules/.prisma
npx prisma generate
```

### Issue: Database Locked

**Solution:**
```bash
# Kill any processes accessing the database
pkill -f "node" 2>/dev/null || true
sleep 2
# Retry migration
npx prisma migrate dev --name remove_control_policy_mappings
```

---

## Next Steps

Once all verifications pass, proceed to:
- **Phase 2: Backend Service Deletion**

---

## Rollback Instructions

If issues occur:

```bash
cd /home/claude
git checkout backup-before-mapping-deletion server/prisma/schema.prisma
cd server
cp prisma/dev.db.backup-YYYYMMDD-HHMMSS prisma/dev.db
npx prisma generate
```
