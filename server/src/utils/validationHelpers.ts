/**
 * Validation Helper Functions for Settings-Based Mapping
 * Supports 6 validation types: boolean, numeric, string, array, object, duration
 */

import {
  ValidationRuleType,
  ValidationRule,
  NumericValidationRule,
  ArrayValidationRule,
  ObjectValidationRule,
  DurationValidationRule,
  SettingValidationResult,
} from '../types/settingsMapper.types';

/**
 * Main validation function - routes to type-specific validators
 */
export function validateSetting(
  settingValue: any,
  validationType: ValidationRuleType,
  requiredValue: ValidationRule,
  settingName: string
): SettingValidationResult {
  switch (validationType) {
    case 'boolean':
      return validateBoolean(settingValue, requiredValue as boolean, settingName);
    case 'numeric':
      return validateNumeric(settingValue, requiredValue as NumericValidationRule, settingName);
    case 'string':
      return validateString(settingValue, requiredValue as string[], settingName);
    case 'array':
      return validateArray(settingValue, requiredValue as ArrayValidationRule, settingName);
    case 'object':
      return validateObject(settingValue, requiredValue as ObjectValidationRule, settingName);
    case 'duration':
      return validateDuration(settingValue, requiredValue as DurationValidationRule, settingName);
    default:
      return {
        settingName,
        settingValue,
        requiredValue,
        validationType,
        meetsRequirement: false,
        compliancePercentage: 0,
        validationMessage: `Unknown validation type: ${validationType}`,
      };
  }
}

/**
 * Boolean Validation
 * Checks if setting value matches required boolean
 */
function validateBoolean(
  value: any,
  required: boolean,
  settingName: string
): SettingValidationResult {
  if (value === undefined || value === null) {
    return {
      settingName,
      settingValue: value,
      requiredValue: required,
      validationType: 'boolean',
      meetsRequirement: false,
      compliancePercentage: 0,
      validationMessage: `Setting "${settingName}" is not set`,
    };
  }

  const meetsRequirement = value === required;

  return {
    settingName,
    settingValue: value,
    requiredValue: required,
    validationType: 'boolean',
    meetsRequirement,
    compliancePercentage: meetsRequirement ? 100 : 0,
    validationMessage: meetsRequirement
      ? `✓ ${settingName}: ${value} (as required)`
      : `✗ ${settingName}: ${value} (required: ${required})`,
  };
}

/**
 * Numeric Validation
 * Supports min, max, exact value constraints
 */
function validateNumeric(
  value: any,
  rule: NumericValidationRule,
  settingName: string
): SettingValidationResult {
  if (value === undefined || value === null) {
    return {
      settingName,
      settingValue: value,
      requiredValue: rule,
      validationType: 'numeric',
      meetsRequirement: false,
      compliancePercentage: 0,
      validationMessage: `Setting "${settingName}" is not set`,
    };
  }

  const numValue = Number(value);
  if (isNaN(numValue)) {
    return {
      settingName,
      settingValue: value,
      requiredValue: rule,
      validationType: 'numeric',
      meetsRequirement: false,
      compliancePercentage: 0,
      validationMessage: `✗ ${settingName}: "${value}" is not a valid number`,
    };
  }

  // Check exact value
  if (rule.exact !== undefined) {
    const meetsRequirement = numValue === rule.exact;
    return {
      settingName,
      settingValue: value,
      requiredValue: rule,
      validationType: 'numeric',
      meetsRequirement,
      compliancePercentage: meetsRequirement ? 100 : 0,
      validationMessage: meetsRequirement
        ? `✓ ${settingName}: ${numValue} (exactly ${rule.exact})`
        : `✗ ${settingName}: ${numValue} (required: exactly ${rule.exact})`,
    };
  }

  // Check min/max range
  const failures: string[] = [];
  let compliance = 0;
  let checksTotal = 0;

  if (rule.min !== undefined) {
    checksTotal++;
    if (numValue >= rule.min) {
      compliance++;
    } else {
      failures.push(`below minimum ${rule.min}`);
    }
  }

  if (rule.max !== undefined) {
    checksTotal++;
    if (numValue <= rule.max) {
      compliance++;
    } else {
      failures.push(`above maximum ${rule.max}`);
    }
  }

  const meetsRequirement = failures.length === 0;
  const compliancePercentage = checksTotal > 0 ? (compliance / checksTotal) * 100 : 0;

  const rangeDesc = [];
  if (rule.min !== undefined) rangeDesc.push(`min: ${rule.min}`);
  if (rule.max !== undefined) rangeDesc.push(`max: ${rule.max}`);

  return {
    settingName,
    settingValue: value,
    requiredValue: rule,
    validationType: 'numeric',
    meetsRequirement,
    compliancePercentage,
    validationMessage: meetsRequirement
      ? `✓ ${settingName}: ${numValue} (${rangeDesc.join(', ')})`
      : `✗ ${settingName}: ${numValue} (${failures.join(', ')})`,
  };
}

