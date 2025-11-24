# Implementation: Microsoft 365 Improvement Actions Tab for Control Details

## Overview
Add a new "M365 ACTIONS" tab to the individual control details pages that displays Microsoft NIST 800-171 Rev3 improvement actions mapped to each specific control. All mappings are provided in a JSON file and ready for implementation.

---

## Feature Requirements

### User Interface
1. **New Tab on Control Details Page**
   - Add "M365 ACTIONS" tab alongside existing tabs (Overview, Assessment, Gap Analysis, POAM, Evidence)
   - Tab should only appear if the control has mapped improvement actions
   - Display count badge showing number of actions (e.g., "M365 ACTIONS (5)")

2. **Actions Display**
   - Show all improvement actions mapped to the control in card/list format
   - Each action card should display:
     - **Action Title** (prominent heading)
     - **Confidence Level** (High/Medium/Low) - with color-coded badge
     - **Coverage Level** (Full/Partial/Supplementary) - with color-coded badge
     - **Primary/Supporting** indicator (isPrimary flag) - with icon/badge
     - **NIST Requirement** - specific sub-requirement reference
     - **Mapping Rationale** - detailed explanation in expandable/collapsible section
   
3. **Styling Requirements**
   - Consistent with existing dark theme
   - Color coding for badges:
     - **Confidence**: High (green), Medium (yellow), Low (red)
     - **Coverage**: Full (green), Partial (blue), Supplementary (grey)
     - **Primary**: Gold star icon or "PRIMARY" badge in accent color
   - Cards should be well-spaced with clear visual hierarchy
   - Responsive design for different screen sizes

4. **Empty State**
   - When no actions exist for a control: display friendly message
   - Example: "No Microsoft 365 improvement actions are currently mapped to this control."

---

## Technical Implementation

### Database Schema (Prisma)

Create new tables to store Microsoft improvement actions:

```prisma
model MicrosoftImprovementAction {
  id                String   @id @default(uuid())
  actionId          String   @unique // Microsoft's action ID
  actionTitle       String
  
  // Relationships
  mappings          ImprovementActionMapping[]
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model ImprovementActionMapping {
  id                String   @id @default(uuid())
  
  // Foreign Keys
  controlId         String
  control           Control  @relation(fields: [controlId], references: [id], onDelete: Cascade)
  
  actionId          String
  action            MicrosoftImprovementAction @relation(fields: [actionId], references: [id], onDelete: Cascade)
  
  // Mapping Details
  confidence        String   // High, Medium, Low
  coverageLevel     String   // Full, Partial, Supplementary
  isPrimary         Boolean
  mappingRationale  String   @db.Text
  nistRequirement   String   @db.Text
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([controlId, actionId])
  @@index([controlId])
  @@index([actionId])
}
```

### Data Migration/Seeding

Create a seed script to populate the database with the provided mappings:

