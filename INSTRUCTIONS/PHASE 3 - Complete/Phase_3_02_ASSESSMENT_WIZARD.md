# Part 2: Assessment Wizard Component

## Objective
Build an intuitive, multi-step wizard interface for conducting control assessments. The wizard guides users through evaluating all 110 NIST 800-171r3 controls with progress tracking and auto-save functionality.

## Prerequisites
- Part 1 completed (Assessment backend API functional)
- React app with MUI configured
- React Router setup
- Dark theme colors defined

## Component Architecture

```
client/src/
├── components/
│   └── assessment/
│       ├── AssessmentWizard.tsx          # Main wizard container
│       ├── AssessmentQuestionCard.tsx     # Individual question display
│       ├── AssessmentProgress.tsx         # Progress indicator
│       ├── AssessmentNavigation.tsx       # Next/Previous buttons
│       └── AssessmentSummary.tsx          # Final review screen
├── hooks/
│   └── useAssessmentWizard.ts            # Wizard state management
└── services/
    └── assessmentService.ts               # API client
```

## Implementation Steps

### Step 1: Create Assessment API Service

📁 **File:** `client/src/services/assessmentService.ts`

```typescript
// API client for assessment operations

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface AssessmentData {
  controlId: number;
  isImplemented: boolean;
  hasEvidence: boolean;
  isTested: boolean;
  meetsRequirement: boolean;
  assessorNotes?: string;
}

export interface AssessmentResponse {
  id: number;
  controlId: number;
  controlNumber: string;
  controlTitle: string;
  assessmentDate: string;
  isImplemented: boolean;
  hasEvidence: boolean;
  isTested: boolean;
  meetsRequirement: boolean;
  riskScore: number;
  assessorNotes?: string;
  createdAt: string;
}

export interface AssessmentStats {
  totalControls: number;
  assessedControls: number;
  implementedControls: number;
  controlsWithEvidence: number;
  testedControls: number;
  fullyCompliantControls: number;
  averageRiskScore: number;
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface GapItem {
  controlId: number;
  controlNumber: string;
  controlTitle: string;
  family: string;
  priority: string;
  riskScore: number;
  isImplemented: boolean;
  hasEvidence: boolean;
  isTested: boolean;
  meetsRequirement: boolean;
  gapDescription: string;
}

class AssessmentService {
  /**
   * Create a new assessment
   */
  async createAssessment(data: AssessmentData): Promise<AssessmentResponse> {
    const response = await axios.post(`${API_BASE_URL}/assessments`, data);
    return response.data;
  }

  /**
   * Update an existing assessment
   */
  async updateAssessment(
    id: number,
    data: Partial<AssessmentData>
  ): Promise<AssessmentResponse> {
    const response = await axios.put(`${API_BASE_URL}/assessments/${id}`, data);
    return response.data;
  }

  /**
   * Get assessment by ID
   */
  async getAssessmentById(id: number): Promise<AssessmentResponse> {
    const response = await axios.get(`${API_BASE_URL}/assessments/${id}`);
    return response.data;
  }

  /**
   * Get all assessments with optional filters
   */
  async getAllAssessments(filters?: {
    controlId?: number;
    family?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<AssessmentResponse[]> {
    const params = new URLSearchParams();
    if (filters?.controlId) params.append('controlId', filters.controlId.toString());
    if (filters?.family) params.append('family', filters.family);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);

    const response = await axios.get(`${API_BASE_URL}/assessments?${params}`);
    return response.data;
  }

  /**
   * Get latest assessment for each control
   */
  async getLatestAssessments(): Promise<AssessmentResponse[]> {
    const response = await axios.get(`${API_BASE_URL}/assessments/latest`);
    return response.data;
  }

  /**
   * Get assessment statistics
   */
  async getStats(): Promise<AssessmentStats> {
    const response = await axios.get(`${API_BASE_URL}/assessments/stats`);
    return response.data;
  }

  /**
   * Get gap analysis
   */
  async getGapAnalysis(): Promise<GapItem[]> {
    const response = await axios.get(`${API_BASE_URL}/assessments/gaps`);
    return response.data;
  }

  /**
   * Compare assessments between two dates
   */
  async compareAssessments(oldDate: string, newDate: string) {
    const response = await axios.get(`${API_BASE_URL}/assessments/compare`, {
      params: { oldDate, newDate },
    });
    return response.data;
  }

  /**
   * Delete an assessment
   */
  async deleteAssessment(id: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/assessments/${id}`);
  }
}

