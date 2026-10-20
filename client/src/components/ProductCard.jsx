import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Star, Truck, Shield, Zap } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const handleCardBuyNow = () => {
    const buyNowData = {
      product_id: product.id,
      quantity: product.min_order_quantity || 1,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        unit_of_measure: product.unit_of_measure,
        unit_price: product.unit_price,
        discount_percent: product.discount_percent,
        effective_price: product.effective_price || Math.round(product.unit_price * (1 - (product.discount_percent || 0) / 100)),
        is_heavy_bulk: product.is_heavy_bulk,
        image_url: product.primary_image || (product.images && product.images[0]?.image_url) || 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=200'
      }
    };
    sessionStorage.setItem('buildmart_buynow', JSON.stringify(buyNowData));
    navigate('/checkout?buyNow=1', {
      state: {
        isBuyNow: true,
        buyNowItem: buyNowData
      }
    });
  };

  const inWish = isInWishlist(product.id);
  const isOutOfStock = product.stock_quantity <= 0;
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= product.low_stock_threshold;

  return (
    <div
      className="card card-hover"
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#ffffff',
        border: '1px solid var(--border-color)'
      }}
    >
      {/* Top badges & Wishlist Button */}
      <div style={{ position: 'relative', backgroundColor: '#f1f5f9', height: 210, overflow: 'hidden' }}>
        <Link to={`/products/${product.slug}`}>
          <img
            src={product.primary_image || (product.images && product.images[0]?.image_url) || 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80'}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
          />
        </Link>

        {/* Discount Tag */}
        {product.discount_percent > 0 && (
          <div style={{
            position: 'absolute',
            top: 10,
            left: 10,
            backgroundColor: 'var(--amber-primary)',
            color: 'var(--primary)',
            fontSize: '0.72rem',
            fontWeight: 800,
            padding: '0.2rem 0.5rem',
            borderRadius: 6,
            boxShadow: 'var(--shadow-sm)'
          }}>
            {Math.round(product.discount_percent)}% OFF
          </div>
        )}

        {/* Heavy Bulk Indicator */}
        {product.is_heavy_bulk ? (
          <div style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            color: '#ffffff',
            fontSize: '0.68rem',
            fontWeight: 600,
            padding: '0.2rem 0.45rem',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <Truck size={12} color="var(--amber-primary)" />
            <span>Heavy Freight</span>
          </div>
        ) : null}

        {/* Wishlist Button */}
        <button
          onClick={() => toggleWishlist(product)}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            transition: 'transform 0.15s ease'
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
          title={inWish ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart size={16} color={inWish ? 'var(--danger)' : 'var(--text-muted)'} fill={inWish ? 'var(--danger)' : 'none'} />
        </button>
      </div>

      {/* Body Content */}
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--amber-dark)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {product.brand || product.category_name}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', fontWeight: 600 }}>
            <Star size={13} color="#f59e0b" fill="#f59e0b" />
            <span>{product.rating || '4.8'}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({product.review_count || 12})</span>
          </div>
        </div>

        <Link
          to={`/products/${product.slug}`}
          style={{
            fontSize: '0.9375rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: '0.5rem',
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            height: '2.7em'
          }}
        >
          {product.name}
        </Link>

        {/* Unit & Volume Discount hint */}
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          Unit: <strong style={{ color: 'var(--text-main)' }}>{product.unit_of_measure}</strong>
          {product.volume_discount_threshold ? (
            <span style={{ marginLeft: 6, color: 'var(--success)', fontWeight: 600 }}>
              • {product.volume_discount_percent}% off on {product.volume_discount_threshold}+
            </span>
          ) : null}
        </div>

        {/* Pricing Area */}
        <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
              ₹{product.effective_price || Math.round(product.unit_price * (1 - (product.discount_percent || 0) / 100))}
            </span>
            {product.discount_percent > 0 && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                ₹{product.unit_price}
              </span>
            )}
          </div>

          {/* Stock status & Action */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            {isOutOfStock ? (
              <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>Out of Stock</span>
            ) : isLowStock ? (
              <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>Only {product.stock_quantity} Left</span>
            ) : (
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>In Stock</span>
            )}

            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                onClick={() => addToCart(product, product.min_order_quantity || 1)}
                disabled={isOutOfStock}
                className="btn btn-outline btn-sm"
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem' }}
                title="Add to Cart"
              >
                <ShoppingCart size={13} />
              </button>
              <button
                onClick={handleCardBuyNow}
                disabled={isOutOfStock}
                className="btn btn-primary btn-sm"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}
                title="Instant Site Delivery Booking"
              >
                <Zap size={13} />
                <span>Buy</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
