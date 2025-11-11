# Phase 7.3: PDF Report Generation

## Overview
Implement professional PDF document generation using PDFKit. Create formatted reports with headers, footers, tables, page numbers, and embedded charts.

**Duration**: 2-3 days
**Prerequisites**: Phase 7.1-7.2 completed (data aggregation and report infrastructure ready)

---

## Step 1: Verify Dependencies

Ensure all PDF-related packages are installed:
```bash
cd server
npm install pdfkit pdfkit-table canvas
npm install -D @types/pdfkit
```

---

## Step 2: Create Chart Generator Helper

📁 **File**: `server/src/services/reports/generators/chartGenerator.ts`

🔄 **COMPLETE NEW FILE**:

```typescript
import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

const CHARTS_DIR = path.join(__dirname, '../../../../../reports/charts');

// Ensure charts directory exists
if (!fs.existsSync(CHARTS_DIR)) {
  fs.mkdirSync(CHARTS_DIR, { recursive: true });
}

interface ChartData {
  labels: string[];
  values: number[];
  colors?: string[];
}

/**
 * Generate a bar chart as PNG image
 */
export async function generateBarChart(
  data: ChartData,
  title: string,
  fileName: string
): Promise<string> {
  const width = 600;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, 30);

  // Chart area
  const chartX = 80;
  const chartY = 60;
  const chartWidth = width - 120;
  const chartHeight = height - 120;

  // Find max value for scaling
  const maxValue = Math.max(...data.values);
  const scale = chartHeight / (maxValue * 1.1); // 1.1 for padding

  // Default colors
  const defaultColors = ['#90CAF9', '#66BB6A', '#FFA726', '#F44336', '#AB47BC'];
  const colors = data.colors || defaultColors;

  // Draw bars
  const barWidth = chartWidth / data.values.length;
  const barSpacing = barWidth * 0.2;
  const actualBarWidth = barWidth - barSpacing;

  data.values.forEach((value, index) => {
    const barHeight = value * scale;
    const x = chartX + index * barWidth + barSpacing / 2;
    const y = chartY + chartHeight - barHeight;

    // Bar
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillRect(x, y, actualBarWidth, barHeight);

    // Value label on top of bar
    ctx.fillStyle = '#000000';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      value.toString(),
      x + actualBarWidth / 2,
      y - 5
    );

    // X-axis label
    ctx.save();
    ctx.translate(x + actualBarWidth / 2, chartY + chartHeight + 15);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#333333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(data.labels[index], 0, 0);
    ctx.restore();
  });

  // Y-axis
  ctx.strokeStyle = '#CCCCCC';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(chartX, chartY);
  ctx.lineTo(chartX, chartY + chartHeight);
  ctx.lineTo(chartX + chartWidth, chartY + chartHeight);
  ctx.stroke();

  // Save to file
  const filePath = path.join(CHARTS_DIR, fileName);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filePath, buffer);

  return filePath;
}

/**
 * Generate a pie chart as PNG image
 */
export async function generatePieChart(
  data: ChartData,
  title: string,
  fileName: string
): Promise<string> {
  const width = 500;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, 30);

  // Calculate center and radius
  const centerX = width / 2;
  const centerY = height / 2 + 20;
  const radius = Math.min(width, height) / 3;

  // Default colors
  const defaultColors = ['#66BB6A', '#FFA726', '#F44336', '#42A5F5', '#AB47BC'];
  const colors = data.colors || defaultColors;

  // Calculate total and percentages
  const total = data.values.reduce((sum, val) => sum + val, 0);
  let currentAngle = -Math.PI / 2; // Start at top

  data.values.forEach((value, index) => {
    const sliceAngle = (value / total) * 2 * Math.PI;

    // Draw slice
    ctx.fillStyle = colors[index % colors.length];
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();

    // Draw label
    const labelAngle = currentAngle + sliceAngle / 2;
    const labelX = centerX + Math.cos(labelAngle) * (radius + 40);
    const labelY = centerY + Math.sin(labelAngle) * (radius + 40);
    const percentage = ((value / total) * 100).toFixed(1);

    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.textAlign = labelX > centerX ? 'left' : 'right';
    ctx.fillText(`${data.labels[index]}: ${percentage}%`, labelX, labelY);

    currentAngle += sliceAngle;
  });

  // Save to file
  const filePath = path.join(CHARTS_DIR, fileName);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filePath, buffer);

  return filePath;
}

/**
 * Generate a risk matrix heatmap
 */
export async function generateRiskMatrix(
  criticalCount: number,
  highCount: number,
  mediumCount: number,
  lowCount: number,
  fileName: string
): Promise<string> {
  const width = 400;
  const height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Risk Distribution', width / 2, 25);

  // Risk levels
  const risks = [
    { label: 'Critical', count: criticalCount, color: '#D32F2F' },
    { label: 'High', count: highCount, color: '#F57C00' },
    { label: 'Medium', count: mediumCount, color: '#FBC02D' },
    { label: 'Low', count: lowCount, color: '#388E3C' },
  ];

  const startY = 60;
  const barHeight = 50;
  const maxWidth = 300;
  const maxCount = Math.max(criticalCount, highCount, mediumCount, lowCount) || 1;

  risks.forEach((risk, index) => {
    const y = startY + index * (barHeight + 10);
    const barWidth = (risk.count / maxCount) * maxWidth;

    // Bar
    ctx.fillStyle = risk.color;
    ctx.fillRect(50, y, barWidth, barHeight);

    // Label
    ctx.fillStyle = '#000000';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(risk.label, 55, y + barHeight / 2 + 5);

    // Count
    ctx.textAlign = 'right';
    ctx.fillText(risk.count.toString(), 45, y + barHeight / 2 + 5);
  });

  // Save to file
  const filePath = path.join(CHARTS_DIR, fileName);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filePath, buffer);

  return filePath;
}
```

