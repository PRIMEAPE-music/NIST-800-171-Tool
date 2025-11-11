import { Request, Response } from 'express';
import {
  generateReport,
  getReportHistory,
  deleteReport,
} from '../services/reports/reportService';
import {
  aggregateExecutiveSummaryData,
  aggregateDetailedComplianceData,
  aggregateGapAnalysisData,
  aggregatePOAMReportData,
  aggregateProgressReportData,
} from '../services/reports/dataAggregator';
import { ReportOptions } from '../types/reports';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

/**
 * Generate a report
 * POST /api/reports/generate
 */
export async function handleGenerateReport(req: Request, res: Response): Promise<void> {
  try {
    const options: ReportOptions = req.body;

    // Validate options
    if (!options.reportType || !options.format) {
      res.status(400).json({ error: 'Missing required fields: reportType, format' });
      return;
    }

    const result = await generateReport(options);

    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in handleGenerateReport:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}

/**
 * Get report history
 * GET /api/reports/history
 */
export async function handleGetReportHistory(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const history = await getReportHistory(limit);
    res.status(200).json(history);
  } catch (error) {
    console.error('Error in handleGetReportHistory:', error);
    res.status(500).json({ error: 'Failed to fetch report history' });
  }
}

/**
 * Download a report
 * GET /api/reports/:id/download
 */
export async function handleDownloadReport(req: Request, res: Response): Promise<void> {
  try {
    const reportId = parseInt(req.params.id);

    if (isNaN(reportId)) {
      res.status(400).json({ error: 'Invalid report ID' });
      return;
    }

    const report = await getReportHistory(1000); // Get all to find the specific one
    const targetReport = report.find((r) => r.id === reportId);

    if (!targetReport || !targetReport.filePath) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    if (!fs.existsSync(targetReport.filePath)) {
      res.status(404).json({ error: 'Report file not found on disk' });
      return;
    }

    res.download(targetReport.filePath, targetReport.reportName);
  } catch (error) {
    console.error('Error in handleDownloadReport:', error);
    res.status(500).json({ error: 'Failed to download report' });
  }
}

/**
 * Delete a report
 * DELETE /api/reports/:id
 */