/**
 * String Validation
 * Checks if value matches one of allowed string values
 */
function validateString(
  value: any,
  allowedValues: string[],
  settingName: string
): SettingValidationResult {
  if (value === undefined || value === null) {
    return {
      settingName,
      settingValue: value,
      requiredValue: allowedValues,
      validationType: 'string',
      meetsRequirement: false,
      compliancePercentage: 0,
      validationMessage: `Setting "${settingName}" is not set`,
    };
  }

  const strValue = String(value);
  const meetsRequirement = allowedValues.includes(strValue);

  return {
    settingName,
    settingValue: value,
    requiredValue: allowedValues,
    validationType: 'string',
    meetsRequirement,
    compliancePercentage: meetsRequirement ? 100 : 0,
    validationMessage: meetsRequirement
      ? `✓ ${settingName}: "${strValue}"`
      : `✗ ${settingName}: "${strValue}" (allowed: ${allowedValues.join(', ')})`,
  };
}

/**
 * Array Validation
 * Supports length constraints and content checks
 */
function validateArray(
  value: any,
  rule: ArrayValidationRule,
  settingName: string
): SettingValidationResult {
  if (value === undefined || value === null) {
    return {
      settingName,
      settingValue: value,
      requiredValue: rule,
      validationType: 'array',
      meetsRequirement: false,
      compliancePercentage: 0,
      validationMessage: `Setting "${settingName}" is not set`,
    };
  }

  if (!Array.isArray(value)) {
    return {
      settingName,
      settingValue: value,
      requiredValue: rule,
      validationType: 'array',
      meetsRequirement: false,
      compliancePercentage: 0,
      validationMessage: `✗ ${settingName}: not an array`,
    };
  }

  const failures: string[] = [];
  let compliance = 0;
  let checksTotal = 0;

  // Check empty requirement
  if (rule.empty !== undefined) {
    checksTotal++;
    const isEmpty = value.length === 0;
    if (isEmpty === rule.empty) {
      compliance++;
    } else {
      failures.push(rule.empty ? 'should be empty' : 'should not be empty');
    }
  }

  // Check length constraints
  if (rule.minLength !== undefined) {
    checksTotal++;
    if (value.length >= rule.minLength) {
      compliance++;
    } else {
      failures.push(`length ${value.length} below minimum ${rule.minLength}`);
    }
  }

  if (rule.maxLength !== undefined) {
    checksTotal++;
    if (value.length <= rule.maxLength) {
      compliance++;
    } else {
      failures.push(`length ${value.length} above maximum ${rule.maxLength}`);
    }
  }

  // Check contains
  if (rule.contains && rule.contains.length > 0) {
    checksTotal++;
    const containsAll = rule.contains.every((item) => value.includes(item));
    if (containsAll) {
      compliance++;
    } else {
      failures.push(`missing required values`);
    }
  }

  const meetsRequirement = failures.length === 0;
  const compliancePercentage = checksTotal > 0 ? (compliance / checksTotal) * 100 : 100;

  return {
    settingName,
    settingValue: value,
    requiredValue: rule,
    validationType: 'array',
    meetsRequirement,
    compliancePercentage,
    validationMessage: meetsRequirement
      ? `✓ ${settingName}: array[${value.length}]`
      : `✗ ${settingName}: ${failures.join(', ')}`,
  };
}

/**
 * Object Validation
 * Supports deep property matching
 */
function validateObject(
  value: any,
  rule: ObjectValidationRule,
  settingName: string
): SettingValidationResult {
  if (value === undefined || value === null) {
    return {
      settingName,
      settingValue: value,
      requiredValue: rule,
      validationType: 'object',
      meetsRequirement: false,
      compliancePercentage: 0,
      validationMessage: `Setting "${settingName}" is not set`,
    };
  }

  if (typeof value !== 'object') {
    return {
      settingName,
      settingValue: value,
      requiredValue: rule,
      validationType: 'object',
      meetsRequirement: false,
      compliancePercentage: 0,
      validationMessage: `✗ ${settingName}: not an object`,
    };
  }

  // Check exists only
  if (rule.exists === true) {
    return {
      settingName,
      settingValue: value,
      requiredValue: rule,
      validationType: 'object',
      meetsRequirement: true,
      compliancePercentage: 100,
      validationMessage: `✓ ${settingName}: exists`,
    };
  }

  // Deep property matching
  const failures: string[] = [];
  let compliance = 0;
  let checksTotal = 0;

  for (const [key, expectedValue] of Object.entries(rule)) {
    if (key === 'exists') continue; // Skip exists flag

    checksTotal++;
    const actualValue = getNestedProperty(value, key);

    if (Array.isArray(expectedValue)) {
      // Check if actualValue is an array containing expected values
      if (Array.isArray(actualValue) && expectedValue.every((v) => actualValue.includes(v))) {
        compliance++;
      } else {
        failures.push(`${key} does not contain required values`);
      }
    } else if (actualValue === expectedValue) {
      compliance++;
    } else {
      failures.push(`${key}: ${actualValue} !== ${expectedValue}`);
    }
  }

  const meetsRequirement = failures.length === 0 && checksTotal > 0;
  const compliancePercentage = checksTotal > 0 ? (compliance / checksTotal) * 100 : 0;

  return {
    settingName,
    settingValue: value,
    requiredValue: rule,
    validationType: 'object',
    meetsRequirement,
    compliancePercentage,
    validationMessage: meetsRequirement
      ? `✓ ${settingName}: properties match`
      : `✗ ${settingName}: ${failures.join(', ')}`,
  };
}

