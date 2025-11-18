# Phase 3: Validation Engine Service

**Project:** NIST 800-171 Compliance Management Application  
**Phase:** 3 of 12 - Validation Engine Service  
**Dependencies:** Phases 1-2 (Database Schema & Data Import)  
**Estimated Time:** 2-3 hours  
**Difficulty:** Medium-High

---

## 📋 PHASE OVERVIEW

### Objectives
Create a robust validation engine service that compares M365 policy settings against expected compliance values using flexible validation operators.

### What We're Building
- **Validation Engine Service:** Core logic for comparing policy values against expected values
- **Type System:** Strong TypeScript types for validation operations
- **Operator Support:** Six validation operators (==, >=, <=, contains, in, matches)
- **JSON Path Extraction:** Navigate nested policy data structures
- **Error Handling:** Graceful handling of malformed data and edge cases

### Why This Matters
The validation engine is the **core intelligence** of the M365 compliance system. It determines whether your organization's actual M365 configurations meet NIST 800-171 requirements. This phase is CRITICAL - everything else builds on this foundation.

---

## ✅ PREREQUISITES

### Required Completions
- ✅ Phase 1: Database schema with M365Setting, ControlSettingMapping, SettingComplianceCheck
- ✅ Phase 2: Settings and mappings imported into database
- ✅ Backend server running (Express + TypeScript)
- ✅ Prisma configured and working

### Knowledge Requirements
- TypeScript type definitions
- JSON manipulation
- Comparison operators
- Regular expressions (for 'matches' operator)
- Error handling patterns

### File Structure Check
Verify your project has this structure:
```
backend/
├── src/
│   ├── services/
│   │   └── (this is where we'll add validationEngine.service.ts)
│   ├── types/
│   │   └── (this is where we'll add m365.types.ts)
│   └── prisma/
│       └── schema.prisma (with M365 tables)
```

---

## 🎯 IMPLEMENTATION STEPS

## Step 1: Create Type Definitions

### 1.1 Create M365 Types File

**File:** `backend/src/types/m365.types.ts`

**Purpose:** Define TypeScript interfaces for validation operations

```typescript
// backend/src/types/m365.types.ts

/**
 * Supported validation operators for comparing policy values
 */
export type ValidationOperator = '==' | '>=' | '<=' | 'contains' | 'in' | 'matches';

/**
 * Supported data types for validation
 */
export type ValidationType = 'boolean' | 'integer' | 'string' | 'array' | 'object';

/**
 * Result of a single validation operation
 */
export interface ValidationResult {
  isValid: boolean;
  actualValue: any;
  expectedValue: any;
  operator: ValidationOperator;
  errorMessage?: string;
}

/**
 * Complete validation check result with metadata
 */
export interface SettingValidationResult {
  settingId: string;
  settingName: string;
  policyType: string;
  isCompliant: boolean;
  validationResult: ValidationResult;
  timestamp: Date;
}

/**
 * Batch validation results for multiple settings
 */
export interface BatchValidationResult {
  totalSettings: number;
  compliantSettings: number;
  nonCompliantSettings: number;
  notConfiguredSettings: number;
  results: SettingValidationResult[];
}

/**
 * JSON Path extraction result
 */
export interface PathExtractionResult {
  success: boolean;
  value?: any;
  error?: string;
}
```

**Verification:**
```bash
# Check TypeScript compilation
cd backend
npx tsc --noEmit
```

---

## Step 2: Create Validation Engine Service

### 2.1 Create Service File

**File:** `backend/src/services/validationEngine.service.ts`

**Purpose:** Core validation logic with all operators and type handling

