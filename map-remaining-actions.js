const fs = require('fs');
const path = require('path');

console.log('📋 Mapping Remaining NIST 800-171 Actions to Controls...\n');

// Read files
const unmappedPath = path.join(__dirname, 'data', 'unmapped-nist-actions.json');
const currentJsonPath = path.join(__dirname, 'data', 'nist-improvement-actions.json');

const unmapped = JSON.parse(fs.readFileSync(unmappedPath, 'utf-8'));
const currentJson = JSON.parse(fs.readFileSync(currentJsonPath, 'utf-8'));

// Helper function to create action object
function createActionObject(action, category, priority) {
  const slug = action.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return {
    title: action,
    category: category,
    priority: priority,
    complianceManagerUrl: `https://compliance.microsoft.com/compliancemanager?filter=${encodeURIComponent(action)}`,
    actionSlug: slug,
    documentationUrl: null
  };
}

// Map actions to controls based on keywords and functionality
const manualMappings = {
  // Access Control (03.01.x)
  "03.01.01": [
    "Disable basic authentication for remotely managed clients"
  ],
  "03.01.11": [ // Terminate sessions after defined period
    "Turn on idle session timeout"
  ],
  "03.01.12": [ // Monitor and control remote access
    "Generate remote connection report for cloud desktops",
    "Enable remote help for tenants"
  ],
  "03.01.20": [ // Verify and control connections to external systems
    "Remediate risky OAuth apps",
    "Detect new OAuth applications connected to your corporate environment",
    "Govern calendar sharing"
  ],

  // Awareness and Training (03.02.x) - None additional

  // Audit and Accountability (03.03.x)
  "03.03.01": [ // Create and retain audit logs
    "Use the system clock to generate time stamps for audit records"
  ],
  "03.03.02": [ // Ensure audit events are logged
    "Monitor groups access",
    "Generate and view operational report providing app install status"
  ],
  "03.03.03": [ // Review and update logged events
    "View the timeline of risky events"
  ],
  "03.03.08": [ // Protect audit information
    "Disable browser persistence"
  ],

  // Configuration Management (03.04.x)
  "03.04.01": [ // Establish baseline configurations
    "Protect Windows devices"
  ],
  "03.04.02": [ // Establish and maintain baseline and inventories
    "Generate and review reports for device compliance",
    "Generate and review reports for device compliance trends",
    "View device health and compliance reports"
  ],
  "03.04.05": [ // Define and enforce access restrictions
    "Block non-compliant devices and report policy violations"
  ],
  "03.04.06": [ // Employ principle of least functionality
    "Govern managed apps"
  ],
  "03.04.07": [ // Restrict, disable, or prevent nonessential functions
    "Disable 'Always install with elevated privileges'",
    "Disable 'Insecure guest logons' in Server Message Block (SMB)",
    "Prohibit use of Internet Connection Sharing on your DNS domain network",
    "Block Flash activation in Office documents"
  ],

  // Identification and Authentication (03.05.x)
  "03.05.01": [ // Identify system users
    "Enable deletion of an existing user"
  ],

  // Incident Response (03.06.x)
  "03.06.01": [ // Establish operational incident-handling capability
    "Automate investigation and response activities",
    "Use automated investigation and remediation capabilities"
  ],

  // Maintenance (03.07.x)
  "03.07.01": [ // Perform maintenance
    "Manually update remote devices",
    "Configure endpoint security solution integration"
  ],

  // Media Protection (03.08.x)
  "03.08.03": [ // Sanitize or destroy media
    "Configure retention period for deleted users in a shared drive"
  ],

  // Personnel Security (03.09.x)  - None additional

  // Physical Protection (03.10.x) - None additional

  // Risk Assessment (03.11.x)
  "03.11.01": [ // Periodically assess risk
    "Remove the learning period for alerts"
  ],

  // Security Assessment (03.12.x) - None additional

  // System and Communications Protection (03.13.x)
  "03.13.01": [ // Monitor, control, and protect communications
    "Employ a secure channel between the Domain Controller and member computers"
  ],
  "03.13.05": [ // Implement subnetworks
    "Restrict anonymous access to named pipes and shares",
    "Disallow anonymous enumeration of SAM accounts"
  ],
  "03.13.08": [ // Implement cryptographic mechanisms
    "Create and publish sensitivity label policies for content in relevant sites and applications"
  ],
  "03.13.16": [ // Protect confidentiality of CUI at rest
    "Provide privacy information for organizations",
    "Display privacy statements for end users"
  ],

  // System and Information Integrity (03.14.x)
  "03.14.01": [ // Identify, report, and correct flaws
    "Enable 'Hide Option to Enable or Disable Updates'"
  ],
  "03.14.02": [ // Provide protection from malicious code
    "Enable endpoint detection (EDR) and response in block mode",
    "Set cloud-based anti-phishing and anti-malware app",
    "Use an anti-exploit tool",
    "Use advanced protection against ransomware",
    "Enable controlled folder access",
    "Protect important folders with controlled folder access",
    "Block Adobe Reader from creating child processes",
    "Block Office applications from injecting code into other processes",
    "Block execution of potentially obfuscated scripts"
  ],
  "03.14.03": [ // Monitor system security alerts
    "Block executable content from email client and webmail",
    "Configure indicators for IPs and URLs/domains"
  ],
  "03.14.06": [ // Monitor systems
    "Enable 'MIME Sniffing Safety Feature'"
  ],
  "03.14.07": [ // Identify unauthorized use
    "Manage end-user experiences for applications",
    "Manage on-premises application provisioning"
  ],

  // Additional mappings for mobile/app protection
  "03.01.18": [ // Encrypt CUI on mobile devices
    "Configure an endpoint solution for iOS devices",
    "Enable automatic enrollment of corporate-owned iOS and iPadOS devices",
    "Protect mobile and desktop applications",
    "Create a Windows 10 app protection policy"
  ],

  // Personnel Security
  "03.09.02": [ // Ensure CUI protection during personnel actions
    "Maintain segregation of duties"
  ]
};

