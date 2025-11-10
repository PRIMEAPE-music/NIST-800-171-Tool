# Phase 6 Part 3: Microsoft Graph API Integration

## 🎯 Objective
Implement services to fetch policy data from Microsoft Intune, Purview, and Azure AD using Microsoft Graph API.

## 📋 Prerequisites
- Part 1 completed (database schema)
- Part 2 completed (authentication working)
- `/api/auth/test-graph` returns success
- Access token can be acquired

## 📦 Additional Dependencies

```bash
cd server

# These should already be installed from Part 2, but verify:
npm install @microsoft/microsoft-graph-client @microsoft/microsoft-graph-types isomorphic-fetch

npm install -D @types/microsoft-graph
```

## 🗂️ Files to Create

### 1. Intune Service

**📁 File**: `server/src/services/intune.service.ts`

🔄 **COMPLETE FILE**:

```typescript
import { graphClientService } from './graphClient.service';
import { IntuneDeviceCompliancePolicy, IntuneConfigurationPolicy } from '../types/m365.types';

class IntuneService {
  /**
   * Fetch all device compliance policies from Intune
   */
  async getDeviceCompliancePolicies(): Promise<IntuneDeviceCompliancePolicy[]> {
    try {
      console.log('Fetching Intune device compliance policies...');
      
      const response = await graphClientService.get<{ value: IntuneDeviceCompliancePolicy[] }>(
        '/deviceManagement/deviceCompliancePolicies'
      );

      console.log(`✅ Found ${response.value.length} device compliance policies`);
      return response.value;
    } catch (error) {
      console.error('Error fetching device compliance policies:', error);
      throw new Error(`Failed to fetch Intune compliance policies: ${error}`);
    }
  }

  /**
   * Fetch all device configuration policies from Intune
   */
  async getDeviceConfigurationPolicies(): Promise<IntuneConfigurationPolicy[]> {
    try {
      console.log('Fetching Intune device configuration policies...');
      
      const response = await graphClientService.get<{ value: IntuneConfigurationPolicy[] }>(
        '/deviceManagement/deviceConfigurations'
      );

      console.log(`✅ Found ${response.value.length} device configuration policies`);
      return response.value;
    } catch (error) {
      console.error('Error fetching device configuration policies:', error);
      throw new Error(`Failed to fetch Intune configuration policies: ${error}`);
    }
  }

  /**
   * Fetch device enrollment restrictions
   */
  async getDeviceEnrollmentRestrictions(): Promise<any[]> {
    try {
      console.log('Fetching device enrollment restrictions...');
      
      const response = await graphClientService.get<{ value: any[] }>(
        '/deviceManagement/deviceEnrollmentConfigurations'
      );

      console.log(`✅ Found ${response.value.length} enrollment restrictions`);
      return response.value;
    } catch (error) {
      console.error('Error fetching enrollment restrictions:', error);
      return []; // Non-critical, return empty array
    }
  }

  /**
   * Get count of managed devices
   */
  async getManagedDeviceCount(): Promise<number> {
    try {
      const response = await graphClientService.get<{ value: any[] }>(
        '/deviceManagement/managedDevices?$select=id&$top=999'
      );

      return response.value.length;
    } catch (error) {
      console.error('Error fetching managed device count:', error);
      return 0;
    }
  }

  /**
   * Check if specific security features are enabled
   */
  async checkSecurityFeatures(): Promise<{
    bitLockerEnabled: boolean;
    firewallEnabled: boolean;
    antivirusEnabled: boolean;
  }> {
    try {
      const compliancePolicies = await this.getDeviceCompliancePolicies();
      
      // Check for BitLocker requirements
      const bitLockerEnabled = compliancePolicies.some(policy => 
        (policy as any).bitLockerEnabled === true ||
        (policy as any).requireEncryption === true
      );

      // Check for Firewall requirements
      const firewallEnabled = compliancePolicies.some(policy =>
        (policy as any).firewallRequired === true
      );

      // Check for Antivirus requirements
      const antivirusEnabled = compliancePolicies.some(policy =>
        (policy as any).antivirusRequired === true ||
        (policy as any).defenderEnabled === true
      );

      return {
        bitLockerEnabled,
        firewallEnabled,
        antivirusEnabled,
      };
    } catch (error) {
      console.error('Error checking security features:', error);
      return {
        bitLockerEnabled: false,
        firewallEnabled: false,
        antivirusEnabled: false,
      };
    }
  }

  /**
   * Get all Intune policies combined
   */
  async getAllPolicies(): Promise<{
    compliancePolicies: IntuneDeviceCompliancePolicy[];
    configurationPolicies: IntuneConfigurationPolicy[];
    enrollmentRestrictions: any[];
    deviceCount: number;
  }> {
    const [compliancePolicies, configurationPolicies, enrollmentRestrictions, deviceCount] = 
      await Promise.all([
        this.getDeviceCompliancePolicies(),
        this.getDeviceConfigurationPolicies(),
        this.getDeviceEnrollmentRestrictions(),
        this.getManagedDeviceCount(),
      ]);

    return {
      compliancePolicies,
      configurationPolicies,
      enrollmentRestrictions,
      deviceCount,
    };
  }
}

export const intuneService = new IntuneService();
```

