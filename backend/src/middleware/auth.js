import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { ApiError } from './errorHandler.js';
import { query } from '../config/database.js';

/**
 * Extract token from Authorization header
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

/**
 * Verify JWT token and attach user to request
 */
export async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new ApiError(401, 'Authentication required');
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);

    // Get user from database
    const result = await query(
      'SELECT id, username, email, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(401, 'User not found');
    }

    // Attach user to request
    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err instanceof ApiError) {
      next(err);
    } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      next(err);
    } else {
      next(new ApiError(401, 'Authentication failed'));
    }
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, config.jwtSecret);

    const result = await query(
      'SELECT id, username, email, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    req.user = result.rows.length > 0 ? result.rows[0] : null;
    next();
  } catch {
    req.user = null;
    next();
  }
}

/**
 * Require admin role
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required'));
  }

  if (req.user.role !== 'admin') {
    return next(new ApiError(403, 'Admin access required'));
  }

  next();
}

/**
 * Generate JWT tokens
 */
export function generateTokens(userId) {
  const accessToken = jwt.sign(
    { userId },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    config.jwtSecret,
    { expiresIn: config.jwtRefreshExpiresIn }
  );

  return { accessToken, refreshToken };
}

export default { authenticate, optionalAuth, requireAdmin, generateTokens };
