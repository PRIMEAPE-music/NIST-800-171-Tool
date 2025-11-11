import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
  Paper,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CheckCircle,
  Error as ErrorIcon,
  CloudSync,
} from '@mui/icons-material';
import { settingsService } from '../../services/settings.service';
import { M365Settings } from '../../types/settings.types';

interface M365SettingsTabProps {
  settings: M365Settings;
  onUpdate: () => void;
}

const M365SettingsTab: React.FC<M365SettingsTabProps> = ({ settings, onUpdate }) => {
  const [formData, setFormData] = useState<M365Settings>(settings);
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [testResult, setTestResult] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleChange = (field: keyof M365Settings) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({ ...formData, [field]: event.target.value });
    setSaveMessage(null);
    setTestResult(null);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveMessage(null);

      await settingsService.updateSettingsCategory('m365', {
        tenant_id: formData.tenantId,
        client_id: formData.clientId,
        client_secret: formData.clientSecret,
        redirect_uri: formData.redirectUri,
        auto_sync_enabled: formData.autoSyncEnabled.toString(),
        sync_interval_hours: formData.syncIntervalHours.toString(),
      });

      setSaveMessage({
        type: 'success',
        text: 'M365 settings saved successfully!',
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

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);

      const result = await settingsService.testM365Connection({
        tenantId: formData.tenantId,
        clientId: formData.clientId,
        clientSecret: formData.clientSecret,
      });

      if (result.connected) {
        setTestResult({
          type: 'success',
          text: result.message,
        });
      } else {
        setTestResult({
          type: 'error',
          text: result.message || 'Connection test failed',
        });
      }
    } catch (error: any) {
      setTestResult({
        type: 'error',
        text: error.response?.data?.message || 'Failed to test connection',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0', mb: 2 }}>
        Microsoft 365 Integration
      </Typography>

      <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 3 }}>
        Configure your Azure AD app registration credentials to enable automated compliance
        checking through Microsoft Graph API.
      </Typography>

      {saveMessage && (
        <Alert severity={saveMessage.type} sx={{ mb: 3 }} onClose={() => setSaveMessage(null)}>
          {saveMessage.text}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Tenant ID */}
        <TextField
          label="Tenant ID"
          value={formData.tenantId}
          onChange={handleChange('tenantId')}
          fullWidth
          helperText="Your Azure AD Tenant (Directory) ID"
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

        {/* Client ID */}
        <TextField
          label="Client ID"
          value={formData.clientId}
          onChange={handleChange('clientId')}
          fullWidth
          helperText="Your Azure AD Application (Client) ID"
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

        {/* Client Secret */}
        <TextField
          label="Client Secret"
          type={showSecret ? 'text' : 'password'}
          value={formData.clientSecret}
          onChange={handleChange('clientSecret')}
          fullWidth
          helperText="Your Azure AD Application Client Secret"
          InputLabelProps={{ shrink: true }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowSecret(!showSecret)}
                  edge="end"
                  sx={{ color: '#B0B0B0' }}
                >
                  {showSecret ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#E0E0E0',
              '& fieldset': { borderColor: '#4A4A4A' },
            },
            '& .MuiInputLabel-root': { color: '#B0B0B0' },
            '& .MuiFormHelperText-root': { color: '#B0B0B0' },
          }}
        />

        {/* Redirect URI */}
        <TextField
          label="Redirect URI"
          value={formData.redirectUri}
          onChange={handleChange('redirectUri')}
          fullWidth
          helperText="OAuth redirect URI (typically http://localhost:3000/auth/callback)"
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
      </Box>

      <Divider sx={{ my: 3, borderColor: '#4A4A4A' }} />

      {/* Connection Status */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mb: 3,
          backgroundColor: '#1E1E1E',
          borderColor: '#4A4A4A',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="subtitle2" sx={{ color: '#E0E0E0', mb: 1 }}>
              Connection Status
            </Typography>
            {testResult ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {testResult.type === 'success' ? (
                  <CheckCircle sx={{ color: '#4CAF50', fontSize: 20 }} />
                ) : (
                  <ErrorIcon sx={{ color: '#F44336', fontSize: 20 }} />
                )}
                <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
                  {testResult.text}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
                {settings.lastSync
                  ? `Last synced: ${new Date(settings.lastSync).toLocaleString()}`
                  : 'Not connected yet'}
              </Typography>
            )}
          </Box>
          <Button
            variant="outlined"
            startIcon={isTesting ? <CircularProgress size={20} /> : <CloudSync />}
            onClick={handleTestConnection}
            disabled={isTesting || !formData.tenantId || !formData.clientId || !formData.clientSecret}
            sx={{
              borderColor: '#4A4A4A',
              color: '#90CAF9',
              '&:hover': {
                borderColor: '#90CAF9',
                backgroundColor: 'rgba(144, 202, 249, 0.05)',
              },
            }}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
        </Box>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2 }}>
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

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
            Need help setting up Azure AD?
          </Typography>
          <Typography variant="body2">
            Follow the setup guide in the documentation to create an app registration and configure
            the required API permissions.
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default M365SettingsTab;
