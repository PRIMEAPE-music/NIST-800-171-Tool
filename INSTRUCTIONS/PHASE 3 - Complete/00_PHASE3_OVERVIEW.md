# Phase 3: Assessment & Gap Analysis - Overview

## Phase Objectives
Build comprehensive assessment and gap analysis capabilities that allow IT administrators to:
1. Conduct structured assessments of all 110 NIST 800-171 Rev 3 controls
2. Calculate risk scores based on implementation status and control priority
3. Identify compliance gaps with clear prioritization
4. Track assessment history and measure improvement over time
5. Generate actionable gap analysis reports

## Prerequisites
- Phase 1 & 2 must be completed:
  - Database schema with controls, control_status, and assessments tables
  - Control Library page with all 110 controls displayed
  - Control Detail page with status management
  - Dashboard with basic compliance statistics
  - Backend API endpoints for controls

## Technical Context

### NIST 800-171 Rev 3 Structure
- **110 total security requirements** across 14 control families
- Control IDs follow format: `03.XX.YY` (e.g., 03.01.01, 03.05.01)
- **Control Families:**
  - AC (Access Control) - 22 controls
  - AT (Awareness and Training) - 3 controls
  - AU (Audit and Accountability) - 9 controls
  - CA (Assessment, Authorization, Monitoring) - 9 controls
  - CM (Configuration Management) - 11 controls
  - CP (Contingency Planning) - 3 controls
  - IA (Identification and Authentication) - 11 controls
  - IR (Incident Response) - 5 controls
  - MA (Maintenance) - 6 controls
  - MP (Media Protection) - 7 controls
  - PE (Physical Protection) - 6 controls
  - PS (Personnel Security) - 8 controls
  - RA (Risk Assessment) - 5 controls
  - SC (System and Communications Protection) - 13 controls
  - SI (System and Information Integrity) - 17 controls

### Database Schema (Relevant Tables)

**assessments table:**
```prisma
model Assessment {
  id                  Int       @id @default(autoincrement())
  controlId           Int       @map("control_id")
  assessmentDate      DateTime  @default(now()) @map("assessment_date")
  isImplemented       Boolean   @map("is_implemented")
  hasEvidence         Boolean   @map("has_evidence")
  isTested            Boolean   @map("is_tested")
  meetsRequirement    Boolean   @map("meets_requirement")
  riskScore           Int       @default(0) @map("risk_score")
  assessorNotes       String?   @map("assessor_notes")
  createdAt           DateTime  @default(now()) @map("created_at")
  
  control             Control   @relation(fields: [controlId], references: [id])
  
  @@map("assessments")
}
```

**controls table (reference):**
```prisma
model Control {
  id                  Int       @id @default(autoincrement())
  controlId           String    @unique @map("control_id")  // e.g., "03.01.01"
  family              String                                // e.g., "AC"
  title               String
  requirementText     String    @map("requirement_text")
  discussionText      String?   @map("discussion_text")
  priority            String    @default("Medium")          // Critical/High/Medium/Low
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")
  
  @@map("controls")
}
```

## Phase 3 Implementation Parts

### Part 1: Assessment Data Model & Backend API
**File:** `01_ASSESSMENT_BACKEND.md`
- Create assessment CRUD endpoints
- Implement risk scoring algorithm
- Build statistics/analytics endpoints
- Create assessment comparison logic

### Part 2: Assessment Wizard Component
**File:** `02_ASSESSMENT_WIZARD.md`
- Build multi-step wizard interface
- Create assessment question cards
- Implement progress tracking
- Handle wizard state management
- Auto-save functionality

### Part 3: Risk Scoring & Gap Analysis Logic
**File:** `03_RISK_SCORING.md`
- Define risk scoring factors and weights
- Implement risk calculation service
- Create gap prioritization algorithm
- Build comparison analytics

### Part 4: Gap Analysis UI Components
**File:** `04_GAP_ANALYSIS_UI.md`
- Risk matrix visualization
- Prioritized gap list component
- Gap detail cards
- Filter and sort controls

### Part 5: Assessment History & Comparison
**File:** `05_ASSESSMENT_HISTORY.md`
- Assessment history table
- Before/after comparison view
- Trend analysis charts
- Progress tracking metrics

### Part 6: Gap Analysis Page Integration
**File:** `06_PAGE_INTEGRATION.md`
- Main GapAnalysis page component
- Route configuration
- Navigation integration
- State management setup

## Implementation Order
Execute in numerical order (Part 1 → Part 6) as each builds on the previous:
1. Backend API first (data layer)
2. Risk scoring logic (business logic)
3. Assessment wizard (data collection)
4. Gap analysis UI (data presentation)
5. History/comparison (analytics)
6. Page integration (putting it all together)

## Key Design Decisions

### Risk Scoring Approach
**Factors (weighted):**
1. Control Priority (40%) - From NIST guidance (Critical/High/Medium/Low)
2. Implementation Status (30%) - Not implemented = highest risk
3. Evidence Status (15%) - No evidence = higher risk
4. Testing Status (15%) - Not tested = higher risk

**Risk Score Scale:** 0-100
- 0-25: Low Risk (green)
- 26-50: Medium Risk (yellow)
- 51-75: High Risk (orange)
- 76-100: Critical Risk (red)

### Assessment Questions
For each control, assessors answer:
1. **Is this control implemented?** (Yes/No/Partial)
2. **Do you have documented evidence?** (Yes/No)
3. **Has this been tested/verified?** (Yes/No)
4. **Does this meet the requirement fully?** (Yes/No)
5. **Assessor Notes** (free text)

### UI/UX Principles
- **Wizard-based assessment** for guided experience
- **Save progress** at each step (don't lose work)
- **Visual indicators** for risk levels (color-coded)
- **Sortable/filterable** gap lists for prioritization
- **Comparison views** to show improvement over time
- **Dark theme** with grayscale colors (per project requirements)

## Success Criteria
✅ IT admin can complete full assessment of 110 controls  
✅ Risk scores automatically calculated and displayed  
✅ Gap list clearly shows highest priority items  
✅ Assessment history tracked with comparison capability  
✅ Gap analysis report can be exported  
✅ All UI uses dark theme with proper color coding  

## Testing Checklist
- [ ] Create new assessment via wizard
- [ ] Answer all questions for multiple controls
- [ ] Verify risk scores calculate correctly
- [ ] Check gap list sorting/filtering
- [ ] Compare two assessments
- [ ] View assessment history
- [ ] Test auto-save functionality
- [ ] Verify data persistence across sessions

## Common Pitfalls to Avoid
⚠️ **Don't hardcode risk calculations** - Use configurable weights  
⚠️ **Don't skip validation** - Ensure all required fields are completed  
⚠️ **Don't forget loading states** - Show progress during calculations  
⚠️ **Don't ignore error handling** - Handle failed API calls gracefully  
⚠️ **Don't mix concerns** - Keep risk logic separate from UI  

## Next Steps After Phase 3
Once Phase 3 is complete:
- **Phase 4:** POAM Management (track remediation plans for gaps)
- **Phase 5:** Evidence Management (link documents to controls)
- **Phase 6:** M365 Integration (automated compliance checking)

## Questions to Resolve Before Starting
1. What is the current state of Phase 2? (Control Library and Dashboard complete?)
2. Are there any existing assessment endpoints in the backend?
3. What charting library preference? (Recharts recommended)
4. Should assessments be editable after creation?
5. How many historical assessments should be kept?

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**NIST Reference:** NIST SP 800-171 Revision 3 (May 2024)
