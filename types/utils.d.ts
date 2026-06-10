/**
 * Type declarations for the backend utility subpath of `role-permission-engine`.
 *
 * Provides type support for consumers importing from `role-permission-engine/utils`.
 */

import { Role, Permission, LogicOperator, PermissionResult, CheckAccessOptions } from './index';

/**
 * Checks whether the user's roles satisfy the required roles.
 *
 * @param userRoles     - The roles currently held by the user.
 * @param requiredRoles - The roles required to pass the check.
 * @param logic         - `"any"` (OR) or `"all"` (AND). Defaults to `"any"`.
 */
export function hasRole(
  userRoles: Role[],
  requiredRoles: Role[],
  logic?: LogicOperator
): PermissionResult;

/**
 * Checks whether the user's permissions satisfy the required permissions.
 * Supports wildcard `"*"` and namespace wildcards like `"read:*"`.
 *
 * @param userPermissions     - The permissions currently held by the user.
 * @param requiredPermissions - The permissions required to pass the check.
 * @param logic               - `"any"` (OR) or `"all"` (AND). Defaults to `"any"`.
 */
export function hasPermission(
  userPermissions: Permission[],
  requiredPermissions: Permission[],
  logic?: LogicOperator
): PermissionResult;

/**
 * Combined role + permission access check.
 * Both role and permission constraints must pass for `allowed` to be `true`.
 */
export function checkAccess(options: CheckAccessOptions): PermissionResult;
