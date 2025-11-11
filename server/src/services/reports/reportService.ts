import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import {
  ReportType,
  ReportOptions,
  ReportGenerationResult,
} from '../../types/reports';
import {
  aggregateExecutiveSummaryData,
  aggregateDetailedComplianceData,
  aggregateGapAnalysisData,
  aggregatePOAMReportData,
  aggregateAuditPackageData,
  aggregateProgressReportData,
} from './dataAggregator';
import { generateCSV } from './generators/csvGenerator';
import { generateExcel } from './generators/excelGenerator';
import { generatePDF } from './generators/pdfGenerator';

const prisma = new PrismaClient();

/**
 * Generate a report based on options
 */
export async function generateReport(
  options: ReportOptions
): Promise<ReportGenerationResult> {
  try {
    // Step 1: Aggregate data based on report type
    const data = await aggregateReportData(options.reportType, options.filters);

    // Step 2: Generate file based on format
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportName = options.customTitle || getDefaultReportName(options.reportType);
    const fileName = `${reportName}_${timestamp}.${options.format}`;

    let filePath: string;

    switch (options.format) {
      case 'csv':
        filePath = await generateCSV(options.reportType, data, fileName);
        break;
      case 'excel':
        filePath = await generateExcel(options.reportType, data, fileName);
        break;
      case 'pdf':
        filePath = await generatePDF(options.reportType, data, fileName);
        break;
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }

    // Step 3: Save report to history
    const fileStats = fs.statSync(filePath);
    const reportRecord = await prisma.reportHistory.create({
      data: {
        reportType: options.reportType,
        reportName,
        format: options.format,
        filePath,
        fileSize: fileStats.size,
        filters: options.filters ? JSON.stringify(options.filters) : null,
        status: 'completed',
      },
    });

    return {
      success: true,
      reportId: reportRecord.id,
      filePath: path.basename(filePath),
      fileName,
      fileSize: fileStats.size,
    };
  } catch (error) {
    console.error('Error generating report:', error);

    // Log to database as failed
    try {
      await prisma.reportHistory.create({
        data: {
          reportType: options.reportType,
          reportName: options.customTitle || getDefaultReportName(options.reportType),
          format: options.format,
          filePath: null,
          fileSize: null,
          filters: options.filters ? JSON.stringify(options.filters) : null,
          status: 'failed',
        },
      });
    } catch (dbError) {
      console.error('Failed to log error to database:', dbError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Aggregate data based on report type
 */
async function aggregateReportData(reportType: ReportType, filters?: any): Promise<any> {
  switch (reportType) {
    case 'executive-summary':
      return await aggregateExecutiveSummaryData(filters);
    case 'detailed-compliance':
      return await aggregateDetailedComplianceData(filters);
    case 'gap-analysis':
      return await aggregateGapAnalysisData(filters);
    case 'poam':
      return await aggregatePOAMReportData(filters);
    case 'audit-package':
      return await aggregateAuditPackageData(filters);
    case 'progress':
      return await aggregateProgressReportData(filters);
    default:
      throw new Error(`Unsupported report type: ${reportType}`);
  }
}

/**
 * Get default report name
 */
function getDefaultReportName(reportType: ReportType): string {
  const names: Record<ReportType, string> = {
    'executive-summary': 'Executive_Summary',
    'detailed-compliance': 'Detailed_Compliance_Report',
    'gap-analysis': 'Gap_Analysis_Report',
    poam: 'POAM_Report',
    'audit-package': 'Audit_Package',
    progress: 'Progress_Report',
  };
  return names[reportType];
}

/**
 * Get report history
 */
export async function getReportHistory(limit: number = 20): Promise<any[]> {
  return await prisma.reportHistory.findMany({
    orderBy: { generatedAt: 'desc' },
    take: limit,
  });
}

/**
 * Delete a report from history
 */
export async function deleteReport(reportId: number): Promise<void> {
  const report = await prisma.reportHistory.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error('Report not found');
  }

  // Delete file if it exists
  if (report.filePath && fs.existsSync(report.filePath)) {
    fs.unlinkSync(report.filePath);
  }

  // Delete from database
  await prisma.reportHistory.delete({
    where: { id: reportId },
  });
}
