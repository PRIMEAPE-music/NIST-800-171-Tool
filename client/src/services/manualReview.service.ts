// client/src/services/manualReview.service.ts

import {
  ManualSettingReview,
  ManualSettingReviewCreate,
  ManualSettingReviewUpdate,
  PolicyForSelector,
  PolicySettingsComparison,
} from '../types/manualReview.types';

const API_BASE = '/api/manual-reviews';

class ManualReviewService {
  /**
   * Create or update a manual review
   */
  async upsertReview(data: ManualSettingReviewCreate): Promise<ManualSettingReview> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save review');
    }

    const result = await response.json();
    return result.review;
  }

  /**
   * Get all reviews for a setting
   */
  async getReviewsForSetting(settingId: number): Promise<ManualSettingReview[]> {
    const response = await fetch(`${API_BASE}/setting/${settingId}`);
    if (!response.ok) throw new Error('Failed to fetch reviews');
    const result = await response.json();
    return result.reviews;
  }

  /**
   * Get all reviews for a control
   */
  async getReviewsForControl(controlId: number): Promise<ManualSettingReview[]> {
    const response = await fetch(`${API_BASE}/control/${controlId}`);
    if (!response.ok) throw new Error('Failed to fetch reviews');
    const result = await response.json();
    return result.reviews;
  }

  /**
   * Get a specific review
   */
  async getReview(settingId: number, policyId?: number): Promise<ManualSettingReview | null> {
    const response = await fetch(`${API_BASE}/${settingId}/${policyId || 0}`);
    if (!response.ok) throw new Error('Failed to fetch review');
    const result = await response.json();
    return result.review;
  }

  /**
   * Delete a review
   */
  async deleteReview(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete review');
  }

  /**
   * Get policies for selector
   */
  async getPoliciesForSelector(params?: {
    searchTerm?: string;
    policyType?: string;
    isActive?: boolean;
  }): Promise<PolicyForSelector[]> {
    const searchParams = new URLSearchParams();
    if (params?.searchTerm) searchParams.set('searchTerm', params.searchTerm);
    if (params?.policyType) searchParams.set('policyType', params.policyType);
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));

    const url = `${API_BASE}/policies/selector${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch policies');
    const result = await response.json();
    return result.policies;
  }

  /**
   * Get policy settings comparison
   */
  async getPolicySettingsComparison(policyId: number): Promise<PolicySettingsComparison> {
    const response = await fetch(`${API_BASE}/policies/${policyId}/comparison`);
    if (!response.ok) throw new Error('Failed to fetch comparison');
    const result = await response.json();
    return result.comparison;
  }

  /**
   * Get raw policy settings
   */
  async getPolicyRawSettings(policyId: number): Promise<Record<string, any>> {
    const response = await fetch(`${API_BASE}/policies/${policyId}/raw-settings`);
    if (!response.ok) throw new Error('Failed to fetch settings');
    const result = await response.json();
    return result.settings;
  }
}

export const manualReviewService = new ManualReviewService();
export default manualReviewService;