// Apply mappings
let mappedCount = 0;
const unmappedRemaining = [];

for (const action of unmapped.actions) {
  let mapped = false;

  for (const controlId in manualMappings) {
    if (manualMappings[controlId].includes(action.action)) {
      // Add to existing control or create new
      if (!currentJson.mappings[controlId]) {
        currentJson.mappings[controlId] = {
          controlId: controlId,
          controlTitle: `Control ${controlId}`,
          improvementActions: []
        };
      }

      // Adjust priority based on control importance
      let priority = action.priority;
      if (controlId.startsWith('03.01') || controlId.startsWith('03.05') || controlId.startsWith('03.14')) {
        priority = action.priority === 'Medium' ? 'High' : action.priority;
      }

      currentJson.mappings[controlId].improvementActions.push(
        createActionObject(action.action, action.category, priority)
      );

      mappedCount++;
      mapped = true;
      break;
    }
  }

  if (!mapped) {
    unmappedRemaining.push(action);
  }
}

// Update control titles with proper names
const controlTitles = {
  "03.01.01": "Limit system access to authorized users",
  "03.01.11": "Terminate session after defined period of inactivity",
  "03.01.12": "Monitor and control remote access sessions",
  "03.01.18": "Encrypt CUI on mobile devices",
  "03.01.20": "Verify and control/limit connections to external systems",
  "03.03.01": "Create and retain system audit logs",
  "03.03.02": "Ensure audit events are logged and enable review",
  "03.03.03": "Review and update logged events",
  "03.03.08": "Protect audit information from unauthorized access",
  "03.04.01": "Establish and maintain baseline configurations",
  "03.04.02": "Establish and maintain baseline configurations and inventories",
  "03.04.05": "Define, document, approve, and enforce physical and logical access restrictions",
  "03.04.06": "Employ the principle of least functionality",
  "03.04.07": "Restrict, disable, or prevent the use of nonessential functions",
  "03.05.01": "Identify system users, processes, and devices",
  "03.06.01": "Establish an operational incident-handling capability",
  "03.07.01": "Perform maintenance on systems",
  "03.08.03": "Sanitize or destroy information system media",
  "03.09.02": "Ensure CUI protection during personnel transfers and terminations",
  "03.11.01": "Periodically assess risk",
  "03.13.01": "Monitor, control, and protect communications at external boundaries",
  "03.13.05": "Implement subnetworks for publicly accessible components",
  "03.13.08": "Implement cryptographic mechanisms to prevent unauthorized disclosure",
  "03.13.16": "Protect the confidentiality of CUI at rest",
  "03.14.01": "Identify, report, and correct system flaws in a timely manner",
  "03.14.02": "Provide protection from malicious code",
  "03.14.03": "Monitor system security alerts and advisories and take action",
  "03.14.06": "Monitor organizational systems",
  "03.14.07": "Identify unauthorized use of the system"
};

for (const controlId in currentJson.mappings) {
  if (controlTitles[controlId]) {
    currentJson.mappings[controlId].controlTitle = controlTitles[controlId];
  }
}

// Save updated JSON
fs.writeFileSync(currentJsonPath, JSON.stringify(currentJson, null, 2));

console.log('✅ Mapping Results:');
console.log(`   Newly mapped actions: ${mappedCount}`);
console.log(`   Still unmapped: ${unmappedRemaining.length}`);
console.log(`   Total controls: ${Object.keys(currentJson.mappings).length}`);
console.log();

if (unmappedRemaining.length > 0) {
  console.log('⚠️  Still unmapped:');
  unmappedRemaining.forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.action}`);
  });
  fs.writeFileSync(unmappedPath, JSON.stringify({
    description: "Remaining NIST 800-171 actions that need manual control assignment",
    count: unmappedRemaining.length,
    actions: unmappedRemaining
  }, null, 2));
} else {
  console.log('✅ All actions successfully mapped!');
  // Delete unmapped file
  if (fs.existsSync(unmappedPath)) {
    fs.unlinkSync(unmappedPath);
  }
}

console.log('\n✅ Updated file saved to: data/nist-improvement-actions.json');
console.log('='.repeat(80));
