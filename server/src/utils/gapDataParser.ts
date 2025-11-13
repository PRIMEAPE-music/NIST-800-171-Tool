import * as fs from 'fs';
import * as path from 'path';

export interface GapData {
  controlId: string;
  gapType: 'technical' | 'policy' | 'procedure' | 'evidence';
  gapTitle: string;
  gapDescription: string;
  nistRequirement: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  remediationGuidance: string;
}

export interface ControlGapsData {
  controlId: string;
  microsoftCoverage: 'strong' | 'partial' | 'minimal' | 'none';
  coveragePercentage: number;
  gaps: GapData[];
  manualVerificationSteps: string[];
  requiredEvidence: string[];
}

/**
 * Parse NIST_800-171_VERIFICATION_CHECKLIST.md to extract gap data
 */
export class GapDataParser {
  private checklistPath: string;

  constructor() {
    this.checklistPath = path.join(
      __dirname,
      '../../..',
      'NIST_800-171_VERIFICATION_CHECKLIST.md'
    );
  }

  /**
   * Parse the entire checklist
   */
  parseChecklist(): ControlGapsData[] {
    const content = fs.readFileSync(this.checklistPath, 'utf-8');
    const controls = this.splitIntoControls(content);

    return controls.map(controlContent => this.parseControl(controlContent));
  }

  /**
   * Get gaps for a specific control
   */
  getControlGaps(controlId: string): ControlGapsData | null {
    const allGaps = this.parseChecklist();
    return allGaps.find(g => g.controlId === controlId) || null;
  }

  /**
   * Split checklist into individual controls
   */
  private splitIntoControls(content: string): string[] {
    // Split by h3 headings (### 03.XX.XX)
    const controlPattern = /### (03\.\d{2}\.\d{2}[^#]*?)(?=###|$)/gs;
    const matches = content.matchAll(controlPattern);

    const controls: string[] = [];
    for (const match of matches) {
      controls.push(match[0]);
    }

    return controls;
  }

  /**
   * Parse a single control section
   */
  private parseControl(content: string): ControlGapsData {
    // Extract control ID from heading
    const controlIdMatch = content.match(/### (03\.\d{2}\.\d{2})/);
    const controlId = controlIdMatch ? controlIdMatch[1] : '';

    // Extract Microsoft Coverage
    const coverageMatch = content.match(/\*\*Microsoft Coverage:\*\* (⚠️ Partial|✅ Strong|❌ Minimal|❌ None)/);
    let microsoftCoverage: 'strong' | 'partial' | 'minimal' | 'none' = 'none';
    let coveragePercentage = 0;

    if (coverageMatch) {
      const coverageText = coverageMatch[1];
      if (coverageText.includes('Strong')) {
        microsoftCoverage = 'strong';
        coveragePercentage = 90;
      } else if (coverageText.includes('Partial')) {
        microsoftCoverage = 'partial';
        coveragePercentage = 50;
      } else if (coverageText.includes('Minimal')) {
        microsoftCoverage = 'minimal';
        coveragePercentage = 20;
      } else {
        microsoftCoverage = 'none';
        coveragePercentage = 0;
      }
    }

    // Extract gaps from "What Microsoft DOESN'T Cover" section
    const gaps = this.extractGaps(content, controlId);

    // Extract manual verification steps
    const manualSteps = this.extractListItems(content, 'Manual Verification Steps');

    // Extract required evidence
    const requiredEvidence = this.extractListItems(content, 'Required Evidence');

    return {
      controlId,
      microsoftCoverage,
      coveragePercentage,
      gaps,
      manualVerificationSteps: manualSteps,
      requiredEvidence,
    };
  }

  /**
   * Extract gaps from "What Microsoft DOESN'T Cover" section
   */
  private extractGaps(content: string, controlId: string): GapData[] {
    const gaps: GapData[] = [];

    // Find the "What Microsoft DOESN'T Cover:" section
    const gapsSection = content.match(
      /\*\*What Microsoft DOESN'T Cover:\*\*(.*?)(?=\*\*Manual Verification Steps|\*\*Required Evidence|$)/s
    );

    if (!gapsSection) return gaps;

    const gapsText = gapsSection[1];

    // Extract each gap (lines starting with ❌ or 📋)
    const gapLines = gapsText.match(/^- (❌|📋|🔍) \*\*([^:]+):\*\* (.+)$/gm);

    if (!gapLines) return gaps;

    gapLines.forEach(line => {
      const match = line.match(/^- (❌|📋|🔍) \*\*([^:]+):\*\* (.+)$/);
      if (!match) return;

      const [, icon, title, description] = match;

      let gapType: GapData['gapType'] = 'procedure';
      if (title.toLowerCase().includes('policy')) gapType = 'policy';
      if (title.toLowerCase().includes('technical') || title.toLowerCase().includes('configuration')) gapType = 'technical';
      if (title.toLowerCase().includes('evidence') || title.toLowerCase().includes('documentation')) gapType = 'evidence';

      let severity: GapData['severity'] = 'medium';
      if (icon === '❌') severity = 'high';
      if (icon === '📋') severity = 'medium';
      if (icon === '🔍') severity = 'low';

      gaps.push({
        controlId,
        gapType,
        gapTitle: title.trim(),
        gapDescription: description.trim(),
        nistRequirement: `NIST 800-171 ${controlId} requires: ${description.trim()}`,
        severity,
        remediationGuidance: this.generateRemediationGuidance(title, gapType),
      });
    });

    return gaps;
  }

  /**
   * Extract list items from a section
   */
  private extractListItems(content: string, sectionName: string): string[] {
    const pattern = new RegExp(
      `\\*\\*${sectionName}:\\*\\*([\\s\\S]*?)(?=\\*\\*[A-Z]|$)`,
      'i'
    );
    const match = content.match(pattern);

    if (!match) return [];

    const sectionText = match[1];
    const items = sectionText.match(/^- \[ \] (.+)$/gm);

    if (!items) return [];

    return items.map(item => item.replace(/^- \[ \] /, '').trim());
  }

  /**
   * Generate remediation guidance based on gap type
   */
  private generateRemediationGuidance(title: string, gapType: string): string {
    if (gapType === 'policy') {
      return `Create ${title.toLowerCase()} document. Use template library or customize based on organizational needs. Obtain management approval and publish to accessible location.`;
    }

    if (gapType === 'procedure') {
      return `Document ${title.toLowerCase()} procedures. Include step-by-step instructions, responsible parties, and frequency. Train staff on new procedures.`;
    }

    if (gapType === 'technical') {
      return `Implement ${title.toLowerCase()}. Review configuration options, test in non-production environment, then deploy to production. Verify with compliance scan.`;
    }

    if (gapType === 'evidence') {
      return `Collect ${title.toLowerCase()}. Take screenshots, export reports, or document current state. Organize in evidence folder for audit.`;
    }

    return `Address ${title.toLowerCase()} gap. Review NIST requirement, implement solution, and verify compliance.`;
  }
}

export const gapDataParser = new GapDataParser();
