/**
 * @fileoverview Unit tests for checkPermission utility functions.
 *
 * Tests cover:
 * - hasRole: any/all logic, empty arrays, case insensitivity
 * - hasPermission: any/all logic, wildcards, namespace wildcards
 * - checkAccess: combined role + permission evaluation
 */

import { hasRole, hasPermission, checkAccess } from '../utils/checkPermission';

// ─── hasRole ─────────────────────────────────────────────────────────────────

describe('hasRole()', () => {
  describe('with "any" logic (default)', () => {
    it('allows when user has one of the required roles', () => {
      const result = hasRole(['editor', 'viewer'], ['admin', 'editor'], 'any');
      expect(result.allowed).toBe(true);
    });

    it('denies when user has none of the required roles', () => {
      const result = hasRole(['viewer'], ['admin', 'editor'], 'any');
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/admin, editor/);
    });

    it('uses "any" as the default logic', () => {
      const result = hasRole(['admin'], ['admin', 'editor']);
      expect(result.allowed).toBe(true);
    });

    it('is case-insensitive', () => {
      const result = hasRole(['ADMIN'], ['admin'], 'any');
      expect(result.allowed).toBe(true);
    });

    it('trims whitespace from roles', () => {
      const result = hasRole([' admin '], ['admin'], 'any');
      expect(result.allowed).toBe(true);
    });
  });

  describe('with "all" logic', () => {
    it('allows when user has all required roles', () => {
      const result = hasRole(['admin', 'editor'], ['admin', 'editor'], 'all');
      expect(result.allowed).toBe(true);
    });

    it('denies when user is missing one required role', () => {
      const result = hasRole(['editor'], ['admin', 'editor'], 'all');
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/admin/);
    });

    it('denies when user is missing all required roles', () => {
      const result = hasRole(['viewer'], ['admin', 'editor'], 'all');
      expect(result.allowed).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('denies when userRoles is empty', () => {
      const result = hasRole([], ['admin'], 'any');
      expect(result.allowed).toBe(false);
    });

    it('allows when requiredRoles is empty (no constraint)', () => {
      const result = hasRole(['editor'], [], 'any');
      expect(result.allowed).toBe(true);
    });

    it('denies when userRoles is not an array', () => {
      const result = hasRole(null, ['admin'], 'any');
      expect(result.allowed).toBe(false);
    });
  });
});

// ─── hasPermission ────────────────────────────────────────────────────────────

describe('hasPermission()', () => {
  describe('with "any" logic (default)', () => {
    it('allows when user has one of the required permissions', () => {
      const result = hasPermission(['read:users'], ['write:users', 'read:users'], 'any');
      expect(result.allowed).toBe(true);
    });

    it('denies when user has none of the required permissions', () => {
      const result = hasPermission(['read:posts'], ['write:users', 'delete:users'], 'any');
      expect(result.allowed).toBe(false);
    });
  });

  describe('with "all" logic', () => {
    it('allows when user has all required permissions', () => {
      const result = hasPermission(['read:users', 'write:users'], ['read:users', 'write:users'], 'all');
      expect(result.allowed).toBe(true);
    });

    it('denies when user is missing one permission', () => {
      const result = hasPermission(['read:users'], ['read:users', 'write:users'], 'all');
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/write:users/);
    });
  });

  describe('wildcard support', () => {
    it('allows everything when user has "*" permission', () => {
      const result = hasPermission(['*'], ['read:users', 'delete:posts', 'write:anything'], 'all');
      expect(result.allowed).toBe(true);
      expect(result.reason).toMatch(/wildcard/);
    });

    it('allows namespace wildcard "read:*" to satisfy "read:users"', () => {
      const result = hasPermission(['read:*'], ['read:users'], 'any');
      expect(result.allowed).toBe(true);
    });

    it('denies namespace wildcard "read:*" for "write:users"', () => {
      const result = hasPermission(['read:*'], ['write:users'], 'any');
      expect(result.allowed).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('denies when userPermissions is empty', () => {
      const result = hasPermission([], ['read:users'], 'any');
      expect(result.allowed).toBe(false);
    });

    it('allows when requiredPermissions is empty (no constraint)', () => {
      const result = hasPermission(['read:users'], [], 'any');
      expect(result.allowed).toBe(true);
    });

    it('is case-insensitive', () => {
      const result = hasPermission(['READ:USERS'], ['read:users'], 'any');
      expect(result.allowed).toBe(true);
    });
  });
});

// ─── checkAccess ──────────────────────────────────────────────────────────────

describe('checkAccess()', () => {
  it('allows when both role and permission checks pass', () => {
    const result = checkAccess({
      userRoles: ['editor'],
      userPermissions: ['write:posts'],
      requiredRoles: ['editor'],
      requiredPermissions: ['write:posts'],
    });
    expect(result.allowed).toBe(true);
  });

  it('denies when role check fails', () => {
    const result = checkAccess({
      userRoles: ['viewer'],
      userPermissions: ['write:posts'],
      requiredRoles: ['admin'],
      requiredPermissions: ['write:posts'],
    });
    expect(result.allowed).toBe(false);
  });

  it('denies when permission check fails', () => {
    const result = checkAccess({
      userRoles: ['editor'],
      userPermissions: ['read:posts'],
      requiredRoles: ['editor'],
      requiredPermissions: ['write:posts'],
    });
    expect(result.allowed).toBe(false);
  });

  it('allows when no requirements are specified', () => {
    const result = checkAccess({
      userRoles: ['viewer'],
      userPermissions: [],
    });
    expect(result.allowed).toBe(true);
  });

  it('respects "all" roleLogic', () => {
    const result = checkAccess({
      userRoles: ['editor'],
      userPermissions: [],
      requiredRoles: ['editor', 'admin'],
      roleLogic: 'all',
    });
    expect(result.allowed).toBe(false);
  });

  it('respects "all" permissionLogic', () => {
    const result = checkAccess({
      userRoles: [],
      userPermissions: ['read:users'],
      requiredPermissions: ['read:users', 'write:users'],
      permissionLogic: 'all',
    });
    expect(result.allowed).toBe(false);
  });
});
