/**
 * @fileoverview Integration tests for BlockRoute component.
 *
 * Tests cover:
 * - Renders children when user has required role
 * - Redirects when user lacks required role
 * - Renders loading component during isLoading
 * - Supports permission-based blocking
 * - Supports "all" logic
 * - Handles React Router v6 Navigate
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PermissionProvider } from '../context/PermissionContext';
import { BlockRoute } from '../components/BlockRoute';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Test helper — renders `<BlockRoute>` inside a complete
 * `<PermissionProvider>` + React Router v6 `<MemoryRouter>` tree.
 *
 * The router is initialised at `/protected`. A second route at
 * `/unauthorized` is registered so redirect assertions work correctly.
 *
 * @param {Object} [permissionConfig={}]
 *   Props forwarded to `<PermissionProvider>`. All fields are optional;
 *   any omitted field falls back to the safe defaults listed below.
 *
 *   | Field             | Type        | Default  | Description                          |
 *   |-------------------|-------------|----------|--------------------------------------|
 *   | `roles`           | `string[]`  | `[]`     | Roles assigned to the current user   |
 *   | `permissions`     | `string[]`  | `[]`     | Permissions held by the current user |
 *   | `isAuthenticated` | `boolean`   | `false`  | Whether the user is signed in        |
 *   | `isLoading`       | `boolean`   | `false`  | Whether auth state is resolving      |
 *   | `user`            | `object\|null` | `null` | Raw user object (any shape)          |
 *
 * @param {Object} [blockRouteProps={}]
 *   Props forwarded to `<BlockRoute>`. All fields are optional;
 *   any omitted field uses `BlockRoute`'s own defaults.
 *
 *   | Field              | Type                   | Default            | Description                                   |
 *   |--------------------|------------------------|--------------------|-----------------------------------------------|
 *   | `roles`            | `string[]`             | `[]`               | Required roles to pass the route guard        |
 *   | `permissions`      | `string[]`             | `[]`               | Required permissions to pass the route guard  |
 *   | `roleLogic`        | `"any" \| "all"`       | `"any"`            | OR / AND logic for role evaluation            |
 *   | `permissionLogic`  | `"any" \| "all"`       | `"any"`            | OR / AND logic for permission evaluation      |
 *   | `redirectTo`       | `string`               | `"/unauthorized"`  | Path to redirect to when access is denied     |
 *   | `loadingComponent` | `React.ReactNode`      | `null`             | Element shown while `isLoading` is `true`     |
 *   | `replace`          | `boolean`              | `true`             | Replace (`true`) or push (`false`) history    |
 *   | `state`            | `unknown`              | `undefined`        | Location state passed to the redirect         |
 *
 * @returns {import('@testing-library/react').RenderResult}
 *   The result of `render(...)` — use `screen`, `getByTestId`, etc. to assert.
 *
 * @example
 * // User is an admin — protected content should render
 * renderWithProviders(
 *   { roles: ['admin'], isAuthenticated: true },
 *   { roles: ['admin'] },
 * );
 * expect(screen.getByTestId('protected-content')).toBeInTheDocument();
 *
 * @example
 * // User is a viewer — should be redirected to /unauthorized
 * renderWithProviders(
 *   { roles: ['viewer'], isAuthenticated: true },
 *   { roles: ['admin'] },
 * );
 * expect(screen.getByTestId('unauthorized-page')).toBeInTheDocument();
 */
