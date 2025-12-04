import json

with open('consolidated_evidence_requirements.json', encoding='utf-8') as f:
    data = json.load(f)

print('=== TOP 10 MOST SHARED POLICIES ===\n')
for i, policy in enumerate(data['masterPolicyList'][:10], 1):
    print(f'{i}. {policy["standardizedName"]} ({policy["policyId"]})')
    controls_preview = ', '.join(policy["sharedAcrossControls"][:5])
    if policy["controlCount"] > 5:
        controls_preview += f'... +{policy["controlCount"]-5} more'
    print(f'   Shared across {policy["controlCount"]} controls: {controls_preview}')
    print(f'   Category: {policy["category"]} | Family: {policy["family"]}')

    # Show original names if there were variations
    if len(policy["originalNamesFromResearch"]) > 1:
        names_preview = ', '.join(policy["originalNamesFromResearch"][:3])
        if len(policy["originalNamesFromResearch"]) > 3:
            names_preview += f'... +{len(policy["originalNamesFromResearch"])-3} more'
        print(f'   Consolidated from: {names_preview}')
    print()

print('\n=== TOP 5 MOST SHARED PROCEDURES ===\n')
for i, proc in enumerate(data['masterProcedureList'][:5], 1):
    print(f'{i}. {proc["standardizedName"]} ({proc["procedureId"]})')
    print(f'   Shared across {proc["controlCount"]} controls: {", ".join(proc["sharedAcrossControls"])}')
    print()

print(f'\n=== STANDARDIZATION DECISIONS ===\n')
for decision in data['metadata']['standardizationDecisions']:
    print(f'- {decision}')