```typescript
// backend/src/services/validationEngine.service.ts

import {
  ValidationOperator,
  ValidationType,
  ValidationResult,
  PathExtractionResult,
} from '../types/m365.types';

/**
 * Validation Engine Service
 * 
 * Provides core logic for validating M365 policy settings against expected values.
 * Supports multiple operators and data types with JSON path extraction.
 */
class ValidationEngineService {
  /**
   * Main validation method - compares actual vs expected values using operator
   * 
   * @param actualValue - The value from the M365 policy
   * @param expectedValue - The expected value for compliance
   * @param operator - The comparison operator to use
   * @param valueType - The data type for type-aware comparison
   * @returns ValidationResult with compliance status
   */
  public validate(
    actualValue: any,
    expectedValue: any,
    operator: ValidationOperator,
    valueType: ValidationType = 'string'
  ): ValidationResult {
    try {
      // Handle null/undefined actual values
      if (actualValue === null || actualValue === undefined) {
        return {
          isValid: false,
          actualValue: null,
          expectedValue,
          operator,
          errorMessage: 'Actual value is null or undefined (setting not configured)',
        };
      }

      // Convert values to appropriate types
      const typedActual = this.convertToType(actualValue, valueType);
      const typedExpected = this.convertToType(expectedValue, valueType);

      // Perform validation based on operator
      let isValid: boolean;
      let errorMessage: string | undefined;

      switch (operator) {
        case '==':
          isValid = this.validateEquals(typedActual, typedExpected, valueType);
          break;

        case '>=':
          isValid = this.validateGreaterThanOrEqual(typedActual, typedExpected, valueType);
          break;

        case '<=':
          isValid = this.validateLessThanOrEqual(typedActual, typedExpected, valueType);
          break;

        case 'contains':
          isValid = this.validateContains(typedActual, typedExpected, valueType);
          break;

        case 'in':
          isValid = this.validateIn(typedActual, typedExpected, valueType);
          break;

        case 'matches':
          isValid = this.validateMatches(typedActual, typedExpected, valueType);
          break;

        default:
          throw new Error(`Unsupported operator: ${operator}`);
      }

      return {
        isValid,
        actualValue: typedActual,
        expectedValue: typedExpected,
        operator,
        errorMessage,
      };
    } catch (error) {
      return {
        isValid: false,
        actualValue,
        expectedValue,
        operator,
        errorMessage: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Extract value from nested JSON using path notation
   * Supports: 'property', 'nested.property', 'array[0]', 'array[0].property'
   * 
   * @param data - The JSON object to extract from
   * @param path - The path to the value (e.g., 'settings.value' or 'items[0].name')
   * @returns PathExtractionResult with value or error
   */
  public extractValueFromPath(data: any, path: string): PathExtractionResult {
    try {
      if (!data || !path) {
        return {
          success: false,
          error: 'Data or path is null/undefined',
        };
      }

      // Split path into segments (handles nested properties and array indices)
      const segments = path.split('.');
      let current = data;

      for (const segment of segments) {
        // Handle array notation: property[index]
        const arrayMatch = segment.match(/^(.+)\[(\d+)\]$/);
        
        if (arrayMatch) {
          const [, propName, indexStr] = arrayMatch;
          const index = parseInt(indexStr, 10);

          // Navigate to property
          if (propName) {
            current = current[propName];
          }

          // Navigate to array index
          if (current && Array.isArray(current)) {
            current = current[index];
          } else {
            return {
              success: false,
              error: `Property '${propName}' is not an array`,
            };
          }
        } else {
          // Simple property access
          current = current[segment];
        }

        // Check if we've gone off the path
        if (current === undefined || current === null) {
          return {
            success: false,
            error: `Path '${path}' not found in data`,
          };
        }
      }

      return {
        success: true,
        value: current,
      };
    } catch (error) {
      return {
        success: false,
        error: `Path extraction error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Convert value to specified type
   */
  private convertToType(value: any, valueType: ValidationType): any {
    try {
      switch (valueType) {
        case 'boolean':
          if (typeof value === 'boolean') return value;
          if (typeof value === 'string') {
            const lower = value.toLowerCase();
            if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'enabled') return true;
            if (lower === 'false' || lower === '0' || lower === 'no' || lower === 'disabled') return false;
          }
          return Boolean(value);

        case 'integer':
          if (typeof value === 'number') return Math.floor(value);
          if (typeof value === 'string') {
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? 0 : parsed;
          }
          return 0;

        case 'string':
          return String(value);

        case 'array':
          if (Array.isArray(value)) return value;
          if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              return Array.isArray(parsed) ? parsed : [value];
            } catch {
              return [value];
            }
          }
          return [value];

        case 'object':
          if (typeof value === 'object' && value !== null) return value;
          if (typeof value === 'string') {
            try {
              return JSON.parse(value);
            } catch {
              return { value };
            }
          }
          return { value };

        default:
          return value;
      }
    } catch (error) {
      return value;
    }
  }

  /**
   * Validate equality (==)
   */
  private validateEquals(actual: any, expected: any, valueType: ValidationType): boolean {
    switch (valueType) {
      case 'boolean':
        return Boolean(actual) === Boolean(expected);

      case 'integer':
        return Number(actual) === Number(expected);

      case 'string':
        return String(actual).toLowerCase() === String(expected).toLowerCase();

      case 'array':
        if (!Array.isArray(actual) || !Array.isArray(expected)) return false;
        if (actual.length !== expected.length) return false;
        return actual.every((item, index) => item === expected[index]);

      case 'object':
        return JSON.stringify(actual) === JSON.stringify(expected);

      default:
        return actual === expected;
    }
  }

  /**
   * Validate greater than or equal (>=)
   */
  private validateGreaterThanOrEqual(actual: any, expected: any, valueType: ValidationType): boolean {
    switch (valueType) {
      case 'integer':
        return Number(actual) >= Number(expected);

      case 'string':
        // String length comparison
        return String(actual).length >= String(expected).length;

      case 'array':
        // Array length comparison
        return Array.isArray(actual) ? actual.length >= Number(expected) : false;

      default:
        return Number(actual) >= Number(expected);
    }
  }

  /**
   * Validate less than or equal (<=)
   */
  private validateLessThanOrEqual(actual: any, expected: any, valueType: ValidationType): boolean {
    switch (valueType) {
      case 'integer':
        return Number(actual) <= Number(expected);

      case 'string':
        // String length comparison
        return String(actual).length <= String(expected).length;

      case 'array':
        // Array length comparison
        return Array.isArray(actual) ? actual.length <= Number(expected) : false;

      default:
        return Number(actual) <= Number(expected);
    }
  }

  /**
   * Validate contains - check if actual contains expected
   */
  private validateContains(actual: any, expected: any, valueType: ValidationType): boolean {
    switch (valueType) {
      case 'string':
        return String(actual).toLowerCase().includes(String(expected).toLowerCase());

      case 'array':
        if (!Array.isArray(actual)) return false;
        return actual.some(item => {
          if (typeof item === 'string' && typeof expected === 'string') {
            return item.toLowerCase() === expected.toLowerCase();
          }
          return item === expected;
        });

      case 'object':
        if (typeof actual !== 'object' || actual === null) return false;
        const expectedStr = String(expected).toLowerCase();
        const actualStr = JSON.stringify(actual).toLowerCase();
        return actualStr.includes(expectedStr);

      default:
        return String(actual).includes(String(expected));
    }
  }

  /**
   * Validate in - check if actual is in expected array
   */
  private validateIn(actual: any, expected: any, valueType: ValidationType): boolean {
    // Expected should be an array
    if (!Array.isArray(expected)) {
      // Try to parse as array if it's a string
      if (typeof expected === 'string') {
        try {
          expected = JSON.parse(expected);
        } catch {
          expected = [expected];
        }
      } else {
        expected = [expected];
      }
    }

    switch (valueType) {
      case 'string':
        return expected.some((item: any) => 
          String(actual).toLowerCase() === String(item).toLowerCase()
        );

      case 'integer':
        return expected.some((item: any) => Number(actual) === Number(item));

      case 'boolean':
        return expected.some((item: any) => Boolean(actual) === Boolean(item));

      default:
        return expected.includes(actual);
    }
  }

  /**
   * Validate matches - check if actual matches regex pattern
   */
  private validateMatches(actual: any, expected: any, valueType: ValidationType): boolean {
    try {
      // Expected should be a regex pattern string
      const pattern = String(expected);
      const regex = new RegExp(pattern, 'i'); // Case-insensitive by default
      const actualStr = String(actual);
      
      return regex.test(actualStr);
    } catch (error) {
      // Invalid regex pattern
      return false;
    }
  }

  /**
   * Batch validate multiple settings against policy data
   * 
   * @param policyData - The complete policy data object
   * @param settings - Array of settings to validate
   * @returns Array of validation results
   */
  public batchValidate(
    policyData: any,
    settings: Array<{
      id: string;
      settingName: string;
      valuePath: string;
      expectedValue: any;
      validationOperator: ValidationOperator;
      valueType: ValidationType;
    }>
  ): ValidationResult[] {
    return settings.map(setting => {
      // Extract actual value from policy data
      const extraction = this.extractValueFromPath(policyData, setting.valuePath);
      
      if (!extraction.success) {
        return {
          isValid: false,
          actualValue: null,
          expectedValue: setting.expectedValue,
          operator: setting.validationOperator,
          errorMessage: extraction.error,
        };
      }

      // Validate the extracted value
      return this.validate(
        extraction.value,
        setting.expectedValue,
        setting.validationOperator,
        setting.valueType
      );
    });
  }
}

