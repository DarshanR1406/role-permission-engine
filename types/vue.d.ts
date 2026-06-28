/**
 * Type declarations for the Vue wrapper subpath of `role-permission-engine`.
 *
 * Provides type support for consumers importing from `role-permission-engine/vue`.
 */

import * as Vue from 'vue';
import { Role, Permission, LogicOperator, PermissionResult } from './index';

export const PermissionSymbol: unique symbol;

export interface PermissionState {
  roles: Role[];
  permissions: Permission[];
  user: Record<string, unknown> | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface PermissionPlugin {
  install(app: Vue.App): void;
  updateState(newState: Partial<PermissionState>): void;
  state: PermissionState;
}

/**
 * Creates the Vue plugin instance to provide permission context state.
 */
export function createPermissionPlugin(
  initialState?: Partial<PermissionState>
): PermissionPlugin;

/**
 * Retrieves the currently active global state.
 */
export function getActiveState(): PermissionState | null;

export interface UsePermissionOptions {
  roles?: Role[];
  permissions?: Permission[];
  roleLogic?: LogicOperator;
  permissionLogic?: LogicOperator;
  asyncCheck?: (context: {
    roles: Role[];
    permissions: Permission[];
    user: Record<string, any> | null;
    isAuthenticated: boolean;
  }) => boolean | Promise<boolean>;
}

export interface UsePermissionResult {
  allowed: Vue.ComputedRef<boolean>;
  denied: Vue.ComputedRef<boolean>;
  isLoading: Vue.ComputedRef<boolean>;
  isAuthenticated: Vue.ComputedRef<boolean>;
  reason: Vue.ComputedRef<string>;
}

/**
 * Vue Composable for checking roles and permissions reactively.
 */
export function usePermission(options?: UsePermissionOptions): UsePermissionResult;

/**
 * Vue component for conditional rendering.
 */
export declare const PermissionGate: Vue.DefineComponent<{
  roles: { type: Vue.PropType<Role[]>; default: () => [] };
  permissions: { type: Vue.PropType<Permission[]>; default: () => [] };
  roleLogic: { type: Vue.PropType<LogicOperator>; default: 'any' };
  permissionLogic: { type: Vue.PropType<LogicOperator>; default: 'any' };
  negate: { type: Vue.PropType<boolean>; default: false };
  asyncCheck: { type: Vue.PropType<Function>; default: null };
}>;

/**
 * Directive v-permission
 */
export declare const permissionDirective: Vue.Directive;

/**
 * Directive v-role
 */
export declare const roleDirective: Vue.Directive;

export { checkAccess, hasPermission, hasRole } from './index';
export { CheckAccessOptions, LogicOperator, Permission, PermissionResult, Role } from './index';
