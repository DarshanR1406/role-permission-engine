/**
 * Type declarations for the Policy Engine subpath of `role-permission-engine`.
 *
 * Import policy utilities via:
 * ```js
 * import { PolicyEngine, exportPolicy, importPolicy, validatePolicy, evaluatePolicy } from 'role-permission-engine/policy';
 * ```
 *
 * @module role-permission-engine/policy
 */

import { Role, Permission, LogicOperator } from './index';

/** Role definition within a policy, supporting role inheritance and permission assignment. */
export interface RoleDefinition {
  /** List of parent role names inherited by this role. */
  inherits?: Role[];
  /** Direct permissions granted to this role. */
  permissions?: Permission[];
}

/** Target resource, action, or route pattern for a dynamic rule. */
export interface RuleTarget {
  /** Target resource (supports wildcards e.g. `"article"`, `"article:*"`). */
  resource?: string;
  /** Target action (supports wildcards e.g. `"read"`, `"write"`). */
  action?: string;
  /** Target route path (supports wildcards e.g. `"/api/v1/*"`). */
  route?: string;
}

/** Attribute comparison condition for ABAC dynamic evaluation. */
export interface RuleCondition {
  /** Context property path (e.g. `"department"`, `"user.level"`). */
  field: string;
  /** Comparison operator. Defaults to `"equals"`. */
  operator?:
    | 'equals'
    | 'eq'
    | '=='
    | 'notEquals'
    | 'neq'
    | '!='
    | 'in'
    | 'notIn'
    | 'contains'
    | 'greaterThan'
    | 'gt'
    | '>'
    | 'lessThan'
    | 'lt'
    | '<'
    | 'greaterThanOrEqual'
    | 'gte'
    | '>='
    | 'lessThanOrEqual'
    | 'lte'
    | '<=';
  /** Expected target value. */
  value: any;
}

/** Dynamic access rule definition. */
export interface DynamicRule {
  /** Unique rule identifier. */
  id: string;
  /** Human-readable rule name. */
  name?: string;
  /** Rule outcome: `"allow"` or `"deny"`. Defaults to `"allow"`. */
  effect?: 'allow' | 'deny';
  /** Priority ordering for evaluation (higher numbers evaluated first). Defaults to 0. */
  priority?: number;
  /** Target resource, action, or route filtering. */
  target?: RuleTarget;
  /** Roles required to match this rule. */
  roles?: Role[];
  /** Logic operator for role matching: `"any"` (OR) or `"all"` (AND). */
  roleLogic?: LogicOperator;
  /** Permissions required to match this rule. */
  permissions?: Permission[];
  /** Logic operator for permission matching: `"any"` (OR) or `"all"` (AND). */
  permissionLogic?: LogicOperator;
  /** Dynamic attribute conditions (ABAC). */
  conditions?: RuleCondition | RuleCondition[];
  /** Condition evaluation logic: `"all"` (AND) or `"any"` (OR). Defaults to `"all"`. */
  conditionLogic?: 'all' | 'any';
}

/** Schema for a complete JSON policy document. */
export interface PolicyConfig {
  /** Policy specification version string (e.g. `"1.0"`). */
  version?: string;
  /** Policy name. */
  name?: string;
  /** Policy description. */
  description?: string;
  /** Dictionary of role configurations. */
  roles?: Record<Role, RoleDefinition>;
  /** Array of dynamic rule definitions. */
  rules?: DynamicRule[];
}

/** Validation result object returned by `validatePolicy`. */
export interface PolicyValidationResult {
  /** Whether the policy configuration is valid. */
  valid: boolean;
  /** List of validation error messages. */
  errors: string[];
  /** List of non-fatal warnings. */
  warnings: string[];
}

/** Request context supplied when evaluating a policy. */
export interface EvaluationContext {
  /** Current roles assigned to the user. */
  userRoles?: Role[];
  /** Current permissions assigned to the user. */
  userPermissions?: Permission[];
  /** Arbitrary user metadata/attributes for condition checks. */
  userContext?: Record<string, any>;
  /** Target request target. */
  target?: RuleTarget;
}

/** Result returned by `evaluatePolicy`. */
export interface PolicyEvaluationResult {
  /** Whether access is allowed. */
  allowed: boolean;
  /** Human-readable reason for the decision. */
  reason: string;
  /** Array of rules that matched the request context. */
  matchedRules: DynamicRule[];
  /** Number of rules evaluated during check. */
  evaluatedRulesCount: number;
}

/** Options for exporting a policy to JSON string or object. */
export interface ExportPolicyOptions {
  /** Format JSON output with indentation. Defaults to `true`. */
  pretty?: boolean;
  /** Number of spaces for indenting. Defaults to 2. */
  indent?: number;
  /** Return JSON string if `true`, or raw object if `false`. Defaults to `true`. */
  stringify?: boolean;
  /** Validate policy schema before exporting. Defaults to `true`. */
  validate?: boolean;
}

