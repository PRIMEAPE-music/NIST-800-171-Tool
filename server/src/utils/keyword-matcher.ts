/**
 * Keyword Matching Utilities
 *
 * Intelligent keyword-based classification for M365 settings
 * Updated to support Settings Catalog policy families
 */

export interface KeywordMatch {
  score: number;
  matchedKeywords: string[];
  confidence: 'high' | 'medium' | 'low' | 'none';
}

export interface CategoryDefinition {
  family: string;
  templates: string[];
  keywords: string[];
  strongKeywords?: string[]; // Higher weight keywords
  exclusionKeywords?: string[]; // If present, exclude from category
  platform?: string[]; // Platform-specific categories
}

/**
 * Category definitions for all M365 policy families
 * UPDATED: Includes Settings Catalog template types
 */
export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  // ===== IDENTITY GOVERNANCE / PIM =====
  // This should be checked FIRST due to specific keywords
  {
    family: 'IdentityGovernance',
    templates: [
      '#microsoft.graph.privilegedIdentityManagement',
      '#microsoft.graph.accessReviewPolicy'
    ],
    keywords: [
      'access review', 'pim', 'privileged identity', 'just-in-time', 'jit',
      'eligible', 'activation', 'role assignment', 'privileged role',
      'privileged access', 'administrative unit', 'emergency access',
      'break glass', 'break-glass', 'global administrator', 'rbac',
      'role-based', 'least privilege', 'privileged account', 'admin account',
      'role activation', 'permanent assignment', 'eligible assignment',
      'audit privileged', 'privileged maintenance', 'high privileged',
      'maximum activation', 'role definition', 'scoped administration'
    ],
    strongKeywords: ['pim', 'access review', 'privileged identity', 'just-in-time', 'administrative unit'],
    platform: ['All']
  },

  // ===== MICROSOFT DEFENDER SECURITY =====
  {
    family: 'DefenderSecurity',
    templates: [
      '#microsoft.graph.windowsDefenderAdvancedThreatProtectionConfiguration'
    ],
    keywords: [
      'defender antivirus', 'defender xdr', 'real-time protection',
      'behavior monitoring', 'cloud protection', 'definition update',
      'quick scan', 'full scan', 'vulnerability management', 'secure score',
      'threat intelligence', 'automated investigation', 'response',
      'defender for office', 'defender updates', 'platform update',
      'engine update', 'potentially unwanted', 'smartscreen'
    ],
    strongKeywords: ['defender antivirus', 'defender xdr', 'vulnerability management', 'secure score'],
    platform: ['Windows']
  },

  // ===== WINDOWS UPDATE / SERVICING =====
  {
    family: 'Update',
    templates: [
      '#microsoft.graph.windowsUpdateForBusinessConfiguration'
    ],
    keywords: [
      'update', 'patch', 'servicing', 'deferral', 'quality update',
      'feature update', 'windows update', 'automatic update',
      'update mode', 'defer', 'pause', 'deadline', 'grace period',
      'restart', 'active hours', 'schedule', 'maintenance window'
    ],
    strongKeywords: ['windowsUpdateForBusiness', 'updateRing', 'deferral'],
    exclusionKeywords: ['defender updates', 'definition update'],
    platform: ['Windows']
  },

  // ===== COMPLIANCE POLICIES =====
  {
    family: 'Compliance',
    templates: [
      '#microsoft.graph.windows10CompliancePolicy',
      '#microsoft.graph.androidCompliancePolicy',
      '#microsoft.graph.iosCompliancePolicy',
      '#microsoft.graph.macOSCompliancePolicy',
      '#settingsCatalog.customProfile' // Custom Settings Catalog compliance profiles
    ],
    keywords: [
      'password', 'passcode', 'pin', 'biometric', 'fingerprint', 'face id',
      'encryption', 'bitlocker', 'storage encryption', 'device encryption',
      'minimum version', 'os version', 'build version', 'security patch',
      'jailbreak', 'rooted', 'device health', 'attestation', 'tpm',
      'antivirus', 'firewall', 'defender', 'threat', 'secure boot',
      'code integrity', 'minimum length', 'complexity', 'expiration',
      'history', 'reuse', 'lockout', 'inactivity', 'timeout', 'wipe',
      'compliance check', 'health check'
    ],
    strongKeywords: ['compliance', 'required', 'minimum', 'maximum', 'policy'],
    platform: ['Windows', 'Android', 'iOS', 'macOS']
  },

  // ===== SECURITY BASELINES =====
  {
    family: 'SecurityBaseline',
    templates: [
      '#settingsCatalog.baseline'
    ],
    keywords: [
      'baseline', 'security baseline', 'hardening', 'cis', 'stig',
      'security configuration', 'best practice', 'recommended settings',
      'security standard', 'benchmark', 'compliance baseline',
      'windows security', 'defender baseline', 'edge baseline'
    ],
    strongKeywords: ['baseline', 'securityBaseline', 'hardening'],
    platform: ['Windows']
  },

  // ===== ENDPOINT DETECTION & RESPONSE =====
  {
    family: 'EndpointDetection',
    templates: [
      '#settingsCatalog.endpointSecurityEndpointDetectionAndResponse'
    ],
    keywords: [
      'edr', 'endpoint detection', 'response', 'defender for endpoint',
      'mde', 'microsoft defender', 'threat detection', 'advanced threat',
      'atp', 'onboarding', 'sensor', 'telemetry', 'sample sharing',
      'cloud protection', 'block at first sight', 'purview', 'investigation'
    ],
    strongKeywords: ['edr', 'endpointDetection', 'microsoftSense', 'defenderForEndpoint'],
    platform: ['Windows']
  },

  // ===== ATTACK SURFACE REDUCTION =====
  {
    family: 'AttackSurfaceReduction',
    templates: [
      '#settingsCatalog.endpointSecurityAttackSurfaceReduction'
    ],
    keywords: [
      'asr', 'attack surface', 'reduction', 'exploit protection',
      'controlled folder', 'ransomware protection', 'network protection',
      'web protection', 'exploit guard', 'application guard',
      'process creation', 'office macros', 'script obfuscation',
      'untrusted usb', 'email threats', 'audit mode', 'block mode'
    ],
    strongKeywords: ['asr', 'attackSurface', 'exploitGuard', 'controlledFolder'],
    platform: ['Windows']
  },

  // ===== DISK ENCRYPTION =====
  {
    family: 'DiskEncryption',
    templates: [
      '#settingsCatalog.endpointSecurityDiskEncryption'
    ],
    keywords: [
      'bitlocker', 'disk encryption', 'volume encryption', 'drive encryption',
      'tpm', 'recovery key', 'startup pin', 'encryption method',
      'aes', 'xts', 'cipher strength', 'fixed drive', 'removable drive',
      'operating system drive', 'recovery password', 'key escrow',
      'preboot authentication', 'enhanced pin'
    ],
    strongKeywords: ['bitlocker', 'diskEncryption', 'volumeEncryption', 'tpm'],
    platform: ['Windows']
  },

  // ===== APP PROTECTION / MAM =====
  {
    family: 'AppProtection',
    templates: [
      '#microsoft.graph.iosManagedAppProtection',
      '#microsoft.graph.androidManagedAppProtection',
      '#microsoft.graph.windowsManagedAppProtection',
      '#microsoft.graph.mdmWindowsInformationProtectionPolicy'
    ],
    keywords: [
      'app protection', 'mam', 'managed app', 'mobile application',
      'data transfer', 'copy', 'paste', 'cut', 'clipboard', 'share',
      'open-in', 'save as', 'print', 'backup', 'cloud backup',
      'app data', 'corporate data', 'organizational data', 'work data',
      'allowed apps', 'blocked apps', 'exempt apps', 'protected apps',
      'pin', 'app pin', 'biometric', 'face id', 'touch id',
      'offline', 'grace period', 'wipe', 'selective wipe', 'app wipe',
      'screen capture', 'screenshot', 'notification', 'keyboard',
      'encryption', 'app encryption', 'managed browser', 'edge'
    ],
    strongKeywords: ['appProtection', 'managedApp', 'dataTransfer', 'mam'],
    exclusionKeywords: ['device compliance', 'device configuration']
  },

  // ===== DEVICE CONFIGURATION =====
  {
    family: 'Configuration',
    templates: [
      '#microsoft.graph.windows10CustomConfiguration',
      '#microsoft.graph.windows10EndpointProtectionConfiguration',
      '#microsoft.graph.windows10GeneralConfiguration',
      '#microsoft.graph.iosGeneralDeviceConfiguration',
      '#microsoft.graph.androidGeneralDeviceConfiguration',
      '#settingsCatalog.customProfile' // Also matches custom profiles
    ],
    keywords: [
      'configuration', 'device setting', 'general configuration',
      'endpoint protection', 'custom configuration', 'oma-uri', 'csp',
      'wifi', 'vpn', 'certificate', 'email', 'browser', 'edge',
      'kiosk', 'assigned access', 'start menu', 'taskbar', 'cortana',
      'telemetry', 'diagnostic data', 'privacy', 'camera', 'microphone',
      'bluetooth', 'nfc', 'usb', 'removable storage', 'cd/dvd',
      'autoplay', 'elevated install', 'sam enumeration',
      'rdp', 'remote desktop', 'uac', 'user account control',
      'lock screen', 'logon', 'interactive logon', 'message title',
      'powershell', 'transcription', 'script block', 'audit',
      'asset tag', 'footnote', 'tls', 'ports', 'services',
      'device cleanup', 'inventory', 'teams', 'channel'
    ],
    strongKeywords: ['configuration', 'endpointProtection', 'customConfiguration', 'omaUri', 'uac', 'rdp'],
    platform: ['Windows', 'Android', 'iOS', 'macOS']
  },

  // ===== CONDITIONAL ACCESS =====
  {
    family: 'ConditionalAccess',
    templates: [
      '#microsoft.graph.conditionalAccessPolicy'
    ],
    keywords: [
      'conditional access', 'ca policy', 'sign-in policy',
      'mfa', 'multi-factor', 'trusted location',
      'named location', 'ip range', 'device state',
      'compliant device', 'hybrid joined', 'domain joined',
      'cloud app', 'risk level', 'user risk', 'sign-in risk',
      'session control', 'persistent browser', 'app enforced restrictions',
      'block access', 'grant access', 'terms of use',
      'continuous access evaluation', 'cae'
    ],
    strongKeywords: ['conditional access', 'conditionalAccess', 'grantControls', 'sessionControls', 'mfa'],
    exclusionKeywords: ['access review', 'privileged access', 'just-in-time'],
    platform: ['All']
  },

  // ===== MICROSOFT PURVIEW / DLP / AUDIT =====
  {
    family: 'Purview',
    templates: [
      '#microsoft.graph.dataLossPreventionPolicy',
      '#microsoft.graph.sensitivityLabel',
      '#microsoft.graph.retentionPolicy'
    ],
    keywords: [
      'data loss prevention', 'dlp', 'sensitive information', 'content contains',
      'credit card', 'ssn', 'social security', 'passport', 'driver license',
      'bank account', 'routing number', 'personal information', 'pii',
      'sensitivity label', 'classification', 'label', 'marking', 'header', 'footer',
      'retention', 'retention policy', 'hold', 'delete', 'archive',
      'lifecycle', 'disposition', 'records management', 'compliance tag',
      'sharing', 'external sharing', 'anyone link', 'guest access',
      'audit log', 'unified audit', 'audit logging', 'ediscovery',
      'content search', 'purview', 'compliance manager', 'mail flow rule'
    ],
    strongKeywords: ['dataLossPrevention', 'sensitivityLabel', 'retentionPolicy', 'unified audit', 'purview'],
    platform: ['All']
  },

  // ===== SECURITY TRAINING & AWARENESS =====
  {
    family: 'SecurityTraining',
    templates: [
      '#microsoft.graph.attackSimulationTraining'
    ],
    keywords: [
      'training', 'awareness', 'simulation', 'phishing', 'campaign',
      'security awareness', 'attack simulation', 'training module',
      'training campaign', 'user training', 'role-based training',
      'new user', 'onboarding training', 'periodic training'
    ],
    strongKeywords: ['security awareness', 'attack simulation', 'training campaign'],
    platform: ['All']
  },

  // ===== AZURE AD / IDENTITY =====
  {
    family: 'AzureAD',
    templates: [
      '#microsoft.graph.authorizationPolicy',
      '#microsoft.graph.identitySecurityDefaultsEnforcementPolicy'
    ],
    keywords: [
      'azure ad', 'entra', 'directory', 'tenant', 'organization',
      'security defaults', 'mfa', 'legacy authentication', 'basic auth',
      'guest user', 'external user', 'b2b', 'collaboration',
      'self-service', 'password reset', 'group creation', 'app registration',
      'consent', 'permissions', 'admin consent', 'user consent'
    ],
    strongKeywords: ['azureAD', 'entra', 'securityDefaults'],
    platform: ['All']
  }
];

