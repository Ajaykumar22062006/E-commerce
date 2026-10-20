import pool from '../config/db.js';

export async function getAddresses(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [req.user.id]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}

export async function addAddress(req, res, next) {
  try {
    const {
      label = 'Site / Home',
      recipient_name,
      phone,
      address_line1,
      address_line2,
      landmark,
      city,
      state,
      postal_code,
      is_default = 0
    } = req.body;

    if (!recipient_name || !phone || !address_line1 || !city || !state || !postal_code) {
      return res.status(400).json({
        success: false,
        message: 'Recipient name, phone, address line 1, city, state, and pincode are required.'
      });
    }

    // Check pincode serviceability info
    const [serviceRows] = await pool.query(
      'SELECT is_serviceable, area_name, estimated_days FROM delivery_service_areas WHERE postal_code = ?',
      [postal_code.trim()]
    );

    const isServiceable = serviceRows.length > 0 && serviceRows[0].is_serviceable === 1;

    // If setting as default, unset others first
    if (is_default) {
      await pool.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
    } else {
      // If user has zero addresses, make this default
      const [existing] = await pool.query('SELECT count(*) as cnt FROM addresses WHERE user_id = ?', [req.user.id]);
      if (existing[0].cnt === 0) {
        req.body.is_default = 1;
      }
    }

    const [result] = await pool.query(
      `INSERT INTO addresses (user_id, label, recipient_name, phone, address_line1, address_line2, landmark, city, state, postal_code, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        label,
        recipient_name.trim(),
        phone.trim(),
        address_line1.trim(),
        address_line2 ? address_line2.trim() : null,
        landmark ? landmark.trim() : null,
        city.trim(),
        state.trim(),
        postal_code.trim(),
        req.body.is_default ? 1 : 0
      ]
    );

    const [created] = await pool.query('SELECT * FROM addresses WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Address saved successfully.',
      data: {
        ...created[0],
        is_serviceable: isServiceable,
        service_area_info: serviceRows[0] || null
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAddress(req, res, next) {
  try {
    const { id } = req.params;
    const {
      label,
      recipient_name,
      phone,
      address_line1,
      address_line2,
      landmark,
      city,
      state,
      postal_code,
      is_default
    } = req.body;

    const [existing] = await pool.query('SELECT id FROM addresses WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Address not found.' });
    }

    if (is_default) {
      await pool.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
    }

    await pool.query(
      `UPDATE addresses SET 
        label = COALESCE(?, label),
        recipient_name = COALESCE(?, recipient_name),
        phone = COALESCE(?, phone),
        address_line1 = COALESCE(?, address_line1),
        address_line2 = COALESCE(?, address_line2),
        landmark = COALESCE(?, landmark),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        postal_code = COALESCE(?, postal_code),
        is_default = COALESCE(?, is_default)
       WHERE id = ? AND user_id = ?`,
      [label, recipient_name, phone, address_line1, address_line2, landmark, city, state, postal_code, is_default, id, req.user.id]
    );

    const [updated] = await pool.query('SELECT * FROM addresses WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Address updated.',
      data: updated[0]
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAddress(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM addresses WHERE id = ? AND user_id = ?', [id, req.user.id]);

    res.json({
      success: true,
      message: 'Address deleted.'
    });
  } catch (error) {
    next(error);
  }
}

export async function setDefaultAddress(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
    await pool.query('UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?', [id, req.user.id]);

    res.json({
      success: true,
      message: 'Default address updated.'
    });
  } catch (error) {
    next(error);
  }
}
