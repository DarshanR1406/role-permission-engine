/**
 * @fileoverview Dynamic Policy Engine with JSON Export/Import capabilities.
 *
 * Provides utilities for defining, validating, serializing (export),
 * deserializing (import), and evaluating dynamic role-permission policies.
 *
 * @module utils/policy
 */

import { hasRole, hasPermission } from './checkPermission';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalizes a string by converting to lowercase and trimming whitespace.
 * @param {string} str
 * @returns {string}
 */
function normalize(str) {
  return typeof str === 'string' ? str.toLowerCase().trim() : '';
}

/**
 * Checks if a string matches a wildcard pattern (e.g. "read:*" matches "read:users", "*" matches everything).
 * @param {string} pattern - The pattern containing wildcards.
 * @param {string} value - The actual value to check against pattern.
 * @returns {boolean}
 */
function matchWildcard(pattern, value) {
  if (!pattern || !value) return false;
  const normPattern = normalize(pattern);
  const normValue = normalize(value);

  if (normPattern === '*' || normPattern === normValue) return true;

  if (normPattern.endsWith(':*')) {
    const prefix = normPattern.slice(0, -2);
    return normValue.startsWith(`${prefix}:`) || normValue === prefix;
  }

  if (normPattern.includes('*')) {
    const escapeRegex = (s) => s.replace(/[-[\]{}()+?.,\\^$|#\s]/g, '\\$&');
    const regexPattern = '^' + normPattern.split('*').map(escapeRegex).join('.*') + '$';
    return new RegExp(regexPattern, 'i').test(normValue);
  }

  return false;
}

/**
 * Recursively resolves all inherited roles for a given list of user roles.
 * Detects circular inheritance loops gracefully.
 *
 * @param {string[]} userRoles - Initial list of user roles.
 * @param {Record<string, { inherits?: string[], permissions?: string[] }>} rolesConfig - Roles dictionary.
 * @returns {Set<string>} Set of all normalized roles (including inherited).
 */
export function resolveInheritedRoles(userRoles = [], rolesConfig = {}) {
  const resolved = new Set();
  const visited = new Set();

  function expand(roleName) {
    const normRole = normalize(roleName);
    if (!normRole || visited.has(normRole)) return;
    visited.add(normRole);
    resolved.add(normRole);

    // Look up role in config (case-insensitive key match)
    const matchedKey = Object.keys(rolesConfig).find(
      (k) => normalize(k) === normRole
    );
    if (matchedKey && rolesConfig[matchedKey]) {
      const inherits = rolesConfig[matchedKey].inherits;
      if (Array.isArray(inherits)) {
        inherits.forEach(expand);
      }
    }
  }

  if (Array.isArray(userRoles)) {
    userRoles.forEach(expand);
  }

  return resolved;
}

/**
 * Collects all permissions assigned to a set of roles based on policy role configurations.
 *
 * @param {Set<string>|string[]} roles - Set or array of normalized user roles.
 * @param {Record<string, { inherits?: string[], permissions?: string[] }>} rolesConfig - Roles dictionary.
 * @returns {Set<string>} Set of permission strings.
 */
export function getPermissionsFromRoles(roles = [], rolesConfig = {}) {
  const permissions = new Set();
  const roleSet = roles instanceof Set ? roles : new Set((roles || []).map(normalize));

  Object.keys(rolesConfig).forEach((key) => {
    if (roleSet.has(normalize(key))) {
      const roleDef = rolesConfig[key];
      if (roleDef && Array.isArray(roleDef.permissions)) {
        roleDef.permissions.forEach((p) => {
          if (p && typeof p === 'string') {
            permissions.add(p.trim());
          }
        });
      }
    }
  });

  return permissions;
}

/**
 * Evaluates a single attribute condition rule against context data.
 * Supports operators: equals, notEquals, in, notIn, contains, greaterThan, lessThan, greaterThanOrEqual, lessThanOrEqual.
 *
 * @param {Object} condition - Condition object { field, operator, value }.
 * @param {Object} userContext - Context object containing attribute values.
 * @returns {boolean}
 */
export function evaluateCondition(condition, userContext = {}) {
  if (!condition || typeof condition !== 'object') return true;

  const { field, operator = 'equals', value } = condition;
  if (!field) return true;

  // Resolve nested field paths (e.g. "department.id" or "attributes.level")
  const fieldParts = field.split('.');
  let actualValue = userContext;
  for (const part of fieldParts) {
    if (actualValue && typeof actualValue === 'object' && part in actualValue) {
      actualValue = actualValue[part];
    } else {
      actualValue = undefined;
      break;
    }
  }

  switch (normalize(operator)) {
    case 'equals':
    case 'eq':
    case '==':
      return actualValue === value || (typeof actualValue === 'string' && normalize(actualValue) === normalize(value));

    case 'notequals':
    case 'neq':
    case '!=':
      return actualValue !== value && (typeof actualValue !== 'string' || normalize(actualValue) !== normalize(value));

    case 'in':
      if (Array.isArray(value)) {
        return value.some((v) => v === actualValue || (typeof v === 'string' && normalize(v) === normalize(actualValue)));
      }
      return false;

    case 'notin':
      if (Array.isArray(value)) {
        return !value.some((v) => v === actualValue || (typeof v === 'string' && normalize(v) === normalize(actualValue)));
      }
      return true;

    case 'contains':
      if (Array.isArray(actualValue)) {
        return actualValue.some((v) => v === value || (typeof v === 'string' && normalize(v) === normalize(value)));
      }
      if (typeof actualValue === 'string') {
        return actualValue.toLowerCase().includes(String(value).toLowerCase());
      }
      return false;

    case 'greaterthan':
    case 'gt':
    case '>':
      return Number(actualValue) > Number(value);

    case 'lessthan':
    case 'lt':
    case '<':
      return Number(actualValue) < Number(value);

    case 'greaterthanorequal':
    case 'gte':
    case '>=':
      return Number(actualValue) >= Number(value);

    case 'lessthanorequal':
    case 'lte':
    case '<=':
      return Number(actualValue) <= Number(value);

    default:
      return false;
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates a policy configuration structure.
 *
 * @param {Object|string} policyInput - Policy configuration object or JSON string.
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validatePolicy(policyInput) {
  const errors = [];
  const warnings = [];

  let policy = policyInput;
  if (typeof policyInput === 'string') {
    try {
      policy = JSON.parse(policyInput);
    } catch (e) {
      return { valid: false, errors: [`Invalid JSON string: ${e.message}`], warnings: [] };
    }
  }

  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    return { valid: false, errors: ['Policy configuration must be a non-null object.'], warnings: [] };
  }

  // Version check
  if (!policy.version) {
    warnings.push('Policy does not specify a "version" field. Defaulting to "1.0".');
  } else if (typeof policy.version !== 'string') {
    errors.push('Policy "version" must be a string (e.g. "1.0").');
  }

  // Roles validation & inheritance check
  if (policy.roles !== undefined) {
    if (typeof policy.roles !== 'object' || Array.isArray(policy.roles) || policy.roles === null) {
      errors.push('Policy "roles" must be an object map of role configurations.');
    } else {
      const roleKeys = Object.keys(policy.roles);

      // Check circular inheritance
      roleKeys.forEach((roleName) => {
        const roleDef = policy.roles[roleName];
        if (roleDef && typeof roleDef === 'object') {
          if (roleDef.inherits !== undefined && !Array.isArray(roleDef.inherits)) {
            errors.push(`Role "${roleName}" inherits field must be an array of role names.`);
          }
          if (roleDef.permissions !== undefined && !Array.isArray(roleDef.permissions)) {
            errors.push(`Role "${roleName}" permissions field must be an array of strings.`);
          }
        } else {
          errors.push(`Role definition for "${roleName}" must be an object.`);
        }
      });

      // Circular dependency check
      roleKeys.forEach((roleName) => {
        const stack = [roleName];
        const visited = new Set();

        function checkCycle(current) {
          if (visited.has(current)) return;
          visited.add(current);

          const matchedKey = roleKeys.find((k) => normalize(k) === normalize(current));
          if (matchedKey && policy.roles[matchedKey] && Array.isArray(policy.roles[matchedKey].inherits)) {
            policy.roles[matchedKey].inherits.forEach((parent) => {
              if (stack.map(normalize).includes(normalize(parent))) {
                errors.push(`Circular role inheritance detected: ${stack.join(' -> ')} -> ${parent}`);
              } else {
                stack.push(parent);
                checkCycle(parent);
                stack.pop();
              }
            });
          }
        }

        checkCycle(roleName);
      });
    }
  }

  // Rules validation
  if (policy.rules !== undefined) {
    if (!Array.isArray(policy.rules)) {
      errors.push('Policy "rules" must be an array of rule objects.');
    } else {
      const ruleIds = new Set();

      policy.rules.forEach((rule, idx) => {
        if (!rule || typeof rule !== 'object') {
          errors.push(`Rule at index ${idx} must be an object.`);
          return;
        }

        if (!rule.id || typeof rule.id !== 'string') {
          errors.push(`Rule at index ${idx} is missing a required string "id".`);
        } else {
          if (ruleIds.has(rule.id)) {
            errors.push(`Duplicate rule ID detected: "${rule.id}".`);
          }
          ruleIds.add(rule.id);
        }

        if (rule.effect !== undefined && rule.effect !== 'allow' && rule.effect !== 'deny') {
          errors.push(`Rule "${rule.id || idx}" effect must be either "allow" or "deny".`);
        }

        if (rule.priority !== undefined && typeof rule.priority !== 'number') {
          errors.push(`Rule "${rule.id || idx}" priority must be a number.`);
        }

        if (rule.roles !== undefined && !Array.isArray(rule.roles)) {
          errors.push(`Rule "${rule.id || idx}" roles must be an array.`);
        }

        if (rule.permissions !== undefined && !Array.isArray(rule.permissions)) {
          errors.push(`Rule "${rule.id || idx}" permissions must be an array.`);
        }

        if (rule.conditions !== undefined) {
          if (Array.isArray(rule.conditions)) {
            rule.conditions.forEach((cond, cIdx) => {
              if (!cond || typeof cond !== 'object') {
                errors.push(`Rule "${rule.id || idx}" condition at index ${cIdx} must be an object.`);
              }
            });
          } else if (typeof rule.conditions !== 'object' || rule.conditions === null) {
            errors.push(`Rule "${rule.id || idx}" conditions must be an array of condition objects or an object.`);
          }
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ─── Export & Import ──────────────────────────────────────────────────────────

/**
 * Serializes a policy configuration object into a JSON string or clean object.
 *
 * @param {Object|PolicyEngine} policy - The policy object or PolicyEngine instance to export.
 * @param {Object} [options={}]
 * @param {boolean} [options.pretty=true] - Whether to format the JSON string with indents.
 * @param {number} [options.indent=2] - Number of spaces for indentation.
 * @param {boolean} [options.stringify=true] - If false, returns a plain JavaScript object instead of string.
 * @param {boolean} [options.validate=true] - Whether to validate the policy before exporting.
 * @returns {string|Object} The JSON string or policy object.
 */
export function exportPolicy(policy, options = {}) {
  const {
    pretty = true,
    indent = 2,
    stringify = true,
    validate = true,
  } = options;

  const rawPolicy = policy && typeof policy.toJSON === 'function' ? policy.toJSON() : policy;

  if (validate) {
    const validation = validatePolicy(rawPolicy);
    if (!validation.valid) {
      throw new Error(`Cannot export invalid policy: ${validation.errors.join('; ')}`);
    }
  }

  const normalized = {
    version: rawPolicy.version || '1.0',
    ...(rawPolicy.name ? { name: rawPolicy.name } : {}),
    ...(rawPolicy.description ? { description: rawPolicy.description } : {}),
    roles: rawPolicy.roles || {},
    rules: rawPolicy.rules || [],
  };

  if (!stringify) return normalized;

  return JSON.stringify(normalized, null, pretty ? indent : undefined);
}

/**
 * Deserializes and validates a JSON string or object into a `PolicyEngine` instance.
 *
 * @param {string|Object} jsonInput - Policy JSON string or raw policy configuration object.
 * @param {Object} [options={}]
 * @param {boolean} [options.strict=true] - Throw an error if policy validation fails.
 * @returns {PolicyEngine} An instantiated PolicyEngine.
 */
export function importPolicy(jsonInput, options = {}) {
  const { strict = true } = options;

  let policyObject = jsonInput;
  if (typeof jsonInput === 'string') {
    try {
      policyObject = JSON.parse(jsonInput);
    } catch (e) {
      if (strict) {
        throw new Error(`Failed to parse policy JSON: ${e.message}`);
      }
      policyObject = {};
    }
  }

  const validation = validatePolicy(policyObject);
  if (strict && !validation.valid) {
    throw new Error(`Invalid policy configuration: ${validation.errors.join('; ')}`);
  }

  return new PolicyEngine(policyObject);
}

// ─── Evaluation ───────────────────────────────────────────────────────────────

/**
 * Evaluates a policy against user credentials and target request context.
 *
 * @param {Object|PolicyEngine} policyInput - Policy configuration object or PolicyEngine instance.
 * @param {Object} context - Request evaluation context.
 * @param {string[]} [context.userRoles=[]] - Roles currently assigned to the user.
 * @param {string[]} [context.userPermissions=[]] - Permissions currently assigned to the user.
 * @param {Object} [context.userContext={}] - User attributes/metadata for dynamic condition checks.
 * @param {Object} [context.target] - Target resource, action, or route being accessed.
 * @param {string} [context.target.resource] - Target resource identifier (e.g. "article").
 * @param {string} [context.target.action] - Target action identifier (e.g. "write").
 * @param {string} [context.target.route] - Target route path (e.g. "/api/admin/users").
 * @returns {{ allowed: boolean, reason: string, matchedRules: Object[], evaluatedRulesCount: number }}
 */
export function evaluatePolicy(policyInput, context = {}) {
  const engine = policyInput instanceof PolicyEngine
    ? policyInput
    : new PolicyEngine(policyInput);

  return engine.evaluate(context);
}

// ─── PolicyEngine Class ───────────────────────────────────────────────────────

/**
 * Class representing a dynamic Policy Engine.
 */
export class PolicyEngine {
  /**
   * @param {Object} [config={}] - Policy configuration.
   */
  constructor(config = {}) {
    const policy = typeof config === 'string' ? JSON.parse(config) : config;
    this.version = policy.version || '1.0';
    this.name = policy.name || '';
    this.description = policy.description || '';
    this.roles = policy.roles || {};
    this.rules = Array.isArray(policy.rules) ? policy.rules : [];
  }

  /**
   * Validates the current policy instance.
   * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
   */
  validate() {
    return validatePolicy(this);
  }

  /**
   * Resolves effective roles for a user, including role inheritance hierarchy.
   * @param {string[]} userRoles - Initial user roles.
   * @returns {string[]} Array of all active role names.
   */
  getEffectiveRoles(userRoles = []) {
    const roleSet = resolveInheritedRoles(userRoles, this.roles);
    return Array.from(roleSet);
  }

  /**
   * Resolves effective permissions combining user permissions and role permissions.
   * @param {string[]} userRoles - User roles.
   * @param {string[]} userPermissions - User direct permissions.
   * @returns {string[]} Array of all active permissions.
   */
  getEffectivePermissions(userRoles = [], userPermissions = []) {
    const effectiveRoles = this.getEffectiveRoles(userRoles);
    const rolePerms = getPermissionsFromRoles(effectiveRoles, this.roles);

    const allPerms = new Set(rolePerms);
    if (Array.isArray(userPermissions)) {
      userPermissions.forEach((p) => p && allPerms.add(p.trim()));
    }

    return Array.from(allPerms);
  }

  /**
   * Evaluates the policy for a user request context.
   *
   * @param {Object} context
   * @param {string[]} [context.userRoles=[]]
   * @param {string[]} [context.userPermissions=[]]
   * @param {Object} [context.userContext={}]
   * @param {Object} [context.target]
   * @returns {{ allowed: boolean, reason: string, matchedRules: Object[], evaluatedRulesCount: number }}
   */
  evaluate(context = {}) {
    const {
      userRoles = [],
      userPermissions = [],
      userContext = {},
      target = {},
    } = context;

    const effectiveRoles = this.getEffectiveRoles(userRoles);
    const effectivePermissions = this.getEffectivePermissions(userRoles, userPermissions);

    if (this.rules.length === 0) {
      // Fallback: standard role & permission check if no dynamic rules are defined in policy
      const basicRoleCheck = hasRole(effectiveRoles, [], 'any');
      const basicPermCheck = hasPermission(effectivePermissions, [], 'any');

      return {
        allowed: basicRoleCheck.allowed && basicPermCheck.allowed,
        reason: 'Policy contains no rules; standard permission access evaluated.',
        matchedRules: [],
        evaluatedRulesCount: 0,
      };
    }

    // Sort rules by priority descending (higher priority first). Default priority is 0.
    const sortedRules = [...this.rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    const matchedRules = [];
    let explicitDenyRule = null;
    let explicitAllowRule = null;

    for (const rule of sortedRules) {
      // 1. Target match (resource, action, route)
      if (rule.target && typeof rule.target === 'object') {
        if (rule.target.resource && target.resource && !matchWildcard(rule.target.resource, target.resource)) {
          continue;
        }
        if (rule.target.action && target.action && !matchWildcard(rule.target.action, target.action)) {
          continue;
        }
        if (rule.target.route && target.route && !matchWildcard(rule.target.route, target.route)) {
          continue;
        }
      }

      // 2. Roles match
      if (Array.isArray(rule.roles) && rule.roles.length > 0) {
        const roleCheck = hasRole(effectiveRoles, rule.roles, rule.roleLogic || 'any');
        if (!roleCheck.allowed) continue;
      }

      // 3. Permissions match
      if (Array.isArray(rule.permissions) && rule.permissions.length > 0) {
        const permCheck = hasPermission(effectivePermissions, rule.permissions, rule.permissionLogic || 'any');
        if (!permCheck.allowed) continue;
      }

      // 4. Conditions match
      if (rule.conditions) {
        const conditionsList = Array.isArray(rule.conditions) ? rule.conditions : [rule.conditions];
        const condLogic = rule.conditionLogic || 'all';

        let conditionsPassed = false;
        if (condLogic === 'all') {
          conditionsPassed = conditionsList.every((cond) => evaluateCondition(cond, userContext));
        } else {
          conditionsPassed = conditionsList.some((cond) => evaluateCondition(cond, userContext));
        }

        if (!conditionsPassed) continue;
      }

      // Rule matched!
      matchedRules.push(rule);

      const effect = normalize(rule.effect || 'allow');
      if (effect === 'deny') {
        explicitDenyRule = rule;
        break; // Deny overrides
      } else if (!explicitAllowRule) {
        explicitAllowRule = rule;
      }
    }

    if (explicitDenyRule) {
      return {
        allowed: false,
        reason: `Access denied by policy rule "${explicitDenyRule.name || explicitDenyRule.id}".`,
        matchedRules,
        evaluatedRulesCount: sortedRules.length,
      };
    }

    if (explicitAllowRule) {
      return {
        allowed: true,
        reason: `Access granted by policy rule "${explicitAllowRule.name || explicitAllowRule.id}".`,
        matchedRules,
        evaluatedRulesCount: sortedRules.length,
      };
    }

    return {
      allowed: false,
      reason: 'No policy rules matched the request context.',
      matchedRules: [],
      evaluatedRulesCount: sortedRules.length,
    };
  }

  /**
   * Serializes current engine state to JSON string or object.
   * @param {Object} [options={}]
   * @returns {string|Object}
   */
  export(options = {}) {
    return exportPolicy(this, options);
  }

  /**
   * Plain object representation of policy.
   * @returns {Object}
   */
  toJSON() {
    return {
      version: this.version,
      ...(this.name ? { name: this.name } : {}),
      ...(this.description ? { description: this.description } : {}),
      roles: this.roles,
      rules: this.rules,
    };
  }

  /**
   * Creates a PolicyEngine instance from JSON string or object.
   * @param {string|Object} jsonInput
   * @param {Object} [options={}]
   * @returns {PolicyEngine}
   */
  static fromJSON(jsonInput, options = {}) {
    return importPolicy(jsonInput, options);
  }

  /**
   * Validates policy input.
   * @param {string|Object} policyInput
   * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
   */
  static validate(policyInput) {
    return validatePolicy(policyInput);
  }
}
