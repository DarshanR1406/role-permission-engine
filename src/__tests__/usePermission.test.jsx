/**
 * @fileoverview Unit and integration tests for the `usePermission` hook.
 *
 * Tests cover:
 * - Default behaviour (no constraints) — always allowed
 * - Role-only check: any/all logic
 * - Permission-only check: any/all logic, wildcards
 * - Combined role + permission check
 * - `denied` field mirrors `!allowed`
 * - `isLoading` flag — forces allowed=false while loading
 * - `isAuthenticated` passthrough from context
 * - `reason` string content
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PermissionProvider } from '../context/PermissionContext';
import { usePermission } from '../hooks/usePermission';

// ─── Test Consumer Component ──────────────────────────────────────────────────

/**
 * Minimal React component that calls `usePermission` and exposes all returned
 * fields via `data-testid` attributes so tests can assert against them easily.
 *
 * @param {import('../hooks/usePermission').UsePermissionOptions} options
 *   Forwarded directly to `usePermission`.
 */
function PermissionConsumer(options = {}) {
  const { allowed, denied, isLoading, isAuthenticated, reason } =
    usePermission(options);

  return (
    <div>
      <span data-testid="allowed">{String(allowed)}</span>
      <span data-testid="denied">{String(denied)}</span>
      <span data-testid="isLoading">{String(isLoading)}</span>
      <span data-testid="isAuthenticated">{String(isAuthenticated)}</span>
      <span data-testid="reason">{reason}</span>
    </div>
  );
}

/**
 * Renders `PermissionConsumer` inside a `PermissionProvider` with merged config.
 *
 * @param {Object} [providerConfig={}]   Props for PermissionProvider.
 * @param {Object} [hookOptions={}]      Options forwarded to usePermission.
 */
function renderHook(providerConfig = {}, hookOptions = {}) {
  const defaults = {
    roles: [],
    permissions: [],
    isAuthenticated: false,
    isLoading: false,
    user: null,
  };
  return render(
    <PermissionProvider {...defaults} {...providerConfig}>
      <PermissionConsumer {...hookOptions} />
    </PermissionProvider>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('usePermission()', () => {
  // ── No constraints ──────────────────────────────────────────────────────────
  describe('with no constraints', () => {
    it('allows when no roles or permissions are required', () => {
      renderHook({ roles: ['viewer'], isAuthenticated: true });
      expect(screen.getByTestId('allowed').textContent).toBe('true');
    });

    it('denied is false when allowed is true', () => {
      renderHook();
      expect(screen.getByTestId('denied').textContent).toBe('false');
    });
  });

  // ── isLoading ───────────────────────────────────────────────────────────────
  describe('while isLoading is true', () => {
    it('always returns allowed=false regardless of roles', () => {
      renderHook(
        { roles: ['admin'], isAuthenticated: true, isLoading: true },
        { roles: ['admin'] }
      );
      expect(screen.getByTestId('allowed').textContent).toBe('false');
    });

    it('returns isLoading=true', () => {
      renderHook({ isLoading: true });
      expect(screen.getByTestId('isLoading').textContent).toBe('true');
    });

    it('denied=true while loading', () => {
      renderHook({ isLoading: true });
      expect(screen.getByTestId('denied').textContent).toBe('true');
    });
  });

  // ── isAuthenticated ─────────────────────────────────────────────────────────
  describe('isAuthenticated passthrough', () => {
    it('reflects isAuthenticated=true from provider', () => {
      renderHook({ isAuthenticated: true });
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
    });

    it('reflects isAuthenticated=false by default', () => {
      renderHook();
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
    });
  });

  // ── Role checks ─────────────────────────────────────────────────────────────
  describe('role checks', () => {
    it('allows when user has a required role (any logic, default)', () => {
      renderHook(
        { roles: ['editor'], isAuthenticated: true },
        { roles: ['admin', 'editor'] }
      );
      expect(screen.getByTestId('allowed').textContent).toBe('true');
    });

    it('denies when user has none of the required roles', () => {
      renderHook(
        { roles: ['viewer'], isAuthenticated: true },
        { roles: ['admin', 'editor'] }
      );
      expect(screen.getByTestId('allowed').textContent).toBe('false');
      expect(screen.getByTestId('denied').textContent).toBe('true');
    });

    it('allows with "all" roleLogic when user has every required role', () => {
      renderHook(
        { roles: ['admin', 'editor'], isAuthenticated: true },
        { roles: ['admin', 'editor'], roleLogic: 'all' }
      );
      expect(screen.getByTestId('allowed').textContent).toBe('true');
    });

    it('denies with "all" roleLogic when user is missing one role', () => {
      renderHook(
        { roles: ['editor'], isAuthenticated: true },
        { roles: ['admin', 'editor'], roleLogic: 'all' }
      );
      expect(screen.getByTestId('allowed').textContent).toBe('false');
    });
  });

  // ── Permission checks ───────────────────────────────────────────────────────
  describe('permission checks', () => {
    it('allows when user has a required permission (any logic, default)', () => {
      renderHook(
        { permissions: ['read:users'], isAuthenticated: true },
        { permissions: ['read:users', 'write:users'] }
      );
      expect(screen.getByTestId('allowed').textContent).toBe('true');
    });

    it('denies when user has none of the required permissions', () => {
      renderHook(
        { permissions: ['read:posts'], isAuthenticated: true },
        { permissions: ['write:posts', 'delete:posts'] }
      );
      expect(screen.getByTestId('allowed').textContent).toBe('false');
    });

    it('allows wildcard "*" permission for any requirement', () => {
      renderHook(
        { permissions: ['*'], isAuthenticated: true },
        { permissions: ['read:users', 'write:users'], permissionLogic: 'all' }
      );
      expect(screen.getByTestId('allowed').textContent).toBe('true');
    });

    it('allows namespace wildcard "read:*" for any "read:" permission', () => {
      renderHook(
        { permissions: ['read:*'], isAuthenticated: true },
        { permissions: ['read:users'] }
      );
      expect(screen.getByTestId('allowed').textContent).toBe('true');
    });

    it('allows with "all" permissionLogic when user has every required permission', () => {
      renderHook(
        { permissions: ['read:users', 'write:users'], isAuthenticated: true },
        { permissions: ['read:users', 'write:users'], permissionLogic: 'all' }
      );
      expect(screen.getByTestId('allowed').textContent).toBe('true');
    });

    it('denies with "all" permissionLogic when user is missing one permission', () => {
      renderHook(
        { permissions: ['read:users'], isAuthenticated: true },
        { permissions: ['read:users', 'write:users'], permissionLogic: 'all' }
      );
      expect(screen.getByTestId('allowed').textContent).toBe('false');
    });
  });

  // ── reason string ───────────────────────────────────────────────────────────
  describe('reason string', () => {
    it('returns a non-empty reason string when allowed', () => {
      renderHook({ roles: ['admin'], isAuthenticated: true }, { roles: ['admin'] });
      const reason = screen.getByTestId('reason').textContent;
      expect(reason.length).toBeGreaterThan(0);
    });

    it('returns a non-empty reason string when denied', () => {
      renderHook({ roles: ['viewer'] }, { roles: ['admin'] });
      const reason = screen.getByTestId('reason').textContent;
      expect(reason.length).toBeGreaterThan(0);
    });

    it('includes "loading" in reason while isLoading', () => {
      renderHook({ isLoading: true }, { roles: ['admin'] });
      const reason = screen.getByTestId('reason').textContent.toLowerCase();
      expect(reason).toMatch(/load/);
    });
  });
});
