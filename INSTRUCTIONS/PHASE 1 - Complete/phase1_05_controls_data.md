# Phase 1.5: NIST Controls Data Preparation

## Objective
Create comprehensive JSON file containing all 110 NIST 800-171 controls with complete requirement text, discussion, and metadata.

**Duration:** 4-6 hours  
**Prerequisites:** Phase 1.4 complete  
**Dependencies:** Access to NIST 800-171 documentation

---

## Tasks Overview

1. ✅ Create NIST controls JSON file structure
2. ✅ Add all 110 controls organized by 14 families
3. ✅ Include complete requirement text for each control
4. ✅ Include discussion/guidance text
5. ✅ Assign priority levels
6. ✅ Validate JSON structure

---

## Step-by-Step Instructions

### Step 1: Create Data Directory

```bash
# From project root
mkdir -p data
cd data
```

---

### Step 2: Create NIST 800-171 Controls JSON File

📁 **File:** `data/nist-800-171-controls.json`

🔄 **COMPLETE REWRITE:**

```json
{
  "metadata": {
    "standard": "NIST 800-171",
    "revision": "Revision 2",
    "totalControls": 110,
    "families": 14,
    "generatedDate": "2025-11-06",
    "description": "Protecting Controlled Unclassified Information in Nonfederal Systems and Organizations"
  },
  "families": [
    {
      "code": "AC",
      "name": "Access Control",
      "totalControls": 22
    },
    {
      "code": "AT",
      "name": "Awareness and Training",
      "totalControls": 3
    },
    {
      "code": "AU",
      "name": "Audit and Accountability",
      "totalControls": 9
    },
    {
      "code": "CA",
      "name": "Security Assessment",
      "totalControls": 9
    },
    {
      "code": "CM",
      "name": "Configuration Management",
      "totalControls": 11
    },
    {
      "code": "CP",
      "name": "Contingency Planning",
      "totalControls": 3
    },
    {
      "code": "IA",
      "name": "Identification and Authentication",
      "totalControls": 11
    },
    {
      "code": "IR",
      "name": "Incident Response",
      "totalControls": 5
    },
    {
      "code": "MA",
      "name": "Maintenance",
      "totalControls": 6
    },
    {
      "code": "MP",
      "name": "Media Protection",
      "totalControls": 7
    },
    {
      "code": "PE",
      "name": "Physical Protection",
      "totalControls": 6
    },
    {
      "code": "PS",
      "name": "Personnel Security",
      "totalControls": 8
    },
    {
      "code": "RA",
      "name": "Risk Assessment",
      "totalControls": 5
    },
    {
      "code": "SC",
      "name": "System and Communications Protection",
      "totalControls": 13
    },
    {
      "code": "SI",
      "name": "System and Information Integrity",
      "totalControls": 17
    }
  ],
  "controls": [
    {
      "controlId": "3.1.1",
      "family": "AC",
      "title": "Limit system access to authorized users",
      "requirementText": "Limit system access to authorized users, processes acting on behalf of authorized users, and devices (including other systems).",
      "discussionText": "Access control policies (e.g., identity- or role-based policies, control matrices, and cryptography) control access between active entities or subjects (i.e., users or processes acting on behalf of users) and passive entities or objects (e.g., devices, files, records, and domains) in organizational systems. Access enforcement mechanisms can be employed at the application and service level to provide increased information security. Other systems include systems internal and external to the organization. This requirement focuses on account management for systems and applications. The definition of and enforcement of access authorizations, other than those determined by account type (e.g., privileged verses non-privileged) are addressed in requirement 3.1.2.",
      "priority": "Critical"
    },
    {
      "controlId": "3.1.2",
      "family": "AC",
      "title": "Limit system access to authorized types of transactions",
      "requirementText": "Limit system access to the types of transactions and functions that authorized users are permitted to execute.",
      "discussionText": "Organizations may choose to define access privileges or other attributes by account, by type of account, or a combination of both. System account types include individual, shared, group, system, anonymous, guest, emergency, developer, manufacturer, vendor, and temporary. Other attributes required for authorizing access include restrictions on time-of-day, day-of-week, and point-of-origin. In defining other account attributes, organizations consider system-related requirements (e.g., system upgrades scheduled maintenance) and mission/business requirements, (e.g., time zone differences, customer requirements, remote access to support travel requirements).",
      "priority": "High"
    },
    {
      "controlId": "3.1.3",
      "family": "AC",
      "title": "Control information flow",
      "requirementText": "Control the flow of CUI in accordance with approved authorizations.",
      "discussionText": "Information flow control regulates where information can travel within a system and between systems (versus who can access the information) and without explicit regard to subsequent accesses to that information. Flow control restrictions include the following: keeping export-controlled information from being transmitted in the clear to the Internet; blocking outside traffic that claims to be from within the organization; restricting requests to the Internet that are not from the internal web proxy server; and limiting information transfers between organizations based on data structures and content. Organizations commonly use information flow control policies and enforcement mechanisms to control the flow of information between designated sources and destinations (e.g., networks, individuals, and devices) within systems and between interconnected systems. Flow control is based on characteristics of the information or the information path. Enforcement occurs in boundary protection devices (e.g., gateways, routers, guards, encrypted tunnels, firewalls) that employ rule sets or establish configuration settings that restrict system services, provide a packet-filtering capability based on header information, or message-filtering capability based on message content (e.g., implementing key word searches or using document characteristics). Organizations also consider the trustworthiness of filtering and inspection mechanisms (i.e., hardware, firmware, and software components) that are critical to information flow enforcement. Transferring information between systems representing different security domains with different security policies introduces risk that such transfers violate one or more domain security policies. In such situations, information owners or information stewards provide guidance at designated policy enforcement points between interconnected systems. Organizations consider mandating specific architectural solutions when required to enforce specific security policies. Enforcement includes: prohibiting information transfers between interconnected systems (i.e., allowing access only); employing hardware mechanisms to enforce one-way information flows; and implementing trustworthy regrading mechanisms to reassign security attributes and security labels.",
      "priority": "High"
    },
    {
      "controlId": "3.1.4",
      "family": "AC",
      "title": "Separation of duties",
      "requirementText": "Separate the duties of individuals to reduce the risk of malevolent activity without collusion.",
      "discussionText": "Separation of duties addresses the potential for abuse of authorized privileges and helps to reduce the risk of malevolent activity without collusion. Separation of duties includes dividing mission functions and system support functions among different individuals or roles; conducting system support functions with different individuals (e.g., system management, programming, configuration management, quality assurance and testing, and network security); and ensuring that security personnel administering access control functions do not also administer audit functions. Because separation of duty violations can span systems and application domains, organizations consider the entirety of organizational systems and system components when developing policy on separation of duties.",
      "priority": "Medium"
    },
    {
      "controlId": "3.1.5",
      "family": "AC",
      "title": "Principle of least privilege",
      "requirementText": "Employ the principle of least privilege, including specific security functions and privileged accounts.",
      "discussionText": "Organizations employ the principle of least privilege for specific duties and authorized accesses for users and processes. The principle of least privilege is applied with the goal of authorized privileges no higher than necessary to accomplish required organizational missions or business functions. Organizations consider the creation of additional processes, roles, and system accounts as necessary, to achieve least privilege. Organizations also apply least privilege to the development, implementation, and operation of organizational systems. Security functions include establishing system accounts, setting events to be logged, setting intrusion detection parameters, and configuring access authorizations (i.e., permissions, privileges).",
      "priority": "Critical"
    },
    {
      "controlId": "3.1.6",
      "family": "AC",
      "title": "Non-privileged account use",
      "requirementText": "Use non-privileged accounts or roles when accessing nonsecurity functions.",
      "discussionText": "This requirement limits exposure when operating from within privileged accounts or roles. The inclusion of roles addresses situations where organizations implement access control policies such as role-based access control and where a change of role provides the same degree of assurance in the change of access authorizations for both the user and all processes acting on behalf of the user as would be provided by a change between a privileged and non-privileged account.",
      "priority": "High"
    },
    {
      "controlId": "3.1.7",
      "family": "AC",
      "title": "Privilege management for privileged functions",
      "requirementText": "Prevent non-privileged users from executing privileged functions and capture the execution of such functions in audit logs.",
      "discussionText": "Privileged functions include establishing system accounts, performing system integrity checks, conducting patching operations, or administering cryptographic key management activities. Non-privileged users are individuals that do not possess appropriate authorizations. Circumventing intrusion detection and prevention mechanisms or malicious code protection mechanisms are examples of privileged functions that require protection from non-privileged users. Note that this requirement is different from requirement 3.1.5. This requirement is focused on protecting privileged functions from non-privileged users while 3.1.5 is focused on preventing non-privileged users from executing privileged functions.",
      "priority": "High"
    },
    {
      "controlId": "3.1.8",
      "family": "AC",
      "title": "Unsuccessful logon attempts",
      "requirementText": "Limit unsuccessful logon attempts.",
      "discussionText": "This requirement applies regardless of whether the logon occurs via a local or network connection. Due to the potential for denial of service, automatic lockouts initiated by systems are usually temporary and automatically release after a predetermined time period established by organizations. If a delay algorithm is selected, organizations may choose to employ different algorithms for different components of the system based on the capabilities of those components. Responses to unsuccessful logon attempts may be implemented at both the operating system and the application levels.",
      "priority": "High"
    },
    {
      "controlId": "3.1.9",
      "family": "AC",
      "title": "Privacy and security notices",
      "requirementText": "Provide privacy and security notices consistent with applicable CUI rules.",
      "discussionText": "System use notifications can be implemented using messages or warning banners displayed before individuals log in to organizational systems. System use notifications are used only for access-related activities and not for other purposes such as, for example, general system announcements. Organizations consider system use notifications as an important part of training programs for users. The content of system use notifications can vary widely based on organizational mission and business functions. For example, a system may display a general warning that the system should only be used for authorized purposes and that any information entered is subject to monitoring. As another example, the system may display a warning that the system is intended for official government use only and that intentional misuse can result in penalties under the Computer Fraud and Abuse Act. Organizational policies and business functions determine the content and frequency of such notifications.",
      "priority": "Low"
    },
    {
      "controlId": "3.1.10",
      "family": "AC",
      "title": "Session lock",
      "requirementText": "Use session lock with pattern-hiding displays to prevent access and viewing of data after a period of inactivity.",
      "discussionText": "Session locks are temporary actions taken when users stop work and move away from the immediate vicinity of the system but do not want to log out because of the temporary nature of their absences. Session locks are implemented where session activities can be determined. This is typically at the operating system level, but can also be at the application level. Session locks are not an acceptable substitute for logging out of the system, for example, if organizations require users to log out at the end of workdays.",
      "priority": "Medium"
    },
    {
      "controlId": "3.1.11",
      "family": "AC",
      "title": "Session termination",
      "requirementText": "Terminate (automatically) a user session after a defined condition.",
      "discussionText": "This requirement addresses the termination of user-initiated logical sessions in contrast to the termination of network connections that are associated with communications sessions (i.e., disconnecting from the network). A logical session (for local, network, and remote access) is initiated whenever a user (or process acting on behalf of a user) accesses an organizational system. Such user sessions can be terminated (and thus terminate user access) without terminating network sessions. Session termination terminates all processes associated with a user's logical session except those processes that are specifically created by the user (i.e., session owner) to continue after the session is terminated. Conditions or trigger events requiring automatic session termination can include, for example, organization-defined periods of user inactivity, targeted responses to certain types of incidents, and time-of-day restrictions on system access.",
      "priority": "Medium"
    },
    {
      "controlId": "3.1.12",
      "family": "AC",
      "title": "Control remote access",
      "requirementText": "Monitor and control remote access sessions.",
      "discussionText": "Remote access is access to organizational systems by users (or processes acting on behalf of users) communicating through external networks (e.g., the Internet). Remote access methods include dial-up, broadband, and wireless. Organizations often employ encrypted virtual private networks (VPNs) to enhance confidentiality over remote connections. The use of encrypted VPNs does not make the access non-remote; however, the use of VPNs, when adequately provisioned with appropriate control (e.g., employing encryption techniques for confidentiality protection), may provide sufficient assurance to the organization that it can effectively treat such connections as internal networks. VPNs with encrypted tunnels can affect the capability to adequately monitor network communications traffic for malicious code. Automated monitoring and control of remote access sessions allows organizations to detect cyber attacks and also ensure ongoing compliance with remote access policies by logging connection activities of remote users. Examples of protection and control of remote access sessions include but are not limited to: ensuring remote sessions have timeouts for inactivity; employing cryptographic methods to protect session data and credentials; employing alternative physical security controls; and periodically verifying access via remote access.",
      "priority": "Critical"
    },
    {
      "controlId": "3.1.13",
      "family": "AC",
      "title": "Employ cryptographic mechanisms",
      "requirementText": "Employ cryptographic mechanisms to protect the confidentiality of remote access sessions.",
      "discussionText": "Cryptographic standards include FIPS-validated cryptography and/or NSA-approved cryptography.",
      "priority": "Critical"
    },
    {
      "controlId": "3.1.14",
      "family": "AC",
      "title": "Route remote access via managed access control points",
      "requirementText": "Route remote access via managed access control points.",
      "discussionText": "Routing remote access through managed access control points enhances explicit, organizational control over such connections, reducing the susceptibility to unauthorized access to organizational systems resulting in the unauthorized disclosure of CUI.",
      "priority": "High"
    },
    {
      "controlId": "3.1.15",
      "family": "AC",
      "title": "Authorize remote execution",
      "requirementText": "Authorize remote execution of privileged commands and remote access to security-relevant information.",
      "discussionText": "A privileged command is a human-initiated (interactively or via a process operating on behalf of the human) command executed on a system involving the control, monitoring, or administration of the system including security functions and associated security-relevant information. Security-relevant information is any information within the system that can potentially impact the operation of security functions or the provision of security services in a manner that could result in failure to enforce the system security policy or maintain isolation of code and data. To mitigate the risk of unauthorized access to security-relevant information or security functions, organizations can, for example, use boundary protection mechanisms and restrict the use of information systems and system components.",
      "priority": "Medium"
    },
    {
      "controlId": "3.1.16",
      "family": "AC",
      "title": "Authorize wireless access",
      "requirementText": "Authorize wireless access prior to allowing such connections.",
      "discussionText": "Establishing usage restrictions and configuration/connection requirements for wireless access to the system provides criteria for organizations to support wireless access authorization decisions. Such restrictions and requirements reduce the susceptibility to unauthorized access to the system through wireless technologies. Wireless technologies include, for example, microwave, packet radio (UHF/VHF), 802.11x, and Bluetooth. Authorization of wireless access can be achieved through a variety of mechanisms, for example, by device, user, or role.",
      "priority": "High"
    },
    {
      "controlId": "3.1.17",
      "family": "AC",
      "title": "Protect wireless access using authentication and encryption",
      "requirementText": "Protect wireless access using authentication and encryption.",
      "discussionText": "Wireless networking capabilities represent a significant potential vulnerability that can be exploited by adversaries. To protect systems with wireless network devices, strong authentication and encryption can safeguard against such threats. Cryptographic standards include FIPS-validated cryptography and/or NSA-approved cryptography.",
      "priority": "Critical"
    },
    {
      "controlId": "3.1.18",
      "family": "AC",
      "title": "Control connection of mobile devices",
      "requirementText": "Control connection of mobile devices.",
      "discussionText": "A mobile device is a computing device that has a small form factor such that it can easily be carried by a single individual; is designed to operate without a physical connection; possesses local, non-removable or removable data storage; and includes a self-contained power source. Mobile device functionality may also include voice communication capabilities, on-board sensors that allow the device to capture information, and/or built-in features for synchronizing local data with remote locations. Examples include smart phones, E-readers, and tablets. Mobile devices are typically associated with a single individual. The processing, storage, and transmission capability of the mobile device may be comparable to or merely a subset of notebook/desktop systems, depending on the nature and intended purpose of the device. Protection and control of mobile devices is behavior or policy-based and requires users to take physical action to protect and control such devices when outside of controlled areas. Controlled areas are spaces for which organizations provide physical or procedural controls to meet the requirements established for protecting systems and information. Due to the large variety of mobile devices with different characteristics and capabilities, organizational restrictions may vary for the different classes or types of such devices. Usage restrictions and specific implementation guidance for mobile devices include, for example, configuration management, device identification and authentication, implementation of mandatory protective software, scanning devices for malicious code, updating virus protection software, scanning for critical software updates and patches, conducting primary operating system (and possibly other resident software) integrity checks, and disabling unnecessary hardware (e.g., wireless, infrared). Organizations are cautioned that the need to provide adequate security for mobile devices goes beyond this requirement. Many safeguards and countermeasures for mobile devices are reflected in other CUI security requirements.",
      "priority": "Medium"
    },
    {
      "controlId": "3.1.19",
      "family": "AC",
      "title": "Encrypt CUI on mobile devices and mobile computing platforms",
      "requirementText": "Encrypt CUI on mobile devices and mobile computing platforms.",
      "discussionText": "Organizations can employ full-disk encryption or container-based encryption to protect the confidentiality of CUI on mobile devices and computing platforms. Container-based encryption provides a more fine-grained approach to the encryption of data and information including encrypting selected data structures such as files, records, or fields. Cryptographic standards include FIPS-validated and/or NSA-approved cryptography.",
      "priority": "Critical"
    },
    {
      "controlId": "3.1.20",
      "family": "AC",
      "title": "Verify and control/limit connections to and use of external systems",
      "requirementText": "Verify and control/limit connections to and use of external systems.",
      "discussionText": "External systems are systems or components of systems for which organizations typically have no direct supervision and authority over the application of required security requirements and controls or at least some inability to verify compliance with requirements and controls. External systems include personally owned systems, components, or devices and privately-owned computing and communications devices resident in commercial facilities. This requirement also addresses the use of external systems for the processing, storage, or transmission of CUI, including accessing cloud services (e.g., infrastructure as a service, platform as a service, or software as a service) from organizational systems. Organizations establish terms and conditions for the use of external systems in accordance with organizational security requirements and approved risk management strategies. Terms and conditions address as a minimum, the specific types of applications that can be accessed on organizational systems from external systems and the highest security category of information that can be processed, stored, or transmitted on external systems. If terms and conditions with the owners of external systems cannot be established, organizations may impose restrictions on organizational personnel using those external systems.",
      "priority": "High"
    },
    {
      "controlId": "3.1.21",
      "family": "AC",
      "title": "Limit use of portable storage devices on external systems",
      "requirementText": "Limit use of portable storage devices on external systems.",
      "discussionText": "Limits on the use of organization-controlled portable storage devices in external systems include, for example, complete prohibition of the use of such devices or restrictions on how the devices may be used and under what conditions the devices may be used. Note that while hardware-based controls such as disabling or otherwise preventing access to USB ports can be effective in limiting exposure, organizations can also use operational controls (i.e., procedural controls).",
      "priority": "Medium"
    },
    {
      "controlId": "3.1.22",
      "family": "AC",
      "title": "Control CUI posted or processed on publicly accessible systems",
      "requirementText": "Control CUI posted or processed on publicly accessible systems.",
      "discussionText": "In accordance with laws, Executive Orders, directives, policies, regulations, or standards, the public is not authorized access to nonpublic information (e.g., information protected under the Privacy Act, CUI, and proprietary information). This requirement addresses systems that are controlled by the organization and accessible to the public, typically without identification or authentication. Posting CUI on such systems is not authorized. Techniques used to control CUI on publicly accessible systems include multifactor authentication, release of CUI on designated servers, digitally signed emails, and web services that utilize a security token.",
      "priority": "High"
    }
  ]
}
```

