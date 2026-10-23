import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../../db/database.js';
import { signJwtToken, verifyJwtToken, createRateLimiter } from '../../config/security.js';

export const oauthRouter = Router();

// Rate limiter: 60 requests per minute on token and authorize endpoints
const oauthRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  message: 'Too many OAuth requests. Please try again later.',
});

interface RegisteredClient {
  clientId: string;
  clientName: string;
  allowedRedirectUris: string[];
  allowedScopes: string[];
  requirePkce: boolean;
}

// Registered OAuth 2.1 Clients Registry (prevents open redirects and unauthorized client token issuance)
const REGISTERED_CLIENTS: Record<string, RegisteredClient> = {
  'taskpilot-alexa-simulator': {
    clientId: 'taskpilot-alexa-simulator',
    clientName: 'TaskPilot Alexa-Style Web Simulator',
    allowedRedirectUris: [
      'http://localhost:5173/oauth/callback',
      'http://127.0.0.1:5173/oauth/callback',
      'http://localhost:5000/oauth/callback',
      'http://localhost:5000/oauth/test-callback',
    ],
    allowedScopes: ['mcp:read', 'mcp:write', 'tasks', 'reminders'],
    requirePkce: true,
  },
  'taskpilot-web-client': {
    clientId: 'taskpilot-web-client',
    clientName: 'TaskPilot AI Web Application',
    allowedRedirectUris: [
      'http://localhost:5173/oauth/callback',
      'http://127.0.0.1:5173/oauth/callback',
    ],
    allowedScopes: ['mcp:read', 'mcp:write', 'tasks', 'reminders'],
    requirePkce: true,
  },
  'claude-desktop': {
    clientId: 'claude-desktop',
    clientName: 'Claude Desktop MCP Client',
    allowedRedirectUris: [
      'http://localhost:3000/callback',
      'http://127.0.0.1:3000/callback',
      'https://claude.ai/oauth/callback',
    ],
    allowedScopes: ['mcp:read', 'mcp:write'],
    requirePkce: true,
  },
  'alexa-skill-client': {
    clientId: 'alexa-skill-client',
    clientName: 'Amazon Alexa Skill Account Linking',
    allowedRedirectUris: [
      'https://layla.amazon.com/api/skill/link',
      'https://pitangui.amazon.com/api/skill/link',
      'https://alexa.amazon.co.jp/api/skill/link',
    ],
    allowedScopes: ['mcp:read', 'mcp:write', 'tasks', 'reminders'],
    requirePkce: true,
  },
};

interface AuthCodeEntry {
  code: string;
  userId: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  scope: string;
  resource?: string;
  expiresAt: number;
}

// In-memory authorization codes with short 5-minute TTL
const authCodes = new Map<string, AuthCodeEntry>();

// Clean up expired authorization codes periodically
setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of authCodes.entries()) {
    if (entry.expiresAt < now) {
      authCodes.delete(code);
    }
  }
}, 60000).unref();

/**
 * Authenticates user for OAuth requests.
 * Extracts and verifies JWT from Bearer header or ?token= query parameter.
 * NEVER defaults to selecting the first database user.
 */
function getAuthenticatedUser(req: Request): { id: string; email: string } | null {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return null;
  }

  try {
    const decoded = verifyJwtToken<{ userId?: string; id?: string; email: string }>(token);
    const uid = decoded?.userId || decoded?.id;
    return uid ? { id: uid, email: decoded.email } : null;
  } catch (err) {
    return null;
  }
}

/**
 * Helper to check if a redirect_uri is allowed for a registered client.
 * Also permits loopback ports on 127.0.0.1 / localhost as specified in RFC 8252 section 7.3.
 */
