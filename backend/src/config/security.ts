import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const DEV_FALLBACK_SECRET = 'taskpilot-dev-jwt-secret-do-not-use-in-prod-32-chars-long';
const JWT_ISSUER = 'taskpilot-ai';

/**
 * Validates and retrieves the JWT secret.
 * Enforces production safety: fails immediately if missing or insecure in production.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === 'production';

  if (!secret) {
    if (isProd) {
      throw new Error(
        'FATAL SECURITY ERROR: JWT_SECRET environment variable is missing in production! Server cannot start.'
      );
    }
    return DEV_FALLBACK_SECRET;
  }

  if (isProd && secret.length < 32) {
    throw new Error(
      'FATAL SECURITY ERROR: JWT_SECRET must be at least 32 characters in production. Server cannot start.'
    );
  }

  return secret;
}

/**
 * Signs a JWT with explicit HS256 algorithm and issuer
 */
export function signJwtToken(
  payload: string | object | Buffer,
  options?: jwt.SignOptions
): string {
  const secret = getJwtSecret();
  const signOptions: jwt.SignOptions = {
    algorithm: 'HS256',
    issuer: JWT_ISSUER,
    expiresIn: '24h',
    ...options,
  };
  return jwt.sign(payload, secret, signOptions);
}

/**
 * Verifies a JWT with explicit HS256 algorithm and issuer
 */
export function verifyJwtToken<T = any>(token: string, options?: jwt.VerifyOptions): T {
  const secret = getJwtSecret();
  const verifyOptions: jwt.VerifyOptions = {
    algorithms: ['HS256'],
    issuer: JWT_ISSUER,
    ...options,
  };
  return jwt.verify(token, secret, verifyOptions) as T;
}

/**
 * Configurable CORS origin allowlist
 */
export function getAllowedOrigins(): string[] {
  const configured = process.env.ALLOWED_ORIGINS;
  if (configured) {
    return configured.split(',').map((o) => o.trim()).filter(Boolean);
  }
  return [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    process.env.FRONTEND_URL || '',
  ].filter(Boolean);
}

/**
 * Security headers middleware
 */
export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

/**
 * In-memory sliding-window rate limiter for sensitive authentication endpoints
 */
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function createRateLimiter(options: { windowMs: number; maxRequests: number; message?: string }) {
  const { windowMs, maxRequests, message = 'Too many requests. Please try again later.' } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // In test environment, skip rate limiting to avoid test interference
    if (process.env.NODE_ENV === 'test') {
      next();
      return;
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const key = `${req.baseUrl || req.path}:${clientIp}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);

    if (!record || record.resetAt <= now) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    record.count++;
    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      res.status(429).json({ error: message, retryAfterSeconds: retryAfter });
      return;
    }

    next();
  };
}

// Clean up stale rate limits every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();