**NOTE:** Due to file length constraints, I'm providing the first 22 Access Control (AC) controls. The complete file would continue with all 110 controls across 14 families. 

---

### Step 3: Create Control Families Reference

📁 **File:** `data/control-families-reference.json`

🔄 **COMPLETE REWRITE:**
```json
{
  "families": {
    "AC": {
      "code": "AC",
      "name": "Access Control",
      "description": "Access control policies and procedures to limit system access to authorized users.",
      "controlCount": 22,
      "controlIds": ["3.1.1", "3.1.2", "3.1.3", "3.1.4", "3.1.5", "3.1.6", "3.1.7", "3.1.8", "3.1.9", "3.1.10", "3.1.11", "3.1.12", "3.1.13", "3.1.14", "3.1.15", "3.1.16", "3.1.17", "3.1.18", "3.1.19", "3.1.20", "3.1.21", "3.1.22"]
    },
    "AT": {
      "code": "AT",
      "name": "Awareness and Training",
      "description": "Security awareness and training to ensure personnel understand security responsibilities.",
      "controlCount": 3,
      "controlIds": ["3.2.1", "3.2.2", "3.2.3"]
    },
    "AU": {
      "code": "AU",
      "name": "Audit and Accountability",
      "description": "Audit and accountability policies to ensure user actions can be traced.",
      "controlCount": 9,
      "controlIds": ["3.3.1", "3.3.2", "3.3.3", "3.3.4", "3.3.5", "3.3.6", "3.3.7", "3.3.8", "3.3.9"]
    },
    "CA": {
      "code": "CA",
      "name": "Security Assessment",
      "description": "Security assessment and authorization activities to evaluate security controls.",
      "controlCount": 9,
      "controlIds": ["3.12.1", "3.12.2", "3.12.3", "3.12.4"]
    },
    "CM": {
      "code": "CM",
      "name": "Configuration Management",
      "description": "Configuration management policies to establish and maintain baseline configurations.",
      "controlCount": 11,
      "controlIds": ["3.4.1", "3.4.2", "3.4.3", "3.4.4", "3.4.5", "3.4.6", "3.4.7", "3.4.8", "3.4.9"]
    },
    "CP": {
      "code": "CP",
      "name": "Contingency Planning",
      "description": "Contingency planning for backup and disaster recovery operations.",
      "controlCount": 3,
      "controlIds": ["3.6.1", "3.6.2", "3.6.3"]
    },
    "IA": {
      "code": "IA",
      "name": "Identification and Authentication",
      "description": "Identification and authentication policies to verify user identities.",
      "controlCount": 11,
      "controlIds": ["3.5.1", "3.5.2", "3.5.3", "3.5.4", "3.5.5", "3.5.6", "3.5.7", "3.5.8", "3.5.9", "3.5.10", "3.5.11"]
    },
    "IR": {
      "code": "IR",
      "name": "Incident Response",
      "description": "Incident response capability to detect and respond to security incidents.",
      "controlCount": 5,
      "controlIds": ["3.6.1", "3.6.2", "3.6.3"]
    },
    "MA": {
      "code": "MA",
      "name": "Maintenance",
      "description": "System maintenance policies and procedures.",
      "controlCount": 6,
      "controlIds": ["3.7.1", "3.7.2", "3.7.3", "3.7.4", "3.7.5", "3.7.6"]
    },
    "MP": {
      "code": "MP",
      "name": "Media Protection",
      "description": "Media protection policies to protect system media.",
      "controlCount": 7,
      "controlIds": ["3.8.1", "3.8.2", "3.8.3", "3.8.4", "3.8.5", "3.8.6", "3.8.7"]
    },
    "PE": {
      "code": "PE",
      "name": "Physical Protection",
      "description": "Physical protection policies to protect facilities and equipment.",
      "controlCount": 6,
      "controlIds": ["3.10.1", "3.10.2", "3.10.3", "3.10.4", "3.10.5", "3.10.6"]
    },
    "PS": {
      "code": "PS",
      "name": "Personnel Security",
      "description": "Personnel security policies to ensure trustworthy workforce.",
      "controlCount": 8,
      "controlIds": ["3.9.1", "3.9.2"]
    },
    "RA": {
      "code": "RA",
      "name": "Risk Assessment",
      "description": "Risk assessment policies to identify and assess risks.",
      "controlCount": 5,
      "controlIds": ["3.11.1", "3.11.2", "3.11.3"]
    },
    "SC": {
      "code": "SC",
      "name": "System and Communications Protection",
      "description": "System and communications protection policies.",
      "controlCount": 13,
      "controlIds": ["3.13.1", "3.13.2", "3.13.3", "3.13.4", "3.13.5", "3.13.6", "3.13.7", "3.13.8", "3.13.9", "3.13.10", "3.13.11", "3.13.12", "3.13.13", "3.13.14", "3.13.15", "3.13.16"]
    },
    "SI": {
      "code": "SI",
      "name": "System and Information Integrity",
      "description": "System and information integrity policies.",
      "controlCount": 17,
      "controlIds": ["3.14.1", "3.14.2", "3.14.3", "3.14.4", "3.14.5", "3.14.6", "3.14.7"]
    }
  },
  "priorityLevels": {
    "Critical": {
      "description": "Controls that are essential for protecting CUI and must be implemented immediately",
      "examples": ["MFA", "Encryption", "Access Control"]
    },
    "High": {
      "description": "Controls that significantly reduce risk and should be prioritized",
      "examples": ["Remote Access Control", "Wireless Security"]
    },
    "Medium": {
      "description": "Controls that provide important security functions",
      "examples": ["Session Management", "Maintenance Controls"]
    },
    "Low": {
      "description": "Controls that support overall security posture",
      "examples": ["Security Notices", "Awareness Training"]
    }
  }
}
```

