import { NextResponse } from "next/server";
import { checkAccess } from "../utils/checkPermission";

/**
 * Next.js App Router Middleware factory.
 * Creates a Next.js middleware that enforces roles and permissions on routes.
 *
 * @param {Object} options
 * @param {Array<Object>} options.rules - Route rules configuration.
 * @param {string|RegExp|function(string): boolean} options.rules[].path - The path pattern to match.
 * @param {string[]} [options.rules[].roles] - Required roles.
 * @param {string[]} [options.rules[].permissions] - Required permissions.
 * @param {"any" | "all"} [options.rules[].roleLogic="any"] - Role evaluation logic.
 * @param {"any" | "all"} [options.rules[].permissionLogic="any"] - Permission evaluation logic.
 * @param {function(any): {roles: string[], permissions: string[]}|Promise<{roles: string[], permissions: string[]}>} options.getUser - Async function to extract user roles and permissions from Request.
 * @param {string} [options.loginUrl="/login"] - URL to redirect to if the user is unauthenticated.
 * @param {string} [options.unauthorizedUrl="/unauthorized"] - URL to redirect to if the user is unauthorized.
 * @param {function(any): any} [options.onUnauthenticated] - Custom callback when user is unauthenticated.
 * @param {function(any, string): any} [options.onUnauthorized] - Custom callback when user is unauthorized. Receives (request, reason).
 * @returns {function(any): Promise<any>} Next.js middleware function.
 */
export function createMiddleware({
  rules = [],
  getUser,
  loginUrl = "/login",
  unauthorizedUrl = "/unauthorized",
  onUnauthenticated,
  onUnauthorized,
}) {
  if (typeof getUser !== "function") {
    throw new Error(
      '[role-permission-engine] createMiddleware requires a "getUser" function to extract user roles and permissions.',
    );
  }

  return async function middleware(request) {
    const { pathname } = request.nextUrl;

    // 1. Find matching rule(s).
    const matchedRule = rules.find((rule) => {
      if (typeof rule.path === "string") {
        return pathname.startsWith(rule.path);
      }
      if (rule.path instanceof RegExp) {
        return rule.path.test(pathname);
      }
      if (typeof rule.path === "function") {
        return rule.path(pathname);
      }
      return false;
    });

    // If no rule matches, proceed to next middleware/page
    if (!matchedRule) {
      return NextResponse.next();
    }

    // 2. Extract user credentials.
    let user;
    try {
      user = await getUser(request);
    } catch (error) {
      console.error("[role-permission-engine] Error in getUser: ", error);
      user = null;
    }

    // 3. Authenticated check
    if (!user) {
      if (typeof onUnauthenticated === "function") {
        return onUnauthenticated(request);
      }
      const url = request.nextUrl.clone();
      url.pathname = loginUrl;
      // Preserve the current path as a redirect parameter if needed
      url.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(url);
    }

    const { roles = [], permissions = [] } = user;

    // 4. Authorize check
    const { allowed, reason } = checkAccess({
      userRoles: roles,
      userPermissions: permissions,
      requiredRoles: matchedRule.roles || [],
      requiredPermissions: matchedRule.permissions || [],
      roleLogic: matchedRule.roleLogic || "any",
      permissionLogic: matchedRule.permissionLogic || "any",
    });

    if (!allowed) {
      if (typeof onUnauthorized === "function") {
        return onUnauthorized(request, reason);
      }
      const url = request.nextUrl.clone();
      url.pathname = unauthorizedUrl;
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  };
}
