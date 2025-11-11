# Phase 6 Quick Reference Guide

## 📚 Overview

Phase 6 implements Microsoft 365 integration for automated NIST 800-171 Rev3 compliance checking. This guide provides a quick reference for all six parts.

## 🗂️ Documentation Files

```
Phase 6 Documentation:
├── PHASE_6_OVERVIEW.md               # Master plan and prerequisites
├── PHASE_6_PART_1_DATABASE_SCHEMA.md # Database tables and types
├── PHASE_6_PART_2_BACKEND_AUTH.md    # MSAL backend authentication
├── PHASE_6_PART_3_GRAPH_API.md       # Microsoft Graph API services
├── PHASE_6_PART_4_POLICY_MAPPING.md  # Policy sync and mapping logic
├── PHASE_6_PART_5_FRONTEND_AUTH.md   # MSAL React authentication
└── PHASE_6_PART_6_FRONTEND_DASHBOARD.md # M365 Dashboard UI
```

## ⚡ Quick Start Checklist

### Prerequisites (Before Starting)
- [ ] Azure AD admin access
- [ ] Microsoft 365 E5 license (or equivalent)
- [ ] Phases 1-5 completed
- [ ] Node.js 18+ installed
- [ ] Database initialized with controls

### Part 1: Database Schema (1-2 hours)
**Key Files:**
- `server/prisma/schema.prisma` - Add 4 new models
- `server/src/types/m365.types.ts` - TypeScript types
- `shared/types/m365.types.ts` - Shared types

**Commands:**
```bash
cd server
npx prisma migrate dev --name add_m365_integration
npx prisma generate
```

**Verify:** Check tables in Prisma Studio

---

### Part 2: Backend Auth (2-3 hours)
**Azure Setup:**
1. Create Azure AD app registration
2. Get Tenant ID, Client ID, Client Secret
3. Configure API permissions (Application type)
4. Grant admin consent

**Key Files:**
- `server/src/config/msal.config.ts` - MSAL config
- `server/src/services/auth.service.ts` - Auth service
- `server/src/services/graphClient.service.ts` - Graph client
- `server/src/routes/auth.routes.ts` - Auth endpoints
- `server/.env` - Add Azure credentials

**Commands:**
```bash
npm install @azure/msal-node @microsoft/microsoft-graph-client isomorphic-fetch
npm run test:auth
```

**Verify:** `curl http://localhost:3001/api/auth/status` returns connected: true

---

### Part 3: Graph API Integration (3-4 hours)
**Key Files:**
- `server/src/services/intune.service.ts` - Intune API calls
- `server/src/services/purview.service.ts` - Purview API calls
- `server/src/services/azureAD.service.ts` - Azure AD API calls
- `server/src/routes/m365.routes.ts` - M365 endpoints

**Commands:**
```bash
npm run test:m365
curl http://localhost:3001/api/m365/dashboard | jq
```

**Verify:** Dashboard endpoint returns policy data from all three services

---

### Part 4: Policy Mapping (3-4 hours)
**Key Files:**
- `data/control-m365-mappings.json` - Mapping templates
- `server/src/services/policySync.service.ts` - Sync logic

**Commands:**
```bash
npm run test:sync
curl -X POST http://localhost:3001/api/m365/sync
```

**Verify:** 
- Policies stored in `m365_policies` table
- Mappings created in `control_policy_mappings` table

---

### Part 5: Frontend Auth (2-3 hours)
**Azure Setup:**
1. Add SPA redirect URI: `http://localhost:3000/auth/callback`
2. Add Delegated permissions
3. Grant consent

**Key Files:**
- `client/src/config/msal.config.ts` - MSAL config
- `client/src/contexts/AuthContext.tsx` - Auth context
- `client/src/main.tsx` - Add MsalProvider
- `client/src/pages/Login.tsx` - Login page
- `client/.env` - Add Azure credentials

**Commands:**
```bash
cd client
npm install @azure/msal-browser @azure/msal-react
npm run dev
```

**Verify:** 
- Login flow works
- User can authenticate
- Logout works

---

### Part 6: M365 Dashboard (3-4 hours)
**Key Files:**
- `client/src/services/m365.service.ts` - API service
- `client/src/pages/M365Dashboard.tsx` - Dashboard page
- `client/src/components/m365/PolicyList.tsx` - Policy list

**Verify:**
- Dashboard displays M365 data
- Sync button triggers backend sync
- Policy counts update
- Service cards show status

---

## 🔑 Environment Variables

### Backend (.env)
```env
PORT=3001
DATABASE_URL="file:../database/compliance.db"

# Azure AD
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
GRAPH_API_ENDPOINT=https://graph.microsoft.com/v1.0

SESSION_SECRET=your-random-secret
CLIENT_URL=http://localhost:3000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001/api
VITE_AZURE_TENANT_ID=your-tenant-id
VITE_AZURE_CLIENT_ID=your-client-id
VITE_AZURE_REDIRECT_URI=http://localhost:3000/auth/callback
```

