/**
 * @fileoverview Vue plugin for providing permission state throughout the component tree.
 *
 * Register the plugin at app creation, and update state reactively when the user logs in/out:
 *
 * ```js
 * import { createApp } from 'vue';
 * import { createPermissionPlugin } from 'role-permission-engine/vue';
 * import App from './App.vue';
 *
 * const app = createApp(App);
 * const permissionPlugin = createPermissionPlugin({
 *   roles: ['editor'],
 *   permissions: ['write:posts'],
 *   isAuthenticated: true,
 * });
 * app.use(permissionPlugin);
 * app.mount('#app');
 * ```
 */

import { reactive } from 'vue';

export const PermissionSymbol = Symbol('PermissionContext');

// Store a module-level reference to the active state to support custom directives
let activeState = null;

/**
 * Returns the currently active global permission state.
 * Mainly used inside directives where inject is unavailable.
 *
 * @returns {Object|null}
 */
export function getActiveState() {
  return activeState;
}

/**
 * Creates a Vue plugin instance for permission state management.
 *
 * @param {Object} [initialState={}]
 * @param {string[]} [initialState.roles=[]]
 * @param {string[]} [initialState.permissions=[]]
 * @param {Object|null} [initialState.user=null]
 * @param {boolean} [initialState.isAuthenticated=false]
 * @param {boolean} [initialState.isLoading=false]
 *
 * @returns {Object} Vue plugin object.
 */
export function createPermissionPlugin(initialState = {}) {
  const state = reactive({
    roles: initialState.roles || [],
    permissions: initialState.permissions || [],
    user: initialState.user || null,
    isAuthenticated: initialState.isAuthenticated || false,
    isLoading: initialState.isLoading || false,
  });

  // Set the global reference
  activeState = state;

  const updateState = (newState) => {
    Object.assign(state, newState);
  };

  return {
    install(app) {
      app.provide(PermissionSymbol, { state, updateState });
    },
    updateState,
    state,
  };
}
