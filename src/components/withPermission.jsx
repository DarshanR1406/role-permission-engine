/**
 * @fileoverview `withPermission` Higher Order Component (HOC).
 *
 * Wraps any React component with a permission gate, redirecting or hiding
 * the component based on the current user's roles and permissions.
 *
 * Use `withPermission` when you prefer the HOC pattern over JSX composition,
 * or when wrapping class-based components that cannot use hooks directly.
 *
 * @module components/withPermission
 */

import React from 'react';
import { usePermission } from '../hooks/usePermission';

// ─── Type Definitions ─────────────────────────────────────────────────────────

/**
 * Options accepted by `withPermission`.
 *
 * @typedef {Object} WithPermissionOptions
 *
 * @property {string[]} [roles=[]]
 *   Role strings the user must have to render the wrapped component.
 *   - Any strings are accepted — you define what roles mean in your app.
 *   - Pass `[]` (default) to skip the role check entirely.
 *
 * @property {string[]} [permissions=[]]
 *   Permission strings the user must have to render the wrapped component.
 *   - Supports wildcards: `'*'` (all access), `'read:*'` (all read: perms).
 *   - Pass `[]` (default) to skip the permission check entirely.
 *
 * @property {"any" | "all"} [roleLogic="any"]
 *   Controls how multiple `roles` are evaluated.
 *
 *   | Value   | Alias | Behaviour                                      | Default? |
 *   |---------|-------|------------------------------------------------|----------|
 *   | `"any"` | OR    | User needs **at least one** required role      | ✅ Yes   |
 *   | `"all"` | AND   | User needs **every** required role             | No       |
 *
 * @property {"any" | "all"} [permissionLogic="any"]
 *   Controls how multiple `permissions` are evaluated.
 *
 *   | Value   | Alias | Behaviour                                           | Default? |
 *   |---------|-------|-----------------------------------------------------|----------|
 *   | `"any"` | OR    | User needs **at least one** required permission     | ✅ Yes   |
 *   | `"all"` | AND   | User needs **every** required permission            | No       |
 *
 * @property {React.ReactNode} [fallback=null]
 *   What to render when access is **denied**.
 *   - Default: `null` — renders nothing when the user lacks access.
 *   - Examples: `fallback={<p>Access denied.</p>}`
 *
 * @property {React.ReactNode} [loadingComponent=null]
 *   What to render while auth state is being resolved (`isLoading=true`).
 *   - Default: `null` — renders nothing during loading.
 *
 * @property {boolean} [negate=false]
 *   **Inverts** the access check result.
 *
 *   | Value   | Renders wrapped component when…                   | Default? |
 *   |---------|--------------------------------------------------|----------|
 *   | `false` | User **has** the required roles / permissions    | ✅ Yes   |
 *   | `true`  | User **does NOT have** the roles / permissions   | No       |
 */

// ─── HOC ─────────────────────────────────────────────────────────────────────

/**
 * Higher Order Component that wraps a component with a permission check.
 *
 * The wrapped component is only rendered when the current user passes the
 * role and permission requirements. When access is denied, `fallback` is
 * rendered instead (default: `null`). While auth resolves, `loadingComponent`
 * is rendered (default: `null`).
 *
 * Reads auth state from the nearest {@link PermissionProvider} in the tree.
 *
 * - ✅ **Allowed** → renders the wrapped component with all its original props.
 * - ❌ **Denied**  → renders `fallback` (default: `null`).
 * - ⏳ **Loading** → renders `loadingComponent` (default: `null`).
 * - 🔄 **Negated** (`negate=true`) → swaps allowed ↔ denied before rendering.
 *
 * @template {object} P
 * @param {React.ComponentType<P>} WrappedComponent
 *   The component to protect. Receives all its original props unchanged.
 *
 * @param {WithPermissionOptions} [options={}]
 *   Access control options. See {@link WithPermissionOptions} for full details.
 *
 * @returns {React.FC<P>}
 *   A new component with the same props as `WrappedComponent`, wrapped with
 *   the permission gate.
 *
 * @example <caption>Basic role guard — HOC style</caption>
 * import { withPermission } from 'role-permission-engine';
 *
 * function AdminPanel(props) {
 *   return <div>Admin content for {props.title}</div>;
 * }
 *
 * // Only users with the 'admin' role can see AdminPanel
 * export const ProtectedAdminPanel = withPermission(AdminPanel, {
 *   roles: ['admin'],
 *   fallback: <p>You do not have access.</p>,
 * });
 *
 * // Usage — pass props normally
 * <ProtectedAdminPanel title="Settings" />
 *
 * @example <caption>AND permission logic</caption>
 * const ReportExporter = withPermission(ExporterComponent, {
 *   permissions: ['read:reports', 'export:reports'],
 *   permissionLogic: 'all',   // must have BOTH
 *   fallback: <UpgradePrompt />,
 * });
 *
 * @example <caption>negate — show only to guests (users who lack the role)</caption>
 * const GuestBanner = withPermission(Banner, {
 *   roles: ['user', 'admin'],
 *   negate: true, // renders Banner when user does NOT have 'user' or 'admin'
 * });
 *
 * @example <caption>Wrapping a class component</caption>
 * class LegacyDashboard extends React.Component {
 *   render() { return <div>Legacy</div>; }
 * }
 *
 * export const ProtectedLegacyDashboard = withPermission(LegacyDashboard, {
 *   roles: ['admin'],
 *   loadingComponent: <Spinner />,
 * });
 */
export function withPermission(WrappedComponent, options = {}) {
  const {
    roles = [],
    permissions = [],
    roleLogic = 'any',
    permissionLogic = 'any',
    fallback = null,
    loadingComponent = null,
    negate = false,
  } = options;

  /**
   * The inner component produced by `withPermission`.
   *
   * @param {object} props - All props are forwarded to `WrappedComponent`.
   * @returns {React.ReactElement|null}
   */
  function WithPermissionWrapper(props) {
    const { allowed, isLoading } = usePermission({
      roles,
      permissions,
      roleLogic,
      permissionLogic,
    });

    if (isLoading) {
      return loadingComponent || null;
    }

    const shouldRender = negate ? !allowed : allowed;

    if (!shouldRender) {
      return fallback || null;
    }

    return <WrappedComponent {...props} />;
  }

  // Preserve a meaningful display name for React DevTools
  WithPermissionWrapper.displayName = `withPermission(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return WithPermissionWrapper;
}

export default withPermission;
