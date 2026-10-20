import pool from '../config/db.js';

export async function validateCoupon(req, res, next) {
  try {
    const { code, subtotal } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: 'Coupon code is required.' });
    }

    const orderSubtotal = parseFloat(subtotal) || 0;

    const [rows] = await pool.query(
      `SELECT * FROM coupons 
       WHERE code = ? AND is_active = 1 AND valid_from <= NOW() AND valid_until >= NOW()`,
      [code.trim().toUpperCase()]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired promotional coupon code.'
      });
    }

    const coupon = rows[0];

    // Check usage limit
    if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
      return res.status(400).json({
        success: false,
        message: 'This coupon has reached its maximum redemptions.'
      });
    }

    // Check minimum order amount
    if (orderSubtotal < parseFloat(coupon.min_order_amount)) {
      return res.status(400).json({
        success: false,
        message: `This coupon requires a minimum subtotal of ₹${coupon.min_order_amount}. Your current subtotal is ₹${orderSubtotal.toFixed(2)}.`
      });
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = (orderSubtotal * parseFloat(coupon.discount_value)) / 100;
      if (coupon.max_discount_amount) {
        discountAmount = Math.min(discountAmount, parseFloat(coupon.max_discount_amount));
      }
    } else {
      discountAmount = Math.min(parseFloat(coupon.discount_value), orderSubtotal);
    }

    discountAmount = parseFloat(discountAmount.toFixed(2));

    res.json({
      success: true,
      message: `Coupon ${coupon.code} applied successfully!`,
      data: {
        coupon_id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discount_amount: discountAmount,
        discount_type: coupon.discount_type,
        discount_value: parseFloat(coupon.discount_value)
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getActiveCoupons(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, code, description, discount_type, discount_value, min_order_amount, max_discount_amount, valid_until
       FROM coupons 
       WHERE is_active = 1 AND valid_from <= NOW() AND valid_until >= NOW()
       ORDER BY discount_value DESC`
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}
