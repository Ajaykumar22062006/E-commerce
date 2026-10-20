import { verifyToken } from '../utils/jwt.js';
import pool from '../config/db.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session token.'
      });
    }

    // Verify user still exists and is active in MySQL
    const [rows] = await pool.query(
      'SELECT id, full_name, email, role, phone, company_name, gstin, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (rows.length === 0 || !rows[0].is_active) {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive or not found.'
      });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication verification failed.',
      error: error.message
    });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Access requires one of the following roles: [${allowedRoles.join(', ')}].`
      });
    }

    next();
  };
}

export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      if (decoded && decoded.userId) {
        const [rows] = await pool.query(
          'SELECT id, full_name, email, role, phone, company_name, gstin, is_active FROM users WHERE id = ?',
          [decoded.userId]
        );
        if (rows.length > 0 && rows[0].is_active) {
          req.user = rows[0];
        }
      }
    }
  } catch (e) {
    // Ignore error in optional auth
  }
  next();
}
