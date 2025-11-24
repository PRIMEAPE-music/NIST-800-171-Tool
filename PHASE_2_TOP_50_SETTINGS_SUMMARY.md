# Phase 2: Top 50 High-Value Settings - Research Guide

**Generated:** 2025-11-20
**Phase 1 Baseline:** 11.4% match rate, 52 settings matched, 18 controls
**Phase 2 Goal:** 30-40% match rate, +70-90 settings matched, +15-25 controls

---

## Executive Summary

The identification script analyzed **672 active settings** and scored them based on:
- Number of NIST controls mapped
- Priority of controls (Critical/High)
- Policy occurrences
- Current extraction failure rate

**Key Findings:**
- **50 settings identified** for manual research
- **24 Critical priority**, **26 High priority**
- **15 unique NIST controls** can be covered
- **1,000 policy-setting combinations** to improve
- **100% currently failing** (0% extraction rate)

---

## Priority Breakdown

### Critical Priority Settings (24)
These map to Critical NIST controls and should be researched first:

1. **Lock Screen Image URL** - Control 03.01.10
2. **Require WPA2-Enterprise Wi-Fi Security** - Control 03.01.16
3. **Require EAP-TLS Authentication** - Control 03.01.16
4. **Block Jailbroken/Rooted Devices** - Control 03.01.16
5. **Enforce Minimum OS Version** - Control 03.01.18
6. **Require Strong Passcode on Mobile** - Control 03.01.18
7. **Require App Protection Policies** - Control 03.01.18
8. **Block Personally Owned Devices** - Control 03.01.18
9. **BitLocker Removable Drive Encryption** - Control 03.13.08
10. **BitLocker Fixed Data Drive Encryption** - Control 03.13.11

...and 14 more critical settings.

### High Priority Settings (26)
These map to High priority NIST controls:

1. **Windows Update - Automatic Quality Updates** - Various update controls
2. **Password Policy Settings** - Authentication controls
3. **Device Compliance Requirements** - Access control
4. **Security Baselines** - Configuration management

---

## Research Strategy by Template

### 1. Windows Compliance Policies (18 settings)
**Template:** `#microsoft.graph.windows10CompliancePolicy`
**Graph Endpoint:** `GET /deviceManagement/deviceCompliancePolicies/{id}`

**Priority Settings:**
- Max Inactivity Before Lock
- Account Lockout Threshold/Duration
- Require Antivirus Software
- Security Intelligence Updates

**Research Tips:**
- Properties are typically flat (not nested)
- Use camelCase naming
- Boolean and integer values common
- Examples: `maxInactivityBeforeLock`, `accountLockoutThreshold`

### 2. Settings Catalog - Disk Encryption (5 settings)
**Template:** `#settingsCatalog.endpointSecurityDiskEncryption`
**Graph Endpoint:** `GET /beta/deviceManagement/configurationPolicies/{id}`

**Priority Settings:**
- BitLocker Removable Drive Encryption Method
- BitLocker Fixed Data Drive Encryption
- Recovery Key Storage
- Encryption Algorithm

**Research Tips:**
- Properties in `settings` array
- Match by `settingDefinitionId`
- Look for: `device_vendor_msft_bitlocker_*`
- Values nested in `settingInstance.choiceSettingValue.value`

### 3. iOS/Android App Protection (6 settings)
**Template:** `#microsoft.graph.iosManagedAppProtection`
**Graph Endpoint:** `GET /deviceAppManagement/iosManagedAppProtections/{id}`

**Priority Settings:**
- Enforce Minimum OS Version
- Require Strong Passcode
- App Protection Policies
- Device Wipe Settings

**Research Tips:**
- Properties under various sub-objects
- Examples: `minimumRequiredOsVersion`, `pinRequired`
- Check both root level and nested structures

### 4. Conditional Access (5 settings)
**Template:** `#microsoft.graph.conditionalAccessPolicy`
**Graph Endpoint:** `GET /identity/conditionalAccess/policies/{id}`

**Priority Settings:**
- EAP-TLS Authentication
- Device Compliance Required
- Baseline Compliance Monitoring

**Research Tips:**
- Properties under `conditions` and `grantControls`
- Complex nested structure
- Examples: `conditions.applications.includeApplications`

### 5. Azure AD Authorization (3 settings)
**Template:** `#microsoft.graph.authorizationPolicy`
**Graph Endpoint:** `GET /policies/authorizationPolicy`

**Priority Settings:**
- Wi-Fi Security Type
- Block Jailbroken Devices
- Guest User Restrictions

**Research Tips:**
- Single policy object (not array)
- Direct property access
- Examples: `allowInvitesFrom`, `blockMsolPowerShell`

---

## Quick Start Research Plan

### Week 1: Critical Settings (Days 1-3)
**Target:** 10 critical settings
**Focus:** BitLocker and device security settings

1. BitLocker Removable Drive Encryption (ID: 116)
2. BitLocker Fixed Data Drive Encryption (ID: 117)
3. Lock Screen Image URL (ID: 194)
4. Max Inactivity Before Lock (ID: 135)
5. Require WPA2-Enterprise Wi-Fi (ID: 134)
6. Block Jailbroken/Rooted Devices (ID: 137)
7. Enforce Minimum OS Version (ID: 127)
8. Require Strong Passcode (ID: 136)
9. Require App Protection Policies (ID: 370)
10. Block Personally Owned Devices (ID: 137)

