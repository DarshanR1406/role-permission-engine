/**
 * Type declarations for `role-permission-engine`.
 *
 * These types mirror the JSDoc annotations in the source files and provide
 * full IntelliSense support for TypeScript consumers.
 */

import * as React from 'react';

// ─── Primitives ───────────────────────────────────────────────────────────────

/** A user role string, e.g. `"admin"`, `"editor"`. */
export type Role = string;

/** A permission string, e.g. `"read:users"`, `"write:posts"`, `"*"`. */
export type Permission = string;

/**
 * Logical operator for multi-value checks.
 * - `"any"` — OR logic (at least one match required).
 * - `"all"` — AND logic (every item must match).
 */
export type LogicOperator = 'any' | 'all';

/** Result returned by permission utility functions. */
export interface PermissionResult {
  /** Whether the user is allowed. */
  allowed: boolean;
  /** Human-readable explanation. */
  reason: string;
}

// ─── Utility Functions ────────────────────────────────────────────────────────

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

/** Options for `checkAccess`. */
export interface CheckAccessOptions {
  userRoles?: Role[];
  userPermissions?: Permission[];
  requiredRoles?: Role[];
  requiredPermissions?: Permission[];
  roleLogic?: LogicOperator;
  permissionLogic?: LogicOperator;
}

/**
 * Combined role + permission access check.
 * Both role and permission constraints must pass for `allowed` to be `true`.
 */
export function checkAccess(options: CheckAccessOptions): PermissionResult;

// ─── Context ──────────────────────────────────────────────────────────────────

/** The shape of the value stored in the permission context. */
export interface PermissionContextValue {
  roles: Role[];
  permissions: Permission[];
  user: Record<string, unknown> | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/** Props for `PermissionProvider`. */
export interface PermissionProviderProps {
  roles?: Role[];
  permissions?: Permission[];
  user?: Record<string, unknown> | null;
  isAuthenticated?: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
}

/**
 * Provides permission state to all child components.
 * Wrap your app root (or a sub-tree) with this provider.
 */
export const PermissionProvider: React.FC<PermissionProviderProps>;

/**
 * Returns the current permission context value.
 * Must be used inside a `<PermissionProvider>`.
 */
export function usePermissionContext(): PermissionContextValue;

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Options for `usePermission`. */
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

/** Value returned by `usePermission`. */
export interface UsePermissionResult {
  /** Whether the user is allowed access. */
  allowed: boolean;
  /** Convenience inverse of `allowed`. */
  denied: boolean;
  /** Whether the auth state is still loading. */
  isLoading: boolean;
  /** Whether the user is authenticated. */
  isAuthenticated: boolean;
  /** Human-readable explanation of the result. */
  reason: string;
}

/**
 * Hook for programmatic permission checking.
 * Reads from the nearest `PermissionProvider`.
 */
export function usePermission(options?: UsePermissionOptions): UsePermissionResult;

// ─── Components ───────────────────────────────────────────────────────────────

/** Props for `BlockRoute`. */
export interface BlockRouteProps {
  children: React.ReactNode;
  roles?: Role[];
  permissions?: Permission[];
  roleLogic?: LogicOperator;
  permissionLogic?: LogicOperator;
  /** Path to redirect to when access is denied. Defaults to `"/unauthorized"`. */
  redirectTo?: string;
  /** Component to render while auth state is loading. */
  loadingComponent?: React.ReactNode;
  /** Replace the history entry on redirect. Defaults to `true`. */
  replace?: boolean;
  /** State to pass to the redirect location. */
  state?: unknown;
  asyncCheck?: (context: {
    roles: Role[];
    permissions: Permission[];
    user: Record<string, any> | null;
    isAuthenticated: boolean;
  }) => boolean | Promise<boolean>;
}

/**
 * Route guard component. Redirects unauthorized users to `redirectTo`.
 * Compatible with React Router v5 and v6.
 *
 * @example
 * // React Router v6
 * <Route path="/admin" element={<BlockRoute roles={['admin']}><AdminPage /></BlockRoute>} />
 */
export const BlockRoute: React.FC<BlockRouteProps>;

/** Props for `PermissionGate`. */
export interface PermissionGateProps {
  children: React.ReactNode;
  roles?: Role[];
  permissions?: Permission[];
  roleLogic?: LogicOperator;
  permissionLogic?: LogicOperator;
  /** Content to render when the user is NOT authorized. */
  fallback?: React.ReactNode;
  /** Content to render while auth state is loading. */
  loadingComponent?: React.ReactNode;
  /**
   * When `true`, inverts the check — renders `children` when the user
   * does NOT have the roles/permissions.
   */
  negate?: boolean;
  asyncCheck?: (context: {
    roles: Role[];
    permissions: Permission[];
    user: Record<string, any> | null;
    isAuthenticated: boolean;
  }) => boolean | Promise<boolean>;
}

/**
 * Inline conditional rendering based on roles/permissions.
 * Unlike `BlockRoute`, this never redirects — it shows or hides content.
 *
 * @example
 * <PermissionGate roles={['admin']} fallback={<p>No access</p>}>
 *   <DeleteButton />
 * </PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps>;

/** Options accepted by `withPermission`. */
export interface WithPermissionOptions {
  roles?: Role[];
  permissions?: Permission[];
  roleLogic?: LogicOperator;
  permissionLogic?: LogicOperator;
  /** Content to render when access is denied. Defaults to `null`. */
  fallback?: React.ReactNode;
  /** Content to render while auth state is loading. Defaults to `null`. */
  loadingComponent?: React.ReactNode;
  /**
   * When `true`, inverts the check — renders the component when the user
   * does NOT have the roles/permissions. Defaults to `false`.
   */
  negate?: boolean;
  asyncCheck?: (context: {
    roles: Role[];
    permissions: Permission[];
    user: Record<string, any> | null;
    isAuthenticated: boolean;
  }) => boolean | Promise<boolean>;
}

/**
 * Higher Order Component that wraps a component with a permission check.
 * The wrapped component is only rendered when the current user passes the
 * role and permission requirements.
 *
 * @param WrappedComponent - The component to protect.
 * @param options - Access control options.
 * @returns A new component wrapped with the permission gate.
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: WithPermissionOptions
): React.FC<P>;

