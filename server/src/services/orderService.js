import crypto from 'crypto';
import pool from '../config/db.js';
import logger from '../utils/logger.js';

export class OrderService {
  /**
   * Generates a unique, collision-resistant BuildMart order number
   * Format: BM-YYYYMMDD-XXXX
   */
  static generateOrderNumber() {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `BM-${dateStr}-${randomHex}`;
  }

  /**
   * Creates an order with strict server-side validation and atomic database transaction
   */
  static async createOrder({ 
    userId, 
    addressId, 
    paymentMethod, 
    couponCode, 
    notes,
    isBuyNow = false,
    buyNowItem = null,
    siteDetails = null
  }) {
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // 1. Fetch shipping address or create from siteDetails
      let shippingAddress;
      if (addressId) {
        const [addressRows] = await conn.query(
          'SELECT * FROM addresses WHERE id = ? AND user_id = ?',
          [addressId, userId]
        );
        if (addressRows.length === 0) {
          throw new Error('Valid delivery address is required.');
        }
        shippingAddress = addressRows[0];
      } else if (siteDetails && siteDetails.address_line1 && siteDetails.postal_code) {
        const [insertRes] = await conn.query(
          `INSERT INTO addresses (user_id, recipient_name, phone, address_line1, landmark, city, state, postal_code, is_default)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
          [
            userId,
            siteDetails.recipient_name || 'Site Supervisor',
            siteDetails.phone || siteDetails.site_contact_phone || '9999999999',
            siteDetails.address_line1,
            siteDetails.landmark || siteDetails.site_landmark || null,
            siteDetails.city || 'Noida',
            siteDetails.state || 'Uttar Pradesh',
            siteDetails.postal_code
          ]
        );
        const [addressRows] = await conn.query('SELECT * FROM addresses WHERE id = ?', [insertRes.insertId]);
        shippingAddress = addressRows[0];
        addressId = insertRes.insertId;
      } else {
        throw new Error('Valid delivery address is required.');
      }

      // 2. Validate pincode serviceability
      const [serviceAreaRows] = await conn.query(
        'SELECT * FROM delivery_service_areas WHERE postal_code = ? AND is_serviceable = 1',
        [shippingAddress.postal_code]
      );

      if (serviceAreaRows.length === 0) {
        throw new Error(`Postal PIN code ${shippingAddress.postal_code} is outside our delivery service corridor.`);
      }
      const serviceArea = serviceAreaRows[0];

      // 3. Resolve order items: Buy Now direct purchase vs. Persistent Cart
      let orderItemsToProcess = [];
      let cartId = null;

      if (isBuyNow && buyNowItem) {
        if (!buyNowItem.product_id || !buyNowItem.quantity || buyNowItem.quantity <= 0) {
          throw new Error('Invalid Buy Now product or quantity specified.');
        }
        orderItemsToProcess = [{
          product_id: parseInt(buyNowItem.product_id, 10),
          quantity: parseInt(buyNowItem.quantity, 10)
        }];
      } else {
        // Fetch user's cart items
        const [cartRows] = await conn.query('SELECT id FROM carts WHERE user_id = ?', [userId]);
        if (cartRows.length === 0) {
          throw new Error('Cart is empty.');
        }
        cartId = cartRows[0].id;

        const [cartItems] = await conn.query(
          'SELECT product_id, quantity FROM cart_items WHERE cart_id = ?',
          [cartId]
        );

        if (cartItems.length === 0) {
          throw new Error('Your cart is empty. Please add items before proceeding to checkout.');
        }
        orderItemsToProcess = cartItems;
      }

      // 4. Lock products FOR UPDATE to prevent race conditions and overselling
      const productIds = orderItemsToProcess.map(item => item.product_id);
      const placeholders = productIds.map(() => '?').join(',');

      const [lockedProducts] = await conn.query(
        `SELECT id, name, slug, sku, unit_of_measure, unit_price, discount_percent, 
                stock_quantity, min_order_quantity, volume_discount_threshold, 
                volume_discount_percent, is_heavy_bulk, is_active
         FROM products 
         WHERE id IN (${placeholders}) 
         FOR UPDATE`,
        productIds
      );

      const productMap = new Map();
      lockedProducts.forEach(prod => productMap.set(prod.id, prod));

      let subtotal = 0;
      let hasHeavyGoods = false;
      const verifiedOrderItems = [];

      for (const item of orderItemsToProcess) {
        const product = productMap.get(item.product_id);

        if (!product || !product.is_active) {
          throw new Error(`Product #${item.product_id} is no longer available.`);
        }

        if (product.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock_quantity}, Requested: ${item.quantity}.`);
        }

        if (product.is_heavy_bulk) {
          hasHeavyGoods = true;
        }

        // Calculate unit price and volume discounts
        let effectiveUnitPrice = parseFloat((product.unit_price * (1 - product.discount_percent / 100)).toFixed(2));
        if (
          product.volume_discount_threshold &&
          item.quantity >= product.volume_discount_threshold &&
          product.volume_discount_percent > 0
        ) {
          effectiveUnitPrice = parseFloat((product.unit_price * (1 - product.volume_discount_percent / 100)).toFixed(2));
        }

        const totalLinePrice = parseFloat((effectiveUnitPrice * item.quantity).toFixed(2));
        subtotal += totalLinePrice;

        verifiedOrderItems.push({
          product_id: product.id,
          product_name: product.name,
          sku: product.sku,
          unit_of_measure: product.unit_of_measure,
          unit_price: parseFloat(product.unit_price),
          discount_percent: parseFloat(product.discount_percent),
          effective_price: effectiveUnitPrice,
          quantity: item.quantity,
          total_line_price: totalLinePrice,
          previous_stock: product.stock_quantity,
          new_stock: product.stock_quantity - item.quantity
        });
      }

      subtotal = parseFloat(subtotal.toFixed(2));

      // 5. Verify heavy vehicle restriction for heavy goods
      if (hasHeavyGoods && serviceArea.heavy_vehicle_allowed === 0) {
        throw new Error(`Your order contains heavy bulk materials (cement/steel/sand) which cannot be delivered to ${shippingAddress.postal_code} due to heavy vehicle road restrictions. Please split your order or choose an alternative address.`);
      }

      // 6. Validate coupon code if provided
      let couponId = null;
      let appliedCouponCode = null;
      let discountAmount = 0;

      if (couponCode && couponCode.trim()) {
        const [coupons] = await conn.query(
          `SELECT * FROM coupons 
           WHERE code = ? AND is_active = 1 AND valid_from <= NOW() AND valid_until >= NOW()
           FOR UPDATE`,
          [couponCode.trim().toUpperCase()]
        );

        if (coupons.length > 0) {
          const coupon = coupons[0];
          if (!coupon.usage_limit || coupon.times_used < coupon.usage_limit) {
            if (subtotal >= parseFloat(coupon.min_order_amount)) {
              couponId = coupon.id;
              appliedCouponCode = coupon.code;
              if (coupon.discount_type === 'percentage') {
                discountAmount = (subtotal * parseFloat(coupon.discount_value)) / 100;
                if (coupon.max_discount_amount) {
                  discountAmount = Math.min(discountAmount, parseFloat(coupon.max_discount_amount));
                }
              } else {
                discountAmount = Math.min(parseFloat(coupon.discount_value), subtotal);
              }
              discountAmount = parseFloat(discountAmount.toFixed(2));

              // Increment coupon usage
              await conn.query('UPDATE coupons SET times_used = times_used + 1 WHERE id = ?', [coupon.id]);
            }
          }
        }
      }

      // 7. Calculate Shipping Delivery charges
      let deliveryFee = parseFloat(serviceArea.standard_shipping_fee);
      if (subtotal >= parseFloat(serviceArea.free_delivery_threshold)) {
        deliveryFee = 0.00; // Free delivery threshold met
      }

      // 7.5 Calculate Unloading Assistance Fee based on business rules
      let unloadingFee = 0.00;
      const unloadingPref = siteDetails?.unloading_preference || 'customer_arranged';
      if (unloadingPref === 'hydraulic_tipper') {
        unloadingFee = 350.00;
      } else if (unloadingPref === 'manual_labor') {
        unloadingFee = 500.00;
      } else if (unloadingPref === 'crane_handling') {
        unloadingFee = 1200.00;
      }

      // 8. Calculate Taxes (GST - 18% standard construction supplies GST)
      const taxableAmount = Math.max(0, subtotal - discountAmount + unloadingFee);
      const taxAmount = parseFloat((taxableAmount * 0.18).toFixed(2));

      // 9. Total calculation
      const totalAmount = parseFloat((Math.max(0, subtotal - discountAmount) + taxAmount + deliveryFee + unloadingFee).toFixed(2));

      // 10. Generate order number and insert order
      const orderNumber = this.generateOrderNumber();
      const initialPaymentStatus = paymentMethod === 'cod' ? 'pending' : 'pending';
      const initialOrderStatus = paymentMethod === 'cod' ? 'confirmed' : 'pending';

      const [orderResult] = await conn.query(
        `INSERT INTO orders (
          order_number, user_id, shipping_address_snapshot, subtotal, discount_amount,
          coupon_id, coupon_code, tax_amount, delivery_fee, unloading_fee, total_amount,
          payment_method, payment_status, order_status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderNumber,
          userId,
          JSON.stringify(shippingAddress),
          subtotal,
          discountAmount,
          couponId,
          appliedCouponCode,
          taxAmount,
          deliveryFee,
          unloadingFee,
          totalAmount,
          paymentMethod,
          initialPaymentStatus,
          initialOrderStatus,
          notes || null
        ]
      );

      const orderId = orderResult.insertId;

      // 11. Insert order items & update product stock & record inventory movements
      for (const item of verifiedOrderItems) {
        await conn.query(
          `INSERT INTO order_items (
            order_id, product_id, product_name, sku, unit_of_measure,
            unit_price, discount_percent, effective_price, quantity, total_line_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            item.product_id,
            item.product_name,
            item.sku,
            item.unit_of_measure,
            item.unit_price,
            item.discount_percent,
            item.effective_price,
            item.quantity,
            item.total_line_price
          ]
        );

        // Deduct inventory
        await conn.query(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );

        // Record stock movement ledger
        await conn.query(
          `INSERT INTO inventory_movements (
            product_id, change_quantity, previous_stock, new_stock, movement_type,
            reference_type, reference_id, reason, created_by
          ) VALUES (?, ?, ?, ?, 'order_deduction', 'order', ?, ?, ?)`,
          [
            item.product_id,
            -item.quantity,
            item.previous_stock,
            item.new_stock,
            orderNumber,
            `Order placement deduction for #${orderNumber}`,
            `User#${userId}`
          ]
        );
      }