### 2. Purview Service

**📁 File**: `server/src/services/purview.service.ts`

🔄 **COMPLETE FILE**:

```typescript
import { graphClientService } from './graphClient.service';
import { PurviewSensitivityLabel } from '../types/m365.types';

class PurviewService {
  /**
   * Fetch information protection sensitivity labels
   */
  async getSensitivityLabels(): Promise<PurviewSensitivityLabel[]> {
    try {
      console.log('Fetching Purview sensitivity labels...');
      
      const response = await graphClientService.get<{ value: PurviewSensitivityLabel[] }>(
        '/informationProtection/policy/labels'
      );

      console.log(`✅ Found ${response.value.length} sensitivity labels`);
      return response.value;
    } catch (error) {
      console.error('Error fetching sensitivity labels:', error);
      // Return empty array if user doesn't have Purview
      return [];
    }
  }

  /**
   * Fetch DLP policies (Note: Limited Graph API support, may need PowerShell)
   */
  async getDLPPolicies(): Promise<any[]> {
    try {
      console.log('Fetching DLP policies...');
      
      // Note: DLP policies have limited Graph API support
      // This is a placeholder - actual implementation may require
      // Security & Compliance PowerShell or different API endpoint
      
      console.log('⚠️  DLP policies require Security & Compliance Center API');
      console.log('   Current Graph API has limited DLP support');
      
      return [];
    } catch (error) {
      console.error('Error fetching DLP policies:', error);
      return [];
    }
  }

  /**
   * Check if information protection is configured
   */
  async isInformationProtectionConfigured(): Promise<boolean> {
    try {
      const labels = await this.getSensitivityLabels();
      return labels.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get information protection summary
   */
  async getInformationProtectionSummary(): Promise<{
    sensitivityLabelsCount: number;
    isConfigured: boolean;
    labels: PurviewSensitivityLabel[];
  }> {
    const labels = await this.getSensitivityLabels();
    
    return {
      sensitivityLabelsCount: labels.length,
      isConfigured: labels.length > 0,
      labels,
    };
  }
}

export const purviewService = new PurviewService();
```

### 3. Azure AD Service

**📁 File**: `server/src/services/azureAD.service.ts`

🔄 **COMPLETE FILE**:

