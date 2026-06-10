/**
 * @fileoverview React context for providing permission state throughout the component tree.
 *
 * Wrap your application (or a sub-tree) with `PermissionProvider` to make
 * the current user's roles, permissions, and identity available to all
 * child components via `usePermissionContext()`.
 *
 * @module context/PermissionContext
 */

import React, { createContext, useContext, useMemo } from 'react';

// ─── Type Definitions ────────────────────────────────────────────────────────

/**
 * The shape of the value stored in the permission context.
 *
 * @typedef {Object} PermissionContextValue
 * @property {import('../utils/checkPermission').Role[]}       roles       - The user's current roles.
 * @property {import('../utils/checkPermission').Permission[]} permissions - The user's current permissions.
 * @property {Object|null}  user        - The raw user object (optional, for your own use).
 * @property {boolean}      isAuthenticated - Whether the user is authenticated.
 * @property {boolean}      isLoading    - Whether auth state is still being resolved.
 */

/**
 * Props accepted by {@link PermissionProvider}.
 *
 * @typedef {Object} PermissionProviderProps
 *
 * @property {string[]} [roles=[]]
 *   The roles currently assigned to the logged-in user.
 *   - Any strings are accepted — you define what they mean in your app.
 *   - Examples: `['admin']`, `['editor', 'viewer']`, `['tenant-owner']`.
 *   - Pass `[]` (default) when the user has no roles or is unauthenticated.
 *   - These are read by `BlockRoute`, `PermissionGate`, and `usePermission`.
 *
 * @property {string[]} [permissions=[]]
 *   The permissions currently held by the logged-in user.
 *   - Supports wildcards: `'*'` (superuser) and `'read:*'` (all read: perms).
 *   - Examples: `['read:users', 'write:posts']`, `['*']`.
 *   - Pass `[]` (default) when the user has no permissions.
 *
 * @property {Record<string, unknown> | null} [user=null]
 *   The raw user object from your auth system — any shape is accepted.
 *   - Not used internally by the engine; available via `usePermissionContext()`
 *     for your own components to read (e.g. display the user's name).
 *   - Default: `null` (unauthenticated / not yet loaded).
 *
 * @property {boolean} [isAuthenticated=false]
 *   Whether the user is currently authenticated.
 *
 *   | Value   | Meaning                                          | Default? |
 *   |---------|--------------------------------------------------|----------|
 *   | `true`  | User is signed in                                | No       |
 *   | `false` | User is a guest / not yet signed in              | ✅ Yes   |
 *
 *   > **Tip:** Derive this from your auth system: `isAuthenticated={!!user}`
 *
 * @property {boolean} [isLoading=false]
 *   Whether the auth state is still being resolved (e.g. fetching the session).
 *
 *   | Value   | Effect on child components                                    | Default? |
 *   |---------|---------------------------------------------------------------|----------|
 *   | `true`  | `BlockRoute` renders `loadingComponent`, `PermissionGate` renders `loadingComponent` | No |
 *   | `false` | Normal permission evaluation proceeds                         | ✅ Yes   |
 *
 *   > **Tip:** Set `isLoading={true}` until your auth fetch resolves to
 *   > avoid a flash of redirect or denied content.
 *
 * @property {React.ReactNode} children
 *   **Required.** The component tree that will have access to the permission context.
 *   Typically your entire app or a protected sub-tree.
 */

// ─── Context Creation ─────────────────────────────────────────────────────────

/** @type {React.Context<PermissionContextValue>} */
const PermissionContext = createContext(
  /** @type {PermissionContextValue} */ ({
    roles: [],
    permissions: [],
    user: null,
    isAuthenticated: false,
    isLoading: false,
  })
);