export async function handleDeleteReport(req: Request, res: Response): Promise<void> {
  try {
    const reportId = parseInt(req.params.id);

    if (isNaN(reportId)) {
      res.status(400).json({ error: 'Invalid report ID' });
      return;
    }

    await deleteReport(reportId);
    res.status(200).json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error in handleDeleteReport:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
}

/**
 * Get available report types
 * GET /api/reports/types
 */
export async function handleGetReportTypes(_req: Request, res: Response): Promise<void> {
  const reportTypes = [
    {
      value: 'executive-summary',
      label: 'Executive Summary',
      description: 'High-level overview for management',
      formats: ['csv', 'excel', 'pdf'],
    },
    {
      value: 'detailed-compliance',
      label: 'Detailed Compliance Report',
      description: 'Comprehensive control-by-control analysis',
      formats: ['csv', 'excel', 'pdf'],
    },
    {
      value: 'gap-analysis',
      label: 'Gap Analysis Report',
      description: 'Risk-prioritized list of compliance gaps',
      formats: ['csv', 'excel', 'pdf'],
    },
    {
      value: 'poam',
      label: 'POAM Report',
      description: 'Plan of Action & Milestones tracking',
      formats: ['csv', 'excel', 'pdf'],
    },
    {
      value: 'audit-package',
      label: 'Audit Package',
      description: 'Complete documentation bundle for auditors',
      formats: ['pdf', 'excel'],
    },
    {
      value: 'progress',
      label: 'Progress Report',
      description: 'Track compliance improvement over time',
      formats: ['csv', 'excel', 'pdf'],
    },
  ];

  res.status(200).json(reportTypes);
}

/**
 * Generate multiple reports in batch
 * POST /api/reports/batch
 */
export async function handleBatchGenerateReports(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { reportConfigs } = req.body;

    if (!Array.isArray(reportConfigs) || reportConfigs.length === 0) {
      res.status(400).json({ error: 'reportConfigs must be a non-empty array' });
      return;
    }

    if (reportConfigs.length > 10) {
      res.status(400).json({ error: 'Maximum 10 reports can be generated in batch' });
      return;
    }

    const results = [];

    for (const config of reportConfigs) {
      try {
        const result = await generateReport(config);
        results.push({
          config,
          result,
        });
      } catch (error) {
        results.push({
          config,
          result: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    const successCount = results.filter((r) => r.result.success).length;
    const failCount = results.length - successCount;

    res.status(200).json({
      success: successCount === results.length,
      successCount,
      failCount,
      results,
    });
  } catch (error) {
    console.error('Error in handleBatchGenerateReports:', error);
    res.status(500).json({ error: 'Failed to generate batch reports' });
  }
}

/**
 * Preview report data before generation
 * POST /api/reports/preview
 */
export async function handlePreviewReport(req: Request, res: Response): Promise<void> {
  try {
    const { reportType, filters } = req.body;

    if (!reportType) {
      res.status(400).json({ error: 'Missing required field: reportType' });
      return;
    }

    let data;
    switch (reportType) {
      case 'executive-summary':
        data = await aggregateExecutiveSummaryData(filters);
        break;
      case 'detailed-compliance':
        data = await aggregateDetailedComplianceData(filters);
        // Limit preview to first 50 controls
        data.controls = data.controls.slice(0, 50);
        break;
      case 'gap-analysis':
        data = await aggregateGapAnalysisData(filters);
        break;
      case 'poam':
        data = await aggregatePOAMReportData(filters);
        break;
      case 'progress':
        data = await aggregateProgressReportData(filters);
        break;
      default:
        res.status(400).json({ error: 'Invalid report type' });
        return;
    }

    res.status(200).json({
      reportType,
      filters,
      preview: data,
    });
  } catch (error) {
    console.error('Error in handlePreviewReport:', error);
    res.status(500).json({ error: 'Failed to preview report' });
  }
}

/**
 * Get report generation statistics
 * GET /api/reports/statistics
 */
export async function handleGetReportStatistics(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const totalReports = await prisma.reportHistory.count();
    const reportsByType = await prisma.reportHistory.groupBy({
      by: ['reportType'],
      _count: true,
    });
    const reportsByFormat = await prisma.reportHistory.groupBy({
      by: ['format'],
      _count: true,
    });
    const recentReports = await prisma.reportHistory.count({
      where: {
        generatedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });

    const totalFileSize = await prisma.reportHistory.aggregate({
      _sum: {
        fileSize: true,
      },
    });

    res.status(200).json({
      totalReports,
      recentReports,
      totalFileSize: totalFileSize._sum.fileSize || 0,
      byType: reportsByType,
      byFormat: reportsByFormat,
    });
  } catch (error) {
    console.error('Error fetching report statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
}

/**
 * Get all report templates
 * GET /api/reports/templates
 */
export async function handleGetTemplates(_req: Request, res: Response): Promise<void> {
  try {
    const templates = await prisma.reportTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
}

/**
 * Create a new report template
 * POST /api/reports/templates
 */
export async function handleCreateTemplate(req: Request, res: Response): Promise<void> {
  try {
    const { name, reportType, format, filters, description } = req.body;

    if (!name || !reportType || !format) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const template = await prisma.reportTemplate.create({
      data: {
        name,
        reportType,
        format,
        filters: filters ? JSON.stringify(filters) : null,
        description,
      },
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
}

/**
 * Delete a report template
 * DELETE /api/reports/templates/:id
 */
export async function handleDeleteTemplate(req: Request, res: Response): Promise<void> {
  try {
    const templateId = parseInt(req.params.id);

    if (isNaN(templateId)) {
      res.status(400).json({ error: 'Invalid template ID' });
      return;
    }

    await prisma.reportTemplate.delete({
      where: { id: templateId },
    });

    res.status(200).json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
}
