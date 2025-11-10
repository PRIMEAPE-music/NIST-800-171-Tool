import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface M365DashboardData {
  timestamp: string;
  intune: {
    compliancePoliciesCount: number;
    configurationPoliciesCount: number;
    managedDevicesCount: number;
  } | null;
  purview: {
    sensitivityLabelsCount: number;
    isConfigured: boolean;
  } | null;
  azureAD: {
    conditionalAccessPoliciesCount: number;
    mfaEnabled: boolean;
    securityDefaultsEnabled: boolean;
  } | null;
}

export interface M365Stats {
  totalPolicies: number;
  activePolicies: number;
  mappedControls: number;
  policyBreakdown: {
    Intune: number;
    Purview: number;
    AzureAD: number;
  };
}

export interface SyncStatus {
  lastSyncDate?: string;
  syncEnabled: boolean;
  recentLogs: Array<{
    id: number;
    syncDate: string;
    syncType: string;
    policiesUpdated: number;
    controlsUpdated: number;
    status: string;
    errorMessage?: string;
    syncDuration?: number;
  }>;
}

export interface M365Policy {
  id: number;
  policyType: 'Intune' | 'Purview' | 'AzureAD';
  policyId: string;
  policyName: string;
  policyDescription?: string;
  lastSynced: string;
  isActive: boolean;
}

export interface PolicyMapping {
  id: number;
  controlId: number;
  policyId: number;
  mappingConfidence: 'High' | 'Medium' | 'Low';
  mappingNotes?: string;
  control?: {
    controlId: string;
    title: string;
  };
  policy?: M365Policy;
}

class M365Service {
  /**
   * Get M365 dashboard data (combined overview)
   */
  async getDashboard(): Promise<M365DashboardData> {
    const response = await axios.get(`${API_URL}/m365/dashboard`);
    return response.data.dashboard;
  }

  /**
   * Get M365 integration statistics
   */
  async getStats(): Promise<M365Stats> {
    const response = await axios.get(`${API_URL}/m365/stats`);
    return response.data.stats;
  }

  /**
   * Get sync status and history
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const response = await axios.get(`${API_URL}/m365/sync/status`);
    return response.data.status;
  }

  /**
   * Trigger manual sync
   */
  async triggerSync(forceRefresh: boolean = true): Promise<any> {
    const response = await axios.post(`${API_URL}/m365/sync`, {
      forceRefresh,
    });
    return response.data;
  }

  /**
   * Get all policies
   */
  async getPolicies(policyType?: string): Promise<M365Policy[]> {
    const response = await axios.get(`${API_URL}/m365/policies`, {
      params: policyType ? { policyType } : undefined,
    });
    return response.data.policies;
  }

  /**
   * Get policy mappings for a control
   */
  async getControlMappings(controlId: number): Promise<PolicyMapping[]> {
    const response = await axios.get(`${API_URL}/m365/control/${controlId}/mappings`);
    return response.data.mappings;
  }

  /**
   * Check authentication status
   */
  async checkAuthStatus(): Promise<{ connected: boolean }> {
    const response = await axios.get(`${API_URL}/auth/status`);
    return response.data;
  }

  /**
   * Test Graph API connection
   */
  async testGraphConnection(): Promise<{ success: boolean; message: string }> {
    const response = await axios.get(`${API_URL}/auth/test-graph`);
    return response.data;
  }
}

export const m365Service = new M365Service();
