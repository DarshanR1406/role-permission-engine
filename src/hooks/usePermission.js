/**
 * @fileoverview `usePermission` hook — programmatic permission checking.
 *
 * This hook reads the current user's roles and permissions from the nearest
 * {@link PermissionProvider} and returns whether the user is allowed to
 * access a given set of roles/permissions.
 *
 * @module hooks/usePermission
 */

import { useMemo } from 'react';
import { usePermissionContext } from '../context/PermissionContext';
import { checkAccess } from '../utils/checkPermission';

// ─── Type Definitions ─────────────────────────────────────────────────────────

/**
 * Options accepted by the `usePermission` hook.
 *
 * All fields are optional. Omitting a field (or passing `[]`) skips that
 * particular check and treats it as automatically satisfied.
 *
 * @typedef {Object} UsePermissionOptions
 *
 * @property {string[]} [roles=[]]
 *   Role strings the user must have to be considered "allowed".
 *   - Any strings are accepted — you define what roles mean in your app.
 *   - Pass `[]` (default) to skip the role check entirely.
 *   - Examples: `['admin']`, `['editor', 'manager']`
 *
 * @property {string[]} [permissions=[]]
 *   Permission strings the user must have to be considered "allowed".
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
 *   ```js
 *   // OR logic (default) — no need to specify 'any' explicitly
 *   usePermission({ roles: ['admin', 'editor'] });
 *   // AND logic — user must be BOTH admin AND editor
 *   usePermission({ roles: ['admin', 'editor'], roleLogic: 'all' });
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
 *   ```js
 *   // AND logic — user must hold ALL listed permissions
 *   usePermission({
 *     permissions: ['read:reports', 'export:reports'],
 *     permissionLogic: 'all',
 *   });
 *   ```
 */

/**
 * The value returned by the `usePermission` hook.
 *
 * @typedef {Object} UsePermissionResult
 *
 * | Field             | Type      | Description                                              |
 * |-------------------|-----------|----------------------------------------------------------|
 * | `allowed`         | `boolean` | `true` when the user passes all role + permission checks |
 * | `denied`          | `boolean` | Convenience inverse of `allowed` (`!allowed`)            |
 * | `isLoading`       | `boolean` | `true` while the auth state is still resolving           |
 * | `isAuthenticated` | `boolean` | `true` when the user is signed in                        |
 * | `reason`          | `string`  | Human-readable explanation of the result                 |
 *
 * @property {boolean} allowed
 *   `true` when the user passes all role + permission checks.
 *   `false` while `isLoading` is `true` (to prevent premature rendering).
 *
 * @property {boolean} denied
 *   Convenience inverse of `allowed`. Equivalent to `!allowed`.
 *   Useful for inline conditional expressions: `if (denied) return <Forbidden />`.
 *
 * @property {boolean} isLoading
 *   Mirrors `isLoading` from the nearest `PermissionProvider`.
 *   While `true`, `allowed` is always `false` to prevent a flash of content.
 *
 * @property {boolean} isAuthenticated
 *   Mirrors `isAuthenticated` from the nearest `PermissionProvider`.
 *
 * @property {string} reason
 *   Human-readable explanation of why `allowed` is `true` or `false`.
 *   Useful for debugging or showing contextual error messages.
 *   Examples: `'User has at least one required role.'`, `'User is missing required permissions: write:posts'`
 */

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook for **programmatic** permission checking inside React components.
 *
 * Reads the current user's roles and permissions from the nearest
 * {@link PermissionProvider}, evaluates them against the provided
 * requirements, and returns a stable result object that only re-computes
 * when its inputs change (memoized with `useMemo`).
 *
 * Use this hook when you need access-check results in component logic
 * (conditional rendering, redirects, disabling buttons). For declarative
 * UI gates, prefer `<PermissionGate>`. For route blocking, prefer `<BlockRoute>`.
 *
 * @param {UsePermissionOptions} [options={}]
 *   The permission requirements to evaluate. See {@link UsePermissionOptions}.
 *   - Pass `{}` or nothing to get the raw auth state without any checks.
 *   - All fields default to `[]` / `"any"` (open access).
 *
 * @returns {UsePermissionResult} See {@link UsePermissionResult} for the full
 *   shape. Key fields:
 *   - `allowed` / `denied` — result of the access check.
 *   - `isLoading` — `true` while auth resolves (always `allowed: false`).
 *   - `reason` — human-readable explanation string.
 *
 * @example <caption>Basic role check</caption>
 * import { usePermission } from 'role-permission-engine';
 *
 * function DeleteButton() {
 *   const { allowed } = usePermission({ roles: ['admin'] });
 *
 *   // denied is the inverse — both are available for readability
 *   if (!allowed) return null;
 *   return <button>Delete</button>;
 * }
 *
 * @example <caption>Combined role + permission with AND logic</caption>
 * function AdminPanel() {
 *   const { allowed, isLoading, denied } = usePermission({
 *     roles: ['admin', 'superadmin'],
 *     permissions: ['read:users', 'write:users'],
 *     roleLogic: 'any',       // admin OR superadmin is enough
 *     permissionLogic: 'all', // must have BOTH read:users AND write:users
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (denied) return <p>Access denied.</p>;
 *   return <AdminDashboard />;
 * }
 *
 * @example <caption>Show reason string for debugging</caption>
 * function SecretPage() {
 *   const { allowed, isLoading, reason } = usePermission({
 *     permissions: ['view:secrets'],
 *   });
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (!allowed) return <div title={reason}>Not allowed.</div>;
 *   return <SecretContent />;
 * }
 *
 * @example <caption>No constraints — read raw auth state</caption>
 * function NavBar() {
 *   // Pass nothing to just read isAuthenticated / isLoading
 *   const { isAuthenticated, isLoading } = usePermission();
 *
 *   if (isLoading) return <NavSkeleton />;
 *   return isAuthenticated ? <UserMenu /> : <LoginButton />;
 * }
 */
export function usePermission({
  roles: requiredRoles = [],
  permissions: requiredPermissions = [],
  roleLogic = 'any',
  permissionLogic = 'any',
} = {}) {
  const {
    roles: userRoles,
    permissions: userPermissions,
    isAuthenticated,
    isLoading,
  } = usePermissionContext();

  const result = useMemo(() => {
    // While loading, treat as "not allowed" to avoid premature rendering
    if (isLoading) {
      return { allowed: false, reason: 'Auth state is loading.' };
    }

    // If no requirements, always allow authenticated users
    const hasRequirements = requiredRoles.length > 0 || requiredPermissions.length > 0;
    if (!hasRequirements) {
      return { allowed: true, reason: 'No constraints specified.' };
    }

    return checkAccess({
      userRoles,
      userPermissions,
      requiredRoles,
      requiredPermissions,
      roleLogic,
      permissionLogic,
    });
  }, [
    userRoles,
    userPermissions,
    requiredRoles,
    requiredPermissions,
    roleLogic,
    permissionLogic,
    isLoading,
  ]);

  return {
    allowed: result.allowed,
    denied: !result.allowed,
    isLoading,
    isAuthenticated,
    reason: result.reason,
  };
}

export default usePermission;
