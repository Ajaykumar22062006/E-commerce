import pool from '../config/db.js';
import OrderService from '../services/orderService.js';
import logger from '../utils/logger.js';

export async function createOrder(req, res, next) {
  try {
    const { 
      address_id, 
      payment_method, 
      coupon_code, 
      notes,
      is_buy_now,
      buy_now_item,
      site_details
    } = req.body;

    if (!address_id && (!site_details || !site_details.address_line1 || !site_details.postal_code)) {
      return res.status(400).json({ success: false, message: 'Delivery address selection or site address details are required.' });
    }

    if (!['cod', 'razorpay'].includes(payment_method)) {
      return res.status(400).json({ success: false, message: 'Payment method must be "cod" or "razorpay".' });
    }

    const orderResult = await OrderService.createOrder({
      userId: req.user.id,
      addressId: address_id,
      paymentMethod: payment_method,
      couponCode: coupon_code,
      notes,
      isBuyNow: Boolean(is_buy_now),
      buyNowItem: buy_now_item,
      siteDetails: site_details
    });

    res.status(201).json({
      success: true,
      message: payment_method === 'cod' ? 'Order confirmed successfully!' : 'Order created, proceed to payment.',
      data: orderResult
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyOrders(req, res, next) {
  try {
    const [orders] = await pool.query(
      `SELECT 
        o.id, o.order_number, o.subtotal, o.discount_amount, o.delivery_fee, o.tax_amount, o.total_amount,
        o.payment_method, o.payment_status, o.order_status, o.created_at,
        d.status AS delivery_status, d.expected_delivery_date, d.delivery_number,
        (
          SELECT COUNT(*) 
          FROM order_items oi 
          WHERE oi.order_id = o.id
        ) AS items_count
       FROM orders o
       LEFT JOIN deliveries d ON d.order_id = o.id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrderById(req, res, next) {
  try {
    const { id } = req.params;

    const [orders] = await pool.query(
      `SELECT * FROM orders WHERE id = ? AND user_id = ?`,
      [id, req.user.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = orders[0];

    // Parse snapshot JSON
    if (typeof order.shipping_address_snapshot === 'string') {
      try {
        order.shipping_address_snapshot = JSON.parse(order.shipping_address_snapshot);
      } catch (e) {
        order.shipping_address_snapshot = {};
      }
    }

    // Get order items
    const [items] = await pool.query(
      `SELECT oi.*, 
        (
          SELECT image_url 
          FROM product_images pi 
          WHERE pi.product_id = oi.product_id 
          ORDER BY pi.is_primary DESC, pi.sort_order ASC 
          LIMIT 1
        ) AS image_url
       FROM order_items oi
       WHERE oi.order_id = ?`,
      [id]
    );
    order.items = items;

    // Get order status history timeline
    const [history] = await pool.query(
      `SELECT to_status AS status, notes, changed_by, created_at
       FROM order_status_history
       WHERE order_id = ?
       ORDER BY created_at ASC`,
      [id]
    );
    order.history = history;

    // Get payment records
    const [payments] = await pool.query(
      `SELECT id, payment_method, razorpay_order_id, razorpay_payment_id, amount, currency, status, created_at
       FROM payments
       WHERE order_id = ?
       ORDER BY created_at DESC`,
      [id]
    );
    order.payment = payments[0] || null;

    // Get delivery details
    const [delRows] = await pool.query(
      `SELECT d.*, 
              u.full_name AS delivery_person_name, u.phone AS delivery_person_phone,
              dv.vehicle_number, dv.vehicle_type, dv.capacity_tonnes
       FROM deliveries d
       LEFT JOIN users u ON d.delivery_person_id = u.id
       LEFT JOIN delivery_vehicles dv ON d.vehicle_id = dv.id
       WHERE d.order_id = ?`,
      [id]
    );

    if (delRows.length > 0) {
      const delivery = delRows[0];
      const [delHistory] = await pool.query(
        `SELECT to_status, notes, reason, changed_by_name, created_at
         FROM delivery_status_history
         WHERE delivery_id = ?
         ORDER BY created_at ASC`,
        [delivery.id]
      );
      delivery.history = delHistory;
      order.delivery = delivery;
    } else {
      order.delivery = null;
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelMyOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await OrderService.cancelOrder({
      orderId: id,
      userId: req.user.id,
      reason,
      cancelledBy: `Customer (${req.user.email})`
    });

    res.json({
      success: true,
      message: `Order #${result.orderNumber} has been successfully cancelled.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function reorder(req, res, next) {
  try {
    const { id } = req.params;

    // Fetch items from the order
    const [orderItems] = await pool.query(
      `SELECT oi.product_id, oi.quantity, p.stock_quantity, p.is_active, p.name
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ? AND o.user_id = ?`,
      [id, req.user.id]
    );

    if (orderItems.length === 0) {
      return res.status(404).json({ success: false, message: 'Order items not found.' });
    }

    // Ensure cart exists
    let [cartRows] = await pool.query('SELECT id FROM carts WHERE user_id = ?', [req.user.id]);
    let cartId;
    if (cartRows.length === 0) {
      const [createCart] = await pool.query('INSERT INTO carts (user_id) VALUES (?)', [req.user.id]);
      cartId = createCart.insertId;
    } else {
      cartId = cartRows[0].id;
    }

    const reorderedItems = [];
    const outOfStockItems = [];

    for (const item of orderItems) {
      if (!item.is_active || item.stock_quantity <= 0) {
        outOfStockItems.push(item.name || `Product #${item.product_id}`);
        continue;
      }

      const qtyToAdd = Math.min(item.quantity, item.stock_quantity);

      // Upsert cart item
      await pool.query(
        `INSERT INTO cart_items (cart_id, product_id, quantity)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
        [cartId, item.product_id, qtyToAdd]
      );

      reorderedItems.push(item.name);
    }

    res.json({
      success: true,
      message: `${reorderedItems.length} items added to your cart.`,
      data: {
        added: reorderedItems,
        outOfStock: outOfStockItems
      }
    });
  } catch (error) {
    next(error);
  }
}
