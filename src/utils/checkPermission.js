/**
 * @fileoverview Core permission-checking utility functions.
 *
 * These are pure, framework-agnostic functions that form the heart of
 * the role-permission-engine. They have zero side effects and can be
 * used independently of any React component.
 *
 * @module utils/checkPermission
 */

// ─── Type Definitions ────────────────────────────────────────────────────────

/**
 * The logical operator used when evaluating multiple roles or permissions.
 *
 * - `"any"` – The user must satisfy **at least one** of the required items (OR logic).
 * - `"all"` – The user must satisfy **every** required item (AND logic).
 *
 * @typedef {"any" | "all"} LogicOperator
 */

/**
 * A single role string, e.g. `"admin"`, `"editor"`, `"viewer"`.
 *
 * @typedef {string} Role
 */

/**
 * A single permission string, typically in `"action:resource"` format,
 * e.g. `"read:users"`, `"write:posts"`, `"delete:*"`.
 *
 * @typedef {string} Permission
 */

/**
 * The result returned by permission-check functions.
 *
 * @typedef {Object} PermissionResult
 * @property {boolean} allowed  - Whether the user is allowed access.
 * @property {string}  reason   - A human-readable explanation of the result.
 */

// ─── Role Checking ────────────────────────────────────────────────────────────

/**
 * Checks whether a user's roles satisfy the required roles using
 * the specified logic operator.
 *
 * This is a **pure utility** — it accepts any string as a role.
 * You define what roles mean in your own application. Examples:
 * `"admin"`, `"manager"`, `"superuser"`, `"read-only"`, `"tenant-owner"`, etc.
 *
 * @param {string[]} userRoles
 *   Array of role strings currently assigned to the user.
 *   - Comparison is **case-insensitive** and **trims whitespace**.
 *   - Example: `['Admin', ' editor ']` is treated as `['admin', 'editor']`.
 *   - Pass an empty array `[]` when the user has no roles.
 *
 * @param {string[]} requiredRoles
 *   Array of role strings required to pass this check.
 *   - If this array is **empty** (`[]`) or not provided, the check
 *     is skipped and `allowed: true` is returned immediately.
 *   - Example: `['admin', 'superuser']`
 *
 * @param {"any" | "all"} [logic="any"]
 *   Controls how multiple `requiredRoles` are evaluated.
 *
 *   | Value   | Alias | Behaviour                                           | Example                                      |
 *   |---------|-------|-----------------------------------------------------|----------------------------------------------|
 *   | `"any"` | OR    | User needs **at least one** of the required roles   | `required: ['admin','editor']` → admin **or** editor is enough |
 *   | `"all"` | AND   | User needs **every single** required role           | `required: ['admin','editor']` → must have **both** |
 *
 *   **Default:** `"any"` (OR logic).
 *
 *   ```js
 *   // Default — no third argument needed for OR logic
 *   hasRole(['editor'], ['admin', 'editor']);
 *   // same as:
 *   hasRole(['editor'], ['admin', 'editor'], 'any');
 *   ```
 *
 * @returns {PermissionResult}
 *   `{ allowed: boolean, reason: string }`
 *
 * @example <caption>OR logic (default) — user has at least one required role</caption>
 * hasRole(['editor'], ['admin', 'editor']);
 * // => { allowed: true, reason: 'User has at least one required role.' }
 *
 * @example <caption>OR logic — user has none of the required roles</caption>
 * hasRole(['viewer'], ['admin', 'editor'], 'any');
 * // => { allowed: false, reason: 'User does not have any of the required roles: admin, editor' }
 *
 * @example <caption>AND logic — user must have every required role</caption>
 * hasRole(['admin', 'editor'], ['admin', 'editor'], 'all');
 * // => { allowed: true, reason: 'User has all required roles.' }
 *
 * @example <caption>AND logic — user is missing one role</caption>
 * hasRole(['editor'], ['admin', 'editor'], 'all');
 * // => { allowed: false, reason: 'User is missing required roles: admin' }
 *
 * @example <caption>Empty required roles — always allowed</caption>
 * hasRole([], []);
 * // => { allowed: true, reason: 'No roles required — access granted.' }
 */
export function hasRole(userRoles, requiredRoles, logic = "any") {
  if (!Array.isArray(requiredRoles) || requiredRoles.length === 0) {
    return { allowed: true, reason: "No roles required — access granted." };
  }

  if (!Array.isArray(userRoles) || userRoles.length === 0) {
    return { allowed: false, reason: "User has no roles assigned." };
  }

  const normalizedUser = userRoles.map((r) => r.toLowerCase().trim());
  const normalizedRequired = requiredRoles.map((r) => r.toLowerCase().trim());

  if (logic === "all") {
    const missing = normalizedRequired.filter(
      (r) => !normalizedUser.includes(r),
    );
    if (missing.length > 0) {
      return {
        allowed: false,
        reason: `User is missing required roles: ${missing.join(", ")}`,
      };
    }
    return { allowed: true, reason: "User has all required roles." };
  }

  // Default: "any" (OR logic)
  const matched = normalizedRequired.filter((r) => normalizedUser.includes(r));
  if (matched.length === 0) {
    return {
      allowed: false,
      reason: `User does not have any of the required roles: ${normalizedRequired.join(", ")}`,
    };
  }
  return { allowed: true, reason: "User has at least one required role." };
}

