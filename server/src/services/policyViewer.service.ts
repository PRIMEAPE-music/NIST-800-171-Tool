import { PrismaClient } from '@prisma/client';
import {
  PolicyDetail,
  PolicySearchParams,
  PolicyViewerStats,
  ParsedPolicyData,
  MappedControl,
} from '../types/policyViewer.types';

const prisma = new PrismaClient();

class PolicyViewerService {
  /**
   * Get all policies with optional filtering and search
   */
  async getPolicies(params: PolicySearchParams): Promise<PolicyDetail[]> {
    const {
      policyType,
      searchTerm,
      isActive,
      controlId,
      sortBy = 'lastSynced',
      sortOrder = 'desc',
    } = params;

    // Build where clause
    const where: any = {};

    if (policyType) {
      where.policyType = policyType;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (searchTerm) {
      where.OR = [
        { policyName: { contains: searchTerm, mode: 'insensitive' } },
        { policyDescription: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // If filtering by control, join through mappings
    if (controlId) {
      where.controlMappings = {
        some: {
          control: {
            controlId: controlId,
          },
        },
      };
    }

    // Build order by
    const orderBy: any = {};
    if (sortBy === 'name') {
      orderBy.policyName = sortOrder;
    } else if (sortBy === 'lastSynced') {
      orderBy.lastSynced = sortOrder;
    } else if (sortBy === 'type') {
      orderBy.policyType = sortOrder;
    }

    // Fetch policies with related data
    const policies = await prisma.m365Policy.findMany({
      where,
      orderBy,
      include: {
        controlMappings: {
          include: {
            control: {
              select: {
                controlId: true,
                title: true,
              },
            },
          },
        },
      },
    });

    // Transform to PolicyDetail format
    return policies.map((policy) => this.transformToPolicyDetail(policy));
  }

  /**
   * Get a single policy by ID with full details
   */
  async getPolicyById(id: number): Promise<PolicyDetail | null> {
    const policy = await prisma.m365Policy.findUnique({
      where: { id },
      include: {
        controlMappings: {
          include: {
            control: {
              select: {
                controlId: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!policy) {
      return null;
    }

    return this.transformToPolicyDetail(policy);
  }

  /**
   * Get policy viewer statistics
   */
  async getStats(): Promise<PolicyViewerStats> {
    const [total, active, byType, lastSync, withMappings] = await Promise.all([
      prisma.m365Policy.count(),
      prisma.m365Policy.count({ where: { isActive: true } }),
      prisma.m365Policy.groupBy({
        by: ['policyType'],
        _count: true,
      }),
      prisma.m365Policy.findFirst({
        orderBy: { lastSynced: 'desc' },
        select: { lastSynced: true },
      }),
      prisma.m365Policy.count({
        where: {
          controlMappings: {
            some: {},
          },
        },
      }),
    ]);

    const byTypeMap = {
      Intune: 0,
      Purview: 0,
      AzureAD: 0,
    };

    byType.forEach((item) => {
      byTypeMap[item.policyType as keyof typeof byTypeMap] = item._count;
    });

    return {
      totalPolicies: total,
      activePolicies: active,
      inactivePolicies: total - active,
      byType: byTypeMap,
      lastSyncDate: lastSync?.lastSynced || null,
      policiesWithMappings: withMappings,
    };
  }

  /**
   * Transform database policy to PolicyDetail format
   */
  private transformToPolicyDetail(policy: any): PolicyDetail {
    // Parse the policyData JSON string
    let parsedData: ParsedPolicyData;
    try {
      const rawData = JSON.parse(policy.policyData);
      parsedData = this.parsePolicyData(rawData, policy.policyType);
    } catch (error) {
      console.error(`Failed to parse policy data for ${policy.policyId}:`, error);
      parsedData = {
        displayName: policy.policyName,
        settings: {},
      };
    }

    // Transform mapped controls
    const mappedControls: MappedControl[] =
      policy.controlMappings?.map((mapping: any) => ({
        controlId: mapping.control.controlId,
        controlTitle: mapping.control.title,
        mappingConfidence: mapping.mappingConfidence,
        mappingNotes: mapping.mappingNotes,
      })) || [];

    return {
      id: policy.id,
      policyType: policy.policyType,
      policyId: policy.policyId,
      policyName: policy.policyName,
      policyDescription: policy.policyDescription,
      lastSynced: policy.lastSynced,
      isActive: policy.isActive,
      parsedData,
      mappedControls,
    };
  }

  /**
   * Parse raw policy data based on type
   */
  private parsePolicyData(rawData: any, policyType: string): ParsedPolicyData {
    const parsed: ParsedPolicyData = {
      displayName: rawData.displayName || rawData.Name || 'Unknown',
      description: rawData.description || rawData.Comment,
      createdDateTime: rawData.createdDateTime || rawData.CreatedTime,
      modifiedDateTime: rawData.lastModifiedDateTime || rawData.LastModifiedTime,
      settings: {},
    };

    switch (policyType) {
      case 'Intune':
        return this.parseIntunePolicy(rawData, parsed);
      case 'Purview':
        return this.parsePurviewPolicy(rawData, parsed);
      case 'AzureAD':
        return this.parseAzureADPolicy(rawData, parsed);
      default:
        return parsed;
    }
  }

  /**
   * Parse Intune policy data (ENHANCED)
   */
  private parseIntunePolicy(rawData: any, parsed: ParsedPolicyData): ParsedPolicyData {
    parsed.odataType = rawData['@odata.type'];
    parsed.platformType = rawData.platformType;

    // Extract relevant settings based on policy type
    const settings: Record<string, any> = {};

    // === Windows Compliance Policy Settings ===
    if (rawData.passwordRequired !== undefined)
      settings.passwordRequired = rawData.passwordRequired;
    if (rawData.passwordMinimumLength)
      settings.passwordMinimumLength = rawData.passwordMinimumLength;
    if (rawData.passwordMinutesOfInactivityBeforeLock)
      settings.passwordMinutesOfInactivityBeforeLock = rawData.passwordMinutesOfInactivityBeforeLock;
    if (rawData.passwordExpirationDays)
      settings.passwordExpirationDays = rawData.passwordExpirationDays;
    if (rawData.passwordPreviousPasswordBlockCount)
      settings.passwordPreviousPasswordBlockCount = rawData.passwordPreviousPasswordBlockCount;
    if (rawData.passwordRequiredType)
      settings.passwordRequiredType = rawData.passwordRequiredType;
    if (rawData.requireHealthyDeviceReport !== undefined)
      settings.requireHealthyDeviceReport = rawData.requireHealthyDeviceReport;
    if (rawData.osMinimumVersion)
      settings.osMinimumVersion = rawData.osMinimumVersion;
    if (rawData.osMaximumVersion)
      settings.osMaximumVersion = rawData.osMaximumVersion;
    if (rawData.mobileOsMinimumVersion)
      settings.mobileOsMinimumVersion = rawData.mobileOsMinimumVersion;
    if (rawData.mobileOsMaximumVersion)
      settings.mobileOsMaximumVersion = rawData.mobileOsMaximumVersion;

    // === Encryption Settings ===
    if (rawData.bitLockerEnabled !== undefined)
      settings.bitLockerEnabled = rawData.bitLockerEnabled;
    if (rawData.storageRequireEncryption !== undefined)
      settings.storageRequireEncryption = rawData.storageRequireEncryption;
    if (rawData.secureBootEnabled !== undefined)
      settings.secureBootEnabled = rawData.secureBootEnabled;
    if (rawData.codeIntegrityEnabled !== undefined)
      settings.codeIntegrityEnabled = rawData.codeIntegrityEnabled;

    // === Firewall & Security Settings ===
    if (rawData.firewallEnabled !== undefined)
      settings.firewallEnabled = rawData.firewallEnabled;
    if (rawData.antivirusRequired !== undefined)
      settings.antivirusRequired = rawData.antivirusRequired;
    if (rawData.antiSpywareRequired !== undefined)
      settings.antiSpywareRequired = rawData.antiSpywareRequired;
    if (rawData.defenderEnabled !== undefined)
      settings.defenderEnabled = rawData.defenderEnabled;
    if (rawData.defenderVersion)
      settings.defenderVersion = rawData.defenderVersion;
    if (rawData.signatureOutOfDate !== undefined)
      settings.signatureOutOfDate = rawData.signatureOutOfDate;
    if (rawData.rtpEnabled !== undefined)
      settings.rtpEnabled = rawData.rtpEnabled;

    // === Device Health Settings ===
    if (rawData.deviceThreatProtectionEnabled !== undefined)
      settings.deviceThreatProtectionEnabled = rawData.deviceThreatProtectionEnabled;
    if (rawData.deviceThreatProtectionRequiredSecurityLevel)
      settings.deviceThreatProtectionRequiredSecurityLevel = rawData.deviceThreatProtectionRequiredSecurityLevel;
    if (rawData.tpmRequired !== undefined)
      settings.tpmRequired = rawData.tpmRequired;

    // === iOS/Android Compliance ===
    if (rawData.passcodeRequired !== undefined)
      settings.passcodeRequired = rawData.passcodeRequired;
    if (rawData.passcodeMinimumLength)
      settings.passcodeMinimumLength = rawData.passcodeMinimumLength;
    if (rawData.deviceBlockedOnMissingPartnerData !== undefined)
      settings.deviceBlockedOnMissingPartnerData = rawData.deviceBlockedOnMissingPartnerData;

    // === Configuration Policy Settings ===
    // Windows Update settings
    if (rawData.automaticUpdateMode)
      settings.automaticUpdateMode = rawData.automaticUpdateMode;
    if (rawData.microsoftUpdateServiceAllowed !== undefined)
      settings.microsoftUpdateServiceAllowed = rawData.microsoftUpdateServiceAllowed;
    if (rawData.qualityUpdatesDeferralPeriodInDays)
      settings.qualityUpdatesDeferralPeriodInDays = rawData.qualityUpdatesDeferralPeriodInDays;
    if (rawData.featureUpdatesDeferralPeriodInDays)
      settings.featureUpdatesDeferralPeriodInDays = rawData.featureUpdatesDeferralPeriodInDays;
    if (rawData.deliveryOptimizationMode)
      settings.deliveryOptimizationMode = rawData.deliveryOptimizationMode;

    // iOS/Android configs
    if (rawData.iTunesBlockAutomaticDownloads !== undefined)
      settings.iTunesBlockAutomaticDownloads = rawData.iTunesBlockAutomaticDownloads;
    if (rawData.appleWatchBlockAutoUnlock !== undefined)
      settings.appleWatchBlockAutoUnlock = rawData.appleWatchBlockAutoUnlock;
    if (rawData.workProfileBlockCamera !== undefined)
      settings.workProfileBlockCamera = rawData.workProfileBlockCamera;

    // === App Protection (MAM) Policy Settings ===
    // Data Protection
    if (rawData.dataBackupBlocked !== undefined)
      settings.dataBackupBlocked = rawData.dataBackupBlocked;
    if (rawData.deviceComplianceRequired !== undefined)
      settings.deviceComplianceRequired = rawData.deviceComplianceRequired;
    if (rawData.managedBrowserRequired !== undefined)
      settings.managedBrowserRequired = rawData.managedBrowserRequired;
    if (rawData.disableAppPinIfDevicePinIsSet !== undefined)
      settings.disableAppPinIfDevicePinIsSet = rawData.disableAppPinIfDevicePinIsSet;
    if (rawData.pinRequired !== undefined)
      settings.pinRequired = rawData.pinRequired;
    if (rawData.printBlocked !== undefined)
      settings.printBlocked = rawData.printBlocked;
    if (rawData.saveAsBlocked !== undefined)
      settings.saveAsBlocked = rawData.saveAsBlocked;
    if (rawData.simplePinBlocked !== undefined)
      settings.simplePinBlocked = rawData.simplePinBlocked;

    // Version Requirements
    if (rawData.minimumRequiredOsVersion)
      settings.minimumRequiredOsVersion = rawData.minimumRequiredOsVersion;
    if (rawData.minimumWarningOsVersion)
      settings.minimumWarningOsVersion = rawData.minimumWarningOsVersion;
    if (rawData.minimumRequiredAppVersion)
      settings.minimumRequiredAppVersion = rawData.minimumRequiredAppVersion;
    if (rawData.minimumWarningAppVersion)
      settings.minimumWarningAppVersion = rawData.minimumWarningAppVersion;

    // Access Control
    if (rawData.organizationalCredentialsRequired !== undefined)
      settings.organizationalCredentialsRequired = rawData.organizationalCredentialsRequired;
    if (rawData.allowedDataStorageLocations)
      settings.allowedDataStorageLocations = rawData.allowedDataStorageLocations;
    if (rawData.contactSyncBlocked !== undefined)
      settings.contactSyncBlocked = rawData.contactSyncBlocked;
    if (rawData.periodOfflineBeforeAccessCheck)
      settings.periodOfflineBeforeAccessCheck = rawData.periodOfflineBeforeAccessCheck;
    if (rawData.periodOnlineBeforeAccessCheck)
      settings.periodOnlineBeforeAccessCheck = rawData.periodOnlineBeforeAccessCheck;
    if (rawData.periodOfflineBeforeWipeIsEnforced)
      settings.periodOfflineBeforeWipeIsEnforced = rawData.periodOfflineBeforeWipeIsEnforced;
    if (rawData.fingerprintBlocked !== undefined)
      settings.fingerprintBlocked = rawData.fingerprintBlocked;
    if (rawData.faceIdBlocked !== undefined)
      settings.faceIdBlocked = rawData.faceIdBlocked;

    // === Endpoint Security (Intents) Settings ===
    if (rawData.settings && Array.isArray(rawData.settings)) {
      settings.endpointSecuritySettings = rawData.settings
        .map((s: any) => {
          const setting: any = {
            id: s.id,
          };

          // Extract displayName
          if (s.displayName) {
            setting.displayName = s.displayName;
          }

          // Extract definitionId
          if (s.definitionId) {
            setting.definitionId = s.definitionId;
          }

          // Extract value - could be in different formats
          if (s.value !== undefined) {
            setting.value = s.value;
          } else if (s.valueJson) {
            // Try to parse valueJson if it's a string
            try {
              setting.value = typeof s.valueJson === 'string'
                ? JSON.parse(s.valueJson)
                : s.valueJson;
            } catch {
              setting.value = s.valueJson;
            }
          }

          return setting;
        })
        .filter((s: any) => s.displayName || s.definitionId || s.value !== undefined); // Filter out empty settings
    }

    // === Assignment Information ===
    if (rawData.assignments) {
      settings.assignmentCount = rawData.assignments.length;
    }

    parsed.settings = settings;
    return parsed;
  }

  /**
   * Parse Purview policy data
   */
  private parsePurviewPolicy(rawData: any, parsed: ParsedPolicyData): ParsedPolicyData {
    const settings: Record<string, any> = {};

    // DLP Policy specific
    if (rawData.Enabled !== undefined) settings.enabled = rawData.Enabled;
    if (rawData.Mode) settings.mode = rawData.Mode;
    if (rawData.Priority !== undefined) settings.priority = rawData.Priority;

    // Sensitivity Label specific
    if (rawData.sensitivity !== undefined) settings.sensitivity = rawData.sensitivity;
    if (rawData.isActive !== undefined) settings.isActive = rawData.isActive;
    if (rawData.parentId) settings.parentId = rawData.parentId;

    parsed.settings = settings;
    return parsed;
  }

  /**
   * Parse Azure AD policy data
   */
  private parseAzureADPolicy(rawData: any, parsed: ParsedPolicyData): ParsedPolicyData {
    const settings: Record<string, any> = {};

    // Conditional Access specific
    if (rawData.state) settings.state = rawData.state;
    if (rawData.conditions) settings.conditions = rawData.conditions;
    if (rawData.grantControls) settings.grantControls = rawData.grantControls;
    if (rawData.sessionControls) settings.sessionControls = rawData.sessionControls;

    // MFA specific
    if (rawData.includeApplications)
      settings.includeApplications = rawData.includeApplications;
    if (rawData.excludeApplications)
      settings.excludeApplications = rawData.excludeApplications;

    parsed.settings = settings;
    return parsed;
  }

  /**
   * Get policies mapped to a specific control
   */
  async getPoliciesByControl(controlId: string): Promise<PolicyDetail[]> {
    return this.getPolicies({ controlId });
  }

  /**
   * Get export data for all policies
   */
  async getExportData(): Promise<any> {
    const [policies, stats] = await Promise.all([
      this.getPolicies({}),
      this.getStats(),
    ]);

    return {
      exportDate: new Date(),
      policies,
      stats,
    };
  }
}

export default new PolicyViewerService();