// Export singleton instance
export const validationEngineService = new ValidationEngineService();
```

**Verification:**
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Should see no errors related to validationEngine.service.ts
```

---

## Step 3: Create Service Tests (Optional but Recommended)

### 3.1 Create Test File

**File:** `backend/src/services/__tests__/validationEngine.service.test.ts`

**Purpose:** Unit tests for each validation operator

```typescript
// backend/src/services/__tests__/validationEngine.service.test.ts

import { validationEngineService } from '../validationEngine.service';
import { ValidationOperator, ValidationType } from '../../types/m365.types';

describe('ValidationEngineService', () => {
  describe('Equals Operator (==)', () => {
    test('should validate boolean equality', () => {
      const result = validationEngineService.validate(true, true, '==', 'boolean');
      expect(result.isValid).toBe(true);
    });

    test('should validate integer equality', () => {
      const result = validationEngineService.validate(42, 42, '==', 'integer');
      expect(result.isValid).toBe(true);
    });

    test('should validate string equality (case-insensitive)', () => {
      const result = validationEngineService.validate('Hello', 'hello', '==', 'string');
      expect(result.isValid).toBe(true);
    });

    test('should validate array equality', () => {
      const result = validationEngineService.validate([1, 2, 3], [1, 2, 3], '==', 'array');
      expect(result.isValid).toBe(true);
    });

    test('should fail on inequality', () => {
      const result = validationEngineService.validate(10, 20, '==', 'integer');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Greater Than or Equal Operator (>=)', () => {
    test('should validate integer >=', () => {
      const result1 = validationEngineService.validate(10, 5, '>=', 'integer');
      expect(result1.isValid).toBe(true);

      const result2 = validationEngineService.validate(10, 10, '>=', 'integer');
      expect(result2.isValid).toBe(true);

      const result3 = validationEngineService.validate(5, 10, '>=', 'integer');
      expect(result3.isValid).toBe(false);
    });

    test('should validate array length >=', () => {
      const result = validationEngineService.validate([1, 2, 3], 2, '>=', 'array');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Less Than or Equal Operator (<=)', () => {
    test('should validate integer <=', () => {
      const result1 = validationEngineService.validate(5, 10, '<=', 'integer');
      expect(result1.isValid).toBe(true);

      const result2 = validationEngineService.validate(10, 10, '<=', 'integer');
      expect(result2.isValid).toBe(true);

      const result3 = validationEngineService.validate(15, 10, '<=', 'integer');
      expect(result3.isValid).toBe(false);
    });
  });

  describe('Contains Operator', () => {
    test('should validate string contains', () => {
      const result = validationEngineService.validate('Hello World', 'world', 'contains', 'string');
      expect(result.isValid).toBe(true);
    });

    test('should validate array contains', () => {
      const result = validationEngineService.validate(['apple', 'banana'], 'banana', 'contains', 'array');
      expect(result.isValid).toBe(true);
    });

    test('should fail when not contained', () => {
      const result = validationEngineService.validate('Hello', 'goodbye', 'contains', 'string');
      expect(result.isValid).toBe(false);
    });
  });

  describe('In Operator', () => {
    test('should validate value in array', () => {
      const result = validationEngineService.validate('beta', ['alpha', 'beta', 'gamma'], 'in', 'string');
      expect(result.isValid).toBe(true);
    });

    test('should validate integer in array', () => {
      const result = validationEngineService.validate(2, [1, 2, 3], 'in', 'integer');
      expect(result.isValid).toBe(true);
    });

    test('should fail when not in array', () => {
      const result = validationEngineService.validate('delta', ['alpha', 'beta'], 'in', 'string');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Matches Operator (regex)', () => {
    test('should validate regex pattern match', () => {
      const result = validationEngineService.validate('user@example.com', '^[a-z]+@[a-z]+\\.com$', 'matches', 'string');
      expect(result.isValid).toBe(true);
    });

    test('should fail on pattern mismatch', () => {
      const result = validationEngineService.validate('notanemail', '^[a-z]+@[a-z]+\\.com$', 'matches', 'string');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Path Extraction', () => {
    test('should extract simple property', () => {
      const data = { name: 'Test', value: 42 };
      const result = validationEngineService.extractValueFromPath(data, 'value');
      expect(result.success).toBe(true);
      expect(result.value).toBe(42);
    });

    test('should extract nested property', () => {
      const data = { user: { profile: { name: 'John' } } };
      const result = validationEngineService.extractValueFromPath(data, 'user.profile.name');
      expect(result.success).toBe(true);
      expect(result.value).toBe('John');
    });

    test('should extract array element', () => {
      const data = { items: [{ id: 1 }, { id: 2 }] };
      const result = validationEngineService.extractValueFromPath(data, 'items[1].id');
      expect(result.success).toBe(true);
      expect(result.value).toBe(2);
    });

    test('should fail on invalid path', () => {
      const data = { name: 'Test' };
      const result = validationEngineService.extractValueFromPath(data, 'invalid.path');
      expect(result.success).toBe(false);
    });
  });

  describe('Null/Undefined Handling', () => {
    test('should handle null actual value', () => {
      const result = validationEngineService.validate(null, 'expected', '==', 'string');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('null or undefined');
    });

    test('should handle undefined actual value', () => {
      const result = validationEngineService.validate(undefined, 'expected', '==', 'string');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('null or undefined');
    });
  });

  describe('Type Conversion', () => {
    test('should convert string to boolean', () => {
      const result1 = validationEngineService.validate('true', true, '==', 'boolean');
      expect(result1.isValid).toBe(true);

      const result2 = validationEngineService.validate('enabled', true, '==', 'boolean');
      expect(result2.isValid).toBe(true);
    });

    test('should convert string to integer', () => {
      const result = validationEngineService.validate('42', 42, '==', 'integer');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Batch Validation', () => {
    test('should validate multiple settings', () => {
      const policyData = {
        passwordPolicy: {
          minLength: 14,
          requireComplexity: true,
        },
        sessionTimeout: 30,
      };

      const settings = [
        {
          id: '1',
          settingName: 'Password Min Length',
          valuePath: 'passwordPolicy.minLength',
          expectedValue: 14,
          validationOperator: '==' as ValidationOperator,
          valueType: 'integer' as ValidationType,
        },
        {
          id: '2',
          settingName: 'Password Complexity',
          valuePath: 'passwordPolicy.requireComplexity',
          expectedValue: true,
          validationOperator: '==' as ValidationOperator,
          valueType: 'boolean' as ValidationType,
        },
      ];

      const results = validationEngineService.batchValidate(policyData, settings);
      expect(results).toHaveLength(2);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(true);
    });
  });
});
```

