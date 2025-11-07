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
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAssessmentWizard, Control } from '../../hooks/useAssessmentWizard';
import AssessmentQuestionCard from './AssessmentQuestionCard';
import AssessmentProgress from './AssessmentProgress';
import AssessmentNavigation from './AssessmentNavigation';
import { controlService } from '../../services/controlService';

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
        const response = await controlService.getAllControls({ limit: 999 });
        // Map the response to match the Control interface
        const mappedControls: Control[] = response.data.map((ctrl) => ({
          id: ctrl.id,
          controlId: ctrl.controlId,
          family: ctrl.family,
          title: ctrl.title,
          requirementText: ctrl.requirementText,
          discussionText: ctrl.discussionText,
          priority: ctrl.priority,
        }));
        setControls(mappedControls);
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
      <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
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
        <Alert severity="error" sx={{ mb: 3 }}>
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