---

## Step 3: Create PDF Generator

📁 **File**: `server/src/services/reports/generators/pdfGenerator.ts`

🔄 **COMPLETE NEW FILE**:

```typescript
import PDFDocument from 'pdfkit';
import PDFTable from 'pdfkit-table';
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
  generatePieChart,
  generateRiskMatrix,
} from './chartGenerator';

const REPORTS_DIR = path.join(__dirname, '../../../../../reports');

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
function addHeader(doc: typeof PDFDocument, title: string): void {
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
function addFooter(doc: typeof PDFDocument, pageNum: number): void {
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
    const chartLabels = data.familyBreakdown.map((f) => f.family);
    const chartValues = data.familyBreakdown.map((f) => f.implementedControls);

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
  doc.moveDown(0.5);

  if (data.criticalGaps.length > 0) {
    const table = {
      headers: ['Control ID', 'Title', 'Risk Score', 'Risk Level', 'Status'],
      rows: data.criticalGaps.slice(0, 15).map((gap) => [
        gap.controlId,
        gap.title.substring(0, 40) + (gap.title.length > 40 ? '...' : ''),
        gap.riskScore.toString(),
        gap.riskLevel,
        gap.status,
      ]),
    };

    await (doc as any).table(table, {
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
      prepareRow: (row: any, indexColumn: number, indexRow: number, rectRow: any) => {
        doc.font('Helvetica').fontSize(9);
        if (indexRow % 2 === 0) {
          doc.fillColor('#F5F5F5').rect(rectRow.x, rectRow.y, rectRow.width, rectRow.height).fill();
        }
        doc.fillColor(COLORS.text);
      },
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
  const controlsPerPage = 15;
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

    const table = {
      headers: ['Control ID', 'Title', 'Status', 'Evidence', 'Risk'],
      rows: pageControls.map((c) => [
        c.controlId,
        c.title.substring(0, 35) + (c.title.length > 35 ? '...' : ''),
        c.status,
        c.hasEvidence ? 'Yes' : 'No',
        c.riskScore?.toString() || 'N/A',
      ]),
    };

    await (doc as any).table(table, {
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
      prepareRow: (row: any, indexColumn: number, indexRow: number, rectRow: any) => {
        doc.font('Helvetica').fontSize(9);
      },
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
  const gapsPerPage = 10;
  const totalPages = Math.ceil(data.gaps.length / gapsPerPage);

  for (let i = 0; i < totalPages; i++) {
    doc.addPage();
    pageNum++;
    addHeader(doc, `Gap Analysis Report - Page ${i + 1} of ${totalPages}`);

    doc.moveDown(2);

    const pageGaps = data.gaps.slice(i * gapsPerPage, (i + 1) * gapsPerPage);

    const table = {
      headers: ['Control ID', 'Title', 'Risk Level', 'Status', 'Priority'],
      rows: pageGaps.map((gap) => [
        gap.controlId,
        gap.title.substring(0, 30) + (gap.title.length > 30 ? '...' : ''),
        gap.riskLevel,
        gap.status,
        gap.priority,
      ]),
    };

    await (doc as any).table(table, {
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
      prepareRow: (row: any, indexColumn: number, indexRow: number, rectRow: any) => {
        doc.font('Helvetica').fontSize(9);
      },
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
  data.poams.forEach((poam, index) => {
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
```

