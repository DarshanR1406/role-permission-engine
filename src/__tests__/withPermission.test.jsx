/**
 * @fileoverview Integration tests for the `withPermission` HOC.
 *
 * Tests cover:
 * - Renders the wrapped component with forwarded props when authorized.
 * - Renders fallback (default: null) when access is denied.
 * - Renders loadingComponent while auth state is resolving.
 * - negate option — inverts the check (show when denied).
 * - roleLogic / permissionLogic — AND ("all") operator functionality.
 * - Preserves displayName for debugging and React DevTools.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PermissionProvider } from '../context/PermissionContext';
import { withPermission } from '../components/withPermission';

// A simple test component to wrap
function TargetComponent({ title, subtitle = 'Default Subtitle' }) {
  return (
    <div data-testid="target">
      <h1 data-testid="title">{title}</h1>
      <p data-testid="subtitle">{subtitle}</p>
    </div>
  );
}
TargetComponent.displayName = 'TargetComponent';

describe('withPermission HOC', () => {
  it('preserves the display name', () => {
    const ProtectedComponent = withPermission(TargetComponent, { roles: ['admin'] });
    expect(ProtectedComponent.displayName).toBe('withPermission(TargetComponent)');
  });

  it('falls back to component name if displayName is absent', () => {
    function SimpleComponent() {
      return <div>Simple</div>;
    }
    const ProtectedComponent = withPermission(SimpleComponent, { roles: ['admin'] });
    expect(ProtectedComponent.displayName).toBe('withPermission(SimpleComponent)');
  });

  it('renders wrapped component with forwarded props when user has required role', () => {
    const ProtectedComponent = withPermission(TargetComponent, {
      roles: ['admin'],
    });

    render(
      <PermissionProvider roles={['admin']} isAuthenticated={true}>
        <ProtectedComponent title="Hello Admin" subtitle="Props are forwarded" />
      </PermissionProvider>
    );

    expect(screen.getByTestId('target')).toBeInTheDocument();
    expect(screen.getByTestId('title')).toHaveTextContent('Hello Admin');
    expect(screen.getByTestId('subtitle')).toHaveTextContent('Props are forwarded');
  });

  it('renders fallback when user lacks required role', () => {
    const ProtectedComponent = withPermission(TargetComponent, {
      roles: ['admin'],
      fallback: <div data-testid="fallback">Access Denied</div>,
    });

    render(
      <PermissionProvider roles={['viewer']} isAuthenticated={true}>
        <ProtectedComponent title="Protected Title" />
      </PermissionProvider>
    );

    expect(screen.queryByTestId('target')).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('renders null by default when access is denied and no fallback is provided', () => {
    const ProtectedComponent = withPermission(TargetComponent, {
      roles: ['admin'],
    });

    const { container } = render(
      <PermissionProvider roles={['viewer']} isAuthenticated={true}>
        <ProtectedComponent title="Protected Title" />
      </PermissionProvider>
    );

    expect(screen.queryByTestId('target')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('renders loadingComponent while auth state is loading', () => {
    const ProtectedComponent = withPermission(TargetComponent, {
      roles: ['admin'],
      loadingComponent: <div data-testid="loading">Checking credentials...</div>,
    });

    render(
      <PermissionProvider roles={['admin']} isAuthenticated={true} isLoading={true}>
        <ProtectedComponent title="Dashboard" />
      </PermissionProvider>
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.queryByTestId('target')).not.toBeInTheDocument();
  });

  describe('negate option', () => {
    it('renders wrapped component when negate=true and user does NOT have the role', () => {
      const GuestComponent = withPermission(TargetComponent, {
        roles: ['admin', 'user'],
        negate: true,
      });

      render(
        <PermissionProvider roles={[]} isAuthenticated={false}>
          <GuestComponent title="Guest View" />
        </PermissionProvider>
      );

      expect(screen.getByTestId('target')).toBeInTheDocument();
      expect(screen.getByTestId('title')).toHaveTextContent('Guest View');
    });

    it('hides wrapped component when negate=true and user DOES have the role', () => {
      const GuestComponent = withPermission(TargetComponent, {
        roles: ['admin'],
        negate: true,
        fallback: <div data-testid="fallback">Hidden for Admins</div>,
      });

      render(
        <PermissionProvider roles={['admin']} isAuthenticated={true}>
          <GuestComponent title="Guest View" />
        </PermissionProvider>
      );

      expect(screen.queryByTestId('target')).not.toBeInTheDocument();
      expect(screen.getByTestId('fallback')).toBeInTheDocument();
    });
  });

  describe('logic operators', () => {
    it('renders component when permissionLogic is "all" and user has all permissions', () => {
      const MultiPermComponent = withPermission(TargetComponent, {
        permissions: ['read:users', 'write:users'],
        permissionLogic: 'all',
      });

      render(
        <PermissionProvider
          permissions={['read:users', 'write:users']}
          isAuthenticated={true}
        >
          <MultiPermComponent title="Manage Users" />
        </PermissionProvider>
      );

      expect(screen.getByTestId('target')).toBeInTheDocument();
    });

    it('denies component when permissionLogic is "all" and user is missing a permission', () => {
      const MultiPermComponent = withPermission(TargetComponent, {
        permissions: ['read:users', 'write:users'],
        permissionLogic: 'all',
        fallback: <div data-testid="fallback">Missing full permissions</div>,
      });

      render(
        <PermissionProvider permissions={['read:users']} isAuthenticated={true}>
          <MultiPermComponent title="Manage Users" />
        </PermissionProvider>
      );

      expect(screen.queryByTestId('target')).not.toBeInTheDocument();
      expect(screen.getByTestId('fallback')).toBeInTheDocument();
    });
  });
});
