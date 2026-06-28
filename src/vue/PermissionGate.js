/**
 * @fileoverview `PermissionGate` component for Vue — inline conditional rendering.
 *
 * Shows/hides slots based on user's roles and permissions.
 */

import { defineComponent } from 'vue';
import { usePermission } from './usePermission';

export const PermissionGate = defineComponent({
  name: 'PermissionGate',
  props: {
    roles: {
      type: Array,
      default: () => [],
    },
    permissions: {
      type: Array,
      default: () => [],
    },
    roleLogic: {
      type: String,
      default: 'any',
    },
    permissionLogic: {
      type: String,
      default: 'any',
    },
    negate: {
      type: Boolean,
      default: false,
    },
    asyncCheck: {
      type: Function,
      default: null,
    },
  },
  setup(props, { slots }) {
    const { allowed, isLoading } = usePermission({
      roles: props.roles,
      permissions: props.permissions,
      roleLogic: props.roleLogic,
      permissionLogic: props.permissionLogic,
      asyncCheck: props.asyncCheck,
    });

    return () => {
      if (isLoading.value) {
        return slots.loading ? slots.loading() : null;
      }

      const shouldRender = props.negate ? !allowed.value : allowed.value;
      if (shouldRender) {
        return slots.default ? slots.default() : null;
      }

      return slots.fallback ? slots.fallback() : null;
    };
  },
});

export default PermissionGate;
