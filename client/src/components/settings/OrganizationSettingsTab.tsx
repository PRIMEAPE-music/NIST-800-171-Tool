import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { settingsService } from '../../services/settings.service';
import { OrganizationSettings } from '../../types/settings.types';

interface OrganizationSettingsTabProps {
  settings: OrganizationSettings;
  onUpdate: () => void;
}

const OrganizationSettingsTab: React.FC<OrganizationSettingsTabProps> = ({
  settings,
  onUpdate,
}) => {
  const [formData, setFormData] = useState<OrganizationSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleChange = (field: keyof OrganizationSettings) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'assessmentFrequencyDays'
      ? parseInt(event.target.value) || 0
      : event.target.value;

    setFormData({ ...formData, [field]: value });
    setSaveMessage(null);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveMessage(null);

      await settingsService.updateSettingsCategory('organization', {
        name: formData.name,
        compliance_officer_name: formData.complianceOfficerName,
        compliance_officer_email: formData.complianceOfficerEmail,
        assessment_frequency_days: formData.assessmentFrequencyDays.toString(),
      });

      setSaveMessage({
        type: 'success',
        text: 'Organization settings saved successfully!',
      });

      onUpdate();
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: 'Failed to save settings. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0', mb: 2 }}>
        Organization Information
      </Typography>

      <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 3 }}>
        Configure your organization details for reports and assessments.
      </Typography>

      {saveMessage && (
        <Alert severity={saveMessage.type} sx={{ mb: 3 }} onClose={() => setSaveMessage(null)}>
          {saveMessage.text}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Organization Name */}
        <TextField
          label="Organization Name"
          value={formData.name}
          onChange={handleChange('name')}
          fullWidth
          helperText="Your company or organization name"
          InputLabelProps={{ shrink: true }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#E0E0E0',
              '& fieldset': { borderColor: '#4A4A4A' },
            },
            '& .MuiInputLabel-root': { color: '#B0B0B0' },
            '& .MuiFormHelperText-root': { color: '#B0B0B0' },
          }}
        />

        {/* Compliance Officer Name */}
        <TextField
          label="Compliance Officer Name"
          value={formData.complianceOfficerName}
          onChange={handleChange('complianceOfficerName')}
          fullWidth
          helperText="Name of the person responsible for compliance"
          InputLabelProps={{ shrink: true }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#E0E0E0',
              '& fieldset': { borderColor: '#4A4A4A' },
            },
            '& .MuiInputLabel-root': { color: '#B0B0B0' },
            '& .MuiFormHelperText-root': { color: '#B0B0B0' },
          }}
        />

        {/* Compliance Officer Email */}
        <TextField
          label="Compliance Officer Email"
          type="email"
          value={formData.complianceOfficerEmail}
          onChange={handleChange('complianceOfficerEmail')}
          fullWidth
          helperText="Contact email for compliance matters"
          InputLabelProps={{ shrink: true }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#E0E0E0',
              '& fieldset': { borderColor: '#4A4A4A' },
            },
            '& .MuiInputLabel-root': { color: '#B0B0B0' },
            '& .MuiFormHelperText-root': { color: '#B0B0B0' },
          }}
        />

        {/* Assessment Frequency */}
        <TextField
          label="Assessment Frequency (Days)"
          type="number"
          value={formData.assessmentFrequencyDays}
          onChange={handleChange('assessmentFrequencyDays')}
          fullWidth
          helperText="How often to conduct compliance assessments (e.g., 90 days)"
          InputLabelProps={{ shrink: true }}
          inputProps={{ min: 1, max: 365 }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#E0E0E0',
              '& fieldset': { borderColor: '#4A4A4A' },
            },
            '& .MuiInputLabel-root': { color: '#B0B0B0' },
            '& .MuiFormHelperText-root': { color: '#B0B0B0' },
          }}
        />
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
          sx={{
            backgroundColor: '#90CAF9',
            color: '#000',
            '&:hover': {
              backgroundColor: '#64B5F6',
            },
          }}
        >
          {isSaving ? <CircularProgress size={24} /> : 'Save Settings'}
        </Button>
        <Button
          variant="outlined"
          onClick={() => setFormData(settings)}
          disabled={isSaving}
          sx={{
            borderColor: '#4A4A4A',
            color: '#90CAF9',
            '&:hover': {
              borderColor: '#90CAF9',
              backgroundColor: 'rgba(144, 202, 249, 0.05)',
            },
          }}
        >
          Reset
        </Button>
      </Box>
    </Box>
  );
};

export default OrganizationSettingsTab;
