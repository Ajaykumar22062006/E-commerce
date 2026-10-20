import pool from '../config/db.js';

// Helper to calculate cart totals and line items
async function getCartDetails(userId) {
  // Ensure user cart exists
  let [cartRows] = await pool.query('SELECT id FROM carts WHERE user_id = ?', [userId]);
  let cartId;
  if (cartRows.length === 0) {
    const [createCart] = await pool.query('INSERT INTO carts (user_id) VALUES (?)', [userId]);
    cartId = createCart.insertId;
  } else {
    cartId = cartRows[0].id;
  }

  const [items] = await pool.query(
    `SELECT 
      ci.id AS cart_item_id, ci.quantity,
      p.id AS product_id, p.name, p.slug, p.sku, p.brand,
      p.unit_of_measure, p.unit_price, p.discount_percent,
      ROUND(p.unit_price * (1 - p.discount_percent / 100), 2) AS standard_discounted_price,
      p.stock_quantity, p.min_order_quantity, p.volume_discount_threshold, p.volume_discount_percent,
      p.is_heavy_bulk,
      (
        SELECT image_url 
        FROM product_images pi 
        WHERE pi.product_id = p.id 
        ORDER BY pi.is_primary DESC, pi.sort_order ASC 
        LIMIT 1
      ) AS image_url
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     WHERE ci.cart_id = ? AND p.is_active = 1`,
    [cartId]
  );

  let subtotal = 0;
  let totalItemsCount = 0;
  const processedItems = items.map(item => {
    // Check volume discount eligibility
    let unitPrice = parseFloat(item.standard_discounted_price);
    let volumeDiscountApplied = false;

    if (
      item.volume_discount_threshold &&
      item.quantity >= item.volume_discount_threshold &&
      item.volume_discount_percent > 0
    ) {
      unitPrice = parseFloat((item.unit_price * (1 - item.volume_discount_percent / 100)).toFixed(2));
      volumeDiscountApplied = true;
    }

    const lineTotal = parseFloat((unitPrice * item.quantity).toFixed(2));
    subtotal += lineTotal;
    totalItemsCount += item.quantity;

    return {
      cart_item_id: item.cart_item_id,
      product_id: item.product_id,
      name: item.name,
      slug: item.slug,
      sku: item.sku,
      brand: item.brand,
      unit_of_measure: item.unit_of_measure,
      unit_price: parseFloat(item.unit_price),
      discount_percent: parseFloat(item.discount_percent),
      effective_unit_price: unitPrice,
      volume_discount_applied: volumeDiscountApplied,
      volume_discount_threshold: item.volume_discount_threshold,
      quantity: item.quantity,
      line_total: lineTotal,
      stock_quantity: item.stock_quantity,
      is_in_stock: item.stock_quantity >= item.quantity,
      is_heavy_bulk: Boolean(item.is_heavy_bulk),
      image_url: item.image_url
    };
  });

  return {
    cart_id: cartId,
    items: processedItems,
    items_count: totalItemsCount,
    subtotal: parseFloat(subtotal.toFixed(2))
  };
}

export async function getCart(req, res, next) {
  try {
    const cart = await getCartDetails(req.user.id);
    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    next(error);
  }
}

