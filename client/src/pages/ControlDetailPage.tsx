import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Tabs,
  Tab,
  Button,
  Breadcrumbs,
  Link,
  Typography,
  Skeleton,
} from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { controlService } from '@/services/controlService';
import { ControlHeader } from '@/components/controls/ControlHeader';
import { OverviewTab } from '@/components/controls/OverviewTab';
import { EvidenceTab } from '@/components/controls/EvidenceTab';
import { HistoryTab } from '@/components/controls/HistoryTab';
import { RelatedTab } from '@/components/controls/RelatedTab';
// REMOVED: M365 mapping tab imports - no longer mapping policies to controls
import { GapAnalysisTab } from '@/components/controls/GapAnalysisTab';
import M365SettingsTab from '@/components/M365Settings/M365SettingsTab';
import { StatusUpdateDialog } from '@/components/controls/StatusUpdateDialog';
import { ErrorMessage } from '@/components/common/ErrorMessage';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index} role="tabpanel" style={{ width: '100%' }}>
      {value === index && <Box sx={{ py: 3, width: '100%' }}>{children}</Box>}
    </div>
  );
};

export const ControlDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [statusDialogOpen, setStatusDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [localNotes, setLocalNotes] = useState<string>('');

  // Fetch control data
  const { data: control, isLoading, error } = useQuery({
    queryKey: ['control', id],
    queryFn: () => controlService.getControlById(Number(id)),
    enabled: !!id,
  });

  // Update control mutation
  const updateMutation = useMutation({
    mutationFn: (updates: any) => controlService.updateControl(Number(id), updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control', id] });
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      setEditMode(false);
    },
  });

  // Initialize local notes when data loads
  useEffect(() => {
    if (control?.status?.implementationNotes) {
      setLocalNotes(control.status.implementationNotes);
    }
  }, [control]);

  const handleSaveNotes = () => {
    updateMutation.mutate({
      implementationNotes: localNotes,
    });
  };

  const handleCancelEdit = () => {
    setLocalNotes(control?.status?.implementationNotes || '');
    setEditMode(false);
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 2, bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
        <Skeleton variant="rectangular" height={400} sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
      </Container>
    );
  }

  if (error || !control) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <ErrorMessage message="Failed to load control details" />
        <Button onClick={() => navigate('/controls')} sx={{ mt: 2 }}>
          Back to Control Library
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/controls')}
          sx={{ cursor: 'pointer', color: '#90CAF9', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          Control Library
        </Link>
        <Typography variant="body2" sx={{ color: '#E0E0E0' }}>
          {control.controlId}
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <ControlHeader
        control={control}
        onStatusClick={() => setStatusDialogOpen(true)}
        onBack={() => navigate('/controls')}
      />

      {/* Action Bar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_e, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTab-root': { color: '#B0B0B0' },
            '& .Mui-selected': { color: '#90CAF9' },
            '& .MuiTabs-indicator': { backgroundColor: '#90CAF9' },
          }}
        >
          <Tab label="Overview" />
          <Tab label="Gap Analysis" />
          <Tab label={`Evidence (${control.evidence?.length || 0})`} />
          <Tab label="History" />
          <Tab label="Related" />
          <Tab label="M365 Settings" />
        </Tabs>

        <Box>
          {editMode ? (
            <>
              <Button
                startIcon={<SaveIcon />}
                onClick={handleSaveNotes}
                disabled={updateMutation.isPending}
                sx={{ mr: 1 }}
              >
                Save
              </Button>
              <Button onClick={handleCancelEdit} sx={{ color: '#B0B0B0' }}>
                Cancel
              </Button>
            </>
          ) : (
            <Button
              startIcon={<EditIcon />}
              onClick={() => setEditMode(true)}
              variant="outlined"
            >
              Edit Notes
            </Button>
          )}
        </Box>
      </Box>

      {/* Tab Content */}
      <Paper sx={{ backgroundColor: '#242424' }}>
        <TabPanel value={activeTab} index={0}>
          <OverviewTab
            control={control}
            editMode={editMode}
            localNotes={localNotes}
            onNotesChange={setLocalNotes}
          />
        </TabPanel>

        {/* REMOVED: M365 mapping tabs - no longer mapping policies to controls */}

        <TabPanel value={activeTab} index={1}>
          <GapAnalysisTab controlId={control.controlId} />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <EvidenceTab control={control} />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <HistoryTab history={[]} />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <RelatedTab control={control} />
        </TabPanel>

        <TabPanel value={activeTab} index={5}>
          <M365SettingsTab controlId={control.controlId} />
        </TabPanel>
      </Paper>

      {/* Status Update Dialog */}
      <StatusUpdateDialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        control={control}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['control', id] });
          queryClient.invalidateQueries({ queryKey: ['controls'] });
          setStatusDialogOpen(false);
        }}
      />
    </Container>
  );
};

export default ControlDetailPage;