/** Options for importing a JSON policy. */
export interface ImportPolicyOptions {
  /** Throw an error if validation fails. Defaults to `true`. */
  strict?: boolean;
}

/**
 * Validates a policy configuration structure or JSON string.
 *
 * Checks schema validity, version presence, duplicate rule IDs, and circular role inheritance loops.
 *
 * @param policyInput - Policy configuration object or JSON string.
 * @returns Object containing `valid: boolean`, `errors: string[]`, and `warnings: string[]`.
 *
 * @example
 * ```js
 * const result = validatePolicy(jsonString);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export function validatePolicy(
  policyInput: PolicyConfig | string
): PolicyValidationResult;

/**
 * Serializes a policy configuration object or `PolicyEngine` instance into a clean JSON string or JavaScript object.
 *
 * @param policy - Policy configuration object or `PolicyEngine` instance.
 * @param options - Formatting and validation options (`pretty`, `indent`, `stringify`, `validate`).
 * @returns Clean JSON string or policy object.
 *
 * @example
 * ```js
 * const jsonString = exportPolicy(policyConfig, { pretty: true, indent: 2 });
 * console.log(jsonString);
 * ```
 */
export function exportPolicy(
  policy: PolicyConfig | PolicyEngine,
  options?: ExportPolicyOptions
): string | PolicyConfig;

/**
 * Deserializes and validates a JSON string or object into a active `PolicyEngine` instance.
 *
 * @param jsonInput - Policy JSON string or raw policy configuration object.
 * @param options - Import options (e.g. `{ strict: true }`).
 * @returns A fully instantiated `PolicyEngine`.
 *
 * @example
 * ```js
 * const engine = importPolicy(jsonString);
 * const result = engine.evaluate({ userRoles: ['editor'] });
 * ```
 */
export function importPolicy(
  jsonInput: string | PolicyConfig,
  options?: ImportPolicyOptions
): PolicyEngine;

/**
 * Evaluates a policy against user credentials and request target context.
 *
 * @param policyInput - Policy configuration object or `PolicyEngine` instance.
 * @param context - Evaluation context containing `userRoles`, `userPermissions`, `userContext`, and `target`.
 * @returns Result object `{ allowed: boolean, reason: string, matchedRules: DynamicRule[], evaluatedRulesCount: number }`.
 *
 * @example
 * ```js
 * const result = evaluatePolicy(policy, {
 *   userRoles: ['editor'],
 *   userPermissions: ['write:posts'],
 *   target: { resource: 'posts', action: 'write' },
 * });
 * console.log(result.allowed); // true
 * ```
 */
export function evaluatePolicy(
  policyInput: PolicyConfig | PolicyEngine,
  context?: EvaluationContext
): PolicyEvaluationResult;

/**
 * Recursively resolves all inherited roles for user roles.
 *
 * @param userRoles - Array of current user roles.
 * @param rolesConfig - Roles dictionary map.
 * @returns Set of all active role names (including parents).
 */
export function resolveInheritedRoles(
  userRoles?: Role[],
  rolesConfig?: Record<Role, RoleDefinition>
): Set<Role>;

/**
 * Collects all permissions assigned to roles from policy configuration.
 *
 * @param roles - Set or array of role names.
 * @param rolesConfig - Roles dictionary map.
 * @returns Set of permission strings.
 */
export function getPermissionsFromRoles(
  roles?: Role[] | Set<Role>,
  rolesConfig?: Record<Role, RoleDefinition>
): Set<Permission>;

/**
 * Class representing a dynamic Policy Engine instance.
 *
 * @example
 * ```js
 * const engine = new PolicyEngine({
 *   version: '1.0',
 *   roles: { admin: { permissions: ['*'] } },
 *   rules: [{ id: 'r1', effect: 'allow', roles: ['admin'] }]
 * });
 *
 * const res = engine.evaluate({ userRoles: ['admin'] });
 * ```
 */
export class PolicyEngine {
  version: string;
  name?: string;
  description?: string;
  roles: Record<Role, RoleDefinition>;
  rules: DynamicRule[];

  constructor(config?: PolicyConfig | string);

  /** Validates current policy instance. */
  validate(): PolicyValidationResult;

  /** Resolves all inherited roles for a user. */
  getEffectiveRoles(userRoles?: Role[]): Role[];

  /** Resolves all inherited role permissions and user permissions. */
  getEffectivePermissions(userRoles?: Role[], userPermissions?: Permission[]): Permission[];

  /** Evaluates request context against dynamic rules. */
  evaluate(context?: EvaluationContext): PolicyEvaluationResult;

  /** Serializes engine state to JSON string or object. */
  export(options?: ExportPolicyOptions): string | PolicyConfig;

  /** Returns plain JS object representation of policy. */
  toJSON(): PolicyConfig;

  /** Creates PolicyEngine instance from JSON string or object. */
  static fromJSON(jsonInput: string | PolicyConfig, options?: ImportPolicyOptions): PolicyEngine;

  /** Validates policy configuration. */
  static validate(policyInput: PolicyConfig | string): PolicyValidationResult;
}
