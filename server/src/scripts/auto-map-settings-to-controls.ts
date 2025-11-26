/**
 * Auto-Map Settings to Controls
 *
 * Intelligently creates mappings between M365 settings and NIST 800-171 controls
 * based on keywords, patterns, and context analysis.
 *
 * This dramatically reduces manual mapping work by automatically identifying
 * which settings implement which controls.
 *
 * Run with: npx tsx server/src/scripts/auto-map-settings-to-controls.ts [--dry-run] [--confidence=high|medium|low]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MappingRule {
  controlId: string;
  controlFamily: string;
  keywords: string[];
  excludeKeywords?: string[];
  settingNamePatterns?: RegExp[];
  confidence: 'high' | 'medium' | 'low';
  notes: string;
}

// Comprehensive mapping rules for NIST 800-171
const MAPPING_RULES: MappingRule[] = [
  // SC-8: Transmission and Storage Confidentiality (includes encryption at rest)
  {
    controlId: '03.13.08',
    controlFamily: 'SC',
    keywords: ['encrypt', 'bitlocker', 'encryption at rest', 'disk encryption', 'device encryption', 'storage encryption'],
    excludeKeywords: [],
    settingNamePatterns: [/bitlocker/i, /encrypt.*device/i, /encrypt.*disk/i, /encrypt.*drive/i],
    confidence: 'high',
    notes: 'Protects CUI at rest and in transit through encryption',
  },

  // SC-12: Cryptographic Key Establishment and Management
  {
    controlId: '03.13.10',
    controlFamily: 'SC',
    keywords: ['recovery key', 'recovery password', 'key backup', 'key rotation', 'key escrow', 'tpm', 'trusted platform module'],
    settingNamePatterns: [/recovery.*key/i, /key.*backup/i, /key.*rotation/i, /tpm/i],
    confidence: 'high',
    notes: 'Manages cryptographic keys and recovery mechanisms',
  },

  // SC-13: Cryptographic Protection
  {
    controlId: '03.13.11',
    controlFamily: 'SC',
    keywords: ['encryption method', 'encryption algorithm', 'cipher', 'aes', 'xts-aes', 'cryptographic'],
    settingNamePatterns: [/encryption.*method/i, /encryption.*type/i, /cipher/i],
    confidence: 'high',
    notes: 'Implements FIPS-validated cryptography',
  },

  // SC-7: Boundary Protection (Firewall)
  {
    controlId: '03.13.01',
    controlFamily: 'SC',
    keywords: ['firewall', 'boundary protection', 'network protection', 'domain firewall', 'private firewall', 'public firewall'],
    settingNamePatterns: [/firewall/i, /network.*protection/i],
    confidence: 'high',
    notes: 'Controls and monitors communications at system boundaries',
  },

  // Note: 03.13.08 is already used above for storage encryption, so TLS/SSL settings
  // will also map to the same control (which covers both transmission and storage)

  // SI-2: Flaw Remediation (Updates)
  {
    controlId: '03.14.01',
    controlFamily: 'SI',
    keywords: ['update', 'patch', 'windows update', 'automatic update', 'quality update', 'feature update'],
    settingNamePatterns: [/update/i, /patch/i],
    confidence: 'high',
    notes: 'Identifies and remediates system flaws',
  },

  // SI-3: Malicious Code Protection (Antivirus)
  {
    controlId: '03.14.02',
    controlFamily: 'SI',
    keywords: ['antivirus', 'defender', 'malware', 'real-time protection', 'virus protection', 'threat protection'],
    settingNamePatterns: [/defender/i, /antivirus/i, /malware/i],
    confidence: 'high',
    notes: 'Detects and eradicates malicious code',
  },

  // SI-4: System Monitoring (Attack Surface Reduction)
  {
    controlId: '03.14.06',
    controlFamily: 'SI',
    keywords: ['attack surface reduction', 'asr', 'exploit protection', 'behavior monitoring'],
    settingNamePatterns: [/attack.*surface/i, /asr/i, /exploit.*protect/i],
    confidence: 'high',
    notes: 'Monitors system to detect attacks and indicators',
  },

  // AC-2: Account Management
  {
    controlId: '03.01.01',
    controlFamily: 'AC',
    keywords: ['account', 'user management', 'account lockout', 'account policy'],
    confidence: 'medium',
    notes: 'Manages user accounts',
  },

  // AC-3: Access Enforcement
  {
    controlId: '03.01.03',
    controlFamily: 'AC',
    keywords: ['access control', 'permission', 'authorization', 'role-based', 'rbac'],
    confidence: 'medium',
    notes: 'Enforces approved authorizations',
  },

  // AC-7: Unsuccessful Logon Attempts
  {
    controlId: '03.01.08',
    controlFamily: 'AC',
    keywords: ['lockout', 'failed login', 'unsuccessful logon', 'account lockout threshold'],
    settingNamePatterns: [/lockout/i, /failed.*login/i],
    confidence: 'high',
    notes: 'Enforces limit on consecutive invalid access attempts',
  },

  // IA-2: Identification and Authentication
  {
    controlId: '03.05.01',
    controlFamily: 'IA',
    keywords: ['authentication', 'mfa', 'multi-factor', '2fa', 'password', 'pin', 'biometric'],
    confidence: 'medium',
    notes: 'Uniquely identifies and authenticates users',
  },

  // IA-5: Authenticator Management
  {
    controlId: '03.05.07',
    controlFamily: 'IA',
    keywords: ['password policy', 'password length', 'password complexity', 'password expiration', 'pin length'],
    settingNamePatterns: [/password/i, /pin.*length/i],
    confidence: 'high',
    notes: 'Manages information system authenticators',
  },

  // MP-5: Media Destruction (Removable Media)
  {
    controlId: '03.08.03',
    controlFamily: 'MP',
    keywords: ['removable', 'usb', 'external drive', 'removable drive encryption'],
    settingNamePatterns: [/removable/i, /external.*drive/i],
    confidence: 'medium',
    notes: 'Protects and controls removable media',
  },

  // AU-2: Auditable Events
  {
    controlId: '03.03.01',
    controlFamily: 'AU',
    keywords: ['audit', 'logging', 'event log', 'audit policy'],
    confidence: 'medium',
    notes: 'Defines auditable events',
  },

  // AU-12: Audit Generation
  {
    controlId: '03.03.06',
    controlFamily: 'AU',
    keywords: ['audit generation', 'log generation', 'event generation'],
    confidence: 'medium',
    notes: 'Generates audit records',
  },
];

interface ProposedMapping {
  settingId: number;
  settingName: string;
  controlId: string;
  controlFamily: string;
  confidence: 'high' | 'medium' | 'low';
  matchReason: string;
  notes: string;
  matchScore: number;
}

async function autoMapSettingsToControls(
  dryRun: boolean = true,
  minConfidence: 'high' | 'medium' | 'low' = 'medium'
) {
  console.log('\n' + '='.repeat(80));
  console.log('AUTO-MAP SETTINGS TO CONTROLS');
  console.log('='.repeat(80));
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE MODE'}`);
  console.log(`Minimum Confidence: ${minConfidence}`);
  console.log('='.repeat(80) + '\n');

  // Step 1: Load active settings that need mapping
  console.log('Step 1: Loading settings...');
  const settings = await prisma.m365Setting.findMany({
    where: {
      isActive: true,
    },
    include: {
      controlMappings: {
        include: {
          control: true,
        },
      },
    },
    orderBy: { displayName: 'asc' },
  });

  console.log(`Found ${settings.length} active settings\n`);

  // Step 2: Load all controls
  console.log('Step 2: Loading controls...');
  const controls = await prisma.control.findMany({
    where: {
      revision: '3', // NIST 800-171 Rev 3
    },
  });

  console.log(`Found ${controls.length} controls\n`);

  // Create control lookup map
  const controlMap = new Map(controls.map((c) => [c.controlId, c]));

  // Step 3: Analyze settings and propose mappings
  console.log('Step 3: Analyzing settings and generating mappings...\n');
  const proposedMappings: ProposedMapping[] = [];

  for (const setting of settings) {
    // Skip if already mapped (unless we want to suggest additional mappings)
    const existingMappings = setting.controlMappings.map((m) => m.control.controlId);

    // Analyze setting for potential mappings
    const settingText = `${setting.displayName} ${setting.description || ''} ${setting.settingName || ''} ${setting.settingPath}`.toLowerCase();

    for (const rule of MAPPING_RULES) {
      // Skip if already mapped to this control
      if (existingMappings.includes(rule.controlId)) {
        continue;
      }

      // Calculate match score
      let matchScore = 0;
      const matchReasons: string[] = [];

      // Check keywords
      const keywordMatches = rule.keywords.filter((kw) => settingText.includes(kw.toLowerCase()));
      if (keywordMatches.length > 0) {
        matchScore += keywordMatches.length * 10;
        matchReasons.push(`Keywords: ${keywordMatches.join(', ')}`);
      }

      // Check exclude keywords (negative match)
      if (rule.excludeKeywords) {
        const excludeMatches = rule.excludeKeywords.filter((kw) =>
          settingText.includes(kw.toLowerCase())
        );
        if (excludeMatches.length > 0) {
          matchScore -= excludeMatches.length * 20; // Heavy penalty for exclusions
          matchReasons.push(`Excluded: ${excludeMatches.join(', ')}`);
        }
      }

      // Check regex patterns
      if (rule.settingNamePatterns) {
        const patternMatches = rule.settingNamePatterns.filter((pattern) =>
          pattern.test(setting.displayName) || pattern.test(setting.settingName || '')
        );
        if (patternMatches.length > 0) {
          matchScore += patternMatches.length * 15;
          matchReasons.push('Pattern match');
        }
      }

      // If we have a positive score, this is a potential mapping
      if (matchScore > 0) {
        // Adjust confidence based on score
        let confidence = rule.confidence;
        if (matchScore >= 30) {
          confidence = 'high';
        } else if (matchScore >= 15) {
          confidence = 'medium';
        } else {
          confidence = 'low';
        }

        proposedMappings.push({
          settingId: setting.id,
          settingName: setting.displayName,
          controlId: rule.controlId,
          controlFamily: rule.controlFamily,
          confidence,
          matchReason: matchReasons.join('; '),
          notes: rule.notes,
          matchScore,
        });
      }
    }
  }

  // Step 4: Filter by minimum confidence
  const confidenceLevels = { high: 3, medium: 2, low: 1 };
  const minLevel = confidenceLevels[minConfidence];

  const filteredMappings = proposedMappings
    .filter((m) => confidenceLevels[m.confidence] >= minLevel)
    .sort((a, b) => b.matchScore - a.matchScore);

  console.log(`Generated ${proposedMappings.length} total proposed mappings`);
  console.log(`Filtered to ${filteredMappings.length} mappings at ${minConfidence}+ confidence\n`);

  // Step 5: Display summary
  const highConfidence = filteredMappings.filter((m) => m.confidence === 'high');
  const mediumConfidence = filteredMappings.filter((m) => m.confidence === 'medium');
  const lowConfidence = filteredMappings.filter((m) => m.confidence === 'low');

  console.log('='.repeat(80));
  console.log('PROPOSED MAPPINGS SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total: ${filteredMappings.length}`);
  console.log(`  - High confidence: ${highConfidence.length}`);
  console.log(`  - Medium confidence: ${mediumConfidence.length}`);
  console.log(`  - Low confidence: ${lowConfidence.length}`);
  console.log('='.repeat(80) + '\n');

  // Display samples
  if (highConfidence.length > 0) {
    console.log('HIGH CONFIDENCE MAPPINGS (showing first 20):');
    console.log('-'.repeat(80));
    displayMappings(highConfidence.slice(0, 20));
  }

  if (mediumConfidence.length > 0 && minConfidence !== 'high') {
    console.log('\nMEDIUM CONFIDENCE MAPPINGS (showing first 10):');
    console.log('-'.repeat(80));
    displayMappings(mediumConfidence.slice(0, 10));
  }

  // Step 6: Apply mappings if not dry run
  if (!dryRun) {
    console.log('\n' + '='.repeat(80));
    console.log('APPLYING MAPPINGS');
    console.log('='.repeat(80) + '\n');

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (const mapping of filteredMappings) {
      try {
        const control = controlMap.get(mapping.controlId);
        if (!control) {
          console.log(`⚠️  Control ${mapping.controlId} not found, skipping`);
          skippedCount++;
          continue;
        }

        // Create the mapping
        await prisma.controlSettingMapping.create({
          data: {
            controlId: control.id,
            settingId: mapping.settingId,
            confidence: mapping.confidence.charAt(0).toUpperCase() + mapping.confidence.slice(1), // 'High' | 'Medium' | 'Low'
            isRequired: true,
            complianceStatus: 'Not Configured',
            mappingRationale: `Auto-mapped: ${mapping.notes}\nMatch: ${mapping.matchReason}`,
            nistRequirement: mapping.notes,
          },
        });

        successCount++;
        if (successCount % 10 === 0) {
          process.stdout.write(`\rMapped: ${successCount}/${filteredMappings.length}`);
        }
      } catch (error: any) {
        // Check if it's a unique constraint error (mapping already exists)
        if (error.code === 'P2002') {
          skippedCount++;
        } else {
          console.error(`\n❌ Failed to map ${mapping.settingName}: ${error.message}`);
          failCount++;
        }
      }
    }

    console.log(`\n\nResults: ${successCount} successful, ${skippedCount} skipped (already exist), ${failCount} failed`);
    console.log('\n✅ Auto-mapping complete!\n');
  } else {
    console.log('\n' + '='.repeat(80));
    console.log('DRY RUN - No changes made');
    console.log('Run without --dry-run to apply mappings');
    console.log('Use --confidence=high to only apply high-confidence mappings');
    console.log('='.repeat(80) + '\n');
  }

  await prisma.$disconnect();
}

/**
 * Display mappings in a readable format
 */
function displayMappings(mappings: ProposedMapping[]) {
  for (let i = 0; i < mappings.length; i++) {
    const m = mappings[i];
    console.log(`\n${i + 1}. ${m.settingName}`);
    console.log(`   → Control: ${m.controlFamily}-${m.controlId}`);
    console.log(`   → Confidence: ${m.confidence.toUpperCase()} (score: ${m.matchScore})`);
    console.log(`   → Reason: ${m.matchReason}`);
    console.log(`   → Notes: ${m.notes}`);
  }
  console.log('');
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--apply');
const confidenceArg = args.find((arg) => arg.startsWith('--confidence='));
const minConfidence = confidenceArg
  ? (confidenceArg.split('=')[1] as 'high' | 'medium' | 'low')
  : 'medium';

// Validate confidence level
if (!['high', 'medium', 'low'].includes(minConfidence)) {
  console.error('Invalid confidence level. Use: high, medium, or low');
  process.exit(1);
}

// Run the auto-mapper
autoMapSettingsToControls(dryRun, minConfidence).catch((error) => {
  console.error('Auto-mapping failed:', error);
  process.exit(1);
});