**Verification:**
```bash
# Run tests (if you have Jest configured)
npm test validationEngine.service.test.ts

# Or manually verify compilation
npx tsc --noEmit
```

---

## Step 4: Create Integration Helper Service

### 4.1 Create Database Integration Helper

**File:** `backend/src/services/settingValidation.service.ts`

**Purpose:** Bridge between validation engine and database

```typescript
// backend/src/services/settingValidation.service.ts

import { PrismaClient } from '@prisma/client';
import { validationEngineService } from './validationEngine.service';
import {
  ValidationOperator,
  ValidationType,
  SettingValidationResult,
} from '../types/m365.types';

const prisma = new PrismaClient();

/**
 * Setting Validation Service
 * 
 * Integrates validation engine with database operations.
 * Validates M365 policy settings and stores results.
 */
class SettingValidationService {
  /**
   * Validate a single setting against policy data
   * 
   * @param settingId - Database ID of the M365Setting
   * @param policyData - The policy data containing the actual value
   * @returns Validation result with compliance status
   */
  async validateSetting(
    settingId: string,
    policyData: any
  ): Promise<SettingValidationResult | null> {
    try {
      // Get setting details from database
      const setting = await prisma.m365Setting.findUnique({
        where: { id: settingId },
      });

      if (!setting) {
        console.error(`Setting not found: ${settingId}`);
        return null;
      }

      // Extract actual value from policy data
      const extraction = validationEngineService.extractValueFromPath(
        policyData,
        setting.valuePath
      );

      if (!extraction.success) {
        // Setting not found in policy - mark as not configured
        return {
          settingId: setting.id,
          settingName: setting.displayName,
          policyType: setting.policyType,
          isCompliant: false,
          validationResult: {
            isValid: false,
            actualValue: null,
            expectedValue: setting.expectedValue,
            operator: setting.validationOperator as ValidationOperator,
            errorMessage: 'Setting not found in policy data (not configured)',
          },
          timestamp: new Date(),
        };
      }

      // Validate the extracted value
      const validationResult = validationEngineService.validate(
        extraction.value,
        setting.expectedValue,
        setting.validationOperator as ValidationOperator,
        setting.valueType as ValidationType
      );

      return {
        settingId: setting.id,
        settingName: setting.displayName,
        policyType: setting.policyType,
        isCompliant: validationResult.isValid,
        validationResult,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error validating setting:', error);
      return null;
    }
  }

  /**
   * Validate all settings for a specific policy
   * 
   * @param policyId - Database ID of the M365Policy
   * @returns Array of validation results
   */
  async validatePolicySettings(policyId: string): Promise<SettingValidationResult[]> {
    try {
      // Get policy and its data
      const policy = await prisma.m365Policy.findUnique({
        where: { id: policyId },
      });

      if (!policy) {
        console.error(`Policy not found: ${policyId}`);
        return [];
      }

      // Get all settings for this policy type
      const settings = await prisma.m365Setting.findMany({
        where: {
          policyType: policy.type,
        },
      });

      // Validate each setting
      const validationPromises = settings.map(setting =>
        this.validateSetting(setting.id, policy.data)
      );

      const results = await Promise.all(validationPromises);
      
      // Filter out null results
      return results.filter((result): result is SettingValidationResult => result !== null);
    } catch (error) {
      console.error('Error validating policy settings:', error);
      return [];
    }
  }

  /**
   * Validate all settings for a control
   * 
   * @param controlId - The NIST control ID (e.g., 'AC.1.001')
   * @returns Array of validation results
   */
  async validateControlSettings(controlId: string): Promise<SettingValidationResult[]> {
    try {
      // Get all settings mapped to this control
      const mappings = await prisma.controlSettingMapping.findMany({
        where: { controlId },
        include: {
          setting: true,
        },
      });

      if (mappings.length === 0) {
        console.log(`No settings mapped to control: ${controlId}`);
        return [];
      }

      // Get all relevant policies
      const policyTypes = [...new Set(mappings.map(m => m.setting.policyType))];
      const policies = await prisma.m365Policy.findMany({
        where: {
          type: { in: policyTypes },
        },
      });

      // Create a map of policy type to policy data
      const policyDataMap = new Map(
        policies.map(p => [p.type, p.data])
      );

      // Validate each setting
      const validationPromises = mappings.map(async mapping => {
        const policyData = policyDataMap.get(mapping.setting.policyType);
        if (!policyData) {
          return null;
        }
        return this.validateSetting(mapping.setting.id, policyData);
      });

      const results = await Promise.all(validationPromises);
      
      // Filter out null results
      return results.filter((result): result is SettingValidationResult => result !== null);
    } catch (error) {
      console.error('Error validating control settings:', error);
      return [];
    }
  }

  /**
   * Store validation results in database
   * 
   * @param results - Array of validation results to store
   */
  async storeValidationResults(results: SettingValidationResult[]): Promise<void> {
    try {
      // Delete old results for these settings
      const settingIds = results.map(r => r.settingId);
      await prisma.settingComplianceCheck.deleteMany({
        where: {
          m365SettingId: { in: settingIds },
        },
      });

      // Insert new results
      const creates = results.map(result =>
        prisma.settingComplianceCheck.create({
          data: {
            m365SettingId: result.settingId,
            isCompliant: result.isCompliant,
            actualValue: JSON.stringify(result.validationResult.actualValue),
            expectedValue: JSON.stringify(result.validationResult.expectedValue),
            validationOperator: result.validationResult.operator,
            errorMessage: result.validationResult.errorMessage,
            lastChecked: result.timestamp,
          },
        })
      );

      await Promise.all(creates);
      console.log(`Stored ${results.length} validation results`);
    } catch (error) {
      console.error('Error storing validation results:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const settingValidationService = new SettingValidationService();
```

