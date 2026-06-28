/**
 * @fileoverview Unit tests for the Angular wrapper.
 */

import { signal, computed, inject } from '@angular/core';
import { PermissionService } from '../angular/PermissionService';
import { permissionGuard } from '../angular/permissionGuard';

// Mock dependencies for inject
let mockServiceInstance = null;
let mockRouterInstance = null;

jest.mock('@angular/router', () => {
  return {
    Router: class Router {},
  };
});

jest.mock('@angular/core', () => {
  return {
    signal: (initialValue) => {
      let val = initialValue;
      const s = () => val;
      s.set = (newVal) => {
        val = newVal;
      };
      s.asReadonly = () => () => val;
      return s;
    },
    computed: (fn) => {
      return () => fn();
    },
    inject: (token) => {
      if (token && token.name === 'PermissionService') {
        return mockServiceInstance;
      }
      return mockRouterInstance;
    },
  };
});

describe('Angular Wrapper', () => {
  beforeEach(() => {
    mockServiceInstance = null;
    mockRouterInstance = {
      parseUrl: jest.fn((url) => `UrlTree(${url})`),
      navigateByUrl: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('PermissionService', () => {
    it('initializes with default signal values', () => {
      const service = new PermissionService();
      expect(service.roles()).toEqual([]);
      expect(service.permissions()).toEqual([]);
      expect(service.user()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.isLoading()).toBe(false);
    });

    it('updates state reactively via updateState', () => {
      const service = new PermissionService();
      service.updateState({
        roles: ['admin'],
        permissions: ['read:users'],
        user: { id: 1 },
        isAuthenticated: true,
      });

      expect(service.roles()).toEqual(['admin']);
      expect(service.permissions()).toEqual(['read:users']);
      expect(service.user()).toEqual({ id: 1 });
      expect(service.isAuthenticated()).toBe(true);
    });

    it('evaluates combined access using hasAccess signal', () => {
      const service = new PermissionService();
      const accessSignal = service.hasAccess({ roles: ['admin'] });

      expect(accessSignal()).toBe(false);

      service.updateState({ roles: ['admin'] });
      expect(accessSignal()).toBe(true);
    });

    it('returns false during isLoading', () => {
      const service = new PermissionService();
      service.updateState({ roles: ['admin'], isLoading: true });
      const accessSignal = service.hasAccess({ roles: ['admin'] });
      expect(accessSignal()).toBe(false);
    });

    it('evaluates roles using hasRole signal', () => {
      const service = new PermissionService();
      const roleSignal = service.hasRole(['editor', 'admin'], 'any');

      expect(roleSignal()).toBe(false);

      service.updateState({ roles: ['editor'] });
      expect(roleSignal()).toBe(true);
    });

    it('evaluates permissions using hasPermission signal', () => {
      const service = new PermissionService();
      const permSignal = service.hasPermission(['write:posts']);

      expect(permSignal()).toBe(false);

      service.updateState({ permissions: ['write:posts'] });
      expect(permSignal()).toBe(true);
    });
  });

  describe('permissionGuard Router Guard', () => {
    beforeEach(() => {
      mockServiceInstance = new PermissionService();
    });

    it('allows navigation when access is granted', () => {
      mockServiceInstance.updateState({ roles: ['admin'] });
      const guard = permissionGuard({ roles: ['admin'] });
      const result = guard();
      expect(result).toBe(true);
    });

    it('denies navigation (returns false) when access is denied and no redirect is provided', () => {
      mockServiceInstance.updateState({ roles: ['viewer'] });
      const guard = permissionGuard({ roles: ['admin'] });
      const result = guard();
      expect(result).toBe(false);
    });

    it('redirects (returns UrlTree) when access is denied and redirectTo is provided', () => {
      mockServiceInstance.updateState({ roles: ['viewer'] });
      const guard = permissionGuard({ roles: ['admin'], redirectTo: '/login' });
      const result = guard();
      expect(result).toBe('UrlTree(/login)');
      expect(mockRouterInstance.parseUrl).toHaveBeenCalledWith('/login');
    });

    it('handles async loading and waits until isLoading resolves to false', async () => {
      mockServiceInstance.updateState({ roles: ['admin'], isLoading: true });
      const guard = permissionGuard({ roles: ['admin'] });
      
      const resultPromise = guard();
      expect(resultPromise).toBeInstanceOf(Promise);

      // Simulate load complete after 100ms
      setTimeout(() => {
        mockServiceInstance.updateState({ roles: ['admin'], isLoading: false });
      }, 100);

      const result = await resultPromise;
      expect(result).toBe(true);
    });

    it('handles async loading denial and routes redirect if provided', async () => {
      mockServiceInstance.updateState({ roles: ['viewer'], isLoading: true });
      const guard = permissionGuard({ roles: ['admin'], redirectTo: '/forbidden' });
      
      const resultPromise = guard();
      
      setTimeout(() => {
        mockServiceInstance.updateState({ roles: ['viewer'], isLoading: false });
      }, 50);

      const result = await resultPromise;
      expect(result).toBe('UrlTree(/forbidden)');
    });
  });
});
