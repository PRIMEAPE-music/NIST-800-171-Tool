# PHASE 2: Evidence Requirements Consolidation

## OBJECTIVE
Consolidate all Phase 1 research outputs into a single, standardized JSON file that identifies shared policies, standardizes naming conventions, and produces the final data structure for application implementation.

## INPUT
You will receive 24 JSON files from Phase 1, one for each batch. Each file contains evidence requirements for 2-6 controls, totaling 97 active NIST 800-171 Rev 3 controls.

## YOUR TASKS

### Task 1: Policy Document Standardization

**Problem:** Different batches may have named the same policy document differently.

Examples:
- "Access Control Policy" vs "Organizational Access Control Policy" vs "AC Policy"
- "Incident Response Plan" vs "IR Plan" vs "Incident Response Policy and Procedures"

**Your Job:**
1. Review ALL policy documents mentioned across all 97 controls
2. Identify which policies are actually the same document (use fuzzy matching and context)
3. Create standardized canonical names for each unique policy
4. Group controls that share each policy

**Standardization Rules:**
- Use clear, professional naming: "[Topic] Policy" or "[Topic] Plan"
- Family-level policies: "[Family Name] Policy" (e.g., "Access Control Policy")
- Organization-wide policies: Keep broad scope (e.g., "Security Awareness Training Policy")
- Plans are different from policies: "Incident Response Plan" not "Incident Response Policy"

**Output for Each Standardized Policy:**
```json
{
  "standardizedName": "Access Control Policy",
  "description": "Organization-wide policy governing access control requirements",
  "sharedAcrossControls": ["03.01.01", "03.01.02", "03.01.03", ...],
  "controlCount": 15,
  "originalNames": [
    "Access Control Policy",
    "Organizational Access Control Policy",
    "AC Policy and Procedures"
  ]
}
```

### Task 2: Procedure Document Review

**Procedures are typically control-specific, but some may be shared.**

Examples of potentially shared procedures:
- "Account Provisioning Procedure" might be shared by 03.01.02, 03.05.01, 03.05.02
- "Backup and Recovery Procedure" might be shared by multiple MP and CP controls

**Your Job:**
1. Identify procedures that appear in multiple controls
2. Determine if they're truly the same procedure or control-specific variants
3. Standardize naming where appropriate

**Keep procedures separate if:**
- They serve different purposes
- They would contain significantly different steps
- Controls need specific variants

### Task 3: Evidence Type Consistency

**Ensure consistent naming for execution evidence across controls.**

Examples:
- "Log review reports" vs "Audit log analysis reports" → Standardize to one name
- "Access review records" vs "Access certification reports" → Choose one term
- "Vulnerability scan results" vs "Vulnerability assessment reports" → Standardize

**Your Job:**
1. Identify similar evidence types with different names
2. Standardize to industry-standard terminology
3. Ensure descriptions are consistent for the same evidence type

### Task 4: Validation Checks

Verify the consolidated data:

**Completeness:**
- All 97 active controls are present
- No withdrawn controls included
- Each control has at least one evidence requirement

**Consistency:**
- Similar controls have similar evidence requirements
- Freshness thresholds are reasonable and consistent
- Physical evidence only for PE family and controls mentioning physical requirements

**Quality:**
- All shared policies are correctly identified
- No duplicate policy documents with different names
- Evidence descriptions are specific and actionable

### Task 5: Generate Final JSON Output

Create a comprehensive JSON file with three main sections:

**Section 1: Master Policy List**
All unique policy documents with sharing information

**Section 2: Control Evidence Requirements**
Complete evidence requirements for each control with standardized references

**Section 3: Metadata**
Summary statistics and validation results

## FINAL JSON SCHEMA

