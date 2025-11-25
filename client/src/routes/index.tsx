import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from '@/pages/Dashboard';
import { ControlLibrary } from '@/pages/ControlLibrary';
import { ControlDetailPage } from '@/pages/ControlDetailPage';
// GapAnalysis import removed - standalone page deleted
import { POAMManager } from '@/pages/POAMManager';
import { EvidenceLibrary } from '@/pages/EvidenceLibrary';
import { EvidenceGapReport } from '@/pages/EvidenceGapReport';
import { M365Integration } from '@/pages/M365Integration';
import SuggestedMappingsPage from '@/pages/SuggestedMappings';
import PolicyViewer from '@/pages/PolicyViewer';
import { GapAnalysisPage } from '@/pages/GapAnalysisPage';
import { Reports } from '@/pages/Reports';
import { Settings } from '@/pages/Settings';
import Surveys from '@/pages/Surveys';
import SurveyDetail from '@/pages/SurveyDetail';
// AssessmentWizard import removed - component deleted
import ErrorBoundary from '@/components/common/ErrorBoundary';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/controls" element={<ControlLibrary />} />
      <Route path="/controls/:id" element={<ControlDetailPage />} />
      {/* Assessment Wizard removed - use control detail pages instead */}
      {/* Gap Analysis standalone page removed - use Gap Analysis tab on control detail pages */}
      <Route path="/poams" element={<POAMManager />} />
      <Route path="/evidence" element={<EvidenceLibrary />} />
      <Route path="/evidence/gaps" element={<EvidenceGapReport />} />
      <Route path="/m365" element={<M365Integration />} />
      <Route path="/m365/suggested-mappings" element={<SuggestedMappingsPage />} />
      <Route path="/m365/gap-analysis" element={<GapAnalysisPage />} />
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
      <Route path="/surveys" element={<Surveys />} />
      <Route path="/surveys/:surveyId" element={<SurveyDetail />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
