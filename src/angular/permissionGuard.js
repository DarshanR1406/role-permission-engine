/**
 * @fileoverview Angular functional route guard `permissionGuard`.
 *
 * Use this guard to protect routes inside your Angular router configuration:
 *
 * ```ts
 * import { permissionGuard } from 'role-permission-engine/angular';
 *
 * const routes: Routes = [
 *   {
 *     path: 'admin',
 *     component: AdminComponent,
 *     canActivate: [
 *       permissionGuard({
 *         roles: ['admin'],
 *         redirectTo: '/unauthorized',
 *       })
 *     ]
 *   }
 * ];
 * ```
 */

import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { PermissionService } from './PermissionService';

/**
 * Functional route guard for role and permission authorization.
 *
 * @param {Object} options
 * @param {string[]} [options.roles=[]]
 * @param {string[]} [options.permissions=[]]
 * @param {"any"|"all"} [options.roleLogic="any"]
 * @param {"any"|"all"} [options.permissionLogic="any"]
 * @param {string} [options.redirectTo]
 *
 * @returns {import('@angular/router').CanActivateFn}
 */
export function permissionGuard(options = {}) {
  return () => {
    const service = inject(PermissionService);
    const router = inject(Router);

    const roles = options.roles || [];
    const permissions = options.permissions || [];
    const roleLogic = options.roleLogic || 'any';
    const permissionLogic = options.permissionLogic || 'any';
    const redirectTo = options.redirectTo;

    const accessSignal = service.hasAccess({
      roles,
      permissions,
      roleLogic,
      permissionLogic,
    });

    // If still resolving auth state, return a Promise that waits until loading is complete
    if (service.isLoading()) {
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          if (!service.isLoading()) {
            clearInterval(interval);
            const isAllowed = accessSignal();
            if (!isAllowed && redirectTo) {
              resolve(router.parseUrl(redirectTo));
            } else {
              resolve(isAllowed);
            }
          }
        }, 30);
      });
    }

    const isAllowed = accessSignal();

    if (!isAllowed) {
      if (redirectTo) {
        return router.parseUrl(redirectTo);
      }
      return false;
    }

    return true;
  };
}

export default permissionGuard;
