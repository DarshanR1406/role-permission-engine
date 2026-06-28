/**
 * @fileoverview Angular `PermissionService` using Signals.
 *
 * This service manages user roles and permissions in a reactive way using Angular Signals.
 * Register it in your application's providers list:
 *
 * ```ts
 * import { PermissionService } from 'role-permission-engine/angular';
 *
 * // app.config.ts (or app.module.ts)
 * providers: [
 *   PermissionService,
 * ]
 * ```
 */

import { signal, computed } from '@angular/core';
import { checkAccess, hasRole, hasPermission } from '../utils/checkPermission';

export class PermissionService {
  constructor() {
    this._roles = signal([]);
    this._permissions = signal([]);
    this._user = signal(null);
    this._isAuthenticated = signal(false);
    this._isLoading = signal(false);
  }

  /**
   * Get the current user roles (read-only signal).
   */
  get roles() {
    return this._roles.asReadonly ? this._roles.asReadonly() : this._roles;
  }

  /**
   * Get the current user permissions (read-only signal).
   */
  get permissions() {
    return this._permissions.asReadonly ? this._permissions.asReadonly() : this._permissions;
  }

  /**
   * Get the current user object (read-only signal).
   */
  get user() {
    return this._user.asReadonly ? this._user.asReadonly() : this._user;
  }

  /**
   * Get whether the user is authenticated (read-only signal).
   */
  get isAuthenticated() {
    return this._isAuthenticated.asReadonly ? this._isAuthenticated.asReadonly() : this._isAuthenticated;
  }

  /**
   * Get whether the auth state is currently loading (read-only signal).
   */
  get isLoading() {
    return this._isLoading.asReadonly ? this._isLoading.asReadonly() : this._isLoading;
  }

  /**
   * Updates the permission engine state.
   *
   * @param {Object} newState
   * @param {string[]} [newState.roles]
   * @param {string[]} [newState.permissions]
   * @param {Object|null} [newState.user]
   * @param {boolean} [newState.isAuthenticated]
   * @param {boolean} [newState.isLoading]
   */
  updateState(newState = {}) {
    if ('roles' in newState) {
      this._roles.set(newState.roles || []);
    }
    if ('permissions' in newState) {
      this._permissions.set(newState.permissions || []);
    }
    if ('user' in newState) {
      this._user.set(newState.user || null);
    }
    if ('isAuthenticated' in newState) {
      this._isAuthenticated.set(!!newState.isAuthenticated);
    }
    if ('isLoading' in newState) {
      this._isLoading.set(!!newState.isLoading);
    }
  }

  /**
   * Checks whether the user has the required roles and permissions.
   * Returns a computed Signal evaluating to `true` or `false`.
   *
   * @param {Object} options
   * @param {string[]} [options.roles]
   * @param {string[]} [options.permissions]
   * @param {"any"|"all"} [options.roleLogic="any"]
   * @param {"any"|"all"} [options.permissionLogic="any"]
   *
   * @returns {import('@angular/core').Signal<boolean>}
   */
  hasAccess(options = {}) {
    return computed(() => {
      if (this._isLoading()) {
        return false;
      }
      return checkAccess({
        userRoles: this._roles(),
        userPermissions: this._permissions(),
        requiredRoles: options.roles || [],
        requiredPermissions: options.permissions || [],
        roleLogic: options.roleLogic || 'any',
        permissionLogic: options.permissionLogic || 'any',
      }).allowed;
    });
  }

  /**
   * Checks whether the user has at least one of (or all) the required roles.
   * Returns a computed Signal evaluating to `true` or `false`.
   *
   * @param {string[]|string} requiredRoles
   * @param {"any"|"all"} [logic="any"]
   *
   * @returns {import('@angular/core').Signal<boolean>}
   */
  hasRole(requiredRoles, logic = 'any') {
    return computed(() => {
      if (this._isLoading()) {
        return false;
      }
      const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      return hasRole(this._roles(), rolesArray, logic).allowed;
    });
  }

  /**
   * Checks whether the user has at least one of (or all) the required permissions.
   * Returns a computed Signal evaluating to `true` or `false`.
   *
   * @param {string[]|string} requiredPermissions
   * @param {"any"|"all"} [logic="any"]
   *
   * @returns {import('@angular/core').Signal<boolean>}
   */
  hasPermission(requiredPermissions, logic = 'any') {
    return computed(() => {
      if (this._isLoading()) {
        return false;
      }
      const permissionsArray = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
      return hasPermission(this._permissions(), permissionsArray, logic).allowed;
    });
  }
}
export default PermissionService;
