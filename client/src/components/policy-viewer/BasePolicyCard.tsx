import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  IconButton,
  Collapse,
  Divider,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  CheckCircleOutline as CompliantIcon,
  HighlightOff as NonCompliantIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { PolicyDetail, MappedControl } from '../../types/policyViewer.types';

interface BasePolicyCardProps {
  policy: PolicyDetail;
  accentColor: string;
  onOpenDetail: (policy: PolicyDetail) => void;
  children: React.ReactNode;
}

const BasePolicyCard: React.FC<BasePolicyCardProps> = ({
  policy,
  accentColor,
  onOpenDetail,
  children,
}) => {
  const [settingsExpanded, setSettingsExpanded] = React.useState(false);

  return (
    <Card
      sx={{
        mb: 2,
        borderLeft: `4px solid ${accentColor}`,
        '&:hover': {
          boxShadow: 4,
        },
      }}
    >
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
          <Box flex={1}>
            <Typography variant="h6" gutterBottom>
              {policy.policyName}
            </Typography>
            {policy.policyDescription && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {policy.policyDescription}
              </Typography>
            )}
          </Box>
          <Box display="flex" gap={1} alignItems="center">
            <Chip
              label={policy.policyType}
              size="small"
              sx={{
                bgcolor: accentColor,
                color: 'white',
              }}
            />
            <Tooltip title={policy.isActive ? 'Active' : 'Inactive'}>
              {policy.isActive ? (
                <ActiveIcon color="success" />
              ) : (
                <InactiveIcon color="disabled" />
              )}
            </Tooltip>
          </Box>
        </Box>

        {/* Metadata */}
        <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
          <Typography variant="caption" color="text.secondary">
            Last synced: {formatDistanceToNow(new Date(policy.lastSynced), { addSuffix: true })}
          </Typography>
          {policy.parsedData.createdDateTime && (
            <Typography variant="caption" color="text.secondary">
              Created: {new Date(policy.parsedData.createdDateTime).toLocaleDateString()}
            </Typography>
          )}
        </Box>

        {/* Mapped Controls */}
        {policy.mappedControls.length > 0 && (
          <Box mb={2}>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Mapped NIST Controls:
            </Typography>
            <Box display="flex" gap={0.5} flexWrap="wrap">
              {policy.mappedControls.map((control) => (
                <Tooltip
                  key={control.controlId}
                  title={`${control.controlTitle} (${control.mappingConfidence} confidence)`}
                >
                  <Chip
                    label={control.controlId}
                    size="small"
                    variant="outlined"
                    color={
                      control.mappingConfidence === 'High'
                        ? 'success'
                        : control.mappingConfidence === 'Medium'
                        ? 'warning'
                        : 'default'
                    }
                  />
                </Tooltip>
              ))}
            </Box>

            {/* Mapped Settings Details - Collapsible */}
            {policy.mappedControls.some((c) => c.mappedSettings && c.mappedSettings.length > 0) && (
              <Box sx={{ mt: 2 }}>
                <Box
                  display="flex"
                  alignItems="center"
                  gap={1}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setSettingsExpanded(!settingsExpanded)}
                >
                  <IconButton
                    size="small"
                    sx={{
                      transform: settingsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: '0.3s',
                    }}
                  >
                    <ExpandMoreIcon />
                  </IconButton>
                  <Typography variant="subtitle2" sx={{ color: '#E0E0E0' }}>
                    Setting-Level Mappings ({policy.mappedControls.reduce((acc, c) => acc + (c.mappedSettings?.length || 0), 0)} settings)
                  </Typography>
                </Box>
                <Collapse in={settingsExpanded} timeout="auto" unmountOnExit>
                  <Paper variant="outlined" sx={{ mt: 1, p: 2, bgcolor: '#1a1a1a', borderColor: '#4A4A4A' }}>
                    {policy.mappedControls.map((control) => {
                      if (!control.mappedSettings || control.mappedSettings.length === 0) {
                        return null;
                      }

                      return (
                        <Box key={control.controlId} sx={{ mb: 2 }}>
                          <Typography variant="caption" fontWeight="bold" display="block" mb={0.5} sx={{ color: '#90CAF9' }}>
                            {control.controlId} - {control.controlTitle}
                          </Typography>
                          <List dense disablePadding>
                            {control.mappedSettings.map((setting, idx) => (
                              <ListItem key={idx} sx={{ py: 0.5 }}>
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                  {setting.meetsRequirement ? (
                                    <CompliantIcon color="success" fontSize="small" />
                                  ) : (
                                    <NonCompliantIcon color="error" fontSize="small" />
                                  )}
                                </ListItemIcon>
                                <ListItemText
                                  primary={
                                    <Typography variant="body2" sx={{ color: '#E0E0E0' }}>
                                      <strong>{setting.settingName}:</strong> {String(setting.settingValue)}
                                    </Typography>
                                  }
                                  secondary={
                                    <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                                      {setting.validationMessage ||
                                        (setting.meetsRequirement ? 'Meets requirement' : 'Does not meet requirement')}
                                    </Typography>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      );
                    })}
                  </Paper>
                </Collapse>
              </Box>
            )}
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
        <Tooltip title="View full details">
          <IconButton onClick={() => onOpenDetail(policy)} size="small">
            <InfoIcon />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};

export default BasePolicyCard;