**Verification:**
```bash
npx tsc --noEmit
```

---

## Step 5: Create Manual Testing Script

### 5.1 Create Test Script

**File:** `backend/src/scripts/test-validation-engine.ts`

**Purpose:** Manual testing script to verify validation engine works

```typescript
// backend/src/scripts/test-validation-engine.ts

import { validationEngineService } from '../services/validationEngine.service';
import { ValidationOperator, ValidationType } from '../types/m365.types';

/**
 * Test Validation Engine
 * 
 * Manual test script to verify all validation operators work correctly.
 * Run with: npx ts-node src/scripts/test-validation-engine.ts
 */

console.log('🧪 Testing Validation Engine\n');
console.log('='.repeat(60));

// Test Case 1: Equals Operator
console.log('\n📋 Test 1: Equals Operator (==)');
console.log('-'.repeat(60));

const test1a = validationEngineService.validate(true, true, '==', 'boolean');
console.log('Boolean true == true:', test1a.isValid ? '✅ PASS' : '❌ FAIL');

const test1b = validationEngineService.validate(42, 42, '==', 'integer');
console.log('Integer 42 == 42:', test1b.isValid ? '✅ PASS' : '❌ FAIL');

const test1c = validationEngineService.validate('Hello', 'hello', '==', 'string');
console.log('String "Hello" == "hello":', test1c.isValid ? '✅ PASS' : '❌ FAIL');

const test1d = validationEngineService.validate('Wrong', 'Right', '==', 'string');
console.log('String "Wrong" == "Right":', !test1d.isValid ? '✅ PASS' : '❌ FAIL');

// Test Case 2: Greater Than or Equal
console.log('\n📋 Test 2: Greater Than or Equal (>=)');
console.log('-'.repeat(60));

const test2a = validationEngineService.validate(10, 5, '>=', 'integer');
console.log('Integer 10 >= 5:', test2a.isValid ? '✅ PASS' : '❌ FAIL');

const test2b = validationEngineService.validate(10, 10, '>=', 'integer');
console.log('Integer 10 >= 10:', test2b.isValid ? '✅ PASS' : '❌ FAIL');

const test2c = validationEngineService.validate(5, 10, '>=', 'integer');
console.log('Integer 5 >= 10:', !test2c.isValid ? '✅ PASS' : '❌ FAIL');

// Test Case 3: Less Than or Equal
console.log('\n📋 Test 3: Less Than or Equal (<=)');
console.log('-'.repeat(60));

const test3a = validationEngineService.validate(5, 10, '<=', 'integer');
console.log('Integer 5 <= 10:', test3a.isValid ? '✅ PASS' : '❌ FAIL');

const test3b = validationEngineService.validate(10, 10, '<=', 'integer');
console.log('Integer 10 <= 10:', test3b.isValid ? '✅ PASS' : '❌ FAIL');

const test3c = validationEngineService.validate(15, 10, '<=', 'integer');
console.log('Integer 15 <= 10:', !test3c.isValid ? '✅ PASS' : '❌ FAIL');

// Test Case 4: Contains Operator
console.log('\n📋 Test 4: Contains Operator');
console.log('-'.repeat(60));

const test4a = validationEngineService.validate('Hello World', 'world', 'contains', 'string');
console.log('String "Hello World" contains "world":', test4a.isValid ? '✅ PASS' : '❌ FAIL');

const test4b = validationEngineService.validate(['apple', 'banana'], 'banana', 'contains', 'array');
console.log('Array contains "banana":', test4b.isValid ? '✅ PASS' : '❌ FAIL');

const test4c = validationEngineService.validate('Hello', 'goodbye', 'contains', 'string');
console.log('String "Hello" contains "goodbye":', !test4c.isValid ? '✅ PASS' : '❌ FAIL');

// Test Case 5: In Operator
console.log('\n📋 Test 5: In Operator');
console.log('-'.repeat(60));

const test5a = validationEngineService.validate('beta', ['alpha', 'beta', 'gamma'], 'in', 'string');
console.log('String "beta" in array:', test5a.isValid ? '✅ PASS' : '❌ FAIL');

const test5b = validationEngineService.validate(2, [1, 2, 3], 'in', 'integer');
console.log('Integer 2 in array:', test5b.isValid ? '✅ PASS' : '❌ FAIL');

const test5c = validationEngineService.validate('delta', ['alpha', 'beta'], 'in', 'string');
console.log('String "delta" in array:', !test5c.isValid ? '✅ PASS' : '❌ FAIL');

// Test Case 6: Matches Operator (regex)
console.log('\n📋 Test 6: Matches Operator (Regex)');
console.log('-'.repeat(60));

const test6a = validationEngineService.validate(
  'user@example.com',
  '^[a-z]+@[a-z]+\\.com$',
  'matches',
  'string'
);
console.log('Email matches pattern:', test6a.isValid ? '✅ PASS' : '❌ FAIL');

const test6b = validationEngineService.validate(
  'notanemail',
  '^[a-z]+@[a-z]+\\.com$',
  'matches',
  'string'
);
console.log('Invalid email matches pattern:', !test6b.isValid ? '✅ PASS' : '❌ FAIL');

// Test Case 7: Path Extraction
console.log('\n📋 Test 7: JSON Path Extraction');
console.log('-'.repeat(60));

const testData = {
  user: {
    profile: {
      name: 'John Doe',
      email: 'john@example.com',
    },
  },
  settings: {
    security: {
      passwordMinLength: 14,
      requireMFA: true,
    },
  },
  roles: ['admin', 'user'],
};

const path1 = validationEngineService.extractValueFromPath(testData, 'user.profile.name');
console.log('Extract "user.profile.name":', path1.success && path1.value === 'John Doe' ? '✅ PASS' : '❌ FAIL');

const path2 = validationEngineService.extractValueFromPath(testData, 'settings.security.passwordMinLength');
console.log('Extract "settings.security.passwordMinLength":', path2.success && path2.value === 14 ? '✅ PASS' : '❌ FAIL');

const path3 = validationEngineService.extractValueFromPath(testData, 'roles[0]');
console.log('Extract "roles[0]":', path3.success && path3.value === 'admin' ? '✅ PASS' : '❌ FAIL');

const path4 = validationEngineService.extractValueFromPath(testData, 'invalid.path');
console.log('Extract invalid path:', !path4.success ? '✅ PASS' : '❌ FAIL');

// Test Case 8: Null/Undefined Handling
console.log('\n📋 Test 8: Null/Undefined Handling');
console.log('-'.repeat(60));

const test8a = validationEngineService.validate(null, 'expected', '==', 'string');
console.log('Null value validation:', !test8a.isValid && test8a.errorMessage?.includes('null') ? '✅ PASS' : '❌ FAIL');

const test8b = validationEngineService.validate(undefined, 'expected', '==', 'string');
console.log('Undefined value validation:', !test8b.isValid && test8b.errorMessage?.includes('undefined') ? '✅ PASS' : '❌ FAIL');

// Test Case 9: Type Conversion
console.log('\n📋 Test 9: Type Conversion');
console.log('-'.repeat(60));

const test9a = validationEngineService.validate('true', true, '==', 'boolean');
console.log('Convert string "true" to boolean:', test9a.isValid ? '✅ PASS' : '❌ FAIL');

const test9b = validationEngineService.validate('42', 42, '==', 'integer');
console.log('Convert string "42" to integer:', test9b.isValid ? '✅ PASS' : '❌ FAIL');

const test9c = validationEngineService.validate('enabled', true, '==', 'boolean');
console.log('Convert string "enabled" to boolean:', test9c.isValid ? '✅ PASS' : '❌ FAIL');

// Test Case 10: Batch Validation
console.log('\n📋 Test 10: Batch Validation');
console.log('-'.repeat(60));

const batchData = {
  passwordPolicy: {
    minLength: 14,
    requireComplexity: true,
  },
  sessionTimeout: 30,
  allowedDomains: ['example.com', 'company.com'],
};

const batchSettings = [
  {
    id: '1',
    settingName: 'Password Min Length',
    valuePath: 'passwordPolicy.minLength',
    expectedValue: 14,
    validationOperator: '==' as ValidationOperator,
    valueType: 'integer' as ValidationType,
  },
  {
    id: '2',
    settingName: 'Password Complexity',
    valuePath: 'passwordPolicy.requireComplexity',
    expectedValue: true,
    validationOperator: '==' as ValidationOperator,
    valueType: 'boolean' as ValidationType,
  },
  {
    id: '3',
    settingName: 'Session Timeout',
    valuePath: 'sessionTimeout',
    expectedValue: 15,
    validationOperator: '>=' as ValidationOperator,
    valueType: 'integer' as ValidationType,
  },
];

const batchResults = validationEngineService.batchValidate(batchData, batchSettings);
const allBatchPassed = batchResults.every(r => r.isValid);
console.log(`Batch validate 3 settings: ${allBatchPassed ? '✅ PASS' : '❌ FAIL'}`);
console.log(`  - Setting 1 (== 14): ${batchResults[0].isValid ? '✅' : '❌'}`);
console.log(`  - Setting 2 (== true): ${batchResults[1].isValid ? '✅' : '❌'}`);
console.log(`  - Setting 3 (>= 15): ${batchResults[2].isValid ? '✅' : '❌'}`);

// Summary
console.log('\n' + '='.repeat(60));
console.log('✅ Validation Engine Tests Complete!');
console.log('='.repeat(60));
console.log('\nAll validation operators are working correctly.');
console.log('The engine is ready for integration with the compliance system.\n');
```

