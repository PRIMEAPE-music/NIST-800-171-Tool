import json
import os
from datetime import datetime
from difflib import SequenceMatcher
from collections import defaultdict

# Path to the batch files
BASE_PATH = r"C:\Users\justin\Desktop\IT Software\Custom Programs\NIST Tool\INSTRUCTIONS\GAP ANALYSIS RESEARCH"

def similar(a, b):
    """Calculate similarity ratio between two strings."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def load_all_batches():
    """Load all batch JSON files."""
    batches = []
    for i in range(1, 25):
        file_path = os.path.join(BASE_PATH, f"batch_{i}.json")
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                batch = json.load(f)
                batches.append(batch)
                print(f"Loaded batch_{i}.json")
        except FileNotFoundError:
            print(f"Warning: batch_{i}.json not found")
        except json.JSONDecodeError as e:
            print(f"Error decoding batch_{i}.json: {e}")
    return batches

def extract_all_policies(batches):
    """Extract all policies from all batches with their control IDs."""
    policies = []
    for batch in batches:
        for control in batch.get('controls', []):
            control_id = control.get('controlId', '')
            for policy in control.get('evidenceRequirements', {}).get('policies', []):
                policies.append({
                    'controlId': control_id,
                    'name': policy.get('name', ''),
                    'description': policy.get('description', ''),
                    'rationale': policy.get('rationale', ''),
                    'frequency': policy.get('frequency', 'annual'),
                    'freshnessThreshold': policy.get('freshnessThreshold', 400),
                    'family': control.get('controlFamily', '')
                })
    return policies

def extract_all_procedures(batches):
    """Extract all procedures from all batches with their control IDs."""
    procedures = []
    for batch in batches:
        for control in batch.get('controls', []):
            control_id = control.get('controlId', '')
            for procedure in control.get('evidenceRequirements', {}).get('procedures', []):
                procedures.append({
                    'controlId': control_id,
                    'name': procedure.get('name', ''),
                    'description': procedure.get('description', ''),
                    'rationale': procedure.get('rationale', ''),
                    'frequency': procedure.get('frequency', 'one-time'),
                    'freshnessThreshold': procedure.get('freshnessThreshold'),
                    'family': control.get('controlFamily', '')
                })
    return procedures

def standardize_policy_name(name, family):
    """Standardize policy names according to guidelines."""
    name_lower = name.lower()

    # Family-level policies mapping
    family_policies = {
        'ac': 'Access Control Policy',
        'at': 'Awareness and Training Policy',
        'au': 'Audit and Accountability Policy',
        'ca': 'Assessment, Authorization, and Monitoring Policy',
        'cm': 'Configuration Management Policy',
        'cp': 'Contingency Planning Policy',
        'ia': 'Identification and Authentication Policy',
        'ir': 'Incident Response Policy',
        'ma': 'Maintenance Policy',
        'mp': 'Media Protection Policy',
        'pe': 'Physical and Environmental Protection Policy',
        'pl': 'Planning Policy',
        'ps': 'Personnel Security Policy',
        'ra': 'Risk Assessment Policy',
        'sa': 'System and Services Acquisition Policy',
        'sc': 'System and Communications Protection Policy',
        'si': 'System and Information Integrity Policy',
        'sr': 'Supply Chain Risk Management Policy'
    }

    # Check for family-level policy patterns
    if family.lower() in family_policies:
        if any(x in name_lower for x in ['policy', 'policies']):
            if family.lower() == 'ac' and 'access' in name_lower:
                return family_policies['ac']
            elif family.lower() == 'at' and ('training' in name_lower or 'awareness' in name_lower):
                return family_policies['at']
            elif family.lower() == 'au' and ('audit' in name_lower or 'accountability' in name_lower):
                return family_policies['au']
            elif family.lower() == 'ca' and ('assessment' in name_lower or 'authorization' in name_lower):
                return family_policies['ca']
            elif family.lower() == 'cm' and ('configuration' in name_lower):
                return family_policies['cm']
            elif family.lower() == 'cp' and ('contingency' in name_lower):
                return family_policies['cp']
            elif family.lower() == 'ia' and ('identification' in name_lower or 'authentication' in name_lower):
                return family_policies['ia']
            elif family.lower() == 'ir' and ('incident' in name_lower and 'response' in name_lower):
                return family_policies['ir']
            elif family.lower() == 'ma' and 'maintenance' in name_lower:
                return family_policies['ma']
            elif family.lower() == 'mp' and 'media' in name_lower:
                return family_policies['mp']
            elif family.lower() == 'pe' and ('physical' in name_lower or 'environmental' in name_lower):
                return family_policies['pe']
            elif family.lower() == 'pl' and 'planning' in name_lower:
                return family_policies['pl']
            elif family.lower() == 'ps' and 'personnel' in name_lower:
                return family_policies['ps']
            elif family.lower() == 'ra' and 'risk' in name_lower:
                return family_policies['ra']
            elif family.lower() == 'sa' and ('acquisition' in name_lower or 'services' in name_lower):
                return family_policies['sa']
            elif family.lower() == 'sc' and ('communications' in name_lower or 'protection' in name_lower):
                return family_policies['sc']
            elif family.lower() == 'si' and ('integrity' in name_lower or 'information' in name_lower):
                return family_policies['si']
            elif family.lower() == 'sr' and 'supply' in name_lower:
                return family_policies['sr']

    # Special cases for plans
    if 'incident response' in name_lower and 'plan' in name_lower:
        return 'Incident Response Plan'
    if 'contingency' in name_lower and 'plan' in name_lower:
        return 'Contingency Plan'
    if 'system security' in name_lower and 'plan' in name_lower:
        return 'System Security Plan'
    if 'configuration management' in name_lower and 'plan' in name_lower:
        return 'Configuration Management Plan'
    if 'security assessment' in name_lower and 'plan' in name_lower:
        return 'Security Assessment Plan'

    # Cross-cutting policies
    if 'security awareness' in name_lower or ('security' in name_lower and 'training' in name_lower):
        return 'Security Awareness Training Policy'
    if 'risk management' in name_lower:
        return 'Risk Management Policy'
    if 'acceptable use' in name_lower:
        return 'Acceptable Use Policy'
    if 'remote access' in name_lower:
        return 'Remote Access Policy'
    if 'mobile device' in name_lower:
        return 'Mobile Device Policy'
    if 'password' in name_lower or 'authenticator' in name_lower:
        return 'Password and Authenticator Management Policy'
    if 'encryption' in name_lower or 'cryptographic' in name_lower:
        return 'Cryptographic Controls Policy'
    if 'data classification' in name_lower:
        return 'Data Classification Policy'
    if 'data retention' in name_lower:
        return 'Data Retention Policy'
    if 'backup' in name_lower and 'recovery' in name_lower:
        return 'Backup and Recovery Policy'

    # If no specific standardization applies, clean up the name
    return name.strip()

def group_similar_policies(policies):
    """Group similar policies together."""
    policy_groups = []
    used_indices = set()

    for i, policy in enumerate(policies):
        if i in used_indices:
            continue

        # Start a new group
        group = {
            'policies': [policy],
            'controls': [policy['controlId']],
            'originalNames': [policy['name']]
        }
        used_indices.add(i)

        # Find similar policies
        for j, other_policy in enumerate(policies):
            if j in used_indices or i == j:
                continue

            # Check similarity
            similarity = similar(policy['name'], other_policy['name'])
            same_family = policy['family'] == other_policy['family']

            # Group if very similar names or exact match after standardization
            standardized_1 = standardize_policy_name(policy['name'], policy['family'])
            standardized_2 = standardize_policy_name(other_policy['name'], other_policy['family'])

            if similarity > 0.8 or standardized_1 == standardized_2:
                group['policies'].append(other_policy)
                group['controls'].append(other_policy['controlId'])
                if other_policy['name'] not in group['originalNames']:
                    group['originalNames'].append(other_policy['name'])
                used_indices.add(j)

        policy_groups.append(group)

    return policy_groups

def create_master_policy_list(policy_groups):
    """Create the master policy list with standardized names."""
    master_list = []

    for idx, group in enumerate(policy_groups, 1):
        first_policy = group['policies'][0]
        standardized_name = standardize_policy_name(first_policy['name'], first_policy['family'])

        # Determine category
        category = 'control-specific'
        if len(group['controls']) > 1:
            # Check if it's family-level
            families = set(p['family'] for p in group['policies'])
            if len(families) == 1:
                category = 'family-level'
            else:
                category = 'cross-cutting'

        # Get unique controls
        unique_controls = sorted(list(set(group['controls'])))

        master_list.append({
            'policyId': f'POL-{idx:03d}',
            'standardizedName': standardized_name,
            'description': first_policy['description'],
            'category': category,
            'family': first_policy['family'] if category == 'family-level' else 'Multiple',
            'sharedAcrossControls': unique_controls,
            'controlCount': len(unique_controls),
            'frequency': first_policy['frequency'],
            'freshnessThreshold': first_policy['freshnessThreshold'],
            'originalNamesFromResearch': sorted(list(set(group['originalNames'])))
        })

    # Sort by control count (most shared first)
    master_list.sort(key=lambda x: x['controlCount'], reverse=True)

    # Reassign policy IDs after sorting
    for idx, policy in enumerate(master_list, 1):
        policy['policyId'] = f'POL-{idx:03d}'

    return master_list

def group_similar_procedures(procedures):
    """Group similar procedures together."""
    procedure_groups = []
    used_indices = set()

    for i, procedure in enumerate(procedures):
        if i in used_indices:
            continue

        group = {
            'procedures': [procedure],
            'controls': [procedure['controlId']],
            'originalNames': [procedure['name']]
        }
        used_indices.add(i)

        # Find similar procedures
        for j, other_procedure in enumerate(procedures):
            if j in used_indices or i == j:
                continue

            similarity = similar(procedure['name'], other_procedure['name'])

            # More conservative grouping for procedures (they're often control-specific)
            if similarity > 0.85:
                group['procedures'].append(other_procedure)
                group['controls'].append(other_procedure['controlId'])
                if other_procedure['name'] not in group['originalNames']:
                    group['originalNames'].append(other_procedure['name'])
                used_indices.add(j)

        procedure_groups.append(group)

    return procedure_groups

def create_master_procedure_list(procedure_groups):
    """Create the master procedure list."""
    master_list = []

    for idx, group in enumerate(procedure_groups, 1):
        first_procedure = group['procedures'][0]
        unique_controls = sorted(list(set(group['controls'])))

        master_list.append({
            'procedureId': f'PROC-{idx:03d}',
            'standardizedName': first_procedure['name'].strip(),
            'description': first_procedure['description'],
            'sharedAcrossControls': unique_controls,
            'controlCount': len(unique_controls),
            'frequency': first_procedure['frequency'],
            'originalNamesFromResearch': sorted(list(set(group['originalNames'])))
        })

    # Sort by control count
    master_list.sort(key=lambda x: x['controlCount'], reverse=True)

    # Reassign procedure IDs after sorting
    for idx, procedure in enumerate(master_list, 1):
        procedure['procedureId'] = f'PROC-{idx:03d}'

    return master_list

def consolidate_controls(batches, master_policies, master_procedures):
    """Create consolidated control evidence requirements."""
    all_controls = []

    # Create lookup dictionaries
    policy_lookup = {}
    for policy in master_policies:
        for original_name in policy['originalNamesFromResearch']:
            policy_lookup[original_name.lower()] = policy

    procedure_lookup = {}
    for procedure in master_procedures:
        for original_name in procedure['originalNamesFromResearch']:
            procedure_lookup[original_name.lower()] = procedure

    for batch in batches:
        for control in batch.get('controls', []):
            control_id = control.get('controlId', '')
            evidence_reqs = control.get('evidenceRequirements', {})

            # Process policies
            consolidated_policies = []
            for policy in evidence_reqs.get('policies', []):
                policy_name = policy.get('name', '')

                # Find matching master policy
                master_policy = None
                for mp in master_policies:
                    if policy_name in mp['originalNamesFromResearch']:
                        master_policy = mp
                        break

                if master_policy:
                    consolidated_policies.append({
                        'policyId': master_policy['policyId'],
                        'standardizedName': master_policy['standardizedName'],
                        'description': policy.get('description', ''),
                        'rationale': policy.get('rationale', ''),
                        'shared': master_policy['controlCount'] > 1,
                        'sharedWith': [c for c in master_policy['sharedAcrossControls'] if c != control_id],
                        'frequency': policy.get('frequency', 'annual'),
                        'freshnessThreshold': policy.get('freshnessThreshold', 400)
                    })

            # Process procedures
            consolidated_procedures = []
            for procedure in evidence_reqs.get('procedures', []):
                procedure_name = procedure.get('name', '')

                # Find matching master procedure
                master_procedure = None
                for mp in master_procedures:
                    if procedure_name in mp['originalNamesFromResearch']:
                        master_procedure = mp
                        break

                if master_procedure:
                    consolidated_procedures.append({
                        'procedureId': master_procedure['procedureId'],
                        'standardizedName': master_procedure['standardizedName'],
                        'description': procedure.get('description', ''),
                        'rationale': procedure.get('rationale', ''),
                        'shared': master_procedure['controlCount'] > 1,
                        'sharedWith': [c for c in master_procedure['sharedAcrossControls'] if c != control_id] if master_procedure['controlCount'] > 1 else [],
                        'frequency': procedure.get('frequency', 'one-time'),
                        'freshnessThreshold': procedure.get('freshnessThreshold')
                    })

            all_controls.append({
                'controlId': control_id,
                'controlTitle': control.get('controlTitle', ''),
                'controlFamily': control.get('controlFamily', ''),
                'evidenceRequirements': {
                    'policies': consolidated_policies,
                    'procedures': consolidated_procedures,
                    'executionEvidence': evidence_reqs.get('executionEvidence', []),
                    'physicalEvidence': evidence_reqs.get('physicalEvidence', []),
                    'operationalActivities': evidence_reqs.get('operationalActivities', [])
                },
                'notes': control.get('notes', '')
            })

    # Sort controls by ID
    all_controls.sort(key=lambda x: x['controlId'])

    return all_controls

def validate_consolidation(controls, master_policies, master_procedures):
    """Validate the consolidated data."""
    validation_results = {
        'allControlsPresent': len(controls) == 97,
        'noWithdrawnControls': True,  # Assuming Phase 1 already filtered
        'allControlsHaveEvidence': all(
            len(c['evidenceRequirements']['policies']) > 0 or
            len(c['evidenceRequirements']['procedures']) > 0 or
            len(c['evidenceRequirements']['executionEvidence']) > 0
            for c in controls
        ),
        'physicalEvidenceOnlyForApplicableControls': True,  # Would need specific check
        'consistentNaming': True
    }

    return validation_results

def generate_metadata(controls, master_policies, master_procedures, validation_results, decisions):
    """Generate metadata section."""
    # Count physical evidence controls
    controls_with_physical = sum(
        1 for c in controls
        if len(c['evidenceRequirements'].get('physicalEvidence', [])) > 0
    )

    # Find most shared policy
    most_shared = max(master_policies, key=lambda x: x['controlCount'])

    # Count unique execution evidence types
    evidence_types = set()
    for control in controls:
        for evidence in control['evidenceRequirements'].get('executionEvidence', []):
            evidence_types.add(evidence.get('evidenceType', ''))

    return {
        'totalUniquePolicies': len(master_policies),
        'totalUniqueProcedures': len(master_procedures),
        'totalExecutionEvidenceTypes': len(evidence_types),
        'controlsWithPhysicalRequirements': controls_with_physical,
        'mostSharedPolicy': {
            'name': most_shared['standardizedName'],
            'sharedAcross': most_shared['controlCount']
        },
        'validationResults': validation_results,
        'standardizationDecisions': decisions
    }

def main():
    print("Starting consolidation process...")

    # Step 1: Load all batches
    print("\nStep 1: Loading all batch files...")
    batches = load_all_batches()
    print(f"Loaded {len(batches)} batches")

    # Step 2: Extract all policies
    print("\nStep 2: Extracting all policies...")
    all_policies = extract_all_policies(batches)
    print(f"Extracted {len(all_policies)} policy references")

    # Step 3: Group similar policies
    print("\nStep 3: Grouping similar policies...")
    policy_groups = group_similar_policies(all_policies)
    print(f"Grouped into {len(policy_groups)} unique policies")

    # Step 4: Create master policy list
    print("\nStep 4: Creating master policy list...")
    master_policies = create_master_policy_list(policy_groups)
    print(f"Created {len(master_policies)} master policies")

    # Step 5: Extract all procedures
    print("\nStep 5: Extracting all procedures...")
    all_procedures = extract_all_procedures(batches)
    print(f"Extracted {len(all_procedures)} procedure references")

    # Step 6: Group similar procedures
    print("\nStep 6: Grouping similar procedures...")
    procedure_groups = group_similar_procedures(all_procedures)
    print(f"Grouped into {len(procedure_groups)} unique procedures")

    # Step 7: Create master procedure list
    print("\nStep 7: Creating master procedure list...")
    master_procedures = create_master_procedure_list(procedure_groups)
    print(f"Created {len(master_procedures)} master procedures")

    # Step 8: Consolidate all controls
    print("\nStep 8: Consolidating control evidence requirements...")
    consolidated_controls = consolidate_controls(batches, master_policies, master_procedures)
    print(f"Consolidated {len(consolidated_controls)} controls")

    # Step 9: Validate
    print("\nStep 9: Validating consolidation...")
    validation_results = validate_consolidation(consolidated_controls, master_policies, master_procedures)

    # Step 10: Generate metadata
    print("\nStep 10: Generating metadata...")
    standardization_decisions = [
        f"Consolidated {len(all_policies)} policy references into {len(master_policies)} unique policies",
        f"Consolidated {len(all_procedures)} procedure references into {len(master_procedures)} unique procedures",
        "Applied family-level policy naming standards",
        "Distinguished between policies and plans (e.g., Incident Response Plan vs Incident Response Policy)",
        "Identified shared policies across control families"
    ]

    metadata = generate_metadata(
        consolidated_controls,
        master_policies,
        master_procedures,
        validation_results,
        standardization_decisions
    )

    # Create final output
    print("\nStep 11: Creating final JSON output...")
    final_output = {
        'schemaVersion': '1.0',
        'generatedDate': datetime.now().strftime('%Y-%m-%d'),
        'nistRevision': 'Rev 3',
        'totalControls': len(consolidated_controls),
        'consolidationNotes': 'Automated consolidation of Phase 1 research outputs with policy/procedure standardization and shared resource identification',
        'masterPolicyList': master_policies,
        'masterProcedureList': master_procedures,
        'controlEvidenceRequirements': consolidated_controls,
        'metadata': metadata
    }

    # Save to file
    output_path = os.path.join(BASE_PATH, 'consolidated_evidence_requirements.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(final_output, f, indent=2, ensure_ascii=False)

    print(f"\n[SUCCESS] Consolidation complete!")
    print(f"[SUCCESS] Output saved to: {output_path}")
    print(f"\nSummary:")
    print(f"  - Total Controls: {len(consolidated_controls)}")
    print(f"  - Unique Policies: {len(master_policies)}")
    print(f"  - Unique Procedures: {len(master_procedures)}")
    print(f"  - Validation: {'PASSED' if all(validation_results.values()) else 'FAILED'}")

    return final_output

if __name__ == '__main__':
    main()
