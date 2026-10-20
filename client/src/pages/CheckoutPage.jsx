import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  MapPin, Truck, CreditCard, ShieldCheck, CheckCircle2, 
  AlertCircle, ArrowRight, Plus, Building2, Calendar, Clock, 
  Zap, Info, Check, AlertTriangle
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export default function CheckoutPage() {
  const { user, isAuthenticated } = useAuth();
  const { cart, items: cartItems, subtotal: cartSubtotal, refreshCart } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Buy Now vs. Cart Detection
  const queryParams = new URLSearchParams(location.search);
  const isBuyNowParam = queryParams.get('buyNow') === '1' || location.state?.isBuyNow;

  const [buyNowData, setBuyNowData] = useState(() => {
    if (location.state?.buyNowItem) {
      return location.state.buyNowItem;
    }
    const saved = sessionStorage.getItem('buildmart_buynow');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });

  const isBuyNow = Boolean(isBuyNowParam && buyNowData);

  // Address and logistics states
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Construction Site',
    recipient_name: user?.full_name || '',
    phone: user?.phone || '',
    address_line1: '',
    address_line2: '',
    landmark: '',
    city: 'New Delhi',
    state: 'Delhi',
    postal_code: '110001',
    is_default: 1
  });

  // Construction Site Delivery Booking States
  const [unloadingPreference, setUnloadingPreference] = useState('hydraulic_tipper'); // 'hydraulic_tipper' | 'manual_labor' | 'crane_handling' | 'customer_arranged'
  const [preferredDate, setPreferredDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('07:00 AM - 11:00 AM');
  const [siteInstructions, setSiteInstructions] = useState('');

  // Payment and submission states
  const [paymentMethod, setPaymentMethod] = useState('cod'); // 'cod' | 'razorpay'
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);

  // Backend Real Quote & Slot Availability State
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [deliveryQuote, setDeliveryQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');

  const couponCodeFromCart = location.state?.couponCode || '';

  // Resolve active items and initial subtotal
  const checkoutItems = useMemo(() => {
    if (isBuyNow && buyNowData) {
      const prod = buyNowData.product;
      const qty = buyNowData.quantity;
      const unitPrice = parseFloat(prod.effective_price || prod.unit_price);
      return [{
        product_id: prod.id,
        name: prod.name,
        sku: prod.sku,
        brand: prod.brand,
        unit_of_measure: prod.unit_of_measure,
        unit_price: parseFloat(prod.unit_price),
        effective_unit_price: unitPrice,
        quantity: qty,
        line_total: parseFloat((unitPrice * qty).toFixed(2)),
        is_heavy_bulk: prod.is_heavy_bulk,
        image_url: prod.image_url
      }];
    }
    return cartItems;
  }, [isBuyNow, buyNowData, cartItems]);

  const rawSubtotal = useMemo(() => {
    return checkoutItems.reduce((acc, it) => acc + (it.line_total || (it.effective_unit_price * it.quantity)), 0);
  }, [checkoutItems]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
      return;
    }

    if (!isBuyNow && cartItems.length === 0 && !loading) {
      toast.info('Your cart is empty. Please select construction materials to proceed.');
      navigate('/products');
      return;
    }

    async function loadAddresses() {
      try {
        const res = await api.get('/addresses');
        if (res.data.success) {
          setAddresses(res.data.data);
          const defaultAddr = res.data.data.find((a) => a.is_default);
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id);
          } else if (res.data.data.length > 0) {
            setSelectedAddressId(res.data.data[0].id);
          } else {
            setShowAddAddress(true);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadAddresses();
  }, [isAuthenticated, isBuyNow, cartItems.length, navigate]);

  // Selected Address object
  const selectedAddrObj = addresses.find((a) => a.id === selectedAddressId);
  const activePin = selectedAddrObj?.postal_code || (showAddAddress ? newAddress.postal_code : '');

  // Calculate real-time delivery quote & verified available slots whenever PIN, items or unloading preference changes
  useEffect(() => {
    if (!activePin || activePin.length < 6 || checkoutItems.length === 0) {
      return;
    }

    let isMounted = true;
    async function fetchQuote() {
      setQuoteLoading(true);
      setQuoteError('');
      try {
        const itemsPayload = checkoutItems.map(it => ({
          product_id: it.product_id,
          quantity: it.quantity
        }));

        const res = await api.post('/deliveries/quote', {
          pincode: activePin,
          items: itemsPayload,
          unloading_preference: unloadingPreference,
          preferred_date: preferredDate,
          time_slot: selectedTimeSlot
        });

        if (!isMounted) return;

        if (res.data.success && res.data.quote) {
          const q = res.data.quote;
          setDeliveryQuote(q);

          // Auto-select earliest confirmed date if none selected
          if (!preferredDate && q.available_dates && q.available_dates.length > 0) {
            setPreferredDate(q.available_dates[0].date);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        setDeliveryQuote(null);
        setQuoteError(err.response?.data?.message || 'Selected PIN code is outside our serviceable delivery network.');
      } finally {
        if (isMounted) setQuoteLoading(false);
      }
    }

    const timer = setTimeout(fetchQuote, 250);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [activePin, checkoutItems, unloadingPreference]);

  // Handle Add New Address
  const handleAddNewAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/addresses', newAddress);
      if (res.data.success) {
        toast.success('Site delivery address registered.');
        const updated = [...addresses, res.data.data];
        setAddresses(updated);
        setSelectedAddressId(res.data.data.id);
        setShowAddAddress(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register site address.');
    }
  };

  // Handle Place Order
  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error('Please select or register a site delivery address.');
      return;
    }

    if (quoteError) {
      toast.error(quoteError);
      return;
    }

    if (!deliveryQuote || !deliveryQuote.is_serviceable) {
      toast.error('Please enter a confirmed serviceable site PIN code.');
      return;
    }

    setPlacingOrder(true);

    try {
      const siteDetails = {
        preferred_date: preferredDate || (deliveryQuote?.available_dates?.[0]?.date),
        time_slot: selectedTimeSlot,
        unloading_preference: unloadingPreference,
        site_access_instructions: siteInstructions,
        site_contact_name: selectedAddrObj?.recipient_name || user?.full_name,
        site_contact_phone: selectedAddrObj?.phone || user?.phone,
        site_landmark: selectedAddrObj?.landmark || ''
      };

      const payload = {
        address_id: selectedAddressId,
        payment_method: paymentMethod,
        coupon_code: couponCodeFromCart,
        notes: siteInstructions,
        is_buy_now: isBuyNow,
        buy_now_item: isBuyNow ? { product_id: buyNowData.product_id, quantity: buyNowData.quantity } : null,
        site_details: siteDetails
      };

      const orderRes = await api.post('/orders', payload);

      if (!orderRes.data.success) {
        throw new Error(orderRes.data.message || 'Failed to register site order.');
      }

      const orderData = orderRes.data.data;
      const orderId = orderData.orderId;

      // Clean up Buy Now session (cart items remain safe and preserved!)
      if (isBuyNow) {
        sessionStorage.removeItem('buildmart_buynow');
      } else {
        await refreshCart();
      }

      // 1. Cash on Delivery
      if (paymentMethod === 'cod') {
        toast.success('Site Order registered successfully via Cash on Delivery!');
        navigate(`/orders/${orderId}/confirmed`);
        return;
      }

      // 2. Online Payment via Razorpay
      try {
        const rzpRes = await api.post('/payments/razorpay/create-order', {
          order_id: orderId
        });

        if (!rzpRes.data.success) {
          throw new Error('Failed to initiate online payment order.');
        }

        const rzpData = rzpRes.data.data;

        if (typeof window.Razorpay === 'function') {
          const options = {
            key: rzpData.key_id,
            amount: rzpData.amount,
            currency: rzpData.currency,
            name: 'BuildMart Civil Materials',
            description: `Order #${orderData.orderNumber}`,
            order_id: rzpData.razorpay_order_id,
            prefill: {
              name: rzpData.user.name,
              email: rzpData.user.email,
              contact: rzpData.user.phone
            },
            theme: { color: '#f59e0b' },
            handler: async function (response) {
              try {
                const verifyRes = await api.post('/payments/razorpay/verify', {
                  order_id: orderId,
                  razorpay_order_id: response.razorpay_order_id || rzpData.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                });

                if (verifyRes.data.success) {
                  toast.success('Payment verified! Order and site delivery confirmed.');
                  navigate(`/orders/${orderId}/confirmed`);
                } else {
                  toast.error('Payment verification failed.');
                  navigate(`/orders/${orderId}/confirmed`);
                }
              } catch (verifyErr) {
                toast.error('Payment verification error.');
                navigate(`/orders/${orderId}/confirmed`);
              }
            },
            modal: {
              ondismiss: function () {
                toast.info('Payment was not completed. You can complete payment from your order receipt.');
                navigate(`/orders/${orderId}/confirmed`);
              }
            }
          };

          const rzpInstance = new window.Razorpay(options);
          rzpInstance.open();
        } else {
          // Test sandbox auto-verification
          const mockPaymentId = `pay_test_${Date.now()}`;
          const verifyRes = await api.post('/payments/razorpay/verify', {
            order_id: orderId,
            razorpay_order_id: rzpData.razorpay_order_id,
            razorpay_payment_id: mockPaymentId,
            razorpay_signature: `mock_valid_signature_${mockPaymentId}`
          });

          if (verifyRes.data.success) {
            toast.success('Test payment verified successfully! Order confirmed.');
            navigate(`/orders/${orderId}/confirmed`);
          }
        }
      } catch (paymentErr) {
        toast.error(paymentErr.response?.data?.message || 'Payment processing error.');
        navigate(`/orders/${orderId}/confirmed`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Checkout failed.');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-muted)' }}>Preparing construction site delivery checkout...</p>
      </div>
    );
  }

  // Financial calculations
  const finalSubtotal = deliveryQuote?.subtotal ?? rawSubtotal;
  const deliveryFee = deliveryQuote?.delivery_fee ?? (finalSubtotal >= 5000 ? 0 : 250);
  const unloadingFee = deliveryQuote?.unloading_fee ?? 0;
  const taxAmount = deliveryQuote?.tax_amount ?? parseFloat(((finalSubtotal + unloadingFee) * 0.18).toFixed(2));
  const finalTotal = deliveryQuote?.total_amount ?? parseFloat((finalSubtotal + deliveryFee + unloadingFee + taxAmount).toFixed(2));

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem 5rem' }}>
      {/* Top Banner for Buy Now */}
      {isBuyNow && (
        <div style={{
          backgroundColor: 'var(--amber-subtle)',
          border: '1px solid var(--amber-primary)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Zap size={22} color="var(--amber-dark)" />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--amber-dark)' }}>
                ⚡ Express Buy Now — Construction Site Logistics Booking
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-main)' }}>
                Ordering <strong>{buyNowData?.product?.name}</strong> (Qty: {buyNowData?.quantity}). Your regular shopping cart items remain completely safe and preserved!
              </div>
            </div>
          </div>
          <Link to="/cart" className="btn btn-outline btn-sm" style={{ backgroundColor: '#ffffff' }}>
            View Saved Cart ({cartItems.length} items)
          </Link>
        </div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Construction-Site Delivery &amp; Checkout</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          Verify site address corridor, book unloading assistance, and schedule your logistics dispatch.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2.5rem' }}>
        {/* Left Column: Delivery Details & Preferences (Span 8) */}
        <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Section 1: Construction-Site Address & Contact */}
          <div className="card" style={{ padding: '1.75rem', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.25rem' }}>
                  <MapPin size={22} color="var(--amber-primary)" />
                  1. Construction-Site Address &amp; Supervisor Contact
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                  Select the delivery destination where cement, steel, or bulk cargo will be unloaded.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddAddress(!showAddAddress)}
                className="btn btn-outline btn-sm"
              >
                <Plus size={14} />
                {showAddAddress ? 'Cancel' : 'Add New Site'}
              </button>
            </div>

            {/* New Site Address Form */}
            {showAddAddress && (
              <form onSubmit={handleAddNewAddress} style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Register New Project Site Location</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Project / Site Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Tower 3 Foundation, Sector 62"
                      value={newAddress.label}
                      onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Site Supervisor / Recipient *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      placeholder="e.g. Engineer Ramesh Kumar"
                      value={newAddress.recipient_name}
                      onChange={(e) => setNewAddress({ ...newAddress, recipient_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Site Contact Phone *</label>
                    <input
                      type="tel"
                      required
                      className="form-control"
                      placeholder="e.g. +91 98111 22334"
                      value={newAddress.phone}
                      onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Site PIN Code (Verified on Entry) *</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      className="form-control"
                      placeholder="e.g. 110001 or 201301"
                      value={newAddress.postal_code}
                      onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Site Street Address / Gate Access *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="Plot 42, Knowledge Park III / Near Main Gate"
                    value={newAddress.address_line1}
                    onChange={(e) => setNewAddress({ ...newAddress, address_line1: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Prominent Site Landmark</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Opposite Pillar 140 / Near Water Tank"
                      value={newAddress.landmark}
                      onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">City *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">State *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={newAddress.state}
                      onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-sm">
                  Save &amp; Select Site Address
                </button>
              </form>
            )}

            {/* Saved Addresses List */}
            {addresses.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No saved project sites yet. Please register your site address above.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    style={{
                      border: selectedAddressId === addr.id ? '2px solid var(--amber-primary)' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.25rem',
                      cursor: 'pointer',
                      backgroundColor: selectedAddressId === addr.id ? 'var(--amber-subtle)' : '#ffffff',
                      transition: 'var(--transition)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{addr.label}</span>
                      {selectedAddressId === addr.id && <CheckCircle2 size={18} color="var(--amber-dark)" />}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{addr.recipient_name}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0' }}>
                      {addr.address_line1}
                    </div>
                    {addr.landmark && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--amber-dark)', fontWeight: 600 }}>
                        Landmark: {addr.landmark}
                      </div>
                    )}
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {addr.city}, {addr.state} - <strong>{addr.postal_code}</strong>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Phone: {addr.phone}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Serviceable Area Verification Status Box */}
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              {quoteLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  <span>Verifying PIN code logistics corridor with central fleet yard...</span>
                </div>
              ) : quoteError ? (
                <div style={{ backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Logistics Service Restriction:</strong> {quoteError}
                  </div>
                </div>
              ) : deliveryQuote ? (
                <div style={{ backgroundColor: 'var(--success-bg)', border: '1px solid var(--success-border)', padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 700, fontSize: '0.875rem' }}>
                    <CheckCircle2 size={18} />
                    <span>Verified Delivery Corridor: {deliveryQuote.area_name}, {deliveryQuote.city} ({deliveryQuote.pincode})</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                      Dispatch Lead: {deliveryQuote.estimated_days} Day(s)
                    </span>
                    <span className={`badge ${deliveryQuote.heavy_vehicle_allowed ? 'badge-dark' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                      {deliveryQuote.heavy_vehicle_allowed ? 'Heavy Tipper/Trailer Permitted' : 'Light Commercial Vehicles Only'}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Section 2: Preferred Delivery Schedule & Time Slot */}
          <div className="card" style={{ padding: '1.75rem', backgroundColor: '#ffffff' }}>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.25rem' }}>
              <Calendar size={22} color="var(--amber-primary)" />
              2. Scheduled Delivery Date &amp; Available Time Slot
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Select from confirmed backend vehicle capacity slots. We never promise dates without confirmed yard dispatch availability.
            </p>

            {/* Date Selection */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Select Delivery Date</label>
              {deliveryQuote?.available_dates && deliveryQuote.available_dates.length > 0 ? (
                <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                  {deliveryQuote.available_dates.map((d) => (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => setPreferredDate(d.date)}
                      className={`btn ${preferredDate === d.date ? 'btn-primary' : 'btn-outline'}`}
                      style={{
                        flexShrink: 0,
                        padding: '0.625rem 1rem',
                        fontSize: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2
                      }}
                    >
                      <span style={{ fontWeight: 800 }}>{d.display_date}</span>
                      <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>
                        {d.slots.filter(s => s.available).length} slots open
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="date"
                  className="form-control"
                  style={{ maxWidth: 260 }}
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                />
              )}
            </div>

            {/* Time Slot Selection */}
            <div>
              <label className="form-label" style={{ fontWeight: 700 }}>Select Unloading Time Slot</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {[
                  { slot: '07:00 AM - 11:00 AM', label: 'Morning Slot', subtext: '07:00 AM - 11:00 AM (Early Foundation Pour / Avoid City Restrictions)' },
                  { slot: '11:00 AM - 03:00 PM', label: 'Daylight Slot', subtext: '11:00 AM - 03:00 PM (Standard Daylight Site Unloading)' },
                  { slot: '03:00 PM - 07:00 PM', label: 'Evening Slot', subtext: '03:00 PM - 07:00 PM (Post-Shift Replenishment)' }
                ].map((s) => {
                  const currentDateSlots = deliveryQuote?.available_dates?.find(d => d.date === preferredDate)?.slots;
                  const slotMeta = currentDateSlots?.find(sl => sl.slot === s.slot);
                  const isAvailable = slotMeta ? slotMeta.available : true;
                  const isSelected = selectedTimeSlot === s.slot;

                  return (
                    <div
                      key={s.slot}
                      onClick={() => {
                        if (isAvailable) setSelectedTimeSlot(s.slot);
                      }}
                      style={{
                        border: isSelected ? '2px solid var(--amber-primary)' : '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem',
                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                        backgroundColor: isSelected ? 'var(--amber-subtle)' : isAvailable ? '#ffffff' : 'var(--bg-subtle)',
                        opacity: isAvailable ? 1 : 0.6,
                        transition: 'var(--transition)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{s.label}</span>
                        {isSelected && <CheckCircle2 size={16} color="var(--amber-dark)" />}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {s.subtext}
                      </div>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', fontWeight: 700, color: isAvailable ? 'var(--success)' : 'var(--danger)' }}>
                        {isAvailable ? `✓ ${slotMeta?.capacity_left ?? 5} vehicle slots available` : '⚠️ Slot Fully Booked'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 3: Site Unloading Requirements & Equipment Assistance */}
          <div className="card" style={{ padding: '1.75rem', backgroundColor: '#ffffff' }}>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.25rem' }}>
              <Truck size={22} color="var(--amber-primary)" />
              3. Site Unloading Requirements &amp; Equipment
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Construction materials are heavy. Select whether BuildMart provides mechanized hydraulic unloading or manual offload labor.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {/* Option 1: Hydraulic Tipper Dump */}
              <div
                onClick={() => setUnloadingPreference('hydraulic_tipper')}
                style={{
                  border: unloadingPreference === 'hydraulic_tipper' ? '2px solid var(--amber-primary)' : '1px solid var(--border-color)',
                  backgroundColor: unloadingPreference === 'hydraulic_tipper' ? 'var(--amber-subtle)' : '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>🚜 Hydraulic Tipper Dump</div>
                  <span className="badge badge-amber" style={{ fontSize: '0.75rem', fontWeight: 800 }}>+₹350</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  Automatic hydraulic tipper bed offload. Best for aggregates, sand, blue metal, or palletized bulk cement.
                </p>
              </div>

              {/* Option 2: Manual Labor Unloading Assistance */}
              <div
                onClick={() => setUnloadingPreference('manual_labor')}
                style={{
                  border: unloadingPreference === 'manual_labor' ? '2px solid var(--amber-primary)' : '1px solid var(--border-color)',
                  backgroundColor: unloadingPreference === 'manual_labor' ? 'var(--amber-subtle)' : '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>👷 Manual Site Labor Offload</div>
                  <span className="badge badge-amber" style={{ fontSize: '0.75rem', fontWeight: 800 }}>+₹500</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  Dedicated BuildMart offloading team stacks cement bags / materials neatly at ground-floor site storage.
                </p>
              </div>

              {/* Option 3: Boom Crane Handling */}
              <div
                onClick={() => setUnloadingPreference('crane_handling')}
                style={{
                  border: unloadingPreference === 'crane_handling' ? '2px solid var(--amber-primary)' : '1px solid var(--border-color)',
                  backgroundColor: unloadingPreference === 'crane_handling' ? 'var(--amber-subtle)' : '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>🏗️ Boom Crane Handling</div>
                  <span className="badge badge-amber" style={{ fontSize: '0.75rem', fontWeight: 800 }}>+₹1,200</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  Heavy crane assist for bundling &amp; hoisting TMT steel rebars or structural girder beams.
                </p>
              </div>

              {/* Option 4: Customer Arranged */}
              <div
                onClick={() => setUnloadingPreference('customer_arranged')}
                style={{
                  border: unloadingPreference === 'customer_arranged' ? '2px solid var(--amber-primary)' : '1px solid var(--border-color)',
                  backgroundColor: unloadingPreference === 'customer_arranged' ? 'var(--amber-subtle)' : '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>🤝 Customer Arranged Labor</div>
                  <span className="badge badge-success" style={{ fontSize: '0.75rem', fontWeight: 800 }}>FREE / ₹0</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  Customer contractor or site excavator will unload materials from the truck bed within 45 minutes of arrival.
                </p>
              </div>
            </div>

            {/* Site Access & Unloading Instructions */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Site Access &amp; Gate Entry Instructions</label>
              <textarea
                rows={2}
                placeholder="Mention gate clearance height, night curfew permits, road approach width for 10-wheeler trucks, or safety protocols."
                className="form-control"
                value={siteInstructions}
                onChange={(e) => setSiteInstructions(e.target.value)}
              />
            </div>
          </div>

          {/* Section 4: Payment Mode */}
          <div className="card" style={{ padding: '1.75rem', backgroundColor: '#ffffff' }}>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1.25rem' }}>
              <CreditCard size={22} color="var(--amber-primary)" />
              4. Payment Method
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
              {/* Option A: Cash on Delivery */}
              <div
                onClick={() => setPaymentMethod('cod')}
                style={{
                  border: paymentMethod === 'cod' ? '2px solid var(--amber-primary)' : '1px solid var(--border-color)',
                  backgroundColor: paymentMethod === 'cod' ? 'var(--amber-subtle)' : '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>Cash on Delivery (COD)</div>
                  {paymentMethod === 'cod' && <CheckCircle2 size={18} color="var(--amber-dark)" />}
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                  Pay on site after physical material inspection and unloading. Perfect for active construction projects.
                </p>
              </div>

              {/* Option B: Razorpay Online Payment */}
              <div
                onClick={() => setPaymentMethod('razorpay')}
                style={{
                  border: paymentMethod === 'razorpay' ? '2px solid var(--amber-primary)' : '1px solid var(--border-color)',
                  backgroundColor: paymentMethod === 'razorpay' ? 'var(--amber-subtle)' : '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>Razorpay Online Pay</div>
                  {paymentMethod === 'razorpay' && <CheckCircle2 size={18} color="var(--amber-dark)" />}
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                  Instant digital payment via UPI (GPay/PhonePe), Corporate NetBanking, or Credit/Debit Cards with 256-bit encryption.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Summary Column (Span 4) */}
        <div style={{ gridColumn: 'span 4' }}>
          <div className="card" style={{ padding: '1.75rem', backgroundColor: '#ffffff', position: 'sticky', top: 100 }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              Materials &amp; Logistics Summary
            </h3>

            {/* Items Mini List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', maxHeight: 240, overflowY: 'auto', marginBottom: '1.25rem' }}>
              {checkoutItems.map((item) => (
                <div key={item.product_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <div style={{ flex: 1, paddingRight: 8 }}>
                    <div style={{ fontWeight: 700 }}>{item.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      SKU: {item.sku} • {item.quantity} × ₹{item.effective_unit_price} ({item.unit_of_measure})
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--primary)' }}>
                    ₹{(item.line_total || (item.effective_unit_price * item.quantity)).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Logistics Snapshot */}
            <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.875rem', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <Clock size={14} color="var(--amber-dark)" />
                <strong>Slot:</strong> {selectedTimeSlot}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <Calendar size={14} color="var(--amber-dark)" />
                <strong>Date:</strong> {preferredDate || 'Earliest Available Dispatch'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={14} color="var(--amber-dark)" />
                <strong>Unloading:</strong> {unloadingPreference.replace(/_/g, ' ')}
              </div>
            </div>

            {/* Total Area */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                <span>Materials Subtotal</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>₹{finalSubtotal.toLocaleString()}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                <span>Site Freight Delivery</span>
                <span style={{ color: deliveryFee === 0 ? 'var(--success)' : 'var(--text-main)', fontWeight: 600 }}>
                  {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                <span>Unloading Equipment Assistance</span>
                <span style={{ color: unloadingFee === 0 ? 'var(--success)' : 'var(--text-main)', fontWeight: 600 }}>
                  {unloadingFee === 0 ? 'FREE' : `₹${unloadingFee}`}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
                <span>GST (18% Construction Tax)</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>₹{taxAmount.toLocaleString()}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem' }}>
                <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>Final Total Payable</span>
                <span style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--primary)' }}>
                  ₹{finalTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={placingOrder || !selectedAddressId || Boolean(quoteError)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.875rem', fontSize: '1.05rem', fontWeight: 700 }}
            >
              {placingOrder ? 'Confirming Logistics Booking...' : paymentMethod === 'cod' ? 'Confirm Site Order & Delivery' : 'Proceed to Razorpay'}
              <ArrowRight size={18} />
            </button>

            <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              🔒 100% Verified Mill-Gate Procurement &amp; Logistics Security.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