function isRedirectUriAllowed(client: RegisteredClient, redirectUri: string): boolean {
  try {
    const requested = new URL(redirectUri);

    for (const allowed of client.allowedRedirectUris) {
      const allowedUrl = new URL(allowed);
      if (
        requested.protocol === allowedUrl.protocol &&
        requested.hostname === allowedUrl.hostname &&
        requested.pathname === allowedUrl.pathname
      ) {
        // For localhost/127.0.0.1, dynamic ports are permitted by RFC 8252
        if (requested.hostname === 'localhost' || requested.hostname === '127.0.0.1') {
          return true;
        }
        if (requested.port === allowedUrl.port) {
          return true;
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * GET /.well-known/oauth-authorization-server
 * RFC 8414 OAuth 2.0 Authorization Server Metadata
 */
oauthRouter.get('/.well-known/oauth-authorization-server', (req: Request, res: Response) => {
  const host = req.get('host') || 'localhost:5000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;

  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    jwks_uri: `${baseUrl}/oauth/jwks`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
    scopes_supported: ['mcp:read', 'mcp:write', 'tasks', 'reminders'],
    resource_indicators_supported: true,
  });
});

/**
 * GET /oauth/authorize
 * OAuth 2.1 Authorization Code Flow with PKCE (S256)
 * Enforces: client registration, redirect_uri validation, user authentication, and S256 PKCE.
 */
oauthRouter.get('/authorize', oauthRateLimiter, (req: Request, res: Response) => {
  const {
    response_type,
    client_id,
    redirect_uri,
    scope = 'mcp:read mcp:write',
    state,
    code_challenge,
    code_challenge_method,
    resource,
  } = req.query;

  // 1. Validate response_type
  if (response_type !== 'code') {
    res.status(400).json({ error: 'unsupported_response_type', error_description: 'response_type must be "code"' });
    return;
  }

  // 2. Validate client_id against registered clients
  if (!client_id || typeof client_id !== 'string') {
    res.status(400).json({ error: 'invalid_request', error_description: 'client_id is required' });
    return;
  }

  const client = REGISTERED_CLIENTS[client_id];
  if (!client) {
    res.status(400).json({
      error: 'unauthorized_client',
      error_description: `Client '${client_id}' is not registered with this authorization server.`,
    });
    return;
  }

  // 3. Validate redirect_uri to prevent Open Redirect vulnerabilities
  if (!redirect_uri || typeof redirect_uri !== 'string') {
    res.status(400).json({ error: 'invalid_request', error_description: 'redirect_uri is required' });
    return;
  }

  if (!isRedirectUriAllowed(client, redirect_uri)) {
    res.status(400).json({
      error: 'invalid_request',
      error_description: 'The specified redirect_uri is not authorized for this client.',
    });
    return;
  }

  // 4. Validate PKCE S256 parameters (RFC 7636)
  if (!code_challenge || typeof code_challenge !== 'string') {
    res.status(400).json({
      error: 'invalid_request',
      error_description: 'code_challenge is required by OAuth 2.1 PKCE specification',
    });
    return;
  }

  if (code_challenge.length < 43 || code_challenge.length > 128) {
    res.status(400).json({
      error: 'invalid_request',
      error_description: 'code_challenge must be between 43 and 128 characters.',
    });
    return;
  }

  if (code_challenge_method !== 'S256') {
    res.status(400).json({
      error: 'invalid_request',
      error_description: 'code_challenge_method must be "S256"',
    });
    return;
  }

  // 5. Enforce real user authentication: never issue codes for unauthenticated users!
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({
      error: 'login_required',
      error_description: 'User must be authenticated to authorize access. Provide a valid Bearer token or ?token= query parameter.',
    });
    return;
  }

  // 6. Generate cryptographically secure authorization code (5-minute TTL)
  const code = crypto.randomBytes(32).toString('hex');
  authCodes.set(code, {
    code,
    userId: user.id,
    clientId: client_id,
    redirectUri: redirect_uri,
    codeChallenge: code_challenge,
    codeChallengeMethod: 'S256',
    scope: String(scope),
    resource: resource ? String(resource) : undefined,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', code);
  if (state) {
    redirectUrl.searchParams.set('state', String(state));
  }

  res.redirect(redirectUrl.toString());
});

/**
 * POST /oauth/token
 * Exchange authorization code + code_verifier for JWT access token
 * Enforces: single-use code invalidation, PKCE S256 verification, client binding, redirect_uri matching.
 */
oauthRouter.post('/token', oauthRateLimiter, (req: Request, res: Response) => {
  const { grant_type, code, redirect_uri, client_id, code_verifier, resource } = req.body;

  if (grant_type !== 'authorization_code') {
    res.status(400).json({
      error: 'unsupported_grant_type',
      error_description: 'grant_type must be "authorization_code"',
    });
    return;
  }

  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'invalid_request', error_description: 'code is required' });
    return;
  }

  if (!code_verifier || typeof code_verifier !== 'string') {
    res.status(400).json({
      error: 'invalid_request',
      error_description: 'code_verifier is required for PKCE validation',
    });
    return;
  }

  const entry = authCodes.get(code);
  if (!entry) {
    res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Authorization code is invalid or has expired',
    });
    return;
  }

  // Crucial Security: Immediately invalidate authorization code (single use)
  authCodes.delete(code);

  // Check code expiration
  if (entry.expiresAt < Date.now()) {
    res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Authorization code has expired',
    });
    return;
  }

  // Validate client binding
  if (client_id && entry.clientId !== client_id) {
    res.status(400).json({
      error: 'invalid_grant',
      error_description: 'client_id does not match authorization code request',
    });
    return;
  }

  // Validate redirect_uri matching
  if (redirect_uri && entry.redirectUri !== redirect_uri) {
    res.status(400).json({
      error: 'invalid_grant',
      error_description: 'redirect_uri does not match original authorization request',
    });
    return;
  }

  // Verify PKCE: SHA-256(code_verifier) base64url encoded must equal codeChallenge
  const calculatedChallenge = crypto
    .createHash('sha256')
    .update(code_verifier)
    .digest('base64url');

  if (calculatedChallenge !== entry.codeChallenge) {
    res.status(400).json({
      error: 'invalid_grant',
      error_description: 'PKCE verification failed: code_verifier does not match code_challenge',
    });
    return;
  }

  // Retrieve user record
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(entry.userId) as any;
  if (!user) {
    res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Associated user account no longer exists',
    });
    return;
  }

  // Issue standard TaskPilot JWT token with explicit HS256 algorithm and issuer
  const accessToken = signJwtToken(
    {
      userId: entry.userId,
      email: user.email,
      scope: entry.scope,
      client_id: entry.clientId,
      resource: entry.resource || resource,
    },
    { expiresIn: '24h' }
  );

  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 86400,
    scope: entry.scope,
  });
});
