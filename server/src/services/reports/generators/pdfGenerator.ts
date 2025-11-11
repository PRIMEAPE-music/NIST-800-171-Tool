import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import {
  ReportType,
  ExecutiveSummaryData,
  DetailedComplianceData,
  GapAnalysisData,
  POAMReportData,
  AuditPackageData,
  ProgressReportData,
} from '../../../types/reports';
import {
  generateBarChart,
  generateRiskMatrix,
} from './chartGenerator';

const REPORTS_DIR = path.join(__dirname, '../../../../reports');

// Color scheme
const COLORS = {
  primary: '#90CAF9',
  success: '#66BB6A',
  warning: '#FFA726',
  error: '#F44336',
  text: '#212121',
  lightGray: '#F5F5F5',
  darkGray: '#757575',
};

/**
 * Add header to PDF page
 */
function addHeader(doc: PDFKit.PDFDocument, title: string): void {
  doc
    .fontSize(20)
    .fillColor(COLORS.primary)
    .text('NIST 800-171 Rev 3 Compliance Tracker', 50, 40, { align: 'center' });

  doc
    .fontSize(16)
    .fillColor(COLORS.text)
    .text(title, 50, 65, { align: 'center' });

  doc
    .fontSize(10)
    .fillColor(COLORS.darkGray)
    .text(`Generated: ${new Date().toLocaleString()}`, 50, 90, { align: 'center' });

  doc.moveTo(50, 110).lineTo(550, 110).stroke(COLORS.darkGray);
}

/**
 * Add footer with page numbers
 */
function addFooter(doc: PDFKit.PDFDocument, pageNum: number): void {
  doc
    .fontSize(8)
    .fillColor(COLORS.darkGray)
    .text(
      `Page ${pageNum} | NIST 800-171 Rev 3 Compliance Report`,
      50,
      doc.page.height - 50,
      {
        align: 'center',
        width: doc.page.width - 100,
      }
    );
}

/**
 * Generate Executive Summary PDF
 */