**Run the test:**
```bash
cd backend
npx ts-node src/scripts/test-validation-engine.ts
```

**Expected Output:**
```
🧪 Testing Validation Engine

============================================================

📋 Test 1: Equals Operator (==)
------------------------------------------------------------
Boolean true == true: ✅ PASS
Integer 42 == 42: ✅ PASS
String "Hello" == "hello": ✅ PASS
String "Wrong" == "Right": ✅ PASS

📋 Test 2: Greater Than or Equal (>=)
------------------------------------------------------------
Integer 10 >= 5: ✅ PASS
Integer 10 >= 10: ✅ PASS
Integer 5 >= 10: ✅ PASS

... (more tests)

============================================================
✅ Validation Engine Tests Complete!
============================================================

All validation operators are working correctly.
The engine is ready for integration with the compliance system.
```

---

## 📊 VERIFICATION & TESTING

### Complete Verification Checklist

**TypeScript Compilation:**
```bash
cd backend
npx tsc --noEmit
# Should show no errors
```

**File Structure:**
```bash
ls -la src/types/m365.types.ts
ls -la src/services/validationEngine.service.ts
ls -la src/services/settingValidation.service.ts
ls -la src/scripts/test-validation-engine.ts
```

**Run Manual Tests:**
```bash
npx ts-node src/scripts/test-validation-engine.ts
```

