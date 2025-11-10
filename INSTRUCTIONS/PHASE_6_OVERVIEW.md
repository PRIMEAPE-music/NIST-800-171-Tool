# Phase 6: Microsoft 365 Integration - Master Overview

## 🎯 Goal
Implement automated compliance checking via Microsoft 365 APIs (Intune, Purview, Azure AD/Entra ID) to automatically assess and update NIST 800-171 Rev3 control implementation status.

## 📋 Prerequisites
Before starting Phase 6, ensure the following are complete:
- ✅ Phase 1-5 completed (database, core control management, assessments, POAMs, evidence)
- ✅ Azure AD admin access available
- ✅ Microsoft 365 E5 license (or appropriate licenses for Intune, Purview, Azure AD)
- ✅ Ability to register Azure AD applications

## 🗂️ Phase 6 Sub-Components

This phase is broken into 6 sequential parts:

### Part 1: Database Schema & Types
- **File**: `PHASE_6_PART_1_DATABASE_SCHEMA.md`
- **Purpose**: Add M365 integration tables to Prisma schema
- **Deliverables**: 
  - Updated Prisma schema with m365_policies, control_policy_mappings tables
  - TypeScript types for M365 data structures
  - Database migration files

### Part 2: Backend Authentication Setup
- **File**: `PHASE_6_PART_2_BACKEND_AUTH.md`
- **Purpose**: Implement MSAL authentication flow on backend
- **Deliverables**:
  - MSAL configuration and middleware
  - Token management service
  - Auth routes (/api/auth/*)
  - Session management

### Part 3: Microsoft Graph API Integration
- **File**: `PHASE_6_PART_3_GRAPH_API.md`
- **Purpose**: Create services for Intune, Purview, and Azure AD APIs
- **Deliverables**:
  - Graph API client setup
  - Intune service (device compliance, policies)
  - Purview service (DLP, sensitivity labels)
  - Azure AD service (MFA, conditional access)
  - API routes for M365 data

### Part 4: Policy Mapping & Sync Logic
- **File**: `PHASE_6_PART_4_POLICY_MAPPING.md`
- **Purpose**: Map M365 policies to NIST controls and sync data
- **Deliverables**:
  - Policy sync service
  - Control-to-policy mapping logic
  - Predefined mapping templates (control_m365_mappings.json)
  - Auto-update control status based on policies
  - Manual sync endpoint

### Part 5: Frontend MSAL & Auth Flow
- **File**: `PHASE_6_PART_5_FRONTEND_AUTH.md`
- **Purpose**: Implement MSAL in React for user authentication
- **Deliverables**:
  - MSAL React configuration
  - Auth context provider
  - Protected routes
  - Login/logout components
  - Token refresh handling

### Part 6: M365 Dashboard & UI Components
- **File**: `PHASE_6_PART_6_FRONTEND_DASHBOARD.md`
- **Purpose**: Build UI for M365 integration status and management
- **Deliverables**:
  - M365 Dashboard page
  - Integration settings page
  - Policy mapper component
  - Intune/Purview/Azure AD data displays
  - Manual sync trigger UI
  - Integration health indicators

## 🔑 Key Technical Decisions

### Authentication Strategy
- **Backend**: MSAL Node with client credentials flow (app-only access)
- **Frontend**: MSAL React with interactive login (delegated access)
- **Token Storage**: Backend tokens in memory, frontend tokens via MSAL cache

### API Permissions Required
```
Microsoft Graph API - Delegated:
- User.Read
- DeviceManagementConfiguration.Read.All
- DeviceManagementManagedDevices.Read.All
- InformationProtectionPolicy.Read
- SecurityEvents.Read.All
- Directory.Read.All
- Policy.Read.All
```

### Data Sync Strategy
- **Initial sync**: On-demand manual trigger
- **Incremental updates**: Track last_synced timestamp
- **Polling interval**: Configurable (default: 24 hours)
- **Cache strategy**: Store policy data locally, refresh periodically

## 📦 New Dependencies

### Backend
```json
{
  "@azure/msal-node": "^2.6.0",
  "@microsoft/microsoft-graph-client": "^3.0.7",
  "isomorphic-fetch": "^3.0.0"
}
```

### Frontend
```json
{
  "@azure/msal-browser": "^3.7.0",
  "@azure/msal-react": "^2.0.0"
}
```

## 🗃️ New Database Tables

### m365_policies
```typescript
{
  id: number
  policy_type: 'Intune' | 'Purview' | 'AzureAD'
  policy_id: string (from M365)
  policy_name: string
  policy_description: string
  policy_data: JSON (full policy object)
  last_synced: DateTime
  is_active: boolean
  created_at: DateTime
  updated_at: DateTime
}
```

### control_policy_mappings
```typescript
{
  id: number
  control_id: number (FK -> controls.id)
  policy_id: number (FK -> m365_policies.id)
  mapping_confidence: 'High' | 'Medium' | 'Low'
  mapping_notes: string
  created_at: DateTime
}
```

## 🚀 Implementation Order

Execute in this exact sequence:

1. **Part 1** - Database schema (foundation for all data)
2. **Part 2** - Backend auth (required for API calls)
3. **Part 3** - Graph API integration (data fetching)
4. **Part 4** - Policy mapping (business logic)
5. **Part 5** - Frontend auth (user access)
6. **Part 6** - Frontend UI (user interface)

## 🧪 Testing Strategy

### Unit Tests
- MSAL token acquisition
- Graph API client methods
- Policy mapping logic
- Control status update logic

### Integration Tests
- Full auth flow (login -> token -> API call)
- Policy sync end-to-end
- Control status auto-update

### Manual Testing Checklist
- [ ] Azure AD login successful
- [ ] Intune policies fetched
- [ ] Purview policies fetched
- [ ] Azure AD policies fetched
- [ ] Policies mapped to correct controls
- [ ] Control status updates automatically
- [ ] Manual sync triggers successfully
- [ ] Integration health shows correct status
- [ ] Error handling displays properly

## 🔒 Security Considerations

1. **Secrets Management**
   - Store client secret in .env file only
   - Never commit secrets to git
   - Use environment variables for all sensitive config

2. **Token Security**
   - Backend tokens stored in memory only
   - Frontend tokens in MSAL secure cache
   - Automatic token refresh
   - Clear tokens on logout

3. **API Permissions**
   - Request minimum necessary permissions
   - Use read-only permissions where possible
   - Document why each permission is needed

4. **Error Handling**
   - Never expose sensitive error details to frontend
   - Log authentication failures securely
   - Implement rate limiting for auth endpoints

## 📊 Success Criteria

Phase 6 is complete when:
- ✅ User can authenticate with Microsoft account
- ✅ Application can fetch Intune policies
- ✅ Application can fetch Purview policies
- ✅ Application can fetch Azure AD policies
- ✅ Policies are correctly mapped to NIST controls
- ✅ Control status updates based on policy detection
- ✅ M365 Dashboard displays integration status
- ✅ Manual sync can be triggered from UI
- ✅ Integration errors are handled gracefully
- ✅ Documentation for Azure AD setup is complete

## 📝 Notes for NIST 800-171 Rev3

Key changes from Rev2 to Rev3:
- Control numbering remains same (110 controls)
- Some requirement text updated for clarity
- Enhanced guidance for cloud environments
- Updated discussion sections
- No new controls added, some combined

**Important**: Ensure all control text references Rev3 documentation.

## 🔗 Related Files

- Project Instructions: `/mnt/project/NIST_Tool_Overview_Instructions.md`
- NIST 800-171 Rev3 PDF: `/mnt/project/NIST_SP_800-171r3.pdf`

## 🎯 Next Steps

1. Review this overview document
2. Start with Part 1 (Database Schema)
3. Follow sequential order through Part 6
4. Test each part before moving to next
5. Document any deviations or issues

---

**Estimated Time**: 3-4 weeks (Weeks 9-11 of original plan)
**Complexity**: High (external API integration, OAuth flow)
**Risk Level**: Medium (depends on Azure AD permissions)
