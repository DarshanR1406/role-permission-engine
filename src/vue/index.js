/**
 * @fileoverview Public API exports for Vue SDK.
 *
 * Import from 'role-permission-engine/vue':
 *
 * ```js
 * import {
 *   createPermissionPlugin,
 *   usePermission,
 *   PermissionGate,
 *   permissionDirective,
 *   roleDirective,
 * } from 'role-permission-engine/vue';
 * ```
 */

export { createPermissionPlugin } from './PermissionPlugin';
export { usePermission } from './usePermission';
export { PermissionGate } from './PermissionGate';
export { permissionDirective, roleDirective } from './directives';
export { getActiveState } from './PermissionPlugin';
export { checkAccess, hasPermission, hasRole } from '../utils/checkPermission';
