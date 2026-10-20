import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, ShieldCheck, Tag, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export default function CartPage() {
  const { cart, items, itemsCount, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setValidatingCoupon(true);
    try {
      const res = await api.post('/coupons/validate', {
        code: couponCode.trim(),
        subtotal
      });
      if (res.data.success) {
        setAppliedCoupon(res.data.data);
        toast.success(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or ineligible coupon code.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toast.info('Coupon removed.');
  };

  // Calculations
  const discountAmount = appliedCoupon ? appliedCoupon.discount_amount : 0;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxGst = parseFloat((taxableAmount * 0.18).toFixed(2));
  const estimatedDelivery = subtotal >= 5000 || subtotal === 0 ? 0 : 250;
  const grandTotal = parseFloat((taxableAmount + taxGst + estimatedDelivery).toFixed(2));

  // Check if any items exceed stock
  const hasOutOfStockItems = items.some((item) => item.quantity > item.stock_quantity);

  if (items.length === 0) {
    return (
      <div className="container" style={{ padding: '6rem 1.25rem', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: 'var(--amber-subtle)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <ShoppingBag size={40} color="var(--amber-dark)" />
        </div>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Your Materials Cart is Empty</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginBottom: '2rem', maxWidth: 450, margin: '0 auto 2rem' }}>
          Browse our certified civil construction catalog to add cement bags, TMT rebars, bricks, or aggregates.
        </p>
        <Link to="/products" className="btn btn-primary btn-lg">
          Browse Materials Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Construction Cart</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Review order items, bulk tier rates, and apply promo coupons.</p>
        </div>
        <button onClick={clearCart} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
          Clear Cart
        </button>
      </div>

      {hasOutOfStockItems && (
        <div style={{ backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 10, padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--danger)', fontSize: '0.875rem' }}>
          <AlertCircle size={20} />
          <span>One or more items in your cart exceed current warehouse stock. Please reduce the quantity before proceeding.</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2.5rem' }}>
        {/* Cart Line Items (Span 8) */}
        <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {items.map((item) => (
            <div
              key={item.cart_item_id || item.product_id}
              className="card"
              style={{
                padding: '1.25rem',
                display: 'flex',
                gap: '1.25rem',
                alignItems: 'center',
                backgroundColor: '#ffffff'
              }}
            >
              <img
                src={item.image_url || 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=200'}
                alt={item.name}
                style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 'var(--radius-md)', flexShrink: 0 }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--amber-dark)', textTransform: 'uppercase' }}>
                  {item.brand || 'CERTIFIED MATERIAL'}
                </div>
                <Link to={`/products/${item.slug}`} style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', display: 'block', marginBottom: '0.25rem' }}>
                  {item.name}
                </Link>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  SKU: {item.sku} | Unit: {item.unit_of_measure}
                </div>

                {item.volume_discount_applied && (
                  <div style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.75rem', marginTop: 4 }}>
                    ✓ Bulk volume rate applied
                  </div>
                )}

                {item.quantity > item.stock_quantity && (
                  <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.75rem', marginTop: 4 }}>
                    ⚠️ Only {item.stock_quantity} available in warehouse
                  </div>
                )}
              </div>

              {/* Quantity Controls */}
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <button
                  onClick={() => updateQuantity(item.cart_item_id, item.quantity - 1, item.product_id)}
                  style={{ padding: '0.4rem 0.75rem', border: 'none', background: 'var(--bg-subtle)', cursor: 'pointer', fontWeight: 700 }}
                >
                  -
                </button>
                <span style={{ padding: '0.4rem 0.85rem', fontWeight: 700, fontSize: '0.875rem' }}>
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.cart_item_id, item.quantity + 1, item.product_id)}
                  style={{ padding: '0.4rem 0.75rem', border: 'none', background: 'var(--bg-subtle)', cursor: 'pointer', fontWeight: 700 }}
                >
                  +
                </button>
              </div>

              {/* Line Price & Remove */}
              <div style={{ textAlign: 'right', minWidth: 100 }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>
                  ₹{(item.line_total || (item.effective_unit_price * item.quantity)).toFixed(2)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ₹{item.effective_unit_price} / {item.unit_of_measure}
                </div>
                <button
                  onClick={() => removeItem(item.cart_item_id, item.product_id)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginTop: 6 }}
                  title="Remove item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {/* Heavy bulk delivery notification */}
          <div style={{ backgroundColor: 'var(--amber-subtle)', border: '1px solid var(--amber-border)', borderRadius: 10, padding: '1rem', fontSize: '0.8125rem', color: 'var(--amber-dark)' }}>
            🚚 Heavy construction materials (Cement/Steel/Sand) are dispatched via commercial tippers. Ensure site approach road supports 10-wheeler / flatbed access.
          </div>
        </div>

        {/* Right Summary Column (Span 4) */}
        <div style={{ gridColumn: 'span 4' }}>
          <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff', position: 'sticky', top: 120 }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              Order Summary
            </h3>

            {/* Coupon Application */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.8125rem' }}>Promotional Coupon</label>
              {appliedCoupon ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Tag size={16} color="var(--success)" />
                    <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.875rem' }}>{appliedCoupon.code}</span>
                  </div>
                  <button onClick={removeCoupon} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Try BUILD10 or BULKPRO"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="form-control"
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                  />
                  <button type="submit" className="btn btn-dark btn-sm" disabled={validatingCoupon}>
                    Apply
                  </button>
                </form>
              )}
            </div>

            {/* Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Subtotal ({itemsCount} units)</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>₹{subtotal.toLocaleString()}</span>
              </div>

              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                  <span>Coupon Discount ({appliedCoupon?.code})</span>
                  <span style={{ fontWeight: 700 }}>-₹{discountAmount.toLocaleString()}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>GST (18% Civil Materials)</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>₹{taxGst.toLocaleString()}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Estimated Freight / Delivery</span>
                <span style={{ color: estimatedDelivery === 0 ? 'var(--success)' : 'var(--text-main)', fontWeight: 600 }}>
                  {estimatedDelivery === 0 ? 'FREE' : `₹${estimatedDelivery}`}
                </span>
              </div>
            </div>

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Total Payable</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inclusive of all taxes &amp; GST</div>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--primary)' }}>
                ₹{grandTotal.toLocaleString()}
              </div>
            </div>

            {/* Checkout Action */}
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  toast.info('Please log in or register to complete site delivery checkout.');
                  navigate('/login?redirect=/checkout');
                } else {
                  navigate('/checkout', { state: { couponCode: appliedCoupon?.code } });
                }
              }}
              disabled={hasOutOfStockItems}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.875rem', fontSize: '1.05rem', fontWeight: 700 }}
            >
              Proceed to Site Checkout
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