/**
 * Calculate keyword match score for a setting
 */
export function calculateKeywordScore(
  settingName: string,
  settingDescription: string | null,
  category: CategoryDefinition
): KeywordMatch {
  const searchText = `${settingName} ${settingDescription || ''}`.toLowerCase();

  let score = 0;
  const matchedKeywords: string[] = [];

  // Check exclusion keywords first
  if (category.exclusionKeywords) {
    for (const keyword of category.exclusionKeywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return {
          score: -100, // Negative score excludes from category
          matchedKeywords: [],
          confidence: 'none'
        };
      }
    }
  }

  // Check strong keywords (worth 3 points each)
  if (category.strongKeywords) {
    for (const keyword of category.strongKeywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        score += 3;
        matchedKeywords.push(keyword);
      }
    }
  }

  // Check regular keywords (worth 1 point each)
  for (const keyword of category.keywords) {
    if (searchText.includes(keyword.toLowerCase())) {
      score += 1;
      matchedKeywords.push(keyword);
    }
  }

  // Calculate confidence based on score
  let confidence: 'high' | 'medium' | 'low' | 'none';
  if (score >= 5) {
    confidence = 'high';
  } else if (score >= 3) {
    confidence = 'medium';
  } else if (score >= 1) {
    confidence = 'low';
  } else {
    confidence = 'none';
  }

  return {
    score,
    matchedKeywords: [...new Set(matchedKeywords)], // Remove duplicates
    confidence
  };
}

