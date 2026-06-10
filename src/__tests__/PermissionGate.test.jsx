/**
 * @fileoverview Integration tests for the `PermissionGate` component.
 *
 * Tests cover:
 * - Renders `children` when the user has the required role
 * - Renders `fallback` when the user lacks the required role
 * - Renders `null` when denied and no `fallback` provided
 * - Renders `children` when the user has the required permission
 * - Renders `loadingComponent` while `isLoading` is `true`
 * - `negate` prop — inverts the access check (show when denied)
 * - `roleLogic` / `permissionLogic` — AND (`"all"`) operator
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PermissionProvider } from '../context/PermissionContext';
import { PermissionGate } from '../components/PermissionGate';

/**
 * Test helper — renders `<PermissionGate>` wrapped inside a
 * `<PermissionProvider>` with a fixed `data-testid="gate-content"` child.
 *
 * Use `screen.getByTestId('gate-content')` to assert the gate is open, and
 * `screen.queryByTestId('gate-content')` (returns `null`) to assert it is closed.
 *
 * @param {Object} [permissionConfig={}]
 *   Props forwarded to `<PermissionProvider>`. All fields are optional;
 *   omitted fields fall back to the safe defaults shown below.
 *
 *   | Field             | Type           | Default  | Description                          |
 *   |-------------------|----------------|----------|--------------------------------------|
 *   | `roles`           | `string[]`     | `[]`     | Roles assigned to the user           |
 *   | `permissions`     | `string[]`     | `[]`     | Permissions held by the user         |
 *   | `isAuthenticated` | `boolean`      | `false`  | Whether the user is signed in        |
 *   | `isLoading`       | `boolean`      | `false`  | Whether auth state is resolving      |
 *   | `user`            | `object\|null` | `null`   | Raw user object (any shape)          |
 *
 * @param {Object} [gateProps={}]
 *   Props forwarded to `<PermissionGate>`. All fields are optional;
 *   omitted fields use `PermissionGate`'s own defaults.
 *
 *   | Field              | Type                 | Default  | Description                                          |
 *   |--------------------|----------------------|----------|------------------------------------------------------|
 *   | `roles`            | `string[]`           | `[]`     | Required roles — skip check when empty               |
 *   | `permissions`      | `string[]`           | `[]`     | Required permissions — skip check when empty         |
 *   | `roleLogic`        | `"any" \| "all"`     | `"any"` | OR / AND logic for role evaluation                   |
 *   | `permissionLogic`  | `"any" \| "all"`     | `"any"` | OR / AND logic for permission evaluation             |
 *   | `fallback`         | `React.ReactNode`    | `null`   | Rendered when gate is **closed** (access denied)     |
 *   | `loadingComponent` | `React.ReactNode`    | `null`   | Rendered while `isLoading` is `true`                 |
 *   | `negate`           | `boolean`            | `false`  | Invert logic: `true` shows children when access denied |
 *
 * @returns {import('@testing-library/react').RenderResult}
 *   The result of `render(...)` — use `screen`, `getByTestId`, etc. to assert.
 *
 * @example
 * // Gate is open — user has the required role
 * renderGate(
 *   { roles: ['admin'], isAuthenticated: true },
 *   { roles: ['admin'] },
 * );
 * expect(screen.getByTestId('gate-content')).toBeInTheDocument();
 *
 * @example
 * // Gate is closed — user lacks the role, fallback is shown
 * renderGate(
 *   { roles: ['viewer'] },
 *   { roles: ['admin'], fallback: <span data-testid="fallback">No access</span> },
 * );
 * expect(screen.queryByTestId('gate-content')).not.toBeInTheDocument();
 * expect(screen.getByTestId('fallback')).toBeInTheDocument();
 *
 * @example
 * // negate — gate opens for users who do NOT have the role
 * renderGate(
 *   { roles: ['viewer'] },
 *   { roles: ['admin'], negate: true },
 * );
 * expect(screen.getByTestId('gate-content')).toBeInTheDocument();
 */
function renderGate(permissionConfig = {}, gateProps = {}) {
  return render(
    <PermissionProvider
      roles={[]}
      permissions={[]}
      isAuthenticated={false}
      isLoading={false}
      {...permissionConfig}
    >
      <PermissionGate {...gateProps}>
        <div data-testid="gate-content">Gate Content</div>
      </PermissionGate>
    </PermissionProvider>
  );
}

describe('<PermissionGate />', () => {
  it('renders children when user has the required role', () => {
    renderGate({ roles: ['admin'], isAuthenticated: true }, { roles: ['admin'] });
    expect(screen.getByTestId('gate-content')).toBeInTheDocument();
  });

  it('renders fallback when user lacks required role', () => {
    renderGate(
      { roles: ['viewer'], isAuthenticated: true },
      {
        roles: ['admin'],
        fallback: <div data-testid="fallback">No Access</div>,
      }
    );
    expect(screen.queryByTestId('gate-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('renders null when denied and no fallback provided', () => {
    renderGate({ roles: ['viewer'] }, { roles: ['admin'] });
    expect(screen.queryByTestId('gate-content')).not.toBeInTheDocument();
  });

  it('renders children when user has required permission', () => {
    renderGate(
      { permissions: ['write:posts'], isAuthenticated: true },
      { permissions: ['write:posts'] }
    );
    expect(screen.getByTestId('gate-content')).toBeInTheDocument();
  });

  it('renders loadingComponent while isLoading', () => {
    renderGate(
      { isLoading: true },
      {
        roles: ['admin'],
        loadingComponent: <div data-testid="loading">Loading…</div>,
      }
    );
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.queryByTestId('gate-content')).not.toBeInTheDocument();
  });

  describe('negate prop', () => {
    it('renders children when negate=true and user does NOT have role', () => {
      renderGate(
        { roles: ['viewer'], isAuthenticated: true },
        { roles: ['admin'], negate: true }
      );
      expect(screen.getByTestId('gate-content')).toBeInTheDocument();
    });

    it('hides children when negate=true and user DOES have role', () => {
      renderGate(
        { roles: ['admin'], isAuthenticated: true },
        { roles: ['admin'], negate: true }
      );
      expect(screen.queryByTestId('gate-content')).not.toBeInTheDocument();
    });
  });

  describe('logic operators', () => {
    it('allows with "all" permission logic when user has all required permissions', () => {
      renderGate(
        { permissions: ['read:users', 'write:users'], isAuthenticated: true },
        { permissions: ['read:users', 'write:users'], permissionLogic: 'all' }
      );
      expect(screen.getByTestId('gate-content')).toBeInTheDocument();
    });

    it('denies with "all" permission logic when user is missing a permission', () => {
      renderGate(
        { permissions: ['read:users'], isAuthenticated: true },
        {
          permissions: ['read:users', 'write:users'],
          permissionLogic: 'all',
          fallback: <div data-testid="fallback">Denied</div>,
        }
      );
      expect(screen.getByTestId('fallback')).toBeInTheDocument();
    });
  });
});
