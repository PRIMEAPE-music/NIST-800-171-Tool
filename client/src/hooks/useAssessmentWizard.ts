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

      // Do NOT auto-advance - let user control navigation
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
