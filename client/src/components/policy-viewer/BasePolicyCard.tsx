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
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { PolicyDetail } from '../../types/policyViewer.types';

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
  const [expanded, setExpanded] = React.useState(false);

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
          </Box>
        )}

        {/* Expandable Details */}
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider sx={{ my: 2 }} />
          {children}
        </Collapse>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <IconButton
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-label="show more"
          size="small"
          sx={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: '0.3s',
          }}
        >
          <ExpandMoreIcon />
        </IconButton>
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
