import pool from '../config/db.js';

export async function getProducts(req, res, next) {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      inStock,
      brand,
      sortBy = 'newest',
      page = 1,
      limit = 12
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses = ['p.is_active = 1'];
    const params = [];

    // Search filter
    if (search && search.trim()) {
      whereClauses.push('(p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ? OR p.brand LIKE ?)');
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Category filter
    if (category && category.trim()) {
      whereClauses.push('(c.slug = ? OR c.id = ?)');
      params.push(category.trim(), category.trim());
    }

    // Price range filters (on effective price)
    if (minPrice !== undefined && minPrice !== '') {
      whereClauses.push('(p.unit_price * (1 - p.discount_percent / 100)) >= ?');
      params.push(parseFloat(minPrice));
    }

    if (maxPrice !== undefined && maxPrice !== '') {
      whereClauses.push('(p.unit_price * (1 - p.discount_percent / 100)) <= ?');
      params.push(parseFloat(maxPrice));
    }

    // In-stock only filter
    if (inStock === 'true' || inStock === '1') {
      whereClauses.push('p.stock_quantity > 0');
    }

    // Brand filter
    if (brand && brand.trim()) {
      whereClauses.push('p.brand = ?');
      params.push(brand.trim());
    }

    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Sorting
    let orderBySQL = 'ORDER BY p.created_at DESC';
    switch (sortBy) {
      case 'price_asc':
        orderBySQL = 'ORDER BY (p.unit_price * (1 - p.discount_percent / 100)) ASC';
        break;
      case 'price_desc':
        orderBySQL = 'ORDER BY (p.unit_price * (1 - p.discount_percent / 100)) DESC';
        break;
      case 'rating':
        orderBySQL = 'ORDER BY p.rating DESC, p.review_count DESC';
        break;
      case 'name_asc':
        orderBySQL = 'ORDER BY p.name ASC';
        break;
      case 'newest':
      default:
        orderBySQL = 'ORDER BY p.created_at DESC';
        break;
    }

    // Count total matching items
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ${whereSQL}`,
      params
    );
    const total = countRows[0].total;

    // Fetch products
    const [products] = await pool.query(
      `SELECT 
        p.id, p.name, p.slug, p.sku, p.brand, p.description,
        p.unit_of_measure, p.unit_price, p.discount_percent,
        ROUND(p.unit_price * (1 - p.discount_percent / 100), 2) AS effective_price,
        p.stock_quantity, p.low_stock_threshold, p.min_order_quantity,
        p.volume_discount_threshold, p.volume_discount_percent,
        p.is_heavy_bulk, p.rating, p.review_count, p.created_at,
        c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
        (
          SELECT image_url 
          FROM product_images pi 
          WHERE pi.product_id = p.id 
          ORDER BY pi.is_primary DESC, pi.sort_order ASC 
          LIMIT 1
        ) AS primary_image
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ${whereSQL}
       ${orderBySQL}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getFeaturedProducts(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.id, p.name, p.slug, p.sku, p.brand, p.unit_of_measure,
        p.unit_price, p.discount_percent,
        ROUND(p.unit_price * (1 - p.discount_percent / 100), 2) AS effective_price,
        p.stock_quantity, p.rating, p.review_count, p.is_heavy_bulk,
        c.name AS category_name, c.slug AS category_slug,
        (
          SELECT image_url 
          FROM product_images pi 
          WHERE pi.product_id = p.id 
          ORDER BY pi.is_primary DESC, pi.sort_order ASC 
          LIMIT 1
        ) AS primary_image
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 AND p.stock_quantity > 0
      ORDER BY p.rating DESC, p.review_count DESC
      LIMIT 8
    `);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductBySlug(req, res, next) {
  try {
    const { slug } = req.params;

    const [rows] = await pool.query(
      `SELECT 
        p.id, p.category_id, p.name, p.slug, p.sku, p.brand, p.description,
        p.unit_of_measure, p.unit_price, p.discount_percent,
        ROUND(p.unit_price * (1 - p.discount_percent / 100), 2) AS effective_price,
        p.stock_quantity, p.low_stock_threshold, p.min_order_quantity,
        p.volume_discount_threshold, p.volume_discount_percent,
        p.is_heavy_bulk, p.specifications, p.rating, p.review_count, p.created_at,
        c.name AS category_name, c.slug AS category_slug
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.slug = ? AND p.is_active = 1`,
      [slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const product = rows[0];

    // Safely parse specifications if string
    if (typeof product.specifications === 'string') {
      try {
        product.specifications = JSON.parse(product.specifications);
      } catch (e) {
        product.specifications = {};
      }
    }

    // Fetch all images for this product
    const [images] = await pool.query(
      `SELECT id, image_url, alt_text, is_primary, sort_order 
       FROM product_images 
       WHERE product_id = ? 
       ORDER BY is_primary DESC, sort_order ASC`,
      [product.id]
    );
    product.images = images;

    // Fetch related products in the same category
    const [related] = await pool.query(
      `SELECT 
        p.id, p.name, p.slug, p.sku, p.brand, p.unit_of_measure,
        p.unit_price, p.discount_percent,
        ROUND(p.unit_price * (1 - p.discount_percent / 100), 2) AS effective_price,
        p.stock_quantity, p.rating, p.review_count,
        (
          SELECT image_url 
          FROM product_images pi 
          WHERE pi.product_id = p.id 
          ORDER BY pi.is_primary DESC, pi.sort_order ASC 
          LIMIT 1
        ) AS primary_image
       FROM products p
       WHERE p.category_id = ? AND p.id != ? AND p.is_active = 1
       LIMIT 4`,
      [product.category_id, product.id]
    );
    product.relatedProducts = related;

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductReviews(req, res, next) {
  try {
    const { id } = req.params;

    const [reviews] = await pool.query(
      `SELECT 
        r.id, r.rating, r.title, r.comment, r.is_verified_purchase, r.created_at,
        u.full_name AS reviewer_name, u.role AS reviewer_role
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ?
       ORDER BY r.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    next(error);
  }
}

export async function addProductReview(req, res, next) {
  try {
    const { id } = req.params;
    const { rating, title, comment } = req.body;

    const ratingNum = parseInt(rating, 10);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5.' });
    }

    // Insert review
    await pool.query(
      `INSERT INTO reviews (product_id, user_id, rating, title, comment, is_verified_purchase)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [id, req.user.id, ratingNum, title || null, comment || null]
    );

    // Recalculate average rating & review count for the product
    const [stats] = await pool.query(
      `SELECT COUNT(*) as review_count, AVG(rating) as avg_rating
       FROM reviews
       WHERE product_id = ?`,
      [id]
    );

    const newCount = stats[0].review_count;
    const newRating = stats[0].avg_rating ? parseFloat(stats[0].avg_rating).toFixed(2) : 0;

    await pool.query(
      'UPDATE products SET rating = ?, review_count = ? WHERE id = ?',
      [newRating, newCount, id]
    );

    res.status(201).json({
      success: true,
      message: 'Review posted successfully.',
      data: {
        rating: newRating,
        review_count: newCount
      }
    });
  } catch (error) {
    next(error);
  }
}