export default new AssessmentService();
```

### Step 2: Create Custom Hook for Wizard State

📁 **File:** `client/src/hooks/useAssessmentWizard.ts`

```typescript
// Custom hook for managing assessment wizard state

import { useState, useCallback, useEffect } from 'react';
import assessmentService, { AssessmentData } from '../services/assessmentService';

export interface Control {
  id: number;
  controlId: string;
  family: string;
  title: string;
  requirementText: string;
  discussionText?: string;
  priority: string;
}

export interface WizardState {
  currentIndex: number;
  assessments: Map<number, AssessmentData>;
  isSaving: boolean;
  error: string | null;
}

export const useAssessmentWizard = (controls: Control[]) => {
  const [state, setState] = useState<WizardState>({
    currentIndex: 0,
    assessments: new Map(),
    isSaving: false,
    error: null,
  });

  // Calculate progress
  const progress = (state.assessments.size / controls.length) * 100;
  const currentControl = controls[state.currentIndex];
  const isFirstControl = state.currentIndex === 0;
  const isLastControl = state.currentIndex === controls.length - 1;

  /**
   * Move to next control
   */
  const goToNext = useCallback(() => {
    if (!isLastControl) {
      setState((prev) => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
      }));
    }
  }, [isLastControl]);

  /**
   * Move to previous control
   */
  const goToPrevious = useCallback(() => {
    if (!isFirstControl) {
      setState((prev) => ({
        ...prev,
        currentIndex: prev.currentIndex - 1,
      }));
    }
  }, [isFirstControl]);

  /**
   * Jump to specific control index
   */
  const goToControl = useCallback((index: number) => {
    if (index >= 0 && index < controls.length) {
      setState((prev) => ({
        ...prev,
        currentIndex: index,
      }));
    }
  }, [controls.length]);

  /**
   * Save assessment for current control
   */
  const saveAssessment = useCallback(
    async (data: Omit<AssessmentData, 'controlId'>) => {
      if (!currentControl) return;

      setState((prev) => ({ ...prev, isSaving: true, error: null }));

      try {
        const assessmentData: AssessmentData = {
          ...data,
          controlId: currentControl.id,
        };

        // Save to backend
        await assessmentService.createAssessment(assessmentData);

        // Update local state
        setState((prev) => {
          const newAssessments = new Map(prev.assessments);
          newAssessments.set(currentControl.id, assessmentData);
          return {
            ...prev,
            assessments: newAssessments,
            isSaving: false,
          };
        });

        // Auto-advance to next control if not last
        if (!isLastControl) {
          setTimeout(goToNext, 500);
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isSaving: false,
          error: error instanceof Error ? error.message : 'Failed to save assessment',
        }));
      }
    },
    [currentControl, isLastControl, goToNext]
  );

  /**
   * Get assessment for current control
   */
  const getCurrentAssessment = useCallback(() => {
    if (!currentControl) return null;
    return state.assessments.get(currentControl.id) || null;
  }, [currentControl, state.assessments]);

  /**
   * Check if current control has been assessed
   */
  const isCurrentControlAssessed = useCallback(() => {
    if (!currentControl) return false;
    return state.assessments.has(currentControl.id);
  }, [currentControl, state.assessments]);

  /**
   * Load existing assessments (for editing)
   */
  const loadExistingAssessments = useCallback(async () => {
    try {
      const latestAssessments = await assessmentService.getLatestAssessments();
      
      const assessmentMap = new Map<number, AssessmentData>();
      latestAssessments.forEach((assessment) => {
        assessmentMap.set(assessment.controlId, {
          controlId: assessment.controlId,
          isImplemented: assessment.isImplemented,
          hasEvidence: assessment.hasEvidence,
          isTested: assessment.isTested,
          meetsRequirement: assessment.meetsRequirement,
          assessorNotes: assessment.assessorNotes,
        });
      });

      setState((prev) => ({
        ...prev,
        assessments: assessmentMap,
      }));
    } catch (error) {
      console.error('Failed to load existing assessments:', error);
    }
  }, []);

  // Load existing assessments on mount
  useEffect(() => {
    loadExistingAssessments();
  }, [loadExistingAssessments]);

  return {
    currentControl,
    currentIndex: state.currentIndex,
    progress,
    isFirstControl,
    isLastControl,
    isSaving: state.isSaving,
    error: state.error,
    assessedCount: state.assessments.size,
    totalControls: controls.length,
    goToNext,
    goToPrevious,
    goToControl,
    saveAssessment,
    getCurrentAssessment,
    isCurrentControlAssessed,
  };
};
```

### Step 3: Create Assessment Question Card Component

📁 **File:** `client/src/components/assessment/AssessmentQuestionCard.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Box,
  Chip,
  Divider,
} from '@mui/material';
import { Control } from '../../hooks/useAssessmentWizard';
import { AssessmentData } from '../../services/assessmentService';