---

## 🧪 Testing Commands

```bash
# Backend
cd server
npm run test:auth          # Test authentication
npm run test:m365          # Test M365 services
npm run test:sync          # Test policy sync

# Check endpoints
curl http://localhost:3001/api/auth/status
curl http://localhost:3001/api/m365/dashboard
curl -X POST http://localhost:3001/api/m365/sync

# Frontend
cd client
npm run dev
# Navigate to http://localhost:3000
```

---

## 📊 Database Tables Added

```sql
-- m365_policies: Stores synced M365 policies
-- control_policy_mappings: Maps policies to controls
-- m365_settings: Integration configuration
-- m365_sync_logs: Sync history tracking
```

---

## 🔌 API Endpoints Added

```
Auth:
GET  /api/auth/status          # Check M365 connection
GET  /api/auth/test-graph      # Test Graph API
POST /api/auth/refresh-token   # Refresh access token

M365:
GET  /api/m365/dashboard       # Combined overview
GET  /api/m365/stats           # Integration statistics
GET  /api/m365/sync/status     # Sync status and history
POST /api/m365/sync            # Trigger manual sync
GET  /api/m365/policies        # Get all policies
GET  /api/m365/intune/*        # Intune endpoints
GET  /api/m365/purview/*       # Purview endpoints
GET  /api/m365/azuread/*       # Azure AD endpoints
```

---

## 🎯 Key NIST Control Mappings

Examples of automatic mappings:

| Control | Title | M365 Service | Mapping |
|---------|-------|--------------|---------|
| 3.1.1 | Limit system access | Azure AD | Conditional Access |
| 3.5.3 | Use MFA | Azure AD | MFA Policies |
| 3.13.1 | Monitor boundaries | Intune | Defender, Firewall |
| 3.13.11 | Encrypt at rest | Intune | BitLocker Policies |
| 3.1.3 | Control CUI flow | Purview | DLP Policies |

---

## ⚠️ Common Issues & Solutions

### Issue: Authentication Fails
**Solution:** 
- Verify Azure AD app registration
- Check permissions granted
- Wait 5-10 minutes for permissions to propagate
- Clear token cache: `POST /api/auth/refresh-token`

### Issue: Empty Dashboard
**Solution:**
- Trigger manual sync first
- Check if Intune/Purview is configured in your tenant
- Verify API permissions include both Application AND Delegated

### Issue: Sync Errors
**Solution:**
- Check `m365_sync_logs` table for error messages
- Verify network connectivity to graph.microsoft.com
- Check if device enrollment exists in Intune

### Issue: Frontend Login Popup Blocked
**Solution:**
- Allow popups for localhost
- Alternative: Switch to redirect flow in msal.config.ts

---

## 📈 Success Metrics

Phase 6 is complete when:
- ✅ Backend authenticates with Azure AD
- ✅ Policies sync from Intune, Purview, and Azure AD
- ✅ Policies mapped to controls in database
- ✅ Frontend login works with Microsoft account
- ✅ M365 Dashboard displays integration status
- ✅ Manual sync button updates data
- ✅ All 6 parts tested and verified

---

## 🚀 Next Steps After Phase 6

1. **Test with Real Data**
   - Sync actual M365 policies
   - Verify mapping accuracy
   - Adjust mapping templates as needed

2. **Enhance Mappings**
   - Add more controls to `control-m365-mappings.json`
   - Increase mapping coverage beyond basic examples
   - Refine confidence levels

3. **Add Features**
   - Manual mapping interface
   - Policy detail views
   - Mapping confidence adjustment
   - Control status auto-update based on policies

4. **Move to Phase 7**
   - Reporting module
   - Generate PDF/Excel reports
   - Include M365 data in reports

---

## 📞 Support Resources

- **Azure AD**: https://portal.azure.com
- **Graph API Docs**: https://docs.microsoft.com/en-us/graph/
- **MSAL Docs**: https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-overview
- **NIST 800-171 Rev3**: https://csrc.nist.gov/publications/detail/sp/800-171/rev-3/final

---

## 🎓 Learning Resources

- **Microsoft Graph Explorer**: https://developer.microsoft.com/en-us/graph/graph-explorer
- **MSAL React Tutorial**: https://docs.microsoft.com/en-us/azure/active-directory/develop/tutorial-v2-react
- **Intune Graph API**: https://docs.microsoft.com/en-us/graph/api/resources/intune-graph-overview

---

**Phase 6 Total Time Estimate**: 16-22 hours (over 2-3 weeks)

**Complexity**: High (OAuth flows, external APIs, complex data mapping)

**Critical Success Factors**:
1. Proper Azure AD configuration
2. Correct API permissions
3. Understanding of Microsoft Graph API
4. Good error handling
5. Comprehensive testing

---

*This guide serves as a quick reference. Refer to individual part files for detailed implementation instructions.*