**Location**: `backend/prisma/seeds/microsoft-actions-seed.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ImprovementActionData {
  actionId: string;
  actionTitle: string;
  confidence: string;
  coverageLevel: string;
  isPrimary: boolean;
  mappingRationale: string;
  nistRequirement: string;
}

interface ControlMapping {
  controlId: string;
  controlTitle: string;
  controlFamily: string;
  improvementActions: ImprovementActionData[];
}

async function seedMicrosoftActions() {
  console.log('Starting Microsoft Improvement Actions seeding...');

  // Read the JSON file
  const filePath = path.join(__dirname, '../../data/nist-improvement-actions-mapped.json');
  const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ControlMapping[];

  // Extract unique actions
  const uniqueActions = new Map<string, string>();
  jsonData.forEach(control => {
    control.improvementActions.forEach(action => {
      uniqueActions.set(action.actionId, action.actionTitle);
    });
  });

  console.log(`Found ${uniqueActions.size} unique improvement actions`);

  // Create improvement actions
  for (const [actionId, actionTitle] of uniqueActions.entries()) {
    await prisma.microsoftImprovementAction.upsert({
      where: { actionId },
      update: { actionTitle },
      create: { actionId, actionTitle }
    });
  }

  console.log('Created/updated improvement actions');

  // Create mappings
  let mappingCount = 0;
  for (const controlData of jsonData) {
    // Find control by controlNumber (e.g., "03.01.01")
    const control = await prisma.control.findFirst({
      where: { controlNumber: controlData.controlId }
    });

    if (!control) {
      console.warn(`Control not found: ${controlData.controlId}`);
      continue;
    }

    for (const actionData of controlData.improvementActions) {
      await prisma.improvementActionMapping.upsert({
        where: {
          controlId_actionId: {
            controlId: control.id,
            actionId: actionData.actionId
          }
        },
        update: {
          confidence: actionData.confidence,
          coverageLevel: actionData.coverageLevel,
          isPrimary: actionData.isPrimary,
          mappingRationale: actionData.mappingRationale,
          nistRequirement: actionData.nistRequirement
        },
        create: {
          controlId: control.id,
          actionId: actionData.actionId,
          confidence: actionData.confidence,
          coverageLevel: actionData.coverageLevel,
          isPrimary: actionData.isPrimary,
          mappingRationale: actionData.mappingRationale,
          nistRequirement: actionData.nistRequirement
        }
      });
      mappingCount++;
    }
  }

  console.log(`Created/updated ${mappingCount} action mappings`);
  console.log('Microsoft Improvement Actions seeding completed!');
}

seedMicrosoftActions()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Backend API Endpoints

**Location**: `backend/src/routes/microsoft-actions.routes.ts`

Create new routes:

```typescript
import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/microsoft-actions/control/:controlId
// Get all improvement actions for a specific control
router.get('/control/:controlId', async (req, res) => {
  try {
    const { controlId } = req.params;

    const mappings = await prisma.improvementActionMapping.findMany({
      where: { controlId },
      include: {
        action: true
      },
      orderBy: [
        { isPrimary: 'desc' },
        { confidence: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: mappings.map(mapping => ({
        id: mapping.id,
        actionId: mapping.action.actionId,
        actionTitle: mapping.action.actionTitle,
        confidence: mapping.confidence,
        coverageLevel: mapping.coverageLevel,
        isPrimary: mapping.isPrimary,
        mappingRationale: mapping.mappingRationale,
        nistRequirement: mapping.nistRequirement
      }))
    });
  } catch (error) {
    console.error('Error fetching improvement actions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch improvement actions'
    });
  }
});

// GET /api/microsoft-actions/stats
// Get statistics about improvement actions coverage
router.get('/stats', async (req, res) => {
  try {
    const totalActions = await prisma.microsoftImprovementAction.count();
    const totalMappings = await prisma.improvementActionMapping.count();
    const controlsWithActions = await prisma.improvementActionMapping.groupBy({
      by: ['controlId'],
      _count: true
    });

    res.json({
      success: true,
      data: {
        totalActions,
        totalMappings,
        controlsWithActions: controlsWithActions.length
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

export default router;
```

**Update**: `backend/src/index.ts` - Register the new routes:

```typescript
import microsoftActionsRoutes from './routes/microsoft-actions.routes';

// Add with other routes
app.use('/api/microsoft-actions', microsoftActionsRoutes);
```

### Frontend Components

#### 1. TypeScript Interface Definitions

**Location**: `frontend/src/types/microsoft-actions.types.ts`

```typescript
export interface MicrosoftImprovementAction {
  id: string;
  actionId: string;
  actionTitle: string;
  confidence: 'High' | 'Medium' | 'Low';
  coverageLevel: 'Full' | 'Partial' | 'Supplementary';
  isPrimary: boolean;
  mappingRationale: string;
  nistRequirement: string;
}

export interface ImprovementActionsStats {
  totalActions: number;
  totalMappings: number;
  controlsWithActions: number;
}
```

#### 2. M365 Actions Tab Component

**Location**: `frontend/src/components/controls/M365ActionsTab.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress,
  Stack
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Star as StarIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { MicrosoftImprovementAction } from '../../types/microsoft-actions.types';
import axios from 'axios';

interface M365ActionsTabProps {
  controlId: string;
}

const M365ActionsTab: React.FC<M365ActionsTabProps> = ({ controlId }) => {
  const [actions, setActions] = useState<MicrosoftImprovementAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActions();
  }, [controlId]);

  const fetchActions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/microsoft-actions/control/${controlId}`);
      setActions(response.data.data);
    } catch (err) {
      console.error('Error fetching actions:', err);
      setError('Failed to load Microsoft 365 improvement actions');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'success';
      case 'Medium': return 'warning';
      case 'Low': return 'error';
      default: return 'default';
    }
  };

  const getCoverageColor = (coverage: string) => {
    switch (coverage) {
      case 'Full': return 'success';
      case 'Partial': return 'info';
      case 'Supplementary': return 'default';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (actions.length === 0) {
    return (
      <Box p={3}>
        <Alert severity="info">
          No Microsoft 365 improvement actions are currently mapped to this control.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h6" gutterBottom>
        Microsoft 365 Improvement Actions ({actions.length})
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        The following Microsoft 365 security improvement actions are mapped to this control
        and can help achieve compliance.
      </Typography>

      <Stack spacing={2} mt={3}>
        {actions.map((action) => (
          <Card
            key={action.id}
            variant="outlined"
            sx={{
              borderLeft: action.isPrimary ? '4px solid' : undefined,
              borderLeftColor: action.isPrimary ? 'warning.main' : undefined
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="flex-start" gap={2} mb={2}>
                {action.isPrimary && (
                  <StarIcon color="warning" fontSize="small" />
                )}
                <Box flex={1}>
                  <Typography variant="h6" gutterBottom>
                    {action.actionTitle}
                  </Typography>

                  <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
                    <Chip
                      label={`Confidence: ${action.confidence}`}
                      color={getConfidenceColor(action.confidence)}
                      size="small"
                    />
                    <Chip
                      label={`Coverage: ${action.coverageLevel}`}
                      color={getCoverageColor(action.coverageLevel)}
                      size="small"
                    />
                    {action.isPrimary && (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Primary Action"
                        color="warning"
                        size="small"
                      />
                    )}
                  </Stack>

                  <Box mb={2}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      NIST Requirement:
                    </Typography>
                    <Typography variant="body2">
                      {action.nistRequirement}
                    </Typography>
                  </Box>

                  <Accordion
                    elevation={0}
                    sx={{
                      backgroundColor: 'background.default',
                      '&:before': { display: 'none' }
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">
                        Mapping Rationale
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" color="text.secondary">
                        {action.mappingRationale}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
};

export default M365ActionsTab;
```

#### 3. Update Control Details Page

**Location**: `frontend/src/pages/ControlDetailsPage.tsx`

Add the new tab to the existing tabs structure:

```typescript
// Add import
import M365ActionsTab from '../components/controls/M365ActionsTab';

// Inside the component, update the tabs array
const [tabValue, setTabValue] = useState(0);
const [actionsCount, setActionsCount] = useState(0);

// Fetch actions count on component mount
useEffect(() => {
  const fetchActionsCount = async () => {
    try {
      const response = await axios.get(`/api/microsoft-actions/control/${controlId}`);
      setActionsCount(response.data.data.length);
    } catch (err) {
      console.error('Error fetching actions count:', err);
    }
  };
  
  if (controlId) {
    fetchActionsCount();
  }
}, [controlId]);

// Update tabs JSX
<Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
  <Tab label="Overview" />
  <Tab label="Assessment" />
  <Tab label="Gap Analysis" />
  <Tab label="POAM" />
  <Tab label="Evidence" />
  {actionsCount > 0 && (
    <Tab label={`M365 Actions (${actionsCount})`} />
  )}
</Tabs>

// Update tab panels
{tabValue === 0 && <OverviewTab control={control} />}
{tabValue === 1 && <AssessmentTab controlId={controlId} />}
{tabValue === 2 && <GapAnalysisTab controlId={controlId} />}
{tabValue === 3 && <POAMTab controlId={controlId} />}
{tabValue === 4 && <EvidenceTab controlId={controlId} />}
{tabValue === 5 && actionsCount > 0 && <M365ActionsTab controlId={controlId} />}
```

---

## Implementation Steps

### Step 1: Database Setup
1. Update `backend/prisma/schema.prisma` with new models
2. Run Prisma migration: `npx prisma migrate dev --name add-microsoft-actions`
3. Copy the provided JSON file to `backend/prisma/data/nist-improvement-actions-mapped.json`
4. Create the seed script at `backend/prisma/seeds/microsoft-actions-seed.ts`
5. Run seed: `npx ts-node backend/prisma/seeds/microsoft-actions-seed.ts`

### Step 2: Backend Implementation
1. Create new route file: `backend/src/routes/microsoft-actions.routes.ts`
2. Update `backend/src/index.ts` to register routes
3. Test endpoints using curl or Postman:
   - GET `/api/microsoft-actions/control/:controlId`
   - GET `/api/microsoft-actions/stats`

### Step 3: Frontend Implementation
1. Create types file: `frontend/src/types/microsoft-actions.types.ts`
2. Create component: `frontend/src/components/controls/M365ActionsTab.tsx`
3. Update `frontend/src/pages/ControlDetailsPage.tsx` to add the new tab
4. Test the UI with various controls (those with and without actions)

### Step 4: Testing & Validation
1. Verify all 97 controls load correctly
2. Test controls with multiple actions (e.g., 03.01.01 has 5 actions)
3. Test controls with no actions (e.g., 03.15.01)
4. Verify badge colors match confidence/coverage levels
5. Test accordion expand/collapse for mapping rationale
6. Verify responsive design on different screen sizes
7. Check dark theme consistency

---

## Success Criteria

- [ ] Database schema created and migrated successfully
- [ ] All 97 controls seeded with their improvement action mappings
- [ ] Backend API endpoints return correct data
- [ ] "M365 ACTIONS" tab appears only for controls with actions
- [ ] Tab badge shows correct count
- [ ] All action details display correctly (title, badges, requirements, rationale)
- [ ] Color coding matches specifications
- [ ] Primary actions are visually distinguished (star icon, border)
- [ ] Empty state displays for controls without actions
- [ ] Dark theme styling is consistent
- [ ] UI is responsive across screen sizes
- [ ] No console errors or warnings

---

## Additional Notes

### Badge Color Specifications
- **Confidence Levels:**
  - High: Green (`success`)
  - Medium: Yellow (`warning`)
  - Low: Red (`error`)

- **Coverage Levels:**
  - Full: Green (`success`)
  - Partial: Blue (`info`)
  - Supplementary: Grey (`default`)

- **Primary Actions:**
  - Gold star icon
  - Yellow/orange border on left side of card
  - "PRIMARY ACTION" chip with warning color

### Performance Considerations
- Actions are fetched per control (not all at once)
- Consider caching action counts in Control model if performance becomes an issue
- Mapping rationale uses accordion to reduce initial render size

### Future Enhancements (Not in Scope)
- Link to Microsoft 365 Compliance portal for each action
- Track implementation status of actions
- Integration with Microsoft Secure Score API
- Bulk action implementation tracking
- Export actions list to CSV/PDF

---

## File Locations Summary

**Backend:**
- `backend/prisma/schema.prisma` - Database schema
- `backend/prisma/data/nist-improvement-actions-mapped.json` - Source data
- `backend/prisma/seeds/microsoft-actions-seed.ts` - Seed script
- `backend/src/routes/microsoft-actions.routes.ts` - API routes
- `backend/src/index.ts` - Route registration

**Frontend:**
- `frontend/src/types/microsoft-actions.types.ts` - TypeScript interfaces
- `frontend/src/components/controls/M365ActionsTab.tsx` - Main tab component
- `frontend/src/pages/ControlDetailsPage.tsx` - Tab integration

---

## Error Handling

Ensure proper error handling for:
- Database connection failures
- Missing control records
- API request failures
- Invalid data formats
- Empty/null values in JSON data

All errors should be logged and user-friendly messages displayed in the UI.
