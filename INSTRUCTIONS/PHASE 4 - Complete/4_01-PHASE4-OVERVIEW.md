# Phase 4: POAM Management - Overview & Architecture

## Phase Goal
Implement a complete Plan of Action & Milestones (POAM) management system for tracking remediation efforts on non-compliant NIST 800-171 controls.

## Timeline
Week 7 of development cycle

## What is a POAM?
A Plan of Action and Milestones (POAM) is a structured remediation plan that documents:
- Identified security gaps/weaknesses
- Planned corrective actions
- Resources required
- Timeline with milestones
- Assigned responsibility
- Status tracking

POAMs are referenced in NIST 800-171 rev3 requirement **03.12.02**:
> "Develop a plan of action and milestones for the system to document planned remediation actions to correct weaknesses or deficiencies noted during security assessments and to reduce or eliminate known system vulnerabilities."

## Phase 4 Components

### Frontend (React + TypeScript + MUI)
1. **POAM List Page** - Table view of all POAMs with filtering/sorting
2. **POAM Detail Page** - Individual POAM management interface
3. **POAM Form** - Create/edit POAM with validation
4. **Milestone Tracker** - Visual progress component
5. **POAM Timeline** - Gantt-style visualization (optional enhancement)

### Backend (Express + TypeScript + Prisma)
1. **POAM Routes** - RESTful API endpoints
2. **POAM Controller** - Business logic layer
3. **POAM Service** - Data access layer
4. **Milestone Management** - Nested milestone operations
5. **Status Workflow** - State machine for POAM status

### Database Schema (SQLite via Prisma)
```prisma
model Poam {
  id                   Int               @id @default(autoincrement())
  controlId            Int
  gapDescription       String
  remediationPlan      String
  assignedTo           String?
  priority             String            @default("Medium") // High, Medium, Low
  status               String            @default("Open")   // Open, In Progress, Completed, Risk Accepted
  startDate            DateTime?
  targetCompletionDate DateTime?
  actualCompletionDate DateTime?
  resourcesRequired    String?
  budgetEstimate       Float?
  riskAcceptanceNotes  String?
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @updatedAt
  
  control              Control           @relation(fields: [controlId], references: [id], onDelete: Cascade)
  milestones           PoamMilestone[]
  
  @@index([controlId])
  @@index([status])
  @@index([priority])
}

model PoamMilestone {
  id                   Int       @id @default(autoincrement())
  poamId               Int
  milestoneDescription String
  dueDate              DateTime
  completionDate       DateTime?
  status               String    @default("Pending") // Pending, In Progress, Completed
  createdAt            DateTime  @default(now())
  
  poam                 Poam      @relation(fields: [poamId], references: [id], onDelete: Cascade)
  
  @@index([poamId])
}
```

## API Endpoints

### POAM CRUD
- `GET /api/poams` - List all POAMs (with filters: status, priority, controlId)
- `GET /api/poams/:id` - Get single POAM with milestones
- `POST /api/poams` - Create new POAM
- `PUT /api/poams/:id` - Update POAM
- `PATCH /api/poams/:id/status` - Update status only
- `DELETE /api/poams/:id` - Delete POAM

### Milestone Management
- `POST /api/poams/:id/milestones` - Add milestone to POAM
- `PUT /api/poams/:poamId/milestones/:milestoneId` - Update milestone
- `DELETE /api/poams/:poamId/milestones/:milestoneId` - Delete milestone
- `PATCH /api/poams/:poamId/milestones/:milestoneId/complete` - Mark milestone complete

### Statistics
- `GET /api/poams/stats` - Get POAM statistics (count by status, overdue count, etc.)

## Status Workflow

```
Open → In Progress → Completed
  ↓
Risk Accepted
```

**Status Definitions:**
- **Open**: POAM created, remediation not started
- **In Progress**: Active remediation underway
- **Completed**: Remediation finished, control implemented
- **Risk Accepted**: Organization accepts the risk, no remediation planned

