import {
  PolicyEngine,
  exportPolicy,
  importPolicy,
  validatePolicy,
  evaluatePolicy,
  resolveInheritedRoles,
  getPermissionsFromRoles,
  evaluateCondition,
} from '../utils/policy';

describe('PolicyEngine & Policy Utilities', () => {

  // ─── 1. Validation ─────────────────────────────────────────────────────────

  describe('validatePolicy()', () => {
    it('validates a correct policy configuration', () => {
      const validPolicy = {
        version: '1.0',
        name: 'Test Policy',
        roles: {
          admin: { inherits: ['editor'], permissions: ['*'] },
          editor: { permissions: ['write:posts', 'read:posts'] },
        },
        rules: [
          {
            id: 'rule-1',
            effect: 'allow',
            priority: 10,
            roles: ['editor'],
            target: { resource: 'posts', action: 'read' },
          },
        ],
      };

      const result = validatePolicy(validPolicy);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects invalid JSON string', () => {
      const result = validatePolicy('{ malformed json ');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Invalid JSON string/);
    });

    it('warns when version is missing', () => {
      const result = validatePolicy({ roles: {}, rules: [] });
      expect(result.valid).toBe(true);
      expect(result.warnings[0]).toMatch(/version/);
    });

    it('flags non-string version as error', () => {
      const result = validatePolicy({ version: 123 });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/version.*must be a string/);
    });

    it('detects circular role inheritance', () => {
      const circularPolicy = {
        version: '1.0',
        roles: {
          roleA: { inherits: ['roleB'] },
          roleB: { inherits: ['roleC'] },
          roleC: { inherits: ['roleA'] },
        },
      };

      const result = validatePolicy(circularPolicy);
      expect(result.valid).toBe(false);
      expect(result.errors.some((err) => err.includes('Circular role inheritance detected'))).toBe(true);
    });

    it('detects duplicate rule IDs', () => {
      const duplicatePolicy = {
        version: '1.0',
        rules: [
          { id: 'rule-1', effect: 'allow' },
          { id: 'rule-1', effect: 'deny' },
        ],
      };

      const result = validatePolicy(duplicatePolicy);
      expect(result.valid).toBe(false);
      expect(result.errors.some((err) => err.includes('Duplicate rule ID detected'))).toBe(true);
    });

    it('detects invalid rule effect', () => {
      const invalidEffectPolicy = {
        version: '1.0',
        rules: [
          { id: 'rule-1', effect: 'grant' },
        ],
      };

      const result = validatePolicy(invalidEffectPolicy);
      expect(result.valid).toBe(false);
      expect(result.errors.some((err) => err.includes('effect must be either "allow" or "deny"'))).toBe(true);
    });
  });

  // ─── 2. Export & Import ────────────────────────────────────────────────────

  describe('exportPolicy() & importPolicy()', () => {
    const samplePolicy = {
      version: '1.0',
      name: 'Corporate Access Policy',
      description: 'Export import test policy',
      roles: {
        admin: { inherits: ['manager'], permissions: ['*'] },
        manager: { permissions: ['read:reports', 'write:reports'] },
      },
      rules: [
        {
          id: 'rule-view-reports',
          name: 'View Reports',
          effect: 'allow',
          roles: ['manager'],
          target: { resource: 'reports', action: 'read' },
        },
      ],
    };

    it('exports policy object to formatted JSON string', () => {
      const jsonString = exportPolicy(samplePolicy, { pretty: true });
      expect(typeof jsonString).toBe('string');

      const parsed = JSON.parse(jsonString);
      expect(parsed.version).toBe('1.0');
      expect(parsed.name).toBe('Corporate Access Policy');
      expect(parsed.rules).toHaveLength(1);
    });

    it('exports policy to plain JavaScript object when stringify is false', () => {
      const plainObject = exportPolicy(samplePolicy, { stringify: false });
      expect(typeof plainObject).toBe('object');
      expect(plainObject.name).toBe('Corporate Access Policy');
    });

    it('throws error when exporting invalid policy with validate: true', () => {
      const invalidPolicy = { version: '1.0', rules: [{ id: 'rule-1', effect: 'invalid' }] };
      expect(() => exportPolicy(invalidPolicy, { validate: true })).toThrow(/Cannot export invalid policy/);
    });

    it('imports policy from JSON string into PolicyEngine instance', () => {
      const jsonString = JSON.stringify(samplePolicy);
      const engine = importPolicy(jsonString);

      expect(engine).toBeInstanceOf(PolicyEngine);
      expect(engine.name).toBe('Corporate Access Policy');
      expect(engine.rules).toHaveLength(1);
    });

    it('throws error when importing invalid JSON in strict mode', () => {
      expect(() => importPolicy('{ broken ', { strict: true })).toThrow(/Failed to parse policy JSON/);
    });

    it('performs clean export -> import -> export roundtrip', () => {
      const engine1 = importPolicy(samplePolicy);
      const jsonOut = engine1.export();
      const engine2 = PolicyEngine.fromJSON(jsonOut);

      expect(engine2.toJSON()).toEqual(engine1.toJSON());
    });
  });

  // ─── 3. Role Inheritance & Permissions ─────────────────────────────────────

  describe('resolveInheritedRoles & getPermissionsFromRoles', () => {
    const rolesConfig = {
      admin: { inherits: ['editor'], permissions: ['admin:all'] },
      editor: { inherits: ['viewer'], permissions: ['edit:content'] },
      viewer: { permissions: ['read:content'] },
    };

    it('resolves multi-level inherited roles recursively', () => {
      const effectiveRoles = resolveInheritedRoles(['admin'], rolesConfig);
      expect(Array.from(effectiveRoles)).toEqual(['admin', 'editor', 'viewer']);
    });

    it('aggregates permissions from inherited roles', () => {
      const roles = ['admin'];
      const effectiveRoles = resolveInheritedRoles(roles, rolesConfig);
      const permissions = getPermissionsFromRoles(effectiveRoles, rolesConfig);

      expect(Array.from(permissions)).toEqual(['admin:all', 'edit:content', 'read:content']);
    });
  });

  // ─── 4. Condition Evaluation (ABAC) ────────────────────────────────────────

  describe('evaluateCondition()', () => {
    const userContext = {
      department: 'Finance',
      level: 4,
      tags: ['vip', 'audit'],
      user: {
        location: {
          country: 'US',
        },
      },
    };

    it('evaluates equals operator', () => {
      expect(evaluateCondition({ field: 'department', operator: 'equals', value: 'Finance' }, userContext)).toBe(true);
      expect(evaluateCondition({ field: 'department', operator: 'equals', value: 'HR' }, userContext)).toBe(false);
    });

    it('evaluates nested property path', () => {
      expect(evaluateCondition({ field: 'user.location.country', operator: 'equals', value: 'US' }, userContext)).toBe(true);
    });

    it('evaluates in / notIn operator', () => {
      expect(evaluateCondition({ field: 'department', operator: 'in', value: ['Finance', 'Legal'] }, userContext)).toBe(true);
      expect(evaluateCondition({ field: 'department', operator: 'notIn', value: ['Engineering'] }, userContext)).toBe(true);
    });

    it('evaluates numeric comparisons (gt, gte, lt, lte)', () => {
      expect(evaluateCondition({ field: 'level', operator: 'gt', value: 3 }, userContext)).toBe(true);
      expect(evaluateCondition({ field: 'level', operator: 'gte', value: 4 }, userContext)).toBe(true);
      expect(evaluateCondition({ field: 'level', operator: 'lt', value: 10 }, userContext)).toBe(true);
      expect(evaluateCondition({ field: 'level', operator: 'lte', value: 4 }, userContext)).toBe(true);
    });

    it('evaluates contains operator', () => {
      expect(evaluateCondition({ field: 'tags', operator: 'contains', value: 'vip' }, userContext)).toBe(true);
      expect(evaluateCondition({ field: 'department', operator: 'contains', value: 'Fin' }, userContext)).toBe(true);
    });
  });

  // ─── 5. Dynamic Rule Evaluation ────────────────────────────────────────────

  describe('evaluatePolicy() & PolicyEngine.prototype.evaluate()', () => {
    const complexPolicy = {
      version: '1.0',
      name: 'Enterprise Security Policy',
      roles: {
        admin: { inherits: ['editor'], permissions: ['*'] },
        editor: { inherits: ['viewer'], permissions: ['write:documents'] },
        viewer: { permissions: ['read:documents'] },
      },
      rules: [
        {
          id: 'rule-deny-restricted',
          name: 'Block Restricted Documents',
          effect: 'deny',
          priority: 100,
          target: { resource: 'documents', action: 'read' },
          conditions: { field: 'document.classification', operator: 'equals', value: 'RESTRICTED' },
        },
        {
          id: 'rule-allow-editor-write',
          name: 'Editor Write Access',
          effect: 'allow',
          priority: 50,
          roles: ['editor'],
          permissions: ['write:documents'],
          target: { resource: 'documents', action: 'write' },
        },
        {
          id: 'rule-allow-viewer-read',
          name: 'Viewer Read Access',
          effect: 'allow',
          priority: 10,
          roles: ['viewer'],
          target: { resource: 'documents', action: 'read' },
        },
      ],
    };

    it('allows access when role, target, and permission match', () => {
      const result = evaluatePolicy(complexPolicy, {
        userRoles: ['editor'],
        userPermissions: ['write:documents'],
        target: { resource: 'documents', action: 'write' },
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toMatch(/Access granted by policy rule "Editor Write Access"/);
    });

    it('enforces deny overrides when deny rule with high priority matches', () => {
      const result = evaluatePolicy(complexPolicy, {
        userRoles: ['admin'],
        userPermissions: ['*'],
        userContext: {
          document: { classification: 'RESTRICTED' },
        },
        target: { resource: 'documents', action: 'read' },
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/Access denied by policy rule "Block Restricted Documents"/);
    });

    it('supports wildcard target matching for routes', () => {
      const routePolicy = {
        version: '1.0',
        rules: [
          {
            id: 'rule-api-wildcard',
            effect: 'allow',
            roles: ['admin'],
            target: { route: '/api/v1/admin/*' },
          },
        ],
      };

      const result = evaluatePolicy(routePolicy, {
        userRoles: ['admin'],
        target: { route: '/api/v1/admin/users' },
      });

      expect(result.allowed).toBe(true);
    });

    it('returns false when no rules match context', () => {
      const result = evaluatePolicy(complexPolicy, {
        userRoles: ['guest'],
        target: { resource: 'billing', action: 'delete' },
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/No policy rules matched/);
    });
  });
});