```json
{
  "schemaVersion": "1.0",
  "generatedDate": "2024-12-03",
  "nistRevision": "Rev 3",
  "totalControls": 97,
  "consolidationNotes": "Notes about standardization decisions made",
  
  "masterPolicyList": [
    {
      "policyId": "POL-001",
      "standardizedName": "Access Control Policy",
      "description": "Organization-wide policy governing access control requirements",
      "category": "family-level",
      "family": "AC",
      "sharedAcrossControls": ["03.01.01", "03.01.02", "03.01.03", ...],
      "controlCount": 15,
      "frequency": "annual",
      "freshnessThreshold": 400,
      "originalNamesFromResearch": [
        "Access Control Policy",
        "Organizational Access Control Policy"
      ]
    }
  ],
  
  "masterProcedureList": [
    {
      "procedureId": "PROC-001",
      "standardizedName": "Account Provisioning and Deprovisioning Procedure",
      "description": "Step-by-step process for creating, modifying, and removing user accounts",
      "sharedAcrossControls": ["03.01.02", "03.05.01", "03.09.02"],
      "controlCount": 3,
      "frequency": "one-time",
      "originalNamesFromResearch": [
        "Account Provisioning Procedure",
        "Account Management Procedure",
        "User Account Lifecycle Procedure"
      ]
    }
  ],
  
  "controlEvidenceRequirements": [
    {
      "controlId": "03.01.01",
      "controlTitle": "Policy and Procedures",
      "controlFamily": "AC",
      "evidenceRequirements": {
        "policies": [
          {
            "policyId": "POL-001",
            "standardizedName": "Access Control Policy",
            "description": "Organization-wide policy governing access control requirements",
            "rationale": "Control 03.01.01 explicitly requires 'develop, document, and disseminate access control policy'",
            "shared": true,
            "sharedWith": ["03.01.02", "03.01.03", "..."],
            "frequency": "annual",
            "freshnessThreshold": 400
          }
        ],
        "procedures": [
          {
            "procedureId": "PROC-002",
            "standardizedName": "Access Control Implementation Procedures",
            "description": "Procedures for implementing access control policy requirements",
            "rationale": "Control requires procedures to facilitate policy implementation",
            "shared": false,
            "frequency": "one-time",
            "freshnessThreshold": null
          }
        ],
        "executionEvidence": [
          {
            "evidenceType": "policy-review-record",
            "standardizedName": "Annual Policy Review Records",
            "description": "Documentation showing annual review of access control policy including review date, reviewers, changes made, and approval signatures",
            "rationale": "Control requires policy review and update; annual is industry standard",
            "recurring": true,
            "frequency": "annually",
            "freshnessThreshold": 400
          }
        ],
        "physicalEvidence": [],
        "operationalActivities": [
          {
            "activity": "Develop and document access control policy",
            "description": "Create comprehensive policy covering all aspects of organizational access control",
            "frequency": "one-time-then-annual-review"
          }
        ]
      },
      "notes": "This is a foundational policy control. The Access Control Policy created here applies to all subsequent AC family controls."
    }
  ],
  
  "metadata": {
    "totalUniquePolicies": 25,
    "totalUniqueProcedures": 68,
    "totalExecutionEvidenceTypes": 145,
    "controlsWithPhysicalRequirements": 12,
    "mostSharedPolicy": {
      "name": "Access Control Policy",
      "sharedAcross": 15
    },
    "validationResults": {
      "allControlsPresent": true,
      "noWithdrawnControls": true,
      "allControlsHaveEvidence": true,
      "physicalEvidenceOnlyForApplicableControls": true,
      "consistentNaming": true
    },
    "standardizationDecisions": [
      "Merged 'Access Control Policy', 'AC Policy', and 'Organizational Access Control Policy' into 'Access Control Policy'",
      "Standardized all log review evidence to 'Audit Log Review Reports'",
      "Separated 'Account Provisioning Procedure' from 'Account Management Procedure' as they serve different purposes"
    ]
  }
}
```

## CONSOLIDATION WORKFLOW

### Step 1: Load All Phase 1 Outputs
Read all 20 batch JSON files

### Step 2: Extract All Policies
Create a list of every policy mentioned across all controls

### Step 3: Group Similar Policies
Use fuzzy matching and context to identify duplicates:
- Exact matches (easy)
- Similar names (e.g., "AC Policy" and "Access Control Policy")
- Context-based (same family, similar description)

### Step 4: Standardize Policy Names
Choose canonical name for each policy group:
- Prefer clear, professional naming
- Follow pattern: "[Topic] Policy" or "[Topic] Plan"
- Be consistent across families

### Step 5: Update Control References
Replace original policy names with standardized names in each control

### Step 6: Repeat for Procedures
Identify shared procedures and standardize naming

### Step 7: Standardize Evidence Types
Ensure consistent naming for similar evidence across controls

### Step 8: Generate Master Lists
Create masterPolicyList and masterProcedureList with sharing information

### Step 9: Validate
Run completeness and consistency checks

### Step 10: Output Final JSON
Generate the complete consolidated file

## STANDARDIZATION GUIDELINES

### Policy Naming Patterns:
- **Family-Level:** "[Family Name] Policy" (e.g., "Access Control Policy", "Audit and Accountability Policy")
- **Cross-Cutting:** Descriptive name (e.g., "Security Awareness Training Policy", "Risk Management Policy")
- **Plans:** "[Topic] Plan" (e.g., "Incident Response Plan", "Contingency Plan", "System Security Plan")

### Procedure Naming Patterns:
- **Activity-Based:** "[Activity] Procedure" (e.g., "Account Provisioning Procedure", "Log Review Procedure")
- **Control-Specific:** "[Control Topic] Implementation Procedure"
- **Process-Based:** "[Process Name] Process" (e.g., "Change Management Process", "Backup and Recovery Process")

### Evidence Naming Patterns:
- **Reports:** "[Topic] Reports" (e.g., "Audit Log Review Reports", "Vulnerability Scan Reports")
- **Records:** "[Activity] Records" (e.g., "Access Review Records", "Training Completion Records")
- **Logs:** "[System] Logs" (e.g., "System Access Logs", "Physical Access Logs")

## QUALITY CRITERIA

Your consolidated output must:

1. **Be Complete:** All 97 controls present with evidence requirements
2. **Be Consistent:** Similar controls have similar evidence, standardized naming throughout
3. **Be Accurate:** Shared policies correctly identified, no false duplicates
4. **Be Specific:** Evidence descriptions are detailed and actionable
5. **Be Validated:** All validation checks pass
6. **Be Documented:** Standardization decisions are explained in metadata

## OUTPUT FORMAT

Respond with ONLY the final consolidated JSON. No markdown code blocks, no explanations, no summaries.

**ONLY OUTPUT THE RAW JSON.**

## EXECUTION

Upload all 20 Phase 1 batch outputs, then produce the final consolidated JSON following this specification.
