/**
 * @fileoverview `BlockRoute` component — role and permission-based route guard.
 *
 * `BlockRoute` wraps your application's route content and redirects
 * unauthorized users to a configurable URL. It is compatible with both
 * **React Router v5** (using `<Redirect>`) and **React Router v6**
 * (using `<Navigate>`), auto-detecting which version is installed.
 *
 * @module components/BlockRoute
 */

import React from 'react';
import { usePermission } from '../hooks/usePermission';

// ─── Type Definitions ─────────────────────────────────────────────────────────

/**
 * Props accepted by the `BlockRoute` component.
 *
 * @typedef {Object} BlockRouteProps
 *
 * @property {React.ReactNode} children
 *   **Required.** The protected page/component to render when access is granted.
 *   Rendered as-is — no extra wrapper is added.
 *
 * @property {string[]} [roles=[]]
 *   Role strings the user must have to enter this route.
 *   - Any strings are accepted — you define what roles mean in your app.
 *   - Evaluated together with `permissions` (role check runs first).
 *   - Pass `[]` (default) to skip the role check.
 *   - Example: `['admin', 'superuser']`
 *
 * @property {string[]} [permissions=[]]
 *   Permission strings the user must have to enter this route.
 *   - Supports wildcards: `'*'` (all access), `'read:*'` (all read: permissions).
 *   - Pass `[]` (default) to skip the permission check.
 *   - Example: `['read:reports', 'export:reports']`
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
 *   // OR logic — editor OR admin can enter (default, no need to write it)
 *   <BlockRoute roles={['editor', 'admin']}>
 *   // AND logic — user must be BOTH editor AND admin
 *   <BlockRoute roles={['editor', 'admin']} roleLogic="all">
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
 *   // AND logic — must have ALL listed permissions to enter
 *   <BlockRoute
 *     permissions={['read:reports', 'export:reports']}
 *     permissionLogic="all"
 *   >
 *   ```
 *
 * @property {string} [redirectTo="/unauthorized"]
 *   The path the user is sent to when access is **denied**.
 *   - Default: `"/unauthorized"`
 *   - Can be any valid route path in your application.
 *   - Examples: `"/login"`, `"/403"`, `"/access-denied"`
 *
 * @property {React.ReactNode} [loadingComponent=null]
 *   What to render while the auth state is being resolved (`isLoading=true`).
 *   - Default: `null` — renders nothing (blank screen) while loading.
 *   - Pass a spinner or skeleton component to avoid a flash of empty content.
 *   - Example: `loadingComponent={<FullPageSpinner />}`
 *
 * @property {boolean} [replace=true]
 *   Whether the redirect **replaces** the current browser history entry.
 *
 *   | Value   | Behaviour                                                               | Default? |
 *   |---------|-------------------------------------------------------------------------|----------|
 *   | `true`  | Replaces history — user **cannot** press Back to reach the blocked route | ✅ Yes   |
 *   | `false` | Pushes to history — user **can** press Back to return                   | No       |
 *
 * @property {unknown} [state]
 *   Optional state object passed to the redirect location.
 *   - Useful for storing `{ from: location }` so the login page can redirect
 *     the user back to their original destination after signing in.
 *   - Accessible via `useLocation().state` on the redirect target page.
 *   - Example: `state={{ from: location }}`
 *
 * @property {function} [asyncCheck]
 *   Custom async/sync callback function for additional dynamic validation checks.
 *   - Signature: `(context) => boolean | Promise<boolean>`
 *   - While executing, the component renders the `loadingComponent` (if provided).
 */

// ─── Version Detection ────────────────────────────────────────────────────────

/**
 * Lazily detects the installed React Router version and returns the
 * appropriate redirect element.
 *
 * Supports React Router v5 (`react-router-dom` < 6) via `<Redirect>`
 * and v6+ via `<Navigate>`.
 *
 * @param {string}  to      - The path to redirect to.
 * @param {boolean} replace - Whether to replace the history entry.
 * @param {Object}  [state] - Optional location state.
 * @returns {React.ReactElement} A redirect element compatible with the installed version.
 */