## Priority Levels
- **High**: Critical gaps requiring immediate attention
- **Medium**: Important gaps with reasonable timeline
- **Low**: Minor gaps, can be addressed as resources allow

## Key Features

### 1. POAM List View
- Sortable/filterable table
- Color-coded status indicators
- Priority badges
- Overdue warnings
- Quick actions (edit, delete, change status)
- Bulk operations (export, bulk status update)

### 2. POAM Detail View
- Full POAM information display
- Milestone progress tracker
- Timeline visualization
- Activity history
- Linked control information
- Edit capabilities

### 3. POAM Form
- Multi-step form or single page
- Control selection dropdown
- Rich text editor for descriptions
- Date pickers for timeline
- Resource/budget fields
- Validation rules
- Auto-save draft capability

### 4. Milestone Tracker
- Visual progress indicator
- Milestone list with checkboxes
- Due date warnings
- Completion percentage
- Add/edit/delete milestones inline

## Dark Theme Styling

### Status Colors
```typescript
const statusColors = {
  'Open': '#757575',           // Gray
  'In Progress': '#FFA726',    // Orange
  'Completed': '#66BB6A',      // Green
  'Risk Accepted': '#42A5F5',  // Blue
};

const priorityColors = {
  'High': '#F44336',     // Red
  'Medium': '#FF9800',   // Orange
  'Low': '#4CAF50',      // Green
};
```

### MUI Component Usage
- `Paper` for card containers
- `Table` with `TablePagination` for POAM list
- `Chip` for status/priority badges
- `LinearProgress` for milestone completion
- `Stepper` for milestone timeline
- `Dialog` for forms
- `DatePicker` from MUI X Date Pickers

## Validation Rules

### POAM Validation
- `controlId`: Required, must exist in controls table
- `gapDescription`: Required, min 10 characters
- `remediationPlan`: Required, min 20 characters
- `priority`: Required, must be High/Medium/Low
- `status`: Required, must be valid status
- `targetCompletionDate`: Optional, must be future date if provided
- `actualCompletionDate`: Optional, required if status is Completed
- `assignedTo`: Optional, string
- `budgetEstimate`: Optional, positive number

### Milestone Validation
- `milestoneDescription`: Required, min 5 characters
- `dueDate`: Required, must be <= POAM target completion date
- `status`: Required, must be Pending/In Progress/Completed
- `completionDate`: Optional, required if status is Completed

## Integration Points

### With Controls Module
- Link POAM to specific control
- Display POAM count on control detail page
- Auto-suggest creating POAM when control status is "Not Implemented"

### With Gap Analysis Module
- Generate POAMs from gap analysis results
- Pre-fill gap description from assessment
- Auto-prioritize based on risk score

### With Dashboard
- Show POAM statistics (total, overdue, by status)
- Display upcoming milestone deadlines
- Track remediation progress over time

## Testing Considerations
- Test CRUD operations for POAMs
- Test milestone management
- Test status transitions
- Test date validations
- Test cascading deletes (POAM → milestones)
- Test filtering and sorting
- Test overdue detection logic

## Implementation Order
1. **Database Setup** - Create Prisma schema, run migration, test relationships
2. **Backend API** - Implement all endpoints, validation, error handling
3. **Frontend Components** - Build UI components bottom-up
4. **Integration** - Connect to existing modules
5. **Testing** - Manual testing, fix bugs
6. **Polish** - UX improvements, loading states, error messages

## Success Criteria
✅ Create, read, update, delete POAMs
✅ Manage milestones within POAMs
✅ Visual progress tracking
✅ Status workflow transitions
✅ Filtering and sorting
✅ Integration with controls module
✅ Responsive dark theme UI
✅ Input validation and error handling
✅ Performance with 100+ POAMs

## References
- NIST SP 800-171 rev3, requirement 03.12.02
- Project structure: `/server/src/` and `/client/src/`
- Dark theme colors from PROJECT_INSTRUCTIONS.md
- Existing patterns from Phase 2 (Control Management)
