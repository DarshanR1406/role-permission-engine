/**
 * @fileoverview Custom directives `v-permission` and `v-role` for Vue 3.
 *
 * Directives let you easily toggle visibility or disable inputs directly in templates:
 *
 * ```html
 * <button v-permission="'write:posts'">Create Post</button>
 * <button v-permission.disable="'delete:posts'">Delete Post</button>
 * <div v-role.negate="'admin'">Visible to non-admins</div>
 * ```
 */

import { watchEffect } from 'vue';
import { getActiveState } from './PermissionPlugin';
import { hasPermission, hasRole } from '../utils/checkPermission';

/**
 * Normalizes directive binding value into an object with values array and logic operator.
 */
function normalizeBinding(bindingValue) {
  if (typeof bindingValue === 'string') {
    return { values: [bindingValue], logic: 'any' };
  }
  if (Array.isArray(bindingValue)) {
    return { values: bindingValue, logic: 'any' };
  }
  if (bindingValue && typeof bindingValue === 'object') {
    const values = Array.isArray(bindingValue.values)
      ? bindingValue.values
      : [bindingValue.value || bindingValue.values];
    return {
      values: values.filter(Boolean),
      logic: bindingValue.logic || 'any',
    };
  }
  return { values: [], logic: 'any' };
}

/**
 * Toggles visibility or disabled attribute on element based on access check result.
 */
function applyAccess(el, binding, allowed) {
  const negate = binding.modifiers.negate;
  const shouldShow = negate ? !allowed : allowed;

  if (binding.modifiers.disable) {
    if (!shouldShow) {
      el.setAttribute('disabled', 'true');
      el.classList.add('disabled');
    } else {
      el.removeAttribute('disabled');
      el.classList.remove('disabled');
    }
  } else {
    if (!shouldShow) {
      el.style.display = 'none';
    } else {
      el.style.display = '';
    }
  }
}

/**
 * Custom Vue directive for permission checks.
 * Usage: `v-permission="'write:posts'"`
 */
export const permissionDirective = {
  mounted(el, binding) {
    const state = getActiveState();
    if (!state) {
      console.warn(
        '[role-permission-engine] PermissionPlugin has not been registered. v-permission directive skipped.'
      );
      return;
    }

    el._permissionCleanup = watchEffect(() => {
      if (state.isLoading) {
        // While loading, hide/disable elements
        applyAccess(el, binding, false);
        return;
      }
      const { values, logic } = normalizeBinding(binding.value);
      const result = hasPermission(state.permissions, values, logic);
      applyAccess(el, binding, result.allowed);
    });
  },
  unmounted(el) {
    if (el._permissionCleanup) {
      el._permissionCleanup();
    }
  },
};

/**
 * Custom Vue directive for role checks.
 * Usage: `v-role="'admin'"`
 */
export const roleDirective = {
  mounted(el, binding) {
    const state = getActiveState();
    if (!state) {
      console.warn(
        '[role-permission-engine] PermissionPlugin has not been registered. v-role directive skipped.'
      );
      return;
    }

    el._roleCleanup = watchEffect(() => {
      if (state.isLoading) {
        // While loading, hide/disable elements
        applyAccess(el, binding, false);
        return;
      }
      const { values, logic } = normalizeBinding(binding.value);
      const result = hasRole(state.roles, values, logic);
      applyAccess(el, binding, result.allowed);
    });
  },
  unmounted(el) {
    if (el._roleCleanup) {
      el._roleCleanup();
    }
  },
};
export default {
  permission: permissionDirective,
  role: roleDirective,
};