```typescript
import { graphClientService } from './graphClient.service';
import { AzureADConditionalAccessPolicy, AzureADMFAStatus } from '../types/m365.types';

class AzureADService {
  /**
   * Fetch all conditional access policies
   */
  async getConditionalAccessPolicies(): Promise<AzureADConditionalAccessPolicy[]> {
    try {
      console.log('Fetching Azure AD conditional access policies...');
      
      const response = await graphClientService.get<{ value: AzureADConditionalAccessPolicy[] }>(
        '/identity/conditionalAccess/policies'
      );

      console.log(`✅ Found ${response.value.length} conditional access policies`);
      return response.value;
    } catch (error) {
      console.error('Error fetching conditional access policies:', error);
      throw new Error(`Failed to fetch conditional access policies: ${error}`);
    }
  }

  /**
   * Get MFA enforcement status
   */
  async getMFAStatus(): Promise<AzureADMFAStatus> {
    try {
      console.log('Checking MFA enforcement status...');
      
      // Get conditional access policies that enforce MFA
      const policies = await this.getConditionalAccessPolicies();
      
      const mfaPolicies = policies.filter(policy => 
        policy.state === 'enabled' &&
        policy.grantControls?.builtInControls?.includes('mfa')
      );

      // Get total user count
      const usersResponse = await graphClientService.get<{ value: any[] }>(
        '/users?$select=id&$top=999'
      );
      const totalUsers = usersResponse.value.length;

      // Determine enforcement method
      let enforcementMethod = 'None';
      if (mfaPolicies.length > 0) {
        enforcementMethod = 'ConditionalAccess';
      }

      const enabled = mfaPolicies.length > 0;
      
      return {
        enabled,
        enforcementMethod,
        totalUsers,
        usersWithMFA: enabled ? totalUsers : 0, // Simplified assumption
        percentageCompliance: enabled ? 100 : 0,
      };
    } catch (error) {
      console.error('Error checking MFA status:', error);
      return {
        enabled: false,
        enforcementMethod: 'Unknown',
        totalUsers: 0,
        usersWithMFA: 0,
        percentageCompliance: 0,
      };
    }
  }

  /**
   * Get password policies
   */
  async getPasswordPolicies(): Promise<any> {
    try {
      console.log('Fetching password policies...');
      
      const response = await graphClientService.get(
        '/domains'
      );

      return response;
    } catch (error) {
      console.error('Error fetching password policies:', error);
      return null;
    }
  }

  /**
   * Get privileged role assignments
   */
  async getPrivilegedRoleAssignments(): Promise<any[]> {
    try {
      console.log('Fetching privileged role assignments...');
      
      const response = await graphClientService.get<{ value: any[] }>(
        '/directoryRoles'
      );

      return response.value;
    } catch (error) {
      console.error('Error fetching privileged roles:', error);
      return [];
    }
  }

  /**
   * Check if security defaults are enabled
   */
  async areSecurityDefaultsEnabled(): Promise<boolean> {
    try {
      const response = await graphClientService.get<{ isEnabled: boolean }>(
        '/policies/identitySecurityDefaultsEnforcementPolicy'
      );

      return response.isEnabled;
    } catch (error) {
      console.error('Error checking security defaults:', error);
      return false;
    }
  }

  /**
   * Get comprehensive Azure AD security summary
   */
  async getSecuritySummary(): Promise<{
    conditionalAccessPolicies: AzureADConditionalAccessPolicy[];
    mfaStatus: AzureADMFAStatus;
    securityDefaultsEnabled: boolean;
    privilegedRolesCount: number;
  }> {
    const [policies, mfaStatus, securityDefaults, privilegedRoles] = await Promise.all([
      this.getConditionalAccessPolicies(),
      this.getMFAStatus(),
      this.areSecurityDefaultsEnabled(),
      this.getPrivilegedRoleAssignments(),
    ]);

    return {
      conditionalAccessPolicies: policies,
      mfaStatus,
      securityDefaultsEnabled: securityDefaults,
      privilegedRolesCount: privilegedRoles.length,
    };
  }
}

export const azureADService = new AzureADService();
```

### 4. M365 Routes

**📁 File**: `server/src/routes/m365.routes.ts`

🔄 **COMPLETE FILE**:

