import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import {
  signJwtToken,
  verifyJwtToken,
  getJwtSecret,
  getAllowedOrigins,
} from '../config/security.js';

describe('TaskPilot AI — Cryptographic Security, JWT & CORS Suite', () => {
  it('JWT: signs tokens with HS256 algorithm and taskpilot-ai issuer', () => {
    const token = signJwtToken({ userId: 'user-sec-123', email: 'sec@test.com' });
    assert.ok(token, 'Token must be generated');

    // Decode header without verification to inspect algorithm
    const parts = token.split('.');
    assert.strictEqual(parts.length, 3, 'JWT must have 3 parts');
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    assert.strictEqual(header.alg, 'HS256', 'Algorithm must be strictly HS256');

    // Verify token
    const decoded = verifyJwtToken<{ userId: string; email: string; iss: string }>(token);
    assert.strictEqual(decoded.userId, 'user-sec-123');
    assert.strictEqual(decoded.email, 'sec@test.com');
    assert.strictEqual(decoded.iss, 'taskpilot-ai');
  });

  it('JWT Security: rejects tampered token signatures', () => {
    const token = signJwtToken({ userId: 'legit-user', email: 'legit@test.com' });
    const parts = token.split('.');

    // Tamper with payload (change user to admin)
    const tamperedPayload = Buffer.from(
      JSON.stringify({ userId: 'admin-user', email: 'admin@test.com' })
    ).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    assert.throws(() => {
      verifyJwtToken(tamperedToken);
    }, /invalid signature/);
  });

  it('JWT Security: rejects tokens with invalid or untrusted issuer', () => {
    const secret = getJwtSecret();
    // Manually sign with different issuer
    const untrustedToken = require('jsonwebtoken').sign(
      { userId: 'user-1', email: 'test@test.com' },
      secret,
      { algorithm: 'HS256', issuer: 'untrusted-issuer' }
    );

    assert.throws(() => {
      verifyJwtToken(untrustedToken);
    }, /jwt issuer invalid/);
  });

  it('CORS: restricts origins to configured allowlist', () => {
    const allowed = getAllowedOrigins();
    assert.ok(allowed.includes('http://localhost:5173'), 'Must allow standard frontend port 5173');
    assert.ok(allowed.includes('http://127.0.0.1:5173'), 'Must allow loopback IP frontend');
    assert.strictEqual(allowed.includes('https://evil-hacker.com'), false, 'Must reject unauthorized origins');
  });

  it('PKCE: validates SHA-256 base64url challenge computation', () => {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const expectedChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    // Verify properties
    assert.ok(codeVerifier.length >= 43 && codeVerifier.length <= 128, 'Verifier must satisfy RFC 7636 length');
    assert.ok(!expectedChallenge.includes('+'), 'Must be base64url encoded (no +)');
    assert.ok(!expectedChallenge.includes('/'), 'Must be base64url encoded (no /)');
    assert.ok(!expectedChallenge.includes('='), 'Must be base64url encoded (no =)');
  });
});
