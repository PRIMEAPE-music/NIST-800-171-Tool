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
      // Note: For 'contains' with array type, don't convert expected to array
      // For 'in', don't convert actual value since we're checking membership in expected array
      let typedActual: any;
      let typedExpected: any;

      if (operator === 'contains' && valueType === 'array') {
        // When checking if array contains value, keep expected as scalar
        typedActual = this.convertToType(actualValue, valueType);
        typedExpected = expectedValue;
      } else if (operator === 'in') {
        // When checking if value is in array, keep actual as is and expected as array
        typedActual = actualValue;
        typedExpected = expectedValue;
      } else {
        // For other operators, convert both values
        typedActual = this.convertToType(actualValue, valueType);
        typedExpected = this.convertToType(expectedValue, valueType);
      }

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
  private validateMatches(actual: any, expected: any, _valueType: ValidationType): boolean {
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