```typescript
import { Router } from 'express';
import { intuneService } from '../services/intune.service';
import { purviewService } from '../services/purview.service';
import { azureADService } from '../services/azureAD.service';

const router = Router();

/**
 * GET /api/m365/intune/compliance-policies
 * Fetch Intune device compliance policies
 */
router.get('/intune/compliance-policies', async (req, res) => {
  try {
    const policies = await intuneService.getDeviceCompliancePolicies();
    res.json({ success: true, count: policies.length, policies });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/intune/configuration-policies
 * Fetch Intune device configuration policies
 */
router.get('/intune/configuration-policies', async (req, res) => {
  try {
    const policies = await intuneService.getDeviceConfigurationPolicies();
    res.json({ success: true, count: policies.length, policies });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/intune/all
 * Fetch all Intune data
 */
router.get('/intune/all', async (req, res) => {
  try {
    const data = await intuneService.getAllPolicies();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/intune/security-features
 * Check Intune security feature status
 */
router.get('/intune/security-features', async (req, res) => {
  try {
    const features = await intuneService.checkSecurityFeatures();
    res.json({ success: true, features });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/purview/sensitivity-labels
 * Fetch Purview sensitivity labels
 */
router.get('/purview/sensitivity-labels', async (req, res) => {
  try {
    const labels = await purviewService.getSensitivityLabels();
    res.json({ success: true, count: labels.length, labels });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/purview/summary
 * Get Purview information protection summary
 */
router.get('/purview/summary', async (req, res) => {
  try {
    const summary = await purviewService.getInformationProtectionSummary();
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/azuread/conditional-access
 * Fetch Azure AD conditional access policies
 */
router.get('/azuread/conditional-access', async (req, res) => {
  try {
    const policies = await azureADService.getConditionalAccessPolicies();
    res.json({ success: true, count: policies.length, policies });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/azuread/mfa-status
 * Get MFA enforcement status
 */
router.get('/azuread/mfa-status', async (req, res) => {
  try {
    const status = await azureADService.getMFAStatus();
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/azuread/security-summary
 * Get comprehensive Azure AD security summary
 */
router.get('/azuread/security-summary', async (req, res) => {
  try {
    const summary = await azureADService.getSecuritySummary();
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/m365/dashboard
 * Get all M365 data for dashboard (combined)
 */
router.get('/dashboard', async (req, res) => {
  try {
    console.log('Fetching M365 dashboard data...');
    
    const [intuneData, purviewData, azureADData] = await Promise.all([
      intuneService.getAllPolicies().catch(err => {
        console.error('Intune fetch error:', err);
        return null;
      }),
      purviewService.getInformationProtectionSummary().catch(err => {
        console.error('Purview fetch error:', err);
        return null;
      }),
      azureADService.getSecuritySummary().catch(err => {
        console.error('Azure AD fetch error:', err);
        return null;
      }),
    ]);

    const dashboard = {
      timestamp: new Date().toISOString(),
      intune: intuneData ? {
        compliancePoliciesCount: intuneData.compliancePolicies.length,
        configurationPoliciesCount: intuneData.configurationPolicies.length,
        managedDevicesCount: intuneData.deviceCount,
      } : null,
      purview: purviewData ? {
        sensitivityLabelsCount: purviewData.sensitivityLabelsCount,
        isConfigured: purviewData.isConfigured,
      } : null,
      azureAD: azureADData ? {
        conditionalAccessPoliciesCount: azureADData.conditionalAccessPolicies.length,
        mfaEnabled: azureADData.mfaStatus.enabled,
        securityDefaultsEnabled: azureADData.securityDefaultsEnabled,
      } : null,
    };

    res.json({ success: true, dashboard });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
```

### 5. Update Routes Index

**📁 File**: `server/src/routes/index.ts`

🔍 **FIND**:
```typescript
import authRoutes from './auth.routes';

const router = express.Router();

// Auth routes
router.use('/auth', authRoutes);
```

✏️ **REPLACE WITH**:
```typescript
import authRoutes from './auth.routes';
import m365Routes from './m365.routes';

const router = express.Router();

// Auth routes
router.use('/auth', authRoutes);

// M365 integration routes
router.use('/m365', m365Routes);
```

## 🧪 Testing

### 1. Create Test Script

**📁 File**: `server/src/scripts/test-m365-services.ts`

🔄 **COMPLETE FILE**:

```typescript
import { intuneService } from '../services/intune.service';
import { purviewService } from '../services/purview.service';
import { azureADService } from '../services/azureAD.service';

async function testM365Services() {
  console.log('🔬 Testing M365 Services...\n');

  try {
    // Test Intune
    console.log('📱 Testing Intune Service...');
    const intuneData = await intuneService.getAllPolicies();
    console.log(`  ✅ Compliance Policies: ${intuneData.compliancePolicies.length}`);
    console.log(`  ✅ Configuration Policies: ${intuneData.configurationPolicies.length}`);
    console.log(`  ✅ Managed Devices: ${intuneData.deviceCount}\n`);

    // Test Purview
    console.log('🛡️  Testing Purview Service...');
    const purviewData = await purviewService.getInformationProtectionSummary();
    console.log(`  ✅ Sensitivity Labels: ${purviewData.sensitivityLabelsCount}`);
    console.log(`  ✅ Is Configured: ${purviewData.isConfigured}\n`);

    // Test Azure AD
    console.log('🔐 Testing Azure AD Service...');
    const azureADData = await azureADService.getSecuritySummary();
    console.log(`  ✅ Conditional Access Policies: ${azureADData.conditionalAccessPolicies.length}`);
    console.log(`  ✅ MFA Enabled: ${azureADData.mfaStatus.enabled}`);
    console.log(`  ✅ Security Defaults: ${azureADData.securityDefaultsEnabled}\n`);

    console.log('🎉 All M365 services tested successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testM365Services();
```