### Week 2: High Priority Settings (Days 4-5)
**Target:** 20 high priority settings
**Focus:** Windows compliance and update policies

11-30. Windows compliance policies, update configurations, security baselines

### Week 3: Remaining Settings (Day 6)
**Target:** 20 remaining settings
**Focus:** Audit logging, monitoring, specialized configurations

31-50. Audit logging, monitoring, change control, specialized policies

---

## Research Workflow Template

### For Each Setting:

#### 1. Preparation
```
□ Note Setting ID and Display Name
□ Check Template Type
□ Note Sample Policy ID
□ Open Graph Explorer
□ Open Intune Portal
```

#### 2. Graph API Research
```
□ Query policy via Graph API
□ Copy JSON response to text editor
□ Search for related property names
□ Note exact property path
□ Record value type
```

#### 3. Verification
```
□ Test with multiple policies
□ Confirm value extraction works
□ Document any edge cases
□ Add to tracking spreadsheet
```

#### 4. Documentation
```
Setting ID: ___
Display Name: _______________
Property Name: _______________
Property Path: _______________
Value Type: string/boolean/integer/object
Sample Value: _______________
Verified: Yes/No
Notes: _______________
```

---

## Research Tools & Resources

### Microsoft Graph Explorer
**URL:** https://developer.microsoft.com/graph/graph-explorer
**Use:** Query policies directly and inspect JSON structure

**Common Queries:**
```
GET /deviceManagement/deviceCompliancePolicies
GET /deviceManagement/configurationPolicies
GET /identity/conditionalAccess/policies
GET /deviceAppManagement/iosManagedAppProtections
GET /policies/authorizationPolicy
```

### Intune Admin Portal
**URL:** https://endpoint.microsoft.com
**Use:** View policies and use DevTools to capture API calls

**Method:**
1. Open policy in portal
2. Press F12 (DevTools)
3. Go to Network tab
4. Edit and save policy
5. Find PATCH/PUT request
6. Inspect JSON payload

### Documentation
- **Microsoft Graph API Docs:** https://docs.microsoft.com/graph
- **Intune Settings Reference:** https://docs.microsoft.com/mem/intune
- **Conditional Access Reference:** https://docs.microsoft.com/azure/active-directory/conditional-access

---

## Expected Results After Phase 2

| Metric | Current (Phase 1) | Target (Phase 2) | Improvement |
|--------|-------------------|------------------|-------------|
| **Match Rate** | 11.4% | 30-40% | +18-28% |
| **Settings Matched** | 52/456 | 140-180/456 | +88-128 |
| **Unique Controls** | 18 | 30-35 | +12-17 |
| **Critical Controls** | ~5 | ~15 | +10 |
| **Policy Combinations** | 81 | 300-400 | +220-320 |

---

## Tips for Efficient Research

### Batch Processing
- Research all settings from the same template together
- Export one policy and analyze multiple properties at once
- Use Graph Explorer's "Run query" batch mode

### Common Patterns
| Display Name | Likely Property |
|--------------|----------------|
| "Require [X]" | `require[X]` or `[x]Required` |
| "Enable [X]" | `[x]Enabled` or `enable[X]` |
| "Block [X]" | `block[X]` or `[x]Blocked` |
| "Minimum [X]" | `minimum[X]` or `[x]Minimum` |
| "Maximum [X]" | `maximum[X]` or `[x]Maximum` |

### Time Savers
- Start with Windows compliance policies (simpler structure)
- Use browser DevTools for complex Settings Catalog policies
- Document patterns you discover for similar settings
- Take breaks - research is mentally intensive

---

## Tracking Your Progress

Use the CSV template from [high-value-settings.txt](server/high-value-settings.txt):

```csv
ID,Display Name,Template,Current Path,Research Status,Actual Property,Verified,Notes
116,BitLocker Removable Drive...,endpointSecurityDiskEncryption,...,IN_PROGRESS,encryptionMethod_v2,YES,"Found in settings[0].settingInstance"
```

**Status Codes:**
- `TODO` - Not started
- `IN_PROGRESS` - Currently researching
- `RESEARCHED` - Property found, pending verification
- `VERIFIED` - Tested and confirmed working
- `BLOCKED` - Cannot find property, needs help

---

## Next Steps

1. **Copy CSV template** from high-value-settings.txt to a spreadsheet
2. **Start with critical settings** (IDs 116, 117, 194, 135)
3. **Use Graph Explorer** to research first 5-10 settings
4. **Document findings** in tracking spreadsheet
5. **Apply first batch** using the apply-manual-mappings script
6. **Verify improvements** with rebuild and analysis scripts

Once you've researched 10-20 settings, we can apply them and measure the improvement before continuing with the rest.

---

## Support

If you encounter issues or have questions during research:
- Check the [Phase 2 Implementation Guide](INSTRUCTIONS/PHASE_2_MANUAL_HIGH_VALUE_TARGETING_GUIDE.md)
- Review Graph API documentation for the policy type
- Test with sample policies in your tenant
- Document any findings or patterns you discover

**Remember:** Even researching 20-30 of these 50 settings will give you significant improvement. Perfect is the enemy of good!
