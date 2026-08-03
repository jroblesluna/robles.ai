import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import db from './db.js';

// Extend Express Request to include adminUser
declare global {
  namespace Express {
    interface Request {
      adminUser?: {
        userId: number;
        email: string;
      };
    }
  }
}

interface JwtPayload {
  userId: number;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Retrieves the JWT secret from the ADMIN_JWT_SECRET env var,
 * or generates one and stores it in the settings table.
 */
export function getJwtSecret(): string {
  const envSecret = process.env.ADMIN_JWT_SECRET;
  if (envSecret) {
    return envSecret;
  }

  // Try to read from the settings table
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('jwt_secret') as
    | { value: string }
    | undefined;

  if (row?.value) {
    return row.value;
  }

  // Generate a new secret and store it
  const newSecret = crypto.randomBytes(64).toString('hex');
  const now = new Date().toISOString();
  db.prepare(
    'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
  ).run('jwt_secret', newSecret, now);

  return newSecret;
}

/**
 * Generates a JWT token with 7-day expiry.
 */
export function generateToken(userId: number, email: string): string {
  const secret = getJwtSecret();
  return jwt.sign({ userId, email }, secret, { expiresIn: '7d' });
}

/**
 * Verifies a JWT token and returns the decoded payload.
 * Throws if the token is invalid or expired.
 */
export function verifyToken(token: string): JwtPayload {
  const secret = getJwtSecret();
  return jwt.verify(token, secret) as JwtPayload;
}

/**
 * Express middleware that requires a valid admin JWT.
 * Reads the `admin_token` cookie, verifies the JWT, and attaches
 * the decoded user info to `req.adminUser`.
 * Returns 401 Unauthorized if the token is missing or invalid.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.admin_token;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.adminUser = { userId: payload.userId, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