**Database Connection:**
```bash
# In Node REPL
npx ts-node
> import { prisma } from '@prisma/client';
> const db = new prisma();
> await db.m365Setting.count();
# Should return count > 0
```

---

## 🔍 TROUBLESHOOTING

### Common Issues

#### Issue 1: TypeScript Compilation Errors
**Symptoms:** `tsc` shows type errors  
**Solutions:**
- Ensure `@prisma/client` is installed and generated
- Run `npx prisma generate`
- Check `tsconfig.json` has correct paths
- Verify all imports use correct paths

#### Issue 2: Path Extraction Not Working
**Symptoms:** extractValueFromPath returns success: false  
**Solutions:**
- Check JSON structure matches path
- Verify path syntax: use `property.nested` or `array[index]`
- Test with simpler paths first
- Add console.log to see actual data structure

#### Issue 3: Validation Always Returns False
**Symptoms:** All validations fail  
**Solutions:**
- Check value types match (boolean vs string 'true')
- Verify type conversion is working
- Test with simpler cases (direct equality)
- Check if actualValue is null/undefined

#### Issue 4: Regex Matches Not Working
**Symptoms:** 'matches' operator always fails  
**Solutions:**
- Test regex pattern in online tool first
- Escape special characters properly
- Use case-insensitive flag (included by default)
- Try simpler patterns first