PermissionContext.displayName = 'PermissionContext';

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Provides permission state to the entire React subtree below it.
 *
 * Place this **once** near the root of your application (or around any
 * subtree that needs access control). Every `BlockRoute`, `PermissionGate`,
 * and `usePermission` call inside will automatically read from it.
 *
 * The provider is **memoized** — it only re-renders children when one of
 * its props actually changes (roles, permissions, user, isAuthenticated, isLoading).
 *
 * @param {PermissionProviderProps} props - See {@link PermissionProviderProps} for full details.
 * @returns {React.ReactElement}
 *
 * @example <caption>Basic setup at app root</caption>
 * import { PermissionProvider } from 'role-permission-engine';
 * import { BrowserRouter } from 'react-router-dom';
 *
 * function App() {
 *   const { user } = useAuth(); // your own auth hook
 *
 *   return (
 *     <PermissionProvider
 *       roles={user?.roles ?? []}           // e.g. ['admin', 'editor']
 *       permissions={user?.permissions ?? []} // e.g. ['read:users', 'write:posts']
 *       user={user}                           // raw user object (any shape)
 *       isAuthenticated={!!user}              // true when signed in
 *       isLoading={false}                     // set true while fetching session
 *     >
 *       <BrowserRouter>
 *         <AppRoutes />
 *       </BrowserRouter>
 *     </PermissionProvider>
 *   );
 * }
 *
 * @example <caption>With async auth — using isLoading to avoid premature redirects</caption>
 * import { useState, useEffect } from 'react';
 *
 * function App() {
 *   const [authState, setAuthState] = useState({ user: null, isLoading: true });
 *
 *   useEffect(() => {
 *     fetchCurrentUser()
 *       .then(user => setAuthState({ user, isLoading: false }))
 *       .catch(() => setAuthState({ user: null, isLoading: false }));
 *   }, []);
 *
 *   return (
 *     <PermissionProvider
 *       roles={authState.user?.roles ?? []}
 *       permissions={authState.user?.permissions ?? []}
 *       user={authState.user}
 *       isAuthenticated={!!authState.user}
 *       isLoading={authState.isLoading}  // <-- prevents flash of /unauthorized
 *     >
 *       <BrowserRouter><AppRoutes /></BrowserRouter>
 *     </PermissionProvider>
 *   );
 * }
 */
export function PermissionProvider({
  roles = [],
  permissions = [],
  user = null,
  isAuthenticated = false,
  isLoading = false,
  children,
}) {
  const value = useMemo(
    () => ({ roles, permissions, user, isAuthenticated, isLoading }),
    [roles, permissions, user, isAuthenticated, isLoading]
  );

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook that returns the raw value from the nearest {@link PermissionProvider}.
 *
 * Use this when you need direct access to the user's roles, permissions,
 * user object, or auth flags — without running an access check.
 * For running actual permission checks, prefer `usePermission()`.
 *
 * @returns {PermissionContextValue}
 *   An object with the following fields:
 *
 *   | Field             | Type        | Description                                    |
 *   |-------------------|-------------|------------------------------------------------|
 *   | `roles`           | `string[]`  | The user's current roles                       |
 *   | `permissions`     | `string[]`  | The user's current permissions                 |
 *   | `user`            | `object\|null` | The raw user object passed to the provider  |
 *   | `isAuthenticated` | `boolean`   | Whether the user is signed in                  |
 *   | `isLoading`       | `boolean`   | Whether auth state is still resolving          |
 *
 * @throws {Error}
 *   Throws if called outside of a `<PermissionProvider>`. Check the tree
 *   to ensure a provider wraps the component using this hook.
 *
 * @example <caption>Read user info for display purposes</caption>
 * import { usePermissionContext } from 'role-permission-engine';
 *
 * function UserBadge() {
 *   const { user, roles, isAuthenticated, isLoading } = usePermissionContext();
 *
 *   if (isLoading) return <span>Loading...</span>;
 *   if (!isAuthenticated) return <span>Guest</span>;
 *   return <span>{user?.name} — {roles.join(', ')}</span>;
 * }
 *
 * @example <caption>Conditional render based on auth state</caption>
 * function NavBar() {
 *   const { isAuthenticated } = usePermissionContext();
 *
 *   return (
 *     <nav>
 *       <Logo />
 *       {isAuthenticated ? <UserMenu /> : <LoginButton />}
 *     </nav>
 *   );
 * }
 */
export function usePermissionContext() {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    throw new Error(
      '[role-permission-engine] usePermissionContext must be used inside a <PermissionProvider>.'
    );
  }
  return ctx;
}

export default PermissionContext;
