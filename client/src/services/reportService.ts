import axios from 'axios';
import {
  ReportOptions,
  ReportGenerationResult,
  ReportHistoryItem,
  ReportTypeInfo,
} from '../types/reports';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Generate a report
 */
export async function generateReport(
  options: ReportOptions
): Promise<ReportGenerationResult> {
  const response = await axios.post<ReportGenerationResult>(
    `${API_BASE_URL}/reports/generate`,
    options
  );
  return response.data;
}

/**
 * Get available report types
 */
export async function getReportTypes(): Promise<ReportTypeInfo[]> {
  const response = await axios.get<ReportTypeInfo[]>(`${API_BASE_URL}/reports/types`);
  return response.data;
}

/**
 * Get report history
 */
export async function getReportHistory(limit?: number): Promise<ReportHistoryItem[]> {
  const response = await axios.get<ReportHistoryItem[]>(
    `${API_BASE_URL}/reports/history`,
    {
      params: { limit },
    }
  );
  return response.data;
}

/**
 * Download a report
 */
export async function downloadReport(reportId: number): Promise<void> {
  const response = await axios.get(`${API_BASE_URL}/reports/${reportId}/download`, {
    responseType: 'blob',
  });

  // Get filename from content-disposition header or use default
  const contentDisposition = response.headers['content-disposition'];
  let fileName = 'report.pdf';
  if (contentDisposition) {
    const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
    if (fileNameMatch && fileNameMatch.length === 2) {
      fileName = fileNameMatch[1];
    }
  }

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Delete a report from history
 */
export async function deleteReport(reportId: number): Promise<void> {
  await axios.delete(`${API_BASE_URL}/reports/${reportId}`);
}