      // 12. Record initial order status history
      await conn.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, notes, changed_by)
         VALUES (?, NULL, ?, ?, ?)`,
        [
          orderId,
          initialOrderStatus,
          paymentMethod === 'cod' ? 'Order created via Cash on Delivery' : 'Order created awaiting online payment',
          paymentMethod === 'cod' ? 'System' : `User#${userId}`
        ]
      );

      // 13. Create initial payment record
      await conn.query(
        `INSERT INTO payments (order_id, payment_method, amount, currency, status)
         VALUES (?, ?, ?, 'INR', 'pending')`,
        [orderId, paymentMethod, totalAmount]
      );

      // 13.5 Create corresponding Delivery record with Site Logistics Details
      const deliveryNumber = `DEL-${orderNumber.replace('BM-', '')}`;
      const estimatedDays = serviceArea.estimated_days || 1;
      const earliestDate = new Date();
      earliestDate.setDate(earliestDate.getDate() + estimatedDays);
      const earliestDateStr = earliestDate.toISOString().slice(0, 10);

      let requestedDate = earliestDateStr;
      if (siteDetails?.preferred_date) {
        const prefDate = new Date(siteDetails.preferred_date);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        if (prefDate < todayDate) {
          throw new Error(`Preferred delivery date ${siteDetails.preferred_date} cannot be in the past.`);
        }
        requestedDate = siteDetails.preferred_date;
      }

      const timeSlot = siteDetails?.time_slot || '07:00 AM - 11:00 AM';
      const siteInstructions = siteDetails?.site_access_instructions || notes || null;
      const contactName = siteDetails?.site_contact_name || shippingAddress.recipient_name;
      const contactPhone = siteDetails?.site_contact_phone || shippingAddress.phone;
      const siteLandmark = siteDetails?.site_landmark || shippingAddress.landmark || null;

      const [deliveryRes] = await conn.query(
        `INSERT INTO deliveries (
          delivery_number, order_id, status, expected_delivery_date, preferred_delivery_date,
          time_slot, unloading_preference, unloading_charge, site_contact_name, site_contact_phone,
          site_landmark, site_access_instructions, delivery_notes
        ) VALUES (?, ?, 'pending_assignment', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          deliveryNumber,
          orderId,
          requestedDate,
          requestedDate,
          timeSlot,
          unloadingPref,
          unloadingFee,
          contactName,
          contactPhone,
          siteLandmark,
          siteInstructions,
          `Site delivery to ${shippingAddress.postal_code} (${shippingAddress.city}). Slot: ${timeSlot}. Unloading: ${unloadingPref}.`
        ]
      );

      await conn.query(
        `INSERT INTO delivery_status_history (
          delivery_id, from_status, to_status, notes, changed_by_name
        ) VALUES (?, NULL, 'pending_assignment', 'Delivery ticket created upon order registration', 'System')`,
        [deliveryRes.insertId]
      );

      // 14. Clear cart only when placing an order from cart (do not clear on Buy Now!)
      if (!isBuyNow && cartId) {
        await conn.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
      }

      await conn.commit();

      logger.audit('ORDER_CREATED', `User#${userId}`, {
        orderId,
        orderNumber,
        totalAmount,
        paymentMethod
      });

      return {
        orderId,
        orderNumber,
        subtotal,
        discountAmount,
        taxAmount,
        deliveryFee,
        unloadingFee,
        totalAmount,
        paymentMethod,
        paymentStatus: initialPaymentStatus,
        orderStatus: initialOrderStatus
      };
    } catch (error) {
      await conn.rollback();
      logger.error('Order creation failed:', { error: error.message });
      throw error;
    } finally {
      conn.release();
    }
  }

  /**
   * Cancels an order and atomically restores inventory
   */
  static async cancelOrder({ orderId, userId, reason, cancelledBy = 'customer' }) {
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // Find order
      const [orderRows] = await conn.query(
        'SELECT * FROM orders WHERE id = ? FOR UPDATE',
        [orderId]
      );

      if (orderRows.length === 0) {
        throw new Error('Order not found.');
      }
      const order = orderRows[0];

      // If cancelled by customer, verify ownership
      if (cancelledBy === 'customer' && order.user_id !== userId) {
        throw new Error('Unauthorized to cancel this order.');
      }

      // Check if order is eligible for cancellation
      if (['shipped', 'delivered', 'cancelled'].includes(order.order_status)) {
        throw new Error(`Order #${order.order_number} cannot be cancelled because its current status is "${order.order_status}".`);
      }

      // Fetch order items to restore stock
      const [orderItems] = await conn.query(
        'SELECT product_id, quantity, product_name FROM order_items WHERE order_id = ?',
        [orderId]
      );

      for (const item of orderItems) {
        const [prodRow] = await conn.query('SELECT stock_quantity FROM products WHERE id = ? FOR UPDATE', [item.product_id]);
        if (prodRow.length > 0) {
          const prevStock = prodRow[0].stock_quantity;
          const newStock = prevStock + item.quantity;

          await conn.query('UPDATE products SET stock_quantity = ? WHERE id = ?', [newStock, item.product_id]);

          await conn.query(
            `INSERT INTO inventory_movements (
              product_id, change_quantity, previous_stock, new_stock, movement_type,
              reference_type, reference_id, reason, created_by
            ) VALUES (?, ?, ?, ?, 'order_cancellation_restore', 'order', ?, ?, ?)`,
            [
              item.product_id,
              item.quantity,
              prevStock,
              newStock,
              order.order_number,
              `Restored stock from cancelled order #${order.order_number}`,
              cancelledBy
            ]
          );
        }
      }

      // Update order status
      await conn.query(
        `UPDATE orders SET order_status = 'cancelled', cancellation_reason = ? WHERE id = ?`,
        [reason || 'Cancelled by user', orderId]
      );

      // Record in order status history
      await conn.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, notes, changed_by)
         VALUES (?, ?, 'cancelled', ?, ?)`,
        [orderId, order.order_status, reason || 'Order cancelled', cancelledBy]
      );

      // Synchronize linked delivery consignment if active
      const [delRows] = await conn.query('SELECT id, status FROM deliveries WHERE order_id = ?', [orderId]);
      if (delRows.length > 0 && delRows[0].status !== 'delivered') {
        const del = delRows[0];
        await conn.query(
          `UPDATE deliveries 
           SET status = 'failed', failure_reason = ? 
           WHERE id = ?`,
          [reason ? `Order cancelled: ${reason}` : 'Order cancelled by customer', del.id]
        );
        await conn.query(
          `INSERT INTO delivery_status_history (delivery_id, from_status, to_status, notes, reason, changed_by_name)
           VALUES (?, ?, 'failed', 'Delivery cancelled due to order cancellation', ?, ?)`,
          [del.id, del.status, reason || 'Order cancelled', cancelledBy]
        );
      }

      await conn.commit();

      logger.audit('ORDER_CANCELLED', cancelledBy, {
        orderId,
        orderNumber: order.order_number,
        reason
      });

      return { success: true, orderNumber: order.order_number };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}

export default OrderService;
