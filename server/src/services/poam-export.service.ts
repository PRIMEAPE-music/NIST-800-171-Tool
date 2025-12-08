import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import ExcelJS from 'exceljs';
import { createObjectCsvWriter } from 'csv-writer';
import { PoamWithControl } from '../types/poam.types';
import { poamService } from './poam.service';

const TEMP_DIR = path.join(__dirname, '../../temp');
const EXPORT_DIR = path.join(__dirname, '../../exports');

// Ensure directories exist
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

// Color scheme matching existing PDF generator
const COLORS = {
  primary: '#90CAF9',
  success: '#66BB6A',
  warning: '#FFA726',
  error: '#F44336',
  text: '#212121',
  lightGray: '#F5F5F5',
  darkGray: '#757575',
};

export class PoamExportService {
  /**
   * Generate PDF for single POAM with milestones
   */
  async generatePoamPdf(poam: PoamWithControl, fileName: string): Promise<string> {
    const filePath = path.join(TEMP_DIR, fileName);
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc
      .fontSize(20)
      .fillColor(COLORS.primary)
      .text('ARIA NIST 800-171 Rev 3 Compliance', 50, 40, { align: 'center' });

    doc
      .fontSize(16)
      .fillColor(COLORS.text)
      .text('Plan of Action & Milestones', 50, 65, { align: 'center' });

    doc
      .fontSize(10)
      .fillColor(COLORS.darkGray)
      .text(`Generated: ${new Date().toLocaleString()}`, 50, 90, { align: 'center' });

    doc.moveTo(50, 110).lineTo(550, 110).stroke(COLORS.darkGray);

    doc.moveDown(2);

    // Control Information Box
    doc
      .rect(50, doc.y, 500, 20)
      .fillAndStroke(COLORS.lightGray, COLORS.darkGray);

    const controlBoxY = doc.y + 6;
    doc.fillColor(COLORS.primary).fontSize(10);
    doc.text(`Control: ${poam.control.controlId}`, 60, controlBoxY);
    doc.fillColor(COLORS.text).fontSize(10);
    doc.text(`${poam.control.title}`, 50, controlBoxY, { align: 'center', width: 500 });
    doc.fillColor(COLORS.darkGray).fontSize(10);
    doc.text(`Family: ${poam.control.family}`, 450, controlBoxY);

    doc.moveDown(3);

    // Status/Assigned To/Start Date Box
    doc
      .rect(50, doc.y, 240, 56)
      .fillAndStroke(COLORS.lightGray, COLORS.darkGray);

    const statusBoxY = doc.y + 10;
    doc.fontSize(10).fillColor(COLORS.text);
    doc.text(`Status: ${poam.status}`, 60, statusBoxY);
    doc.text(`Assigned To: ${poam.assignedTo || 'Not assigned'}`, 60, statusBoxY + 16);
    if (poam.startDate) {
      doc.text(
        `Start Date: ${new Date(poam.startDate).toLocaleDateString()}`,
        60,
        statusBoxY + 32
      );
    }

    // Priority/Target/Budget Box (right side)
    doc
      .rect(300, statusBoxY - 10, 250, 56)
      .fillAndStroke(COLORS.lightGray, COLORS.darkGray);

    const priorityColor =
      poam.priority === 'High' ? COLORS.error :
      poam.priority === 'Medium' ? COLORS.warning :
      COLORS.success;
    doc.fillColor(priorityColor).fontSize(10);
    doc.text(`Priority: ${poam.priority}`, 310, statusBoxY);

    doc.fillColor(COLORS.text);
    if (poam.targetCompletionDate) {
      doc.text(
        `Target Completion: ${new Date(poam.targetCompletionDate).toLocaleDateString()}`,
        310,
        statusBoxY + 16
      );
    }

    if (poam.budgetEstimate) {
      doc.text(
        `Budget: $${poam.budgetEstimate.toLocaleString()}`,
        310,
        statusBoxY + 32
      );
    }

    if (poam.actualCompletionDate) {
      doc.moveDown(5);
      doc.fillColor(COLORS.success).fontSize(10);
      doc.text(
        `Completed: ${new Date(poam.actualCompletionDate).toLocaleDateString()}`,
        50,
        doc.y
      );
      doc.fillColor(COLORS.text);
    }

    doc.moveDown(4);

    // Gap Description
    doc.fontSize(12).fillColor(COLORS.text).text('Gap Description:', 50, doc.y, { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).text(poam.gapDescription, 50, doc.y, { width: 500, align: 'left' });

    doc.moveDown(1.5);

    // Remediation Plan
    doc.fontSize(12).text('Remediation Plan:', 50, doc.y, { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).text(poam.remediationPlan, 50, doc.y, { width: 500, align: 'left' });

    // Resources Required
    if (poam.resourcesRequired) {
      doc.moveDown(1.5);
      doc.fontSize(12).text('Resources Required:', 50, doc.y, { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).text(poam.resourcesRequired, 50, doc.y, { width: 500, align: 'left' });
    }

    // Milestones Section
    if (poam.milestones && poam.milestones.length > 0) {
      // Add new page for milestones if needed
      if (doc.y > 600) {
        doc.addPage();
      } else {
        doc.moveDown(2);
      }

      doc.fontSize(14).fillColor(COLORS.text).text('Milestones', 50, doc.y, { underline: true });
      doc.moveDown(1);

      const completedCount = poam.milestones.filter(m => m.status === 'Completed').length;
      doc.fontSize(10).fillColor(COLORS.darkGray);
      doc.text(`Progress: ${completedCount} of ${poam.milestones.length} completed`, 50, doc.y);
      doc.moveDown(1);

      poam.milestones.forEach((milestone, index) => {
        if (doc.y > 700) {
          doc.addPage();
          doc.fontSize(14).fillColor(COLORS.text).text('Milestones (continued)', 50, doc.y, { underline: true });
          doc.moveDown(1);
        }

        const status = milestone.status === 'Completed' ? '[X]' : '[ ]';
        const statusColor = milestone.status === 'Completed' ? COLORS.success : COLORS.darkGray;

        doc.fillColor(statusColor).fontSize(11);
        doc.text(`${index + 1}. ${status} ${milestone.milestoneDescription}`, 50, doc.y, {
          width: 500,
          align: 'left',
        });

        doc.fontSize(9).fillColor(COLORS.darkGray);
        doc.text(`   Due: ${new Date(milestone.dueDate).toLocaleDateString()}`, 50, doc.y, {
          continued: true,
        });
        doc.text(`   Status: ${milestone.status}`);

        if (milestone.completionDate) {
          doc.fillColor(COLORS.success);
          doc.text(`   Completed: ${new Date(milestone.completionDate).toLocaleDateString()}`, 50, doc.y);
        }

        if (milestone.notes) {
          doc.fillColor(COLORS.text).fontSize(9);
          doc.text(`   Notes: ${milestone.notes}`, 50, doc.y, { width: 500, align: 'left' });
        }

        doc.moveDown(0.8);
      });
    }

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  /**
   * Generate ZIP file with multiple POAM PDFs
   */
  async generateBulkPdfZip(poamIds: number[], zipFileName: string): Promise<string> {
    const zipPath = path.join(EXPORT_DIR, zipFileName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    const pdfFiles: string[] = [];

    // Generate PDF for each POAM
    for (const poamId of poamIds) {
      try {
        const poam = await poamService.getPoamById(poamId);
        if (!poam) {
          console.warn(`POAM ${poamId} not found, skipping`);
          continue;
        }

        const pdfFileName = `POAM_${poam.control.controlId.replace(/[^a-zA-Z0-9]/g, '_')}_${poamId}.pdf`;
        const pdfPath = await this.generatePoamPdf(poam, pdfFileName);

        archive.file(pdfPath, { name: pdfFileName });
        pdfFiles.push(pdfPath);
      } catch (error) {
        console.error(`Error generating PDF for POAM ${poamId}:`, error);
      }
    }

    await archive.finalize();

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        // Clean up temp PDF files
        pdfFiles.forEach((pdfPath) => {
          try {
            if (fs.existsSync(pdfPath)) {
              fs.unlinkSync(pdfPath);
            }
          } catch (error) {
            console.error('Error cleaning up PDF:', error);
          }
        });
        resolve(zipPath);
      });
      output.on('error', reject);
      archive.on('error', reject);
    });
  }

  /**
   * Generate Excel file with POAMs
   */
  async generateExcel(poamIds: number[], fileName: string): Promise<string> {
    const filePath = path.join(EXPORT_DIR, fileName);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('POAMs');

    // Define columns
    worksheet.columns = [
      { header: 'POAM ID', key: 'id', width: 10 },
      { header: 'Control ID', key: 'controlId', width: 15 },
      { header: 'Control Title', key: 'controlTitle', width: 40 },
      { header: 'Gap Description', key: 'gapDescription', width: 50 },
      { header: 'Remediation Plan', key: 'remediationPlan', width: 50 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Assigned To', key: 'assignedTo', width: 20 },
      { header: 'Start Date', key: 'startDate', width: 15 },
      { header: 'Target Date', key: 'targetDate', width: 15 },
      { header: 'Actual Completion', key: 'actualDate', width: 15 },
      { header: 'Budget', key: 'budget', width: 15 },
      { header: 'Milestones Total', key: 'milestonesTotal', width: 15 },
      { header: 'Milestones Completed', key: 'milestonesCompleted', width: 18 },
      { header: 'Resources', key: 'resources', width: 40 },
    ];

    // Fetch POAMs and add rows
    for (const poamId of poamIds) {
      const poam = await poamService.getPoamById(poamId);
      if (!poam) continue;

      worksheet.addRow({
        id: poam.id,
        controlId: poam.control.controlId,
        controlTitle: poam.control.title,
        gapDescription: poam.gapDescription,
        remediationPlan: poam.remediationPlan,
        status: poam.status,
        priority: poam.priority,
        assignedTo: poam.assignedTo || '',
        startDate: poam.startDate
          ? new Date(poam.startDate).toLocaleDateString()
          : '',
        targetDate: poam.targetCompletionDate
          ? new Date(poam.targetCompletionDate).toLocaleDateString()
          : '',
        actualDate: poam.actualCompletionDate
          ? new Date(poam.actualCompletionDate).toLocaleDateString()
          : '',
        budget: poam.budgetEstimate
          ? `$${poam.budgetEstimate.toLocaleString()}`
          : '',
        milestonesTotal: poam.milestones.length,
        milestonesCompleted: poam.milestones.filter(m => m.status === 'Completed').length,
        resources: poam.resourcesRequired || '',
      });
    }

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF90CAF9' },
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Auto-filter
    worksheet.autoFilter = {
      from: 'A1',
      to: `O1`,
    };

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  /**
   * Generate CSV file with POAMs
   */
  async generateCsv(poamIds: number[], fileName: string): Promise<string> {
    const filePath = path.join(EXPORT_DIR, fileName);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'POAM ID' },
        { id: 'controlId', title: 'Control ID' },
        { id: 'controlTitle', title: 'Control Title' },
        { id: 'gapDescription', title: 'Gap Description' },
        { id: 'remediationPlan', title: 'Remediation Plan' },
        { id: 'status', title: 'Status' },
        { id: 'priority', title: 'Priority' },
        { id: 'assignedTo', title: 'Assigned To' },
        { id: 'startDate', title: 'Start Date' },
        { id: 'targetDate', title: 'Target Date' },
        { id: 'actualDate', title: 'Actual Completion' },
        { id: 'budget', title: 'Budget' },
        { id: 'milestonesTotal', title: 'Milestones Total' },
        { id: 'milestonesCompleted', title: 'Milestones Completed' },
        { id: 'resources', title: 'Resources' },
      ],
    });

    const records = [];
    for (const poamId of poamIds) {
      const poam = await poamService.getPoamById(poamId);
      if (!poam) continue;

      records.push({
        id: poam.id,
        controlId: poam.control.controlId,
        controlTitle: poam.control.title,
        gapDescription: poam.gapDescription,
        remediationPlan: poam.remediationPlan,
        status: poam.status,
        priority: poam.priority,
        assignedTo: poam.assignedTo || '',
        startDate: poam.startDate
          ? new Date(poam.startDate).toLocaleDateString()
          : '',
        targetDate: poam.targetCompletionDate
          ? new Date(poam.targetCompletionDate).toLocaleDateString()
          : '',
        actualDate: poam.actualCompletionDate
          ? new Date(poam.actualCompletionDate).toLocaleDateString()
          : '',
        budget: poam.budgetEstimate
          ? `$${poam.budgetEstimate.toLocaleString()}`
          : '',
        milestonesTotal: poam.milestones.length,
        milestonesCompleted: poam.milestones.filter(m => m.status === 'Completed')
          .length,
        resources: poam.resourcesRequired || '',
      });
    }

    await csvWriter.writeRecords(records);
    return filePath;
  }
}

export const poamExportService = new PoamExportService();
