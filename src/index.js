/**
 * @fileoverview Public API barrel export for `role-permission-engine`.
 *
 * Import everything you need from the package root:
 *
 * ```js
 * import {
 *   // React components & HOCs
 *   BlockRoute,
 *   PermissionGate,
 *   withPermission,
 *   PermissionProvider,
 *
 *   // Hooks
 *   usePermission,
 *   usePermissionContext,
 *
 *   // Pure utilities (framework-agnostic)
 *   hasRole,
 *   hasPermission,
 *   checkAccess,
 * } from 'role-permission-engine';
 * ```
 *
 * @module role-permission-engine
 */

// ─── Components ───────────────────────────────────────────────────────────────

/**
 * Route guard component. Redirects unauthorized users.
 *
 * @see {@link module:components/BlockRoute}
 */
export { BlockRoute } from './components/BlockRoute';

/**
 * Inline conditional rendering component based on roles/permissions.
 *
 * @see {@link module:components/PermissionGate}
 */
export { PermissionGate } from './components/PermissionGate';

/**
 * Higher Order Component to wrap and protect a component.
 *
 * @see {@link module:components/withPermission}
 */
export { withPermission } from './components/withPermission';

// ─── Context & Provider ───────────────────────────────────────────────────────

/**
 * Provides permission state to the component tree.
 *
 * @see {@link module:context/PermissionContext}
 */
export { PermissionProvider, usePermissionContext } from './context/PermissionContext';

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Hook for programmatic permission checking.
 *
 * @see {@link module:hooks/usePermission}
 */
export { usePermission } from './hooks/usePermission';

// ─── Pure Utilities ───────────────────────────────────────────────────────────

/**
 * Pure role-checking utility (no React dependency).
 *
 * @see {@link module:utils/checkPermission.hasRole}
 */
export { hasRole } from './utils/checkPermission';

/**
 * Pure permission-checking utility (no React dependency).
 *
 * @see {@link module:utils/checkPermission.hasPermission}
 */
export { hasPermission } from './utils/checkPermission';

/**
 * Combined role + permission check utility (no React dependency).
 *
 * @see {@link module:utils/checkPermission.checkAccess}
 */
export { checkAccess } from './utils/checkPermission';