---

## Step 4: Update Report Service to Support PDF

📁 **File**: `server/src/services/reports/reportService.ts`

🔍 **FIND**:
```typescript
      case 'pdf':
        throw new Error('PDF generation not yet implemented (Phase 7.3)');
```

✏️ **REPLACE WITH**:
```typescript
import { generatePDF } from './generators/pdfGenerator';

      case 'pdf':
        filePath = await generatePDF(options.reportType, data, fileName);
        break;
```

---

## Step 5: Testing PDF Generation

```bash
# Executive Summary - PDF
curl -X POST http://localhost:3001/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"reportType":"executive-summary","format":"pdf"}'

# Detailed Compliance - PDF
curl -X POST http://localhost:3001/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"reportType":"detailed-compliance","format":"pdf"}'

# Gap Analysis - PDF
curl -X POST http://localhost:3001/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"reportType":"gap-analysis","format":"pdf"}'

# POAM - PDF
curl -X POST http://localhost:3001/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"reportType":"poam","format":"pdf"}'
```

---

## Verification Checklist

- [ ] PDFKit generating documents without errors
- [ ] Headers and footers on every page
- [ ] Page numbers incrementing correctly
- [ ] Tables rendering properly
- [ ] Charts embedded as images
- [ ] Text wrapping and formatting correct
- [ ] PDF files open without errors
- [ ] All report types generate PDFs
- [ ] File sizes reasonable (<5MB typically)

---

## Troubleshooting

### Issue: "Cannot find module 'canvas'"
**Solution**: Ensure canvas is installed with native dependencies:
```bash
npm install canvas --build-from-source
```

### Issue: Charts not appearing in PDF
**Solution**: Check that chart generator is creating files in the correct directory and files exist before embedding.

### Issue: PDF file is blank or truncated
**Solution**: Ensure `doc.end()` is called and Promise resolves after stream finishes.

---

## Success Criteria

✅ Phase 7.3 is complete when:
1. All 6 report types generate professional PDFs
2. PDFs have proper headers, footers, and page numbers
3. Tables are formatted correctly with data
4. Charts are embedded as images (where applicable)
5. Text is readable with proper formatting
6. PDFs open without errors in Adobe Reader/Preview
7. File sizes are reasonable
8. Multi-page PDFs paginate correctly

---

## Next Steps

Proceed to **Phase 7.4: Frontend Report Builder Interface**
