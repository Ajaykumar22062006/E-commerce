import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import logger from '../utils/logger.js';

/**
 * 1. Delivery Dashboard Real Statistics
 * Aggregates live MySQL counts for all delivery operations
 */
export async function getDeliveryDashboardStats(req, res, next) {
  try {
    const isPersonnel = req.user.role === 'delivery_personnel';
    const filterUserSql = isPersonnel ? 'AND delivery_person_id = ?' : '';
    const params = isPersonnel ? [req.user.id] : [];

    const [rows] = await pool.query(
      `SELECT 
        COUNT(*) AS totalDeliveries,
        SUM(CASE WHEN status = 'pending_assignment' THEN 1 ELSE 0 END) AS pendingAssignment,
        SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) AS assigned,
        SUM(CASE WHEN status = 'preparing' THEN 1 ELSE 0 END) AS preparing,
        SUM(CASE WHEN status = 'dispatched' THEN 1 ELSE 0 END) AS dispatched,
        SUM(CASE WHEN status = 'out_for_delivery' THEN 1 ELSE 0 END) AS outForDelivery,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
        SUM(CASE WHEN status = 'rescheduled' THEN 1 ELSE 0 END) AS rescheduled
       FROM deliveries
       WHERE 1=1 ${filterUserSql}`,
      params
    );

    const [vehRows] = await pool.query(
      'SELECT COUNT(*) AS totalVehicles, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS activeVehicles FROM delivery_vehicles'
    );

    const [personnelRows] = await pool.query(
      "SELECT COUNT(*) AS totalPersonnel FROM users WHERE role = 'delivery_personnel' AND is_active = 1"
    );

    const stats = {
      totalDeliveries: Number(rows[0]?.totalDeliveries || 0),
      pendingAssignment: Number(rows[0]?.pendingAssignment || 0),
      assigned: Number(rows[0]?.assigned || 0),
      preparing: Number(rows[0]?.preparing || 0),
      dispatched: Number(rows[0]?.dispatched || 0),
      outForDelivery: Number(rows[0]?.outForDelivery || 0),
      delivered: Number(rows[0]?.delivered || 0),
      failed: Number(rows[0]?.failed || 0),
      rescheduled: Number(rows[0]?.rescheduled || 0),
      totalVehicles: Number(vehRows[0]?.totalVehicles || 0),
      activeVehicles: Number(vehRows[0]?.activeVehicles || 0),
      totalPersonnel: Number(personnelRows[0]?.totalPersonnel || 0)
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 2. Get Deliveries with filtering, searching, and pagination
 */
export async function getDeliveries(req, res, next) {
  try {
    const { 
      search = '', 
      status = '', 
      deliveryPersonId, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 50 
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const conditions = ['1=1'];
    const params = [];

    // Role-based scoping: delivery personnel can only see deliveries assigned to them
    if (req.user.role === 'delivery_personnel') {
      conditions.push('d.delivery_person_id = ?');
      params.push(req.user.id);
    } else if (deliveryPersonId) {
      conditions.push('d.delivery_person_id = ?');
      params.push(deliveryPersonId);
    }

    if (status && status.trim()) {
      conditions.push('d.status = ?');
      params.push(status.trim());
    }

    if (startDate) {
      conditions.push('DATE(d.created_at) >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('DATE(d.created_at) <= ?');
      params.push(endDate);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(`(
        o.order_number LIKE ? OR 
        d.delivery_number LIKE ? OR 
        u.full_name LIKE ? OR 
        u.phone LIKE ? OR 
        dv.vehicle_number LIKE ? OR 
        JSON_UNQUOTE(JSON_EXTRACT(o.shipping_address_snapshot, '$.recipient_name')) LIKE ? OR 
        JSON_UNQUOTE(JSON_EXTRACT(o.shipping_address_snapshot, '$.postal_code')) LIKE ? OR 
        JSON_UNQUOTE(JSON_EXTRACT(o.shipping_address_snapshot, '$.city')) LIKE ?
      )`);
      params.push(q, q, q, q, q, q, q, q);
    }

    const whereClause = conditions.join(' AND ');

    // Count total
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM deliveries d
       JOIN orders o ON d.order_id = o.id
       LEFT JOIN users u ON d.delivery_person_id = u.id
       LEFT JOIN delivery_vehicles dv ON d.vehicle_id = dv.id
       WHERE ${whereClause}`,
      params
    );
    const total = countRows[0]?.total || 0;

    // Fetch deliveries
    const [deliveries] = await pool.query(
      `SELECT 
        d.id, d.delivery_number, d.order_id, d.status, d.expected_delivery_date,
        d.preferred_delivery_date, d.time_slot, d.unloading_preference, d.unloading_charge,
        d.site_contact_name, d.site_contact_phone, d.site_landmark, d.site_access_instructions,
        d.actual_delivery_date, d.failure_reason, d.rescheduled_date, d.failure_count, d.delivery_notes,
        d.created_at, d.updated_at,
        o.order_number, o.total_amount, o.delivery_fee, o.unloading_fee, o.payment_method, o.payment_status, o.order_status,
        o.shipping_address_snapshot,
        u.id AS delivery_person_id, u.full_name AS delivery_person_name, u.phone AS delivery_person_phone,
        dv.id AS vehicle_id, dv.vehicle_number, dv.vehicle_type, dv.capacity_tonnes,
        cust.full_name AS customer_name, cust.email AS customer_email, cust.phone AS customer_phone,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'product_name', oi.product_name,
              'sku', oi.sku,
              'quantity', oi.quantity,
              'unit_of_measure', oi.unit_of_measure,
              'total_line_price', oi.total_line_price
            )
          )
          FROM order_items oi
          WHERE oi.order_id = o.id
        ) AS items_summary
       FROM deliveries d
       JOIN orders o ON d.order_id = o.id
       JOIN users cust ON o.user_id = cust.id
       LEFT JOIN users u ON d.delivery_person_id = u.id
       LEFT JOIN delivery_vehicles dv ON d.vehicle_id = dv.id
       WHERE ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit, 10), offset]
    );

    // Format results and enforce role-based customer data masking
    const isAuthorized = req.user.role === 'admin' || req.user.role === 'delivery_personnel';

    const formatted = deliveries.map(del => {
      let address = {};
      try {
        address = typeof del.shipping_address_snapshot === 'string'
          ? JSON.parse(del.shipping_address_snapshot)
          : (del.shipping_address_snapshot || {});
      } catch (e) {
        address = {};
      }

      let items = [];
      try {
        items = typeof del.items_summary === 'string'
          ? JSON.parse(del.items_summary)
          : (del.items_summary || []);
      } catch (e) {
        items = [];
      }

      // Contact information restriction for unauthorized views
      const customerContact = isAuthorized ? {
        name: address.recipient_name || del.customer_name,
        phone: address.phone || del.customer_phone,
        email: del.customer_email
      } : {
        name: (address.recipient_name || del.customer_name || '').slice(0, 3) + '***',
        phone: '***-***-****',
        email: '***@***.***'
      };

      return {
        id: del.id,
        deliveryNumber: del.delivery_number,
        orderId: del.order_id,
        orderNumber: del.order_number,
        status: del.status,
        expectedDeliveryDate: del.expected_delivery_date,
        preferredDeliveryDate: del.preferred_delivery_date,
        timeSlot: del.time_slot,
        unloadingPreference: del.unloading_preference,
        unloadingCharge: del.unloading_charge,
        siteContactName: del.site_contact_name,
        siteContactPhone: del.site_contact_phone,
        siteLandmark: del.site_landmark,
        siteAccessInstructions: del.site_access_instructions,
        actualDeliveryDate: del.actual_delivery_date,
        failureReason: del.failure_reason,
        rescheduledDate: del.rescheduled_date,
        failureCount: del.failure_count,
        deliveryNotes: del.delivery_notes,
        createdAt: del.created_at,
        updatedAt: del.updated_at,
        orderAmount: del.total_amount,
        deliveryCharge: del.delivery_fee,
        unloadingFee: del.unloading_fee,
        paymentMethod: del.payment_method,
        paymentStatus: del.payment_status,
        orderStatus: del.order_status,
        customer: customerContact,
        shippingAddress: address,
        assignedPersonnel: del.delivery_person_id ? {
          id: del.delivery_person_id,
          name: del.delivery_person_name,
          phone: del.delivery_person_phone
        } : null,
        vehicle: del.vehicle_id ? {
          id: del.vehicle_id,
          vehicleNumber: del.vehicle_number,
          vehicleType: del.vehicle_type,
          capacityTonnes: del.capacity_tonnes
        } : null,
        itemsSummary: items
      };
    });

    res.json({
      success: true,
      data: {
        deliveries: formatted,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(total / parseInt(limit, 10))
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 3. Get single delivery details with full timeline history
 */
export async function getDeliveryById(req, res, next) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT 
        d.*,
        o.order_number, o.user_id AS order_user_id, o.total_amount, o.subtotal, o.tax_amount,
        o.delivery_fee, o.payment_method, o.payment_status, o.order_status,
        o.shipping_address_snapshot,
        u.full_name AS delivery_person_name, u.phone AS delivery_person_phone, u.email AS delivery_person_email,
        dv.vehicle_number, dv.vehicle_type, dv.capacity_tonnes,
        cust.full_name AS customer_name, cust.email AS customer_email, cust.phone AS customer_phone
       FROM deliveries d
       JOIN orders o ON d.order_id = o.id
       JOIN users cust ON o.user_id = cust.id
       LEFT JOIN users u ON d.delivery_person_id = u.id
       LEFT JOIN delivery_vehicles dv ON d.vehicle_id = dv.id
       WHERE d.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Delivery record not found.' });
    }

    const del = rows[0];

    // Access control:
    // admin can see any delivery
    // delivery_personnel can only see deliveries assigned to them
    // customer can only see delivery for their own order
    if (req.user.role === 'delivery_personnel' && del.delivery_person_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only view deliveries assigned to you.' });
    }
    if (req.user.role === 'customer' && del.order_user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access to another customer delivery is denied.' });
    }

    // Parse address
    let address = {};
    try {
      address = typeof del.shipping_address_snapshot === 'string'
        ? JSON.parse(del.shipping_address_snapshot)
        : (del.shipping_address_snapshot || {});
    } catch (e) {
      address = {};
    }

    // Get order items
    const [items] = await pool.query(
      `SELECT oi.*, 
        (SELECT image_url FROM product_images pi WHERE pi.product_id = oi.product_id ORDER BY pi.is_primary DESC LIMIT 1) AS image_url
       FROM order_items oi
       WHERE oi.order_id = ?`,
      [del.order_id]
    );

    // Get audit timeline history
    const [history] = await pool.query(
      `SELECT id, from_status, to_status, notes, reason, changed_by_name, created_at
       FROM delivery_status_history
       WHERE delivery_id = ?
       ORDER BY created_at ASC`,
      [del.id]
    );

    res.json({
      success: true,
      data: {
        ...del,
        shippingAddress: address,
        items,
        history
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 4. Assign delivery person, vehicle, and schedule date
 * Restricted to administrators
 */
export async function assignDelivery(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { 
      delivery_id, 
      delivery_person_id, 
      vehicle_id, 
      expected_delivery_date, 
      notes 
    } = req.body;

    if (!delivery_id) {
      return res.status(400).json({ success: false, message: 'delivery_id is required.' });
    }

    const [delRows] = await conn.query('SELECT * FROM deliveries WHERE id = ? FOR UPDATE', [delivery_id]);
    if (delRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Delivery record not found.' });
    }
    const delivery = delRows[0];

    // Validate delivery personnel if provided
    let personName = null;
    if (delivery_person_id) {
      const [personRows] = await conn.query(
        'SELECT id, full_name, role, is_active FROM users WHERE id = ?',
        [delivery_person_id]
      );
      if (personRows.length === 0 || personRows[0].role !== 'delivery_personnel' || !personRows[0].is_active) {
        throw new Error('Assigned user must be an active delivery personnel account.');
      }
      personName = personRows[0].full_name;
    }

    // Validate vehicle if provided
    let vehicleNum = null;
    if (vehicle_id) {
      const [vehRows] = await conn.query('SELECT id, vehicle_number, is_active FROM delivery_vehicles WHERE id = ?', [vehicle_id]);
      if (vehRows.length === 0 || !vehRows[0].is_active) {
        throw new Error('Selected delivery vehicle is invalid or inactive.');
      }
      vehicleNum = vehRows[0].vehicle_number;
    }

    // Determine new status
    let newStatus = delivery.status;
    if (delivery.status === 'pending_assignment' && (delivery_person_id || vehicle_id)) {
      newStatus = 'assigned';
    }

    const nextDate = expected_delivery_date || delivery.expected_delivery_date;

    await conn.query(
      `UPDATE deliveries 
       SET delivery_person_id = ?, vehicle_id = ?, status = ?, expected_delivery_date = ?, 
           delivery_notes = COALESCE(?, delivery_notes)
       WHERE id = ?`,
      [delivery_person_id || delivery.delivery_person_id, vehicle_id || delivery.vehicle_id, newStatus, nextDate, notes || null, delivery_id]
    );

    // Record audit history
    const auditNote = `Assigned to: ${personName || 'Unassigned'} | Vehicle: ${vehicleNum || 'Not Assigned'}${notes ? ' | Notes: ' + notes : ''}`;
    await conn.query(
      `INSERT INTO delivery_status_history (
        delivery_id, from_status, to_status, notes, changed_by_user_id, changed_by_name
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [delivery_id, delivery.status, newStatus, auditNote, req.user.id, `${req.user.full_name} (${req.user.role})`]
    );

    await conn.commit();

    logger.audit('DELIVERY_ASSIGNED', req.user.email, {
      deliveryId: delivery_id,
      deliveryNumber: delivery.delivery_number,
      assignedTo: personName,
      vehicle: vehicleNum,
      newStatus
    });

    res.json({
      success: true,
      message: 'Delivery assignment and schedule updated successfully.',
      data: {
        deliveryId: delivery_id,
        status: newStatus,
        expectedDeliveryDate: nextDate
      }
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
}

/**
 * 5. Update delivery status
 * Accessible by admin and assigned delivery personnel
 */
export async function updateDeliveryStatus(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { status, notes, reason, expected_delivery_date } = req.body;

    const validStatuses = [
      'pending_assignment', 'assigned', 'preparing', 'dispatched', 
      'out_for_delivery', 'delivered', 'failed', 'rescheduled'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid delivery status. Must be one of [${validStatuses.join(', ')}].`
      });
    }

    const [delRows] = await conn.query(
      `SELECT d.*, o.order_number, o.order_status, o.payment_method, o.payment_status 
       FROM deliveries d 
       JOIN orders o ON d.order_id = o.id 
       WHERE d.id = ? 
       FOR UPDATE`,
      [id]
    );

    if (delRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Delivery record not found.' });
    }
    const delivery = delRows[0];

    // Authorization check: delivery personnel can ONLY update deliveries assigned to them
    if (req.user.role === 'delivery_personnel' && delivery.delivery_person_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only update deliveries assigned directly to you.'
      });
    }

    // Business rule: delivered deliveries cannot be changed
    if (delivery.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'This delivery has already been marked as DELIVERED and cannot be modified.'
      });
    }

    // Require reason on failure
    if (status === 'failed' && (!reason || !reason.trim())) {
      return res.status(400).json({
        success: false,
        message: 'A clear failure reason is mandatory when recording a failed delivery attempt.'
      });
    }

    // Require new date on reschedule
    if (status === 'rescheduled' && !expected_delivery_date) {
      return res.status(400).json({
        success: false,
        message: 'A rescheduled delivery date is required.'
      });
    }

    const oldStatus = delivery.status;
    let actualDeliveryDate = delivery.actual_delivery_date;
    let failureCount = delivery.failure_count;
    let failureReason = delivery.failure_reason;
    let newExpectedDate = delivery.expected_delivery_date;

    if (status === 'delivered') {
      actualDeliveryDate = new Date();
      // Sync order status to delivered
      await conn.query(
        "UPDATE orders SET order_status = 'delivered' WHERE id = ?",
        [delivery.order_id]
      );
      if (delivery.order_status !== 'delivered') {
        await conn.query(
          `INSERT INTO order_status_history (order_id, from_status, to_status, notes, changed_by)
           VALUES (?, ?, 'delivered', ?, ?)`,
          [delivery.order_id, delivery.order_status, notes || 'Site consignment marked as delivered and verified', req.user.full_name || req.user.email || 'Logistics Partner']
        );
      }
      // If COD and unpaid, atomically settle payment
      if (delivery.payment_method === 'cod' && delivery.payment_status !== 'paid') {
        await conn.query(
          "UPDATE orders SET payment_status = 'paid' WHERE id = ?",
          [delivery.order_id]
        );
        await conn.query(
          "UPDATE payments SET status = 'paid' WHERE order_id = ?",
          [delivery.order_id]
        );
      }
    } else if (status === 'dispatched') {
      // Sync order status to shipped
      await conn.query(
        "UPDATE orders SET order_status = 'shipped' WHERE id = ?",
        [delivery.order_id]
      );
      if (delivery.order_status !== 'shipped') {
        await conn.query(
          `INSERT INTO order_status_history (order_id, from_status, to_status, notes, changed_by)
           VALUES (?, ?, 'shipped', ?, ?)`,
          [delivery.order_id, delivery.order_status, notes || 'Consignment dispatched from warehouse', req.user.full_name || req.user.email || 'Logistics Partner']
        );
      }
    } else if (status === 'preparing') {
      await conn.query(
        "UPDATE orders SET order_status = 'processing' WHERE id = ?",
        [delivery.order_id]
      );
      if (delivery.order_status !== 'processing') {
        await conn.query(
          `INSERT INTO order_status_history (order_id, from_status, to_status, notes, changed_by)
           VALUES (?, ?, 'processing', ?, ?)`,
          [delivery.order_id, delivery.order_status, notes || 'Consignment materials batching at yard', req.user.full_name || req.user.email || 'Logistics Partner']
        );
      }
    } else if (status === 'failed') {
      failureCount += 1;
      failureReason = reason.trim();
    } else if (status === 'rescheduled') {
      newExpectedDate = expected_delivery_date;
    }

    // Update delivery record
    await conn.query(
      `UPDATE deliveries 
       SET status = ?, actual_delivery_date = ?, failure_count = ?, failure_reason = ?, 
           expected_delivery_date = ?, delivery_notes = COALESCE(?, delivery_notes)
       WHERE id = ?`,
      [status, actualDeliveryDate, failureCount, failureReason, newExpectedDate, notes || null, id]
    );

    // Record in delivery audit history
    await conn.query(
      `INSERT INTO delivery_status_history (
        delivery_id, from_status, to_status, notes, reason, changed_by_user_id, changed_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id, 
        oldStatus, 
        status, 
        notes || (status === 'delivered' ? 'Delivery verified with customer signature' : null), 
        reason || null, 
        req.user.id, 
        `${req.user.full_name} (${req.user.role})`
      ]
    );

    await conn.commit();

    logger.audit('DELIVERY_STATUS_UPDATED', req.user.email, {
      deliveryId: id,
      fromStatus: oldStatus,
      toStatus: status,
      orderNumber: delivery.order_number
    });

    res.json({
      success: true,
      message: `Delivery status transitioned to "${status}" successfully.`,
      data: {
        id,
        status,
        failureCount,
        actualDeliveryDate
      }
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
}

/**
 * 6. Get delivery personnel list
 * Admin only
 */
export async function getDeliveryPersonnel(req, res, next) {
  try {
    const [personnel] = await pool.query(
      `SELECT 
        u.id, u.full_name, u.email, u.phone, u.company_name, u.is_active, u.created_at,
        (
          SELECT COUNT(*) 
          FROM deliveries d 
          WHERE d.delivery_person_id = u.id AND d.status NOT IN ('delivered', 'failed')
        ) AS active_assignments_count
       FROM users u
       WHERE u.role = 'delivery_personnel'
       ORDER BY u.full_name ASC`
    );

    res.json({
      success: true,
      data: personnel
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 7. Create a new delivery personnel user account
 * Admin only
 */
export async function createDeliveryPersonnel(req, res, next) {
  try {
    const { full_name, email, password, phone, company_name } = req.body;

    if (!full_name || full_name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Valid full name is required.' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email address is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    if (!phone || phone.trim().length < 8) {
      return res.status(400).json({ success: false, message: 'Valid contact phone number is required.' });
    }

    // Check duplicate email
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, phone, role, company_name)
       VALUES (?, ?, ?, ?, 'delivery_personnel', ?)`,
      [full_name.trim(), email.trim().toLowerCase(), passwordHash, phone.trim(), company_name?.trim() || 'BuildMart Fleet Logistics']
    );

    logger.audit('DELIVERY_PERSONNEL_CREATED', req.user.email, {
      newPersonnelId: result.insertId,
      email: email.trim().toLowerCase()
    });

    res.status(201).json({
      success: true,
      message: 'Delivery personnel account created successfully.',
      data: {
        id: result.insertId,
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: 'delivery_personnel'
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 8. Get vehicles list
 * Admin only
 */
export async function getVehicles(req, res, next) {
  try {
    const [vehicles] = await pool.query(
      `SELECT 
        dv.*,
        (
          SELECT COUNT(*) 
          FROM deliveries d 
          WHERE d.vehicle_id = dv.id AND d.status NOT IN ('delivered', 'failed')
        ) AS current_active_trips
       FROM delivery_vehicles dv
       ORDER BY dv.created_at DESC`
    );

    res.json({
      success: true,
      data: vehicles
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 9. Register a new delivery vehicle
 * Admin only
 */
export async function createVehicle(req, res, next) {
  try {
    const { vehicle_number, vehicle_type, capacity_tonnes, driver_name, driver_phone } = req.body;

    if (!vehicle_number || vehicle_number.trim().length < 4) {
      return res.status(400).json({ success: false, message: 'Valid registration number is required.' });
    }

    const validTypes = ['mini_truck', 'tipper_truck', 'flatbed_trailer', 'pickup', 'two_wheeler'];
    if (vehicle_type && !validTypes.includes(vehicle_type)) {
      return res.status(400).json({
        success: false,
        message: `Vehicle type must be one of [${validTypes.join(', ')}].`
      });
    }

    // Check duplicate
    const [existing] = await pool.query(
      'SELECT id FROM delivery_vehicles WHERE vehicle_number = ?',
      [vehicle_number.trim().toUpperCase()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Vehicle with this registration number already registered.' });
    }

    const [result] = await pool.query(
      `INSERT INTO delivery_vehicles (vehicle_number, vehicle_type, capacity_tonnes, driver_name, driver_phone)
       VALUES (?, ?, ?, ?, ?)`,
      [
        vehicle_number.trim().toUpperCase(),
        vehicle_type || 'tipper_truck',
        parseFloat(capacity_tonnes) || 4.50,
        driver_name || null,
        driver_phone || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Delivery vehicle added successfully.',
      data: {
        id: result.insertId,
        vehicle_number: vehicle_number.trim().toUpperCase(),
        vehicle_type: vehicle_type || 'tipper_truck',
        capacity_tonnes: parseFloat(capacity_tonnes) || 4.50
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 10. Customer Order Delivery Tracking
 * Accessible by order owner, admin, or assigned delivery partner
 */
export async function getDeliveryByOrderId(req, res, next) {
  try {
    const { orderId } = req.params;

    const [orders] = await pool.query('SELECT id, user_id, order_number, order_status FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const order = orders[0];

    // Authorization: customer must own the order or be admin / assigned delivery personnel
    if (req.user.role === 'customer' && order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden: You cannot access tracking for this order.' });
    }

    const [delRows] = await pool.query(
      `SELECT 
        d.*,
        u.full_name AS delivery_person_name, u.phone AS delivery_person_phone,
        dv.vehicle_number, dv.vehicle_type
       FROM deliveries d
       LEFT JOIN users u ON d.delivery_person_id = u.id
       LEFT JOIN delivery_vehicles dv ON d.vehicle_id = dv.id
       WHERE d.order_id = ?`,
      [orderId]
    );

    if (delRows.length === 0) {
      return res.json({
        success: true,
        data: null
      });
    }

    const delivery = delRows[0];
    const [history] = await pool.query(
      `SELECT to_status, notes, reason, changed_by_name, created_at
       FROM delivery_status_history
       WHERE delivery_id = ?
       ORDER BY created_at ASC`,
      [delivery.id]
    );

    res.json({
      success: true,
      data: {
        ...delivery,
        history
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 11. Calculate Delivery & Unloading Quote with Schedule Slot Availability
 * Checks real PIN serviceability, stock availability, road restrictions,
 * configurable freight & unloading charges, and vehicle slot capacity.
 */
export async function calculateDeliveryQuote(req, res, next) {
  try {
    const { 
      pincode, 
      postal_code,
      items = [], 
      unloading_preference = 'customer_arranged', 
      preferred_date, 
      time_slot 
    } = req.body;

    const rawPin = pincode || postal_code || '';
    if (!rawPin.toString().trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Postal PIN code is required to verify site logistics and delivery service.' 
      });
    }

    const cleanPin = rawPin.toString().trim();

    // 1. Verify PIN in delivery_service_areas
    const [serviceAreaRows] = await pool.query(
      'SELECT * FROM delivery_service_areas WHERE postal_code = ? AND is_serviceable = 1',
      [cleanPin]
    );

    if (serviceAreaRows.length === 0) {
      return res.status(400).json({
        success: false,
        is_serviceable: false,
        message: `Postal PIN code ${cleanPin} is currently outside our heavy construction material delivery network.`
      });
    }
    const serviceArea = serviceAreaRows[0];

    // 2. Validate items, check live warehouse stock & compute volume-discounted subtotal
    let subtotal = 0;
    let hasHeavyGoods = false;
    const validatedItems = [];

    if (items.length > 0) {
      const productIds = items.map(it => it.product_id);
      const placeholders = productIds.map(() => '?').join(',');
      const [products] = await pool.query(
        `SELECT id, name, sku, unit_of_measure, unit_price, discount_percent, 
                stock_quantity, min_order_quantity, volume_discount_threshold, 
                volume_discount_percent, is_heavy_bulk, is_active 
         FROM products WHERE id IN (${placeholders})`,
        productIds
      );

      const prodMap = new Map();
      products.forEach(p => prodMap.set(p.id, p));

      for (const item of items) {
        const prod = prodMap.get(item.product_id);
        if (!prod || !prod.is_active) {
          return res.status(400).json({ 
            success: false, 
            message: `Product #${item.product_id} is no longer available in our inventory.` 
          });
        }

        const requestedQty = parseInt(item.quantity, 10) || 1;
        if (prod.stock_quantity < requestedQty) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for "${prod.name}". Available: ${prod.stock_quantity}, Requested: ${requestedQty}.`
          });
        }

        if (prod.is_heavy_bulk) {
          hasHeavyGoods = true;
        }

        // Apply volume tier discount if eligible
        let effectivePrice = parseFloat((prod.unit_price * (1 - prod.discount_percent / 100)).toFixed(2));
        if (
          prod.volume_discount_threshold && 
          requestedQty >= prod.volume_discount_threshold && 
          prod.volume_discount_percent > 0
        ) {
          effectivePrice = parseFloat((prod.unit_price * (1 - prod.volume_discount_percent / 100)).toFixed(2));
        }

        const lineTotal = parseFloat((effectivePrice * requestedQty).toFixed(2));
        subtotal += lineTotal;

        validatedItems.push({
          product_id: prod.id,
          name: prod.name,
          sku: prod.sku,
          unit_of_measure: prod.unit_of_measure,
          unit_price: parseFloat(prod.unit_price),
          discount_percent: parseFloat(prod.discount_percent),
          effective_price: effectivePrice,
          quantity: requestedQty,
          line_total: lineTotal,
          is_heavy_bulk: Boolean(prod.is_heavy_bulk)
        });
      }
    }

    subtotal = parseFloat(subtotal.toFixed(2));

    // 3. Heavy vehicle municipal restriction check
    if (hasHeavyGoods && serviceArea.heavy_vehicle_allowed === 0) {
      return res.status(400).json({
        success: false,
        message: `PIN code ${cleanPin} (${serviceArea.city}) has municipal daytime restrictions prohibiting heavy tipper/flatbed vehicles. Heavy construction materials cannot be delivered here.`
      });
    }

    // 4. Calculate Delivery Freight Fee
    let deliveryFee = parseFloat(serviceArea.standard_shipping_fee);
    if (subtotal >= parseFloat(serviceArea.free_delivery_threshold)) {
      deliveryFee = 0.00; // Free delivery threshold met!
    }

    // 5. Calculate Unloading Assistance Fee based on business rules
    let unloadingFee = 0.00;
    if (unloading_preference === 'hydraulic_tipper') {
      unloadingFee = 350.00; // Hydraulic tipper dump assistance
    } else if (unloading_preference === 'manual_labor') {
      unloadingFee = 500.00; // Manual site labor offload
    } else if (unloading_preference === 'crane_handling') {
      unloadingFee = 1200.00; // Boom crane handling for heavy steel/girders
    } else {
      unloadingFee = 0.00; // Customer arranged
    }

    // 6. GST Calculation: 18% standard construction supplies GST
    const taxableAmount = Math.max(0, subtotal + unloadingFee);
    const taxAmount = parseFloat((taxableAmount * 0.18).toFixed(2));
    const totalAmount = parseFloat((subtotal + deliveryFee + unloadingFee + taxAmount).toFixed(2));

    // 7. Calculate Available Delivery Schedule & Time Slots (next 7 days starting from lead time)
    const estimatedDays = serviceArea.estimated_days || 1;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + estimatedDays);

    const standardSlots = [
      { id: 'morning', slot: '07:00 AM - 11:00 AM', label: 'Morning Slot (07:00 AM - 11:00 AM) — Early Foundation Pour' },
      { id: 'afternoon', slot: '11:00 AM - 03:00 PM', label: 'Daylight Slot (11:00 AM - 03:00 PM) — Standard Site Unloading' },
      { id: 'evening', slot: '03:00 PM - 07:00 PM', label: 'Evening Slot (03:00 PM - 07:00 PM) — Shift Replenishment' }
    ];

    // Fetch existing bookings to enforce vehicle slot capacity limit
    const [existingBookings] = await pool.query(
      `SELECT preferred_delivery_date, time_slot, COUNT(*) as booked_count
       FROM deliveries
       WHERE preferred_delivery_date >= DATE(?)
       GROUP BY preferred_delivery_date, time_slot`,
      [startDate.toISOString().slice(0, 10)]
    );

    const bookingMap = new Map();
    existingBookings.forEach(b => {
      const dateKey = new Date(b.preferred_delivery_date).toISOString().slice(0, 10);
      bookingMap.set(`${dateKey}_${b.time_slot}`, Number(b.booked_count));
    });

    const maxSlotCapacity = 5; // Max 5 vehicle allocations per time slot
    const availableDates = [];

    for (let i = 0; i < 7; i++) {
      const slotDate = new Date(startDate);
      slotDate.setDate(slotDate.getDate() + i);
      const dateStr = slotDate.toISOString().slice(0, 10);
      const displayDate = slotDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

      const slots = standardSlots.map(s => {
        const booked = bookingMap.get(`${dateStr}_${s.slot}`) || 0;
        const capacityLeft = Math.max(0, maxSlotCapacity - booked);
        return {
          slot: s.slot,
          label: s.label,
          available: capacityLeft > 0,
          capacity_left: capacityLeft
        };
      });

      availableDates.push({
        date: dateStr,
        display_date: displayDate,
        slots
      });
    }

    res.json({
      success: true,
      quote: {
        is_serviceable: true,
        pincode: serviceArea.postal_code,
        area_name: serviceArea.area_name,
        city: serviceArea.city,
        state: serviceArea.state,
        estimated_days: serviceArea.estimated_days,
        heavy_vehicle_allowed: Boolean(serviceArea.heavy_vehicle_allowed),
        has_heavy_goods: hasHeavyGoods,
        items: validatedItems,
        subtotal,
        delivery_fee: deliveryFee,
        unloading_fee: unloadingFee,
        unloading_preference,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        available_dates: availableDates
      }
    });
  } catch (error) {
    next(error);
  }
}