### 2. Add Test Script to package.json

**📁 File**: `server/package.json`

🔍 **FIND**:
```json
"scripts": {
  "dev": "ts-node-dev src/index.ts",
  "build": "tsc",
  "test:auth": "ts-node src/scripts/test-auth.ts"
}
```

✏️ **REPLACE WITH**:
```json
"scripts": {
  "dev": "ts-node-dev src/index.ts",
  "build": "tsc",
  "test:auth": "ts-node src/scripts/test-auth.ts",
  "test:m365": "ts-node src/scripts/test-m365-services.ts"
}
```

### 3. Test API Endpoints

Create a test file for REST Client:

**📁 File**: `server/tests/m365.http`

🔄 **COMPLETE FILE**:

```http
### Test Intune Compliance Policies
GET http://localhost:3001/api/m365/intune/compliance-policies

### Test Intune Configuration Policies
GET http://localhost:3001/api/m365/intune/configuration-policies

### Test All Intune Data
GET http://localhost:3001/api/m365/intune/all

### Test Intune Security Features
GET http://localhost:3001/api/m365/intune/security-features

### Test Purview Sensitivity Labels
GET http://localhost:3001/api/m365/purview/sensitivity-labels

### Test Purview Summary
GET http://localhost:3001/api/m365/purview/summary

### Test Azure AD Conditional Access
GET http://localhost:3001/api/m365/azuread/conditional-access

### Test Azure AD MFA Status
GET http://localhost:3001/api/m365/azuread/mfa-status

### Test Azure AD Security Summary
GET http://localhost:3001/api/m365/azuread/security-summary

### Test M365 Dashboard (Combined)
GET http://localhost:3001/api/m365/dashboard
```

### 4. Run Tests

```bash
# Run service test
npm run test:m365

# Or test via API with curl
curl http://localhost:3001/api/m365/dashboard | jq

# Or use REST Client in VS Code with m365.http file
```

## ✅ Completion Checklist

- [ ] intuneService.ts created and working
- [ ] purviewService.ts created and working
- [ ] azureADService.ts created and working
- [ ] m365.routes.ts created
- [ ] Routes registered in index.ts
- [ ] Test script created
- [ ] All test endpoints return data
- [ ] `/api/m365/dashboard` returns combined data
- [ ] Intune policies fetch successfully
- [ ] Purview labels fetch successfully (or returns empty if not configured)
- [ ] Azure AD policies fetch successfully
- [ ] MFA status detection works
- [ ] Error handling works for missing permissions

## 🔍 Troubleshooting

### Permission Errors
If you get 403 Forbidden errors:
1. Verify API permissions in Azure AD app
2. Ensure admin consent was granted
3. Wait 5-10 minutes for permissions to propagate
4. Try refreshing token: `POST /api/auth/refresh-token`

### Empty Results
If services return empty arrays:
1. **Intune**: Ensure devices are enrolled in Intune
2. **Purview**: Requires Purview license and configuration
3. **Azure AD**: Check if conditional access is available in your license

### Rate Limiting
Microsoft Graph has rate limits:
- 2000 requests per second per app
- Implement exponential backoff if needed
- Cache results when possible

## 🚀 Next Steps

After completing Part 3, proceed to:
**Part 4: Policy Mapping & Sync Logic** (`PHASE_6_PART_4_POLICY_MAPPING.md`)

This will map the fetched M365 policies to NIST controls and store them in the database.

---

**Estimated Time**: 3-4 hours
**Complexity**: Medium-High
**Dependencies**: Part 1 (Database), Part 2 (Authentication)
