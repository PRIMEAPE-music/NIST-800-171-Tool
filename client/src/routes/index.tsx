import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from '@/pages/Dashboard';
import { ControlLibrary } from '@/pages/ControlLibrary';
import { ControlDetailPage } from '@/pages/ControlDetailPage';
import { GapAnalysis } from '@/pages/GapAnalysis';
import { POAMManager } from '@/pages/POAMManager';
import { EvidenceLibrary } from '@/pages/EvidenceLibrary';
import { EvidenceGapReport } from '@/pages/EvidenceGapReport';
import { M365Integration } from '@/pages/M365Integration';
import SuggestedMappingsPage from '@/pages/SuggestedMappings';
import PolicyViewer from '@/pages/PolicyViewer';
import { Reports } from '@/pages/Reports';
import { Settings } from '@/pages/Settings';
import AssessmentWizard from '@/components/assessment/AssessmentWizard';
import ErrorBoundary from '@/components/common/ErrorBoundary';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/controls" element={<ControlLibrary />} />
      <Route path="/controls/:id" element={<ControlDetailPage />} />
      <Route path="/assessment" element={<AssessmentWizard />} />
      <Route path="/gap-analysis" element={<GapAnalysis />} />
      <Route path="/poams" element={<POAMManager />} />
      <Route path="/evidence" element={<EvidenceLibrary />} />
      <Route path="/evidence/gaps" element={<EvidenceGapReport />} />
      <Route path="/m365" element={<M365Integration />} />
      <Route path="/m365/suggested-mappings" element={<SuggestedMappingsPage />} />
      <Route
        path="/policy-viewer"
        element={
          <ErrorBoundary>
            <PolicyViewer />
          </ErrorBoundary>
        }
      />
      <Route path="/reports" element={<Reports />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
