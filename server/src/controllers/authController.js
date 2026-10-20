import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/db.js';
import { generateToken } from '../utils/jwt.js';
import logger from '../utils/logger.js';

// In-memory or database password reset token store
const resetTokens = new Map(); // token -> { userId, expiresAt }

export async function register(req, res, next) {
  try {
    const { full_name, email, password, phone, role = 'customer', company_name, gstin } = req.body;

    // Check if email already registered
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Allowed customer registration roles: customer, contractor, builder (never admin through public API)
    const validRole = ['contractor', 'builder'].includes(role) ? role : 'customer';

    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, phone, role, company_name, gstin)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [full_name.trim(), email.toLowerCase().trim(), password_hash, phone || null, validRole, company_name || null, gstin || null]
    );

    const userId = result.insertId;

    // Create an empty cart for the newly registered user
    await pool.query('INSERT IGNORE INTO carts (user_id) VALUES (?)', [userId]);

    logger.audit('USER_REGISTERED', email, { userId, role: validRole });

    const userObj = {
      id: userId,
      full_name: full_name.trim(),
      email: email.toLowerCase().trim(),
      role: validRole,
      phone: phone || null,
      company_name: company_name || null,
      gstin: gstin || null
    };

    const token = generateToken({ userId: userObj.id, role: userObj.role });

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: {
        user: userObj,
        token
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const [users] = await pool.query(
      'SELECT id, full_name, email, password_hash, role, phone, company_name, gstin, is_active FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact BuildMart support.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Ensure cart exists
    await pool.query('INSERT IGNORE INTO carts (user_id) VALUES (?)', [user.id]);

    logger.audit('USER_LOGIN', user.email, { userId: user.id, role: user.role });

    const token = generateToken({ userId: user.id, role: user.role });

    const userResponse = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      company_name: user.company_name,
      gstin: user.gstin
    };

    res.json({
      success: true,
      message: 'Logged in successfully.',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req, res, next) {
  try {
    const [userRows] = await pool.query(
      'SELECT id, full_name, email, role, phone, company_name, gstin, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const [addresses] = await pool.query(
      'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [req.user.id]
    );

    const [orderCountRow] = await pool.query(
      'SELECT COUNT(*) as total_orders FROM orders WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        user: userRows[0],
        addresses,
        totalOrders: orderCountRow[0].total_orders
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { full_name, phone, company_name, gstin } = req.body;

    await pool.query(
      `UPDATE users SET full_name = ?, phone = ?, company_name = ?, gstin = ? WHERE id = ?`,
      [full_name, phone || null, company_name || null, gstin || null, req.user.id]
    );

    const [updated] = await pool.query(
      'SELECT id, full_name, email, role, phone, company_name, gstin FROM users WHERE id = ?',
      [req.user.id]
    );

    logger.audit('USER_PROFILE_UPDATED', req.user.email, { userId: req.user.id });

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user: updated[0] }
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;

    const [users] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(current_password, users[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match.' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

    logger.audit('USER_PASSWORD_CHANGED', req.user.email, { userId: req.user.id });

    res.json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error) {
    next(error);
  }
}

export async function requestPasswordReset(req, res, next) {
  try {
    const { email } = req.body;
    const [users] = await pool.query('SELECT id, email FROM users WHERE email = ?', [email.toLowerCase().trim()]);

    if (users.length === 0) {
      // Don't leak user existence
      return res.json({
        success: true,
        message: 'If the email exists in our records, a password reset link has been dispatched.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 3600000; // 1 hour

    resetTokens.set(resetToken, { userId: users[0].id, expiresAt });

    logger.info(`Password reset requested for ${email}. Token: ${resetToken}`);

    res.json({
      success: true,
      message: 'If the email exists in our records, a password reset link has been dispatched.',
      // In development mode, return token to ease testing
      ...(process.env.NODE_ENV === 'development' && { devResetToken: resetToken })
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, new_password } = req.body;

    const entry = resetTokens.get(token);
    if (!entry || entry.expiresAt < Date.now()) {
      resetTokens.delete(token);
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token.'
      });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, entry.userId]);

    resetTokens.delete(token);
    logger.audit('USER_PASSWORD_RESET', `User#${entry.userId}`);

    res.json({
      success: true,
      message: 'Password has been reset successfully. You may now log in with your new credentials.'
    });
  } catch (error) {
    next(error);
  }
}