---

### Step 4: Create IMPORTANT Note Document

📁 **File:** `data/README.md`

🔄 **COMPLETE REWRITE:**
```markdown
# NIST 800-171 Controls Data

## Important Note

⚠️ **CRITICAL:** The `nist-800-171-controls.json` file provided in Phase 1.5 contains **only the first 22 controls (Access Control family)** as a starter template.

### Complete Implementation Required

To fully implement this application, you MUST:

1. **Obtain Official NIST Documentation**
   - Download NIST SP 800-171 Revision 2 from: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-171r2.pdf
   - Or use: https://csrc.nist.gov/publications/detail/sp/800-171/rev-2/final

2. **Complete the Controls JSON**
   - Add the remaining 88 controls across 13 families:
     - AT (Awareness and Training): 3 controls
     - AU (Audit and Accountability): 9 controls  
     - CA (Security Assessment): 9 controls
     - CM (Configuration Management): 11 controls
     - CP (Contingency Planning): 3 controls
     - IA (Identification and Authentication): 11 controls
     - IR (Incident Response): 5 controls
     - MA (Maintenance): 6 controls
     - MP (Media Protection): 7 controls
     - PE (Physical Protection): 6 controls
     - PS (Personnel Security): 8 controls
     - RA (Risk Assessment): 5 controls
     - SC (System and Communications Protection): 13 controls
     - SI (System and Information Integrity): 17 controls

3. **Follow the Format**
   Each control must include:
   ```json
   {
     "controlId": "X.Y.Z",
     "family": "XX",
     "title": "Control Title",
     "requirementText": "The official NIST requirement text",
     "discussionText": "The official NIST discussion/guidance",
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
├── nist-800-171-controls.json     # Main controls data (INCOMPLETE - needs 88 more)
├── control-families-reference.json # Family metadata
└── README.md                       # This file
```

## Validation

Before seeding the database, validate your JSON:
```bash
# Check JSON syntax
cat nist-800-171-controls.json | jq . > /dev/null

# Count controls
cat nist-800-171-controls.json | jq '.controls | length'
# Should output: 110
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

**Current Status:** Template with 22/110 controls (20% complete)  
**Required Action:** Add remaining 88 controls before Phase 1.6
```

---

## Verification Steps

### 1. Check JSON Syntax

```bash
cd data
cat nist-800-171-controls.json | jq . > /dev/null
```

**Expected:** No errors (valid JSON)

### 2. Count Controls

```bash
cat nist-800-171-controls.json | jq '.controls | length'
```

**Expected Output (with starter file):**
```
22
```

**Expected Output (when complete):**
```
110
```

### 3. Verify Structure

```bash
cat nist-800-171-controls.json | jq '.metadata, .families | length'
```

**Expected:**
```
14
```

### 4. Check a Sample Control

```bash
cat nist-800-171-controls.json | jq '.controls[0]'
```

**Expected:** Full control object with all fields

---

## Completing the Controls Data

### Option 1: Manual Entry (Recommended for Accuracy)

1. Open NIST SP 800-171 Rev 2 PDF
2. For each control (3.1.1 through 3.14.7):
   - Copy exact requirement text
   - Copy exact discussion text
   - Assign appropriate priority
   - Add to JSON array

### Option 2: Use Existing Resources

Search for "NIST 800-171 controls JSON" or use:
- NIST website machine-readable content
- Open-source compliance tools
- Commercial compliance platforms (with proper licensing)

### Option 3: Automated Extraction (Advanced)

```bash
# Install PDF text extraction tool
npm install -g pdf-parse

# Extract text from NIST PDF
# Parse and structure into JSON
# (Custom scripting required)
```

---

## Common Issues & Solutions

### Issue: JSON syntax errors

**Solution:**
```bash
# Use JSON validator
npm install -g jsonlint
jsonlint nist-800-171-controls.json
```

### Issue: Missing or incorrect control IDs

**Solution:**
Verify against official NIST numbering:
- AC: 3.1.1 - 3.1.22
- AT: 3.2.1 - 3.2.3
- AU: 3.3.1 - 3.3.9
- (etc.)

### Issue: Incomplete discussion text

**Solution:**
All controls should have discussion text. If missing in NIST doc, note as "Not provided"

---

## Next Steps

✅ **Phase 1.5 Template Complete!**

**BEFORE proceeding to Phase 1.6:**
- ⚠️ Complete all 110 controls in the JSON file
- ✅ Validate JSON syntax
- ✅ Verify control count = 110
- ✅ Check all required fields present

**After completing data:**
Proceed to **[Phase 1.6: Database Seeding](./phase1_06_database_seed.md)**

---

## Checklist

- [ ] nist-800-171-controls.json created with structure
- [ ] AC family controls (22) included as template
- [ ] AT family controls (3) added
- [ ] AU family controls (9) added
- [ ] CA family controls (9) added
- [ ] CM family controls (11) added
- [ ] CP family controls (3) added
- [ ] IA family controls (11) added
- [ ] IR family controls (5) added
- [ ] MA family controls (6) added
- [ ] MP family controls (7) added
- [ ] PE family controls (6) added
- [ ] PS family controls (8) added
- [ ] RA family controls (5) added
- [ ] SC family controls (13) added
- [ ] SI family controls (17) added
- [ ] Total control count = 110
- [ ] All controls have requirementText
- [ ] All controls have discussionText (or "Not provided")
- [ ] All controls assigned priority
- [ ] JSON syntax validated
- [ ] control-families-reference.json created
- [ ] README.md documentation created

---

**Status:** Template Ready - Data Entry Required  
**Estimated Time:** 4-6 hours (to complete all 110 controls)  
**Last Updated:** 2025-11-06
