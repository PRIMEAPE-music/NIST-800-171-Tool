# Missing Policies Configuration Report

Generated: 2025-11-20T06:05:59.313Z

## Summary

- **Missing policy types**: 15
- **Settings affected**: 300
- **Controls affected**: 65

## Priority Order (by control impact)

### 1. dataLossPreventionPolicy

- **Settings**: 85
- **Controls affected**: 28

**Configuration Guide:**

**Microsoft Purview DLP Policies**
1. Go to Microsoft Purview Compliance Center
2. Navigate to Data Loss Prevention > Policies
3. Create policies to protect sensitive information (CUI, PII, etc.)
4. Configure locations: Exchange, SharePoint, OneDrive, Teams
5. Set up alert notifications and incident reports

Required permissions: Information Protection Admin

<details>
<summary>Settings list</summary>

- Lifecycle Workflow - Disable User Account Task
- DLP Policy State
- DLP Policy Locations
- DLP Sensitive Information Detection
- DLP Sensitivity Label Detection
- DLP Policy Mode (Enforcement vs Test)
- Sensitivity Label Default Sharing Link Type
- Default Sharing Link Type
- Default Link Permission Level
- Mail Flow Rule Sender Scope Condition
- ... and 75 more

</details>

### 2. privilegedIdentityManagement

- **Settings**: 95
- **Controls affected**: 17

**Configuration Guide:**

**Privileged Identity Management (PIM)**
1. Go to Microsoft Entra admin center
2. Navigate to Identity Governance > Privileged Identity Management
3. Configure Azure AD roles for just-in-time access
4. Set up activation requirements (MFA, justification, approval)
5. Configure role settings and alerts

Required permissions: Privileged Role Administrator

<details>
<summary>Settings list</summary>

- Access Reviews - Inactive User Duration
- Azure AD Role Assignment - Role Definition
- Azure AD Role Assignment - Principal ID
- Azure AD Role Assignment - Directory Scope
- Azure AD Role Assignment - Assignment Type
- Administrative Unit - Member Assignments
- Administrative Unit - Scoped Role Assignments
- Azure AD Application - App Role Assignments
- Privileged Identity Management - Just-in-Time Access
- Security Reader Role Assignment (Audit Functions)
- ... and 85 more

</details>

### 3. windows10CustomConfiguration

- **Settings**: 57
- **Controls affected**: 17

**Configuration Guide:**

**Windows Custom Configuration (OMA-URI)**
1. Go to Microsoft Intune admin center
2. Navigate to Devices > Configuration profiles
3. Create profile: Windows 10 and later > Templates > Custom
4. Add OMA-URI settings for advanced Windows configurations
5. Assign to device groups

Note: Many settings may already exist in Security Baselines

<details>
<summary>Settings list</summary>

- DLP Restricted Cloud Service Domains
- Windows Audit: Audit Sensitive Privilege Use
- Windows Interactive Logon - Message Title
- Company Portal Privacy Message (iOS/iPadOS)
- Lock Screen Image URL (Windows Enterprise)
- VPN Server Configuration
- VPN Connection Type
- Block Removable Storage Devices
- KQL Queries for Audit Record Analysis
- Windows Time Service (W32Time) NTP Configuration
- ... and 47 more

</details>

### 4. windowsDefenderAdvancedThreatProtectionConfiguration

- **Settings**: 27
- **Controls affected**: 14

**Configuration Guide:**

**Windows Defender ATP Configuration**
1. Go to Microsoft Intune admin center
2. Navigate to Endpoint security > Endpoint detection and response
3. Create EDR policy with Defender for Endpoint settings
4. Configure sample submission, telemetry, etc.
5. Assign to device groups

Alternative: Use Security Baselines which include many Defender settings

<details>
<summary>Settings list</summary>

- Defender Device Control for Removable Media
- Microsoft Defender Alerts - Post-Change Security Monitoring
- Windows Defender Application Control (WDAC) - Allow by Exception Policy
- Microsoft Defender for Endpoint Threat Level Requirements
- Microsoft Defender Real-Time Protection
- Microsoft Defender Device Control Policy
- Defender Updates - Platform and Engine Update Channels
- Microsoft Defender Antivirus - Daily Quick Scan
- Microsoft 365 Defender - Alert Policies and Notifications
- Defender XDR - Automated Investigation and Response
- ... and 17 more

</details>

### 5. securityCenterConfiguration

- **Settings**: 4
- **Controls affected**: 4

**Configuration Guide:**

**Security Center Configuration**
1. Go to Microsoft 365 Defender portal
2. Navigate to Settings > Endpoints
3. Configure vulnerability management settings
4. Set up security recommendations monitoring
5. Enable Microsoft Threat Intelligence

Note: Some settings may be at tenant level

<details>
<summary>Settings list</summary>

- Microsoft Threat Intelligence Integration
- Microsoft Secure Score Monitoring Enabled
- Microsoft Defender Vulnerability Management Scanning
- Block Scripted Security Prompts

</details>

### 6. deviceManagement

- **Settings**: 3
- **Controls affected**: 3

**Configuration Guide:**

