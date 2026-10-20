import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Star, Heart, ShoppingCart, Truck, ShieldCheck, 
  MapPin, CheckCircle2, AlertCircle, ArrowLeft, Send, Zap
} from 'lucide-react';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ProductCard from '../components/ProductCard';

export default function ProductDetailPage({ onOpenBulkModal }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  // Delivery check on PDP
  const [pincode, setPincode] = useState('201301');
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [checkingDelivery, setCheckingDelivery] = useState(false);

  // Review submission
  const [reviews, setReviews] = useState([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      try {
        const res = await api.get(`/products/${slug}`);
        if (res.data.success) {
          const prod = res.data.data;
          setProduct(prod);
          setSelectedImage(prod.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800');
          setQuantity(prod.min_order_quantity || 1);

          // Fetch reviews
          const revRes = await api.get(`/products/${prod.id}/reviews`);
          if (revRes.data.success) {
            setReviews(revRes.data.data);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  const handleCheckDelivery = async (e) => {
    e.preventDefault();
    if (!pincode || pincode.trim().length < 6) return;
    setCheckingDelivery(true);
    try {
      const res = await api.get(`/service-areas/check/${pincode.trim()}`);
      setDeliveryInfo(res.data);
    } catch (e) {
      toast.error('Unable to verify PIN code.');
    } finally {
      setCheckingDelivery(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.info('Please log in to submit a product review.');
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await api.post(`/products/${product.id}/reviews`, {
        rating: reviewRating,
        title: reviewTitle,
        comment: reviewComment
      });
      if (res.data.success) {
        toast.success('Your review was posted successfully!');
        setReviewTitle('');
        setReviewComment('');
        // Reload reviews
        const revRes = await api.get(`/products/${product.id}/reviews`);
        if (revRes.data.success) setReviews(revRes.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading product specifications...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <h2>Product Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>The product you requested is no longer listed in our civil warehouse catalog.</p>
        <Link to="/products" className="btn btn-primary">
          Return to Catalog
        </Link>
      </div>
    );
  }

  const inWish = isInWishlist(product.id);
  const isOutOfStock = product.stock_quantity <= 0;

  // Volume discount calculation hint
  const getsVolumeDiscount = product.volume_discount_threshold && quantity >= product.volume_discount_threshold;
  const currentEffectivePrice = getsVolumeDiscount
    ? parseFloat((product.unit_price * (1 - (product.volume_discount_percent || 0) / 100)).toFixed(2))
    : parseFloat(product.effective_price);

  const handleBuyNow = () => {
    const buyNowData = {
      product_id: product.id,
      quantity,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        brand: product.brand,
        unit_of_measure: product.unit_of_measure,
        unit_price: product.unit_price,
        discount_percent: product.discount_percent,
        effective_price: currentEffectivePrice,
        is_heavy_bulk: product.is_heavy_bulk,
        image_url: selectedImage || (product.images?.[0]?.image_url) || 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=200'
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

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        <Link to="/" style={{ color: 'inherit' }}>Home</Link>
        <span>/</span>
        <Link to="/products" style={{ color: 'inherit' }}>Products</Link>
        <span>/</span>
        <Link to={`/products?category=${product.category_slug}`} style={{ color: 'inherit' }}>{product.category_name}</Link>
        <span>/</span>
        <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{product.name}</span>
      </div>

      {/* Main PDP Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '3rem', marginBottom: '4rem' }}>
        {/* Left Column: Image Gallery */}
        <div style={{ gridColumn: 'span 6' }}>
          <div style={{
            height: 440,
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-color)',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img
              src={selectedImage}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>

          {/* Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto' }}>
              {product.images.map((img) => (
                <div
                  key={img.id}
                  onClick={() => setSelectedImage(img.image_url)}
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: selectedImage === img.image_url ? '2px solid var(--amber-primary)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  <img src={img.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Details & Actions */}
        <div style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span className="badge badge-amber">{product.brand || product.category_name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.875rem', fontWeight: 600 }}>
              <Star size={16} color="#f59e0b" fill="#f59e0b" />
              <span>{product.rating}</span>
              <span style={{ color: 'var(--text-muted)' }}>({product.review_count} verified reviews)</span>
            </div>
          </div>

          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.75rem', lineHeight: 1.25 }}>
            {product.name}
          </h1>

          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            SKU: <strong style={{ color: 'var(--text-main)' }}>{product.sku}</strong> | Unit: <strong style={{ color: 'var(--text-main)' }}>{product.unit_of_measure}</strong>
          </div>

          {/* Price Box */}
          <div style={{
            backgroundColor: 'var(--bg-subtle)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)' }}>
                ₹{currentEffectivePrice}
              </span>
              <span style={{ fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
                per {product.unit_of_measure}
              </span>
              {product.discount_percent > 0 && !getsVolumeDiscount && (
                <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                  ₹{product.unit_price}
                </span>
              )}
            </div>

            {/* Volume discount banner */}
            {product.volume_discount_threshold && (
              <div style={{
                backgroundColor: getsVolumeDiscount ? 'var(--success-bg)' : 'var(--amber-subtle)',
                color: getsVolumeDiscount ? 'var(--success)' : 'var(--amber-dark)',
                padding: '0.5rem 0.75rem',
                borderRadius: 6,
                fontSize: '0.8125rem',
                fontWeight: 600,
                border: `1px solid ${getsVolumeDiscount ? 'var(--success-border)' : 'var(--amber-border)'}`
              }}>
                {getsVolumeDiscount
                  ? `✓ Volume Discount Applied! Extra ${product.volume_discount_percent}% off for ${product.volume_discount_threshold}+ units.`
                  : `Bulk Tier: Order ${product.volume_discount_threshold}+ units to unlock ${product.volume_discount_percent}% volume discount.`}
              </div>
            )}
          </div>

          {/* Stock & Heavy indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            {isOutOfStock ? (
              <span className="badge badge-danger">Out of Stock</span>
            ) : product.stock_quantity <= product.low_stock_threshold ? (
              <span className="badge badge-amber">Low Stock: Only {product.stock_quantity} left</span>
            ) : (
              <span className="badge badge-success">Warehouse Stock: {product.stock_quantity} available</span>
            )}

            {product.is_heavy_bulk ? (
              <span className="badge badge-dark" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Truck size={13} color="var(--amber-primary)" />
                Requires Tipper Truck Unloading
              </span>
            ) : null}
          </div>

          {/* Quantity Selector & Add to Cart */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <button
                onClick={() => setQuantity((q) => Math.max(product.min_order_quantity || 1, q - 1))}
                style={{ padding: '0.625rem 0.875rem', border: 'none', background: 'var(--bg-subtle)', cursor: 'pointer', fontWeight: 700 }}
              >
                -
              </button>
              <input
                type="number"
                min={product.min_order_quantity || 1}
                max={product.stock_quantity}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(product.min_order_quantity || 1, parseInt(e.target.value, 10) || 1))}
                style={{ width: 60, textAlign: 'center', border: 'none', outline: 'none', fontWeight: 700, fontSize: '0.9375rem' }}
              />
              <button
                onClick={() => setQuantity((q) => Math.min(product.stock_quantity, q + 1))}
                style={{ padding: '0.625rem 0.875rem', border: 'none', background: 'var(--bg-subtle)', cursor: 'pointer', fontWeight: 700 }}
              >
                +
              </button>
            </div>

            <button
              onClick={() => addToCart(product, quantity)}
              disabled={isOutOfStock}
              className="btn btn-outline"
              style={{ flex: 1, minWidth: 140, padding: '0.75rem 1rem', fontSize: '0.9375rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <ShoppingCart size={17} />
              Add to Cart
            </button>

            <button
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className="btn btn-primary"
              style={{ flex: 1.2, minWidth: 180, padding: '0.75rem 1rem', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Zap size={17} />
              Buy Now (₹{(currentEffectivePrice * quantity).toFixed(2)})
            </button>

            <button
              onClick={() => toggleWishlist(product)}
              className="btn btn-outline"
              style={{ padding: '0.75rem' }}
              title="Save to Wishlist"
            >
              <Heart size={20} color={inWish ? 'var(--danger)' : 'currentColor'} fill={inWish ? 'var(--danger)' : 'none'} />
            </button>
          </div>

          {/* Check Pincode Logistics Card */}
          <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9375rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={16} color="var(--amber-primary)" />
              Site Delivery &amp; Unloading Estimate
            </h4>
            <form onSubmit={handleCheckDelivery} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="text"
                placeholder="Enter 6-digit site PIN code"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="form-control"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
              />
              <button type="submit" className="btn btn-dark btn-sm" disabled={checkingDelivery}>
                Verify
              </button>
            </form>

            {deliveryInfo && (
              <div style={{ fontSize: '0.8125rem', color: deliveryInfo.serviceable ? 'var(--success)' : 'var(--danger)' }}>
                {deliveryInfo.serviceable ? (
                  <div>
                    ✓ Deliverable to {deliveryInfo.data?.city} within <strong>{deliveryInfo.data?.estimated_days} days</strong>.<br />
                    • Standard freight: ₹{deliveryInfo.data?.standard_shipping_fee} (Free above ₹{deliveryInfo.data?.free_delivery_threshold?.toLocaleString()})
                  </div>
                ) : (
                  <div>✕ Outside standard delivery corridor. Contact contractor desk for special logistics.</div>
                )}
              </div>
            )}
          </div>

          {/* Bulk Quotation Banner for large quantities */}
          <div style={{ backgroundColor: 'var(--amber-subtle)', borderRadius: 10, padding: '1rem', border: '1px solid var(--amber-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--amber-dark)' }}>Need high volume for site casting?</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Direct plant dispatch available for 100+ units.</div>
            </div>
            <button onClick={onOpenBulkModal} className="btn btn-dark btn-sm">
              Bulk RFQ
            </button>
          </div>
        </div>
      </div>

      {/* Description & Technical Specifications */}
      <div style={{ marginBottom: '4rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>Technical Specifications &amp; Quality Standards</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
          <div style={{ gridColumn: 'span 6', backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ marginBottom: '0.75rem' }}>Material Description</h4>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
              {product.description}
            </p>
          </div>

          <div style={{ gridColumn: 'span 6', backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ marginBottom: '0.75rem' }}>IS Specifications</h4>
            {product.specifications && Object.keys(product.specifications).length > 0 ? (
              <table className="table">
                <tbody>
                  {Object.entries(product.specifications).map(([key, val]) => (
                    <tr key={key}>
                      <td style={{ fontWeight: 600, color: 'var(--text-muted)', textTransform: 'capitalize', width: '40%' }}>
                        {key.replace(/_/g, ' ')}
                      </td>
                      <td style={{ fontWeight: 500 }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>Standard BIS parameters conform to IS requirements.</p>
            )}
          </div>
        </div>
      </div>

      {/* Verified Reviews Section */}
      <div style={{ marginBottom: '4rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>Customer &amp; Contractor Reviews</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
          {/* Reviews list */}
          <div style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.length === 0 ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>No customer reviews yet. Be the first contractor to review this material!</p>
              </div>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{r.reviewer_name}</span>
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Verified Site Purchase</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} size={14} color="#f59e0b" fill={i < r.rating ? '#f59e0b' : 'none'} />
                      ))}
                    </div>
                  </div>
                  {r.title && <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.375rem' }}>{r.title}</div>}
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{r.comment}</p>
                </div>
              ))
            )}
          </div>

          {/* Submit Review Form */}
          <div style={{ gridColumn: 'span 5' }}>
            <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Write a Review</h4>
              <form onSubmit={handleReviewSubmit}>
                <div className="form-group">
                  <label className="form-label">Rating</label>
                  <select
                    className="form-control"
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                  >
                    <option value={5}>5 Stars - Outstanding Quality</option>
                    <option value={4}>4 Stars - Good Standard Material</option>
                    <option value={3}>3 Stars - Average</option>
                    <option value={2}>2 Stars - Subpar</option>
                    <option value={1}>1 Star - Defective / Damaged</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Review Headline</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Excellent compressive strength on 7-day cube test"
                    className="form-control"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Detailed Feedback</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Share batch quality, packaging condition, and delivery experience..."
                    className="form-control"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-dark" style={{ width: '100%' }} disabled={submittingReview}>
                  {submittingReview ? 'Submitting...' : 'Post Verified Review'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {product.relatedProducts && product.relatedProducts.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Related Construction Materials</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {product.relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