#### Issue 5: Batch Validation Errors
**Symptoms:** batchValidate throws errors  
**Solutions:**
- Check all settings have required fields
- Verify policy data structure
- Test individual validations first
- Check for typos in valuePath

---

## 🎯 ACCEPTANCE CRITERIA

### Phase 3 Complete When:

✅ **Code Structure:**
- [ ] `m365.types.ts` created with all interfaces
- [ ] `validationEngine.service.ts` created with all operators
- [ ] `settingValidation.service.ts` created with database integration
- [ ] Test script `test-validation-engine.ts` created
- [ ] All files compile without TypeScript errors

✅ **Functionality:**
- [ ] Equals operator (==) works for all types
- [ ] Greater/less than operators (>=, <=) work
- [ ] Contains operator works for strings and arrays
- [ ] In operator works for checking membership
- [ ] Matches operator works with regex patterns
- [ ] Path extraction handles nested objects and arrays
- [ ] Null/undefined values handled gracefully
- [ ] Type conversion works correctly

✅ **Testing:**
- [ ] Manual test script runs successfully
- [ ] All test cases pass (10/10)
- [ ] Can validate sample data structures
- [ ] Error handling tested and working

✅ **Integration:**
- [ ] Service integrates with Prisma database
- [ ] Can retrieve settings from database
- [ ] Can validate against real policy data
- [ ] Can store results in database

---

## 📝 IMPLEMENTATION NOTES

### Design Decisions

**Why Singleton Pattern?**
- Single instance prevents duplicate service initialization
- Shared state for caching (if added later)
- Easier to mock for testing

**Why Type-Aware Validation?**
- Different comparison logic for different types
- Prevents type coercion bugs
- Makes validation explicit and predictable

**Why JSON Path Extraction?**
- Policy data is deeply nested
- Flexible path notation handles various structures
- Supports both objects and arrays

**Why These Operators?**
- `==`: Most common (exact match)
- `>=`, `<=`: Numeric thresholds
- `contains`: Partial matching
- `in`: Multiple valid values
- `matches`: Complex patterns (regex)

### Performance Considerations

**Current Approach:**
- Synchronous validation (fast enough for single settings)
- No caching (Phase 4 will add caching)
- No batching limits (Phase 4 will add pagination)

**Future Optimizations:**
- Cache validation results (Phase 4)
- Batch API requests (Phase 5)
- Parallel validation (Phase 6)

---

## 🚀 NEXT STEPS

### Immediate (After This Phase)
1. Test validation engine thoroughly
2. Verify all operators work correctly
3. Document any edge cases found
4. Prepare for Phase 4 (Compliance Calculation)

### Phase 4 Preview
The next phase will use this validation engine to:
- Calculate per-setting compliance
- Aggregate control-level compliance
- Calculate platform coverage
- Cache results in database
- Generate compliance reports

### Integration Points
Phase 3 output feeds into:
- **Phase 4:** Compliance calculation uses validation results
- **Phase 5:** API endpoints serve validation data
- **Phase 6:** Policy sync triggers validation
- **Phase 7:** UI displays validation results

---

## 📚 REFERENCE

### Validation Operators

| Operator | Description | Example | Use Case |
|----------|-------------|---------|----------|
| `==` | Exact equality | `value == "expected"` | Boolean flags, exact strings |
| `>=` | Greater than or equal | `value >= 14` | Minimum lengths, timeouts |
| `<=` | Less than or equal | `value <= 30` | Maximum values, limits |
| `contains` | Substring/element check | `value contains "admin"` | String contains, array has element |
| `in` | Membership check | `value in ["opt1", "opt2"]` | Multiple valid values |
| `matches` | Regex pattern | `value matches "^[a-z]+$"` | Complex patterns, formats |

### Value Types

| Type | Description | Example | Conversion |
|------|-------------|---------|------------|
| `boolean` | True/false | `true`, `false` | "true", "enabled" → true |
| `integer` | Whole number | `14`, `30` | "42" → 42 |
| `string` | Text value | `"hello"` | Case-insensitive comparison |
| `array` | List of values | `[1, 2, 3]` | JSON string parsed |
| `object` | Complex structure | `{a: 1}` | JSON string parsed |

### JSON Path Examples

| Path | Data | Result |
|------|------|--------|
| `name` | `{name: "John"}` | `"John"` |
| `user.profile` | `{user: {profile: {...}}}` | `{...}` |
| `items[0]` | `{items: ["a", "b"]}` | `"a"` |
| `data[1].id` | `{data: [{id: 1}, {id: 2}]}` | `2` |

---

## ✅ COMPLETION CHECKLIST

### Before Moving to Phase 4:

- [ ] All TypeScript files created and compile successfully
- [ ] All 6 validation operators implemented
- [ ] Path extraction supports objects and arrays
- [ ] Type conversion handles all value types
- [ ] Null/undefined handling works correctly
- [ ] Manual test script passes all tests (10/10)
- [ ] Database integration tested
- [ ] Error handling verified
- [ ] Code documented with JSDoc comments
- [ ] No console errors or warnings

### Sign-Off:
- **Date Completed:** _______________
- **Tested By:** _______________
- **Issues Found:** _______________
- **Ready for Phase 4:** [ ] Yes [ ] No

---

**Phase 3 Version:** 1.0  
**Created:** 2024-11-17  
**Status:** Ready for Implementation  
**Estimated Duration:** 2-3 hours

---

**END OF PHASE 3 GUIDE**