**Configuration Required**
This policy type needs to be configured in your Microsoft 365 tenant.
Consult Microsoft documentation for: deviceManagement

<details>
<summary>Settings list</summary>

- Configuration Profile Version Control
- Automated Inventory Update on Component Changes
- Automatic Device Cleanup Rules

</details>

### 7. windows10EndpointProtectionConfiguration

- **Settings**: 3
- **Controls affected**: 3

**Configuration Guide:**

**Configuration Required**
This policy type needs to be configured in your Microsoft 365 tenant.
Consult Microsoft documentation for: windows10EndpointProtectionConfiguration

<details>
<summary>Settings list</summary>

- AppLocker - Executable and DLL Rules
- Block Removable Storage Devices
- Prevent Installation of Removable Devices

</details>

### 8. attackSimulationTraining

- **Settings**: 12
- **Controls affected**: 3

**Configuration Guide:**

**Attack Simulation Training**
1. Go to Microsoft 365 Defender portal
2. Navigate to Email & collaboration > Attack simulation training
3. Create simulation campaigns (phishing, credential harvest)
4. Set up automated training for users who fail simulations
5. Configure reporting and tracking

Required permissions: Attack Simulation Admin

<details>
<summary>Settings list</summary>

- Phishing Simulation Campaigns
- Configure Periodic Training Campaigns
- Assign Role-Based Training Modules
- User Submission of Suspicious Messages
- Attack Simulation Training Platform
- Automated Simulation Campaigns
- Attack Simulation Insights and Reports
- Security Awareness Training Campaigns
- Enable Attack Simulation Training
- Enable Simulation Automation
- ... and 2 more

</details>

### 9. iosCompliancePolicy

- **Settings**: 4
- **Controls affected**: 3

**Configuration Guide:**

**iOS Device Compliance Policy**
1. Go to Microsoft Intune admin center
2. Navigate to Devices > Compliance policies
3. Create policy for iOS/iPadOS
4. Configure compliance requirements
5. Set up non-compliance actions

<details>
<summary>Settings list</summary>

- Intune Device Compliance Policy - iOS/iPadOS
- Maximum Minutes of Inactivity Until Screen Locks (iOS)
- Maximum Grace Period for Password After Screen Lock (iOS)
- Intune - Minimum Password Length (iOS)

</details>

### 10. androidCompliancePolicy

- **Settings**: 3
- **Controls affected**: 2

**Configuration Guide:**

**Android Device Compliance Policy**
1. Go to Microsoft Intune admin center
2. Navigate to Devices > Compliance policies
3. Create policy for Android
4. Configure compliance requirements
5. Set up non-compliance actions

<details>
<summary>Settings list</summary>

- Intune Device Compliance Policy - Android
- Maximum Minutes of Inactivity Until Screen Locks (Android)
- Intune - Minimum Password Length (Android)

</details>

### 11. exchangeOnlineConfiguration

- **Settings**: 1
- **Controls affected**: 1

**Configuration Guide:**

**Exchange Online Configuration**
1. Go to Exchange admin center
2. Configure organization settings
3. Set up mail flow rules for TLS enforcement
4. Configure anti-spam and anti-malware policies
5. Enable audit logging

Note: Requires Exchange Administrator role

<details>
<summary>Settings list</summary>

- Exchange Online - Minimum TLS Version 1.2

</details>

### 12. azureSubscriptionPolicy

- **Settings**: 1
- **Controls affected**: 1

**Configuration Guide:**

**Configuration Required**
This policy type needs to be configured in your Microsoft 365 tenant.
Consult Microsoft documentation for: azureSubscriptionPolicy

<details>
<summary>Settings list</summary>

- Maximum Subscription Owners Limit

</details>

### 13. endpointSecurityFirewall

- **Settings**: 1
- **Controls affected**: 1

**Configuration Guide:**

**Configuration Required**
This policy type needs to be configured in your Microsoft 365 tenant.
Consult Microsoft documentation for: #settingsCatalog.endpointSecurityFirewall

<details>
<summary>Settings list</summary>

- Enable Domain Network Firewall

</details>

### 14. androidGeneralDeviceConfiguration

- **Settings**: 3
- **Controls affected**: 0

**Configuration Guide:**

**Configuration Required**
This policy type needs to be configured in your Microsoft 365 tenant.
Consult Microsoft documentation for: androidGeneralDeviceConfiguration

<details>
<summary>Settings list</summary>

- Android Lock Screen Message
- Android Short Support Message
- Lock Screen Message (Android Enterprise)

</details>

### 15. teamsConfiguration

- **Settings**: 1
- **Controls affected**: 0

**Configuration Guide:**

**Microsoft Teams Configuration**
1. Go to Microsoft Teams admin center
2. Navigate to Messaging policies / Meeting policies
3. Configure guest access restrictions
4. Set up external access controls
5. Configure compliance and security settings

Note: Teams policies sync with M365 tenant settings

<details>
<summary>Settings list</summary>

- Block Teams Communication with Personal Accounts

</details>

---

*This report identifies policy types that need to be configured in your Microsoft 365 tenant for full NIST 800-171 compliance coverage.*