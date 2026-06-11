# role-permission-engine

> A flexible **Role-Based Access Control (RBAC)** and **Permission-Based Access Control (PBAC)**
> engine for React applications with route protection, component guards, hooks,
> utilities, and TypeScript support.

[![npm version](https://img.shields.io/npm/v/role-permission-engine.svg)](https://www.npmjs.com/package/role-permission-engine)
[![license](https://img.shields.io/npm/l/role-permission-engine.svg)](./LICENSE)
[![tests](https://img.shields.io/badge/tests-jest%20%2B%20RTL-green)](./src/__tests__)

🌐 **[Interactive Documentation & Live Demo](https://role-permission-engine.pages.dev/)**

A lightweight, flexible **role and permission-based route guard and UI gate** for React applications.

- ✅ **React Router v5 & v6** dual support
- ✅ **Role-based** and **permission-based** access control
- ✅ **AND / OR logic** for multi-value checks
- ✅ **Wildcard permissions** (`"*"`, `"read:*"`)
- ✅ **TypeScript declarations** included
- ✅ **Zero runtime dependencies** (only peer deps: React, React Router)
- ✅ **Full JSDoc** on every exported API

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [PermissionProvider](#permissionprovider)
  - [BlockRoute](#blockroute)
  - [PermissionGate](#permissiongate)
  - [withPermission (HOC)](#withpermission)
  - [usePermission](#usepermission)
  - [usePermissionContext](#usepermissioncontext)
  - [hasRole](#hasrole)
  - [hasPermission](#haspermission)
  - [checkAccess](#checkaccess)
- [Logic Operators](#logic-operators)
- [Wildcard Permissions](#wildcard-permissions)
- [React Router v5 Usage](#react-router-v5-usage)
- [Backend Subpath Usage](#backend-subpath-usage)
- [TypeScript](#typescript)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

---

## Installation

```bash
npm install role-permission-engine
# or
yarn add role-permission-engine
```

**Peer dependencies** (install these separately if not already present):

```bash
npm install react react-dom react-router-dom
```

---

## Quick Start

### 1. Wrap your app with `PermissionProvider`

```jsx
// src/main.jsx (or App.jsx)
import { PermissionProvider } from 'role-permission-engine';
import { BrowserRouter } from 'react-router-dom';

function App() {
  // Fetch your user from your auth system
  const user = { roles: ['editor'], permissions: ['write:posts', 'read:users'] };

  return (
    <PermissionProvider
      roles={user.roles}
      permissions={user.permissions}
      user={user}
      isAuthenticated={true}
    >
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </PermissionProvider>
  );
}
```

### 2. Protect routes with `BlockRoute`

```jsx
// src/AppRoutes.jsx  (React Router v6)
import { Routes, Route } from 'react-router-dom';
import { BlockRoute } from 'role-permission-engine';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      {/* Only 'admin' role can access /admin */}
      <Route
        path="/admin"
        element={
          <BlockRoute roles={['admin']} redirectTo="/unauthorized">
            <AdminPage />
          </BlockRoute>
        }
      />

      {/* Any 'editor' or 'admin' with write:posts permission */}
      <Route
        path="/posts/edit/:id"
        element={
          <BlockRoute
            roles={['editor', 'admin']}
            permissions={['write:posts']}
            redirectTo="/unauthorized"
          >
            <EditPostPage />
          </BlockRoute>
        }
      />

      <Route path="/unauthorized" element={<UnauthorizedPage />} />
    </Routes>
  );
}
```

### 3. Gate UI elements with `PermissionGate`

```jsx
import { PermissionGate } from 'role-permission-engine';

function UserActions({ userId }) {
  return (
    <div>
      {/* Always visible */}
      <ViewProfileButton userId={userId} />

      {/* Only visible to admins */}
      <PermissionGate roles={['admin']}>
        <DeleteUserButton userId={userId} />
      </PermissionGate>

      {/* Only visible to users with write:users permission */}
      <PermissionGate
        permissions={['write:users']}
        fallback={<span className="badge">Read-only</span>}
      >
        <EditUserButton userId={userId} />
      </PermissionGate>
    </div>
  );
}
```

---

## API Reference

---

### `PermissionProvider`

Provides the current user's roles, permissions, and auth state to all child components.

**Must wrap any component that uses `BlockRoute`, `PermissionGate`, or `usePermission`.**

#### Props

| Prop              | Type              | Default | Description                                             |
|-------------------|-------------------|---------|---------------------------------------------------------|
| `roles`           | `string[]`        | `[]`    | The current user's roles.                               |
| `permissions`     | `string[]`        | `[]`    | The current user's permissions.                         |
| `user`            | `object \| null`  | `null`  | The raw user object (any shape, for your own use).      |
| `isAuthenticated` | `boolean`         | `false` | Whether the user is authenticated.                      |
| `isLoading`       | `boolean`         | `false` | Set to `true` while auth state is being resolved.       |
| `children`        | `ReactNode`       | —       | **Required.** The component tree to provide context to. |

#### Example

```jsx
<PermissionProvider
  roles={['admin', 'editor']}
  permissions={['read:users', 'write:posts']}
  user={{ id: 'u_123', name: 'Alice' }}
  isAuthenticated={true}
  isLoading={false}
>
  {/* your app */}
</PermissionProvider>
```

---

### `BlockRoute`

A route guard that **redirects** unauthorized users. Compatible with **React Router v5 and v6**.

#### Props

| Prop                | Type          | Default            | Description                                                                 |
|---------------------|---------------|--------------------|-----------------------------------------------------------------------------|
| `children`          | `ReactNode`   | —                  | **Required.** Content to render when access is granted.                     |
| `roles`             | `string[]`    | `[]`               | Required roles. Evaluated with `roleLogic`.                                 |
| `permissions`       | `string[]`    | `[]`               | Required permissions. Evaluated with `permissionLogic`.                     |
| `roleLogic`         | `"any"\|"all"`| `"any"`            | `"any"` = OR, `"all"` = AND logic for roles.                                |
| `permissionLogic`   | `"any"\|"all"`| `"any"`            | `"any"` = OR, `"all"` = AND logic for permissions.                          |
| `redirectTo`        | `string`      | `"/unauthorized"`  | Path to redirect to when access is denied.                                  |
| `loadingComponent`  | `ReactNode`   | `null`             | Renders while `isLoading` is `true`. Defaults to `null` (nothing).          |
| `replace`           | `boolean`     | `true`             | Whether to replace the history entry (prevents Back button to blocked page).|
| `state`             | `any`         | `undefined`        | Location state passed to the redirect (e.g. `{ from: location }`).          |

#### Example — React Router v6

```jsx
<Route
  path="/settings"
  element={
    <BlockRoute
      roles={['admin']}
      permissions={['manage:settings']}
      permissionLogic="any"
      redirectTo="/login"
      loadingComponent={<Spinner />}
    >
      <SettingsPage />
    </BlockRoute>
  }
/>
```

#### Example — Preserve redirect "from" location

```jsx
import { useLocation } from 'react-router-dom';

function AuthRequired({ children }) {
  const location = useLocation();
  return (
    <BlockRoute
      roles={['user']}
      redirectTo="/login"
      state={{ from: location }}  // login page can read this to redirect back
    >
      {children}
    </BlockRoute>
  );
}
```

---

### `PermissionGate`

Conditionally **renders** or **hides** content based on roles/permissions.
Unlike `BlockRoute`, this never redirects — it simply shows or hides its children.

#### Props

| Prop               | Type          | Default | Description                                                          |
|--------------------|---------------|---------|----------------------------------------------------------------------|
| `children`         | `ReactNode`   | —       | **Required.** Content shown when access is granted.                  |
| `roles`            | `string[]`    | `[]`    | Required roles.                                                      |
| `permissions`      | `string[]`    | `[]`    | Required permissions.                                                |
| `roleLogic`        | `"any"\|"all"`| `"any"` | Logic for role evaluation.                                           |
| `permissionLogic`  | `"any"\|"all"`| `"any"` | Logic for permission evaluation.                                     |
| `fallback`         | `ReactNode`   | `null`  | Content shown when access is denied. Defaults to `null`.             |
| `loadingComponent` | `ReactNode`   | `null`  | Content shown while `isLoading` is `true`.                           |
| `negate`           | `boolean`     | `false` | When `true`, inverts the logic (shows children when access is denied)|

#### Example — With fallback

```jsx
<PermissionGate
  roles={['admin']}
  fallback={<p>You need admin access to see this.</p>}
>
  <AdminControls />
</PermissionGate>
```

#### Example — Negate (show only to guests)

```jsx
// Show login button ONLY when user does NOT have 'user' role
<PermissionGate roles={['user']} negate>
  <LoginButton />
</PermissionGate>
```

---

### `withPermission`

A Higher Order Component (HOC) that wraps and protects a component.
Ideal for wrapping class-based components, or when you prefer HOC composition over JSX-based nesting.

#### Options

| Option             | Type             | Default | Description                                                             |
|--------------------|------------------|---------|-------------------------------------------------------------------------|
| `roles`            | `string[]`       | `[]`    | Required roles.                                                         |
| `permissions`      | `string[]`       | `[]`    | Required permissions.                                                   |
| `roleLogic`        | `"any"\|"all"`   | `"any"` | Logic for role evaluation.                                              |
| `permissionLogic`  | `"any"\|"all"`   | `"any"` | Logic for permission evaluation.                                        |
| `fallback`         | `ReactNode`      | `null`  | Content shown when access is denied. Defaults to `null`.                |
| `loadingComponent` | `ReactNode`      | `null`  | Content shown while `isLoading` is `true`.                              |
| `negate`           | `boolean`        | `false` | When `true`, inverts the logic (shows component when access is denied). |

#### Example

```jsx
import { withPermission } from 'role-permission-engine';

function Dashboard(props) {
  return <div>Welcome, {props.username}!</div>;
}

// Wrap and protect Dashboard
const ProtectedDashboard = withPermission(Dashboard, {
  roles: ['admin', 'manager'],
  roleLogic: 'any',
  fallback: <p>Access Denied</p>,
  loadingComponent: <p>Loading...</p>
});

// Render the wrapped component and pass props normally
<ProtectedDashboard username="Alice" />
```

---

### `usePermission`

A React hook for **programmatic** permission checking.

#### Signature

```ts
function usePermission(options?: {
  roles?: string[];
  permissions?: string[];
  roleLogic?: 'any' | 'all';
  permissionLogic?: 'any' | 'all';
}): {
  allowed: boolean;
  denied: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  reason: string;
}
```

#### Example

```jsx
import { usePermission } from 'role-permission-engine';

function PublishButton() {
  const { allowed, isLoading } = usePermission({
    roles: ['editor', 'admin'],
    permissions: ['publish:posts'],
    roleLogic: 'any',
    permissionLogic: 'any',
  });

  if (isLoading) return null;
  if (!allowed) return <span>Cannot publish</span>;
  return <button>Publish Post</button>;
}
```

---

### `usePermissionContext`

Returns the raw permission context value. Useful for accessing the user object or auth state directly.

```jsx
import { usePermissionContext } from 'role-permission-engine';

function UserGreeting() {
  const { user, roles, isAuthenticated } = usePermissionContext();

  if (!isAuthenticated) return <p>Welcome, guest!</p>;
  return <p>Hello, {user?.name}! Roles: {roles.join(', ')}</p>;
}
```

---

### `hasRole`

Pure utility function (no React required). Checks if a set of user roles satisfies the required roles.

```ts
function hasRole(
  userRoles: string[],
  requiredRoles: string[],
  logic?: 'any' | 'all'
): { allowed: boolean; reason: string }
```

```js
import { hasRole } from 'role-permission-engine';

hasRole(['editor'], ['admin', 'editor'], 'any');
// → { allowed: true, reason: 'User has at least one required role.' }

hasRole(['editor'], ['admin', 'editor'], 'all');
// → { allowed: false, reason: 'User is missing required roles: admin' }
```

---

### `hasPermission`

Pure utility. Checks permissions with wildcard support.

```ts
function hasPermission(
  userPermissions: string[],
  requiredPermissions: string[],
  logic?: 'any' | 'all'
): { allowed: boolean; reason: string }
```

```js
import { hasPermission } from 'role-permission-engine';

// Wildcard
hasPermission(['*'], ['read:users', 'delete:posts'], 'all');
// → { allowed: true, reason: 'User has wildcard permission (*) — full access granted.' }

// Namespace wildcard
hasPermission(['read:*'], ['read:users', 'read:posts'], 'all');
// → { allowed: true, ... }
```

---

### `checkAccess`

Combined role + permission check in one call.

```ts
function checkAccess(options: {
  userRoles?: string[];
  userPermissions?: string[];
  requiredRoles?: string[];
  requiredPermissions?: string[];
  roleLogic?: 'any' | 'all';
  permissionLogic?: 'any' | 'all';
}): { allowed: boolean; reason: string }
```

```js
import { checkAccess } from 'role-permission-engine';

checkAccess({
  userRoles: ['editor'],
  userPermissions: ['write:posts'],
  requiredRoles: ['editor'],
  requiredPermissions: ['write:posts'],
});
// → { allowed: true, reason: 'Access granted.' }
```

---

## Logic Operators

All multi-value checks support two operators:

| Operator | Meaning                                 | Example                                                                 |
|----------|-----------------------------------------|-------------------------------------------------------------------------|
| `"any"`  | User needs **at least one** match (OR)  | `roles={['admin', 'editor']}` + `roleLogic="any"` — admin **or** editor |
| `"all"`  | User needs **every** match (AND)        | `roles={['admin', 'editor']}` + `roleLogic="all"` — admin **and** editor|

---

## Wildcard Permissions

| Pattern         | Matches                                                     |
|-----------------|-------------------------------------------------------------|
| `"*"`           | Everything — full superuser access                          |
| `"read:*"`      | All `read:` permissions (`read:users`, `read:posts`, etc.)  |
| `"write:posts"` | Only `write:posts` exactly                                  |

```jsx
// Superadmin with wildcard
<PermissionProvider permissions={['*']}>
  {/* User can access all routes / gates */}
</PermissionProvider>
```

---

## React Router v5 Usage

The `BlockRoute` component auto-detects whether React Router v5 or v6 is installed.

**React Router v5:**

```jsx
import { Switch, Route } from 'react-router-dom'; // v5

<Switch>
  <Route
    path="/admin"
    render={() => (
      <BlockRoute roles={['admin']} redirectTo="/unauthorized">
        <AdminPage />
      </BlockRoute>
    )}
  />
</Switch>
```

---

## Backend Subpath Usage

If you are building a backend project (like a Node.js/Express service) and want to use the pure permission utilities, you can import them from `role-permission-engine/utils`.

This entrypoint **has zero dependency on React or React Router**, meaning you can import and run it in a pure Node.js environment without any runtime errors or peer-dependency warning prompts.

### Example

```javascript
import { checkAccess } from 'role-permission-engine/utils';

// Express middleware
export function requirePermissions(required = {}) {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const userPermissions = req.user?.permissions || [];

    const { allowed, reason } = checkAccess({
      userRoles,
      userPermissions,
      requiredRoles: required.roles,
      requiredPermissions: required.permissions
    });

    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden', reason });
    }

    next();
  };
}
```

---

## TypeScript

Full TypeScript declarations are included. All types are automatically available when you import from `role-permission-engine`:

```ts
import {
  BlockRoute,
  BlockRouteProps,
  PermissionGate,
  PermissionProvider,
  usePermission,
  UsePermissionOptions,
  UsePermissionResult,
  hasRole,
  hasPermission,
  checkAccess,
  Role,
  Permission,
  LogicOperator,
  PermissionResult,
} from 'role-permission-engine';
```

---

## Examples

### Full app setup with async auth

```jsx
import { useState, useEffect } from 'react';
import { PermissionProvider, BlockRoute } from 'role-permission-engine';

function App() {
  const [auth, setAuth] = useState({ roles: [], permissions: [], user: null });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser()
      .then((user) => setAuth({ roles: user.roles, permissions: user.permissions, user }))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <PermissionProvider
      roles={auth.roles}
      permissions={auth.permissions}
      user={auth.user}
      isAuthenticated={!!auth.user}
      isLoading={isLoading}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/dashboard"
            element={
              <BlockRoute
                roles={['user', 'admin']}
                redirectTo="/login"
                loadingComponent={<FullPageSpinner />}
              >
                <Dashboard />
              </BlockRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </PermissionProvider>
  );
}
```

### Granular UI control

```jsx
import { PermissionGate, usePermission } from 'role-permission-engine';

function DocumentPage({ doc }) {
  const { allowed: canExport } = usePermission({ permissions: ['export:documents'] });

  return (
    <article>
      <h1>{doc.title}</h1>
      <p>{doc.body}</p>

      {/* Show edit toolbar only to editors and admins */}
      <PermissionGate roles={['editor', 'admin']}>
        <EditToolbar docId={doc.id} />
      </PermissionGate>

      {/* Programmatic check */}
      {canExport && <ExportButton docId={doc.id} />}

      {/* Show "Request Access" to users without write permission */}
      <PermissionGate permissions={['write:documents']} negate>
        <RequestAccessButton />
      </PermissionGate>
    </article>
  );
}
```

---

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feat/your-feature`
3. Run tests: `npm test`
4. Submit a pull request

---

## License

This project is licensed under the MIT License.
See the [LICENSE](LICENSE) file for details.
