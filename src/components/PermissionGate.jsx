/**
 * @fileoverview `PermissionGate` component — inline conditional rendering.
 *
 * Unlike `BlockRoute` (which redirects), `PermissionGate` simply shows or
 * hides its `children` based on the user's roles/permissions. Use it for
 * buttons, menu items, sections, or any UI element that should only be
 * visible to certain users.
 *
 * @module components/PermissionGate
 */

import React from 'react';
import { usePermission } from '../hooks/usePermission';

// ─── Type Definitions ─────────────────────────────────────────────────────────

/**
 * Props accepted by the `PermissionGate` component.
 *
 * @typedef {Object} PermissionGateProps
 *
 * @property {React.ReactNode} children
 *   **Required.** Content shown when access is **granted** (or when `negate=true`
 *   and access is **denied**). Can be any renderable React node.
 *
 * @property {string[]} [roles=[]]
 *   Role strings the user must have for the gate to open.
 *   - Any strings are accepted — you define what roles mean in your app.
 *   - Pass `[]` (default) to skip the role check entirely.
 *   - Examples: `['admin']`, `['editor', 'manager']`
 *
 * @property {string[]} [permissions=[]]
 *   Permission strings the user must have for the gate to open.
 *   - Supports wildcards: `'*'` (all access), `'read:*'` (all read: perms).
 *   - Pass `[]` (default) to skip the permission check entirely.
 *   - Examples: `['write:posts']`, `['read:reports', 'export:reports']`
 *
 * @property {"any" | "all"} [roleLogic="any"]
 *   Controls how multiple `roles` are evaluated.
 *
 *   | Value   | Alias | Behaviour                                      | Default? |
 *   |---------|-------|------------------------------------------------|----------|
 *   | `"any"` | OR    | User needs **at least one** required role      | ✅ Yes   |
 *   | `"all"` | AND   | User needs **every** required role             | No       |
 *
 *   ```jsx
 *   // OR logic (default) — admin OR editor can see the content
 *   <PermissionGate roles={['admin', 'editor']}>
 *
 *   // AND logic — user must be BOTH admin AND editor
 *   <PermissionGate roles={['admin', 'editor']} roleLogic="all">
 *   ```
 *
 * @property {"any" | "all"} [permissionLogic="any"]
 *   Controls how multiple `permissions` are evaluated.
 *
 *   | Value   | Alias | Behaviour                                           | Default? |
 *   |---------|-------|-----------------------------------------------------|----------|
 *   | `"any"` | OR    | User needs **at least one** required permission     | ✅ Yes   |
 *   | `"all"` | AND   | User needs **every** required permission            | No       |
 *
 *   ```jsx
 *   // AND logic — must have ALL listed permissions to see the content
 *   <PermissionGate
 *     permissions={['read:reports', 'export:reports']}
 *     permissionLogic="all"
 *   >
 *   ```
 *
 * @property {React.ReactNode} [fallback=null]
 *   What to render when access is **denied** (and `negate=false`).
 *   - Default: `null` — renders nothing when the user lacks access.
 *   - Use this to show a disabled state, a tooltip, or an upgrade prompt.
 *   - Example: `fallback={<span className="disabled">No access</span>}`
 *
 * @property {React.ReactNode} [loadingComponent=null]
 *   What to render while the auth state is being resolved (`isLoading=true`).
 *   - Default: `null` — renders nothing during loading.
 *   - Use a skeleton or spinner to avoid a flash of missing content.
 *   - Example: `loadingComponent={<Skeleton />}`
 *
 * @property {boolean} [negate=false]
 *   **Inverts** the access check result.
 *
 *   | Value   | Renders `children` when…                         | Default? |
 *   |---------|--------------------------------------------------|----------|
 *   | `false` | User **has** the required roles / permissions    | ✅ Yes   |
 *   | `true`  | User **does NOT have** the roles / permissions   | No       |
 *
 *   Common use-cases for `negate`:
 *   - Show a **Login button** only to unauthenticated users.
 *   - Show a **"Free plan" banner** only to users without a `premium` role.
 *
 *   ```jsx
 *   // Show upgrade prompt ONLY to users who do NOT have the 'premium' role
 *   <PermissionGate roles={['premium']} negate>
 *     <UpgradeBanner />
 *   </PermissionGate>
 *   ```
 *
 * @property {function} [asyncCheck]
 *   Custom async/sync callback function for additional dynamic validation checks.
 *   - Signature: `(context) => boolean | Promise<boolean>`
 *   - While executing, the component renders the `loadingComponent` (if provided).
 */

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Conditionally **shows or hides** content based on the current user's
 * roles and permissions — without ever redirecting.
 *
 * `PermissionGate` reads auth state from the nearest {@link PermissionProvider}
 * and uses {@link usePermission} internally. Depending on the result:
 *
 * - ✅ **Allowed** → renders `children`.
 * - ❌ **Denied**  → renders `fallback` (default: `null`, i.e. nothing).
 * - ⏳ **Loading** → renders `loadingComponent` (default: `null`).
 * - 🔄 **Negated** (`negate=true`) → swaps allowed ↔ denied before rendering.
 *
 * Unlike {@link BlockRoute}, this component **never redirects** the user.
 * Use it for inline UI elements: buttons, menu items, banners, panels, etc.
 *
 * @param {PermissionGateProps} props - See {@link PermissionGateProps} for full prop reference.
 * @returns {React.ReactElement|null}
 *
 * ---
 *
 * @example <caption>Basic role gate — hide element from non-admins</caption>
 * // The delete button is invisible to anyone who is not an admin.
 * // No fallback = renders nothing when denied.
 * <PermissionGate roles={['admin']}>
 *   <button onClick={handleDelete}>Delete User</button>
 * </PermissionGate>
 *
 * @example <caption>With fallback — show read-only state to non-editors</caption>
 * <PermissionGate
 *   permissions={['write:posts']}
 *   fallback={<span className="badge">Read-only</span>}
 * >
 *   <EditToolbar />
 * </PermissionGate>
 *
 * @example <caption>negate — show content ONLY to users who lack the role</caption>
 * // LoginButton is shown to guests (users who do NOT have 'user' or 'admin' role).
 * <PermissionGate roles={['user', 'admin']} negate>
 *   <LoginButton />
 * </PermissionGate>
 *
 * @example <caption>AND permission logic — user must have ALL listed permissions</caption>
 * <PermissionGate
 *   roles={['manager']}
 *   permissions={['approve:leaves', 'view:team']}
 *   permissionLogic="all"
 *   fallback={<p>Insufficient privileges.</p>}
 * >
 *   <TeamManagementPanel />
 * </PermissionGate>
 *
 * @example <caption>Loading state — show skeleton while auth resolves</caption>
 * <PermissionGate
 *   permissions={['read:dashboard']}
 *   loadingComponent={<DashboardSkeleton />}
 * >
 *   <Dashboard />
 * </PermissionGate>
 */
export function PermissionGate({
  children,
  roles = [],
  permissions = [],
  roleLogic = 'any',
  permissionLogic = 'any',
  fallback = null,
  loadingComponent = null,
  negate = false,
  asyncCheck,
}) {
  const { allowed, isLoading } = usePermission({
    roles,
    permissions,
    roleLogic,
    permissionLogic,
    asyncCheck,
  });

  if (isLoading) {
    return loadingComponent || null;
  }

  // Apply negation if requested
  const shouldRender = negate ? !allowed : allowed;

  return shouldRender ? children : fallback;
}

export default PermissionGate;
