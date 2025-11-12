import axios from 'axios';
import {
  PolicyDetail,
  PolicyViewerStats,
  PolicySearchParams,
} from '../types/policyViewer.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class PolicyViewerService {
  /**
   * Get policies with optional filtering
   */
  async getPolicies(params?: PolicySearchParams): Promise<PolicyDetail[]> {
    const response = await axios.get(`${API_URL}/m365/policies/viewer`, {
      params,
    });
    return response.data.policies;
  }

  /**
   * Get single policy by ID
   */
  async getPolicyById(id: number): Promise<PolicyDetail> {
    const response = await axios.get(`${API_URL}/m365/policies/viewer/${id}`);
    return response.data.policy;
  }

  /**
   * Get viewer statistics
   */
  async getStats(): Promise<PolicyViewerStats> {
    const response = await axios.get(`${API_URL}/m365/policies/viewer/stats`);
    return response.data.stats;
  }

  /**
   * Export policy data
   */
  async exportData(): Promise<any> {
    const response = await axios.get(`${API_URL}/m365/policies/viewer/export`);
    return response.data.data;
  }

  /**
   * Trigger manual sync
   */
  async triggerSync(): Promise<any> {
    const response = await axios.post(`${API_URL}/m365/sync`, {
      forceRefresh: true,
    });
    return response.data;
  }
}

export default new PolicyViewerService();