interface AssessmentQuestionCardProps {
  control: Control;
  existingAssessment?: Omit<AssessmentData, 'controlId'> | null;
  onSave: (data: Omit<AssessmentData, 'controlId'>) => void;
  isSaving: boolean;
}

const AssessmentQuestionCard: React.FC<AssessmentQuestionCardProps> = ({
  control,
  existingAssessment,
  onSave,
  isSaving,
}) => {
  const [formData, setFormData] = useState({
    isImplemented: existingAssessment?.isImplemented ?? false,
    hasEvidence: existingAssessment?.hasEvidence ?? false,
    isTested: existingAssessment?.isTested ?? false,
    meetsRequirement: existingAssessment?.meetsRequirement ?? false,
    assessorNotes: existingAssessment?.assessorNotes ?? '',
  });

  // Update form when existing assessment changes
  useEffect(() => {
    if (existingAssessment) {
      setFormData({
        isImplemented: existingAssessment.isImplemented,
        hasEvidence: existingAssessment.hasEvidence,
        isTested: existingAssessment.isTested,
        meetsRequirement: existingAssessment.meetsRequirement,
        assessorNotes: existingAssessment.assessorNotes || '',
      });
    }
  }, [existingAssessment]);

  const handleRadioChange = (field: keyof typeof formData, value: string) => {
    const boolValue = value === 'true';
    const newData = { ...formData, [field]: boolValue };
    setFormData(newData);
    
    // Auto-save on each change
    onSave(newData);
  };

  const handleNotesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, assessorNotes: event.target.value });
  };

  const handleNotesBlur = () => {
    // Save on blur (when user finishes typing)
    onSave(formData);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'error';
      case 'High':
        return 'warning';
      case 'Medium':
        return 'info';
      case 'Low':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Card
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <CardContent>
        {/* Control Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              {control.family} Family
            </Typography>
            <Typography variant="h5" gutterBottom>
              {control.controlId}: {control.title}
            </Typography>
          </Box>
          <Chip
            label={control.priority}
            color={getPriorityColor(control.priority) as any}
            size="small"
          />
        </Box>

        {/* Requirement Text */}
        <Box mb={3}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            NIST Requirement:
          </Typography>
          <Typography variant="body2" paragraph>
            {control.requirementText}
          </Typography>
          {control.discussionText && (
            <>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Discussion:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {control.discussionText}
              </Typography>
            </>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Assessment Questions */}
        <Box display="flex" flexDirection="column" gap={3}>
          {/* Question 1: Implementation */}
          <FormControl component="fieldset">
            <FormLabel component="legend">
              1. Is this control implemented in your environment?
            </FormLabel>
            <RadioGroup
              row
              value={formData.isImplemented.toString()}
              onChange={(e) => handleRadioChange('isImplemented', e.target.value)}
            >
              <FormControlLabel value="true" control={<Radio />} label="Yes" />
              <FormControlLabel value="false" control={<Radio />} label="No" />
            </RadioGroup>
          </FormControl>

          {/* Question 2: Evidence */}
          <FormControl component="fieldset">
            <FormLabel component="legend">
              2. Do you have documented evidence of this control?
            </FormLabel>
            <RadioGroup
              row
              value={formData.hasEvidence.toString()}
              onChange={(e) => handleRadioChange('hasEvidence', e.target.value)}
            >
              <FormControlLabel value="true" control={<Radio />} label="Yes" />
              <FormControlLabel value="false" control={<Radio />} label="No" />
            </RadioGroup>
          </FormControl>

          {/* Question 3: Testing */}
          <FormControl component="fieldset">
            <FormLabel component="legend">
              3. Has this control been tested or verified?
            </FormLabel>
            <RadioGroup
              row
              value={formData.isTested.toString()}
              onChange={(e) => handleRadioChange('isTested', e.target.value)}
            >
              <FormControlLabel value="true" control={<Radio />} label="Yes" />
              <FormControlLabel value="false" control={<Radio />} label="No" />
            </RadioGroup>
          </FormControl>

          {/* Question 4: Requirement Met */}
          <FormControl component="fieldset">
            <FormLabel component="legend">
              4. Does the implementation fully meet the NIST requirement?
            </FormLabel>
            <RadioGroup
              row
              value={formData.meetsRequirement.toString()}
              onChange={(e) => handleRadioChange('meetsRequirement', e.target.value)}
            >
              <FormControlLabel value="true" control={<Radio />} label="Yes" />
              <FormControlLabel value="false" control={<Radio />} label="No" />
            </RadioGroup>
          </FormControl>

          {/* Notes */}
          <TextField
            label="Additional Notes (Optional)"
            multiline
            rows={3}
            value={formData.assessorNotes}
            onChange={handleNotesChange}
            onBlur={handleNotesBlur}
            placeholder="Add any relevant notes about implementation, gaps, or remediation plans..."
            fullWidth
            disabled={isSaving}
          />
        </Box>

        {/* Saving Indicator */}
        {isSaving && (
          <Box mt={2}>
            <Typography variant="caption" color="text.secondary">
              Saving...
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AssessmentQuestionCard;
```

### Step 4: Create Progress Indicator Component

📁 **File:** `client/src/components/assessment/AssessmentProgress.tsx`

```typescript
import React from 'react';
import { Box, LinearProgress, Typography, Paper } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';

interface AssessmentProgressProps {
  currentIndex: number;
  totalControls: number;
  assessedCount: number;
  progress: number;
}

const AssessmentProgress: React.FC<AssessmentProgressProps> = ({
  currentIndex,
  totalControls,
  assessedCount,
  progress,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        bgcolor: 'background.elevated',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="body2" color="text.secondary">
          Assessment Progress
        </Typography>
        <Box display="flex" alignItems="center" gap={0.5}>
          <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
          <Typography variant="body2" fontWeight="medium">
            {assessedCount} of {totalControls} controls
          </Typography>
        </Box>
      </Box>

      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 8,
          borderRadius: 1,
          bgcolor: 'rgba(255, 255, 255, 0.08)',
          '& .MuiLinearProgress-bar': {
            bgcolor: 'success.main',
            borderRadius: 1,
          },
        }}
      />

      <Box display="flex" justifyContent="space-between" mt={1}>
        <Typography variant="caption" color="text.secondary">
          {Math.round(progress)}% Complete
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Control {currentIndex + 1} of {totalControls}
        </Typography>
      </Box>
    </Paper>
  );
};

export default AssessmentProgress;
```

### Step 5: Create Navigation Component

📁 **File:** `client/src/components/assessment/AssessmentNavigation.tsx`

```typescript
import React from 'react';
import { Box, Button } from '@mui/material';
import { ArrowBack, ArrowForward, Check } from '@mui/icons-material';

interface AssessmentNavigationProps {
  onPrevious: () => void;
  onNext: () => void;
  onFinish: () => void;
  isFirstControl: boolean;
  isLastControl: boolean;
  isCurrentControlAssessed: boolean;
  disabled?: boolean;
}

const AssessmentNavigation: React.FC<AssessmentNavigationProps> = ({
  onPrevious,
  onNext,
  onFinish,
  isFirstControl,
  isLastControl,
  isCurrentControlAssessed,
  disabled = false,
}) => {
  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      sx={{ mt: 3 }}
    >
      <Button
        variant="outlined"
        startIcon={<ArrowBack />}
        onClick={onPrevious}
        disabled={isFirstControl || disabled}
      >
        Previous
      </Button>

      <Box>
        {isLastControl ? (
          <Button
            variant="contained"
            endIcon={<Check />}
            onClick={onFinish}
            disabled={disabled}
            sx={{
              bgcolor: 'success.main',
              '&:hover': { bgcolor: 'success.dark' },
            }}
          >
            Finish Assessment
          </Button>
        ) : (
          <Button
            variant="contained"
            endIcon={<ArrowForward />}
            onClick={onNext}
            disabled={disabled}
          >
            Next Control
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default AssessmentNavigation;
```

### Step 6: Create Main Wizard Component

📁 **File:** `client/src/components/assessment/AssessmentWizard.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Alert,
  Snackbar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAssessmentWizard, Control } from '../../hooks/useAssessmentWizard';
import AssessmentQuestionCard from './AssessmentQuestionCard';
import AssessmentProgress from './AssessmentProgress';
import AssessmentNavigation from './AssessmentNavigation';
import controlService from '../../services/controlService';

const AssessmentWizard: React.FC = () => {
  const navigate = useNavigate();
  const [controls, setControls] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const {
    currentControl,
    currentIndex,
    progress,
    isFirstControl,
    isLastControl,
    isSaving,
    error,
    assessedCount,
    totalControls,
    goToNext,
    goToPrevious,
    saveAssessment,
    getCurrentAssessment,
    isCurrentControlAssessed,
  } = useAssessmentWizard(controls);

  // Load all controls on mount
  useEffect(() => {
    const loadControls = async () => {
      try {
        const allControls = await controlService.getAllControls();
        setControls(allControls);
      } catch (err) {
        console.error('Failed to load controls:', err);
      } finally {
        setLoading(false);
      }
    };

    loadControls();
  }, []);

  const handleFinish = () => {
    setShowFinishDialog(true);
  };

  const handleConfirmFinish = () => {
    setShowFinishDialog(false);
    setSnackbarMessage('Assessment completed successfully!');
    setSnackbarOpen(true);
    
    // Navigate to gap analysis after 2 seconds
    setTimeout(() => {
      navigate('/gap-analysis');
    }, 2000);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography>Loading controls...</Typography>
      </Container>
    );
  }

  if (controls.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          No controls found. Please ensure the database is seeded with NIST 800-171r3 controls.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          NIST 800-171r3 Assessment Wizard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Answer the questions below for each control to assess your compliance posture.
        </Typography>
      </Box>

      {/* Progress Indicator */}
      <Box mb={3}>
        <AssessmentProgress
          currentIndex={currentIndex}
          totalControls={totalControls}
          assessedCount={assessedCount}
          progress={progress}
        />
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      {/* Current Control Assessment */}
      {currentControl && (
        <>
          <AssessmentQuestionCard
            control={currentControl}
            existingAssessment={getCurrentAssessment()}
            onSave={saveAssessment}
            isSaving={isSaving}
          />

          <AssessmentNavigation
            onPrevious={goToPrevious}
            onNext={goToNext}
            onFinish={handleFinish}
            isFirstControl={isFirstControl}
            isLastControl={isLastControl}
            isCurrentControlAssessed={isCurrentControlAssessed()}
            disabled={isSaving}
          />
        </>
      )}

      {/* Finish Confirmation Dialog */}
      <Dialog open={showFinishDialog} onClose={() => setShowFinishDialog(false)}>
        <DialogTitle>Complete Assessment?</DialogTitle>
        <DialogContent>
          <Typography>
            You have assessed {assessedCount} of {totalControls} controls.
            {assessedCount < totalControls && (
              <Box mt={2} color="warning.main">
                <strong>Note:</strong> {totalControls - assessedCount} controls have not been assessed yet.
                You can return to this wizard later to complete them.
              </Box>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFinishDialog(false)}>Cancel</Button>
          <Button onClick={handleConfirmFinish} variant="contained" color="success">
            Complete & View Results
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Container>
  );
};

export default AssessmentWizard;
```

### Step 7: Add Control Service (if not exists)

📁 **File:** `client/src/services/controlService.ts`

```typescript
// API client for control operations

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface Control {
  id: number;
  controlId: string;
  family: string;
  title: string;
  requirementText: string;
  discussionText?: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

class ControlService {
  async getAllControls(): Promise<Control[]> {
    const response = await axios.get(`${API_BASE_URL}/controls`);
    return response.data;
  }

  async getControlById(id: number): Promise<Control> {
    const response = await axios.get(`${API_BASE_URL}/controls/${id}`);
    return response.data;
  }

  async getControlsByFamily(family: string): Promise<Control[]> {
    const response = await axios.get(`${API_BASE_URL}/controls?family=${family}`);
    return response.data;
  }
}

export default new ControlService();
```

### Step 8: Add Route to App

📁 **File:** `client/src/App.tsx`

🔍 **FIND:**
```typescript
// Existing routes
<Route path="/dashboard" element={<Dashboard />} />
<Route path="/controls" element={<ControlLibrary />} />
```

✏️ **ADD AFTER:**
```typescript
<Route path="/assessment" element={<AssessmentWizard />} />
```

### Step 9: Add Navigation Link

📁 **File:** `client/src/components/layout/Sidebar.tsx` (or wherever your nav menu is)

✏️ **ADD:**
```typescript
<ListItem button component={Link} to="/assessment">
  <ListItemIcon>
    <AssignmentIcon />
  </ListItemIcon>
  <ListItemText primary="Assessment Wizard" />
</ListItem>
```

## Testing the Wizard

1. **Start the app** and navigate to `/assessment`
2. **Verify:**
   - Progress bar displays correctly
   - Control information shows properly
   - All 4 questions are visible
   - Radio buttons respond to clicks
   - Auto-save works (check browser console for API calls)
   - Navigation buttons work correctly
   - Notes field saves on blur

3. **Test edge cases:**
   - First control (Previous button disabled)
   - Last control (Finish button appears)
   - Rapid clicking (debounce working)
   - Browser refresh (data persisted)

## Validation Checklist

✅ Wizard displays all 110 controls  
✅ Progress indicator updates correctly  
✅ Questions save automatically on change  
✅ Navigation between controls works  
✅ Notes field saves on blur  
✅ Existing assessments load correctly  
✅ Finish dialog appears on last control  
✅ Error handling displays properly  
✅ Dark theme colors applied  

## Next Step
Proceed to **Part 3: Risk Scoring & Gap Analysis Logic** to build the analytics layer.
