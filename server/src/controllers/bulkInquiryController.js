import pool from '../config/db.js';
import crypto from 'crypto';
import logger from '../utils/logger.js';

export async function submitBulkInquiry(req, res, next) {
  try {
    const {
      customer_name,
      email,
      phone,
      company_name,
      product_id,
      estimated_quantity,
      unit_of_measure,
      delivery_pincode,
      project_details
    } = req.body;

    if (!customer_name || !email || !phone || !product_id || !estimated_quantity || !delivery_pincode) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, product, estimated quantity, and delivery PIN code are required.'
      });
    }

    const inquiryNumber = `BM-RFQ-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    const userId = req.user ? req.user.id : null;

    const [result] = await pool.query(
      `INSERT INTO bulk_inquiries (
        inquiry_number, user_id, customer_name, email, phone,
        company_name, product_id, estimated_quantity, unit_of_measure,
        delivery_pincode, project_details, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')`,
      [
        inquiryNumber,
        userId,
        customer_name.trim(),
        email.trim().toLowerCase(),
        phone.trim(),
        company_name ? company_name.trim() : null,
        product_id,
        parseInt(estimated_quantity, 10),
        unit_of_measure || 'units',
        delivery_pincode.trim(),
        project_details ? project_details.trim() : null
      ]
    );

    logger.audit('BULK_INQUIRY_SUBMITTED', email, {
      inquiryNumber,
      productId: product_id,
      quantity: estimated_quantity
    });

    res.status(201).json({
      success: true,
      message: `Your Bulk Quotation Request (${inquiryNumber}) has been received! Our civil logistics team will reach out within 4 business hours.`,
      data: {
        inquiry_id: result.insertId,
        inquiry_number: inquiryNumber
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyBulkInquiries(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT bi.*, p.name AS product_name, p.unit_price, p.slug AS product_slug
       FROM bulk_inquiries bi
       JOIN products p ON bi.product_id = p.id
       WHERE bi.user_id = ? OR bi.email = ?
       ORDER BY bi.created_at DESC`,
      [req.user.id, req.user.email]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}
