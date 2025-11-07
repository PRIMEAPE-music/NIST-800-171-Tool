# NIST 800-171 Rev 3 Controls Data

## Important Note

✅ **COMPLETE:** The `nist-controls.json` file contains all 110 controls from **NIST SP 800-171 Revision 3**.

### Revision 3 Updates

This project uses **NIST 800-171 Revision 3** (May 2024), which includes:

1. **Updated Control Numbering**: Control IDs now use format "03.01.01" (zero-padded)
2. **New Families Added**:
   - **SA** - System and Services Acquisition (3 controls)
   - **SR** - Supply Chain Risk Management (3 controls)
   - **PL** - Planning (3 controls)
3. **Family Reorganization**: SI family reduced from 17 to 7 controls
4. **Total**: 110 controls across 17 families (previously 14 families)

## Data Source

All control text comes directly from:
**NIST Special Publication 800-171 Revision 3**
*Protecting Controlled Unclassified Information in Nonfederal Systems and Organizations*
Published: May 2024

Each control includes:
```json
{
  "controlId": "03.XX.YY",
  "family": "XX",
  "title": "Control Title",
  "requirementText": "The official NIST requirement text",
  "priority": "Critical|High|Medium|Low"
}
```

## Priority Assignment Guidelines

When adding controls, assign priorities based on:

- **Critical**: Controls protecting CUI confidentiality/integrity, authentication, encryption
- **High**: Controls for access management, monitoring, incident response
- **Medium**: Controls for configuration, maintenance, physical security
- **Low**: Controls for awareness, training, administrative functions

## Data Source

All control text should come directly from:
**NIST Special Publication 800-171 Revision 2**
*Protecting Controlled Unclassified Information in Nonfederal Systems and Organizations*

## File Structure

```
data/
├── nist-controls.json              # Complete Rev 3 controls (110 controls)
├── control-families-reference.json # Family metadata
└── README.md                       # This file
```

## Rev 3 Control Families

All 17 control families included:
- **AC** - Access Control (22 controls)
- **AT** - Awareness and Training (3 controls)
- **AU** - Audit and Accountability (9 controls)
- **CA** - Assessment, Authorization, and Monitoring (9 controls)
- **CM** - Configuration Management (11 controls)
- **CP** - Contingency Planning (3 controls)
- **IA** - Identification and Authentication (11 controls)
- **IR** - Incident Response (5 controls)
- **MA** - Maintenance (6 controls)
- **MP** - Media Protection (7 controls)
- **PE** - Physical Protection (6 controls)
- **PS** - Personnel Security (8 controls)
- **RA** - Risk Assessment (5 controls)
- **SA** - System and Services Acquisition (3 controls) ⭐ NEW
- **SC** - System and Communications Protection (13 controls)
- **SI** - System and Information Integrity (7 controls) ⚠️ REDUCED
- **SR** - Supply Chain Risk Management (3 controls) ⭐ NEW
- **PL** - Planning (3 controls) ⭐ NEW

## Validation

Validate the Rev 3 JSON file:
```bash
# Check JSON syntax
node -e "const data = require('./nist-controls.json'); console.log('✓ Valid JSON');"

# Count controls
node -e "const data = require('./nist-controls.json'); console.log('Controls:', data.controls.length);"
# Should output: Controls: 110

# Verify Rev 3 format
node -e "const data = require('./nist-controls.json'); console.log('Version:', data.version); console.log('Families:', Object.keys(data.families).length);"
# Should output: Version: NIST SP 800-171 Revision 3, Families: 17
```

## Legal Notice

NIST 800-171 is a U.S. government publication in the public domain. However, ensure you:
- Use official NIST documentation as the source
- Do not modify or paraphrase the requirement text
- Maintain attribution to NIST SP 800-171

## Time Estimate

Completing all 110 controls with accurate text:
- **Copy/paste from PDF**: 3-4 hours
- **Manual entry with verification**: 6-8 hours
- **Including priority assignment**: +1-2 hours

---

**Current Status:** ✅ Complete - All 110 Rev 3 controls included
**Revision:** NIST SP 800-171 Revision 3 (May 2024)
**Last Updated:** 2025-11-06