export async function generateExecutiveSummaryPDF(
  data: ExecutiveSummaryData,
  fileName: string
): Promise<string> {
  const filePath = path.join(REPORTS_DIR, fileName);
  const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  let pageNum = 1;

  // Page 1: Cover and Overview
  addHeader(doc, 'Executive Summary');

  doc.moveDown(2);
  doc.fontSize(14).fillColor(COLORS.text).text('Compliance Overview', { underline: true });
  doc.moveDown(0.5);

  doc.fontSize(11).fillColor(COLORS.text);
  doc.text(`Total Controls: ${data.overview.totalControls}`);
  doc.text(`Implemented Controls: ${data.overview.implementedControls}`);
  doc.text(`Compliance Percentage: ${data.overview.compliancePercentage}%`, {
    continued: true,
  });

  // Color-code compliance percentage
  const complianceColor =
    data.overview.compliancePercentage >= 80
      ? COLORS.success
      : data.overview.compliancePercentage >= 50
      ? COLORS.warning
      : COLORS.error;

  doc.fillColor(complianceColor).text(` ✓`, { continued: false });
  doc.fillColor(COLORS.text);

  doc.text(`Assessed Controls: ${data.overview.assessedControls}`);
  doc.text(
    `Last Assessment: ${
      data.overview.lastAssessmentDate
        ? new Date(data.overview.lastAssessmentDate).toLocaleDateString()
        : 'N/A'
    }`
  );

  doc.moveDown(1.5);

  // Family breakdown chart
  if (data.familyBreakdown.length > 0) {
    const chartLabels = data.familyBreakdown.slice(0, 10).map((f) => f.family);
    const chartValues = data.familyBreakdown.slice(0, 10).map((f) => f.implementedControls);

    try {
      const chartPath = await generateBarChart(
        { labels: chartLabels, values: chartValues },
        'Family Compliance',
        `family_compliance_${Date.now()}.png`
      );

      doc.fontSize(14).text('Family Breakdown', { underline: true });
      doc.moveDown(0.5);
      doc.image(chartPath, { width: 500, align: 'center' });
      doc.moveDown(1);

      // Clean up chart file
      fs.unlinkSync(chartPath);
    } catch (error) {
      console.error('Error generating chart:', error);
    }
  }

  // Add page break
  doc.addPage();
  pageNum++;
  addHeader(doc, 'Executive Summary - Critical Gaps');

  // Critical Gaps Table
  doc.moveDown(2);
  doc.fontSize(14).fillColor(COLORS.text).text('Critical Gaps', { underline: true });
  doc.moveDown(1);

  if (data.criticalGaps.length > 0) {
    // Table headers
    const tableTop = doc.y;
    const colWidths = [70, 200, 60, 80, 90];
    const headers = ['Control ID', 'Title', 'Risk', 'Risk Level', 'Status'];

    doc.fontSize(10).font('Helvetica-Bold');
    let x = 50;
    headers.forEach((header, i) => {
      doc.text(header, x, tableTop, { width: colWidths[i], align: 'left' });
      x += colWidths[i];
    });

    // Draw header underline
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Table rows
    doc.font('Helvetica').fontSize(9);
    let y = tableTop + 20;

    data.criticalGaps.slice(0, 15).forEach((gap) => {
      if (y > 700) {
        doc.addPage();
        pageNum++;
        addHeader(doc, 'Executive Summary - Critical Gaps (cont.)');
        y = 130;
      }

      x = 50;
      const rowData = [
        gap.controlId,
        gap.title.substring(0, 40) + (gap.title.length > 40 ? '...' : ''),
        gap.riskScore.toString(),
        gap.riskLevel,
        gap.status,
      ];

      rowData.forEach((cell, i) => {
        doc.text(cell, x, y, { width: colWidths[i], align: 'left' });
        x += colWidths[i];
      });

      y += 20;
    });
  } else {
    doc.fontSize(11).text('No critical gaps identified.');
  }

  addFooter(doc, pageNum);

  // Risk Summary Page
  doc.addPage();
  pageNum++;
  addHeader(doc, 'Executive Summary - Risk Distribution');

  doc.moveDown(2);
  doc.fontSize(14).fillColor(COLORS.text).text('Risk Summary', { underline: true });
  doc.moveDown(1);

  // Generate risk matrix chart
  const criticalCount = data.riskSummary.find((r) => r.riskLevel === 'Critical')?.count || 0;
  const highCount = data.riskSummary.find((r) => r.riskLevel === 'High')?.count || 0;
  const mediumCount = data.riskSummary.find((r) => r.riskLevel === 'Medium')?.count || 0;
  const lowCount = data.riskSummary.find((r) => r.riskLevel === 'Low')?.count || 0;

  try {
    const riskChartPath = await generateRiskMatrix(
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      `risk_matrix_${Date.now()}.png`
    );
    doc.image(riskChartPath, { width: 400, align: 'center' });
    fs.unlinkSync(riskChartPath);
  } catch (error) {
    console.error('Error generating risk matrix:', error);
  }

  addFooter(doc, pageNum);

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

/**
 * Generate Detailed Compliance PDF
 */
export async function generateDetailedCompliancePDF(
  data: DetailedComplianceData,
  fileName: string
): Promise<string> {
  const filePath = path.join(REPORTS_DIR, fileName);
  const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  let pageNum = 1;

  // Cover page
  addHeader(doc, 'Detailed Compliance Report');

  doc.moveDown(2);
  doc.fontSize(14).text('Summary Statistics', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`Total Controls: ${data.summary.totalControls}`);
  doc.text(`Evidence Coverage: ${data.summary.evidenceCoverage}%`);

  doc.moveDown(1);
  doc.fontSize(14).text('Status Breakdown', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  Object.entries(data.summary.byStatus).forEach(([status, count]) => {
    doc.text(`${status}: ${count}`);
  });

  addFooter(doc, pageNum);

  // Controls table (paginated)
  const controlsPerPage = 20;
  const totalPages = Math.ceil(data.controls.length / controlsPerPage);

  for (let i = 0; i < totalPages; i++) {
    doc.addPage();
    pageNum++;
    addHeader(doc, `Detailed Compliance Report - Page ${i + 1} of ${totalPages}`);

    doc.moveDown(2);

    const pageControls = data.controls.slice(
      i * controlsPerPage,
      (i + 1) * controlsPerPage
    );

    // Table headers
    const tableTop = doc.y;
    const colWidths = [60, 180, 80, 60, 60];
    const headers = ['Control', 'Title', 'Status', 'Evidence', 'Risk'];

    doc.fontSize(9).font('Helvetica-Bold');
    let x = 50;
    headers.forEach((header, j) => {
      doc.text(header, x, tableTop, { width: colWidths[j], align: 'left' });
      x += colWidths[j];
    });

    doc.moveTo(50, tableTop + 12).lineTo(530, tableTop + 12).stroke();

    // Table rows
    doc.font('Helvetica').fontSize(8);
    let y = tableTop + 17;

    pageControls.forEach((control) => {
      x = 50;
      const rowData = [
        control.controlId,
        control.title.substring(0, 35) + (control.title.length > 35 ? '...' : ''),
        control.status,
        control.hasEvidence ? 'Yes' : 'No',
        control.riskScore?.toString() || 'N/A',
      ];

      rowData.forEach((cell, j) => {
        doc.text(cell, x, y, { width: colWidths[j], align: 'left' });
        x += colWidths[j];
      });

      y += 15;
    });

    addFooter(doc, pageNum);
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

/**
 * Generate Gap Analysis PDF
 */
export async function generateGapAnalysisPDF(
  data: GapAnalysisData,
  fileName: string
): Promise<string> {
  const filePath = path.join(REPORTS_DIR, fileName);
  const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  let pageNum = 1;

  // Cover page
  addHeader(doc, 'Gap Analysis Report');

  doc.moveDown(2);
  doc.fontSize(14).text('Gap Statistics', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`Total Gaps: ${data.statistics.totalGaps}`);
  doc.text(`Critical Gaps: ${data.statistics.criticalGaps}`);
  doc.text(`High Risk Gaps: ${data.statistics.highRiskGaps}`);
  doc.text(`Average Risk Score: ${data.statistics.averageRiskScore}`);

  addFooter(doc, pageNum);

  // Gaps table (paginated)
  const gapsPerPage = 15;
  const totalPages = Math.ceil(data.gaps.length / gapsPerPage);

  for (let i = 0; i < totalPages; i++) {
    doc.addPage();
    pageNum++;
    addHeader(doc, `Gap Analysis Report - Page ${i + 1} of ${totalPages}`);

    doc.moveDown(2);

    const pageGaps = data.gaps.slice(i * gapsPerPage, (i + 1) * gapsPerPage);

    // Table headers
    const tableTop = doc.y;
    const colWidths = [60, 160, 80, 80, 60];
    const headers = ['Control', 'Title', 'Risk Level', 'Status', 'Priority'];

    doc.fontSize(9).font('Helvetica-Bold');
    let x = 50;
    headers.forEach((header, j) => {
      doc.text(header, x, tableTop, { width: colWidths[j], align: 'left' });
      x += colWidths[j];
    });

    doc.moveTo(50, tableTop + 12).lineTo(500, tableTop + 12).stroke();

    // Table rows
    doc.font('Helvetica').fontSize(8);
    let y = tableTop + 17;

    pageGaps.forEach((gap) => {
      x = 50;
      const rowData = [
        gap.controlId,
        gap.title.substring(0, 30) + (gap.title.length > 30 ? '...' : ''),
        gap.riskLevel,
        gap.status,
        gap.priority,
      ];

      rowData.forEach((cell, j) => {
        doc.text(cell, x, y, { width: colWidths[j], align: 'left' });
        x += colWidths[j];
      });

      y += 18;
    });

    addFooter(doc, pageNum);
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

/**
 * Generate POAM PDF
 */
export async function generatePOAMPDF(
  data: POAMReportData,
  fileName: string
): Promise<string> {
  const filePath = path.join(REPORTS_DIR, fileName);
  const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  let pageNum = 1;

  // Cover page
  addHeader(doc, 'Plan of Action & Milestones Report');

  doc.moveDown(2);
  doc.fontSize(14).text('POAM Statistics', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`Total POAMs: ${data.statistics.totalPoams}`);
  doc.text(`Open POAMs: ${data.statistics.openPoams}`);
  doc.text(`In Progress: ${data.statistics.inProgressPoams}`);
  doc.text(`Completed: ${data.statistics.completedPoams}`);
  doc.text(`Overdue: ${data.statistics.overduePoams}`);
  doc.text(`Average Completion: ${data.statistics.averageCompletion}%`);

  addFooter(doc, pageNum);

  // POAMs details
  data.poams.forEach((poam) => {
    doc.addPage();
    pageNum++;
    addHeader(doc, `POAM #${poam.id} - ${poam.controlId}`);

    doc.moveDown(2);

    doc.fontSize(12).fillColor(COLORS.text).text(`Control: ${poam.controlTitle}`, {
      underline: true,
    });
    doc.moveDown(0.5);

    doc.fontSize(10);
    doc.text(`Status: ${poam.status}`, { continued: true });
    doc.text(`   Priority: ${poam.priority}`, { continued: false });
    doc.text(
      `Target Date: ${
        poam.targetDate ? new Date(poam.targetDate).toLocaleDateString() : 'N/A'
      }`
    );
    doc.text(`Assigned Owner: ${poam.assignedOwner || 'Not assigned'}`);

    if (poam.isOverdue) {
      doc.fillColor(COLORS.error).text('⚠ OVERDUE', { continued: false });
      doc.fillColor(COLORS.text);
    }

    doc.moveDown(1);
    doc.fontSize(11).text('Gap Description:', { underline: true });
    doc.fontSize(10).text(poam.gapDescription, { align: 'justify' });

    doc.moveDown(1);
    doc.fontSize(11).text('Remediation Plan:', { underline: true });
    doc.fontSize(10).text(poam.remediationPlan, { align: 'justify' });

    doc.moveDown(1);
    doc.fontSize(11).text(
      `Milestones: ${poam.milestonesCompleted}/${poam.milestonesTotalCount} completed`
    );

    if (poam.milestones.length > 0) {
      doc.fontSize(9);
      poam.milestones.forEach((milestone) => {
        doc.text(
          `  • ${milestone.description} - ${
            milestone.status === 'Completed' ? '✓' : '○'
          } ${new Date(milestone.targetDate).toLocaleDateString()}`
        );
      });
    }

    addFooter(doc, pageNum);
  });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

/**
 * Generate Audit Package PDF (comprehensive)
 */
export async function generateAuditPackagePDF(
  data: AuditPackageData,
  fileName: string
): Promise<string> {
  // Audit package combines multiple report sections
  // For simplicity, generate executive summary - in production, combine all reports
  return await generateExecutiveSummaryPDF(data.executiveSummary, fileName);
}

/**
 * Generate Progress Report PDF
 */
export async function generateProgressReportPDF(
  data: ProgressReportData,
  fileName: string
): Promise<string> {
  const filePath = path.join(REPORTS_DIR, fileName);
  const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  let pageNum = 1;

  // Cover page
  addHeader(doc, 'Progress Report');

  doc.moveDown(2);
  doc.fontSize(14).text('Current Snapshot', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(
    `Date: ${new Date(data.currentSnapshot.date).toLocaleDateString()}`
  );
  doc.text(`Compliance: ${data.currentSnapshot.compliancePercentage}%`);
  doc.text(
    `Implemented Controls: ${data.currentSnapshot.implementedControls}`
  );

  doc.moveDown(1.5);
  doc.fontSize(14).text('Recently Completed', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);

  data.recentlyCompleted.slice(0, 10).forEach((item) => {
    doc.text(`✓ ${item.controlId}: ${item.title}`);
  });

  addFooter(doc, pageNum);

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

/**
 * Main PDF generation dispatcher
 */
export async function generatePDF(
  reportType: ReportType,
  data: any,
  fileName: string
): Promise<string> {
  switch (reportType) {
    case 'executive-summary':
      return await generateExecutiveSummaryPDF(data, fileName);
    case 'detailed-compliance':
      return await generateDetailedCompliancePDF(data, fileName);
    case 'gap-analysis':
      return await generateGapAnalysisPDF(data, fileName);
    case 'poam':
      return await generatePOAMPDF(data, fileName);
    case 'audit-package':
      return await generateAuditPackagePDF(data, fileName);
    case 'progress':
      return await generateProgressReportPDF(data, fileName);
    default:
      throw new Error(`Unsupported report type: ${reportType}`);
  }
}
