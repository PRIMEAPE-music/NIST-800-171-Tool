import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Divider,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircleOutline as CompliantIcon,
  HighlightOff as NonCompliantIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { PolicyDetail } from '../../types/policyViewer.types';
import ControlMappingsTab from './ControlMappingsTab';

interface PolicyDetailModalProps {
  policy: PolicyDetail | null;
  open: boolean;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`policy-tabpanel-${index}`}
      aria-labelledby={`policy-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const PolicyDetailModal: React.FC<PolicyDetailModalProps> = ({
  policy,
  open,
  onClose,
}) => {
  const [tabValue, setTabValue] = useState(0);

  if (!policy) return null;

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const renderJsonSection = (title: string, data: any) => {
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
      return null;
    }

    return (
      <Box mb={3}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Paper
          sx={{
            p: 2,
            bgcolor: 'background.default',
            maxHeight: 300,
            overflow: 'auto',
          }}
        >
          <pre style={{ margin: 0, fontSize: '0.875rem' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </Paper>
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" component="span">
              {policy.policyName}
            </Typography>
            <Box mt={1}>
              <Chip
                label={policy.policyType}
                size="small"
                color={
                  policy.policyType === 'Intune'
                    ? 'info'
                    : policy.policyType === 'Purview'
                    ? 'secondary'
                    : 'success'
                }
                sx={{ mr: 1 }}
              />
              <Chip
                label={policy.isActive ? 'Active' : 'Inactive'}
                size="small"
                color={policy.isActive ? 'success' : 'default'}
              />
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="policy detail tabs">
            <Tab label="Overview" id="policy-tab-0" aria-controls="policy-tabpanel-0" />
            <Tab label="Raw Data" id="policy-tab-1" aria-controls="policy-tabpanel-1" />
            <Tab label="Control Mappings" id="policy-tab-2" aria-controls="policy-tabpanel-2" />
          </Tabs>
        </Box>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          {/* Description */}
          {policy.policyDescription && (
            <Box mb={3}>
              <Typography variant="body1">{policy.policyDescription}</Typography>
            </Box>
          )}

          {/* Metadata */}
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              Metadata
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Policy ID: {policy.policyId}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Last Synced: {formatDistanceToNow(new Date(policy.lastSynced), { addSuffix: true })}
            </Typography>
            {policy.parsedData.createdDateTime && (
              <Typography variant="body2" color="text.secondary">
                Created: {new Date(policy.parsedData.createdDateTime).toLocaleString()}
              </Typography>
            )}
            {policy.parsedData.modifiedDateTime && (
              <Typography variant="body2" color="text.secondary">
                Modified: {new Date(policy.parsedData.modifiedDateTime).toLocaleString()}
              </Typography>
            )}
          </Box>

          {/* Settings Summary */}
          {policy.parsedData.settings && Object.keys(policy.parsedData.settings).length > 0 && (
            <Box mb={3}>
              <Typography variant="h6" gutterBottom>
                Settings Summary
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Object.keys(policy.parsedData.settings).length} settings configured
              </Typography>
            </Box>
          )}
        </TabPanel>

        {/* Raw Data Tab */}
        <TabPanel value={tabValue} index={1}>
          {/* Settings */}
          {renderJsonSection('Policy Settings', policy.parsedData.settings)}

          {/* Full Policy Data */}
          {renderJsonSection('Complete Policy Data', policy.parsedData)}
        </TabPanel>

        {/* Control Mappings Tab */}
        <TabPanel value={tabValue} index={2}>
          <ControlMappingsTab policyId={policy.id} />
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PolicyDetailModal;