function RouterRedirect({ to, replace = true, state }) {
  try {
    // Try React Router v6 first
    // eslint-disable-next-line import/no-extraneous-dependencies
    const { Navigate } = require('react-router-dom');
    if (Navigate) {
      return <Navigate to={to} replace={replace} state={state} />;
    }
  } catch (_) {
    // fall through
  }

  try {
    // Fallback to React Router v5
    // eslint-disable-next-line import/no-extraneous-dependencies
    const { Redirect } = require('react-router-dom');
    if (Redirect) {
      return (
        <Redirect
          to={{
            pathname: to,
            state: state,
          }}
          push={!replace}
        />
      );
    }
  } catch (_) {
    // No react-router-dom installed
  }

  // Ultimate fallback — cannot redirect, warn the developer
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      '[role-permission-engine] BlockRoute: react-router-dom is not installed or could not be detected. ' +
        'Unable to redirect unauthorized user.'
    );
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Route guard component that **blocks** unauthorized users from accessing
 * a route and **redirects** them to a configurable path.
 *
 * `BlockRoute` reads the current user's roles and permissions from the
 * nearest {@link PermissionProvider} in the tree. It calls {@link usePermission}
 * internally to run the access check, then:
 *
 * - ✅ **Allowed** → renders `children` (the protected page).
 * - ❌ **Denied**  → redirects to `redirectTo` (default: `"/unauthorized"`).
 * - ⏳ **Loading** → renders `loadingComponent` (default: `null`).
 *
 * **React Router compatibility:**
 * - **v6** (recommended) — uses `<Navigate>` internally.
 * - **v5** — uses `<Redirect>` internally.
 * - Auto-detected at runtime; no configuration needed.
 *
 * @param {BlockRouteProps} props - See {@link BlockRouteProps} for full prop reference.
 * @returns {React.ReactElement|null}
 *
 * ---
 *
 * @example <caption>React Router v6 — basic role guard</caption>
 * import { Routes, Route } from 'react-router-dom';
 * import { BlockRoute } from 'role-permission-engine';
 *
 * // Only users whose roles include 'admin' can access /admin.
 * // All others are sent to /unauthorized.
 * <Routes>
 *   <Route
 *     path="/admin"
 *     element={
 *       <BlockRoute roles={['admin']}>
 *         <AdminPage />
 *       </BlockRoute>
 *     }
 *   />
 * </Routes>
 *
 * @example <caption>React Router v5 — using render prop</caption>
 * import { Switch, Route } from 'react-router-dom'; // v5
 *
 * <Switch>
 *   <Route
 *     path="/admin"
 *     render={() => (
 *       <BlockRoute roles={['admin']} redirectTo="/login">
 *         <AdminPage />
 *       </BlockRoute>
 *     )}
 *   />
 * </Switch>
 *
 * @example <caption>AND permission logic — user must have ALL permissions</caption>
 * <BlockRoute
 *   permissions={['read:reports', 'export:reports']}
 *   permissionLogic="all"
 *   redirectTo="/access-denied"
 * >
 *   <ReportsPage />
 * </BlockRoute>
 *
 * @example <caption>Combined roles + permissions with a loading spinner</caption>
 * <BlockRoute
 *   roles={['editor', 'admin']}
 *   roleLogic="any"
 *   permissions={['write:posts']}
 *   redirectTo="/unauthorized"
 *   loadingComponent={<FullScreenSpinner />}
 * >
 *   <EditPostPage />
 * </BlockRoute>
 *
 * @example <caption>Preserve "from" location for post-login redirect (v6)</caption>
 * import { useLocation } from 'react-router-dom';
 *
 * // After the user logs in, read location.state.from and redirect back.
 * function AuthRequired({ children }) {
 *   const location = useLocation();
 *   return (
 *     <BlockRoute
 *       roles={['user']}
 *       redirectTo="/login"
 *       state={{ from: location }}
 *     >
 *       {children}
 *     </BlockRoute>
 *   );
 * }
 */
export function BlockRoute({
  children,
  roles = [],
  permissions = [],
  roleLogic = 'any',
  permissionLogic = 'any',
  redirectTo = '/unauthorized',
  loadingComponent = null,
  replace = true,
  state,
  asyncCheck,
}) {
  const { allowed, isLoading } = usePermission({
    roles,
    permissions,
    roleLogic,
    permissionLogic,
    asyncCheck,
  });

  // While auth is resolving, render the loading component (or null)
  if (isLoading) {
    return loadingComponent || null;
  }

  // Access denied — redirect
  if (!allowed) {
    return <RouterRedirect to={redirectTo} replace={replace} state={state} />;
  }

  // Access granted — render children
  return children;
}

export default BlockRoute;
