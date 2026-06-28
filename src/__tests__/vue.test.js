/**
 * @fileoverview Unit and integration tests for the Vue wrapper.
 */

import { reactive, ref, nextTick } from 'vue';
import { createPermissionPlugin, PermissionSymbol, getActiveState } from '../vue/PermissionPlugin';
import { usePermission } from '../vue/usePermission';
import { PermissionGate } from '../vue/PermissionGate';
import { permissionDirective, roleDirective } from '../vue/directives';

// Global variable to hold injection context mock
let mockContext = null;

jest.mock('vue', () => {
  const original = jest.requireActual('vue');
  return {
    ...original,
    inject: (symbol) => {
      if (symbol && symbol.toString() === 'Symbol(PermissionContext)') {
        return mockContext;
      }
      return original.inject(symbol);
    },
  };
});

describe('Vue Wrapper', () => {
  beforeEach(() => {
    mockContext = null;
    jest.clearAllMocks();
  });

  describe('PermissionPlugin', () => {
    it('initializes state with defaults', () => {
      const plugin = createPermissionPlugin();
      expect(plugin.state.roles).toEqual([]);
      expect(plugin.state.permissions).toEqual([]);
      expect(plugin.state.user).toBeNull();
      expect(plugin.state.isAuthenticated).toBe(false);
      expect(plugin.state.isLoading).toBe(false);
    });

    it('initializes state with custom values', () => {
      const plugin = createPermissionPlugin({
        roles: ['admin'],
        permissions: ['read:users'],
        user: { name: 'Alice' },
        isAuthenticated: true,
        isLoading: false,
      });
      expect(plugin.state.roles).toEqual(['admin']);
      expect(plugin.state.permissions).toEqual(['read:users']);
      expect(plugin.state.user).toEqual({ name: 'Alice' });
      expect(plugin.state.isAuthenticated).toBe(true);
    });

    it('updates state via updateState', () => {
      const plugin = createPermissionPlugin();
      plugin.updateState({ roles: ['editor'], isAuthenticated: true });
      expect(plugin.state.roles).toEqual(['editor']);
      expect(plugin.state.isAuthenticated).toBe(true);
    });

    it('tracks the active state globally', () => {
      const plugin = createPermissionPlugin({ roles: ['superuser'] });
      expect(getActiveState()).toBe(plugin.state);
    });
  });

  describe('usePermission Composable', () => {
    let mockState;

    beforeEach(() => {
      mockState = reactive({
        roles: [],
        permissions: [],
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      mockContext = { state: mockState };
    });

    it('throws error if plugin is not registered', () => {
      mockContext = null;
      expect(() => usePermission()).toThrow();
    });

    it('returns true if no requirements are specified', () => {
      const { allowed } = usePermission();
      expect(allowed.value).toBe(true);
    });

    it('returns false during isLoading', () => {
      mockState.isLoading = true;
      const { allowed, isLoading } = usePermission({ roles: ['admin'] });
      expect(allowed.value).toBe(false);
      expect(isLoading.value).toBe(true);
    });

    it('returns true when user has the required role', () => {
      mockState.roles = ['admin'];
      const { allowed } = usePermission({ roles: ['admin'] });
      expect(allowed.value).toBe(true);
    });

    it('returns false when user lacks the required role', () => {
      mockState.roles = ['viewer'];
      const { allowed, reason } = usePermission({ roles: ['admin'] });
      expect(allowed.value).toBe(false);
      expect(reason.value).toContain('User does not have any of the required roles');
    });

    it('supports "all" roleLogic operator', () => {
      mockState.roles = ['editor'];
      const { allowed: anyAllowed } = usePermission({ roles: ['editor', 'admin'], roleLogic: 'any' });
      const { allowed: allAllowed } = usePermission({ roles: ['editor', 'admin'], roleLogic: 'all' });
      expect(anyAllowed.value).toBe(true);
      expect(allAllowed.value).toBe(false);
    });

    it('supports sync asyncCheck handler', () => {
      mockState.roles = ['user'];
      const { allowed } = usePermission({
        roles: ['user'],
        asyncCheck: ({ roles }) => roles.includes('user'),
      });
      expect(allowed.value).toBe(true);
    });

    it('handles async asyncCheck handler', async () => {
      mockState.roles = ['user'];
      const promise = Promise.resolve(true);
      const { allowed, isLoading } = usePermission({
        roles: ['user'],
        asyncCheck: () => promise,
      });

      expect(isLoading.value).toBe(true);
      await promise;
      await nextTick();
      expect(allowed.value).toBe(true);
      expect(isLoading.value).toBe(false);
    });
  });

  describe('PermissionGate Component', () => {
    let mockState;

    beforeEach(() => {
      mockState = reactive({
        roles: ['editor'],
        permissions: ['write:posts'],
        user: null,
        isAuthenticated: true,
        isLoading: false,
      });
      mockContext = { state: mockState };
    });

    it('renders default slot when access is allowed', () => {
      const defaultSlot = jest.fn(() => 'content');
      const renderFn = PermissionGate.setup(
        { roles: ['editor'] },
        { slots: { default: defaultSlot } }
      );
      const result = renderFn();
      expect(result).toBe('content');
      expect(defaultSlot).toHaveBeenCalled();
    });

    it('renders fallback slot when access is denied', () => {
      const defaultSlot = jest.fn(() => 'content');
      const fallbackSlot = jest.fn(() => 'fallback');
      const renderFn = PermissionGate.setup(
        { roles: ['admin'] },
        { slots: { default: defaultSlot, fallback: fallbackSlot } }
      );
      const result = renderFn();
      expect(result).toBe('fallback');
      expect(defaultSlot).not.toHaveBeenCalled();
      expect(fallbackSlot).toHaveBeenCalled();
    });

    it('renders loading slot when loading', () => {
      mockState.isLoading = true;
      const defaultSlot = jest.fn(() => 'content');
      const loadingSlot = jest.fn(() => 'loading');
      const renderFn = PermissionGate.setup(
        { roles: ['editor'] },
        { slots: { default: defaultSlot, loading: loadingSlot } }
      );
      const result = renderFn();
      expect(result).toBe('loading');
      expect(defaultSlot).not.toHaveBeenCalled();
      expect(loadingSlot).toHaveBeenCalled();
    });

    it('inverts rendering when negate is true', () => {
      const defaultSlot = jest.fn(() => 'content');
      const renderFn = PermissionGate.setup(
        { roles: ['admin'], negate: true },
        { slots: { default: defaultSlot } }
      );
      const result = renderFn();
      expect(result).toBe('content');
    });
  });

  describe('Directives v-permission & v-role', () => {
    let el;
    let mockState;

    beforeEach(() => {
      el = {
        style: { display: '' },
        setAttribute: jest.fn(),
        removeAttribute: jest.fn(),
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
        },
      };
      mockState = createPermissionPlugin({
        roles: ['editor'],
        permissions: ['write:posts'],
        isLoading: false,
      }).state;
    });

    afterEach(() => {
      if (el._permissionCleanup) el._permissionCleanup();
      if (el._roleCleanup) el._roleCleanup();
    });

    it('hides elements when permission check fails', () => {
      permissionDirective.mounted(el, { value: 'delete:posts', modifiers: {} });
      expect(el.style.display).toBe('none');
    });

    it('shows elements when permission check passes', () => {
      permissionDirective.mounted(el, { value: 'write:posts', modifiers: {} });
      expect(el.style.display).toBe('');
    });

    it('disables elements instead of hiding when .disable modifier is set', () => {
      permissionDirective.mounted(el, { value: 'delete:posts', modifiers: { disable: true } });
      expect(el.setAttribute).toHaveBeenCalledWith('disabled', 'true');
      expect(el.classList.add).toHaveBeenCalledWith('disabled');
      expect(el.style.display).toBe('');
    });

    it('negates logic when .negate modifier is set', () => {
      permissionDirective.mounted(el, { value: 'delete:posts', modifiers: { negate: true } });
      expect(el.style.display).toBe('');
    });

    it('hides elements when role check fails', () => {
      roleDirective.mounted(el, { value: 'admin', modifiers: {} });
      expect(el.style.display).toBe('none');
    });

    it('shows elements when role check passes', () => {
      roleDirective.mounted(el, { value: 'editor', modifiers: {} });
      expect(el.style.display).toBe('');
    });
  });
});
