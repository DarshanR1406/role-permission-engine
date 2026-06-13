import { createMiddleware } from '../middleware/next';
import { NextResponse } from 'next/server';

// Mock next/server as a virtual module since it is not installed locally
jest.mock('next/server', () => {
  return {
    NextResponse: {
      next: jest.fn().mockReturnValue({ nextCalled: true }),
      redirect: jest.fn().mockImplementation((url) => ({ redirectCalled: true, url })),
    },
  };
}, { virtual: true });

class MockURL {
  constructor(pathname) {
    this.pathname = pathname;
    this.searchParams = {
      params: {},
      set(key, value) {
        this.params[key] = value;
      },
    };
  }
  clone() {
    const cloned = new MockURL(this.pathname);
    cloned.searchParams.params = { ...this.searchParams.params };
    return cloned;
  }
}

function createMockRequest(pathname) {
  return {
    nextUrl: new MockURL(pathname),
    url: `https://example.com${pathname}`,
  };
}

describe('Next.js Middleware Guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if getUser is not provided', () => {
    expect(() => {
      createMiddleware({ rules: [] });
    }).toThrow('[role-permission-engine] createMiddleware requires a "getUser" function');
  });

  it('should allow access (calls NextResponse.next) if no rules match the path', async () => {
    const getUser = jest.fn().mockResolvedValue({ roles: ['user'], permissions: [] });
    const middleware = createMiddleware({
      rules: [
        { path: '/admin', roles: ['admin'] }
      ],
      getUser,
    });

    const request = createMockRequest('/public/home');
    const result = await middleware(request);

    expect(result).toEqual({ nextCalled: true });
    expect(NextResponse.next).toHaveBeenCalledTimes(1);
    expect(getUser).not.toHaveBeenCalled();
  });

  it('should redirect to default login URL when user is unauthenticated (getUser returns null)', async () => {
    const getUser = jest.fn().mockResolvedValue(null);
    const middleware = createMiddleware({
      rules: [
        { path: '/dashboard', roles: ['user'] }
      ],
      getUser,
    });

    const request = createMockRequest('/dashboard/profile');
    const result = await middleware(request);

    expect(getUser).toHaveBeenCalledTimes(1);
    expect(NextResponse.redirect).toHaveBeenCalledTimes(1);
    expect(result.redirectCalled).toBe(true);
    expect(result.url.pathname).toBe('/login');
    expect(result.url.searchParams.params).toEqual({ redirectTo: '/dashboard/profile' });
  });

  it('should call custom onUnauthenticated callback if user is unauthenticated', async () => {
    const getUser = jest.fn().mockResolvedValue(null);
    const onUnauthenticated = jest.fn().mockResolvedValue({ customUnauthenticated: true });
    const middleware = createMiddleware({
      rules: [
        { path: '/dashboard', roles: ['user'] }
      ],
      getUser,
      onUnauthenticated,
    });

    const request = createMockRequest('/dashboard');
    const result = await middleware(request);

    expect(getUser).toHaveBeenCalledTimes(1);
    expect(onUnauthenticated).toHaveBeenCalledWith(request);
    expect(result).toEqual({ customUnauthenticated: true });
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('should redirect to unauthorized URL if user is authenticated but unauthorized', async () => {
    const getUser = jest.fn().mockResolvedValue({ roles: ['editor'], permissions: [] });
    const middleware = createMiddleware({
      rules: [
        { path: '/admin', roles: ['admin'] }
      ],
      getUser,
      unauthorizedUrl: '/custom-forbidden',
    });

    const request = createMockRequest('/admin/users');
    const result = await middleware(request);

    expect(NextResponse.redirect).toHaveBeenCalledTimes(1);
    expect(result.redirectCalled).toBe(true);
    expect(result.url.pathname).toBe('/custom-forbidden');
  });

  it('should call custom onUnauthorized callback with request and reason if unauthorized', async () => {
    const getUser = jest.fn().mockResolvedValue({ roles: ['editor'], permissions: [] });
    const onUnauthorized = jest.fn().mockResolvedValue({ customUnauthorized: true });
    const middleware = createMiddleware({
      rules: [
        { path: '/admin', roles: ['admin'] }
      ],
      getUser,
      onUnauthorized,
    });

    const request = createMockRequest('/admin');
    const result = await middleware(request);

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledWith(
      request,
      'User does not have any of the required roles: admin'
    );
    expect(result).toEqual({ customUnauthorized: true });
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('should allow access if user is authorized', async () => {
    const getUser = jest.fn().mockResolvedValue({ roles: ['admin'], permissions: ['write:all'] });
    const middleware = createMiddleware({
      rules: [
        { path: '/admin', roles: ['admin'], permissions: ['write:all'] }
      ],
      getUser,
    });

    const request = createMockRequest('/admin/settings');
    const result = await middleware(request);

    expect(NextResponse.next).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ nextCalled: true });
  });

  it('should support RegExp path matching', async () => {
    const getUser = jest.fn().mockResolvedValue({ roles: ['user'], permissions: [] });
    const middleware = createMiddleware({
      rules: [
        { path: /^\/posts\/\d+$/, roles: ['admin'] }
      ],
      getUser,
    });

    // Match route
    const request1 = createMockRequest('/posts/123');
    const result1 = await middleware(request1);
    expect(result1.redirectCalled).toBe(true); // admin required, but user has 'user'

    // Reset calls
    jest.clearAllMocks();

    // Do not match route
    const request2 = createMockRequest('/posts/new');
    const result2 = await middleware(request2);
    expect(result2).toEqual({ nextCalled: true }); // rule doesn't match /posts/new, so allowed
  });

  it('should support custom function path matching', async () => {
    const getUser = jest.fn().mockResolvedValue({ roles: ['user'] });
    const middleware = createMiddleware({
      rules: [
        {
          path: (pathname) => pathname.includes('secure'),
          roles: ['admin'],
        }
      ],
      getUser,
    });

    const request = createMockRequest('/some/secure/page');
    const result = await middleware(request);
    expect(result.redirectCalled).toBe(true);
  });

  it('should fall back to false if the rule path is an unsupported type', async () => {
    const getUser = jest.fn().mockResolvedValue({ roles: ['user'] });
    const middleware = createMiddleware({
      rules: [
        {
          path: null, // unsupported type
          roles: ['admin'],
        }
      ],
      getUser,
    });

    const request = createMockRequest('/admin');
    const result = await middleware(request);
    // Should skip the rule since it doesn't match and call next()
    expect(result).toEqual({ nextCalled: true });
    expect(NextResponse.next).toHaveBeenCalledTimes(1);
  });

  it('should catch errors thrown in getUser, log them, and treat as unauthenticated', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const getUser = jest.fn().mockRejectedValue(new Error('DB connection failed'));
    const middleware = createMiddleware({
      rules: [
        { path: '/admin', roles: ['admin'] }
      ],
      getUser,
    });

    const request = createMockRequest('/admin');
    const result = await middleware(request);

    expect(getUser).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(result.redirectCalled).toBe(true);
    expect(result.url.pathname).toBe('/login');

    consoleErrorSpy.mockRestore();
  });
});
