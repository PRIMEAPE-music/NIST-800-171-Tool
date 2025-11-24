-- Phase 1: High-Confidence Reverse Mapping Updates
-- Generated from generate-reverse-mappings.ts
-- Applying 31 high-confidence (>70%) mapping suggestions

BEGIN TRANSACTION;

UPDATE M365Setting SET settingName = 'passwordMinimumLength' WHERE id = 340; -- Intune - Minimum Password Length (iOS)
UPDATE M365Setting SET settingName = 'passwordMinimumLength' WHERE id = 637; -- Intune - Minimum Password Length (Windows)
UPDATE M365Setting SET settingName = 'disableAppEncryptionIfDeviceEncryptionIsEnabled' WHERE id = 548; -- Enable Office Message Encryption (OME)
UPDATE M365Setting SET settingName = 'allowedToSignUpEmailBasedSubscriptions' WHERE id = 334; -- Allow Email-Based Subscriptions
UPDATE M365Setting SET settingName = 'conditions.userRiskLevels' WHERE id = 82; -- User Risk Policy - Require Password Change on High Risk
UPDATE M365Setting SET settingName = 'qualityUpdatesDeferralPeriodInDays' WHERE id = 298; -- Windows Update for Business - Automatic Quality Updates
UPDATE M365Setting SET settingName = 'conditions.signInRiskLevels' WHERE id = 81; -- Sign-In Risk Policy - Require MFA on Medium/High Risk
UPDATE M365Setting SET settingName = 'osMinimumVersion' WHERE id = 293; -- Minimum TLS Version 1.2
UPDATE M365Setting SET settingName = 'passwordPreviousPasswordBlockCount' WHERE id = 331; -- Intune - Password History Count (Windows)
UPDATE M365Setting SET settingName = 'passwordBlockSimple' WHERE id = 16; -- Intune - Block Simple Passwords (iOS)
UPDATE M365Setting SET settingName = 'userWindowsUpdateScanAccess' WHERE id = 566; -- Windows Update Automatic Updates Enabled
UPDATE M365Setting SET settingName = 'minimumRequiredPatchVersion' WHERE id = 294; -- Microsoft Edge Minimum SSL Version
UPDATE M365Setting SET settingName = 'minimumRequiredPatchVersion' WHERE id = 127; -- Enforce Minimum OS Version for Mobile Devices
UPDATE M365Setting SET settingName = 'blockMsolPowerShell' WHERE id = 336; -- Block MSOL PowerShell
UPDATE M365Setting SET settingName = 'passwordMinimumLength' WHERE id = 427; -- Windows Hello - Minimum PIN Length
UPDATE M365Setting SET settingName = 'userWindowsUpdateScanAccess' WHERE id = 602; -- Windows Autopatch - Automated Update Management
UPDATE M365Setting SET settingName = 'userWindowsUpdateScanAccess' WHERE id = 317; -- Configure Automatic Windows Updates
UPDATE M365Setting SET settingName = 'deviceComplianceRequired' WHERE id = 125; -- Require Compliant Device for Wi-Fi Network Access
UPDATE M365Setting SET settingName = 'defaultUserRolePermissions.permissionGrantPoliciesAssigned' WHERE id = 320; -- Create OAuth App Permission Policies
UPDATE M365Setting SET settingName = 'fingerprintBlocked' WHERE id = 645; -- Intune MAM - Block Print of Org Data
UPDATE M365Setting SET settingName = 'featureUpdatesPauseExpiryDateTime' WHERE id = 184; -- Windows Update Pause - Emergency Change Control
UPDATE M365Setting SET settingName = 'userWindowsUpdateScanAccess' WHERE id = 663; -- Windows Update Reports - Impact Analysis Dashboard
UPDATE M365Setting SET settingName = 'periodOfflineBeforeWipeIsEnforced' WHERE id = 350; -- Intune App Protection - Offline Grace Period
UPDATE M365Setting SET settingName = 'passwordExpirationDays' WHERE id = 329; -- Intune - Password Complexity (Windows)
UPDATE M365Setting SET settingName = 'appDataEncryptionType' WHERE id = 362; -- Mail Flow Rule Encryption Action
UPDATE M365Setting SET settingName = 'passwordMinutesOfInactivityBeforeLock' WHERE id = 428; -- Maximum Minutes of Inactivity Until Screen Locks (iOS)
UPDATE M365Setting SET settingName = 'passwordMinutesOfInactivityBeforeLock' WHERE id = 430; -- Maximum Minutes of Inactivity Until Screen Locks (Android)
UPDATE M365Setting SET settingName = 'passwordPreviousPasswordBlockCount' WHERE id = 148; -- Windows LAPS (Local Administrator Password Solution)
UPDATE M365Setting SET settingName = 'appDataEncryptionType' WHERE id = 511; -- TLS Encryption for Password Transmission
UPDATE M365Setting SET settingName = 'passwordMinimumCharacterSetCount' WHERE id = 178; -- Windows Hello for Business Password Complexity
UPDATE M365Setting SET settingName = 'userWindowsUpdateScanAccess' WHERE id = 144; -- Windows Autopilot Standard User Provisioning

COMMIT;