/**
 * Find best matching category for a setting
 */
export function findBestCategory(
  settingName: string,
  settingDescription: string | null,
  settingPlatform: string
): {
  category: CategoryDefinition | null;
  match: KeywordMatch;
  alternatives: Array<{ category: CategoryDefinition; match: KeywordMatch }>;
} {
  let bestCategory: CategoryDefinition | null = null;
  let bestMatch: KeywordMatch = { score: 0, matchedKeywords: [], confidence: 'none' };
  const alternatives: Array<{ category: CategoryDefinition; match: KeywordMatch }> = [];

  for (const category of CATEGORY_DEFINITIONS) {
    // Skip if platform doesn't match
    if (category.platform &&
        !category.platform.includes('All') &&
        !category.platform.includes(settingPlatform)) {
      continue;
    }

    const match = calculateKeywordScore(settingName, settingDescription, category);

    // Track alternatives (any category with score > 0)
    if (match.score > 0) {
      alternatives.push({ category, match });
    }

    // Update best match
    if (match.score > bestMatch.score) {
      bestMatch = match;
      bestCategory = category;
    }
  }

  // Sort alternatives by score
  alternatives.sort((a, b) => b.match.score - a.match.score);

  return {
    category: bestCategory,
    match: bestMatch,
    alternatives: alternatives.slice(1) // Exclude best match from alternatives
  };
}

/**
 * Normalize display name for better matching
 */
export function normalizeDisplayName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // Replace special chars with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

/**
 * Extract platform from setting name or description
 */
export function extractPlatform(
  settingName: string,
  settingDescription: string | null,
  existingPlatform: string
): string {
  if (existingPlatform && existingPlatform !== 'All') {
    return existingPlatform;
  }

  const text = `${settingName} ${settingDescription || ''}`.toLowerCase();

  if (text.includes('windows') || text.includes('win10') || text.includes('win11')) {
    return 'Windows';
  }
  if (text.includes('android')) {
    return 'Android';
  }
  if (text.includes('ios') || text.includes('iphone') || text.includes('ipad')) {
    return 'iOS';
  }
  if (text.includes('macos') || text.includes('mac os')) {
    return 'macOS';
  }

  return 'All';
}