export async function addToCart(req, res, next) {
  try {
    const { product_id, quantity = 1 } = req.body;
    const addQty = Math.max(1, parseInt(quantity, 10) || 1);

    // Validate product existence and stock
    const [products] = await pool.query(
      'SELECT id, name, stock_quantity, min_order_quantity, is_active FROM products WHERE id = ?',
      [product_id]
    );

    if (products.length === 0 || !products[0].is_active) {
      return res.status(404).json({ success: false, message: 'Product is unavailable or does not exist.' });
    }

    const product = products[0];

    // Ensure cart exists
    let [cartRows] = await pool.query('SELECT id FROM carts WHERE user_id = ?', [req.user.id]);
    let cartId;
    if (cartRows.length === 0) {
      const [newCart] = await pool.query('INSERT INTO carts (user_id) VALUES (?)', [req.user.id]);
      cartId = newCart.insertId;
    } else {
      cartId = cartRows[0].id;
    }

    // Check existing quantity in cart
    const [existingItem] = await pool.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?',
      [cartId, product_id]
    );

    const targetQty = (existingItem.length > 0 ? existingItem[0].quantity : 0) + addQty;

    if (targetQty > product.stock_quantity) {
      return res.status(400).json({
        success: false,
        message: `Requested quantity (${targetQty}) exceeds current available warehouse stock (${product.stock_quantity}).`
      });
    }

    if (existingItem.length > 0) {
      await pool.query(
        'UPDATE cart_items SET quantity = ? WHERE id = ?',
        [targetQty, existingItem[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)',
        [cartId, product_id, Math.max(targetQty, product.min_order_quantity || 1)]
      );
    }

    const cart = await getCartDetails(req.user.id);

    res.json({
      success: true,
      message: `${product.name} added to cart.`,
      data: cart
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCartItem(req, res, next) {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const newQty = parseInt(quantity, 10);

    if (newQty <= 0) {
      return removeCartItem(req, res, next);
    }

    // Find cart item and check owner
    const [cartItem] = await pool.query(
      `SELECT ci.id, ci.cart_id, ci.product_id, p.stock_quantity, p.min_order_quantity, p.name
       FROM cart_items ci
       JOIN carts c ON ci.cart_id = c.id
       JOIN products p ON ci.product_id = p.id
       WHERE ci.id = ? AND c.user_id = ?`,
      [id, req.user.id]
    );

    if (cartItem.length === 0) {
      return res.status(404).json({ success: false, message: 'Cart item not found.' });
    }

    const item = cartItem[0];

    if (newQty > item.stock_quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${item.stock_quantity} units available in warehouse for ${item.name}.`
      });
    }

    await pool.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQty, id]);

    const cart = await getCartDetails(req.user.id);

    res.json({
      success: true,
      message: 'Cart updated.',
      data: cart
    });
  } catch (error) {
    next(error);
  }
}

export async function removeCartItem(req, res, next) {
  try {
    const { id } = req.params;

    await pool.query(
      `DELETE ci FROM cart_items ci
       JOIN carts c ON ci.cart_id = c.id
       WHERE ci.id = ? AND c.user_id = ?`,
      [id, req.user.id]
    );

    const cart = await getCartDetails(req.user.id);

    res.json({
      success: true,
      message: 'Item removed from cart.',
      data: cart
    });
  } catch (error) {
    next(error);
  }
}

export async function clearCart(req, res, next) {
  try {
    const [cart] = await pool.query('SELECT id FROM carts WHERE user_id = ?', [req.user.id]);
    if (cart.length > 0) {
      await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [cart[0].id]);
    }

    res.json({
      success: true,
      message: 'Cart cleared.',
      data: {
        cart_id: cart.length > 0 ? cart[0].id : null,
        items: [],
        items_count: 0,
        subtotal: 0
      }
    });
  } catch (error) {
    next(error);
  }
}

// Sync client local storage cart items into user DB cart upon login
export async function syncCart(req, res, next) {
  try {
    const { items = [] } = req.body;

    let [cartRows] = await pool.query('SELECT id FROM carts WHERE user_id = ?', [req.user.id]);
    let cartId;
    if (cartRows.length === 0) {
      const [createCart] = await pool.query('INSERT INTO carts (user_id) VALUES (?)', [req.user.id]);
      cartId = createCart.insertId;
    } else {
      cartId = cartRows[0].id;
    }

    for (const item of items) {
      if (!item.product_id || !item.quantity) continue;

      const [prod] = await pool.query('SELECT id, stock_quantity FROM products WHERE id = ? AND is_active = 1', [item.product_id]);
      if (prod.length === 0) continue;

      const availableStock = prod[0].stock_quantity;
      const desiredQty = Math.min(item.quantity, availableStock);
      if (desiredQty <= 0) continue;

      const [existing] = await pool.query('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?', [cartId, item.product_id]);
      if (existing.length > 0) {
        const mergedQty = Math.min(existing[0].quantity + desiredQty, availableStock);
        await pool.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [mergedQty, existing[0].id]);
      } else {
        await pool.query('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)', [cartId, item.product_id, desiredQty]);
      }
    }

    const updatedCart = await getCartDetails(req.user.id);

    res.json({
      success: true,
      message: 'Cart synchronized.',
      data: updatedCart
    });
  } catch (error) {
    next(error);
  }
}