function renderWithProviders(permissionConfig = {}, blockRouteProps = {}) {
  const defaultPermission = {
    roles: [],
    permissions: [],
    isAuthenticated: false,
    isLoading: false,
    user: null,
    ...permissionConfig,
  };

  const defaultBlockRoute = {
    redirectTo: '/unauthorized',
    ...blockRouteProps,
  };

  return render(
    <PermissionProvider {...defaultPermission}>
      <MemoryRouter
        initialEntries={['/protected']}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route
            path="/protected"
            element={
              <BlockRoute {...defaultBlockRoute}>
                <div data-testid="protected-content">Protected Content</div>
              </BlockRoute>
            }
          />
          <Route
            path="/unauthorized"
            element={<div data-testid="unauthorized-page">Unauthorized</div>}
          />
        </Routes>
      </MemoryRouter>
    </PermissionProvider>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('<BlockRoute />', () => {
  describe('role-based access', () => {
    it('renders children when user has the required role', () => {
      renderWithProviders(
        { roles: ['admin'], isAuthenticated: true },
        { roles: ['admin'] }
      );
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('redirects when user lacks the required role', () => {
      renderWithProviders(
        { roles: ['viewer'], isAuthenticated: true },
        { roles: ['admin'] }
      );
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('unauthorized-page')).toBeInTheDocument();
    });

    it('redirects when user has no roles', () => {
      renderWithProviders(
        { roles: [], isAuthenticated: false },
        { roles: ['admin'] }
      );
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('unauthorized-page')).toBeInTheDocument();
    });

    it('allows with "any" role logic when user has one of multiple roles', () => {
      renderWithProviders(
        { roles: ['editor'], isAuthenticated: true },
        { roles: ['admin', 'editor'], roleLogic: 'any' }
      );
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('blocks with "all" role logic when user is missing a role', () => {
      renderWithProviders(
        { roles: ['editor'], isAuthenticated: true },
        { roles: ['admin', 'editor'], roleLogic: 'all' }
      );
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('unauthorized-page')).toBeInTheDocument();
    });
  });

  describe('permission-based access', () => {
    it('renders children when user has the required permission', () => {
      renderWithProviders(
        { permissions: ['write:posts'], isAuthenticated: true },
        { permissions: ['write:posts'] }
      );
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('redirects when user lacks the required permission', () => {
      renderWithProviders(
        { permissions: ['read:posts'], isAuthenticated: true },
        { permissions: ['write:posts'] }
      );
      expect(screen.getByTestId('unauthorized-page')).toBeInTheDocument();
    });

    it('allows wildcard permission user to access any protected route', () => {
      renderWithProviders(
        { permissions: ['*'], isAuthenticated: true },
        { permissions: ['write:posts', 'delete:users'] }
      );
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('renders loadingComponent while isLoading is true', () => {
      renderWithProviders(
        { roles: ['admin'], isLoading: true },
        {
          roles: ['admin'],
          loadingComponent: <div data-testid="loading">Loading...</div>,
        }
      );
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('renders null (nothing) when isLoading and no loadingComponent', () => {
      const { container } = renderWithProviders(
        { roles: ['admin'], isLoading: true },
        { roles: ['admin'] }
      );
      // Should be in MemoryRouter but no content rendered for the route element itself
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('no requirements', () => {
    it('renders children when no roles or permissions are required', () => {
      renderWithProviders({ roles: ['viewer'], isAuthenticated: true }, {});
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('asyncCheck handler integration', () => {
    it('renders children when sync asyncCheck returns true', () => {
      renderWithProviders(
        { roles: ['user'], isAuthenticated: true },
        { asyncCheck: ({ roles }) => roles.includes('user') }
      );
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('redirects when sync asyncCheck returns false', () => {
      renderWithProviders(
        { roles: ['user'], isAuthenticated: true },
        { asyncCheck: () => false }
      );
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('unauthorized-page')).toBeInTheDocument();
    });

    it('renders loadingComponent while async asyncCheck resolves', async () => {
      renderWithProviders(
        { roles: ['user'], isAuthenticated: true },
        { 
          asyncCheck: () => Promise.resolve(true),
          loadingComponent: <div data-testid="loading">Verifying…</div>
        }
      );
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();

      // Wait for it to resolve
      const content = await screen.findByTestId('protected-content');
      expect(content).toBeInTheDocument();
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });
  });
});