/**
 * Duration Validation
 * Validates ISO 8601 duration strings (e.g., "P30D", "PT1H")
 */
function validateDuration(
  value: any,
  rule: DurationValidationRule,
  settingName: string
): SettingValidationResult {
  if (value === undefined || value === null) {
    return {
      settingName,
      settingValue: value,
      requiredValue: rule,
      validationType: 'duration',
      meetsRequirement: false,
      compliancePercentage: 0,
      validationMessage: `Setting "${settingName}" is not set`,
    };
  }

  const strValue = String(value);

  // Parse ISO 8601 duration to milliseconds
  let durationMs: number;
  try {
    durationMs = parseDuration(strValue);
  } catch (error) {
    return {
      settingName,
      settingValue: value,
      requiredValue: rule,
      validationType: 'duration',
      meetsRequirement: false,
      compliancePercentage: 0,
      validationMessage: `✗ ${settingName}: invalid duration format "${strValue}"`,
    };
  }

  const failures: string[] = [];
  let compliance = 0;
  let checksTotal = 0;

  if (rule.minDuration) {
    checksTotal++;
    const minMs = parseDuration(rule.minDuration);
    if (durationMs >= minMs) {
      compliance++;
    } else {
      failures.push(`shorter than minimum ${rule.minDuration}`);
    }
  }

  if (rule.maxDuration) {
    checksTotal++;
    const maxMs = parseDuration(rule.maxDuration);
    if (durationMs <= maxMs) {
      compliance++;
    } else {
      failures.push(`longer than maximum ${rule.maxDuration}`);
    }
  }

  const meetsRequirement = failures.length === 0;
  const compliancePercentage = checksTotal > 0 ? (compliance / checksTotal) * 100 : 0;

  const rangeDesc = [];
  if (rule.minDuration) rangeDesc.push(`min: ${rule.minDuration}`);
  if (rule.maxDuration) rangeDesc.push(`max: ${rule.maxDuration}`);

  return {
    settingName,
    settingValue: value,
    requiredValue: rule,
    validationType: 'duration',
    meetsRequirement,
    compliancePercentage,
    validationMessage: meetsRequirement
      ? `✓ ${settingName}: ${strValue} (${rangeDesc.join(', ')})`
      : `✗ ${settingName}: ${strValue} (${failures.join(', ')})`,
  };
}

/**
 * Parse ISO 8601 duration to milliseconds
 * Supports: P[n]Y[n]M[n]D T[n]H[n]M[n]S
 * Examples: P30D = 30 days, PT1H = 1 hour, P1DT12H = 1.5 days
 */
function parseDuration(duration: string): number {
  const regex = /P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/;
  const matches = duration.match(regex);

  if (!matches) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const [, years, months, days, hours, minutes, seconds] = matches;

  let ms = 0;
  if (years) ms += parseInt(years) * 365 * 24 * 60 * 60 * 1000;
  if (months) ms += parseInt(months) * 30 * 24 * 60 * 60 * 1000; // Approximate
  if (days) ms += parseInt(days) * 24 * 60 * 60 * 1000;
  if (hours) ms += parseInt(hours) * 60 * 60 * 1000;
  if (minutes) ms += parseInt(minutes) * 60 * 1000;
  if (seconds) ms += parseInt(seconds) * 1000;

  return ms;
}

/**
 * Get nested property from object using dot notation
 * Example: getNestedProperty({ a: { b: 1 } }, 'a.b') => 1
 */
function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Calculate overall confidence level from compliance percentage
 */
export function calculateConfidenceLevel(
  compliancePercentage: number
): 'High' | 'Medium' | 'Low' {
  if (compliancePercentage >= 80) return 'High';
  if (compliancePercentage >= 50) return 'Medium';
  return 'Low';
}

/**
 * Calculate overall compliance percentage from multiple validation results
 */
export function calculateOverallCompliance(
  results: SettingValidationResult[]
): number {
  if (results.length === 0) return 0;

  const totalCompliance = results.reduce(
    (sum, result) => sum + result.compliancePercentage,
    0
  );

  return totalCompliance / results.length;
}