// ─── Permission Checking ──────────────────────────────────────────────────────

/**
 * Checks whether a user's permissions satisfy the required permissions
 * using the specified logic operator. Supports wildcard `"*"` permissions.
 *
 * This is a **pure utility** — it accepts any string as a permission.
 * You define what permissions mean in your own application. A common
 * convention is `"action:resource"` format (e.g. `"read:invoices"`,
 * `"export:reports"`, `"delete:accounts"`), but any string works.
 *
 * **Wildcard rules:**
 * | User permission | Matches                                      |
 * |-----------------|----------------------------------------------|
 * | `"*"`           | Every possible permission — full super-access |
 * | `"read:*"`      | Any permission starting with `"read:"`        |
 * | `"write:posts"` | Only `"write:posts"` exactly                 |
 *
 * @param {string[]} userPermissions
 *   Array of permission strings the user currently holds.
 *   - Comparison is **case-insensitive** and **trims whitespace**.
 *   - Pass `['*']` to grant superuser access to all checks.
 *   - Pass an empty array `[]` when the user has no permissions.
 *
 * @param {string[]} requiredPermissions
 *   Array of permission strings required to pass this check.
 *   - If this array is **empty** (`[]`) or not provided, the check
 *     is skipped and `allowed: true` is returned immediately.
 *
 * @param {"any" | "all"} [logic="any"]
 *   Controls how multiple `requiredPermissions` are evaluated.
 *
 *   | Value   | Alias | Behaviour                                                 | Example                                              |
 *   |---------|-------|-----------------------------------------------------------|------------------------------------------------------|
 *   | `"any"` | OR    | User needs **at least one** of the required permissions   | `required: ['read:x','write:x']` → read **or** write is enough |
 *   | `"all"` | AND   | User needs **every single** required permission           | `required: ['read:x','write:x']` → must have **both** |
 *
 *   **Default:** `"any"` (OR logic).
 *
 *   ```js
 *   // Default — OR logic, no third argument needed
 *   hasPermission(['read:reports'], ['read:reports', 'write:reports']);
 *   // same as:
 *   hasPermission(['read:reports'], ['read:reports', 'write:reports'], 'any');
 *   ```
 *
 * @returns {PermissionResult}
 *   `{ allowed: boolean, reason: string }`
 *
 * @example <caption>OR logic (default) — user has one of the required permissions</caption>
 * hasPermission(['read:invoices'], ['read:invoices', 'write:invoices']);
 * // => { allowed: true, reason: 'User has at least one required permission.' }
 *
 * @example <caption>OR logic — user has none</caption>
 * hasPermission(['read:posts'], ['write:posts', 'delete:posts'], 'any');
 * // => { allowed: false, reason: 'User does not have any of the required permissions: ...' }
 *
 * @example <caption>AND logic — must have all required permissions</caption>
 * hasPermission(['read:users', 'write:users'], ['read:users', 'write:users'], 'all');
 * // => { allowed: true, reason: 'User has all required permissions.' }
 *
 * @example <caption>Full wildcard — grants everything</caption>
 * hasPermission(['*'], ['read:users', 'delete:posts'], 'all');
 * // => { allowed: true, reason: 'User has wildcard permission (*) — full access granted.' }
 *
 * @example <caption>Namespace wildcard — "read:*" satisfies any "read:" permission</caption>
 * hasPermission(['read:*'], ['read:invoices', 'read:reports'], 'all');
 * // => { allowed: true, reason: 'User has all required permissions.' }
 */
export function hasPermission(
  userPermissions,
  requiredPermissions,
  logic = "any",
) {
  if (!Array.isArray(requiredPermissions) || requiredPermissions.length === 0) {
    return {
      allowed: true,
      reason: 'No permissions required — access granted.',
    };
  }

  if (!Array.isArray(userPermissions) || userPermissions.length === 0) {
    return { allowed: false, reason: 'User has no permissions assigned.' };
  }


  const normalizedUser = userPermissions.map((p) => p.toLowerCase().trim());
  const normalizedRequired = requiredPermissions.map((p) =>
    p.toLowerCase().trim(),
  );

  // Full wildcard check
  if (normalizedUser.includes("*")) {
    return {
      allowed: true,
      reason: "User has wildcard permission (*) — full access granted.",
    };
  }

  /**
   * Checks if a single required permission is satisfied by the user's permission set,
   * including namespace wildcard matching (e.g. "read:*" matches "read:users").
   *
   * @param {string} required - The required permission to satisfy.
   * @returns {boolean} Whether the user satisfies this specific permission.
   */
  function isSatisfied(required) {
    if (normalizedUser.includes(required)) return true;

    // Namespace wildcard: "read:*" should satisfy "read:users"
    const [requiredNamespace] = required.split(":");
    return normalizedUser.includes(`${requiredNamespace}:*`);
  }

  if (logic === "all") {
    const missing = normalizedRequired.filter((p) => !isSatisfied(p));
    if (missing.length > 0) {
      return {
        allowed: false,
        reason: `User is missing required permissions: ${missing.join(", ")}`,
      };
    }
    return { allowed: true, reason: "User has all required permissions." };
  }

  // Default: "any" (OR logic)
  const matched = normalizedRequired.filter((p) => isSatisfied(p));
  if (matched.length === 0) {
    return {
      allowed: false,
      reason: `User does not have any of the required permissions: ${normalizedRequired.join(", ")}`,
    };
  }
  return {
    allowed: true,
    reason: "User has at least one required permission.",
  };
}

