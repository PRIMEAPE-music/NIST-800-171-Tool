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
    } else {
      // Reset form for new control
      setFormData({
        isImplemented: false,
        hasEvidence: false,
        isTested: false,
        meetsRequirement: false,
        assessorNotes: '',
      });
    }
  }, [existingAssessment, control.id]);

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
