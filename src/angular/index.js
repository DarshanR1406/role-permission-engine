/**
 * @fileoverview Public API exports for Angular SDK.
 *
 * Import from 'role-permission-engine/angular':
 *
 * ```ts
 * import {
 *   PermissionService,
 *   permissionGuard,
 * } from 'role-permission-engine/angular';
 * ```
 */

export { PermissionService } from './PermissionService';
export { permissionGuard } from './permissionGuard';
export { checkAccess, hasPermission, hasRole } from '../utils/checkPermission';
