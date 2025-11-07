// Risk scoring algorithm and utilities

import { RiskLevel, RiskFactors } from '../types/assessment.types';

export class RiskScoringService {
  // Weight factors for risk calculation
  private static readonly WEIGHTS = {
    PRIORITY: 0.4, // 40% - Control priority (Critical/High/Med/Low)
    IMPLEMENTATION: 0.3, // 30% - Implementation status
    EVIDENCE: 0.15, // 15% - Evidence availability
    TESTING: 0.15, // 15% - Testing/verification status
  };

  // Priority score mapping
  private static readonly PRIORITY_SCORES = {
    Critical: 100,
    High: 75,
    Medium: 50,
    Low: 25,
  };

  /**
   * Calculate risk score for a control assessment
   * @returns Risk score from 0 (lowest risk) to 100 (highest risk)
   */
  public static calculateRiskScore(
    priority: string,
    isImplemented: boolean,
    hasEvidence: boolean,
    isTested: boolean
  ): number {
    const factors = this.getRiskFactors(priority, isImplemented, hasEvidence, isTested);

    const weightedScore =
      factors.priorityScore * this.WEIGHTS.PRIORITY +
      factors.implementationScore * this.WEIGHTS.IMPLEMENTATION +
      factors.evidenceScore * this.WEIGHTS.EVIDENCE +
      factors.testingScore * this.WEIGHTS.TESTING;

    return Math.round(weightedScore);
  }

  /**
   * Get individual risk factor scores
   */
  private static getRiskFactors(
    priority: string,
    isImplemented: boolean,
    hasEvidence: boolean,
    isTested: boolean
  ): RiskFactors {
    return {
      priorityScore: this.getPriorityScore(priority),
      implementationScore: this.getImplementationScore(isImplemented),
      evidenceScore: this.getEvidenceScore(hasEvidence),
      testingScore: this.getTestingScore(isTested),
    };
  }

  /**
   * Convert priority string to numeric score
   */
  private static getPriorityScore(priority: string): number {
    return this.PRIORITY_SCORES[priority as keyof typeof this.PRIORITY_SCORES] || 50;
  }

  /**
   * Calculate implementation score
   * Not implemented = 100 (highest risk)
   * Implemented = 0 (lowest risk)
   */
  private static getImplementationScore(isImplemented: boolean): number {
    return isImplemented ? 0 : 100;
  }

  /**
   * Calculate evidence score
   * No evidence = 100 (highest risk)
   * Has evidence = 0 (lowest risk)
   */
  private static getEvidenceScore(hasEvidence: boolean): number {
    return hasEvidence ? 0 : 100;
  }

  /**
   * Calculate testing score
   * Not tested = 100 (highest risk)
   * Tested = 0 (lowest risk)
   */
  private static getTestingScore(isTested: boolean): number {
    return isTested ? 0 : 100;
  }

  /**
   * Determine risk level from numeric score
   */
  public static getRiskLevel(riskScore: number): RiskLevel {
    if (riskScore >= 76) return 'critical';
    if (riskScore >= 51) return 'high';
    if (riskScore >= 26) return 'medium';
    return 'low';
  }

  /**
   * Get risk level color for UI
   */
  public static getRiskColor(riskScore: number): string {
    const level = this.getRiskLevel(riskScore);
    const colors = {
      critical: '#F44336', // Red
      high: '#FF9800', // Orange
      medium: '#FFA726', // Light Orange
      low: '#66BB6A', // Green
    };
    return colors[level];
  }

  /**
   * Generate gap description based on assessment results
   */
  public static generateGapDescription(
    isImplemented: boolean,
    hasEvidence: boolean,
    isTested: boolean,
    meetsRequirement: boolean
  ): string {
    const gaps: string[] = [];

    if (!isImplemented) {
      gaps.push('Control not implemented');
    } else if (!meetsRequirement) {
      gaps.push('Implementation does not fully meet requirements');
    }

    if (!hasEvidence) {
      gaps.push('No documented evidence');
    }

    if (!isTested) {
      gaps.push('Not tested or verified');
    }

    return gaps.length > 0 ? gaps.join('; ') : 'No gaps identified';
  }
}
