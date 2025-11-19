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
import { M365ActionsTab } from '@/components/controls/M365ActionsTab';
import { StatusUpdateDialog } from '@/components/controls/StatusUpdateDialog';
import { ErrorMessage } from '@/components/common/ErrorMessage';

interface TabPanelProps {
  children?: React.ReactNode;
  tabKey: string;
  activeTab: string;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, tabKey, activeTab }) => {
  return (
    <div hidden={activeTab !== tabKey} role="tabpanel" style={{ width: '100%' }}>
      {activeTab === tabKey && <Box sx={{ py: 3, width: '100%' }}>{children}</Box>}
    </div>
  );
};

export const ControlDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [statusDialogOpen, setStatusDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [localNotes, setLocalNotes] = useState<string>('');

  // Fetch control data
  const { data: control, isLoading, error } = useQuery({
    queryKey: ['control', id],
    queryFn: () => controlService.getControlById(Number(id)),
    enabled: !!id,
  });

  // Fetch M365 improvement actions count
  const { data: actionsData } = useQuery({
    queryKey: ['microsoft-actions', control?.controlId],
    queryFn: async () => {
      const response = await fetch(`/api/microsoft-actions/control/${control?.controlId}`);
      if (!response.ok) throw new Error('Failed to fetch actions');
      return response.json();
    },
    enabled: !!control?.controlId,
  });

  const actionsCount = actionsData?.data?.length || 0;

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
          <Tab label="Overview" value="overview" />
          <Tab label="Gap Analysis" value="gap-analysis" />
          <Tab label={`Evidence (${control.evidence?.length || 0})`} value="evidence" />
          <Tab label="History" value="history" />
          <Tab label="Related" value="related" />
          {actionsCount > 0 && (
            <Tab label={`M365 Actions (${actionsCount})`} value="m365-actions" />
          )}
          <Tab label="M365 Settings" value="m365-settings" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Paper sx={{ backgroundColor: '#242424' }}>
        <TabPanel activeTab={activeTab} tabKey="overview">
          <OverviewTab
            control={control}
            editMode={editMode}
            localNotes={localNotes}
            onNotesChange={setLocalNotes}
            onEditClick={() => setEditMode(true)}
            onSaveClick={handleSaveNotes}
            onCancelClick={handleCancelEdit}
            isSaving={updateMutation.isPending}
          />
        </TabPanel>

        <TabPanel activeTab={activeTab} tabKey="gap-analysis">
          <GapAnalysisTab controlId={control.controlId} />
        </TabPanel>

        <TabPanel activeTab={activeTab} tabKey="evidence">
          <EvidenceTab control={control} />
        </TabPanel>

        <TabPanel activeTab={activeTab} tabKey="history">
          <HistoryTab history={[]} />
        </TabPanel>

        <TabPanel activeTab={activeTab} tabKey="related">
          <RelatedTab control={control} />
        </TabPanel>

        <TabPanel activeTab={activeTab} tabKey="m365-actions">
          <M365ActionsTab controlId={control.controlId} />
        </TabPanel>

        <TabPanel activeTab={activeTab} tabKey="m365-settings">
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
