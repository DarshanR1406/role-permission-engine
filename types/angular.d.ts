/**
 * Type declarations for the Angular wrapper subpath of `role-permission-engine`.
 *
 * Provides type support for consumers importing from `role-permission-engine/angular`.
 */

import { Signal } from '@angular/core';
import { Role, Permission, LogicOperator, PermissionResult } from './index';

export declare class PermissionService {
  constructor();

  /** Get the current user roles (Signal). */
  readonly roles: Signal<Role[]>;

  /** Get the current user permissions (Signal). */
  readonly permissions: Signal<Permission[]>;

  /** Get the current user object (Signal). */
  readonly user: Signal<Record<string, unknown> | null>;

  /** Get whether the user is authenticated (Signal). */
  readonly isAuthenticated: Signal<boolean>;

  /** Get whether the auth state is currently loading (Signal). */
  readonly isLoading: Signal<boolean>;

  /**
   * Updates the permission engine state.
   */
  updateState(newState?: Partial<{
    roles: Role[];
    permissions: Permission[];
    user: Record<string, unknown> | null;
    isAuthenticated: boolean;
    isLoading: boolean;
  }>): void;

  /**
   * Checks whether the user has the required roles and permissions.
   * Returns a computed Signal evaluating to true or false.
   */
  hasAccess(options?: {
    roles?: Role[];
    permissions?: Permission[];
    roleLogic?: LogicOperator;
    permissionLogic?: LogicOperator;
  }): Signal<boolean>;

  /**
   * Checks whether the user has at least one of (or all) the required roles.
   * Returns a computed Signal evaluating to true or false.
   */
  hasRole(requiredRoles: Role[] | Role, logic?: LogicOperator): Signal<boolean>;

  /**
   * Checks whether the user has at least one of (or all) the required permissions.
   * Returns a computed Signal evaluating to true or false.
   */
  hasPermission(requiredPermissions: Permission[] | Permission, logic?: LogicOperator): Signal<boolean>;
}

/**
 * Functional route guard for role and permission authorization.
 */
export function permissionGuard(options?: {
  roles?: Role[];
  permissions?: Permission[];
  roleLogic?: LogicOperator;
  permissionLogic?: LogicOperator;
  redirectTo?: string;
}): () => boolean | Promise<boolean | any> | any;

export { checkAccess, hasPermission, hasRole } from './index';
export { CheckAccessOptions, LogicOperator, Permission, PermissionResult, Role } from './index';