// ─── Combined Check ───────────────────────────────────────────────────────────

/**
 * Performs a **combined** role AND permission check in a single call.
 *
 * Both the role check and the permission check must independently pass
 * for `allowed` to be `true`. If a constraint array is empty or not
 * provided, that constraint is automatically satisfied (open access).
 *
 * @param {Object} options
 *
 * @param {string[]} [options.userRoles=[]]
 *   The roles currently held by the user. Any strings are accepted;
 *   you define what roles mean in your app.
 *
 * @param {string[]} [options.userPermissions=[]]
 *   The permissions currently held by the user. Supports wildcards:
 *   `"*"` (all access) and `"namespace:*"` (all in namespace).
 *
 * @param {string[]} [options.requiredRoles=[]]
 *   Roles the user must have to pass the role check.
 *   Pass `[]` (default) to skip the role check entirely.
 *
 * @param {string[]} [options.requiredPermissions=[]]
 *   Permissions the user must have to pass the permission check.
 *   Pass `[]` (default) to skip the permission check entirely.
 *
 * @param {"any" | "all"} [options.roleLogic="any"]
 *   Controls how `requiredRoles` are evaluated.
 *
 *   | Value   | Behaviour                                        | Default? |
 *   |---------|--------------------------------------------------|----------|
 *   | `"any"` | User needs **at least one** required role (OR)   | ✅ Yes   |
 *   | `"all"` | User needs **every** required role (AND)         | No       |
 *
 *   ```js
 *   // 'any' is the default — no need to specify it explicitly for OR logic
 *   checkAccess({ requiredRoles: ['admin', 'editor'], roleLogic: 'any' });
 *   ```
 *
 * @param {"any" | "all"} [options.permissionLogic="any"]
 *   Controls how `requiredPermissions` are evaluated.
 *
 *   | Value   | Behaviour                                             | Default? |
 *   |---------|-------------------------------------------------------|----------|
 *   | `"any"` | User needs **at least one** required permission (OR)  | ✅ Yes   |
 *   | `"all"` | User needs **every** required permission (AND)        | No       |
 *
 *   ```js
 *   // Require the user to have ALL listed permissions (AND logic)
 *   checkAccess({
 *     requiredPermissions: ['read:report', 'export:report'],
 *     permissionLogic: 'all',
 *   });
 *   ```
 *
 * @returns {PermissionResult}
 *   `{ allowed: boolean, reason: string }` — `allowed` is `true` only
 *   when **both** role and permission checks pass.
 *
 * @example <caption>Combined check — OR role logic + OR permission logic (both defaults)</caption>
 * checkAccess({
 *   userRoles: ['editor'],
 *   userPermissions: ['write:posts'],
 *   requiredRoles: ['editor', 'admin'],      // editor OR admin
 *   requiredPermissions: ['write:posts'],    // write:posts required
 * });
 * // => { allowed: true, reason: 'Access granted.' }
 *
 * @example <caption>AND logic for permissions — user must have ALL listed permissions</caption>
 * checkAccess({
 *   userRoles: ['manager'],
 *   userPermissions: ['approve:leaves'],
 *   requiredRoles: ['manager'],
 *   requiredPermissions: ['approve:leaves', 'view:team'],
 *   permissionLogic: 'all',   // must have BOTH permissions
 * });
 * // => { allowed: false, reason: 'User is missing required permissions: view:team' }
 *
 * @example <caption>No constraints — always allowed</caption>
 * checkAccess({ userRoles: ['guest'], userPermissions: [] });
 * // => { allowed: true, reason: 'Access granted.' }
 */
export function checkAccess({
  userRoles = [],
  userPermissions = [],
  requiredRoles = [],
  requiredPermissions = [],
  roleLogic = "any",
  permissionLogic = "any",
}) {
  const roleResult = hasRole(userRoles, requiredRoles, roleLogic);
  if (!roleResult.allowed) return roleResult;

  const permResult = hasPermission(
    userPermissions,
    requiredPermissions,
    permissionLogic,
  );
  if (!permResult.allowed) return permResult;

  return { allowed: true, reason: "Access granted." };
}
