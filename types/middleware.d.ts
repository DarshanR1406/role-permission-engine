import { Role, Permission, LogicOperator } from './index';

/**
 * A routing rule definition for the Next.js middleware guard.
 */
export interface RouteRule {
  /**
   * The path pattern to match. Can be a string prefix (starts with),
   * a regular expression, or a custom matching function.
   */
  path: string | RegExp | ((pathname: string) => boolean);

  /**
   * Required roles list.
   */
  roles?: Role[];

  /**
   * Required permissions list.
   */
  permissions?: Permission[];

  /**
   * Logical operator for evaluating multiple roles. Defaults to "any".
   */
  roleLogic?: LogicOperator;

  /**
   * Logical operator for evaluating multiple permissions. Defaults to "any".
   */
  permissionLogic?: LogicOperator;
}

/**
 * Options configuration for the `createMiddleware` factory.
 */
export interface CreateMiddlewareOptions {
  /**
   * Array of route check rules. The first matching rule will be evaluated.
   */
  rules?: RouteRule[];

  /**
   * A function that extracts the current user's roles and permissions from the Request object.
   * Can be synchronous or asynchronous. Should return null/undefined if user is not authenticated.
   */
  getUser: (
    request: any
  ) =>
    | { roles?: Role[]; permissions?: Permission[] }
    | null
    | undefined
    | Promise<{ roles?: Role[]; permissions?: Permission[] } | null | undefined>;

  /**
   * The path to redirect unauthenticated users to. Defaults to "/login".
   */
  loginUrl?: string;

  /**
   * The path to redirect unauthorized users to. Defaults to "/unauthorized".
   */
  unauthorizedUrl?: string;

  /**
   * Optional custom callback to handle unauthenticated users. If provided,
   * it overrides the default redirect behaviour.
   */
  onUnauthenticated?: (request: any) => any | Promise<any>;

  /**
   * Optional custom callback to handle unauthorized users. If provided,
   * it overrides the default redirect behaviour and receives the audit reason string.
   */
  onUnauthorized?: (request: any, reason: string) => any | Promise<any>;
}

/**
 * Next.js App Router Middleware factory.
 * Creates a Next.js middleware that enforces roles and permissions on routes.
 *
 * @param options - Configuration options for the middleware.
 * @returns A Next.js middleware function.
 */
export function createMiddleware(
  options: CreateMiddlewareOptions
): (request: any) => Promise<any>;
