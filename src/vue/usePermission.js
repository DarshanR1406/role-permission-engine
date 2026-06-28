/**
 * @fileoverview `usePermission` composable — Vue composition hook for permission checking.
 *
 * Reads permission state injected by the plugin and returns computed properties.
 */

import { inject, computed, ref, watchEffect } from 'vue';
import { PermissionSymbol } from './PermissionPlugin';
import { checkAccess } from '../utils/checkPermission';

/**
 * Vue Composable for checking roles and permissions reactively.
 *
 * @param {Object} [options={}]
 * @param {string[]} [options.roles=[]]
 * @param {string[]} [options.permissions=[]]
 * @param {"any" | "all"} [options.roleLogic="any"]
 * @param {"any" | "all"} [options.permissionLogic="any"]
 * @param {Function} [options.asyncCheck]
 *
 * @returns {Object} `{ allowed: Ref<boolean>, denied: Ref<boolean>, isLoading: Ref<boolean>, isAuthenticated: Ref<boolean>, reason: Ref<string> }`
 */
export function usePermission(options = {}) {
  const context = inject(PermissionSymbol);
  if (!context) {
    throw new Error(
      '[role-permission-engine] usePermission must be used within an app using createPermissionPlugin.'
    );
  }

  const requiredRoles = options.roles || [];
  const requiredPermissions = options.permissions || [];
  const roleLogic = options.roleLogic || 'any';
  const permissionLogic = options.permissionLogic || 'any';
  const asyncCheck = options.asyncCheck;

  const asyncLoading = ref(!!asyncCheck);
  const asyncAllowed = ref(false);
  const asyncReason = ref('Async check not started.');

  // Standard sync check
  const standardResult = computed(() => {
    if (context.state.isLoading) {
      return { allowed: false, reason: 'Auth state is loading.' };
    }

    const hasRequirements = requiredRoles.length > 0 || requiredPermissions.length > 0;
    if (!hasRequirements) {
      return { allowed: true, reason: 'No constraints specified.' };
    }

    return checkAccess({
      userRoles: context.state.roles,
      userPermissions: context.state.permissions,
      requiredRoles,
      requiredPermissions,
      roleLogic,
      permissionLogic,
    });
  });

  // Watch for changes in standard results or auth state to invoke the async check
  watchEffect(async (onCleanup) => {
    let isCurrent = true;

    if (context.state.isLoading) {
      return;
    }

    if (!standardResult.value.allowed) {
      asyncAllowed.value = false;
      asyncLoading.value = false;
      asyncReason.value = 'Failed standard role/permission check.';
      return;
    }

    if (!asyncCheck) {
      asyncAllowed.value = true;
      asyncLoading.value = false;
      asyncReason.value = 'No async check required.';
      return;
    }

    asyncLoading.value = true;
    asyncReason.value = 'Async check in progress...';

    try {
      const resultOrPromise = asyncCheck({
        roles: context.state.roles,
        permissions: context.state.permissions,
        user: context.state.user,
        isAuthenticated: context.state.isAuthenticated,
      });

      if (
        resultOrPromise instanceof Promise ||
        (resultOrPromise && typeof resultOrPromise.then === 'function')
      ) {
        onCleanup(() => {
          isCurrent = false;
        });
        const res = await resultOrPromise;
        if (!isCurrent) return;
        asyncAllowed.value = !!res;
        asyncLoading.value = false;
        asyncReason.value = res ? 'Async check passed.' : 'Async check failed.';
      } else {
        asyncAllowed.value = !!resultOrPromise;
        asyncLoading.value = false;
        asyncReason.value = resultOrPromise ? 'Async check passed.' : 'Async check failed.';
      }
    } catch (err) {
      if (!isCurrent) return;
      asyncAllowed.value = false;
      asyncLoading.value = false;
      asyncReason.value = `Async check error: ${err?.message || err}`;
    }
  });

  const finalAllowed = computed(() => {
    return (
      !context.state.isLoading &&
      standardResult.value.allowed &&
      (asyncCheck ? asyncAllowed.value : true)
    );
  });

  const finalIsLoading = computed(() => {
    return context.state.isLoading || (!!asyncCheck && asyncLoading.value);
  });

  return {
    allowed: finalAllowed,
    denied: computed(() => !finalAllowed.value),
    isLoading: finalIsLoading,
    isAuthenticated: computed(() => context.state.isAuthenticated),
    reason: computed(() => {
      if (context.state.isLoading) return 'Auth state is loading.';
      if (!standardResult.value.allowed) return standardResult.value.reason;
      if (!!asyncCheck && asyncLoading.value) return asyncReason.value;
      return asyncCheck ? asyncReason.value : standardResult.value.reason;
    }),
  };
}
export default usePermission;
