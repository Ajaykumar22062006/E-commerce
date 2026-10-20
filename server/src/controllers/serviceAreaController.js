import pool from '../config/db.js';

export async function checkPincodeServiceability(req, res, next) {
  try {
    const { pincode } = req.params;

    if (!pincode || pincode.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A valid 6-digit postal PIN code is required.'
      });
    }

    const [rows] = await pool.query(
      'SELECT postal_code, area_name, city, state, is_serviceable, estimated_days, heavy_vehicle_allowed, standard_shipping_fee, free_delivery_threshold FROM delivery_service_areas WHERE postal_code = ?',
      [pincode.trim()]
    );

    if (rows.length === 0 || rows[0].is_serviceable === 0) {
      return res.json({
        success: true,
        serviceable: false,
        message: `Currently, PIN code ${pincode} is outside our direct construction logistics corridor. For large bulk orders, please submit a bulk enquiry to arrange custom site logistics.`,
        data: null
      });
    }

    const area = rows[0];

    res.json({
      success: true,
      serviceable: true,
      message: `Direct site delivery available in ${area.area_name}, ${area.city}.`,
      data: {
        postal_code: area.postal_code,
        area_name: area.area_name,
        city: area.city,
        state: area.state,
        estimated_days: area.estimated_days,
        heavy_vehicle_allowed: Boolean(area.heavy_vehicle_allowed),
        standard_shipping_fee: parseFloat(area.standard_shipping_fee),
        free_delivery_threshold: parseFloat(area.free_delivery_threshold)
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function listServiceAreas(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM delivery_service_areas WHERE is_serviceable = 1 ORDER BY state ASC, city ASC'
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}
