# Changelog

All notable changes to `role-permission-engine` will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
and the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

---

## [Unreleased]

### Added

- Started development of official **Vue and Angular wrapper adapters** to bring isomorphic RBAC/PBAC capability to Vue 3 (Pinia/Vue Router) and Angular (Guards/Injectables).

---

## [1.2.0] — 2026-06-14

### Added

- **Custom Async Verification Handlers (`asyncCheck`)**
  - Support for arbitrary asynchronous or synchronous custom checks in `usePermission` hook, `<PermissionGate>`, `<BlockRoute>`, and `withPermission` HOC.
  - While custom verification resolves, components and hooks expose a loading state (`isLoading: true`) and support custom `loadingComponent` spinner displays.
  - Standard permission and role verification run first and short-circuit async verification on unauthorized requests for performance and security optimization.
  - Full TypeScript support for the `asyncCheck` prop.
  - Comprehensive unit testing with 100% coverage.
  - Fully updated documentation and examples in library `README.md`.

---

## [1.1.0] — 2026-06-13

### Added

#### Next.js Middleware subpath (`src/middleware/next.js`)

- **`createMiddleware(options)`**
  - Next.js App Router Middleware helper factory to protect application routes dynamically at the Edge.
  - Supports string matching, RegExp matching, and custom matching functions in route rules.
  - Extract user credentials (roles, permissions) from headers, JWT, cookies, etc. using a custom `getUser` function.
  - Custom redirect URLs (`loginUrl` and `unauthorizedUrl`).
  - Supports custom handlers `onUnauthenticated` and `onUnauthorized` to let developers return JSON or handle custom redirect responses.
  - TypeScript types inside `types/middleware.d.ts`.

---

## [1.0.0] — 2026-06-05

### 🎉 Initial Release

First public release of `role-permission-engine` — a lightweight, flexible
role and permission-based access control library for React applications.

---

### Added

#### Core Utilities (`src/utils/checkPermission.js`)

- **`hasRole(userRoles, requiredRoles, logic?)`**
  - Pure, framework-agnostic role check.
  - Supports `"any"` (OR, default) and `"all"` (AND) logic.
  - Case-insensitive and whitespace-trimming comparisons.
  - Returns `{ allowed: boolean, reason: string }`.

- **`hasPermission(userPermissions, requiredPermissions, logic?)`**
  - Pure, framework-agnostic permission check.
  - Full wildcard support: `"*"` (superuser) and `"read:*"` (namespace wildcard).
  - Supports `"any"` (OR, default) and `"all"` (AND) logic.

- **`checkAccess(options)`**
  - Combined role **and** permission check in a single call.
  - Both constraints must pass for `allowed: true`.
  - Empty constraint arrays are automatically satisfied (open access).
  - Accepts `roleLogic` and `permissionLogic` independently.

---

#### React Context (`src/context/PermissionContext.jsx`)

- **`<PermissionProvider>`**
  - Provides `roles`, `permissions`, `user`, `isAuthenticated`, and `isLoading`
    to the entire React subtree below it.
  - Memoized — only re-renders children when props actually change.
  - `isLoading` support prevents premature redirects during async auth fetches.

- **`usePermissionContext()`**
  - Hook to read the raw context value (roles, permissions, user, etc.).
  - Throws a clear error if called outside a `<PermissionProvider>`.

---

#### React Hook (`src/hooks/usePermission.js`)

- **`usePermission(options?)`**
  - Programmatic permission checking within React components.
  - Returns `{ allowed, denied, isLoading, isAuthenticated, reason }`.
  - `denied` is a convenience inverse of `allowed`.
  - `allowed` is always `false` while `isLoading` is `true`.
  - Memoized with `useMemo` — only re-evaluates when inputs change.

---

#### React Components

- **`<BlockRoute>`** (`src/components/BlockRoute.jsx`)
  - Route guard component — redirects unauthorized users.
  - Props: `roles`, `permissions`, `roleLogic`, `permissionLogic`,
    `redirectTo` (default: `"/unauthorized"`), `loadingComponent`,
    `replace` (default: `true`), `state`.
  - Auto-detects React Router version at runtime:
    - v6: uses `<Navigate>`.
    - v5: uses `<Redirect>`.
  - Shows `loadingComponent` while `isLoading` is `true`.

- **`<PermissionGate>`** (`src/components/PermissionGate.jsx`)
  - Inline conditional rendering — never redirects.
  - Props: `roles`, `permissions`, `roleLogic`, `permissionLogic`,
    `fallback` (default: `null`), `loadingComponent` (default: `null`),
    `negate` (default: `false`).
  - `negate` inverts the check — renders `children` when access is **denied**.
    Ideal for guest-only UI (login buttons, upgrade banners).

---

#### TypeScript Declarations (`types/index.d.ts`)

- Full TypeScript types for all public exports:
  `Role`, `Permission`, `LogicOperator`, `PermissionResult`,
  `CheckAccessOptions`, `PermissionContextValue`, `PermissionProviderProps`,
  `UsePermissionOptions`, `UsePermissionResult`, `BlockRouteProps`,
  `PermissionGateProps`.

---

#### Build & Tooling

- **Dual-format output** via Rollup:
  - `dist/index.cjs.js` — CommonJS (Node.js / `require()`)
  - `dist/index.esm.js` — ES Module (`import`)
- **`prepublishOnly`** script: runs `build` then `test` before every `npm publish`.
- **JSDoc** config (`jsdoc.json`) for generating HTML documentation: `npm run docs`.

---

#### Tests

- **47 unit and integration tests** across 3 test suites (Jest + React Testing Library):
  - `checkPermission.test.js` — 27 tests for all utility functions.
  - `PermissionGate.test.jsx` — 9 tests for inline gate component.
  - `BlockRoute.test.jsx` — 11 tests for route guard component.
- 100% test pass rate on initial release.

---

### Package Info

| Field       | Value                                                        |
|-------------|--------------------------------------------------------------|
| Name        | `role-permission-engine`                                     |
| Version     | `1.2.0`                                                      |
| License     | MIT                                                          |
| Author      | Darshan Raghvani                                             |
| Peer deps   | `react >=16.8`, `react-dom >=16.8`, `react-router-dom >=5`  |
| Node target | ES2019+                                                      |

---

[Unreleased]: https://github.com/DarshanR1406/role-permission-engine/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/DarshanR1406/role-permission-engine/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/DarshanR1406/role-permission-engine/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/DarshanR1406/role-permission-engine/releases/tag/v1.0.0
